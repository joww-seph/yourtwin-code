"""
Behavioral Anomaly Detection Model

Variational Autoencoder (VAE) for detecting unusual student behavior patterns.
Learns the distribution of "normal" behavior and flags deviations.

Architecture:
- Encoder: Compresses behavioral features to latent space
- Latent space: Represents normal behavior distribution
- Decoder: Reconstructs input from latent representation
- Anomaly score: Based on reconstruction error

Detects anomalies such as:
- Sudden performance drops
- Unusual hint request patterns
- Copy-paste spikes
- Session duration anomalies
- Learning velocity changes
"""

import mindspore as ms
import mindspore.nn as nn
import mindspore.ops as ops
from mindspore import Tensor, Parameter
from mindspore.common.initializer import XavierUniform, Zero
import numpy as np
from typing import Tuple, Dict, Optional


class Encoder(nn.Cell):
    """
    VAE Encoder network.

    Compresses input features to mean and log-variance of latent distribution.
    """

    def __init__(
        self,
        input_dim: int,
        hidden_dims: list,
        latent_dim: int
    ):
        super().__init__()

        # Build encoder layers
        layers = []
        in_dim = input_dim

        for h_dim in hidden_dims:
            layers.append(nn.Dense(in_dim, h_dim))
            layers.append(nn.BatchNorm1d(h_dim))
            layers.append(nn.LeakyReLU(alpha=0.2))
            layers.append(nn.Dropout(p=0.2))
            in_dim = h_dim

        self.encoder = nn.SequentialCell(layers)

        # Latent space projections
        self.fc_mu = nn.Dense(hidden_dims[-1], latent_dim)
        self.fc_log_var = nn.Dense(hidden_dims[-1], latent_dim)

    def construct(self, x):
        """
        Encode input to latent distribution parameters.

        Args:
            x: Input features (batch, input_dim)

        Returns:
            mu: Mean of latent distribution (batch, latent_dim)
            log_var: Log variance of latent distribution (batch, latent_dim)
        """
        h = self.encoder(x)
        mu = self.fc_mu(h)
        log_var = self.fc_log_var(h)
        return mu, log_var


class Decoder(nn.Cell):
    """
    VAE Decoder network.

    Reconstructs input from latent representation.
    """

    def __init__(
        self,
        latent_dim: int,
        hidden_dims: list,
        output_dim: int
    ):
        super().__init__()

        # Build decoder layers (reverse of encoder)
        layers = []
        in_dim = latent_dim

        for h_dim in reversed(hidden_dims):
            layers.append(nn.Dense(in_dim, h_dim))
            layers.append(nn.BatchNorm1d(h_dim))
            layers.append(nn.LeakyReLU(alpha=0.2))
            layers.append(nn.Dropout(p=0.2))
            in_dim = h_dim

        # Output layer
        layers.append(nn.Dense(hidden_dims[0], output_dim))
        layers.append(nn.Sigmoid())  # Output in [0, 1] for normalized features

        self.decoder = nn.SequentialCell(layers)

    def construct(self, z):
        """
        Decode latent representation to reconstructed input.

        Args:
            z: Latent representation (batch, latent_dim)

        Returns:
            x_recon: Reconstructed input (batch, output_dim)
        """
        return self.decoder(z)


