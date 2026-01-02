"""
YourTwin ML Service - Flask API

Provides REST endpoints for MindSpore model inference.
Integrates with the Node.js backend via the MindSpore Bridge.

Endpoints:
- /health - Service health check
- /api/predict/success - Predict student success probability
- /api/learning-path - Get optimal learning path
- /api/anomaly/check - Detect behavioral anomalies
- /api/hint/personalized - Get personalized hint suggestions
"""

import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import yaml
import logging

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from inference.model_inference import ModelInference
from data.feature_extractor import FeatureExtractor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration
def load_config():
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        'config', 'config.yaml'
    )
    try:
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        logger.warning(f"Config file not found at {config_path}, using defaults")
        return {
            'service': {'port': 5001, 'debug': False},
            'database': {'uri': os.getenv('MONGODB_URI', 'mongodb://localhost:27017/yourtwin')}
        }

config = load_config()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize services
inference = None
feature_extractor = None

def init_services():
    """Initialize ML services on startup."""
    global inference, feature_extractor

    mongo_uri = config.get('database', {}).get('uri', os.getenv('MONGODB_URI'))

    try:
        feature_extractor = FeatureExtractor(mongo_uri)
        inference = ModelInference(feature_extractor, config)
        logger.info("✅ ML services initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize ML services: {e}")
        inference = None
        feature_extractor = None


# ============ HEALTH & STATUS ============

@app.route('/health', methods=['GET'])
def health_check():
    """Service health check endpoint."""
    models_status = {}

    if inference:
        models_status = inference.get_models_status()

    return jsonify({
        'status': 'healthy' if inference else 'degraded',
        'service': 'yourtwin-ml',
        'version': config.get('service', {}).get('version', '1.0.0'),
        'timestamp': datetime.now().isoformat(),
        'models': models_status,
        'database_connected': feature_extractor is not None
    })


@app.route('/api/status', methods=['GET'])
def api_status():
    """Detailed API status."""
    return jsonify({
        'endpoints': {
            'predict_success': '/api/predict/success',
            'learning_path': '/api/learning-path',
            'anomaly_check': '/api/anomaly/check',
            'personalized_hint': '/api/hint/personalized',
            'batch_predict': '/api/predict/batch'
        },
        'models_loaded': inference.get_models_status() if inference else {},
        'config': {
            'timeout': config.get('service', {}).get('timeout', 10000),
            'cache_enabled': config.get('cache', {}).get('enabled', False)
        }
    })


# ============ PREDICTION ENDPOINTS ============

@app.route('/api/predict/success', methods=['POST'])
def predict_success():
    """
    Predict success probability for a student on an activity.

    Request:
        {
            "studentId": "...",
            "activityId": "..."
        }

    Response:
        {
            "probability": 0.75,
            "confidence": 0.85,
            "contributing_factors": [...],
            "risk_level": "low"
        }
    """
    if not inference:
        return jsonify({
            'error': 'ML service not initialized',
            'probability': 0.5,
            'confidence': 0
        }), 503

    try:
        data = request.json
        student_id = data.get('studentId')
        activity_id = data.get('activityId')

        if not student_id:
            return jsonify({'error': 'studentId is required'}), 400

        prediction = inference.predict_success(student_id, activity_id)

        return jsonify({
            'probability': prediction['probability'],
            'confidence': prediction['confidence'],
            'contributing_factors': prediction.get('factors', []),
            'risk_level': prediction.get('risk_level', 'unknown'),
            'model_version': prediction.get('model_version', '1.0')
        })

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({
            'error': str(e),
            'probability': 0.5,
            'confidence': 0
        }), 500


@app.route('/api/predict/batch', methods=['POST'])
def batch_predict():
    """
    Batch prediction for multiple students.

    Request:
        {
            "studentIds": ["...", "..."],
            "activityId": "..."
        }
    """
    if not inference:
        return jsonify({'error': 'ML service not initialized'}), 503

    try:
        data = request.json
        student_ids = data.get('studentIds', [])
        activity_id = data.get('activityId')

        predictions = []
        for student_id in student_ids:
            pred = inference.predict_success(student_id, activity_id)
            predictions.append({
                'studentId': student_id,
                **pred
            })

        return jsonify({'predictions': predictions})

    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        return jsonify({'error': str(e)}), 500


