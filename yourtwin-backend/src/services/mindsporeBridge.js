/**
 * MINDSPORE BRIDGE SERVICE
 *
 * Bridge between Node.js backend and Python MindSpore ML microservice.
 * Provides async communication for ML predictions, learning path optimization,
 * and anomaly detection.
 *
 * DIGITAL TWIN INTEGRATION:
 * - Uses Mirror Twin data (StudentTwin) for feature extraction
 * - Enhances Shadow Twin hints with ML-based personalization
 * - Provides predictive insights for student success
 */

import axios from 'axios';

class MindSporeBridge {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    this.timeout = parseInt(process.env.ML_TIMEOUT) || 10000; // 10 seconds
    this.enabled = process.env.ML_SERVICE_ENABLED !== 'false';
    this.retryAttempts = 3;
    this.retryDelay = 1000; // ms

    // Cache for predictions (reduce ML service calls)
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes

    console.log(`🧠 MindSpore Bridge initialized: ${this.enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   ML Service URL: ${this.mlServiceUrl}`);
  }

  /**
   * Check if ML service is available
   */
  async healthCheck() {
    if (!this.enabled) {
      return { available: false, reason: 'ML service disabled' };
    }

    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, {
        timeout: 5000
      });
      return {
        available: true,
        status: response.data.status,
        models: response.data.models
      };
    } catch (error) {
      return {
        available: false,
        reason: error.message
      };
    }
  }

  /**
   * Predict student success probability for an activity
   *
   * @param {string} studentId - Student MongoDB ID
   * @param {string} activityId - Activity MongoDB ID
   * @returns {Object} Prediction with probability and contributing factors
   */
  async predictStudentOutcome(studentId, activityId) {
    if (!this.enabled) {
      return this._getDefaultPrediction();
    }

    // Check cache
    const cacheKey = `predict:${studentId}:${activityId}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this._makeRequest('/api/predict/success', {
        studentId,
        activityId
      });

      const result = {
        probability: response.data.probability,
        confidence: response.data.confidence,
        contributingFactors: response.data.contributing_factors || [],
        riskLevel: this._calculateRiskLevel(response.data.probability),
        timestamp: new Date().toISOString()
      };

      this._setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Prediction error:', error.message);
      return this._getDefaultPrediction();
    }
  }

  /**
   * Get optimal learning path for a student
   *
   * @param {string} studentId - Student MongoDB ID
   * @param {string} targetCompetency - Optional target skill
   * @param {number} numActivities - Number of activities to recommend
   * @returns {Object} Recommended learning path
   */
  async getOptimalLearningPath(studentId, targetCompetency = null, numActivities = 5) {
    if (!this.enabled) {
      return this._getDefaultLearningPath();
    }

    const cacheKey = `path:${studentId}:${targetCompetency}:${numActivities}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this._makeRequest('/api/learning-path', {
        studentId,
        targetCompetency,
        numActivities
      });

      const result = {
        recommendedActivities: response.data.recommended_activities || [],
        expectedOutcomes: response.data.expected_outcomes || [],
        reasoning: response.data.reasoning || 'Based on your learning profile',
        estimatedTime: response.data.estimated_time || null,
        timestamp: new Date().toISOString()
      };

      this._setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Learning path error:', error.message);
      return this._getDefaultLearningPath();
    }
  }

  /**
   * Detect behavioral anomalies for a student
   *
   * @param {string} studentId - Student MongoDB ID
   * @returns {Object} Anomaly detection results
   */
  async detectAnomalies(studentId) {
    if (!this.enabled) {
      return this._getDefaultAnomalyResult();
    }

    const cacheKey = `anomaly:${studentId}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this._makeRequest('/api/anomaly/check', {
        studentId
      });

      const result = {
        isAnomalous: response.data.is_anomalous || false,
        anomalyScore: response.data.anomaly_score || 0,
        anomalyTypes: response.data.anomaly_types || [],
        recommendations: response.data.recommendations || [],
        timestamp: new Date().toISOString()
      };

      this._setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Anomaly detection error:', error.message);
      return this._getDefaultAnomalyResult();
    }
  }

  /**
   * Get personalized hint based on student profile and context
   *
   * @param {string} studentId - Student MongoDB ID
   * @param {string} activityId - Activity MongoDB ID
   * @param {Object} context - Code context, error context, etc.
   * @returns {Object} Personalized hint suggestion
   */
  async getPersonalizedHint(studentId, activityId, context = {}) {
    if (!this.enabled) {
      return this._getDefaultHintSuggestion();
    }

    try {
      const response = await this._makeRequest('/api/hint/personalized', {
        studentId,
        activityId,
        codeContext: context.code || '',
        errorContext: context.error || null,
        attemptNumber: context.attemptNumber || 1,
        timeSpent: context.timeSpent || 0
      });

      return {
        suggestedLevel: response.data.suggested_level || 2,
        adjustedPrompt: response.data.adjusted_prompt || null,
        reasoning: response.data.reasoning || '',
        encourageIndependence: response.data.encourage_independence || false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Personalized hint error:', error.message);
      return this._getDefaultHintSuggestion();
    }
  }

  /**
   * Get batch predictions for multiple students
   *
   * @param {Array} studentIds - Array of student MongoDB IDs
   * @param {string} activityId - Activity MongoDB ID
   * @returns {Array} Array of predictions
   */
  async batchPredict(studentIds, activityId) {
    if (!this.enabled) {
      return studentIds.map(id => ({
        studentId: id,
        ...this._getDefaultPrediction()
      }));
    }

    try {
      const response = await this._makeRequest('/api/predict/batch', {
        studentIds,
        activityId
      });

      return response.data.predictions || studentIds.map(id => ({
        studentId: id,
        ...this._getDefaultPrediction()
      }));
    } catch (error) {
      console.error('Batch prediction error:', error.message);
      return studentIds.map(id => ({
        studentId: id,
        ...this._getDefaultPrediction()
      }));
    }
  }

  /**
   * Submit feedback to improve models
   *
   * @param {string} predictionId - Original prediction ID
   * @param {Object} actualOutcome - What actually happened
   */
  async submitFeedback(predictionId, actualOutcome) {
    if (!this.enabled) return;

    try {
      await this._makeRequest('/api/feedback', {
        predictionId,
        actualOutcome,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Feedback submission error:', error.message);
    }
  }

  // ============ PRIVATE METHODS ============

  /**
   * Make HTTP request to ML service with retry logic
   */
  async _makeRequest(endpoint, data, attempt = 1) {
    try {
      const response = await axios.post(`${this.mlServiceUrl}${endpoint}`, data, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response;
    } catch (error) {
      if (attempt < this.retryAttempts && this._isRetryable(error)) {
        await this._delay(this.retryDelay * attempt);
        return this._makeRequest(endpoint, data, attempt + 1);
      }
      throw error;
    }
  }

  _isRetryable(error) {
    return error.code === 'ECONNABORTED' ||
           error.code === 'ECONNRESET' ||
           (error.response && error.response.status >= 500);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old entries periodically
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  _calculateRiskLevel(probability) {
    if (probability >= 0.8) return 'low';
    if (probability >= 0.5) return 'medium';
    return 'high';
  }

  // ============ DEFAULT FALLBACK RESPONSES ============

  _getDefaultPrediction() {
    return {
      probability: 0.5,
      confidence: 0,
      contributingFactors: [],
      riskLevel: 'unknown',
      isDefault: true,
      timestamp: new Date().toISOString()
    };
  }

  _getDefaultLearningPath() {
    return {
      recommendedActivities: [],
      expectedOutcomes: [],
      reasoning: 'ML service unavailable - using default recommendations',
      isDefault: true,
      timestamp: new Date().toISOString()
    };
  }

  _getDefaultAnomalyResult() {
    return {
      isAnomalous: false,
      anomalyScore: 0,
      anomalyTypes: [],
      recommendations: [],
      isDefault: true,
      timestamp: new Date().toISOString()
    };
  }

  _getDefaultHintSuggestion() {
    return {
      suggestedLevel: 2,
      adjustedPrompt: null,
      reasoning: 'Using standard hint level',
      encourageIndependence: false,
      isDefault: true,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const mindsporeBridge = new MindSporeBridge();

export default mindsporeBridge;
export { MindSporeBridge };
