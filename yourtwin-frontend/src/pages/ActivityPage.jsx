import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { activityAPI } from '../services/api';
import axios from 'axios';
import CodeEditor from '../components/CodeEditor';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Terminal,
  FileText
} from 'lucide-react';

function ActivityPage() {
  const { activityId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('problem');

  useEffect(() => {
    fetchActivity();
  }, [activityId]);

  const fetchActivity = async () => {
    try {
      const response = await activityAPI.getOne(activityId);
      setActivity(response.data.data);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCode = async (code) => {
    setIsRunning(true);
    setResults(null);
    setActiveTab('results');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/submissions',
        {
          activityId: activity._id,
          code: code,
          language: activity.language
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setResults(response.data.data);
    } catch (error) {
      console.error('Submission error:', error);
      setResults({
        error: true,
        message: error.response?.data?.message || 'Submission failed'
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#f38ba8] mb-4">Activity Not Found</h2>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="text-[#89b4fa] hover:text-[#a6e3a1] transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e2e] flex flex-col">
      {/* Header */}
      <header className="bg-[#313244] border-b border-[#45475a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="p-2 hover:bg-[#45475a] rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-[#bac2de]" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#cdd6f4]">{activity.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-[#bac2de]">{activity.topic}</span>
                <span className="text-sm text-[#bac2de]">•</span>
                <span className="text-sm text-[#bac2de]">{activity.difficulty}</span>
                <span className="text-sm text-[#bac2de]">•</span>
                <span className={`text-sm px-2 py-0.5 rounded ${
                  activity.type === 'practice'
                    ? 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]'
                    : 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
                }`}>
                  {activity.type}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#bac2de]">{user?.name}</p>
            <p className="text-xs text-[#6c7086]">
              {user?.course} {user?.yearLevel}-{user?.section}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 border-r border-[#45475a] flex flex-col">
          {/* Tabs */}
          <div className="bg-[#313244] border-b border-[#45475a] flex">
            <button
              onClick={() => setActiveTab('problem')}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === 'problem'
                  ? 'text-[#89b4fa] border-b-2 border-[#89b4fa]'
                  : 'text-[#bac2de] hover:text-[#cdd6f4]'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Problem
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === 'results'
                  ? 'text-[#89b4fa] border-b-2 border-[#89b4fa]'
                  : 'text-[#bac2de] hover:text-[#cdd6f4]'
              }`}
            >
              <Terminal className="w-4 h-4 inline mr-2" />
              Results
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'problem' ? (
              <ProblemTab activity={activity} />
            ) : (
              <ResultsTab results={results} isRunning={isRunning} />
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col">
          <CodeEditor
            initialCode={activity.starterCode}
            language={activity.language}
            onRun={handleRunCode}
            isRunning={isRunning}
          />
        </div>
      </div>
    </div>
  );
}

// Problem Tab Component
function ProblemTab({ activity }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <h2 className="text-lg font-bold text-[#cdd6f4] mb-3">Description</h2>
        <p className="text-[#bac2de] whitespace-pre-wrap">{activity.description}</p>
      </div>

      {/* Test Cases */}
      <div>
        <h2 className="text-lg font-bold text-[#cdd6f4] mb-3">Test Cases</h2>
        <div className="space-y-3">
          {activity.testCases
            .filter(tc => !tc.isHidden)
            .map((testCase, index) => (
              <div
                key={index}
                className="bg-[#313244] border border-[#45475a] rounded-lg p-4"
              >
                <p className="text-sm font-medium text-[#89b4fa] mb-2">
                  Test Case {index + 1}
                </p>
                {testCase.input && (
                  <div className="mb-2">
                    <p className="text-xs text-[#6c7086] mb-1">Input:</p>
                    <pre className="text-sm text-[#cdd6f4] bg-[#1e1e2e] p-2 rounded">
                      {testCase.input}
                    </pre>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[#6c7086] mb-1">Expected Output:</p>
                  <pre className="text-sm text-[#cdd6f4] bg-[#1e1e2e] p-2 rounded">
                    {testCase.expectedOutput}
                  </pre>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Time Limit */}
      <div className="flex items-center gap-2 text-sm text-[#bac2de]">
        <Clock className="w-4 h-4" />
        <span>Time Limit: {activity.timeLimit} minutes</span>
      </div>
    </div>
  );
}

// Results Tab Component
function ResultsTab({ results, isRunning }) {
  if (isRunning) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b4fa] mx-auto mb-4"></div>
          <p className="text-[#bac2de]">Running your code...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#6c7086]">Run your code to see results here</p>
      </div>
    );
  }

  if (results.error) {
    return (
      <div className="bg-[#f38ba8] bg-opacity-10 border border-[#f38ba8] border-opacity-30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-[#f38ba8] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[#f38ba8] mb-2">Error</p>
            <p className="text-sm text-[#f38ba8]">{results.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const passedCount = results.testResults.filter(r => r.passed).length;
  const totalCount = results.testResults.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`rounded-lg p-4 border ${
        results.status === 'passed'
          ? 'bg-[#a6e3a1] bg-opacity-10 border-[#a6e3a1] border-opacity-30'
          : 'bg-[#f38ba8] bg-opacity-10 border-[#f38ba8] border-opacity-30'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          {results.status === 'passed' ? (
            <CheckCircle className="w-6 h-6 text-[#a6e3a1]" />
          ) : (
            <XCircle className="w-6 h-6 text-[#f38ba8]" />
          )}
          <div>
            <p className={`font-bold ${
              results.status === 'passed' ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'
            }`}>
              {results.status === 'passed' ? 'All Tests Passed!' : 'Some Tests Failed'}
            </p>
            <p className="text-sm text-[#bac2de]">
              {passedCount}/{totalCount} test cases passed • Score: {results.score}%
            </p>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="space-y-3">
        {results.testResults.map((result, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${
              result.passed
                ? 'bg-[#a6e3a1] bg-opacity-5 border-[#a6e3a1] border-opacity-20'
                : 'bg-[#f38ba8] bg-opacity-5 border-[#f38ba8] border-opacity-20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#cdd6f4]">
                Test Case {index + 1}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                result.passed
                  ? 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]'
                  : 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
              }`}>
                {result.passed ? 'Passed' : 'Failed'}
              </span>
            </div>

            {!result.passed && (
              <>
                <div className="mb-2">
                  <p className="text-xs text-[#6c7086] mb-1">Expected:</p>
                  <pre className="text-xs text-[#cdd6f4] bg-[#1e1e2e] p-2 rounded">
                    {result.expectedOutput}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-[#6c7086] mb-1">Your Output:</p>
                  <pre className="text-xs text-[#f38ba8] bg-[#1e1e2e] p-2 rounded">
                    {result.actualOutput || '(no output)'}
                  </pre>
                </div>
              </>
            )}

            {result.executionTime && (
              <p className="text-xs text-[#6c7086] mt-2">
                Execution time: {result.executionTime}s
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityPage;