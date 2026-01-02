"""
Student Behavior Prediction Model

LSTM + Attention network for predicting student success probability
based on sequential behavioral data from the Mirror Twin.

Architecture:
- Input: Sequence of behavioral feature vectors (last N activities)
- LSTM layers for temporal pattern recognition
- Attention mechanism for focusing on relevant time steps
- Dense output for success probability

This model learns patterns in:
- Typing behavior sequences
- Performance progression over time
- AI interaction patterns
- Session timing patterns
"""

import mindspore as ms
import mindspore.nn as nn
import mindspore.ops as ops
from mindspore import Tensor, Parameter
from mindspore.common.initializer import XavierUniform, Zero
import numpy as np


class AttentionLayer(nn.Cell):
    """
    Self-attention layer for focusing on important time steps.

    Learns which historical activities are most predictive of future success.
    """

    def __init__(self, hidden_dim: int):
        super().__init__()
        self.attention_weights = nn.Dense(hidden_dim, 1)
        self.softmax = nn.Softmax(axis=1)
        self.tanh = nn.Tanh()

    def construct(self, lstm_output):
        """
        Apply attention to LSTM outputs.

        Args:
            lstm_output: (batch, seq_len, hidden_dim)

        Returns:
            context: (batch, hidden_dim) - weighted sum of hidden states
            attention_weights: (batch, seq_len) - attention distribution
        """
        # Calculate attention scores
        scores = self.attention_weights(self.tanh(lstm_output))  # (batch, seq_len, 1)
        scores = scores.squeeze(-1)  # (batch, seq_len)

        # Normalize with softmax
        attention_weights = self.softmax(scores)  # (batch, seq_len)

        # Weighted sum of hidden states
        attention_weights_expanded = attention_weights.unsqueeze(-1)  # (batch, seq_len, 1)
        context = (lstm_output * attention_weights_expanded).sum(axis=1)  # (batch, hidden_dim)

        return context, attention_weights


