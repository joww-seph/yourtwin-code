"""
Adaptive Learning Path Optimizer

Deep Q-Network (DQN) agent for generating personalized learning sequences.
Uses reinforcement learning to optimize activity recommendations.

Architecture:
- State: Student profile + current competencies
- Action: Next activity to recommend
- Reward: Learning gain (proficiency improvement)

The agent learns to maximize long-term learning outcomes
by recommending optimal activity sequences.
"""

import mindspore as ms
import mindspore.nn as nn
import mindspore.ops as ops
from mindspore import Tensor, Parameter
from mindspore.common.initializer import XavierUniform
import numpy as np
from typing import Tuple, List, Dict, Optional
from collections import deque
import random


class DQNetwork(nn.Cell):
    """
    Deep Q-Network for action value estimation.

    Estimates Q(s, a) for each possible activity recommendation.
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        hidden_dims: list = None
    ):
        """
        Initialize DQN.

        Args:
            state_dim: Dimension of state vector
            action_dim: Number of possible actions (activities)
            hidden_dims: List of hidden layer dimensions
        """
        super().__init__()

        if hidden_dims is None:
            hidden_dims = [256, 128, 64]

        self.state_dim = state_dim
        self.action_dim = action_dim

        # Build network
        layers = []
        in_dim = state_dim

        for h_dim in hidden_dims:
            layers.append(nn.Dense(in_dim, h_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(p=0.1))
            in_dim = h_dim

        # Output layer: Q-value for each action
        layers.append(nn.Dense(hidden_dims[-1], action_dim))

        self.network = nn.SequentialCell(layers)

    def construct(self, state):
        """
        Forward pass.

        Args:
            state: State vector (batch, state_dim)

        Returns:
            q_values: Q-values for all actions (batch, action_dim)
        """
        return self.network(state)


class DuelingDQNetwork(nn.Cell):
    """
    Dueling DQN architecture for better value estimation.

    Separates state value V(s) and advantage A(s, a) estimation:
    Q(s, a) = V(s) + A(s, a) - mean(A(s, :))
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        hidden_dim: int = 128
    ):
        super().__init__()

        self.state_dim = state_dim
        self.action_dim = action_dim

        # Shared feature extractor
        self.feature_extractor = nn.SequentialCell([
            nn.Dense(state_dim, hidden_dim),
            nn.ReLU(),
            nn.Dense(hidden_dim, hidden_dim),
            nn.ReLU()
        ])

        # Value stream
        self.value_stream = nn.SequentialCell([
            nn.Dense(hidden_dim, 64),
            nn.ReLU(),
            nn.Dense(64, 1)
        ])

        # Advantage stream
        self.advantage_stream = nn.SequentialCell([
            nn.Dense(hidden_dim, 64),
            nn.ReLU(),
            nn.Dense(64, action_dim)
        ])

    def construct(self, state):
        """
        Forward pass.

        Args:
            state: State vector (batch, state_dim)

        Returns:
            q_values: Q-values for all actions
        """
        features = self.feature_extractor(state)

        value = self.value_stream(features)  # (batch, 1)
        advantage = self.advantage_stream(features)  # (batch, action_dim)

        # Combine value and advantage
        # Q = V + (A - mean(A))
        q_values = value + advantage - advantage.mean(axis=1, keep_dims=True)

        return q_values


