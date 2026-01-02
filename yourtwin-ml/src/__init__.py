"""
YourTwin ML Service

MindSpore-based machine learning service for the YourTwin Digital Twin platform.
Provides predictive analytics, learning path optimization, and anomaly detection.

Components:
- models: Neural network architectures (LSTM, VAE, GAT, DQN)
- features: Feature extraction from student behavioral data
- training: Training pipelines and data loaders
- inference: Model serving and prediction APIs
- utils: Model registry and utilities
"""

__version__ = '1.0.0'
__author__ = 'YourTwin Development Team'

# Core exports
from .features.feature_extractor import FeatureExtractor
from .inference.model_inference import ModelInference
from .utils.model_registry import ModelRegistry, get_registry

# Model exports
from .models.behavior_model import StudentBehaviorModel, create_behavior_model
from .models.anomaly_model import BehaviorVAE, AnomalyDetector, create_anomaly_model
from .models.learning_path import LearningPathAgent, create_learning_path_agent
from .models.knowledge_graph import KnowledgeGraphModel, create_knowledge_graph_model

# Training exports
from .training.trainer import (
    BehaviorModelTrainer,
    AnomalyModelTrainer,
    LearningPathTrainer,
    train_all_models
)
from .training.data_loader import (
    StudentDataset,
    AnomalyDataset,
    SyntheticDataGenerator
)

__all__ = [
    # Version info
    '__version__',
    '__author__',

    # Core
    'FeatureExtractor',
    'ModelInference',
    'ModelRegistry',
    'get_registry',

    # Models
    'StudentBehaviorModel',
    'BehaviorVAE',
    'AnomalyDetector',
    'LearningPathAgent',
    'KnowledgeGraphModel',

    # Factory functions
    'create_behavior_model',
    'create_anomaly_model',
    'create_learning_path_agent',
    'create_knowledge_graph_model',

    # Training
    'BehaviorModelTrainer',
    'AnomalyModelTrainer',
    'LearningPathTrainer',
    'train_all_models',

    # Data
    'StudentDataset',
    'AnomalyDataset',
    'SyntheticDataGenerator'
]