class BehaviorVAE(nn.Cell):
    """
    Variational Autoencoder for behavioral anomaly detection.

    Learns the distribution of normal student behavior.
    High reconstruction error indicates anomalous behavior.
    """

    def __init__(
        self,
        input_dim: int = 15,
        hidden_dims: list = None,
        latent_dim: int = 8
    ):
        """
        Initialize VAE.

        Args:
            input_dim: Number of behavioral features
            hidden_dims: List of hidden layer dimensions
            latent_dim: Dimension of latent space
        """
        super().__init__()

        if hidden_dims is None:
            hidden_dims = [64, 32]

        self.input_dim = input_dim
        self.latent_dim = latent_dim

        # Encoder and decoder
        self.encoder = Encoder(input_dim, hidden_dims, latent_dim)
        self.decoder = Decoder(latent_dim, hidden_dims, input_dim)

        # For reparameterization
        self.standard_normal = ops.StandardNormal()

    def reparameterize(self, mu, log_var):
        """
        Reparameterization trick for sampling from latent distribution.

        Args:
            mu: Mean (batch, latent_dim)
            log_var: Log variance (batch, latent_dim)

        Returns:
            z: Sampled latent vector (batch, latent_dim)
        """
        std = ops.exp(0.5 * log_var)
        eps = self.standard_normal(mu.shape)
        z = mu + eps * std
        return z

    def construct(self, x):
        """
        Forward pass through VAE.

        Args:
            x: Input features (batch, input_dim)

        Returns:
            x_recon: Reconstructed input (batch, input_dim)
            mu: Latent mean (batch, latent_dim)
            log_var: Latent log variance (batch, latent_dim)
        """
        # Encode
        mu, log_var = self.encoder(x)

        # Reparameterize
        z = self.reparameterize(mu, log_var)

        # Decode
        x_recon = self.decoder(z)

        return x_recon, mu, log_var

    def get_reconstruction_error(self, x):
        """
        Calculate reconstruction error for anomaly detection.

        Args:
            x: Input features (batch, input_dim)

        Returns:
            error: Per-sample reconstruction error (batch,)
        """
        x_recon, _, _ = self.construct(x)
        # Mean squared error per sample
        error = ((x - x_recon) ** 2).mean(axis=1)
        return error

    def get_anomaly_score(self, x, threshold: float = None):
        """
        Calculate anomaly score and classification.

        Args:
            x: Input features (batch, input_dim)
            threshold: Optional threshold for anomaly classification

        Returns:
            Dictionary with anomaly scores and classification
        """
        recon_error = self.get_reconstruction_error(x)

        # Normalize to [0, 1] using sigmoid
        anomaly_score = ops.sigmoid(recon_error * 10 - 5)  # Centered around 0.5

        result = {
            'reconstruction_error': recon_error,
            'anomaly_score': anomaly_score
        }

        if threshold is not None:
            result['is_anomalous'] = anomaly_score > threshold

        return result

    def encode(self, x):
        """
        Encode input to latent space (for analysis).

        Args:
            x: Input features (batch, input_dim)

        Returns:
            z: Latent representation (batch, latent_dim)
        """
        mu, log_var = self.encoder(x)
        z = self.reparameterize(mu, log_var)
        return z


class VAELoss(nn.Cell):
    """
    VAE loss function combining reconstruction and KL divergence.

    Loss = Reconstruction Loss + β * KL Divergence

    The β parameter controls the trade-off between reconstruction
    accuracy and latent space regularization.
    """

    def __init__(self, beta: float = 1.0):
        """
        Initialize loss function.

        Args:
            beta: Weight for KL divergence term
        """
        super().__init__()
        self.beta = beta
        self.mse_loss = nn.MSELoss()

    def construct(self, x, x_recon, mu, log_var):
        """
        Calculate VAE loss.

        Args:
            x: Original input (batch, input_dim)
            x_recon: Reconstructed input (batch, input_dim)
            mu: Latent mean (batch, latent_dim)
            log_var: Latent log variance (batch, latent_dim)

        Returns:
            total_loss: Combined loss value
            recon_loss: Reconstruction loss component
            kl_loss: KL divergence component
        """
        # Reconstruction loss
        recon_loss = self.mse_loss(x_recon, x)

        # KL divergence loss
        # KL(q(z|x) || p(z)) where p(z) = N(0, 1)
        kl_loss = -0.5 * (1 + log_var - mu ** 2 - ops.exp(log_var)).sum(axis=1).mean()

        # Total loss
        total_loss = recon_loss + self.beta * kl_loss

        return total_loss, recon_loss, kl_loss


