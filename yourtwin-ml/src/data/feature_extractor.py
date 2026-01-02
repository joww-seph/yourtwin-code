"""
Feature Extractor for YourTwin Digital Twin

Extracts features from MongoDB collections for training MindSpore models.
Features are categorized into:
- Behavioral: typing patterns, paste behavior, focus/blur patterns
- Performance: scores, success rates, difficulty progression
- AI Interaction: hint usage, dependency patterns
- Temporal: session timing, learning velocity
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import numpy as np
from pymongo import MongoClient
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)


class FeatureExtractor:
    """
    Extracts and transforms student data into features for ML models.

    The Mirror Twin (StudentTwin) stores raw learning data.
    This extractor transforms that data into normalized feature vectors
    suitable for training neural networks.
    """

    # Feature definitions with normalization ranges
    FEATURE_DEFINITIONS = {
        'behavioral': {
            'avg_typing_speed': {'min': 0, 'max': 300, 'default': 80},
            'avg_thinking_pause': {'min': 0, 'max': 60, 'default': 5},
            'paste_frequency': {'min': 0, 'max': 1, 'default': 0.1},
            'active_time_percentage': {'min': 0, 'max': 100, 'default': 80},
            'tab_switch_rate': {'min': 0, 'max': 50, 'default': 5},
            'idle_time_percentage': {'min': 0, 'max': 100, 'default': 10},
            'error_frequency': {'min': 0, 'max': 1, 'default': 0.3}
        },
        'performance': {
            'success_rate': {'min': 0, 'max': 100, 'default': 50},
            'avg_score': {'min': 0, 'max': 100, 'default': 50},
            'difficulty_level': {'min': 0, 'max': 3, 'default': 1},  # easy=0, medium=1, hard=2
            'time_per_problem': {'min': 0, 'max': 120, 'default': 30},  # minutes
            'attempt_count': {'min': 1, 'max': 20, 'default': 2},
            'completion_rate': {'min': 0, 'max': 100, 'default': 50}
        },
        'ai_interaction': {
            'hint_request_rate': {'min': 0, 'max': 1, 'default': 0.3},
            'avg_hint_level': {'min': 1, 'max': 5, 'default': 2},
            'ai_dependency_score': {'min': 0, 'max': 1, 'default': 0.3},
            'hints_before_success': {'min': 0, 'max': 10, 'default': 1},
            'comprehension_pass_rate': {'min': 0, 'max': 100, 'default': 80}
        },
        'temporal': {
            'session_duration': {'min': 0, 'max': 180, 'default': 60},  # minutes
            'days_since_last_session': {'min': 0, 'max': 30, 'default': 1},
            'learning_velocity': {'min': 0, 'max': 100, 'default': 50},
            'weekly_sessions': {'min': 0, 'max': 7, 'default': 2}
        }
    }

    def __init__(self, mongo_uri: str, db_name: str = 'yourtwin'):
        """Initialize with MongoDB connection."""
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]

        # Collection references
        self.students = self.db.students
        self.student_twins = self.db.studenttwins
        self.submissions = self.db.submissions
        self.activities = self.db.activities
        self.hint_requests = self.db.hintrequests
        self.activity_monitoring = self.db.activitymonitorings
        self.competencies = self.db.studentcompetencies

    def extract_student_features(
        self,
        student_id: str,
        lookback_days: int = 90
    ) -> Dict[str, Any]:
        """
        Extract all features for a single student.

        Args:
            student_id: MongoDB ObjectId as string
            lookback_days: Number of days to look back for data

        Returns:
            Dictionary with feature categories and values
        """
        student_oid = ObjectId(student_id)
        cutoff_date = datetime.now() - timedelta(days=lookback_days)

        # Get student twin data (Mirror Twin)
        twin = self.student_twins.find_one({'studentId': student_oid})
        if not twin:
            logger.warning(f"No twin found for student {student_id}")
            twin = {}

        # Extract each feature category
        behavioral = self._extract_behavioral_features(student_oid, cutoff_date, twin)
        performance = self._extract_performance_features(student_oid, cutoff_date, twin)
        ai_interaction = self._extract_ai_features(student_oid, cutoff_date, twin)
        temporal = self._extract_temporal_features(student_oid, cutoff_date, twin)

        return {
            'student_id': student_id,
            'extracted_at': datetime.now().isoformat(),
            'lookback_days': lookback_days,
            'behavioral': behavioral,
            'performance': performance,
            'ai_interaction': ai_interaction,
            'temporal': temporal,
            'feature_vector': self._create_feature_vector(
                behavioral, performance, ai_interaction, temporal
            )
        }

    def _extract_behavioral_features(
        self,
        student_id: ObjectId,
        cutoff_date: datetime,
        twin: dict
    ) -> Dict[str, float]:
        """Extract behavioral features from activity monitoring."""

        # Get monitoring records
        monitoring_records = list(self.activity_monitoring.find({
            'student': student_id,
            'createdAt': {'$gte': cutoff_date}
        }))

        behavioral_data = twin.get('behavioralData', {})

        if not monitoring_records:
            # Use twin behavioral data as fallback
            return {
                'avg_typing_speed': behavioral_data.get('avgTypingSpeed', 80),
                'avg_thinking_pause': behavioral_data.get('avgThinkingPause', 5),
                'paste_frequency': self._calculate_paste_frequency([]),
                'active_time_percentage': 80,
                'tab_switch_rate': 5,
                'idle_time_percentage': 10,
                'error_frequency': behavioral_data.get('errorFrequency', 0.3)
            }

        # Calculate from monitoring records
        total_pastes = sum(r.get('pasteCount', 0) for r in monitoring_records)
        total_time = sum(r.get('totalActiveTime', 0) for r in monitoring_records)
        total_tab_switches = sum(r.get('tabSwitchCount', 0) for r in monitoring_records)
        total_idle = sum(r.get('totalIdleTime', 0) for r in monitoring_records)

        session_count = len(monitoring_records) or 1
        avg_session_time = (total_time / session_count) / 60000  # Convert to minutes

        return {
            'avg_typing_speed': behavioral_data.get('avgTypingSpeed', 80),
            'avg_thinking_pause': behavioral_data.get('avgThinkingPause', 5),
            'paste_frequency': total_pastes / session_count if session_count > 0 else 0,
            'active_time_percentage': 100 - (total_idle / (total_time or 1)) * 100,
            'tab_switch_rate': total_tab_switches / session_count if session_count > 0 else 0,
            'idle_time_percentage': (total_idle / (total_time or 1)) * 100,
            'error_frequency': behavioral_data.get('errorFrequency', 0.3)
        }

    def _extract_performance_features(
        self,
        student_id: ObjectId,
        cutoff_date: datetime,
        twin: dict
    ) -> Dict[str, float]:
        """Extract performance features from submissions."""

        # Get submissions
        submissions = list(self.submissions.find({
            'studentId': student_id,
            'createdAt': {'$gte': cutoff_date}
        }))

        difficulty_stats = twin.get('difficultyStats', {})

        if not submissions:
            return {
                'success_rate': 50,
                'avg_score': 50,
                'difficulty_level': 1,
                'time_per_problem': 30,
                'attempt_count': 1,
                'completion_rate': 50
            }

        # Calculate metrics
        passed = sum(1 for s in submissions if s.get('status') == 'passed')
        success_rate = (passed / len(submissions)) * 100 if submissions else 0

        avg_score = sum(s.get('score', 0) for s in submissions) / len(submissions)

        # Group by activity to get attempt counts
        activity_attempts = {}
        for s in submissions:
            activity_id = str(s.get('activityId'))
            if activity_id not in activity_attempts:
                activity_attempts[activity_id] = 0
            activity_attempts[activity_id] += 1

        avg_attempts = sum(activity_attempts.values()) / len(activity_attempts) if activity_attempts else 1

        # Calculate difficulty progression
        easy = difficulty_stats.get('easy', {}).get('completed', 0)
        medium = difficulty_stats.get('medium', {}).get('completed', 0)
        hard = difficulty_stats.get('hard', {}).get('completed', 0)

        if hard > 0:
            difficulty_level = 2
        elif medium > 0:
            difficulty_level = 1
        else:
            difficulty_level = 0

        return {
            'success_rate': success_rate,
            'avg_score': avg_score,
            'difficulty_level': difficulty_level,
            'time_per_problem': 30,  # Would need execution time tracking
            'attempt_count': avg_attempts,
            'completion_rate': success_rate  # Simplified
        }

    def _extract_ai_features(
        self,
        student_id: ObjectId,
        cutoff_date: datetime,
        twin: dict
    ) -> Dict[str, float]:
        """Extract AI interaction features from hint requests."""

        # Get hint requests
        hints = list(self.hint_requests.find({
            'studentId': student_id,
            'createdAt': {'$gte': cutoff_date}
        }))

        ai_pattern = twin.get('aiDependencyPattern', {})
        behavioral = twin.get('behavioralData', {})

        if not hints:
            return {
                'hint_request_rate': ai_pattern.get('hintRequestRate', 0.3),
                'avg_hint_level': ai_pattern.get('avgHintLevel', 2),
                'ai_dependency_score': behavioral.get('aiDependencyScore', 0.3),
                'hints_before_success': 1,
                'comprehension_pass_rate': 80
            }

        # Calculate hint metrics
        total_hints = len(hints)
        avg_level = sum(h.get('hintLevel', 1) for h in hints) / total_hints

        # Hints that led to success
        successful_hints = sum(1 for h in hints if h.get('ledToSuccess', False))

        # Comprehension checks passed
        comprehension_passed = sum(
            1 for h in hints
            if h.get('comprehensionCheck', {}).get('passed', True)
        )

        return {
            'hint_request_rate': ai_pattern.get('hintRequestRate', total_hints / 10),
            'avg_hint_level': avg_level,
            'ai_dependency_score': behavioral.get('aiDependencyScore', 0.3),
            'hints_before_success': total_hints / (successful_hints or 1),
            'comprehension_pass_rate': (comprehension_passed / total_hints) * 100 if total_hints > 0 else 80
        }

    def _extract_temporal_features(
        self,
        student_id: ObjectId,
        cutoff_date: datetime,
        twin: dict
    ) -> Dict[str, float]:
        """Extract temporal/timing features."""

        # Get submission timestamps
        submissions = list(self.submissions.find(
            {'studentId': student_id, 'createdAt': {'$gte': cutoff_date}},
            {'createdAt': 1}
        ).sort('createdAt', -1))

        if not submissions:
            return {
                'session_duration': 60,
                'days_since_last_session': 7,
                'learning_velocity': twin.get('learningVelocity', 50),
                'weekly_sessions': 2
            }

        # Days since last activity
        last_submission = submissions[0]['createdAt']
        days_since = (datetime.now() - last_submission).days

        # Weekly activity pattern
        week_ago = datetime.now() - timedelta(days=7)
        weekly_submissions = sum(1 for s in submissions if s['createdAt'] >= week_ago)

        return {
            'session_duration': 60,  # Would need session tracking
            'days_since_last_session': days_since,
            'learning_velocity': twin.get('learningVelocity', 50),
            'weekly_sessions': min(weekly_submissions, 7)
        }

    def _create_feature_vector(
        self,
        behavioral: Dict,
        performance: Dict,
        ai_interaction: Dict,
        temporal: Dict
    ) -> List[float]:
        """
        Create normalized feature vector from all feature categories.

        Returns a flat list of normalized values [0, 1] for model input.
        """
        vector = []

        # Normalize and append each feature category
        for category, features in [
            ('behavioral', behavioral),
            ('performance', performance),
            ('ai_interaction', ai_interaction),
            ('temporal', temporal)
        ]:
            for name, value in features.items():
                if name in self.FEATURE_DEFINITIONS.get(category, {}):
                    definition = self.FEATURE_DEFINITIONS[category][name]
                    normalized = self._normalize(
                        value,
                        definition['min'],
                        definition['max']
                    )
                    vector.append(normalized)
                else:
                    # Unknown feature, append as-is (assume already normalized)
                    vector.append(float(value) if value else 0.0)

        return vector

    def _normalize(self, value: float, min_val: float, max_val: float) -> float:
        """Normalize value to [0, 1] range."""
        if max_val == min_val:
            return 0.5
        return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))

    def _calculate_paste_frequency(self, records: List[dict]) -> float:
        """Calculate paste frequency from monitoring records."""
        if not records:
            return 0.1
        total_pastes = sum(r.get('pasteCount', 0) for r in records)
        return total_pastes / len(records)

    def extract_all_students(self, lookback_days: int = 90) -> List[Dict]:
        """
        Extract features for all students in the database.

        Returns list of feature dictionaries for training.
        """
        students = self.students.find({})
        all_features = []

        for student in students:
            try:
                features = self.extract_student_features(
                    str(student['_id']),
                    lookback_days
                )
                all_features.append(features)
            except Exception as e:
                logger.error(f"Error extracting features for student {student['_id']}: {e}")
                continue

        logger.info(f"Extracted features for {len(all_features)} students")
        return all_features

    def extract_training_data(self, lookback_days: int = 90) -> Dict[str, np.ndarray]:
        """
        Extract training data with features and labels.

        Labels are based on future performance (success in next activity).
        """
        all_features = self.extract_all_students(lookback_days)

        if not all_features:
            return {'features': np.array([]), 'labels': np.array([])}

        feature_vectors = []
        labels = []

        for student_data in all_features:
            vector = student_data['feature_vector']
            # Label: 1 if success rate > 70%, 0 otherwise
            success_rate = student_data['performance'].get('success_rate', 50)
            label = 1 if success_rate >= 70 else 0

            feature_vectors.append(vector)
            labels.append(label)

        return {
            'features': np.array(feature_vectors, dtype=np.float32),
            'labels': np.array(labels, dtype=np.float32)
        }

    def close(self):
        """Close MongoDB connection."""
        self.client.close()


# Export for use
__all__ = ['FeatureExtractor']
