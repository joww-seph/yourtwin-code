"""
Knowledge Graph Neural Network

Graph Attention Network (GAT) for modeling relationships between
students, topics, activities, and competencies.

Architecture:
- Node embeddings for students, topics, activities
- Graph attention layers for message passing
- Link prediction for proficiency estimation

Knowledge Graph Structure:
- Nodes: Students, Topics, Activities, Competencies
- Edges: Student→Topic (proficiency), Topic→Topic (prerequisite),
         Activity→Topic (teaches), Competency→Topic (requires)
"""

import mindspore as ms
import mindspore.nn as nn
import mindspore.ops as ops
from mindspore import Tensor, Parameter
from mindspore.common.initializer import XavierUniform, Zero, Normal
import numpy as np
from typing import Tuple, List, Dict, Optional


class GraphAttentionLayer(nn.Cell):
    """
    Single Graph Attention Layer.

    Implements attention-based message passing where each node
    attends to its neighbors to compute updated representations.
    """

    def __init__(
        self,
        in_features: int,
        out_features: int,
        num_heads: int = 4,
        dropout: float = 0.3,
        concat: bool = True,
        alpha: float = 0.2
    ):
        """
        Initialize GAT layer.

        Args:
            in_features: Input feature dimension
            out_features: Output feature dimension per head
            num_heads: Number of attention heads
            dropout: Dropout probability
            concat: Whether to concatenate heads (vs average)
            alpha: LeakyReLU negative slope
        """
        super().__init__()

        self.in_features = in_features
        self.out_features = out_features
        self.num_heads = num_heads
        self.concat = concat

        # Linear transformation for each head
        self.W = Parameter(
            Tensor(np.random.randn(num_heads, in_features, out_features).astype(np.float32) * 0.01)
        )

        # Attention mechanism parameters
        self.a_src = Parameter(
            Tensor(np.random.randn(num_heads, out_features, 1).astype(np.float32) * 0.01)
        )
        self.a_dst = Parameter(
            Tensor(np.random.randn(num_heads, out_features, 1).astype(np.float32) * 0.01)
        )

        self.leaky_relu = nn.LeakyReLU(alpha=alpha)
        self.softmax = nn.Softmax(axis=-1)
        self.dropout = nn.Dropout(p=dropout)

    def construct(self, x, adj):
        """
        Forward pass.

        Args:
            x: Node features (num_nodes, in_features)
            adj: Adjacency matrix (num_nodes, num_nodes)

        Returns:
            h: Updated node features
        """
        num_nodes = x.shape[0]

        # Transform features for each head
        # x: (num_nodes, in_features)
        # W: (num_heads, in_features, out_features)
        # h: (num_heads, num_nodes, out_features)
        h = ops.einsum('ni,hio->hno', x, self.W)

        # Compute attention scores
        # Source attention: (num_heads, num_nodes, 1)
        attn_src = ops.einsum('hno,hok->hnk', h, self.a_src)
        # Destination attention: (num_heads, num_nodes, 1)
        attn_dst = ops.einsum('hno,hok->hnk', h, self.a_dst)

        # Combine source and destination attention
        # (num_heads, num_nodes, num_nodes)
        attn = attn_src + attn_dst.transpose(0, 2, 1)
        attn = self.leaky_relu(attn)

        # Mask with adjacency matrix
        mask = (1 - adj) * (-1e9)
        attn = attn + mask

        # Normalize attention weights
        attn = self.softmax(attn)
        attn = self.dropout(attn)

        # Apply attention to get output
        # (num_heads, num_nodes, out_features)
        out = ops.einsum('hnm,hmo->hno', attn, h)

        if self.concat:
            # Concatenate heads: (num_nodes, num_heads * out_features)
            out = out.transpose(1, 0, 2).reshape(num_nodes, -1)
        else:
            # Average heads: (num_nodes, out_features)
            out = out.mean(axis=0)

        return out


