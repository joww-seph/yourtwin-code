import axios from 'axios';

const JUDGE0_URL = process.env.JUDGE0_API_URL || 'http://192.168.78.130:2358';

// Language IDs for Judge0
export const LANGUAGE_IDS = {
  cpp: 54,      // C++ (GCC 9.2.0)
  java: 62,     // Java (OpenJDK 13.0.1)
  python: 71    // Python (3.8.1)
};

// Submit code for execution
export const executeCode = async (code, languageId, stdin = '') => {
  try {
    // Create submission
    const submissionResponse = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
      source_code: code,
      language_id: languageId,
      stdin: stdin,
      cpu_time_limit: 2,
      memory_limit: 128000
    });

    return {
      success: true,
      data: submissionResponse.data
    };
  } catch (error) {
    console.error('Judge0 execution error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Code execution failed'
    };
  }
};

// Get submission result
export const getSubmissionResult = async (token) => {
  try {
    const response = await axios.get(`${JUDGE0_URL}/submissions/${token}?base64_encoded=false`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Judge0 get result error:', error);
    return {
      success: false,
      message: 'Failed to get execution result'
    };
  }
};

// Run code against multiple test cases
export const runTestCases = async (code, languageId, testCases) => {
  const results = [];

  for (const testCase of testCases) {
    const result = await executeCode(code, languageId, testCase.input);
    
    if (result.success) {
      const output = result.data.stdout?.trim() || '';
      const expectedOutput = testCase.expectedOutput.trim();

      // SANITIZE executionTime
      let execTimeRaw = result.data.time || "0";
      let execTimeClean = parseFloat(execTimeRaw.match(/\d+(\.\d+)?/)?.[0] || 0);

      results.push({
        testCaseId: testCase._id,
        passed: output === expectedOutput,
        actualOutput: output,
        expectedOutput: expectedOutput,
        executionTime: execTimeClean,   // sanitized number
        memory: result.data.memory,
        status: result.data.status.description,
        stderr: result.data.stderr,
        compileOutput: result.data.compile_output
      });
    } else {
      results.push({
        testCaseId: testCase._id,
        passed: false,
        error: result.message
      });
    }
  }

  return results;
};