# ============ LEARNING PATH ============

@app.route('/api/learning-path', methods=['POST'])
def get_learning_path():
    """
    Get optimal learning path for a student.

    Request:
        {
            "studentId": "...",
            "targetCompetency": "arrays" (optional),
            "numActivities": 5 (optional)
        }

    Response:
        {
            "recommended_activities": [...],
            "expected_outcomes": [...],
            "reasoning": "..."
        }
    """
    if not inference:
        return jsonify({'error': 'ML service not initialized'}), 503

    try:
        data = request.json
        student_id = data.get('studentId')
        target_competency = data.get('targetCompetency')
        num_activities = data.get('numActivities', 5)

        if not student_id:
            return jsonify({'error': 'studentId is required'}), 400

        path = inference.get_optimal_path(
            student_id,
            target_competency,
            num_activities
        )

        return jsonify({
            'recommended_activities': path.get('activities', []),
            'expected_outcomes': path.get('outcomes', []),
            'reasoning': path.get('reasoning', ''),
            'estimated_time': path.get('estimated_time')
        })

    except Exception as e:
        logger.error(f"Learning path error: {e}")
        return jsonify({'error': str(e)}), 500


# ============ ANOMALY DETECTION ============

@app.route('/api/anomaly/check', methods=['POST'])
def check_anomaly():
    """
    Check for behavioral anomalies in student activity.

    Request:
        {
            "studentId": "..."
        }

    Response:
        {
            "is_anomalous": false,
            "anomaly_score": 0.2,
            "anomaly_types": [...],
            "recommendations": [...]
        }
    """
    if not inference:
        return jsonify({'error': 'ML service not initialized'}), 503

    try:
        data = request.json
        student_id = data.get('studentId')

        if not student_id:
            return jsonify({'error': 'studentId is required'}), 400

        result = inference.detect_anomalies(student_id)

        return jsonify({
            'is_anomalous': result.get('is_anomalous', False),
            'anomaly_score': result.get('score', 0),
            'anomaly_types': result.get('types', []),
            'recommendations': result.get('recommendations', [])
        })

    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        return jsonify({'error': str(e)}), 500


# ============ PERSONALIZED HINTS ============

@app.route('/api/hint/personalized', methods=['POST'])
def get_personalized_hint():
    """
    Get AI-personalized hint suggestion based on student profile.

    Request:
        {
            "studentId": "...",
            "activityId": "...",
            "codeContext": "...",
            "errorContext": "..." (optional),
            "attemptNumber": 1,
            "timeSpent": 300
        }

    Response:
        {
            "suggested_level": 2,
            "adjusted_prompt": "...",
            "reasoning": "...",
            "encourage_independence": false
        }
    """
    if not inference:
        return jsonify({'error': 'ML service not initialized'}), 503

    try:
        data = request.json
        student_id = data.get('studentId')
        activity_id = data.get('activityId')

        if not student_id or not activity_id:
            return jsonify({'error': 'studentId and activityId are required'}), 400

        hint = inference.get_personalized_hint(
            student_id=student_id,
            activity_id=activity_id,
            code_context=data.get('codeContext', ''),
            error_context=data.get('errorContext'),
            attempt_number=data.get('attemptNumber', 1),
            time_spent=data.get('timeSpent', 0)
        )

        return jsonify(hint)

    except Exception as e:
        logger.error(f"Personalized hint error: {e}")
        return jsonify({'error': str(e)}), 500


# ============ FEEDBACK ============

@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """
    Submit feedback for model improvement.

    Request:
        {
            "predictionId": "...",
            "actualOutcome": {...},
            "timestamp": "..."
        }
    """
    try:
        data = request.json
        # Log feedback for future model training
        logger.info(f"Feedback received: {data}")

        if inference:
            inference.record_feedback(data)

        return jsonify({'status': 'recorded'})

    except Exception as e:
        logger.error(f"Feedback error: {e}")
        return jsonify({'error': str(e)}), 500


# ============ ERROR HANDLERS ============

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500


# ============ MAIN ============

if __name__ == '__main__':
    init_services()

    port = config.get('service', {}).get('port', 5001)
    debug = config.get('service', {}).get('debug', False)

    logger.info(f"🚀 YourTwin ML Service starting on port {port}")
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
