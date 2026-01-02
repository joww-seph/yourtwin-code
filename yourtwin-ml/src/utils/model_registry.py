"""
Model Registry for YourTwin ML

Handles model versioning, storage, and deployment management.
Supports multiple model types with metadata tracking.
"""

import os
import json
import hashlib
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

import mindspore as ms
from mindspore import Tensor


class ModelVersion:
    """Represents a single model version with metadata."""

    def __init__(
        self,
        version: str,
        model_type: str,
        created_at: str,
        metrics: Dict = None,
        config: Dict = None,
        tags: List[str] = None,
        description: str = "",
        is_production: bool = False
    ):
        self.version = version
        self.model_type = model_type
        self.created_at = created_at
        self.metrics = metrics or {}
        self.config = config or {}
        self.tags = tags or []
        self.description = description
        self.is_production = is_production

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'version': self.version,
            'model_type': self.model_type,
            'created_at': self.created_at,
            'metrics': self.metrics,
            'config': self.config,
            'tags': self.tags,
            'description': self.description,
            'is_production': self.is_production
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'ModelVersion':
        """Create from dictionary."""
        return cls(**data)


class ModelRegistry:
    """
    Central registry for managing ML model versions.

    Provides:
    - Model versioning and storage
    - Metadata tracking
    - Production deployment management
    - Rollback support
    """

    MODEL_TYPES = ['behavior', 'anomaly', 'learning_path', 'knowledge_graph']

    def __init__(self, registry_path: str = "model_registry"):
        """
        Initialize model registry.

        Args:
            registry_path: Base path for model storage
        """
        self.registry_path = Path(registry_path)
        self.registry_path.mkdir(parents=True, exist_ok=True)

        # Create directories for each model type
        for model_type in self.MODEL_TYPES:
            (self.registry_path / model_type).mkdir(exist_ok=True)

        # Registry index file
        self.index_path = self.registry_path / "registry_index.json"
        self.index = self._load_index()

    def _load_index(self) -> Dict:
        """Load registry index from disk."""
        if self.index_path.exists():
            with open(self.index_path, 'r') as f:
                return json.load(f)
        return {model_type: {} for model_type in self.MODEL_TYPES}

    def _save_index(self):
        """Save registry index to disk."""
        with open(self.index_path, 'w') as f:
            json.dump(self.index, f, indent=2)

    def _generate_version(self, model_type: str) -> str:
        """Generate next version number for model type."""
        versions = list(self.index.get(model_type, {}).keys())
        if not versions:
            return "v1.0.0"

        # Parse latest version
        latest = sorted(versions, key=lambda x: [int(i) for i in x[1:].split('.')])[-1]
        parts = [int(i) for i in latest[1:].split('.')]
        parts[-1] += 1

        return f"v{'.'.join(map(str, parts))}"

    def _compute_checksum(self, file_path: Path) -> str:
        """Compute MD5 checksum of file."""
        md5 = hashlib.md5()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                md5.update(chunk)
        return md5.hexdigest()

    def register_model(
        self,
        model,
        model_type: str,
        metrics: Dict = None,
        config: Dict = None,
        tags: List[str] = None,
        description: str = "",
        version: str = None
    ) -> ModelVersion:
        """
        Register a new model version.

        Args:
            model: MindSpore model to register
            model_type: Type of model (behavior, anomaly, etc.)
            metrics: Training/validation metrics
            config: Model configuration
            tags: Optional tags for filtering
            description: Model description
            version: Optional specific version string

        Returns:
            ModelVersion object
        """
        if model_type not in self.MODEL_TYPES:
            raise ValueError(f"Unknown model type: {model_type}")

        # Generate version if not provided
        if version is None:
            version = self._generate_version(model_type)

        # Create version directory
        version_dir = self.registry_path / model_type / version
        version_dir.mkdir(parents=True, exist_ok=True)

        # Save model checkpoint
        checkpoint_path = version_dir / "model.ckpt"
        ms.save_checkpoint(model, str(checkpoint_path))

        # Compute checksum
        checksum = self._compute_checksum(checkpoint_path)

        # Create version metadata
        model_version = ModelVersion(
            version=version,
            model_type=model_type,
            created_at=datetime.now().isoformat(),
            metrics=metrics,
            config=config,
            tags=tags,
            description=description,
            is_production=False
        )

        # Save metadata
        metadata_path = version_dir / "metadata.json"
        metadata = model_version.to_dict()
        metadata['checksum'] = checksum
        metadata['checkpoint_path'] = str(checkpoint_path)

        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        # Update index
        if model_type not in self.index:
            self.index[model_type] = {}
        self.index[model_type][version] = model_version.to_dict()
        self._save_index()

        print(f"Registered model: {model_type}/{version}")

        return model_version

    def get_model(
        self,
        model_type: str,
        version: str = None,
        model_class=None
    ) -> Any:
        """
        Load a registered model.

        Args:
            model_type: Type of model
            version: Specific version or None for production
            model_class: Model class to instantiate

        Returns:
            Loaded model instance
        """
        if version is None:
            version = self.get_production_version(model_type)
            if version is None:
                raise ValueError(f"No production version for {model_type}")

        version_dir = self.registry_path / model_type / version
        checkpoint_path = version_dir / "model.ckpt"

        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Model not found: {model_type}/{version}")

        # Load metadata for config
        metadata_path = version_dir / "metadata.json"
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

        # Instantiate model if class provided
        if model_class is not None:
            config = metadata.get('config', {})
            model = model_class(**config) if config else model_class()
            ms.load_checkpoint(str(checkpoint_path), model)
            return model

        return str(checkpoint_path)

    def get_version_info(self, model_type: str, version: str) -> ModelVersion:
        """Get metadata for a specific version."""
        if model_type not in self.index or version not in self.index[model_type]:
            raise ValueError(f"Version not found: {model_type}/{version}")

        return ModelVersion.from_dict(self.index[model_type][version])

    def list_versions(
        self,
        model_type: str,
        tags: List[str] = None
    ) -> List[ModelVersion]:
        """
        List all versions for a model type.

        Args:
            model_type: Type of model
            tags: Optional filter by tags

        Returns:
            List of ModelVersion objects
        """
        if model_type not in self.index:
            return []

        versions = []
        for version_data in self.index[model_type].values():
            version = ModelVersion.from_dict(version_data)

            if tags is not None:
                if not any(tag in version.tags for tag in tags):
                    continue

            versions.append(version)

        # Sort by creation date
        versions.sort(key=lambda v: v.created_at, reverse=True)

        return versions

    def set_production(self, model_type: str, version: str):
        """
        Set a version as production.

        Args:
            model_type: Type of model
            version: Version to set as production
        """
        if model_type not in self.index or version not in self.index[model_type]:
            raise ValueError(f"Version not found: {model_type}/{version}")

        # Clear existing production flag
        for v in self.index[model_type].values():
            v['is_production'] = False

        # Set new production version
        self.index[model_type][version]['is_production'] = True
        self._save_index()

        print(f"Set production: {model_type}/{version}")

    def get_production_version(self, model_type: str) -> Optional[str]:
        """Get current production version for model type."""
        if model_type not in self.index:
            return None

        for version, data in self.index[model_type].items():
            if data.get('is_production', False):
                return version

        return None

    def compare_versions(
        self,
        model_type: str,
        version1: str,
        version2: str
    ) -> Dict:
        """
        Compare metrics between two versions.

        Args:
            model_type: Type of model
            version1: First version
            version2: Second version

        Returns:
            Comparison dictionary
        """
        v1 = self.get_version_info(model_type, version1)
        v2 = self.get_version_info(model_type, version2)

        comparison = {
            'versions': [version1, version2],
            'metrics_diff': {}
        }

        all_metrics = set(v1.metrics.keys()) | set(v2.metrics.keys())

        for metric in all_metrics:
            val1 = v1.metrics.get(metric, None)
            val2 = v2.metrics.get(metric, None)

            comparison['metrics_diff'][metric] = {
                version1: val1,
                version2: val2,
                'diff': val2 - val1 if val1 is not None and val2 is not None else None
            }

        return comparison

    def delete_version(self, model_type: str, version: str, force: bool = False):
        """
        Delete a model version.

        Args:
            model_type: Type of model
            version: Version to delete
            force: Force delete even if production
        """
        if model_type not in self.index or version not in self.index[model_type]:
            raise ValueError(f"Version not found: {model_type}/{version}")

        version_data = self.index[model_type][version]
        if version_data.get('is_production') and not force:
            raise ValueError("Cannot delete production version without force=True")

        # Remove directory
        version_dir = self.registry_path / model_type / version
        if version_dir.exists():
            shutil.rmtree(version_dir)

        # Update index
        del self.index[model_type][version]
        self._save_index()

        print(f"Deleted version: {model_type}/{version}")

    def export_model(
        self,
        model_type: str,
        version: str,
        export_path: str,
        format: str = "ckpt"
    ):
        """
        Export model for deployment.

        Args:
            model_type: Type of model
            version: Version to export
            export_path: Path to export to
            format: Export format (ckpt, onnx)
        """
        version_dir = self.registry_path / model_type / version
        checkpoint_path = version_dir / "model.ckpt"

        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Model not found: {model_type}/{version}")

        export_path = Path(export_path)
        export_path.mkdir(parents=True, exist_ok=True)

        if format == "ckpt":
            shutil.copy(checkpoint_path, export_path / "model.ckpt")

            # Copy metadata
            metadata_path = version_dir / "metadata.json"
            shutil.copy(metadata_path, export_path / "metadata.json")

        print(f"Exported {model_type}/{version} to {export_path}")

    def get_registry_stats(self) -> Dict:
        """Get statistics about the registry."""
        stats = {
            'total_models': 0,
            'by_type': {}
        }

        for model_type in self.MODEL_TYPES:
            versions = self.index.get(model_type, {})
            stats['by_type'][model_type] = {
                'count': len(versions),
                'production': self.get_production_version(model_type),
                'latest': list(versions.keys())[-1] if versions else None
            }
            stats['total_models'] += len(versions)

        return stats


# Singleton instance
_registry = None


def get_registry(registry_path: str = "model_registry") -> ModelRegistry:
    """Get or create the model registry singleton."""
    global _registry
    if _registry is None:
        _registry = ModelRegistry(registry_path)
    return _registry


# Export
__all__ = [
    'ModelVersion',
    'ModelRegistry',
    'get_registry'
]
