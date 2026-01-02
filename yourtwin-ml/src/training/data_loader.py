"""
Data Loaders for MindSpore Training

Provides dataset classes and data loaders for training the ML models.
Handles data preprocessing, batching, and augmentation.
"""

import numpy as np
from typing import Tuple, List, Dict, Optional, Generator
from datetime import datetime, timedelta
import random


class StudentDataset:
    """
    Dataset for student behavioral sequences.

    Loads and preprocesses data for the StudentBehaviorModel.
    """

    def __init__(
        self,
        feature_extractor,
        sequence_length: int = 10,
        lookback_days: int = 90
    ):
        """
        Initialize dataset.

        Args:
            feature_extractor: FeatureExtractor instance
            sequence_length: Number of activities in each sequence
            lookback_days: Days to look back for data
        """
        self.feature_extractor = feature_extractor
        self.sequence_length = sequence_length
        self.lookback_days = lookback_days

        self.data = []
        self.labels = []

    def load_data(self):
        """Load and preprocess all student data."""
        # Get all students
        students = list(self.feature_extractor.students.find({}))

        for student in students:
            try:
                self._process_student(student['_id'])
            except Exception as e:
                print(f"Error processing student {student['_id']}: {e}")
                continue

        print(f"Loaded {len(self.data)} sequences from {len(students)} students")

    def _process_student(self, student_id):
        """Process data for a single student."""
        # Get submissions sorted by date
        submissions = list(self.feature_extractor.submissions.find({
            'studentId': student_id
        }).sort('createdAt', 1))

        if len(submissions) < self.sequence_length + 1:
            return

        # Extract features for each submission
        features = self.feature_extractor.extract_student_features(str(student_id))
        feature_vector = features.get('feature_vector', [])

        if not feature_vector:
            return

        # Create sequences
        for i in range(len(submissions) - self.sequence_length):
            # Sequence of feature vectors
            sequence = [feature_vector] * self.sequence_length  # Simplified

            # Label: did next activity succeed?
            next_submission = submissions[i + self.sequence_length]
            label = 1 if next_submission.get('status') == 'passed' else 0

            self.data.append(sequence)
            self.labels.append(label)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx) -> Tuple[np.ndarray, int]:
        return np.array(self.data[idx], dtype=np.float32), self.labels[idx]

    def get_batch(self, batch_size: int) -> Tuple[np.ndarray, np.ndarray]:
        """Get a random batch of data."""
        if len(self.data) == 0:
            raise ValueError("No data loaded. Call load_data() first.")

        indices = random.sample(range(len(self.data)), min(batch_size, len(self.data)))

        batch_x = np.array([self.data[i] for i in indices], dtype=np.float32)
        batch_y = np.array([self.labels[i] for i in indices], dtype=np.float32)

        return batch_x, batch_y.reshape(-1, 1)

    def create_generator(
        self,
        batch_size: int,
        shuffle: bool = True
    ) -> Generator:
        """
        Create a batch generator for training.

        Args:
            batch_size: Batch size
            shuffle: Whether to shuffle data each epoch

        Yields:
            Tuple of (batch_x, batch_y)
        """
        indices = list(range(len(self.data)))

        while True:
            if shuffle:
                random.shuffle(indices)

            for i in range(0, len(indices), batch_size):
                batch_indices = indices[i:i + batch_size]

                batch_x = np.array([self.data[j] for j in batch_indices], dtype=np.float32)
                batch_y = np.array([self.labels[j] for j in batch_indices], dtype=np.float32)

                yield batch_x, batch_y.reshape(-1, 1)


class AnomalyDataset:
    """
    Dataset for anomaly detection training.

    Loads behavioral feature vectors for training the VAE.
    """

    def __init__(self, feature_extractor):
        """
        Initialize dataset.

        Args:
            feature_extractor: FeatureExtractor instance
        """
        self.feature_extractor = feature_extractor
        self.data = []

    def load_data(self):
        """Load behavioral feature vectors."""
        # Get training data from feature extractor
        training_data = self.feature_extractor.extract_training_data()

        self.data = training_data['features']
        print(f"Loaded {len(self.data)} samples for anomaly detection")

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx) -> np.ndarray:
        return self.data[idx]

    def get_batch(self, batch_size: int) -> np.ndarray:
        """Get a random batch of data."""
        indices = random.sample(range(len(self.data)), min(batch_size, len(self.data)))
        return np.array([self.data[i] for i in indices], dtype=np.float32)

    def create_generator(
        self,
        batch_size: int,
        shuffle: bool = True
    ) -> Generator:
        """Create batch generator."""
        indices = list(range(len(self.data)))

        while True:
            if shuffle:
                random.shuffle(indices)

            for i in range(0, len(indices), batch_size):
                batch_indices = indices[i:i + batch_size]
                batch = np.array([self.data[j] for j in batch_indices], dtype=np.float32)
                yield batch