class ConditionalVAE(nn.Cell):
    """
    Conditional VAE that incorporates student context.

    Conditions the generation on student metadata (difficulty level,
    course, etc.) for more accurate anomaly detection within context.
    """

    def __init__(
        self,
        input_dim: int = 15,
        condition_dim: int = 5,
        hidden_dims: list = None,
        latent_dim: int = 8
    ):
        """
        Initialize Conditional VAE.

        Args:
            input_dim: Number of behavioral features
            condition_dim: Dimension of conditioning vector
            hidden_dims: List of hidden layer dimensions
            latent_dim: Dimension of latent space
        """
        super().__init__()

        if hidden_dims is None:
            hidden_dims = [64, 32]

        self.input_dim = input_dim
        self.condition_dim = condition_dim
        self.latent_dim = latent_dim

        # Encoder takes input + condition
        self.encoder = Encoder(input_dim + condition_dim, hidden_dims, latent_dim)

        # Decoder takes latent + condition
        self.decoder = Decoder(latent_dim + condition_dim, hidden_dims, input_dim)

        self.standard_normal = ops.StandardNormal()

    def reparameterize(self, mu, log_var):
        std = ops.exp(0.5 * log_var)
        eps = self.standard_normal(mu.shape)
        return mu + eps * std

    def construct(self, x, condition):
        """
        Forward pass with conditioning.

        Args:
            x: Input features (batch, input_dim)
            condition: Conditioning vector (batch, condition_dim)

        Returns:
            x_recon: Reconstructed input
            mu: Latent mean
            log_var: Latent log variance
        """
        # Concatenate input with condition for encoder
        encoder_input = ops.concat([x, condition], axis=1)
        mu, log_var = self.encoder(encoder_input)

        # Reparameterize
        z = self.reparameterize(mu, log_var)

        # Concatenate latent with condition for decoder
        decoder_input = ops.concat([z, condition], axis=1)
        x_recon = self.decoder(decoder_input)

        return x_recon, mu, log_var


def create_anomaly_model(config: dict) -> BehaviorVAE:
    """
    Factory function to create anomaly detection model.

    Args:
        config: Dictionary with model configuration

    Returns:
        Initialized BehaviorVAE
    """
    return BehaviorVAE(
        input_dim=config.get('input_dim', 15),
        hidden_dims=config.get('hidden_dims', [64, 32]),
        latent_dim=config.get('latent_dim', 8)
    )


class AnomalyDetector:
    """
    High-level anomaly detection interface.

    Wraps the VAE model with preprocessing and postprocessing.
    """

    def __init__(self, model: BehaviorVAE, threshold: float = 0.7):
        """
        Initialize detector.

        Args:
            model: Trained BehaviorVAE model
            threshold: Anomaly score threshold
        """
        self.model = model
        self.threshold = threshold
        self.model.set_train(False)

    def detect(self, features: np.ndarray) -> Dict:
        """
        Detect anomalies in behavioral features.

        Args:
            features: Numpy array of features (batch, input_dim)

        Returns:
            Dictionary with detection results
        """
        # Convert to tensor
        x = Tensor(features.astype(np.float32))

        # Get anomaly scores
        result = self.model.get_anomaly_score(x, self.threshold)

        # Convert back to numpy
        return {
            'anomaly_scores': result['anomaly_score'].asnumpy(),
            'is_anomalous': result['is_anomalous'].asnumpy() if 'is_anomalous' in result else None,
            'reconstruction_errors': result['reconstruction_error'].asnumpy()
        }

    def classify_anomaly_type(self, features: np.ndarray, feature_names: list) -> list:
        """
        Classify the type of anomaly based on reconstruction error per feature.

        Args:
            features: Input features
            feature_names: Names of features

        Returns:
            List of anomaly types for each sample
        """
        x = Tensor(features.astype(np.float32))
        x_recon, _, _ = self.model.construct(x)

        # Per-feature reconstruction error
        per_feature_error = np.abs(features - x_recon.asnumpy())

        anomaly_types = []
        for i in range(len(features)):
            # Find top contributing features
            top_indices = np.argsort(per_feature_error[i])[-3:][::-1]
            types = [feature_names[idx] for idx in top_indices if per_feature_error[i][idx] > 0.3]
            anomaly_types.append(types)

        return anomaly_types


# Export
__all__ = [
    'BehaviorVAE',
    'ConditionalVAE',
    'VAELoss',
    'AnomalyDetector',
    'create_anomaly_model'
]
