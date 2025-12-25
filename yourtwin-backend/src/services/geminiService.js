import axios from 'axios';

// Read env vars lazily (after dotenv.config() has run)
const getConfig = () => ({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  timeout: parseInt(process.env.GEMINI_TIMEOUT) || 30000
});

// Rate limiting (free tier: 60 RPM)
let requestCount = 0;
let lastResetTime = Date.now();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60000; // 1 minute

// Check if Gemini API is configured
export const isConfigured = () => {
  const { apiKey } = getConfig();
  return !!apiKey && apiKey.length > 0;
};

// Check rate limit
const checkRateLimit = () => {
  const now = Date.now();
  if (now - lastResetTime > RATE_WINDOW) {
    requestCount = 0;
    lastResetTime = now;
  }
  return requestCount < RATE_LIMIT;
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

// Generate chat completion
export const generateCompletion = async (messages, options = {}) => {
  const config = getConfig();

  if (!isConfigured()) {
    throw {
      success: false,
      error: 'Gemini API key not configured',
      code: 'GEMINI_NOT_CONFIGURED'
    };
  }

  if (!checkRateLimit()) {
    throw {
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }

  const {
    model = config.model,
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
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH'
        }
      ]
    };

    // Add system instruction if present
    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await axios.post(
      `${config.baseUrl}/models/${model}:generateContent`,
      requestBody,
      {
        timeout: config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': config.apiKey
        }
      }
    );

    requestCount++;
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

    // Handle specific Gemini errors
    if (error.response?.status === 429) {
      throw {
        success: false,
        error: 'Gemini rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        responseTime
      };
    }

    if (error.response?.status === 403) {
      throw {
        success: false,
        error: 'Invalid Gemini API key',
        code: 'INVALID_API_KEY',
        responseTime
      };
    }

    if (error.response?.data?.error) {
      throw {
        success: false,
        error: error.response.data.error.message || 'Gemini API error',
        code: error.response.data.error.code || 'GEMINI_ERROR',
        responseTime
      };
    }

    throw {
      success: false,
      error: error.message,
      code: error.code || 'GEMINI_ERROR',
      responseTime
    };
  }
};

// Generate with streaming (for real-time UI updates)
export const generateStream = async (messages, onChunk, options = {}) => {
  const config = getConfig();

  if (!isConfigured()) {
    throw {
      success: false,
      error: 'Gemini API key not configured',
      code: 'GEMINI_NOT_CONFIGURED'
    };
  }

  if (!checkRateLimit()) {
    throw {
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }

  const {
    model = config.model,
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

    requestCount++;
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
    throw {
      success: false,
      error: error.message,
      code: error.code || 'GEMINI_STREAM_ERROR'
    };
  }
};

// Get current rate limit status
export const getRateLimitStatus = () => {
  const now = Date.now();
  if (now - lastResetTime > RATE_WINDOW) {
    requestCount = 0;
    lastResetTime = now;
  }

  return {
    requestsUsed: requestCount,
    requestsRemaining: RATE_LIMIT - requestCount,
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

export default {
  isConfigured,
  generateCompletion,
  generateStream,
  getRateLimitStatus,
  estimateCost
};