class SyntheticDataGenerator:
    """
    Generates synthetic data for model development and testing.

    Useful when real data is limited or for initial model validation.
    """

    def __init__(
        self,
        num_features: int = 20,
        sequence_length: int = 10
    ):
        self.num_features = num_features
        self.sequence_length = sequence_length

    def generate_behavior_data(
        self,
        num_samples: int,
        success_rate: float = 0.6
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate synthetic behavioral sequences.

        Creates sequences that have patterns correlated with success/failure.

        Args:
            num_samples: Number of samples to generate
            success_rate: Fraction of successful samples

        Returns:
            Tuple of (sequences, labels)
        """
        sequences = []
        labels = []

        for _ in range(num_samples):
            is_success = random.random() < success_rate

            # Generate sequence with pattern based on label
            sequence = self._generate_sequence(is_success)
            sequences.append(sequence)
            labels.append(1 if is_success else 0)

        return (
            np.array(sequences, dtype=np.float32),
            np.array(labels, dtype=np.float32).reshape(-1, 1)
        )

    def _generate_sequence(self, is_success: bool) -> np.ndarray:
        """Generate a single sequence with success/failure pattern."""
        sequence = np.zeros((self.sequence_length, self.num_features))

        for t in range(self.sequence_length):
            # Base features
            features = np.random.randn(self.num_features) * 0.3 + 0.5

            if is_success:
                # Success patterns: higher typing speed, lower paste freq,
                # lower AI dependency, improving trend
                features[0] += 0.2  # typing speed
                features[2] -= 0.1  # paste frequency
                features[10] -= 0.1  # AI dependency
                features[15] += 0.1 * (t / self.sequence_length)  # improving velocity
            else:
                # Failure patterns: opposite
                features[0] -= 0.1
                features[2] += 0.2
                features[10] += 0.2
                features[15] -= 0.1 * (t / self.sequence_length)

            # Clip to [0, 1]
            sequence[t] = np.clip(features, 0, 1)

        return sequence

    def generate_anomaly_data(
        self,
        num_normal: int,
        num_anomalous: int
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate synthetic data for anomaly detection.

        Args:
            num_normal: Number of normal samples
            num_anomalous: Number of anomalous samples

        Returns:
            Tuple of (features, is_anomalous)
        """
        # Normal samples: centered around typical values
        normal = np.random.randn(num_normal, self.num_features) * 0.2 + 0.5
        normal = np.clip(normal, 0, 1)

        # Anomalous samples: extreme values in some dimensions
        anomalous = np.random.randn(num_anomalous, self.num_features) * 0.2 + 0.5
        for i in range(num_anomalous):
            # Random anomaly type
            anomaly_type = random.choice(['extreme', 'sparse', 'pattern'])

            if anomaly_type == 'extreme':
                # Some features are extreme
                extreme_idx = random.sample(range(self.num_features), 3)
                for idx in extreme_idx:
                    anomalous[i, idx] = random.choice([0.0, 1.0])

            elif anomaly_type == 'sparse':
                # Many features are zero
                zero_idx = random.sample(range(self.num_features), self.num_features // 2)
                for idx in zero_idx:
                    anomalous[i, idx] = 0.0

            elif anomaly_type == 'pattern':
                # Unusual correlation pattern
                anomalous[i] = 1 - anomalous[i]

        anomalous = np.clip(anomalous, 0, 1)

        # Combine and create labels
        features = np.vstack([normal, anomalous]).astype(np.float32)
        labels = np.concatenate([
            np.zeros(num_normal),
            np.ones(num_anomalous)
        ]).astype(np.float32)

        # Shuffle
        indices = np.random.permutation(len(features))
        return features[indices], labels[indices]


def train_test_split(
    data: np.ndarray,
    labels: np.ndarray = None,
    test_ratio: float = 0.2,
    shuffle: bool = True
) -> Tuple:
    """
    Split data into training and test sets.

    Args:
        data: Feature data
        labels: Optional labels
        test_ratio: Fraction for test set
        shuffle: Whether to shuffle before splitting

    Returns:
        Tuple of (train_data, test_data, [train_labels, test_labels])
    """
    n_samples = len(data)
    indices = np.arange(n_samples)

    if shuffle:
        np.random.shuffle(indices)

    split_idx = int(n_samples * (1 - test_ratio))

    train_idx = indices[:split_idx]
    test_idx = indices[split_idx:]

    if labels is not None:
        return (
            data[train_idx], data[test_idx],
            labels[train_idx], labels[test_idx]
        )
    else:
        return data[train_idx], data[test_idx]


# Export
__all__ = [
    'StudentDataset',
    'AnomalyDataset',
    'SyntheticDataGenerator',
    'train_test_split'
]
