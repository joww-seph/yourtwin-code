"""
Model Training Pipeline for YourTwin ML

Provides training loops, checkpointing, and logging for all models.
Supports distributed training and early stopping.
"""

import mindspore as ms
import mindspore.nn as nn
from mindspore import Tensor, context
from mindspore.train.callback import Callback, ModelCheckpoint, CheckpointConfig
import numpy as np
from typing import Dict, Optional, Callable, List
from datetime import datetime
import os
import json

from ..models.behavior_model import StudentBehaviorModel, BehaviorLoss
from ..models.anomaly_model import BehaviorVAE, VAELoss
from ..models.learning_path import LearningPathAgent, LearningEnvironment
from .data_loader import StudentDataset, AnomalyDataset, SyntheticDataGenerator


class TrainingLogger:
    """Simple training logger with metrics tracking."""

    def __init__(self, log_dir: str = "logs"):
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)

        self.metrics = {
            'train_loss': [],
            'val_loss': [],
            'epochs': [],
            'learning_rates': []
        }

        self.start_time = datetime.now()
        self.log_file = os.path.join(
            log_dir,
            f"training_{self.start_time.strftime('%Y%m%d_%H%M%S')}.log"
        )

    def log(self, message: str):
        """Log message with timestamp."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)

        with open(self.log_file, 'a') as f:
            f.write(log_entry + '\n')

    def log_metrics(self, epoch: int, metrics: Dict):
        """Log training metrics."""
        self.metrics['epochs'].append(epoch)

        for key, value in metrics.items():
            if key not in self.metrics:
                self.metrics[key] = []
            self.metrics[key].append(value)

        metrics_str = ', '.join([f"{k}: {v:.4f}" for k, v in metrics.items()])
        self.log(f"Epoch {epoch}: {metrics_str}")

    def save_metrics(self, path: str = None):
        """Save metrics to JSON file."""
        if path is None:
            path = os.path.join(self.log_dir, "metrics.json")

        with open(path, 'w') as f:
            json.dump(self.metrics, f, indent=2)


class EarlyStopping:
    """Early stopping to prevent overfitting."""

    def __init__(self, patience: int = 10, min_delta: float = 0.001):
        """
        Initialize early stopping.

        Args:
            patience: Number of epochs without improvement before stopping
            min_delta: Minimum change to qualify as improvement
        """
        self.patience = patience
        self.min_delta = min_delta
        self.best_loss = float('inf')
        self.counter = 0
        self.should_stop = False

    def __call__(self, val_loss: float) -> bool:
        """
        Check if training should stop.

        Args:
            val_loss: Current validation loss

        Returns:
            True if training should stop
        """
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.should_stop = True

        return self.should_stop


class BehaviorModelTrainer:
    """
    Trainer for StudentBehaviorModel.

    Handles training loop, validation, and checkpointing.
    """

    def __init__(
        self,
        model: StudentBehaviorModel,
        learning_rate: float = 0.001,
        weight_decay: float = 1e-4,
        checkpoint_dir: str = "checkpoints/behavior",
        log_dir: str = "logs/behavior"
    ):
        """
        Initialize trainer.

        Args:
            model: StudentBehaviorModel instance
            learning_rate: Learning rate
            weight_decay: L2 regularization weight
            checkpoint_dir: Directory for checkpoints
            log_dir: Directory for logs
        """
        self.model = model
        self.checkpoint_dir = checkpoint_dir

        os.makedirs(checkpoint_dir, exist_ok=True)

        # Optimizer
        self.optimizer = nn.Adam(
            model.trainable_params(),
            learning_rate=learning_rate,
            weight_decay=weight_decay
        )

        # Loss function
        self.loss_fn = BehaviorLoss()

        # Logger
        self.logger = TrainingLogger(log_dir)

        # Early stopping
        self.early_stopping = EarlyStopping(patience=10)

        # Best model tracking
        self.best_val_loss = float('inf')

    def train_step(self, batch_x: np.ndarray, batch_y: np.ndarray) -> float:
        """
        Single training step.

        Args:
            batch_x: Input sequences (batch, seq_len, features)
            batch_y: Labels (batch, 1)

        Returns:
            Loss value
        """
        x = Tensor(batch_x, ms.float32)
        y = Tensor(batch_y, ms.float32)

        # Forward pass
        def forward_fn(x, y):
            pred, attention = self.model(x)
            loss = self.loss_fn(pred, attention, y)
            return loss

        # Gradient computation
        grad_fn = ms.value_and_grad(forward_fn, None, self.optimizer.parameters)
        loss, grads = grad_fn(x, y)

        # Update weights
        self.optimizer(grads)

        return float(loss.asnumpy())

    def validate(self, val_data: StudentDataset) -> float:
        """
        Validate model on validation set.

        Args:
            val_data: Validation dataset

        Returns:
            Average validation loss
        """
        self.model.set_train(False)

        total_loss = 0.0
        n_batches = 0

        generator = val_data.create_generator(batch_size=32, shuffle=False)

        for batch_x, batch_y in generator:
            x = Tensor(batch_x, ms.float32)
            y = Tensor(batch_y, ms.float32)

            pred, attention = self.model(x)
            loss = self.loss_fn(pred, attention, y)

            total_loss += float(loss.asnumpy())
            n_batches += 1

            if n_batches >= len(val_data) // 32:
                break

        self.model.set_train(True)

        return total_loss / max(n_batches, 1)

    def train(
        self,
        train_data: StudentDataset,
        val_data: StudentDataset = None,
        epochs: int = 100,
        batch_size: int = 32,
        validate_every: int = 5
    ):
        """
        Train the model.

        Args:
            train_data: Training dataset
            val_data: Optional validation dataset
            epochs: Number of epochs
            batch_size: Batch size
            validate_every: Epochs between validation
        """
        self.logger.log(f"Starting training for {epochs} epochs")
        self.logger.log(f"Training samples: {len(train_data)}")

        if val_data:
            self.logger.log(f"Validation samples: {len(val_data)}")

        steps_per_epoch = max(len(train_data) // batch_size, 1)

        for epoch in range(1, epochs + 1):
            self.model.set_train(True)

            epoch_loss = 0.0
            generator = train_data.create_generator(batch_size, shuffle=True)

            for step, (batch_x, batch_y) in enumerate(generator):
                loss = self.train_step(batch_x, batch_y)
                epoch_loss += loss

                if step >= steps_per_epoch:
                    break

            avg_train_loss = epoch_loss / steps_per_epoch

            # Validation
            metrics = {'train_loss': avg_train_loss}

            if val_data and epoch % validate_every == 0:
                val_loss = self.validate(val_data)
                metrics['val_loss'] = val_loss

                # Save best model
                if val_loss < self.best_val_loss:
                    self.best_val_loss = val_loss
                    self.save_checkpoint(f"best_model.ckpt")

                # Early stopping
                if self.early_stopping(val_loss):
                    self.logger.log("Early stopping triggered")
                    break

            self.logger.log_metrics(epoch, metrics)

            # Periodic checkpoint
            if epoch % 10 == 0:
                self.save_checkpoint(f"epoch_{epoch}.ckpt")

        self.logger.log("Training completed")
        self.logger.save_metrics()

    def save_checkpoint(self, filename: str):
        """Save model checkpoint."""
        path = os.path.join(self.checkpoint_dir, filename)
        ms.save_checkpoint(self.model, path)
        self.logger.log(f"Saved checkpoint: {path}")

    def load_checkpoint(self, filename: str):
        """Load model checkpoint."""
        path = os.path.join(self.checkpoint_dir, filename)
        ms.load_checkpoint(path, self.model)
        self.logger.log(f"Loaded checkpoint: {path}")


class AnomalyModelTrainer:
    """
    Trainer for BehaviorVAE anomaly detection model.
    """

    def __init__(
        self,
        model: BehaviorVAE,
        learning_rate: float = 0.001,
        beta: float = 1.0,
        checkpoint_dir: str = "checkpoints/anomaly",
        log_dir: str = "logs/anomaly"
    ):
        """
        Initialize trainer.

        Args:
            model: BehaviorVAE instance
            learning_rate: Learning rate
            beta: KL divergence weight
            checkpoint_dir: Checkpoint directory
            log_dir: Log directory
        """
        self.model = model
        self.checkpoint_dir = checkpoint_dir

        os.makedirs(checkpoint_dir, exist_ok=True)

        self.optimizer = nn.Adam(
            model.trainable_params(),
            learning_rate=learning_rate
        )

        self.loss_fn = VAELoss(beta=beta)
        self.logger = TrainingLogger(log_dir)
        self.early_stopping = EarlyStopping(patience=15)
        self.best_loss = float('inf')

    def train_step(self, batch_x: np.ndarray) -> Dict[str, float]:
        """
        Single training step.

        Args:
            batch_x: Input features (batch, input_dim)

        Returns:
            Dictionary with loss components
        """
        x = Tensor(batch_x, ms.float32)

        def forward_fn(x):
            x_recon, mu, log_var = self.model(x)
            total_loss, recon_loss, kl_loss = self.loss_fn(x, x_recon, mu, log_var)
            return total_loss, recon_loss, kl_loss

        grad_fn = ms.value_and_grad(forward_fn, None, self.optimizer.parameters, has_aux=True)
        (total_loss, recon_loss, kl_loss), grads = grad_fn(x)

        self.optimizer(grads)

        return {
            'total_loss': float(total_loss.asnumpy()),
            'recon_loss': float(recon_loss.asnumpy()),
            'kl_loss': float(kl_loss.asnumpy())
        }

    def train(
        self,
        train_data: AnomalyDataset,
        epochs: int = 100,
        batch_size: int = 64
    ):
        """
        Train the VAE model.

        Args:
            train_data: Training dataset
            epochs: Number of epochs
            batch_size: Batch size
        """
        self.logger.log(f"Starting VAE training for {epochs} epochs")
        self.logger.log(f"Training samples: {len(train_data)}")

        steps_per_epoch = max(len(train_data) // batch_size, 1)

        for epoch in range(1, epochs + 1):
            self.model.set_train(True)

            epoch_losses = {'total_loss': 0.0, 'recon_loss': 0.0, 'kl_loss': 0.0}
            generator = train_data.create_generator(batch_size, shuffle=True)

            for step, batch_x in enumerate(generator):
                losses = self.train_step(batch_x)

                for key in epoch_losses:
                    epoch_losses[key] += losses[key]

                if step >= steps_per_epoch:
                    break

            # Average losses
            metrics = {k: v / steps_per_epoch for k, v in epoch_losses.items()}
            self.logger.log_metrics(epoch, metrics)

            # Save best model
            if metrics['total_loss'] < self.best_loss:
                self.best_loss = metrics['total_loss']
                self.save_checkpoint("best_model.ckpt")

            # Early stopping
            if self.early_stopping(metrics['total_loss']):
                self.logger.log("Early stopping triggered")
                break

            if epoch % 10 == 0:
                self.save_checkpoint(f"epoch_{epoch}.ckpt")

        self.logger.log("Training completed")
        self.logger.save_metrics()

    def save_checkpoint(self, filename: str):
        """Save model checkpoint."""
        path = os.path.join(self.checkpoint_dir, filename)
        ms.save_checkpoint(self.model, path)

    def load_checkpoint(self, filename: str):
        """Load model checkpoint."""
        path = os.path.join(self.checkpoint_dir, filename)
        ms.load_checkpoint(path, self.model)


class LearningPathTrainer:
    """
    Trainer for LearningPathAgent using reinforcement learning.
    """

    def __init__(
        self,
        agent: LearningPathAgent,
        environment: LearningEnvironment,
        checkpoint_dir: str = "checkpoints/learning_path",
        log_dir: str = "logs/learning_path"
    ):
        """
        Initialize RL trainer.

        Args:
            agent: LearningPathAgent instance
            environment: LearningEnvironment instance
            checkpoint_dir: Checkpoint directory
            log_dir: Log directory
        """
        self.agent = agent
        self.env = environment
        self.checkpoint_dir = checkpoint_dir

        os.makedirs(checkpoint_dir, exist_ok=True)

        self.logger = TrainingLogger(log_dir)
        self.best_reward = float('-inf')

    def train(
        self,
        num_episodes: int = 1000,
        max_steps: int = 50,
        update_freq: int = 4,
        log_freq: int = 10
    ):
        """
        Train the RL agent.

        Args:
            num_episodes: Number of training episodes
            max_steps: Maximum steps per episode
            update_freq: Steps between network updates
            log_freq: Episodes between logging
        """
        self.logger.log(f"Starting RL training for {num_episodes} episodes")

        episode_rewards = []

        for episode in range(1, num_episodes + 1):
            state = self.env.reset()
            episode_reward = 0.0

            for step in range(max_steps):
                # Select action
                action = self.agent.select_action(state, training=True)

                # Take action
                next_state, reward, done, info = self.env.step(action)

                # Store transition
                self.agent.store_transition(state, action, reward, next_state, done)

                # Train
                if step % update_freq == 0:
                    self.agent.train_step()

                episode_reward += reward
                state = next_state

                if done:
                    break

            episode_rewards.append(episode_reward)

            # Logging
            if episode % log_freq == 0:
                avg_reward = np.mean(episode_rewards[-log_freq:])
                metrics = {
                    'avg_reward': avg_reward,
                    'epsilon': self.agent.epsilon,
                    'episode_length': step + 1
                }
                self.logger.log_metrics(episode, metrics)

                # Save best model
                if avg_reward > self.best_reward:
                    self.best_reward = avg_reward
                    self.save_checkpoint("best_model")

            # Periodic checkpoint
            if episode % 100 == 0:
                self.save_checkpoint(f"episode_{episode}")

        self.logger.log("Training completed")
        self.logger.save_metrics()

    def evaluate(self, num_episodes: int = 100) -> Dict:
        """
        Evaluate the trained agent.

        Args:
            num_episodes: Number of evaluation episodes

        Returns:
            Evaluation metrics
        """
        rewards = []
        competency_gains = []

        for _ in range(num_episodes):
            state = self.env.reset()
            episode_reward = 0.0
            initial_comp = self.env.competencies.copy()

            done = False
            while not done:
                action = self.agent.select_action(state, training=False)
                state, reward, done, _ = self.env.step(action)
                episode_reward += reward

            rewards.append(episode_reward)
            competency_gains.append(self.env.competencies.mean() - initial_comp.mean())

        return {
            'mean_reward': np.mean(rewards),
            'std_reward': np.std(rewards),
            'mean_competency_gain': np.mean(competency_gains)
        }

    def save_checkpoint(self, name: str):
        """Save agent checkpoint."""
        path = os.path.join(self.checkpoint_dir, name)
        os.makedirs(path, exist_ok=True)
        self.agent.save(path)

    def load_checkpoint(self, name: str):
        """Load agent checkpoint."""
        path = os.path.join(self.checkpoint_dir, name)
        self.agent.load(path)


def train_all_models(
    feature_extractor,
    config: Dict = None
):
    """
    Train all models in the YourTwin ML pipeline.

    Args:
        feature_extractor: FeatureExtractor with database connections
        config: Optional training configuration
    """
    if config is None:
        config = {
            'behavior': {'epochs': 50, 'batch_size': 32, 'learning_rate': 0.001},
            'anomaly': {'epochs': 100, 'batch_size': 64, 'learning_rate': 0.001},
            'learning_path': {'episodes': 500, 'max_steps': 30}
        }

    print("=" * 50)
    print("YourTwin ML Training Pipeline")
    print("=" * 50)

    # 1. Train Behavior Model
    print("\n[1/3] Training Behavior Prediction Model...")

    behavior_model = StudentBehaviorModel(
        input_dim=20,
        hidden_dim=64,
        num_layers=2
    )

    student_dataset = StudentDataset(feature_extractor)
    student_dataset.load_data()

    if len(student_dataset) > 0:
        behavior_trainer = BehaviorModelTrainer(
            behavior_model,
            learning_rate=config['behavior']['learning_rate']
        )
        behavior_trainer.train(
            student_dataset,
            epochs=config['behavior']['epochs'],
            batch_size=config['behavior']['batch_size']
        )
    else:
        print("No data available for behavior model training")

    # 2. Train Anomaly Model
    print("\n[2/3] Training Anomaly Detection Model...")

    anomaly_model = BehaviorVAE(input_dim=15, latent_dim=8)

    anomaly_dataset = AnomalyDataset(feature_extractor)
    anomaly_dataset.load_data()

    if len(anomaly_dataset) > 0:
        anomaly_trainer = AnomalyModelTrainer(
            anomaly_model,
            learning_rate=config['anomaly']['learning_rate']
        )
        anomaly_trainer.train(
            anomaly_dataset,
            epochs=config['anomaly']['epochs'],
            batch_size=config['anomaly']['batch_size']
        )
    else:
        print("No data available for anomaly model training")

    # 3. Train Learning Path Agent
    print("\n[3/3] Training Learning Path Agent...")

    agent = LearningPathAgent(
        state_dim=53,  # 50 competencies + 3 meta features
        action_dim=100,  # number of activities
        hidden_dim=128
    )

    env = LearningEnvironment(
        num_activities=100,
        num_competencies=50
    )

    lp_trainer = LearningPathTrainer(agent, env)
    lp_trainer.train(
        num_episodes=config['learning_path']['episodes'],
        max_steps=config['learning_path']['max_steps']
    )

    print("\n" + "=" * 50)
    print("Training Pipeline Complete!")
    print("=" * 50)

    return {
        'behavior_model': behavior_model,
        'anomaly_model': anomaly_model,
        'learning_path_agent': agent
    }


# Export
__all__ = [
    'TrainingLogger',
    'EarlyStopping',
    'BehaviorModelTrainer',
    'AnomalyModelTrainer',
    'LearningPathTrainer',
    'train_all_models'
]