class LearningPathAgent:
    """
    Reinforcement learning agent for learning path optimization.

    Uses DQN with experience replay and target network for stable training.
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        hidden_dim: int = 128,
        learning_rate: float = 0.001,
        gamma: float = 0.99,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.1,
        epsilon_decay: float = 0.995,
        buffer_size: int = 10000,
        batch_size: int = 64,
        target_update_freq: int = 100,
        use_dueling: bool = True
    ):
        """
        Initialize agent.

        Args:
            state_dim: Dimension of state vector
            action_dim: Number of possible actions
            hidden_dim: Hidden layer dimension
            learning_rate: Learning rate
            gamma: Discount factor
            epsilon_start: Initial exploration rate
            epsilon_end: Final exploration rate
            epsilon_decay: Exploration decay rate
            buffer_size: Replay buffer size
            batch_size: Training batch size
            target_update_freq: Steps between target network updates
            use_dueling: Whether to use dueling architecture
        """
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.gamma = gamma
        self.epsilon = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay
        self.batch_size = batch_size
        self.target_update_freq = target_update_freq

        # Networks
        if use_dueling:
            self.q_network = DuelingDQNetwork(state_dim, action_dim, hidden_dim)
            self.target_network = DuelingDQNetwork(state_dim, action_dim, hidden_dim)
        else:
            self.q_network = DQNetwork(state_dim, action_dim, [hidden_dim * 2, hidden_dim])
            self.target_network = DQNetwork(state_dim, action_dim, [hidden_dim * 2, hidden_dim])

        # Copy weights to target network
        self._update_target_network()

        # Optimizer
        self.optimizer = nn.Adam(
            self.q_network.trainable_params(),
            learning_rate=learning_rate
        )

        # Loss function
        self.loss_fn = nn.MSELoss()

        # Replay buffer
        self.replay_buffer = deque(maxlen=buffer_size)

        # Training step counter
        self.steps = 0

    def select_action(self, state: np.ndarray, training: bool = True) -> int:
        """
        Select action using epsilon-greedy policy.

        Args:
            state: Current state vector
            training: Whether in training mode

        Returns:
            action: Selected action index
        """
        if training and random.random() < self.epsilon:
            # Explore: random action
            return random.randint(0, self.action_dim - 1)
        else:
            # Exploit: best action according to Q-network
            state_tensor = Tensor(state.reshape(1, -1).astype(np.float32))
            q_values = self.q_network(state_tensor)
            return int(q_values.argmax().asnumpy())

    def select_top_k_actions(self, state: np.ndarray, k: int = 5) -> List[int]:
        """
        Select top-k actions by Q-value.

        Args:
            state: Current state vector
            k: Number of actions to return

        Returns:
            actions: List of top-k action indices
        """
        state_tensor = Tensor(state.reshape(1, -1).astype(np.float32))
        q_values = self.q_network(state_tensor).asnumpy().flatten()

        # Get indices of top-k Q-values
        top_k_indices = np.argsort(q_values)[-k:][::-1]
        return top_k_indices.tolist()

    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool
    ):
        """
        Store transition in replay buffer.

        Args:
            state: Current state
            action: Action taken
            reward: Reward received
            next_state: Resulting state
            done: Whether episode ended
        """
        self.replay_buffer.append((state, action, reward, next_state, done))

    def train_step(self) -> Optional[float]:
        """
        Perform one training step.

        Returns:
            loss: Training loss, or None if buffer too small
        """
        if len(self.replay_buffer) < self.batch_size:
            return None

        # Sample batch
        batch = random.sample(self.replay_buffer, self.batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)

        # Convert to tensors
        states = Tensor(np.array(states, dtype=np.float32))
        actions = Tensor(np.array(actions, dtype=np.int32))
        rewards = Tensor(np.array(rewards, dtype=np.float32))
        next_states = Tensor(np.array(next_states, dtype=np.float32))
        dones = Tensor(np.array(dones, dtype=np.float32))

        # Current Q-values
        current_q = self.q_network(states)
        current_q_actions = ops.gather_elements(
            current_q,
            1,
            actions.reshape(-1, 1)
        ).squeeze()

        # Target Q-values (Double DQN)
        with ms.no_grad():
            # Select best action using online network
            next_q_online = self.q_network(next_states)
            best_actions = next_q_online.argmax(axis=1).reshape(-1, 1)

            # Evaluate using target network
            next_q_target = self.target_network(next_states)
            next_q_values = ops.gather_elements(next_q_target, 1, best_actions).squeeze()

            # TD target
            target_q = rewards + self.gamma * next_q_values * (1 - dones)

        # Compute loss
        loss = self.loss_fn(current_q_actions, target_q)

        # Backpropagation
        grads = ops.GradOperation(get_all=True)(self.q_network)(states)
        self.optimizer(grads)

        # Update target network periodically
        self.steps += 1
        if self.steps % self.target_update_freq == 0:
            self._update_target_network()

        # Decay epsilon
        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)

        return float(loss.asnumpy())

    def _update_target_network(self):
        """Copy weights from Q-network to target network."""
        for target_param, param in zip(
            self.target_network.trainable_params(),
            self.q_network.trainable_params()
        ):
            target_param.set_data(param.data)

    def save(self, path: str):
        """Save model weights."""
        ms.save_checkpoint(self.q_network, f"{path}/q_network.ckpt")
        ms.save_checkpoint(self.target_network, f"{path}/target_network.ckpt")

    def load(self, path: str):
        """Load model weights."""
        ms.load_checkpoint(f"{path}/q_network.ckpt", self.q_network)
        ms.load_checkpoint(f"{path}/target_network.ckpt", self.target_network)


class LearningEnvironment:
    """
    Simulated environment for training the learning path agent.

    Simulates student learning progression based on activity difficulty,
    current competencies, and learning patterns.
    """

    def __init__(
        self,
        num_activities: int,
        num_competencies: int,
        activity_difficulties: np.ndarray = None,
        activity_topics: np.ndarray = None
    ):
        """
        Initialize environment.

        Args:
            num_activities: Number of available activities
            num_competencies: Number of competency dimensions
            activity_difficulties: Difficulty of each activity [0, 1]
            activity_topics: Topic index for each activity
        """
        self.num_activities = num_activities
        self.num_competencies = num_competencies

        # Activity properties
        if activity_difficulties is None:
            self.activity_difficulties = np.random.uniform(0, 1, num_activities)
        else:
            self.activity_difficulties = activity_difficulties

        if activity_topics is None:
            self.activity_topics = np.random.randint(0, num_competencies, num_activities)
        else:
            self.activity_topics = activity_topics

        # Current state
        self.competencies = None
        self.completed_activities = None
        self.step_count = 0
        self.max_steps = 20

    def reset(self, initial_competencies: np.ndarray = None) -> np.ndarray:
        """
        Reset environment to initial state.

        Args:
            initial_competencies: Starting competency levels

        Returns:
            state: Initial state vector
        """
        if initial_competencies is None:
            self.competencies = np.random.uniform(0.1, 0.5, self.num_competencies)
        else:
            self.competencies = initial_competencies.copy()

        self.completed_activities = set()
        self.step_count = 0

        return self._get_state()

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, dict]:
        """
        Take action in environment.

        Args:
            action: Activity index to attempt

        Returns:
            next_state: Resulting state
            reward: Reward received
            done: Whether episode ended
            info: Additional information
        """
        self.step_count += 1

        # Get activity properties
        difficulty = self.activity_difficulties[action]
        topic = self.activity_topics[action]

        # Calculate success probability based on competency and difficulty
        competency = self.competencies[topic]
        success_prob = self._calculate_success_prob(competency, difficulty)

        # Simulate attempt
        success = np.random.random() < success_prob

        # Update competency based on outcome
        old_competency = self.competencies[topic]
        if success:
            # Increase competency (more for harder activities)
            gain = 0.1 * (1 + difficulty)
            self.competencies[topic] = min(1.0, competency + gain)
        else:
            # Small gain even on failure (learning from mistakes)
            gain = 0.02
            self.competencies[topic] = min(1.0, competency + gain)

        # Calculate reward
        reward = self._calculate_reward(
            success, difficulty, old_competency, self.competencies[topic],
            action in self.completed_activities
        )

        # Mark activity as completed
        self.completed_activities.add(action)

        # Check if done
        done = (
            self.step_count >= self.max_steps or
            self.competencies.mean() >= 0.9
        )

        info = {
            'success': success,
            'topic': topic,
            'difficulty': difficulty,
            'competency_gain': self.competencies[topic] - old_competency
        }

        return self._get_state(), reward, done, info

    def _get_state(self) -> np.ndarray:
        """Get current state vector."""
        # State includes:
        # - Current competencies
        # - Average competency
        # - Progress (fraction of activities completed)
        # - Step count (normalized)

        avg_competency = self.competencies.mean()
        progress = len(self.completed_activities) / self.num_activities
        step_progress = self.step_count / self.max_steps

        state = np.concatenate([
            self.competencies,
            [avg_competency, progress, step_progress]
        ])

        return state.astype(np.float32)

    def _calculate_success_prob(self, competency: float, difficulty: float) -> float:
        """Calculate probability of success on activity."""
        # Higher competency and lower difficulty = higher success probability
        base_prob = competency - difficulty * 0.5
        return np.clip(base_prob + 0.3, 0.1, 0.95)

    def _calculate_reward(
        self,
        success: bool,
        difficulty: float,
        old_comp: float,
        new_comp: float,
        was_completed: bool
    ) -> float:
        """Calculate reward for transition."""
        reward = 0.0

        # Base reward for competency gain
        reward += (new_comp - old_comp) * 10

        # Bonus for success on harder activities
        if success:
            reward += difficulty * 2

        # Penalty for repeating completed activities
        if was_completed:
            reward -= 1.0

        # Small penalty for each step (encourage efficiency)
        reward -= 0.1

        return reward


def create_learning_path_agent(config: dict) -> LearningPathAgent:
    """
    Factory function to create learning path agent.

    Args:
        config: Dictionary with agent configuration

    Returns:
        Initialized LearningPathAgent
    """
    return LearningPathAgent(
        state_dim=config.get('state_dim', 50),
        action_dim=config.get('action_dim', 100),
        hidden_dim=config.get('hidden_dim', 128),
        learning_rate=config.get('learning_rate', 0.001),
        gamma=config.get('gamma', 0.99),
        use_dueling=config.get('use_dueling', True)
    )


# Export
__all__ = [
    'DQNetwork',
    'DuelingDQNetwork',
    'LearningPathAgent',
    'LearningEnvironment',
    'create_learning_path_agent'
]