class StudentBehaviorModel(nn.Cell):
    """
    LSTM + Attention model for student behavior prediction.

    Predicts the probability of student success on the next activity
    based on their historical behavioral sequence.

    Input features (per time step):
    - Behavioral: typing_speed, thinking_pause, paste_freq, active_time, tab_switches
    - Performance: success_rate, score, difficulty, attempts
    - AI Interaction: hint_rate, hint_level, dependency_score
    - Temporal: session_duration, days_since_last, velocity
    """

    def __init__(
        self,
        input_dim: int = 20,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.3,
        bidirectional: bool = True
    ):
        """
        Initialize the model.

        Args:
            input_dim: Number of features per time step
            hidden_dim: LSTM hidden dimension
            num_layers: Number of LSTM layers
            dropout: Dropout probability
            bidirectional: Whether to use bidirectional LSTM
        """
        super().__init__()

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.bidirectional = bidirectional
        self.num_directions = 2 if bidirectional else 1

        # Input normalization
        self.input_norm = nn.LayerNorm([input_dim])

        # LSTM layers
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=bidirectional
        )

        # Attention layer
        lstm_output_dim = hidden_dim * self.num_directions
        self.attention = AttentionLayer(lstm_output_dim)

        # Output layers
        self.dropout = nn.Dropout(p=dropout)

        self.fc1 = nn.Dense(lstm_output_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Dense(hidden_dim, 32)
        self.fc3 = nn.Dense(32, 1)
        self.sigmoid = nn.Sigmoid()

    def construct(self, x, seq_lengths=None):
        """
        Forward pass.

        Args:
            x: Input tensor (batch, seq_len, input_dim)
            seq_lengths: Optional sequence lengths for variable-length sequences

        Returns:
            probability: Success probability (batch, 1)
            attention_weights: Attention distribution (batch, seq_len)
        """
        batch_size, seq_len, _ = x.shape

        # Normalize input
        x = self.input_norm(x)

        # LSTM forward pass
        lstm_out, (h_n, c_n) = self.lstm(x)
        # lstm_out: (batch, seq_len, hidden_dim * num_directions)

        # Apply attention
        context, attention_weights = self.attention(lstm_out)
        # context: (batch, hidden_dim * num_directions)

        # Dropout
        context = self.dropout(context)

        # Fully connected layers
        out = self.fc1(context)
        out = self.relu(out)
        out = self.dropout(out)

        out = self.fc2(out)
        out = self.relu(out)

        out = self.fc3(out)
        probability = self.sigmoid(out)

        return probability, attention_weights

    def predict(self, x):
        """
        Get prediction without attention weights.

        Args:
            x: Input tensor (batch, seq_len, input_dim)

        Returns:
            probability: Success probability (batch,)
        """
        probability, _ = self.construct(x)
        return probability.squeeze(-1)


class BehaviorModelWithConfidence(nn.Cell):
    """
    Extended model that also predicts confidence in its prediction.

    Uses Monte Carlo dropout for uncertainty estimation.
    """

    def __init__(
        self,
        input_dim: int = 20,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.3
    ):
        super().__init__()

        self.base_model = StudentBehaviorModel(
            input_dim=input_dim,
            hidden_dim=hidden_dim,
            num_layers=num_layers,
            dropout=dropout
        )

        # Confidence head
        lstm_output_dim = hidden_dim * 2  # bidirectional
        self.confidence_fc = nn.Dense(lstm_output_dim, 1)
        self.confidence_sigmoid = nn.Sigmoid()

    def construct(self, x):
        """
        Forward pass with confidence estimation.

        Args:
            x: Input tensor (batch, seq_len, input_dim)

        Returns:
            probability: Success probability (batch, 1)
            confidence: Prediction confidence (batch, 1)
            attention_weights: Attention distribution (batch, seq_len)
        """
        # Get base prediction
        probability, attention_weights = self.base_model(x)

        # Get LSTM output for confidence estimation
        x_norm = self.base_model.input_norm(x)
        lstm_out, _ = self.base_model.lstm(x_norm)
        context, _ = self.base_model.attention(lstm_out)

        # Predict confidence
        confidence = self.confidence_sigmoid(self.confidence_fc(context))

        return probability, confidence, attention_weights


def create_behavior_model(config: dict) -> StudentBehaviorModel:
    """
    Factory function to create a behavior model from config.

    Args:
        config: Dictionary with model configuration

    Returns:
        Initialized StudentBehaviorModel
    """
    return StudentBehaviorModel(
        input_dim=config.get('input_dim', 20),
        hidden_dim=config.get('hidden_dim', 64),
        num_layers=config.get('num_layers', 2),
        dropout=config.get('dropout', 0.3),
        bidirectional=config.get('bidirectional', True)
    )


# Loss function for training
class BehaviorLoss(nn.Cell):
    """
    Combined loss for behavior prediction.

    Combines:
    - Binary cross-entropy for success prediction
    - Attention regularization to prevent degenerate attention
    """

    def __init__(self, attention_reg_weight: float = 0.01):
        super().__init__()
        self.bce_loss = nn.BCELoss()
        self.attention_reg_weight = attention_reg_weight

    def construct(self, pred_prob, attention_weights, true_labels):
        """
        Calculate combined loss.

        Args:
            pred_prob: Predicted probabilities (batch, 1)
            attention_weights: Attention distribution (batch, seq_len)
            true_labels: Ground truth labels (batch, 1)

        Returns:
            total_loss: Combined loss value
        """
        # BCE loss
        bce = self.bce_loss(pred_prob, true_labels)

        # Attention entropy regularization (encourage spread)
        # Higher entropy = more spread attention = better
        attention_entropy = -(attention_weights * ops.log(attention_weights + 1e-9)).sum(axis=1).mean()
        attention_reg = -self.attention_reg_weight * attention_entropy

        return bce + attention_reg


# Export
__all__ = [
    'StudentBehaviorModel',
    'BehaviorModelWithConfidence',
    'AttentionLayer',
    'BehaviorLoss',
    'create_behavior_model'
]
