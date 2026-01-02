import * as ollamaService from './ollamaService.js';
import * as geminiService from './geminiService.js';

export const AI_PROVIDERS = { OLLAMA: 'ollama', GEMINI: 'gemini' };

// Select best provider
export const selectProvider = async () => {
  const queue = ollamaService.getQueueStatus();

  // Use Gemini if Ollama queue is long
  if (queue.queueLength >= 3 && geminiService.isConfigured()) {
    return { provider: AI_PROVIDERS.GEMINI, reason: 'queue_full' };
  }

  // Use Gemini if Ollama is down
  if (queue.ollamaAvailable === false && geminiService.isConfigured()) {
    return { provider: AI_PROVIDERS.GEMINI, reason: 'ollama_down' };
  }

  // Both unavailable
  if (queue.ollamaAvailable === false && !geminiService.isConfigured()) {
    return { provider: null, reason: 'no_providers', error: 'No AI providers available' };
  }

  // Default to Ollama
  return { provider: AI_PROVIDERS.OLLAMA, reason: 'default' };
};

// Generate completion with fallback
export const generateCompletion = async (messages, options = {}) => {
  const { preferredProvider = null, allowFallback = true, ...genOptions } = options;

  // Select provider
  let selection = preferredProvider
    ? { provider: preferredProvider, reason: 'user_specified' }
    : await selectProvider();

  if (!selection.provider) {
    return { success: false, error: selection.error, providerSelection: selection };
  }

  try {
    // Try primary provider
    const result = selection.provider === AI_PROVIDERS.OLLAMA
      ? await ollamaService.generateCompletion(messages, genOptions)
      : await geminiService.generateCompletion(messages, genOptions);

    return { ...result, provider: selection.provider, providerSelection: selection };

  } catch (error) {
    console.error(`${selection.provider} failed:`, error.error || error.message);

    // Fallback to Gemini with cascading models if Ollama failed
    if (allowFallback && selection.provider === AI_PROVIDERS.OLLAMA && geminiService.isConfigured()) {
      console.log('↪️ Falling back to Gemini (cascading models)...');
      try {
        // Use cascading fallback: gemini-2.5-flash-lite → gemini-2.5-flash → gemini-3-flash
        const fallback = await geminiService.generateCompletionWithFallback(messages, genOptions);
        if (fallback.success) {
          return {
            ...fallback,
            provider: AI_PROVIDERS.GEMINI,
            providerSelection: {
              ...selection,
              fallback: true,
              fallbackLevel: fallback.fallbackLevel,
              originalError: error.error
            }
          };
        }
        return {
          success: false,
          error: `Ollama and all Gemini models failed: ${fallback.error}`,
          provider: null
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `Both providers failed: ${error.error}, ${fallbackError.message}`,
          provider: null
        };
      }
    }

    return { success: false, error: error.error || error.message, provider: selection.provider };
  }
};

// Streaming with fallback
export const generateStream = async (messages, onChunk, options = {}) => {
  const { preferredProvider = null, allowFallback = true, ...genOptions } = options;

  let selection = preferredProvider
    ? { provider: preferredProvider, reason: 'user_specified' }
    : await selectProvider();

  if (!selection.provider) {
    throw { success: false, error: selection.error };
  }

  try {
    const result = selection.provider === AI_PROVIDERS.OLLAMA
      ? await ollamaService.generateStream(messages, onChunk, genOptions)
      : await geminiService.generateStream(messages, onChunk, genOptions);

    return { ...result, provider: selection.provider };

  } catch (error) {
    if (allowFallback && selection.provider === AI_PROVIDERS.OLLAMA && geminiService.isConfigured()) {
      console.log('↪️ Stream fallback to Gemini...');
      const fallback = await geminiService.generateStream(messages, onChunk, genOptions);
      return { ...fallback, provider: AI_PROVIDERS.GEMINI, fallback: true };
    }
    throw error;
  }
};

// Get providers status
export const getProvidersStatus = async () => {
  const ollamaHealth = await ollamaService.checkOllamaHealth();
  const ollamaQueue = ollamaService.getQueueStatus();
  const geminiConfigured = geminiService.isConfigured();

  return {
    ollama: { available: ollamaHealth.available, models: ollamaHealth.models || [], queue: ollamaQueue },
    gemini: { configured: geminiConfigured, rateLimit: geminiConfigured ? geminiService.getRateLimitStatus() : null },
    recommendation: await selectProvider()
  };
};

// Initialize
export const initialize = async () => {
  console.log('🤖 Initializing AI Service (Dual Model Architecture)...');
  console.log('═══════════════════════════════════════════════════════');

  const ollamaHealth = await ollamaService.checkOllamaHealth();
  if (ollamaHealth.available) {
    console.log(`✅ Ollama ready (${ollamaHealth.models?.length || 0} models available)`);

    // Show dual model configuration
    const validationModel = process.env.OLLAMA_VALIDATION_MODEL || 'deepseek-r1:7b';
    const shadowTwinModel = process.env.OLLAMA_SHADOW_TWIN_MODEL || 'mistral:7b-instruct-q4_0';

    console.log('📦 Local Models:');
    console.log(`   ├─ Validation/Grading: ${validationModel}`);
    console.log(`   └─ Shadow Twin/Tutor: ${shadowTwinModel}`);

    // Warmup both models
    await ollamaService.warmupModel();
  } else {
    console.log('⚠️ Ollama not available - using Gemini fallback only');
  }

  if (geminiService.isConfigured()) {
    const models = geminiService.getModelList();
    console.log('☁️ Gemini Cascading Fallback:');
    models.forEach((model, i) => {
      const prefix = i === models.length - 1 ? '└─' : '├─';
      const label = i === 0 ? '(Primary)' : i === 1 ? '(Secondary)' : '(Tertiary)';
      console.log(`   ${prefix} ${model} ${label}`);
    });
  } else {
    console.log('⚠️ Gemini not configured - no fallback available');
  }

  console.log('═══════════════════════════════════════════════════════\n');

  return getProvidersStatus();
};

export default {
  AI_PROVIDERS,
  selectProvider,
  generateCompletion,
  generateStream,
  getProvidersStatus,
  initialize
};
