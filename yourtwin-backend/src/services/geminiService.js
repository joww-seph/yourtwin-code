import axios from 'axios';

// Read env vars lazily (after dotenv.config() has run)
const getConfig = () => ({
  apiKey: process.env.GEMINI_API_KEY,
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  timeout: parseInt(process.env.GEMINI_TIMEOUT) || 30000,
  // Cascading fallback models (most capable to lite)
  models: [
    process.env.GEMINI_MODEL_PRIMARY || 'gemini-3-flash',
    process.env.GEMINI_MODEL_SECONDARY || 'gemini-2.5-flash',
    process.env.GEMINI_MODEL_TERTIARY || 'gemini-2.5-flash-lite'
  ]
});

// Get primary model (for backwards compatibility)
const getPrimaryModel = () => getConfig().models[0];

// Rate limiting tracking (for info only, not blocking)
let requestCount = 0;
let lastResetTime = Date.now();
const RATE_WINDOW = 60000; // 1 minute

// Check if Gemini API is configured
export const isConfigured = () => {
  const { apiKey } = getConfig();
  return !!apiKey && apiKey.length > 0;
};

// Track rate limit (info only, doesn't block)
const trackRequest = () => {
  const now = Date.now();
  if (now - lastResetTime > RATE_WINDOW) {
    requestCount = 0;
    lastResetTime = now;
  }
  requestCount++;
};

// Convert messages to Gemini format
const convertToGeminiFormat = (messages) => {
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Gemini doesn't have system role, prepend to first user message
      continue;
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  // Extract system message if present
  const systemMessage = messages.find(m => m.role === 'system');

  return { contents, systemInstruction: systemMessage?.content };
};

// Generate chat completion (single model)
export const generateCompletion = async (messages, options = {}) => {
  const config = getConfig();

  if (!isConfigured()) {
    console.log('⚠️ [Gemini] API key not configured');
    return { success: false, error: 'Gemini API key not configured', code: 'GEMINI_NOT_CONFIGURED' };
  }

  const {
    model = getPrimaryModel(),
    temperature = 0.7,
    maxTokens = 1024
  } = options;

  const startTime = Date.now();

  try {
    const { contents, systemInstruction } = convertToGeminiFormat(messages);

    const requestBody = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    };

    // Add system instruction if present
    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const url = `${config.baseUrl}/models/${model}:generateContent`;

    const response = await axios.post(url, requestBody, {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': config.apiKey
      }
    });

    trackRequest();
    const responseTime = Date.now() - startTime;

    const candidate = response.data.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';

    // Calculate token usage from response metadata
    const usageMetadata = response.data.usageMetadata || {};

    return {
      success: true,
      content,
      model,
      responseTime,
      tokenUsage: {
        prompt: usageMetadata.promptTokenCount || 0,
        completion: usageMetadata.candidatesTokenCount || 0,
        total: usageMetadata.totalTokenCount || 0
      },
      finishReason: candidate?.finishReason || 'unknown'
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log the actual error for debugging
    console.error('❌ [Gemini] API Error:', error.response?.status, error.response?.data?.error?.message || error.message);

    // Return error object instead of throwing (more graceful handling)
    if (error.response?.status === 429) {
      return { success: false, error: 'Gemini API rate limit exceeded (try again in a minute)', code: 'RATE_LIMIT_EXCEEDED', responseTime };
    }

    if (error.response?.status === 403) {
      return { success: false, error: 'Invalid Gemini API key', code: 'INVALID_API_KEY', responseTime };
    }

    if (error.response?.data?.error) {
      return {
        success: false,
        error: error.response.data.error.message || 'Gemini API error',
        code: error.response.data.error.code || 'GEMINI_ERROR',
        responseTime
      };
    }

    return { success: false, error: error.message, code: error.code || 'GEMINI_ERROR', responseTime };
  }
};

/**
 * Generate completion with cascading fallback
 * Tries each model in order until one succeeds
 * Models: gemini-3-flash → gemini-2.5-flash → gemini-2.5-flash-lite
 */
