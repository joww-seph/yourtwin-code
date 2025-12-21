import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

function TestExecutionViewer({ testLog = [], compileError, runtimeError, isRunning = false }) {
  const [expandedTests, setExpandedTests] = useState({});
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    if (expandAll) {
      const newExpanded = {};
      testLog.forEach((_, index) => {
        newExpanded[index] = true;
      });
      setExpandedTests(newExpanded);
    } else {
      setExpandedTests({});
    }
  }, [expandAll, testLog.length]);

  const toggleTest = (index) => {
    setExpandedTests(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getTestStatus = (test) => {
    if (test.step === 'PASSED') return 'passed';
    if (test.step === 'FAILED') return 'failed';
    return 'pending';
  };

  const passedCount = testLog.filter(t => t.step === 'PASSED').length;
  const failedCount = testLog.filter(t => t.step === 'FAILED').length;
  const totalTests = testLog.length;

  // Calculate pass rate
  const passRate = totalTests > 0 ? Math.round((passedCount / totalTests) * 100) : 0;

  return (
    <div className="w-full space-y-4">
      {/* Compile Error Alert */}
      {compileError && (
        <div className="bg-[#f38ba8] bg-opacity-20 border border-[#f38ba8] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#f38ba8] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-[#f38ba8] mb-2">Compilation Error</h4>
              <pre className="bg-[#1e1e2e] rounded p-3 text-[#a6e3a1] text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono">
                {compileError}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Runtime Error Alert */}
      {runtimeError && (
        <div className="bg-[#f9e2af] bg-opacity-20 border border-[#f9e2af] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#f9e2af] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-[#f9e2af] mb-2">Runtime Error</h4>
              <pre className="bg-[#1e1e2e] rounded p-3 text-[#a6e3a1] text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono">
                {runtimeError}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Test Execution Summary */}
      {testLog.length > 0 && (
        <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-[#cdd6f4] mb-1">Test Execution Results</h4>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[#bac2de]">
                  {passedCount} <span className="text-[#a6e3a1]">Passed</span>
                </span>
                <span className="text-[#bac2de]">
                  {failedCount} <span className="text-[#f38ba8]">Failed</span>
                </span>
                <span className="text-[#bac2de]">
                  {totalTests - passedCount - failedCount} <span className="text-[#f9e2af]">Pending</span>
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-32">
              <div className="bg-[#45475a] rounded-full h-2 overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-[#a6e3a1] to-[#94d982] h-full transition-all duration-500"
                  style={{ width: `${passRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-[#bac2de] text-center">{passRate}% Pass Rate</p>
            </div>
          </div>

          {/* Loading State */}
          {isRunning && (
            <div className="flex items-center gap-2 text-[#f9e2af]">
              <div className="w-2 h-2 bg-[#f9e2af] rounded-full animate-pulse"></div>
              <span className="text-sm">Running tests...</span>
            </div>
          )}
        </div>
      )}

      {/* Tests List */}
      {testLog.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-[#cdd6f4]">Test Cases</h4>
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="text-xs px-2 py-1 bg-[#45475a] hover:bg-[#585b70] text-[#bac2de] rounded transition"
            >
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
          </div>

          {testLog.map((test, index) => {
            const status = getTestStatus(test);
            const isExpanded = expandedTests[index];

            return (
              <div key={index} className="border border-[#45475a] rounded-lg overflow-hidden">
                {/* Test Header */}
                <button
                  onClick={() => toggleTest(index)}
                  className="w-full bg-[#313244] hover:bg-[#45475a] p-4 flex items-center justify-between transition text-left"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {status === 'passed' && (
                      <CheckCircle className="w-5 h-5 text-[#a6e3a1] flex-shrink-0" />
                    )}
                    {status === 'failed' && (
                      <XCircle className="w-5 h-5 text-[#f38ba8] flex-shrink-0" />
                    )}
                    {status === 'pending' && (
                      <Clock className="w-5 h-5 text-[#f9e2af] flex-shrink-0 animate-spin" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#cdd6f4]">
                        Test Case {test.testCase || index + 1}
                      </p>
                      <p className={`text-sm ${
                        status === 'passed'
                          ? 'text-[#a6e3a1]'
                          : status === 'failed'
                          ? 'text-[#f38ba8]'
                          : 'text-[#f9e2af]'
                      }`}>
                        {status === 'passed' && 'PASSED'}
                        {status === 'failed' && 'FAILED'}
                        {status === 'pending' && 'RUNNING'}
                      </p>
                    </div>

                    {test.timestamp && (
                      <p className="text-xs text-[#6c7086] flex-shrink-0">
                        {new Date(test.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#bac2de]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#bac2de]" />
                  )}
                </button>

                {/* Test Details */}
                {isExpanded && (
                  <div className="bg-[#1e1e2e] border-t border-[#45475a] p-4 space-y-3">
                    {test.input && (
                      <div>
                        <p className="text-xs text-[#6c7086] mb-1">Input</p>
                        <pre className="bg-[#313244] rounded p-3 text-[#89b4fa] text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono border border-[#45475a]">
                          {test.input}
                        </pre>
                      </div>
                    )}

                    {status === 'failed' && test.expected && (
                      <div className="bg-[#f38ba8] bg-opacity-10 border border-[#f38ba8] border-opacity-50 rounded p-3">
                        <p className="text-xs text-[#f38ba8] font-medium mb-2">Output Mismatch</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-[#6c7086] mb-1">Your Output</p>
                            <pre className="bg-[#313244] rounded p-2 text-[#f38ba8] whitespace-pre-wrap break-words font-mono">
                              {test.output || '(empty)'}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[#6c7086] mb-1">Expected Output</p>
                            <pre className="bg-[#313244] rounded p-2 text-[#a6e3a1] whitespace-pre-wrap break-words font-mono">
                              {test.expected}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {status === 'passed' && (
                      <div className="bg-[#a6e3a1] bg-opacity-10 border border-[#a6e3a1] border-opacity-50 rounded p-3">
                        <p className="text-xs text-[#a6e3a1] font-medium mb-2">Test Passed</p>
                        <div>
                          <p className="text-[#6c7086] mb-1 text-xs">Output</p>
                          <pre className="bg-[#313244] rounded p-2 text-[#a6e3a1] text-xs whitespace-pre-wrap break-words font-mono">
                            {test.output}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {testLog.length === 0 && !compileError && !runtimeError && (
        <div className="bg-[#313244] border border-[#45475a] rounded-lg p-8 text-center">
          <p className="text-[#6c7086] text-sm">
            No test results yet. Submit code to see test execution results.
          </p>
        </div>
      )}
    </div>
  );
}

export default TestExecutionViewer;
