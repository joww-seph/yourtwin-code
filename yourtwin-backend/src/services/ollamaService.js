import axios from 'axios';
import * as geminiService from './geminiService.js';

// Configuration
const getConfig = () => ({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  // Dual Model Configuration
  // Model 1: Code Validation / Grading (reasoning model, better at detecting cheating)
  validationModel: process.env.OLLAMA_VALIDATION_MODEL || 'deepseek-r1:7b',
  // Model 2: Shadow Twin / Tutor (lower VRAM, better pedagogy)
  shadowTwinModel: process.env.OLLAMA_SHADOW_TWIN_MODEL || 'mistral:7b-instruct-q4_0',
  // Fallback model (cloud-based, when local stressed)
  fallbackModel: process.env.GEMINI_MODEL || 'gemini-3-flash',
  timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 60000
});

/**
 * Attempt to repair malformed JSON from AI responses
 * Handles common issues like missing quotes, trailing commas, etc.
 */
const repairJSON = (jsonStr) => {
  let repaired = jsonStr;

  // Remove any text before the first { and after the last }
  const start = repaired.indexOf('{');
  const end = repaired.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  repaired = repaired.slice(start, end + 1);

  // Fix common issues:
  // 1. Replace single quotes with double quotes for property names/values
  repaired = repaired.replace(/'/g, '"');

  // 2. Fix unquoted property names: {followsInstructions: -> {"followsInstructions":
  repaired = repaired.replace(/\{(\s*)(\w+)(\s*):/g, '{$1"$2"$3:');
  repaired = repaired.replace(/,(\s*)(\w+)(\s*):/g, ',$1"$2"$3:');

  // 3. Fix true/false that might be quoted incorrectly
  repaired = repaired.replace(/"true"/gi, 'true');
  repaired = repaired.replace(/"false"/gi, 'false');

  // 4. Remove trailing commas before } or ]
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // 5. Fix missing commas between properties
  repaired = repaired.replace(/}(\s*){/g, '},$1{');
  repaired = repaired.replace(/"(\s*)"/g, '","');

  return repaired;
};

/**
 * Safely parse JSON with repair attempts
 */
const safeParseJSON = (content) => {
  // First try direct parse
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Try repair
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const repaired = repairJSON(jsonMatch[0]);
      if (repaired) {
        try {
          return JSON.parse(repaired);
        } catch (e2) {
          console.log('⚠️ [JSON Repair] Failed to repair JSON:', e2.message);
        }
      }
    }
  }

  // Fallback: try to extract key values manually
  try {
    const followsMatch = content.match(/followsInstructions["\s:]+(\w+)/i);
    const hardcodedMatch = content.match(/isHardcoded["\s:]+(\w+)/i);
    const confidenceMatch = content.match(/confidence["\s:]+(\d+)/i);

    if (followsMatch || hardcodedMatch) {
      console.log('⚠️ [JSON Repair] Using fallback extraction');
      return {
        followsInstructions: followsMatch ? followsMatch[1].toLowerCase() === 'true' : true,
        isHardcoded: hardcodedMatch ? hardcodedMatch[1].toLowerCase() === 'true' : false,
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 70,
        issues: [],
        explanation: 'Extracted from malformed response'
      };
    }
  } catch (e) {
    // Final fallback failed
  }

  return null;
};

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

// Generate completion (uses Shadow Twin model by default for hints/tutor)
export const generateCompletion = async (messages, options = {}) => {
  const config = getConfig();
  // Use shadowTwinModel for general completions (hints, tutor, comprehension)
  const { model = config.shadowTwinModel, temperature = 0.7, maxTokens = 512 } = options;

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

    let content = res.data.message?.content || '';
    const thinking = res.data.message?.thinking || '';

    // DeepSeek-R1 and reasoning models put response in thinking field
    // If content is empty but thinking exists, try to extract JSON from thinking
    if (!content && thinking) {
      // Try to find JSON in the thinking field
      const jsonMatch = thinking.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
        console.log(`🧠 [Ollama] Extracted JSON from thinking field (${content.length} chars)`);
      } else {
        // No JSON found, use the thinking content as-is (last resort)
        content = thinking;
        console.log(`🧠 [Ollama] Using thinking field as content (${content.length} chars)`);
      }
    }

    // Only fail if both content and thinking are empty
    if (!content) {
      console.log('❌ [Ollama] Empty response - triggering fallback');
      req.reject({ success: false, error: 'Empty content', code: 'EMPTY_CONTENT' });
      return;
    }

    // Reduced logging - only log if not validation model (validation has its own logging)
    if (!req.model.includes('deepseek')) {
      console.log(`✅ [Ollama] ${req.model} - ${responseTime}ms - ${content.length} chars`);
    }

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

// Streaming (uses Shadow Twin model for interactive tutoring)
export const generateStream = async (messages, onChunk, options = {}) => {
  const config = getConfig();
  const { model = config.shadowTwinModel, temperature = 0.7, maxTokens = 512 } = options;

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

// Warmup both models
export const warmupModel = async () => {
  const config = getConfig();
  console.log(`🔥 Warming up dual models...`);

  let warmedUp = 0;

  // Warmup Shadow Twin model (for hints/tutor)
  try {
    console.log(`   └─ Shadow Twin: ${config.shadowTwinModel}`);
    const result = await generateCompletion([{ role: 'user', content: 'Hi' }], {
      model: config.shadowTwinModel,
      maxTokens: 5
    });
    if (result.success) {
      console.log(`   ✅ Shadow Twin ready (${result.responseTime}ms)`);
      warmedUp++;
    }
  } catch (err) {
    console.log(`   ⚠️ Shadow Twin warmup failed: ${err.message || err}`);
  }

  // Warmup Validation model (for code validation)
  try {
    console.log(`   └─ Validation: ${config.validationModel}`);
    const result = await generateCompletion([{ role: 'user', content: 'Hi' }], {
      model: config.validationModel,
      maxTokens: 5
    });
    if (result.success) {
      console.log(`   ✅ Validation model ready (${result.responseTime}ms)`);
      warmedUp++;
    }
  } catch (err) {
    console.log(`   ⚠️ Validation model warmup failed: ${err.message || err}`);
  }

  return warmedUp > 0;
};

// Clear queue
export const clearQueue = () => {
  const count = requestQueue.length;
  requestQueue.forEach(r => r.reject({ success: false, error: 'Queue cleared' }));
  requestQueue = [];
  return count;
};

// ===== CODE VALIDATION WITH AI =====

// Simple in-memory cache for code analysis results
const analysisCache = new Map();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Generate a hash for code (simple but effective for caching)
const generateCodeHash = (code, language, testCases) => {
  const normalized = code.replace(/\s+/g, ' ').trim();
  const testCaseStr = testCases.map(tc => `${tc.input}:${tc.expectedOutput}`).join('|');
  return `${language}:${normalized.length}:${normalized.slice(0, 100)}:${testCaseStr.slice(0, 100)}`;
};

// Clean up old cache entries
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      analysisCache.delete(key);
    }
  }
  // Limit size
  if (analysisCache.size > CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(analysisCache.keys()).slice(0, analysisCache.size - CACHE_MAX_SIZE);
    keysToDelete.forEach(k => analysisCache.delete(k));
  }
};

// Get cached analysis or null
const getCachedAnalysis = (code, language, testCases) => {
  const hash = generateCodeHash(code, language, testCases);
  const cached = analysisCache.get(hash);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
};

// Clear all cached validations (useful for debugging)
export const clearValidationCache = () => {
  const size = analysisCache.size;
  analysisCache.clear();
  console.log(`🗑️ [AI Cache] Cleared ${size} cached validations`);
  return size;
};

// Store analysis in cache
const cacheAnalysis = (code, language, testCases, result) => {
  cleanupCache();
  const hash = generateCodeHash(code, language, testCases);
  analysisCache.set(hash, { result, timestamp: Date.now() });
};

/**
 * AI-powered code validation using local DeepSeek-Coder with Gemini fallback
 * Validates: 1) Instruction compliance, 2) No hardcoded workarounds
 * Primary: Local DeepSeek-Coder (fast, deterministic, no rate limits)
 * Fallback: Gemini Flash (when local model stressed or unavailable)
 */
export const validateCodeWithAI = async (code, language, testCases, activityDescription = '') => {
  // Check cache first
  const cached = getCachedAnalysis(code, language, testCases);
  if (cached) {
    console.log('📦 [AI Validation] Using cached result');
    return cached;
  }

  const config = getConfig();
  const testCaseInfo = testCases.slice(0, 3).map((tc, i) =>
    `Input: "${tc.input}" → Output: "${tc.expectedOutput}"`
  ).join('\n');

  // Debug: Log the code being validated
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`🔍 [AI Validation] VALIDATING CODE (${config.validationModel}):`);
  console.log('────────────────────────────────────────────────────────────');
  console.log(code.slice(0, 800));
  console.log('────────────────────────────────────────────────────────────');
  console.log('📋 Instructions:', activityDescription?.slice(0, 200) || 'None provided');
  console.log('════════════════════════════════════════════════════════════\n');

  // Strict prompt to detect hardcoded workarounds
  // Use a more structured prompt that code models follow better
  const prompt = `
<role>
You are a STRICT academic integrity validator.
Your ONLY goal is to detect cheating, hardcoding, or intentional workarounds.
Assume the student is attempting to bypass the task unless proven otherwise.
Passing test cases DOES NOT imply legitimacy.
</role>

<task>
Analyze the student code for academic integrity violations ONLY.
Do NOT evaluate pedagogy quality or stylistic correctness.
</task>

<assignment>
${activityDescription || 'Solve the problem algorithmically'}
</assignment>

<code language="${language}">
${code.slice(0, 1500)}
</code>

<test_cases>
${testCaseInfo}
</test_cases>

<evaluation_principles>
- Be skeptical by default
- If intent is ambiguous, assume cheating
- Generality is required; test-case-shaped logic is suspicious
- Code structure that hides constants or ignores inputs is cheating
- Never reward plausibility; require evidence of computation
</evaluation_principles>

<hardcoding_detection>
Set isHardcoded=true if ANY of the following are detected:

- Conditional logic checking specific input values
  (e.g., if n==5, if input=="hello", switch on known cases)
- Direct printing/output of constants or literals without computation
- Output independent of input values
- Lookup tables, arrays, maps, or objects mapping inputs to outputs
- Logic that only works for the given test cases
- Fake or hollow logic (unused loops, unused math, dead code)
- Disguised constants (math collapsing to constants, n*0 + c)
- Declared inputs or variables that do not affect the output
- Early exits or branches that mirror test case structure
</hardcoding_detection>

<instruction_compliance>
Set followsInstructions=false ONLY if there is CLEAR evidence that:
- A required approach is explicitly violated
  (e.g., recursion required but loops used, forbidden constructs present)

Do NOT assume compliance based on output correctness alone.
If uncertain, set followsInstructions=false.
</instruction_compliance>

<confidence_rules>
- confidence must reflect certainty of detection, not code correctness
- confidence MUST NOT be 100
- If evidence is weak or ambiguous, lower confidence
</confidence_rules>

<output_format>
You MUST respond with ONLY a single line of valid JSON.
NO markdown. NO explanations outside JSON. NO extra text.

Format:
{"followsInstructions":true,"isHardcoded":false,"confidence":85,"issues":[],"explanation":"one concise sentence"}
</output_format>

JSON:
`;


  // Try local validation model first
  let result = null;
  let usedFallback = false;
  let modelUsed = config.validationModel;

  try {
    // Attempt local DeepSeek-Coder validation
    result = await generateCompletion(
      [{ role: 'user', content: prompt }],
      { model: config.validationModel, temperature: 0.1, maxTokens: 300 }
    );

    if (!result.success) {
      throw new Error(result.error || 'Local validation failed');
    }
  } catch (localError) {
    console.log(`⚠️ [AI Validation] Local model failed: ${localError.message || localError}`);

    // Fallback to Gemini with cascading model fallback
    if (geminiService.isConfigured()) {
      console.log('↪️ [AI Validation] Falling back to Gemini (cascading models)...');
      usedFallback = true;

      try {
        // Use cascading fallback: gemini-3-flash → gemini-2.5-flash → gemini-2.5-flash-lite
        result = await geminiService.generateCompletionWithFallback(
          [{ role: 'user', content: prompt }],
          { temperature: 0.1, maxTokens: 300 }
        );

        if (!result.success) {
          console.log(`❌ [AI Validation] All Gemini models failed: ${result.error}`);
          return null;
        }

        modelUsed = result.model;
        if (result.fallbackLevel > 0) {
          console.log(`✅ [AI Validation] Gemini succeeded at fallback level ${result.fallbackLevel + 1}`);
        }
      } catch (fallbackError) {
        console.error('❌ [AI Validation] Gemini cascading fallback exception:', fallbackError.message);
        return null;
      }
    } else {
      console.log('❌ [AI Validation] No fallback available (Gemini not configured)');
      return null;
    }
  }

  // Parse JSON response with repair capabilities
  const content = result.content.trim();

  // Debug: Log the raw AI response
  console.log(`🤖 [AI Validation] RAW RESPONSE (${usedFallback ? 'Gemini fallback' : 'Local'}):`);
  console.log(content);
  console.log('');

  const analysis = safeParseJSON(content);

  if (!analysis) {
    console.log('❌ [AI Validation] Could not parse JSON from response');
    return null;
  }

  // Determine legitimacy: must follow instructions AND not be hardcoded
  const followsInstructions = analysis.followsInstructions ?? analysis.isLegitimate ?? true;
  const isHardcoded = analysis.isHardcoded ?? false;
  const isLegitimate = followsInstructions && !isHardcoded;

  // Build issues list
  const issues = Array.isArray(analysis.issues) ? analysis.issues : [];
  if (!followsInstructions && !issues.some(i => i.toLowerCase().includes('instruction'))) {
    issues.unshift('Does not follow activity instructions');
  }
  if (isHardcoded && !issues.some(i => i.toLowerCase().includes('hardcoded'))) {
    issues.unshift('Uses hardcoded outputs instead of algorithm');
  }

  const validationResult = {
    isLegitimate,
    followsInstructions,
    isHardcoded,
    confidence: Math.min(100, Math.max(0, analysis.confidence || 50)),
    issues,
    explanation: analysis.explanation || '',
    aiValidated: true,
    responseTime: result.responseTime || 0,
    model: modelUsed,
    usedFallback
  };

  // Cache the result
  cacheAnalysis(code, language, testCases, validationResult);

  // Clear verdict logging
  const verdict = isLegitimate ? '✅ LEGITIMATE' : '🚨 FLAGGED';
  const providerInfo = usedFallback ? '(Gemini fallback)' : '(Local)';
  console.log('════════════════════════════════════════════════════════════');
  console.log(`📊 [AI Validation] VERDICT: ${verdict} ${providerInfo}`);
  console.log(`   ├─ Follows Instructions: ${followsInstructions ? '✓ Yes' : '✗ NO'}`);
  console.log(`   ├─ Is Hardcoded: ${isHardcoded ? '✗ YES (CHEATING)' : '✓ No'}`);
  console.log(`   ├─ Confidence: ${validationResult.confidence}%`);
  console.log(`   ├─ Issues: ${issues.length > 0 ? issues.join(', ') : 'None'}`);
  console.log(`   ├─ Model: ${modelUsed}`);
  console.log(`   └─ Time: ${result.responseTime}ms`);
  console.log('════════════════════════════════════════════════════════════\n');

  return validationResult;
};

/**
 * Quick AI check for suspicious code patterns
 * Uses local validation model with Gemini fallback
 */
export const quickAICheck = async (code, language) => {
  const config = getConfig();

  const prompt = `Quickly analyze this ${language} code. Is it suspicious (e.g., just print statements, no logic)?
Code: \`\`\`${code.slice(0, 500)}\`\`\`
Reply ONLY: {"suspicious": true/false, "reason": "brief reason"}`;

  // Try local validation model first
  try {
    const result = await generateCompletion(
      [{ role: 'user', content: prompt }],
      { model: config.validationModel, temperature: 0.1, maxTokens: 100 }
    );

    if (result.success) {
      const parsed = safeParseJSON(result.content);
      if (parsed) return parsed;
    }
  } catch (localErr) {
    // Fall through to Gemini
  }

  // Fallback to Gemini with cascading models
  if (geminiService.isConfigured()) {
    try {
      const result = await geminiService.generateCompletionWithFallback(
        [{ role: 'user', content: prompt }],
        { temperature: 0.1, maxTokens: 100 }
      );

      if (result.success) {
        const parsed = safeParseJSON(result.content);
        if (parsed) return parsed;
      }
    } catch (err) {
      console.error('❌ [Quick AI Check]', err.message || err.error);
    }
  }

  return null;
};

// Get cache stats
export const getCacheStats = () => ({
  size: analysisCache.size,
  maxSize: CACHE_MAX_SIZE,
  ttlMinutes: CACHE_TTL / 60000
});

// Get current model configuration
export const getModelConfig = () => {
  const config = getConfig();
  return {
    validationModel: config.validationModel,
    shadowTwinModel: config.shadowTwinModel,
    fallbackModel: config.fallbackModel,
    timeout: config.timeout
  };
};

export default {
  checkOllamaHealth,
  checkModelAvailable,
  getQueueStatus,
  generateCompletion,
  generateStream,
  warmupModel,
  clearQueue,
  validateCodeWithAI,
  quickAICheck,
  getCacheStats,
  clearValidationCache,
  getModelConfig
};
