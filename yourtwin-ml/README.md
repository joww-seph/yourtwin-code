# YourTwin ML Service

MindSpore-based machine learning microservice for the YourTwin Digital Twin platform.

## Overview

This service provides:
- **Student Success Prediction**: LSTM + Attention model predicts likelihood of success on activities
- **Learning Path Optimization**: DQN agent recommends optimal learning sequences
- **Anomaly Detection**: VAE identifies at-risk students and unusual behavior
- **Knowledge Graph**: GAT models student-topic-activity relationships
- **Personalized Hints**: Adjust hint levels based on student profile

## Architecture

```
yourtwin-ml/
├── src/
│   ├── api/               # Flask REST API
│   │   └── app.py         # Main Flask application
│   ├── features/          # Feature extraction
│   │   └── feature_extractor.py
│   ├── inference/         # Model inference
│   │   └── model_inference.py
│   ├── models/            # MindSpore neural networks
│   │   ├── behavior_model.py    # LSTM + Attention
│   │   ├── anomaly_model.py     # VAE
│   │   ├── learning_path.py     # DQN Agent
│   │   └── knowledge_graph.py   # GAT
│   ├── training/          # Training pipeline
│   │   ├── data_loader.py
│   │   └── trainer.py
│   └── utils/             # Utilities
│       └── model_registry.py
├── config/                # Configuration files
├── requirements.txt
└── README.md
```

## Setup

### Prerequisites
- Python 3.11
- MongoDB running on localhost:27017
- (Optional) Redis for caching

### Installation

```bash
# Create virtual environment with Python 3.11
py -3.11 -m venv venv

# Activate virtual environment
.\venv\Scripts\activate     # Windows
source venv/bin/activate    # Linux/Mac

# Install core dependencies
pip install -r requirements.txt

# Install MindSpore (from Huawei repository)
pip install mindspore==2.7.1 -i https://repo.mindspore.cn/pypi/simple --trusted-host repo.mindspore.cn --extra-index-url https://repo.huaweicloud.com/repository/pypi/simple
```

### Verify Installation

```bash
python -c "import mindspore; print(f'MindSpore {mindspore.__version__} OK')"
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
MONGODB_URI=mongodb://localhost:27017/yourtwin
ML_SERVICE_PORT=5001
MODEL_PATH=./models
```

### Running

```bash
# Activate virtual environment and run
.\venv\Scripts\activate     # Windows
source venv/bin/activate    # Linux/Mac
python src/api/app.py

# Production (with waitress - Windows)
waitress-serve --port=5001 src.api.app:app

# Production (with gunicorn - Linux)
gunicorn -w 4 -b 0.0.0.0:5001 src.api.app:app
```

## API Endpoints

### Health Check
```
GET /health

Response:
{
    "status": "healthy",
    "service": "yourtwin-ml",
    "version": "1.0.0",
    "models": {
        "behavior_prediction": {"loaded": true, "version": "v1.0.0"},
        "anomaly_detection": {"loaded": true, "version": "v1.0.0"},
        "learning_path": {"loaded": true, "version": "v1.0.0"}
    }
}
```

### Predict Success
```
POST /api/predict/success
{
    "studentId": "...",
    "activityId": "..."
}

Response:
{
    "probability": 0.75,
    "confidence": 0.85,
    "contributing_factors": [...],
    "risk_level": "low",
    "model_version": "v1.0.0"
}
```

### Learning Path
```
POST /api/learning-path
{
    "studentId": "...",
    "targetCompetency": "arrays",
    "numActivities": 5
}

Response:
{
    "recommended_activities": [...],
    "expected_outcomes": [...],
    "reasoning": "Strong performance - ready for harder challenges"
}
```

### Anomaly Detection
```
POST /api/anomaly/check
{
    "studentId": "..."
}

Response:
{
    "is_anomalous": false,
    "anomaly_score": 0.2,
    "anomaly_types": [],
    "recommendations": []
}
```