class KnowledgeGraphModel(nn.Cell):
    """
    Knowledge Graph Neural Network for the YourTwin platform.

    Models relationships between students, topics, and activities
    to enable:
    - Proficiency prediction
    - Prerequisite understanding
    - Learning path optimization
    """

    def __init__(
        self,
        num_students: int,
        num_topics: int,
        num_activities: int,
        embed_dim: int = 128,
        hidden_dim: int = 64,
        num_heads: int = 4,
        num_layers: int = 3,
        dropout: float = 0.3
    ):
        """
        Initialize knowledge graph model.

        Args:
            num_students: Number of student nodes
            num_topics: Number of topic nodes
            num_activities: Number of activity nodes
            embed_dim: Embedding dimension
            hidden_dim: Hidden layer dimension
            num_heads: Number of attention heads
            num_layers: Number of GAT layers
            dropout: Dropout probability
        """
        super().__init__()

        self.num_students = num_students
        self.num_topics = num_topics
        self.num_activities = num_activities
        self.num_nodes = num_students + num_topics + num_activities

        # Node type embeddings
        self.student_embeddings = nn.Embedding(num_students, embed_dim)
        self.topic_embeddings = nn.Embedding(num_topics, embed_dim)
        self.activity_embeddings = nn.Embedding(num_activities, embed_dim)

        # Node type indicator embeddings
        self.type_embeddings = nn.Embedding(3, embed_dim)  # 0=student, 1=topic, 2=activity

        # GAT layers
        self.gat_layers = nn.CellList()
        in_dim = embed_dim * 2  # node embedding + type embedding

        for i in range(num_layers):
            out_dim = hidden_dim if i < num_layers - 1 else hidden_dim
            concat = i < num_layers - 1  # Only concat for non-final layers

            self.gat_layers.append(
                GraphAttentionLayer(
                    in_features=in_dim,
                    out_features=out_dim // num_heads if concat else out_dim,
                    num_heads=num_heads,
                    dropout=dropout,
                    concat=concat
                )
            )

            if concat:
                in_dim = (out_dim // num_heads) * num_heads
            else:
                in_dim = out_dim

        # Proficiency predictor
        self.proficiency_predictor = nn.SequentialCell([
            nn.Dense(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(p=dropout),
            nn.Dense(hidden_dim, 1),
            nn.Sigmoid()
        ])

        # Activity difficulty predictor
        self.difficulty_predictor = nn.SequentialCell([
            nn.Dense(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dense(hidden_dim, 3),  # easy, medium, hard
            nn.Softmax(axis=-1)
        ])

    def get_node_embeddings(self, student_ids, topic_ids, activity_ids):
        """
        Get embeddings for all nodes.

        Args:
            student_ids: Student node indices
            topic_ids: Topic node indices
            activity_ids: Activity node indices

        Returns:
            embeddings: Combined node embeddings
        """
        # Get base embeddings
        student_embed = self.student_embeddings(student_ids)
        topic_embed = self.topic_embeddings(topic_ids)
        activity_embed = self.activity_embeddings(activity_ids)

        # Get type embeddings
        student_type = self.type_embeddings(Tensor([0] * len(student_ids), ms.int32))
        topic_type = self.type_embeddings(Tensor([1] * len(topic_ids), ms.int32))
        activity_type = self.type_embeddings(Tensor([2] * len(activity_ids), ms.int32))

        # Concatenate node and type embeddings
        student_combined = ops.concat([student_embed, student_type], axis=-1)
        topic_combined = ops.concat([topic_embed, topic_type], axis=-1)
        activity_combined = ops.concat([activity_embed, activity_type], axis=-1)

        # Combine all embeddings
        all_embeddings = ops.concat([student_combined, topic_combined, activity_combined], axis=0)

        return all_embeddings

    def construct(self, node_embeddings, adjacency):
        """
        Forward pass through GAT layers.

        Args:
            node_embeddings: Initial node embeddings (num_nodes, embed_dim)
            adjacency: Adjacency matrix (num_nodes, num_nodes)

        Returns:
            node_representations: Updated node representations
        """
        h = node_embeddings

        for gat_layer in self.gat_layers:
            h = gat_layer(h, adjacency)

        return h

    def predict_proficiency(self, student_repr, topic_repr):
        """
        Predict proficiency level for student-topic pair.

        Args:
            student_repr: Student representation (hidden_dim,)
            topic_repr: Topic representation (hidden_dim,)

        Returns:
            proficiency: Predicted proficiency [0, 1]
        """
        combined = ops.concat([student_repr, topic_repr], axis=-1)
        return self.proficiency_predictor(combined)

    def predict_difficulty(self, student_repr, activity_repr):
        """
        Predict perceived difficulty for student-activity pair.

        Args:
            student_repr: Student representation
            activity_repr: Activity representation

        Returns:
            difficulty_probs: Probability distribution over difficulty levels
        """
        combined = ops.concat([student_repr, activity_repr], axis=-1)
        return self.difficulty_predictor(combined)


class TopicPrerequisiteModel(nn.Cell):
    """
    Model for learning topic prerequisite relationships.

    Uses learned embeddings to predict which topics should be
    mastered before attempting others.
    """

    def __init__(
        self,
        num_topics: int,
        embed_dim: int = 64
    ):
        super().__init__()

        self.topic_embeddings = nn.Embedding(num_topics, embed_dim)

        self.prerequisite_predictor = nn.SequentialCell([
            nn.Dense(embed_dim * 2, 64),
            nn.ReLU(),
            nn.Dense(64, 1),
            nn.Sigmoid()
        ])

    def construct(self, topic_a, topic_b):
        """
        Predict if topic_a is a prerequisite for topic_b.

        Args:
            topic_a: Source topic indices
            topic_b: Target topic indices

        Returns:
            is_prerequisite: Probability that a is prerequisite for b
        """
        embed_a = self.topic_embeddings(topic_a)
        embed_b = self.topic_embeddings(topic_b)
        combined = ops.concat([embed_a, embed_b], axis=-1)
        return self.prerequisite_predictor(combined)


class KnowledgeGraphLoss(nn.Cell):
    """
    Loss function for training the knowledge graph model.

    Combines:
    - Link prediction loss (student-topic proficiency)
    - Prerequisite prediction loss
    - Node classification auxiliary loss
    """

    def __init__(self, margin: float = 0.5):
        super().__init__()
        self.bce_loss = nn.BCELoss()
        self.margin = margin

    def construct(
        self,
        pred_proficiency,
        true_proficiency,
        positive_scores=None,
        negative_scores=None
    ):
        """
        Calculate combined loss.

        Args:
            pred_proficiency: Predicted proficiency values
            true_proficiency: Ground truth proficiency
            positive_scores: Scores for positive edges
            negative_scores: Scores for negative (sampled) edges

        Returns:
            total_loss: Combined loss value
        """
        # Proficiency prediction loss
        prof_loss = self.bce_loss(pred_proficiency, true_proficiency)

        # Contrastive loss for link prediction (if provided)
        if positive_scores is not None and negative_scores is not None:
            margin_loss = ops.maximum(
                Tensor(0.0),
                self.margin - positive_scores + negative_scores
            ).mean()
            return prof_loss + margin_loss

        return prof_loss


def create_knowledge_graph_model(config: dict) -> KnowledgeGraphModel:
    """
    Factory function to create knowledge graph model.

    Args:
        config: Dictionary with model configuration

    Returns:
        Initialized KnowledgeGraphModel
    """
    return KnowledgeGraphModel(
        num_students=config.get('num_students', 1000),
        num_topics=config.get('num_topics', 50),
        num_activities=config.get('num_activities', 500),
        embed_dim=config.get('embed_dim', 128),
        hidden_dim=config.get('hidden_dim', 64),
        num_heads=config.get('num_heads', 4),
        num_layers=config.get('num_layers', 3),
        dropout=config.get('dropout', 0.3)
    )


# Export
__all__ = [
    'KnowledgeGraphModel',
    'GraphAttentionLayer',
    'TopicPrerequisiteModel',
    'KnowledgeGraphLoss',
    'create_knowledge_graph_model'
]
