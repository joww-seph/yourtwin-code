"""
Model Inference Module for YourTwin ML Service

Handles loading and running inference on MindSpore models.
Provides predictions for student success, learning paths, and anomaly detection.

Supports both heuristic fallbacks and trained MindSpore models.
"""

import os
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import numpy as np

try:
    import mindspore as ms
    from mindspore import Tensor
    MINDSPORE_AVAILABLE = True
except ImportError:
    MINDSPORE_AVAILABLE = False

from ..models.behavior_model import StudentBehaviorModel
from ..models.anomaly_model import BehaviorVAE, AnomalyDetector
from ..models.learning_path import LearningPathAgent
from ..utils.model_registry import get_registry, ModelRegistry

logger = logging.getLogger(__name__)


class ModelInference:
    """
    Manages model loading and inference for all ML models.

    Automatically uses trained MindSpore models when available,
    falling back to heuristic methods when models aren't trained.
    """

    def __init__(self, feature_extractor, config: dict):
        """
        Initialize inference engine.

        Args:
            feature_extractor: FeatureExtractor instance
            config: Configuration dictionary
        """
        self.feature_extractor = feature_extractor
        self.config = config
        self.models = {}
        self.model_versions = {}
        self.use_heuristics = {}

        # Model registry for versioned models
        registry_path = config.get('registry_path', 'model_registry')
        self.registry = get_registry(registry_path)

        # Load available models
        self._load_models()

        # Feedback storage (for model improvement)
        self.feedback_log = []

    def _load_models(self):
        """Load trained models from registry or use heuristics."""
        model_config = self.config.get('models', {})

        # Behavior Prediction Model
        if model_config.get('behavior_prediction', {}).get('enabled', True):
            self._load_behavior_model()

        # Anomaly Detection Model
        if model_config.get('anomaly_detection', {}).get('enabled', True):
            self._load_anomaly_model()

        # Learning Path Model
        if model_config.get('learning_path', {}).get('enabled', True):
            self._load_learning_path_model()

    def _load_behavior_model(self):
        """Load behavior prediction model."""
        model_type = 'behavior'

        try:
            if MINDSPORE_AVAILABLE:
                prod_version = self.registry.get_production_version(model_type)

                if prod_version:
                    model = self.registry.get_model(
                        model_type,
                        prod_version,
                        StudentBehaviorModel
                    )
                    model.set_train(False)
                    self.models['behavior_prediction'] = model
                    self.model_versions['behavior_prediction'] = prod_version
                    self.use_heuristics['behavior_prediction'] = False
                    logger.info(f"Loaded behavior model: {prod_version}")
                    return

        except Exception as e:
            logger.warning(f"Could not load behavior model: {e}")

        # Fallback to heuristics
        self.models['behavior_prediction'] = None
        self.model_versions['behavior_prediction'] = 'heuristic-v1'
        self.use_heuristics['behavior_prediction'] = True
        logger.info("Behavior prediction: Using heuristic model")

    def _load_anomaly_model(self):
        """Load anomaly detection model."""
        model_type = 'anomaly'

        try:
            if MINDSPORE_AVAILABLE:
                prod_version = self.registry.get_production_version(model_type)

                if prod_version:
                    model = self.registry.get_model(
                        model_type,
                        prod_version,
                        BehaviorVAE
                    )
                    detector = AnomalyDetector(model, threshold=0.7)
                    self.models['anomaly_detection'] = detector
                    self.model_versions['anomaly_detection'] = prod_version
                    self.use_heuristics['anomaly_detection'] = False
                    logger.info(f"Loaded anomaly model: {prod_version}")
                    return

        except Exception as e:
            logger.warning(f"Could not load anomaly model: {e}")

        # Fallback to heuristics
        self.models['anomaly_detection'] = None
        self.model_versions['anomaly_detection'] = 'heuristic-v1'
        self.use_heuristics['anomaly_detection'] = True
        logger.info("Anomaly detection: Using heuristic model")

    def _load_learning_path_model(self):
        """Load learning path agent."""
        model_type = 'learning_path'

        try:
            if MINDSPORE_AVAILABLE:
                prod_version = self.registry.get_production_version(model_type)

                if prod_version:
                    # Load agent configuration
                    version_info = self.registry.get_version_info(model_type, prod_version)
                    agent_config = version_info.config or {
                        'state_dim': 53,
                        'action_dim': 100
                    }

                    agent = LearningPathAgent(**agent_config)
                    checkpoint_path = self.registry.get_model(model_type, prod_version)
                    agent.load(os.path.dirname(checkpoint_path))

                    self.models['learning_path'] = agent
                    self.model_versions['learning_path'] = prod_version
                    self.use_heuristics['learning_path'] = False
                    logger.info(f"Loaded learning path agent: {prod_version}")
                    return

        except Exception as e:
            logger.warning(f"Could not load learning path model: {e}")

        # Fallback to heuristics
        self.models['learning_path'] = None
        self.model_versions['learning_path'] = 'heuristic-v1'
        self.use_heuristics['learning_path'] = True
        logger.info("Learning path: Using heuristic model")

    def get_models_status(self) -> Dict[str, Any]:
        """Get status of all models."""
        status = {}

        for name in ['behavior_prediction', 'anomaly_detection', 'learning_path']:
            version = self.model_versions.get(name, 'not-loaded')
            is_heuristic = self.use_heuristics.get(name, True)

            status[name] = {
                'loaded': name in self.models,
                'version': version,
                'type': 'heuristic' if is_heuristic else 'trained',
                'mindspore_available': MINDSPORE_AVAILABLE
            }

        return status

    def predict_success(
        self,
        student_id: str,
        activity_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Predict success probability for a student.

        Uses trained model when available, falls back to heuristics.

        Args:
            student_id: Student MongoDB ID
            activity_id: Optional specific activity ID

        Returns:
            Dictionary with probability, confidence, and factors
        """
        try:
            # Extract features
            features = self.feature_extractor.extract_student_features(student_id)

            if not features:
                return self._default_prediction()

            # Check if we have a trained model
            if not self.use_heuristics.get('behavior_prediction', True):
                return self._predict_with_model(features)

            # Heuristic prediction
            return self._predict_with_heuristics(features)

        except Exception as e:
            logger.error(f"Prediction error for student {student_id}: {e}")
            return self._default_prediction()

    def _predict_with_model(self, features: Dict) -> Dict[str, Any]:
        """Use trained MindSpore model for prediction."""
        model = self.models.get('behavior_prediction')

        if model is None:
            return self._predict_with_heuristics(features)

        # Prepare input sequence
        feature_vector = features.get('feature_vector', [])
        if not feature_vector or len(feature_vector) < model.input_dim:
            # Pad or truncate to match expected input
            feature_vector = feature_vector[:model.input_dim] if feature_vector else [0.0] * model.input_dim
            feature_vector = feature_vector + [0.0] * (model.input_dim - len(feature_vector))

        # Create sequence (repeat for sequence length)
        sequence = np.array([feature_vector] * 10, dtype=np.float32)
        sequence = sequence.reshape(1, 10, -1)  # (batch=1, seq_len=10, features)

        # Run inference
        x = Tensor(sequence, ms.float32)
        probability, attention_weights = model(x)

        prob_value = float(probability.asnumpy()[0, 0])
        attention = attention_weights.asnumpy()[0].tolist()

        # Calculate confidence based on model certainty
        confidence = abs(prob_value - 0.5) * 2  # Higher confidence near 0 or 1

        factors = self._identify_factors(features, prob_value)

        return {
            'probability': round(prob_value, 3),
            'confidence': round(confidence, 3),
            'factors': factors,
            'risk_level': self._get_risk_level(prob_value),
            'attention_weights': attention[:5],  # Top 5 time steps
            'model_version': self.model_versions.get('behavior_prediction', 'unknown')
        }

    def _predict_with_heuristics(self, features: Dict) -> Dict[str, Any]:
        """Use heuristic rules for prediction."""
        behavioral = features.get('behavioral', {})
        performance = features.get('performance', {})
        ai_interaction = features.get('ai_interaction', {})
        temporal = features.get('temporal', {})

        # Calculate probability using weighted features
        success_rate = performance.get('success_rate', 50) / 100
        avg_score = performance.get('avg_score', 50) / 100
        ai_dependency = ai_interaction.get('ai_dependency_score', 0.3)
        learning_velocity = temporal.get('learning_velocity', 50) / 100
        days_since = min(temporal.get('days_since_last_session', 7) / 7, 1)

        # Weighted combination
        probability = (
            0.30 * success_rate +
            0.25 * avg_score +
            0.15 * (1 - ai_dependency) +
            0.20 * learning_velocity +
            0.10 * (1 - days_since)
        )

        probability = max(0.0, min(1.0, probability))
        confidence = self._calculate_confidence(features)
        factors = self._identify_factors(features, probability)

        return {
            'probability': round(probability, 3),
            'confidence': round(confidence, 3),
            'factors': factors,
            'risk_level': self._get_risk_level(probability),
            'model_version': self.model_versions.get('behavior_prediction', 'heuristic-v1')
        }

    def get_optimal_path(
        self,
        student_id: str,
        target_competency: Optional[str] = None,
        num_activities: int = 5
    ) -> Dict[str, Any]:
        """
        Generate optimal learning path for a student.

        Uses trained RL agent when available, falls back to heuristics.

        Args:
            student_id: Student MongoDB ID
            target_competency: Target skill to improve
            num_activities: Number of activities to recommend

        Returns:
            Dictionary with recommended activities and expected outcomes
        """
        try:
            features = self.feature_extractor.extract_student_features(student_id)

            if not features:
                return self._default_learning_path()

            # Check if we have a trained agent
            if not self.use_heuristics.get('learning_path', True):
                return self._get_path_with_model(features, num_activities)

            # Heuristic path generation
            return self._get_path_with_heuristics(features, target_competency, num_activities)

        except Exception as e:
            logger.error(f"Learning path error for student {student_id}: {e}")
            return self._default_learning_path()

    def _get_path_with_model(self, features: Dict, num_activities: int) -> Dict[str, Any]:
        """Use trained RL agent for path generation."""
        agent = self.models.get('learning_path')

        if agent is None:
            return self._get_path_with_heuristics(features, None, num_activities)

        # Prepare state vector
        feature_vector = features.get('feature_vector', [])
        state = np.array(feature_vector[:agent.state_dim], dtype=np.float32)
        if len(state) < agent.state_dim:
            state = np.pad(state, (0, agent.state_dim - len(state)))

        # Get top-k recommended activities
        recommended_actions = agent.select_top_k_actions(state, k=num_activities)

        return {
            'activities': recommended_actions,
            'outcomes': [
                {'metric': 'expected_competency_gain', 'value': 0.1 * num_activities}
            ],
            'reasoning': 'AI-optimized learning sequence',
            'model_version': self.model_versions.get('learning_path', 'unknown')
        }

    def _get_path_with_heuristics(
        self,
        features: Dict,
        target_competency: Optional[str],
        num_activities: int
    ) -> Dict[str, Any]:
        """Use heuristics for path generation."""
        performance = features.get('performance', {})
        difficulty_level = performance.get('difficulty_level', 1)
        success_rate = performance.get('success_rate', 50)

        if success_rate >= 80:
            recommended_difficulty = min(difficulty_level + 1, 2)
            reasoning = "Strong performance - ready for harder challenges"
        elif success_rate >= 50:
            recommended_difficulty = difficulty_level
            reasoning = "Steady progress - continue at current level"
        else:
            recommended_difficulty = max(difficulty_level - 1, 0)
            reasoning = "Building foundations - focus on basics first"

        difficulty_names = ['easy', 'medium', 'hard']

        return {
            'activities': [],
            'outcomes': [
                {'metric': 'expected_success_rate', 'value': min(success_rate + 10, 100)}
            ],
            'reasoning': reasoning,
            'recommended_difficulty': difficulty_names[recommended_difficulty],
            'target_competency': target_competency,
            'estimated_time': num_activities * 30,
            'model_version': 'heuristic-v1'
        }

    def detect_anomalies(self, student_id: str) -> Dict[str, Any]:
        """
        Detect behavioral anomalies for a student.

        Uses trained VAE when available, falls back to threshold-based detection.

        Args:
            student_id: Student MongoDB ID

        Returns:
            Dictionary with anomaly status, score, and types
        """
        try:
            features = self.feature_extractor.extract_student_features(student_id)

            if not features:
                return self._default_anomaly_result()

            # Check if we have a trained model
            if not self.use_heuristics.get('anomaly_detection', True):
                return self._detect_with_model(features)

            # Heuristic detection
            return self._detect_with_heuristics(features)

        except Exception as e:
            logger.error(f"Anomaly detection error for student {student_id}: {e}")
            return self._default_anomaly_result()

    def _detect_with_model(self, features: Dict) -> Dict[str, Any]:
        """Use trained VAE for anomaly detection."""
        detector = self.models.get('anomaly_detection')

        if detector is None:
            return self._detect_with_heuristics(features)

        # Prepare feature vector
        feature_vector = features.get('feature_vector', [])
        if len(feature_vector) < detector.model.input_dim:
            feature_vector = feature_vector + [0.0] * (detector.model.input_dim - len(feature_vector))
        feature_vector = feature_vector[:detector.model.input_dim]

        feature_array = np.array([feature_vector], dtype=np.float32)

        # Run detection
        result = detector.detect(feature_array)

        is_anomalous = bool(result['is_anomalous'][0]) if result['is_anomalous'] is not None else False
        anomaly_score = float(result['anomaly_scores'][0])

        # Get anomaly types if detected
        feature_names = [
            'typing_speed', 'thinking_pause', 'paste_freq', 'active_time',
            'tab_switches', 'success_rate', 'avg_score', 'difficulty',
            'attempts', 'hint_rate', 'hint_level', 'dependency_score',
            'session_duration', 'days_since_last', 'velocity'
        ]

        anomaly_types = []
        if is_anomalous:
            types = detector.classify_anomaly_type(feature_array, feature_names)
            anomaly_types = [{'type': t, 'severity': 'medium'} for t in types[0]]

        recommendations = self._generate_recommendations(anomaly_types)

        return {
            'is_anomalous': is_anomalous,
            'score': round(anomaly_score, 3),
            'reconstruction_error': float(result['reconstruction_errors'][0]),
            'types': anomaly_types,
            'recommendations': recommendations,
            'model_version': self.model_versions.get('anomaly_detection', 'unknown')
        }

    def _detect_with_heuristics(self, features: Dict) -> Dict[str, Any]:
        """Use threshold-based anomaly detection."""
        behavioral = features.get('behavioral', {})
        performance = features.get('performance', {})
        ai_interaction = features.get('ai_interaction', {})
        temporal = features.get('temporal', {})

        anomalies = []
        total_score = 0

        # Check for behavioral anomalies
        paste_freq = behavioral.get('paste_frequency', 0)
        if paste_freq > 5:
            anomalies.append({
                'type': 'high_paste_frequency',
                'severity': 'medium',
                'value': paste_freq
            })
            total_score += 0.3

        tab_switches = behavioral.get('tab_switch_rate', 0)
        if tab_switches > 20:
            anomalies.append({
                'type': 'excessive_tab_switches',
                'severity': 'medium',
                'value': tab_switches
            })
            total_score += 0.3

        ai_dep = ai_interaction.get('ai_dependency_score', 0)
        if ai_dep > 0.7:
            anomalies.append({
                'type': 'high_ai_dependency',
                'severity': 'low',
                'value': ai_dep
            })
            total_score += 0.2

        success_rate = performance.get('success_rate', 50)
        if success_rate < 30:
            anomalies.append({
                'type': 'low_performance',
                'severity': 'high',
                'value': success_rate
            })
            total_score += 0.4

        days_since = temporal.get('days_since_last_session', 0)
        if days_since > 14:
            anomalies.append({
                'type': 'extended_inactivity',
                'severity': 'medium',
                'value': days_since
            })
            total_score += 0.3

        is_anomalous = total_score >= 0.5
        recommendations = self._generate_recommendations(anomalies)

        return {
            'is_anomalous': is_anomalous,
            'score': round(min(total_score, 1.0), 3),
            'types': anomalies,
            'recommendations': recommendations,
            'model_version': 'heuristic-v1'
        }

    def get_personalized_hint(
        self,
        student_id: str,
        activity_id: str,
        code_context: str = '',
        error_context: Optional[str] = None,
        attempt_number: int = 1,
        time_spent: int = 0
    ) -> Dict[str, Any]:
        """
        Get personalized hint suggestion based on student profile.

        Args:
            student_id: Student MongoDB ID
            activity_id: Activity MongoDB ID
            code_context: Current code
            error_context: Error message if any
            attempt_number: Current attempt number
            time_spent: Time spent in seconds

        Returns:
            Dictionary with suggested hint level and reasoning
        """
        try:
            features = self.feature_extractor.extract_student_features(student_id)

            if not features:
                return self._default_hint_suggestion()

            ai_interaction = features.get('ai_interaction', {})
            performance = features.get('performance', {})

            ai_dependency = ai_interaction.get('ai_dependency_score', 0.3)
            success_rate = performance.get('success_rate', 50)
            avg_hint_level = ai_interaction.get('avg_hint_level', 2)

            suggested_level = 2

            if ai_dependency > 0.6:
                suggested_level = max(1, int(avg_hint_level) - 1)
                encourage_independence = True
                reasoning = "Encouraging independent problem-solving"
            elif ai_dependency < 0.3 and success_rate > 70:
                suggested_level = min(5, int(avg_hint_level) + 1)
                encourage_independence = False
                reasoning = "Strong independent work - full assistance available"
            else:
                suggested_level = int(avg_hint_level)
                encourage_independence = False
                reasoning = "Standard assistance level"

            if time_spent > 600:
                suggested_level = min(suggested_level + 1, 5)
                reasoning = "Extended struggle - offering more help"

            if attempt_number >= 3:
                suggested_level = min(suggested_level + 1, 5)
                reasoning = "Multiple attempts - providing additional guidance"

            return {
                'suggested_level': suggested_level,
                'adjusted_prompt': None,
                'reasoning': reasoning,
                'encourage_independence': encourage_independence,
                'student_profile': {
                    'ai_dependency': round(ai_dependency, 2),
                    'avg_hint_level': round(avg_hint_level, 1),
                    'success_rate': round(success_rate, 1)
                }
            }

        except Exception as e:
            logger.error(f"Hint personalization error: {e}")
            return self._default_hint_suggestion()

    def record_feedback(self, feedback: Dict[str, Any]):
        """Record prediction feedback for future model training."""
        feedback['recorded_at'] = datetime.now().isoformat()
        self.feedback_log.append(feedback)

        if len(self.feedback_log) >= 100:
            self._save_feedback_log()

    def _save_feedback_log(self):
        """Save feedback log to disk for training."""
        logger.info(f"Saving {len(self.feedback_log)} feedback entries")
        self.feedback_log = []

    def reload_models(self):
        """Reload models from registry (useful after new training)."""
        logger.info("Reloading models from registry...")
        self._load_models()

    # ============ HELPER METHODS ============

    def _calculate_confidence(self, features: Dict) -> float:
        """Calculate prediction confidence based on data availability."""
        behavioral = features.get('behavioral', {})
        performance = features.get('performance', {})

        data_points = len(behavioral) + len(performance)
        return min(data_points / 20, 1.0)

    def _identify_factors(self, features: Dict, probability: float) -> List[Dict]:
        """Identify key contributing factors to prediction."""
        factors = []

        performance = features.get('performance', {})
        success_rate = performance.get('success_rate', 50)

        if success_rate >= 70:
            factors.append({
                'name': 'High Success Rate',
                'impact': 'positive',
                'value': f"{success_rate:.0f}%"
            })
        elif success_rate < 40:
            factors.append({
                'name': 'Low Success Rate',
                'impact': 'negative',
                'value': f"{success_rate:.0f}%"
            })

        ai_interaction = features.get('ai_interaction', {})
        ai_dep = ai_interaction.get('ai_dependency_score', 0.3)

        if ai_dep > 0.6:
            factors.append({
                'name': 'High AI Dependency',
                'impact': 'negative',
                'value': f"{ai_dep:.0%}"
            })
        elif ai_dep < 0.2:
            factors.append({
                'name': 'Independent Learner',
                'impact': 'positive',
                'value': f"{ai_dep:.0%}"
            })

        return factors

    def _get_risk_level(self, probability: float) -> str:
        """Convert probability to risk level."""
        if probability >= 0.8:
            return 'low'
        elif probability >= 0.5:
            return 'medium'
        return 'high'

    def _generate_recommendations(self, anomalies: List[Dict]) -> List[str]:
        """Generate recommendations based on detected anomalies."""
        recommendations = []

        for anomaly in anomalies:
            anomaly_type = anomaly.get('type')

            if anomaly_type == 'high_paste_frequency':
                recommendations.append(
                    "Try solving problems without copying code from external sources"
                )
            elif anomaly_type == 'excessive_tab_switches':
                recommendations.append(
                    "Stay focused on the current problem before switching contexts"
                )
            elif anomaly_type == 'high_ai_dependency':
                recommendations.append(
                    "Challenge yourself by attempting problems before requesting hints"
                )
            elif anomaly_type == 'low_performance':
                recommendations.append(
                    "Consider reviewing fundamentals or trying easier problems first"
                )
            elif anomaly_type == 'extended_inactivity':
                recommendations.append(
                    "Regular practice helps maintain skills - try to code more frequently"
                )

        return recommendations

    # ============ DEFAULT RESPONSES ============

    def _default_prediction(self) -> Dict[str, Any]:
        return {
            'probability': 0.5,
            'confidence': 0.0,
            'factors': [],
            'risk_level': 'unknown',
            'model_version': 'default'
        }

    def _default_learning_path(self) -> Dict[str, Any]:
        return {
            'activities': [],
            'outcomes': [],
            'reasoning': 'Insufficient data for personalized recommendations',
            'estimated_time': None
        }

    def _default_anomaly_result(self) -> Dict[str, Any]:
        return {
            'is_anomalous': False,
            'score': 0.0,
            'types': [],
            'recommendations': []
        }

    def _default_hint_suggestion(self) -> Dict[str, Any]:
        return {
            'suggested_level': 2,
            'adjusted_prompt': None,
            'reasoning': 'Using default hint level',
            'encourage_independence': False
        }


# Export
__all__ = ['ModelInference']