export const generateCompletionWithFallback = async (messages, options = {}) => {
  const config = getConfig();

  if (!isConfigured()) {
    console.log('⚠️ [Gemini] API key not configured');
    return { success: false, error: 'Gemini API key not configured', code: 'GEMINI_NOT_CONFIGURED' };
  }

  const { temperature = 0.7, maxTokens = 1024 } = options;
  const models = config.models;
  const errors = [];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLastModel = i === models.length - 1;

    try {
      console.log(`🔄 [Gemini] Trying model ${i + 1}/${models.length}: ${model}`);

      const result = await generateCompletion(messages, {
        model,
        temperature,
        maxTokens
      });

      if (result.success) {
        if (i > 0) {
          console.log(`✅ [Gemini] Fallback succeeded with model: ${model}`);
        }
        return {
          ...result,
          fallbackLevel: i, // 0 = primary, 1 = secondary, 2 = tertiary
          modelsAttempted: i + 1
        };
      }

      // Model failed, record error and try next
      errors.push({ model, error: result.error, code: result.code });
      console.log(`⚠️ [Gemini] Model ${model} failed: ${result.error}`);

      // If rate limited, try next model immediately
      if (result.code === 'RATE_LIMIT_EXCEEDED' && !isLastModel) {
        console.log(`↪️ [Gemini] Rate limited, trying next model...`);
        continue;
      }

      // For other errors on last model, return the error
      if (isLastModel) {
        return {
          success: false,
          error: `All ${models.length} Gemini models failed`,
          errors,
          code: 'ALL_MODELS_FAILED'
        };
      }
    } catch (err) {
      errors.push({ model, error: err.message, code: 'EXCEPTION' });
      console.error(`❌ [Gemini] Exception with ${model}:`, err.message);

      if (isLastModel) {
        return {
          success: false,
          error: `All ${models.length} Gemini models failed with exceptions`,
          errors,
          code: 'ALL_MODELS_FAILED'
        };
      }
    }
  }

  // Should not reach here, but just in case
  return {
    success: false,
    error: 'No Gemini models available',
    errors,
    code: 'NO_MODELS'
  };
};

// Generate with streaming (for real-time UI updates)
export const generateStream = async (messages, onChunk, options = {}) => {
  const config = getConfig();

  if (!isConfigured()) {
    return { success: false, error: 'Gemini API key not configured', code: 'GEMINI_NOT_CONFIGURED' };
  }

  const {
    model = getPrimaryModel(),
    temperature = 0.7,
    maxTokens = 1024
  } = options;

  try {
    const { contents, systemInstruction } = convertToGeminiFormat(messages);

    const requestBody = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await axios.post(
      `${config.baseUrl}/models/${model}:streamGenerateContent?alt=sse`,
      requestBody,
      {
        timeout: config.timeout,
        responseType: 'stream',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': config.apiKey
        }
      }
    );

    trackRequest();
    let fullContent = '';

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        try {
          const text = chunk.toString();
          const lines = text.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            const jsonStr = line.replace('data: ', '');
            if (jsonStr.trim()) {
              const parsed = JSON.parse(jsonStr);
              const partText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (partText) {
                fullContent += partText;
                onChunk(partText, fullContent);
              }
            }
          }
        } catch (parseError) {
          // Ignore parse errors for incomplete chunks
        }
      });

      response.data.on('end', () => {
        resolve({
          success: true,
          content: fullContent,
          model
        });
      });

      response.data.on('error', (error) => {
        reject({
          success: false,
          error: error.message
        });
      });
    });
  } catch (error) {
    console.error('❌ [Gemini Stream] Error:', error.message);
    return { success: false, error: error.message, code: error.code || 'GEMINI_STREAM_ERROR' };
  }
};

// Get current rate limit status (for monitoring)
export const getRateLimitStatus = () => {
  const now = Date.now();
  if (now - lastResetTime > RATE_WINDOW) {
    requestCount = 0;
    lastResetTime = now;
  }

  return {
    requestsUsed: requestCount,
    requestsRemaining: 60 - requestCount, // Free tier: ~60 RPM
    resetsIn: Math.max(0, RATE_WINDOW - (now - lastResetTime))
  };
};

// Estimate cost for a request
export const estimateCost = (promptTokens, completionTokens) => {
  // Gemini 1.5 Flash pricing (as of 2024)
  // Input: $0.075 per 1M tokens
  // Output: $0.30 per 1M tokens
  const inputCost = (promptTokens / 1000000) * 0.075;
  const outputCost = (completionTokens / 1000000) * 0.30;
  return inputCost + outputCost;
};

// Get configured model list
export const getModelList = () => getConfig().models;

export default {
  isConfigured,
  generateCompletion,
  generateCompletionWithFallback,
  generateStream,
  getRateLimitStatus,
  getModelList,
  estimateCost
};
