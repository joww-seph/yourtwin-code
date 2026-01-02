/**
 * Intelligent Code Analyzer
 * Detects suspicious coding patterns like hardcoded outputs,
 * lack of proper logic structures, etc.
 */

// Language-specific print statement patterns
const PRINT_PATTERNS = {
  cpp: [
    /cout\s*<<\s*["']([^"']+)["']/g,
    /printf\s*\(\s*["']([^"']+)["']\s*\)/g,
    /puts\s*\(\s*["']([^"']+)["']\s*\)/g
  ],
  c: [
    /printf\s*\(\s*["']([^"']+)["']\s*\)/g,
    /puts\s*\(\s*["']([^"']+)["']\s*\)/g
  ],
  java: [
    /System\.out\.println?\s*\(\s*["']([^"']+)["']\s*\)/g,
    /System\.out\.print\s*\(\s*["']([^"']+)["']\s*\)/g
  ],
  python: [
    /print\s*\(\s*["']([^"']+)["']\s*\)/g,
    /print\s*\(\s*f?["']([^"']+)["']\s*\)/g,
    /print\s+["']([^"']+)["']/g
  ]
};

// Logic structure patterns (loops, conditionals, functions)
const LOGIC_PATTERNS = {
  cpp: {
    loops: [/\bfor\s*\(/, /\bwhile\s*\(/, /\bdo\s*\{/],
    conditionals: [/\bif\s*\(/, /\bswitch\s*\(/],
    functions: [/\b\w+\s+\w+\s*\([^)]*\)\s*\{/],
    inputUsage: [/\bcin\s*>>/, /\bscanf\s*\(/, /\bgetline\s*\(/]
  },
  c: {
    loops: [/\bfor\s*\(/, /\bwhile\s*\(/, /\bdo\s*\{/],
    conditionals: [/\bif\s*\(/, /\bswitch\s*\(/],
    functions: [/\b\w+\s+\w+\s*\([^)]*\)\s*\{/],
    inputUsage: [/\bscanf\s*\(/, /\bgets\s*\(/, /\bfgets\s*\(/]
  },
  java: {
    loops: [/\bfor\s*\(/, /\bwhile\s*\(/, /\bdo\s*\{/],
    conditionals: [/\bif\s*\(/, /\bswitch\s*\(/],
    functions: [/\b(public|private|protected)?\s*\w+\s+\w+\s*\([^)]*\)\s*\{/],
    inputUsage: [/Scanner/, /BufferedReader/, /\.nextInt\(/, /\.nextLine\(/]
  },
  python: {
    loops: [/\bfor\s+\w+\s+in\b/, /\bwhile\s+/],
    conditionals: [/\bif\s+/, /\belif\s+/],
    functions: [/\bdef\s+\w+\s*\(/],
    inputUsage: [/\binput\s*\(/, /sys\.stdin/]
  }
};

/**
 * Extract hardcoded string literals from print statements
 */
function extractPrintedStrings(code, language) {
  const patterns = PRINT_PATTERNS[language] || PRINT_PATTERNS.cpp;
  const printedStrings = [];

  for (const pattern of patterns) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      if (match[1]) {
        printedStrings.push(match[1].trim());
      }
    }
  }

  return printedStrings;
}

/**
 * Check if code contains expected logic structures
 */
function analyzeLogicStructures(code, language) {
  const patterns = LOGIC_PATTERNS[language] || LOGIC_PATTERNS.cpp;

  return {
    hasLoops: patterns.loops.some(p => p.test(code)),
    hasConditionals: patterns.conditionals.some(p => p.test(code)),
    hasFunctions: patterns.functions.some(p => p.test(code)),
    usesInput: patterns.inputUsage.some(p => p.test(code))
  };
}

/**
 * Normalize string for comparison (remove whitespace, newlines)
 */
function normalizeString(str) {
  return str.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Detect if-based workarounds like "if (n == 5)" that check specific input values
 */
function detectInputValueChecks(code, language, testCases) {
  const workarounds = [];

  // Patterns for checking specific input values
  const inputCheckPatterns = [
    // if (n == 5), if (n==5), if(n == 5)
    /if\s*\(\s*\w+\s*==\s*(\d+|"[^"]+"|'[^']+')\s*\)/gi,
    // if (n == "hello"), case 5:
    /case\s+(\d+|"[^"]+"|'[^']+')\s*:/gi,
    // if (input == "test")
    /if\s*\(\s*\w+\s*==\s*(\d+|"[^"]+"|'[^']+')\s*\)/gi,
    // n == 5 ? output : other
    /\w+\s*==\s*(\d+|"[^"]+"|'[^']+')\s*\?/gi
  ];

  // Extract all input values from test cases
  const testInputValues = testCases.map(tc => {
    const input = (tc.input || '').trim();
    // Extract numbers and strings from input
    const numbers = input.match(/\d+/g) || [];
    return numbers;
  }).flat();

  for (const pattern of inputCheckPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const checkedValue = match[1]?.replace(/["']/g, '');
      // Check if this value matches any test case input
      if (testInputValues.includes(checkedValue)) {
        workarounds.push({
          pattern: match[0],
          checkedValue,
          type: 'input_value_check',
          description: `Code checks for specific input value: ${checkedValue}`
        });
      }
    }
  }

  // Also detect if statements that directly output (workaround pattern)
  const ifStatements = code.match(/if\s*\([^)]+\)\s*(cout|printf|print|System\.out)/gi) || [];
  if (ifStatements.length >= 2) {
    workarounds.push({
      pattern: `${ifStatements.length} conditional print statements`,
      type: 'multiple_conditional_outputs',
      description: `Found ${ifStatements.length} if-statements that directly print output - likely hardcoded workaround`
    });
  } else if (ifStatements.length === 1) {
    // Even single if-to-output is suspicious for most programming problems
    workarounds.push({
      pattern: ifStatements[0],
      type: 'single_conditional_output',
      description: 'Found if-statement that directly prints output - possible workaround'
    });
  }

  return workarounds;
}

/**
 * Check if printed strings match expected outputs (hardcoded detection)
 */
function detectHardcodedOutput(code, language, testCases) {
  const printedStrings = extractPrintedStrings(code, language);
  const suspiciousMatches = [];

  for (const testCase of testCases) {
    const expectedOutput = normalizeString(testCase.expectedOutput || '');

    for (const printed of printedStrings) {
      const normalizedPrinted = normalizeString(printed);

      // Check for exact or partial match
      if (expectedOutput.includes(normalizedPrinted) ||
          normalizedPrinted.includes(expectedOutput)) {
        // Check if this is a significant match (not just a single char/number)
        if (normalizedPrinted.length > 2) {
          suspiciousMatches.push({
            printed: printed,
            expected: testCase.expectedOutput,
            matchType: expectedOutput === normalizedPrinted ? 'exact' : 'partial'
          });
        }
      }
    }
  }

  return suspiciousMatches;
}

/**
 * Analyze code complexity (line count, character count, etc.)
 */
function analyzeComplexity(code) {
  const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
  const nonEmptyLines = lines.length;
  const totalChars = code.replace(/\s/g, '').length;

  return {
    lineCount: nonEmptyLines,
    charCount: totalChars,
    avgLineLength: nonEmptyLines > 0 ? Math.round(totalChars / nonEmptyLines) : 0
  };
}

/**
 * Main analysis function - returns suspicious patterns and flags
 */
export function analyzeCode(code, language, testCases = [], activityType = 'practice') {
  const flags = [];
  const analysis = {
    logicStructures: analyzeLogicStructures(code, language),
    complexity: analyzeComplexity(code),
    hardcodedMatches: detectHardcodedOutput(code, language, testCases),
    inputValueChecks: detectInputValueChecks(code, language, testCases),
    suspicionScore: 0
  };

  // Flag 0: Input value checking workarounds (HIGHEST PRIORITY)
  // This catches "if (n == 5) cout << output" patterns
  if (analysis.inputValueChecks.length > 0) {
    const multipleConditional = analysis.inputValueChecks.find(w => w.type === 'multiple_conditional_outputs');
    const singleConditional = analysis.inputValueChecks.find(w => w.type === 'single_conditional_output');
    const inputChecks = analysis.inputValueChecks.filter(w => w.type === 'input_value_check');

    if (multipleConditional) {
      flags.push({
        type: 'conditional_output_workaround',
        severity: 'critical',
        description: multipleConditional.description,
        details: analysis.inputValueChecks
      });
      analysis.suspicionScore += 60; // Very high - this is almost certainly cheating
    } else if (singleConditional) {
      flags.push({
        type: 'single_conditional_output',
        severity: 'high',
        description: singleConditional.description,
        details: analysis.inputValueChecks
      });
      analysis.suspicionScore += 40; // High - single if-to-output is still very suspicious
    }

    if (inputChecks.length > 0) {
      flags.push({
        type: 'input_value_check',
        severity: 'critical',
        description: `Code checks for ${inputChecks.length} specific test input value(s) - likely hardcoded workaround`,
        details: inputChecks
      });
      analysis.suspicionScore += 50;
    }
  }

  // Flag 1: Hardcoded output detection
  if (analysis.hardcodedMatches.length > 0) {
    const exactMatches = analysis.hardcodedMatches.filter(m => m.matchType === 'exact');
    if (exactMatches.length > 0) {
      flags.push({
        type: 'hardcoded_output',
        severity: 'high',
        description: `Detected ${exactMatches.length} hardcoded output(s) matching expected results`,
        details: exactMatches
      });
      analysis.suspicionScore += 40;
    } else if (analysis.hardcodedMatches.length > 0) {
      flags.push({
        type: 'suspicious_literals',
        severity: 'medium',
        description: `Found ${analysis.hardcodedMatches.length} string literal(s) similar to expected output`,
        details: analysis.hardcodedMatches
      });
      analysis.suspicionScore += 20;
    }
  }

  // Flag 2: No input usage when test cases have input
  const hasInputTestCases = testCases.some(tc => tc.input && tc.input.trim());
  if (hasInputTestCases && !analysis.logicStructures.usesInput) {
    flags.push({
      type: 'no_input_usage',
      severity: 'high',
      description: 'Code does not appear to read input, but test cases provide input',
      details: null
    });
    analysis.suspicionScore += 30;
  }

  // Flag 3: No loops for iterative problems
  // Check if the expected output suggests iteration (multiple lines, arrays, etc.)
  const suggestsIteration = testCases.some(tc => {
    const output = tc.expectedOutput || '';
    return output.split('\n').length > 3 || /\d+\s+\d+\s+\d+/.test(output);
  });
  if (suggestsIteration && !analysis.logicStructures.hasLoops) {
    flags.push({
      type: 'missing_iteration',
      severity: 'medium',
      description: 'Problem appears to require iteration, but no loops detected',
      details: null
    });
    analysis.suspicionScore += 15;
  }

  // Flag 4: Suspiciously short code for complex problems
  if (testCases.length > 2 && analysis.complexity.lineCount < 5) {
    flags.push({
      type: 'too_short',
      severity: 'low',
      description: 'Code is very short for a problem with multiple test cases',
      details: { lineCount: analysis.complexity.lineCount }
    });
    analysis.suspicionScore += 10;
  }

  // Flag 5: Multiple print statements matching multiple outputs
  if (analysis.hardcodedMatches.length >= testCases.length && testCases.length > 1) {
    flags.push({
      type: 'all_outputs_hardcoded',
      severity: 'high',
      description: 'All expected outputs appear to be hardcoded',
      details: null
    });
    analysis.suspicionScore += 50;
  }

  return {
    flags,
    analysis,
    isSuspicious: analysis.suspicionScore >= 30,
    suspicionScore: Math.min(analysis.suspicionScore, 100)
  };
}

/**
 * Quick check if code looks suspicious (for real-time feedback)
 */
export function quickSuspicionCheck(code, language) {
  const structure = analyzeLogicStructures(code, language);
  const complexity = analyzeComplexity(code);

  // Very basic checks
  const warnings = [];

  if (complexity.lineCount < 3 && complexity.charCount > 50) {
    warnings.push('Code is very compact - ensure it follows best practices');
  }

  if (!structure.hasLoops && !structure.hasConditionals && complexity.lineCount > 3) {
    warnings.push('Consider using control structures for better code organization');
  }

  return warnings;
}

export default { analyzeCode, quickSuspicionCheck };
