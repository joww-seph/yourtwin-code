/**
 * Plagiarism Detection Service
 * Uses multiple algorithms to detect code similarity between submissions
 */

// Tokenize code by removing whitespace and normalizing
function tokenize(code) {
  if (!code) return [];

  // Remove comments (single and multi-line)
  let cleaned = code
    .replace(/\/\/.*$/gm, '') // Single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Multi-line comments
    .replace(/#.*$/gm, '') // Python comments
    .replace(/"""[\s\S]*?"""/g, '') // Python docstrings
    .replace(/'''[\s\S]*?'''/g, ''); // Python docstrings

  // Normalize variable names to generic placeholders
  // This helps catch renamed variable plagiarism
  const variablePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const variableMap = new Map();
  let varCounter = 0;

  cleaned = cleaned.replace(variablePattern, (match) => {
    // Keep keywords as-is
    const keywords = new Set([
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'return', 'function', 'def', 'class', 'import', 'from', 'export', 'const',
      'let', 'var', 'int', 'float', 'double', 'string', 'bool', 'boolean', 'void',
      'public', 'private', 'protected', 'static', 'final', 'async', 'await',
      'try', 'catch', 'finally', 'throw', 'new', 'this', 'self', 'True', 'False',
      'None', 'null', 'undefined', 'true', 'false', 'print', 'console', 'log',
      'input', 'range', 'len', 'str', 'int', 'list', 'dict', 'set', 'tuple'
    ]);

    if (keywords.has(match)) return match;

    if (!variableMap.has(match)) {
      variableMap.set(match, `VAR${varCounter++}`);
    }
    return variableMap.get(match);
  });

  // Tokenize by splitting on non-alphanumeric characters
  const tokens = cleaned
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  return tokens;
}

// Calculate Jaccard similarity between two token sets
function jaccardSimilarity(tokens1, tokens2) {
  if (tokens1.length === 0 && tokens2.length === 0) return 1;
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Create n-grams from tokens
function createNgrams(tokens, n = 5) {
  if (tokens.length < n) return [tokens.join(' ')];

  const ngrams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

// Winnowing algorithm for fingerprinting
function winnow(hashes, windowSize = 4) {
  if (hashes.length === 0) return [];
  if (hashes.length <= windowSize) return [Math.min(...hashes)];

  const fingerprints = [];
  let minIdx = 0;

  for (let i = 0; i <= hashes.length - windowSize; i++) {
    const window = hashes.slice(i, i + windowSize);
    const minInWindow = Math.min(...window);
    const minIdxInWindow = window.indexOf(minInWindow) + i;

    if (minIdxInWindow !== minIdx || i === 0) {
      fingerprints.push(minInWindow);
      minIdx = minIdxInWindow;
    }
  }

  return fingerprints;
}

// Simple hash function for strings
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Calculate fingerprint similarity
function fingerprintSimilarity(code1, code2, ngramSize = 5, windowSize = 4) {
  const tokens1 = tokenize(code1);
  const tokens2 = tokenize(code2);

  const ngrams1 = createNgrams(tokens1, ngramSize);
  const ngrams2 = createNgrams(tokens2, ngramSize);

  const hashes1 = ngrams1.map(simpleHash);
  const hashes2 = ngrams2.map(simpleHash);

  const fingerprints1 = new Set(winnow(hashes1, windowSize));
  const fingerprints2 = new Set(winnow(hashes2, windowSize));

  if (fingerprints1.size === 0 && fingerprints2.size === 0) return 1;
  if (fingerprints1.size === 0 || fingerprints2.size === 0) return 0;

  let intersection = 0;
  for (const fp of fingerprints1) {
    if (fingerprints2.has(fp)) intersection++;
  }

  const union = fingerprints1.size + fingerprints2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Levenshtein distance for exact matching
function levenshteinSimilarity(str1, str2) {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;

  // Normalize strings
  const s1 = str1.replace(/\s+/g, ' ').trim();
  const s2 = str2.replace(/\s+/g, ' ').trim();

  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  // For very long strings, use sampling
  if (len1 > 5000 || len2 > 5000) {
    // Sample comparison
    const sample1 = s1.substring(0, 1000) + s1.substring(len1 - 1000);
    const sample2 = s2.substring(0, 1000) + s2.substring(len2 - 1000);
    return levenshteinSimilarity(sample1, sample2);
  }

  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);

  return maxLen > 0 ? 1 - (distance / maxLen) : 1;
}

// Structural similarity - compares code structure
function structuralSimilarity(code1, code2) {
  // Extract structural patterns
  const patterns = [
    /\bif\b/g, /\belse\b/g, /\bfor\b/g, /\bwhile\b/g,
    /\bfunction\b/g, /\bdef\b/g, /\breturn\b/g,
    /\bclass\b/g, /\btry\b/g, /\bcatch\b/g
  ];

  const getStructure = (code) => {
    return patterns.map(p => (code.match(p) || []).length);
  };

  const struct1 = getStructure(code1);
  const struct2 = getStructure(code2);

  // Cosine similarity of structure vectors
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < struct1.length; i++) {
    dotProduct += struct1[i] * struct2[i];
    norm1 += struct1[i] * struct1[i];
    norm2 += struct2[i] * struct2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 && norm2 === 0) return 1;
  if (norm1 === 0 || norm2 === 0) return 0;

  return dotProduct / (norm1 * norm2);
}

/**
 * Calculate overall similarity between two code submissions
 * @param {string} code1 - First code submission
 * @param {string} code2 - Second code submission
 * @returns {Object} Similarity scores and overall score
 */
export function calculateSimilarity(code1, code2) {
  if (!code1 || !code2) {
    return {
      overall: 0,
      tokenSimilarity: 0,
      fingerprintSimilarity: 0,
      structuralSimilarity: 0,
      exactMatch: false
    };
  }

  // Check for exact match
  const normalized1 = code1.replace(/\s+/g, '').toLowerCase();
  const normalized2 = code2.replace(/\s+/g, '').toLowerCase();

  if (normalized1 === normalized2) {
    return {
      overall: 100,
      tokenSimilarity: 100,
      fingerprintSimilarity: 100,
      structuralSimilarity: 100,
      exactMatch: true
    };
  }

  const tokens1 = tokenize(code1);
  const tokens2 = tokenize(code2);

  const tokenSim = jaccardSimilarity(tokens1, tokens2);
  const fpSim = fingerprintSimilarity(code1, code2);
  const structSim = structuralSimilarity(code1, code2);

  // Weighted average
  const overall = (tokenSim * 0.4 + fpSim * 0.4 + structSim * 0.2) * 100;

  return {
    overall: Math.round(overall),
    tokenSimilarity: Math.round(tokenSim * 100),
    fingerprintSimilarity: Math.round(fpSim * 100),
    structuralSimilarity: Math.round(structSim * 100),
    exactMatch: false
  };
}

/**
 * Check plagiarism for a submission against all other submissions in the same activity
 * @param {Object} submission - The submission to check
 * @param {Array} otherSubmissions - Other submissions to compare against
 * @param {number} threshold - Similarity threshold to flag as potential plagiarism (0-100)
 * @returns {Array} Array of potential matches with similarity scores
 */
export function checkPlagiarism(submission, otherSubmissions, threshold = 70) {
  const matches = [];

  for (const other of otherSubmissions) {
    // Skip if same student
    if (submission.studentId?.toString() === other.studentId?.toString()) {
      continue;
    }

    // Skip if same submission
    if (submission._id?.toString() === other._id?.toString()) {
      continue;
    }

    const similarity = calculateSimilarity(submission.code, other.code);

    if (similarity.overall >= threshold) {
      matches.push({
        submissionId: other._id,
        studentId: other.studentId,
        studentName: other.studentName,
        similarity: similarity.overall,
        details: similarity,
        submittedAt: other.createdAt
      });
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  return matches;
}

/**
 * Generate a plagiarism report for all submissions in an activity
 * @param {Array} submissions - All submissions for an activity
 * @param {number} threshold - Similarity threshold
 * @returns {Object} Plagiarism report with clusters of similar submissions
 */
export function generatePlagiarismReport(submissions, threshold = 70) {
  const report = {
    totalSubmissions: submissions.length,
    flaggedPairs: [],
    clusters: [],
    summary: {
      totalFlagged: 0,
      averageSimilarity: 0,
      maxSimilarity: 0
    }
  };

  if (submissions.length < 2) {
    return report;
  }

  // Compare all pairs
  const checked = new Set();

  for (let i = 0; i < submissions.length; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const sub1 = submissions[i];
      const sub2 = submissions[j];

      // Skip if same student
      if (sub1.studentId?.toString() === sub2.studentId?.toString()) {
        continue;
      }

      const pairKey = [sub1._id, sub2._id].sort().join('-');
      if (checked.has(pairKey)) continue;
      checked.add(pairKey);

      const similarity = calculateSimilarity(sub1.code, sub2.code);

      if (similarity.overall >= threshold) {
        report.flaggedPairs.push({
          submission1: {
            id: sub1._id,
            studentId: sub1.studentId,
            studentName: sub1.studentName,
            submittedAt: sub1.createdAt
          },
          submission2: {
            id: sub2._id,
            studentId: sub2.studentId,
            studentName: sub2.studentName,
            submittedAt: sub2.createdAt
          },
          similarity: similarity.overall,
          details: similarity
        });
      }
    }
  }

  // Calculate summary
  if (report.flaggedPairs.length > 0) {
    const similarities = report.flaggedPairs.map(p => p.similarity);
    report.summary.totalFlagged = report.flaggedPairs.length;
    report.summary.averageSimilarity = Math.round(
      similarities.reduce((a, b) => a + b, 0) / similarities.length
    );
    report.summary.maxSimilarity = Math.max(...similarities);
  }

  // Sort by similarity
  report.flaggedPairs.sort((a, b) => b.similarity - a.similarity);

  return report;
}

export default {
  calculateSimilarity,
  checkPlagiarism,
  generatePlagiarismReport
};
