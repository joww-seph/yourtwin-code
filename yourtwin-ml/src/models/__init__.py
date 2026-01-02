"""
MindSpore Model Definitions for YourTwin

Models:
- StudentBehaviorModel: LSTM + Attention for success prediction
- BehaviorVAE: Variational autoencoder for anomaly detection
- KnowledgeGraphModel: Graph Attention Network for competency modeling
- LearningPathAgent: DQN for learning path optimization
"""

from .behavior_model import (
    StudentBehaviorModel,
    BehaviorModelWithConfidence,
    AttentionLayer,
    BehaviorLoss,
    create_behavior_model
)

from .anomaly_model import (
    BehaviorVAE,
    ConditionalVAE,
    VAELoss,
    AnomalyDetector,
    create_anomaly_model
)

from .knowledge_graph import (
    KnowledgeGraphModel,
    GraphAttentionLayer,
    TopicPrerequisiteModel,
    KnowledgeGraphLoss,
    create_knowledge_graph_model
)

from .learning_path import (
    DQNetwork,
    DuelingDQNetwork,
    LearningPathAgent,
    LearningEnvironment,
    create_learning_path_agent
)

__all__ = [
    # Behavior prediction
    'StudentBehaviorModel',
    'BehaviorModelWithConfidence',
    'AttentionLayer',
    'BehaviorLoss',
    'create_behavior_model',

    # Anomaly detection
    'BehaviorVAE',
    'ConditionalVAE',
    'VAELoss',
    'AnomalyDetector',
    'create_anomaly_model',

    # Knowledge graph
    'KnowledgeGraphModel',
    'GraphAttentionLayer',
    'TopicPrerequisiteModel',
    'KnowledgeGraphLoss',
    'create_knowledge_graph_model',

    # Learning path
    'DQNetwork',
    'DuelingDQNetwork',
    'LearningPathAgent',
    'LearningEnvironment',
    'create_learning_path_agent'
]
