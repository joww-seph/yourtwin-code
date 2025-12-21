import mongoose from 'mongoose';

/**
 * TestResult Model (BCNF with Conscious Denormalization)
 *
 * DENORMALIZED FIELDS:
 * - expectedOutput: Snapshot from test_cases.expectedOutput
 *   Justification: Preserves historical record if test case is modified
 *   This is an immutable record - never updated after creation
 */
const testResultSchema = new mongoose.Schema({
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  testCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestCase',
    required: true
  },
  // DENORMALIZED: Snapshot from test case at submission time
  // This preserves history even if test case is later modified
  input: {
    type: String,
    default: ''
  },
  expectedOutput: {
    type: String,
    required: true
  },
  actualOutput: {
    type: String,
    default: ''
  },
  passed: {
    type: Boolean,
    required: true
  },
  executionTime: {
    type: Number, // in milliseconds
    default: 0
  },
  memoryUsed: {
    type: Number, // in KB
    default: 0
  },
  errorMessage: {
    type: String
  },
  stderr: {
    type: String
  },
  compileOutput: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'passed', 'failed', 'error', 'timeout'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes
testResultSchema.index({ submissionId: 1 });
testResultSchema.index({ testCaseId: 1 });
testResultSchema.index({ submissionId: 1, passed: 1 });

// Pre-save hook to snapshot test case data
testResultSchema.pre('save', async function(next) {
  if (this.isNew && !this.expectedOutput) {
    const TestCase = mongoose.model('TestCase');
    const testCase = await TestCase.findById(this.testCaseId);

    if (testCase) {
      this.input = testCase.input;
      this.expectedOutput = testCase.expectedOutput;
    }
  }

  next();
});

// Static method to create test results for a submission
testResultSchema.statics.createForSubmission = async function(submissionId, testCaseResults) {
  const results = testCaseResults.map(result => ({
    submissionId,
    testCaseId: result.testCaseId,
    input: result.input,
    expectedOutput: result.expectedOutput,
    actualOutput: result.actualOutput,
    passed: result.passed,
    executionTime: result.executionTime,
    memoryUsed: result.memoryUsed,
    errorMessage: result.errorMessage,
    stderr: result.stderr,
    compileOutput: result.compileOutput,
    status: result.passed ? 'passed' : (result.errorMessage ? 'error' : 'failed')
  }));

  return await this.insertMany(results);
};

// Static method to get all test results for a submission
testResultSchema.statics.getBySubmission = function(submissionId) {
  return this.find({ submissionId }).sort({ createdAt: 1 });
};

// Static method to calculate score from test results
testResultSchema.statics.calculateScore = async function(submissionId) {
  const TestCase = mongoose.model('TestCase');
  const results = await this.find({ submissionId });

  if (results.length === 0) return 0;

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const result of results) {
    const testCase = await TestCase.findById(result.testCaseId);
    const weight = testCase ? testCase.weight : 1;
    totalWeight += weight;
    if (result.passed) {
      earnedWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
};

const TestResult = mongoose.model('TestResult', testResultSchema);

export default TestResult;
