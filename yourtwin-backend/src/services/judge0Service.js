import axios from 'axios';

const JUDGE0_URL = process.env.JUDGE0_API_URL || 'http://192.168.78.130:2358';

// Language IDs for Judge0
export const LANGUAGE_IDS = {
  cpp: 54,
  java: 62,
  python: 71
};

// Submit code for execution
export const executeCode = async (code, languageId, stdin = '') => {
  try {
    const submissionResponse = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      {
        source_code: code,
        language_id: languageId,
        stdin,
        cpu_time_limit: 2,
        memory_limit: 128000
      }
    );

    return {
      success: true,
      data: submissionResponse.data
    };
  } catch (error) {
    console.error('Judge0 execution error:', error?.response?.data || error);
    return {
      success: false,
      message: error.response?.data?.message || 'Code execution failed'
    };
  }
};

// Run code against multiple test cases
export const runTestCases = async (code, languageId, testCases) => {
  if (!Array.isArray(testCases) || testCases.length === 0) {
    throw new Error('No test cases provided');
  }

  const results = [];

  for (const testCase of testCases) {
    const result = await executeCode(code, languageId, testCase.input);

    if (result.success && result.data) {
      const data = result.data;

      const output = data?.stdout?.trim() || '';
      const expectedOutput = testCase.expectedOutput?.trim() || '';

      // SANITIZE executionTime
      const execTimeRaw = data?.time || '0';
      const execTimeClean = parseFloat(
        execTimeRaw.toString().match(/\d+(\.\d+)?/)?.[0] || 0
      );

      results.push({
        testCaseId: testCase._id,
        passed: output === expectedOutput && data?.status?.id === 3, // 3 = Accepted
        actualOutput: output,
        expectedOutput,
        executionTime: execTimeClean,
        memory: data?.memory || 0,

        // ✅ SAFE ACCESS (THIS FIXES YOUR CRASH)
        status: data?.status?.description || 'No status returned',

        stderr: data?.stderr || '',
        compileOutput: data?.compile_output || ''
      });
    } else {
      results.push({
        testCaseId: testCase?._id,
        passed: false,
        status: 'Execution failed',
        error: result.message || 'Unknown execution error',
        executionTime: 0,
        memory: 0
      });
    }
  }

  return results;
};