### Personalized Hint
```
POST /api/hint/personalized
{
    "studentId": "...",
    "activityId": "...",
    "codeContext": "...",
    "attemptNumber": 1,
    "timeSpent": 300
}

Response:
{
    "suggested_level": 2,
    "reasoning": "Standard assistance level",
    "encourage_independence": false
}
```

## ML Models

### 1. StudentBehaviorModel (LSTM + Attention)
Predicts student success probability from behavioral sequences.

**Architecture:**
- Input: Sequence of behavioral feature vectors (N time steps x 20 features)
- Bidirectional LSTM layers with dropout
- Attention mechanism for temporal focus
- Dense output layer with sigmoid activation

**Features used:**
- Behavioral: typing_speed, thinking_pause, paste_frequency, active_time
- Performance: success_rate, avg_score, difficulty_level
- AI Interaction: hint_rate, dependency_score
- Temporal: session_duration, learning_velocity

### 2. BehaviorVAE (Anomaly Detection)
Variational Autoencoder for detecting unusual learning patterns.

**Architecture:**
- Encoder: Input → Hidden layers → Latent (μ, σ²)
- Reparameterization trick for sampling
- Decoder: Latent → Hidden layers → Reconstruction
- Anomaly score based on reconstruction error

**Detects:**
- Copy-paste spikes
- Unusual session durations
- AI dependency anomalies
- Performance drops

### 3. LearningPathAgent (DQN)
Deep Q-Network for learning path optimization.

**Architecture:**
- Dueling DQN with separate value and advantage streams
- Experience replay buffer
- Target network for stable learning
- Epsilon-greedy exploration

**State:** 53-dimensional (50 competencies + 3 meta features)
**Action:** Activity ID to recommend
**Reward:** Competency improvement

### 4. KnowledgeGraphModel (GAT)
Graph Attention Network for knowledge graph modeling.

**Architecture:**
- Multi-head attention over graph edges
- Node embeddings for students, topics, activities
- Link prediction for proficiency estimation

## Training

### Train All Models
```python
from src.training import train_all_models
from src.features import FeatureExtractor

extractor = FeatureExtractor(mongo_uri)
models = train_all_models(extractor)
```

### Train Individual Models
```python
from src.models import StudentBehaviorModel
from src.training import BehaviorModelTrainer, StudentDataset

model = StudentBehaviorModel(input_dim=20, hidden_dim=64)
dataset = StudentDataset(feature_extractor)
dataset.load_data()

trainer = BehaviorModelTrainer(model)
trainer.train(dataset, epochs=100)
```

## Model Registry

Models are versioned and managed through the model registry:

```python
from src.utils import get_registry

registry = get_registry()

# Register a trained model
registry.register_model(model, 'behavior', metrics={'accuracy': 0.85})

# Set production version
registry.set_production('behavior', 'v1.0.0')

# Load production model
model = registry.get_model('behavior', model_class=StudentBehaviorModel)
```

## Implementation Status

### Completed
- [x] Directory structure
- [x] Feature extraction pipeline
- [x] Flask API with all endpoints
- [x] Heuristic-based predictions (fallback)
- [x] StudentBehaviorModel (LSTM + Attention)
- [x] BehaviorVAE for anomaly detection
- [x] LearningPathAgent (DQN)
- [x] KnowledgeGraphModel (GAT)
- [x] Training pipeline with early stopping
- [x] Model registry for versioning
- [x] Backend integration (mindsporeBridge.js)

### Upcoming
- [ ] Distributed training support
- [ ] A/B testing framework
- [ ] Production monitoring (Prometheus)
- [ ] Docker deployment

## Integration

The Node.js backend communicates with this service via `mindsporeBridge.js`:

```javascript
import mindsporeBridge from './services/mindsporeBridge.js';

// Get prediction
const prediction = await mindsporeBridge.predictStudentOutcome(studentId);

// Get learning path
const path = await mindsporeBridge.getOptimalLearningPath(studentId);

// Check for anomalies
const anomalies = await mindsporeBridge.detectAnomalies(studentId);
```

## License

MIT License - YourTwin Development Team
