import axios from 'axios';

// Configuration
const getConfig = () => ({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
  timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 60000
});

// State
let requestQueue = [];
let isProcessing = false;
let ollamaAvailable = null;

// Health check
export const checkOllamaHealth = async () => {
  try {
    const { baseUrl } = getConfig();
    const res = await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });
    ollamaAvailable = true;
    return { available: true, models: res.data.models || [] };
  } catch (err) {
    ollamaAvailable = false;
    return { available: false, error: err.message };
  }
};

// Check model availability
export const checkModelAvailable = async (modelName = null) => {
  const { model } = getConfig();
  const target = modelName || model;
  try {
    const health = await checkOllamaHealth();
    if (!health.available) return false;
    return health.models.some(m => m.name.includes(target.split(':')[0]));
  } catch {
    return false;
  }
};

// Queue status
export const getQueueStatus = () => ({
  queueLength: requestQueue.length,
  isProcessing,
  estimatedWaitTime: requestQueue.length * 8,
  ollamaAvailable
});

// Generate completion
export const generateCompletion = async (messages, options = {}) => {
  const config = getConfig();
  const { model = config.model, temperature = 0.7, maxTokens = 512 } = options;

  return new Promise((resolve, reject) => {
    requestQueue.push({ messages, model, temperature, maxTokens, resolve, reject });
    processQueue();
  });
};

// Process queue
const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;
  const req = requestQueue.shift();
  const config = getConfig();

  try {
    const start = Date.now();

    const res = await axios.post(
      `${config.baseUrl}/api/chat`,
      {
        model: req.model,
        messages: req.messages,
        stream: false,
        options: {
          temperature: req.temperature,
          num_predict: req.maxTokens
        }
      },
      { timeout: config.timeout }
    );

    const responseTime = Date.now() - start;
    ollamaAvailable = true;

    const content = res.data.message?.content || '';
    const thinking = res.data.message?.thinking || '';

    // If content is empty but thinking exists, fail to trigger Gemini fallback
    if (!content && thinking) {
      console.log('❌ [Ollama] Empty content with thinking - triggering fallback');
      req.reject({ success: false, error: 'Empty content', code: 'EMPTY_CONTENT' });
      return;
    }

    console.log(`✅ [Ollama] ${req.model} - ${responseTime}ms - ${content.length} chars`);

    req.resolve({
      success: true,
      content,
      model: req.model,
      responseTime,
      tokenUsage: {
        prompt: res.data.prompt_eval_count || 0,
        completion: res.data.eval_count || 0,
        total: (res.data.prompt_eval_count || 0) + (res.data.eval_count || 0)
      }
    });
  } catch (err) {
    console.error('❌ [Ollama]', err.message);
    ollamaAvailable = false;
    req.reject({ success: false, error: err.message, code: 'OLLAMA_ERROR' });
  } finally {
    isProcessing = false;
    if (requestQueue.length > 0) setImmediate(processQueue);
  }
};

// Streaming
export const generateStream = async (messages, onChunk, options = {}) => {
  const config = getConfig();
  const { model = config.model, temperature = 0.7, maxTokens = 512 } = options;

  const res = await axios.post(
    `${config.baseUrl}/api/chat`,
    {
      model,
      messages,
      stream: true,
      options: { temperature, num_predict: maxTokens }
    },
    { timeout: config.timeout, responseType: 'stream' }
  );

  let fullContent = '';

  return new Promise((resolve, reject) => {
    res.data.on('data', (chunk) => {
      try {
        const lines = chunk.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          const parsed = JSON.parse(line);
          const text = parsed.message?.content || '';
          if (text) {
            fullContent += text;
            onChunk(text, fullContent);
          }
          if (parsed.done) {
            resolve({
              success: true,
              content: fullContent,
              model,
              tokenUsage: {
                prompt: parsed.prompt_eval_count || 0,
                completion: parsed.eval_count || 0,
                total: (parsed.prompt_eval_count || 0) + (parsed.eval_count || 0)
              }
            });
          }
        }
      } catch { /* ignore parse errors */ }
    });

    res.data.on('error', (err) => reject({ success: false, error: err.message }));
  });
};

// Warmup
export const warmupModel = async () => {
  const { model } = getConfig();
  console.log(`🔥 Warming up ${model}...`);
  try {
    const result = await generateCompletion([{ role: 'user', content: 'Hi' }], { maxTokens: 5 });
    if (result.success) {
      console.log(`✅ Warmed up in ${result.responseTime}ms`);
      return true;
    }
  } catch (err) {
    console.error('❌ Warmup failed:', err.message || err);
  }
  return false;
};

// Clear queue
export const clearQueue = () => {
  const count = requestQueue.length;
  requestQueue.forEach(r => r.reject({ success: false, error: 'Queue cleared' }));
  requestQueue = [];
  return count;
};

export default {
  checkOllamaHealth,
  checkModelAvailable,
  getQueueStatus,
  generateCompletion,
  generateStream,
  warmupModel,
  clearQueue
};
