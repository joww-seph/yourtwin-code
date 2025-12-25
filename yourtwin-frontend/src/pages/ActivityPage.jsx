import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { activityAPI, submissionAPI } from '../services/api';
import CodeEditor from '../components/CodeEditor';
import TestExecutionViewer from '../components/TestExecutionViewer';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Terminal,
  FileText
} from 'lucide-react';
import SubmissionHistory from '../components/SubmissionHistory';

// Shadow Twin imports
import { ShadowTwinProvider, useShadowTwin } from '../contexts/ShadowTwinContext';
import ShadowTwinButton from '../components/ShadowTwinButton';
import HintPanel from '../components/HintPanel';

// Main wrapper component - fetches activity data
function ActivityPage() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [labSessionId, setLabSessionId] = useState(null);

  useEffect(() => {
    fetchActivity();
  }, [activityId]);

  const fetchActivity = async () => {
    try {
      const response = await activityAPI.getOne(activityId);
      setActivity(response.data.data);
      if (response.data.data.labSession) {
        const sessionId = typeof response.data.data.labSession === 'object'
          ? response.data.data.labSession._id
          : response.data.data.labSession;
        setLabSessionId(sessionId);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
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
            onClick={() => navigate(labSessionId ? `/student/session/${labSessionId}` : '/student/dashboard')}
            className="text-[#89b4fa] hover:text-[#a6e3a1] transition"
          >
            Return to {labSessionId ? 'Session' : 'Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  if (activity.isActive === false) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#f9e2af] mb-4">Activity Not Available</h2>
          <p className="text-[#bac2de] mb-6">This activity has been deactivated by the instructor.</p>
          <button
            onClick={() => navigate(labSessionId ? `/student/session/${labSessionId}` : '/student/dashboard')}
            className="px-6 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] font-medium rounded-lg transition"
          >
            Return to {labSessionId ? 'Session' : 'Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  // Wrap with ShadowTwinProvider
  return (
    <ShadowTwinProvider
      activityId={activityId}
      aiAssistanceLevel={activity.aiAssistanceLevel ?? 5}
    >
      <ActivityPageContent activity={activity} labSessionId={labSessionId} />
    </ShadowTwinProvider>
  );
}

// Inner component with Shadow Twin integration
function ActivityPageContent({ activity, labSessionId }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('problem');
  const [viewingSubmission, setViewingSubmission] = useState(null);

  // Track current code and error for Shadow Twin
  const [currentCode, setCurrentCode] = useState(activity?.starterCode || '');
  const [lastError, setLastError] = useState('');

  // Time tracking for Shadow Twin
  const startTimeRef = useRef(Date.now());
  const { updateTimeSpent, fetchHintHistory, fetchRecommendedLevel } = useShadowTwin();

  // Update time spent periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      updateTimeSpent(elapsed);
    }, 30000);

    return () => clearInterval(interval);
  }, [updateTimeSpent]);

  // Fetch hint data on mount
  useEffect(() => {
    fetchHintHistory();
    fetchRecommendedLevel(0);
  }, [fetchHintHistory, fetchRecommendedLevel]);

  const handleRunCode = async (code) => {
    setCurrentCode(code);
    setIsRunning(true);
    setResults(null);
    setActiveTab('results');

    try {
      const response = await submissionAPI.submit({
        activityId: activity._id,
        code: code,
        language: activity.language,
        labSessionId: labSessionId
      });

      setResults(response.data.data);

      // Track error for Shadow Twin hints
      const result = response.data.data;
      if (result.compileError) {
        setLastError(result.compileError);
      } else if (result.runtimeError) {
        setLastError(result.runtimeError);
      } else if (result.status === 'failed') {
        const failedTest = result.testExecutionLog?.find(t => !t.passed);
        setLastError(failedTest ? `Test failed: Expected "${failedTest.expected}" but got "${failedTest.actual}"` : 'Test cases failed');
      } else {
        setLastError('');
      }

      // Update recommended level based on new attempt
      fetchRecommendedLevel(1);
    } catch (error) {
      console.error('Submission error:', error);
      setResults({
        error: true,
        message: error.response?.data?.message || 'Submission failed'
      });
      setLastError(error.response?.data?.message || 'Submission failed');
    } finally {
      setIsRunning(false);
    }
  };

  const getDisplayName = (user) => {
    if (!user) return '';
    if (user.displayName) return user.displayName;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    if (user.name) return user.name;
    return 'Student';
  };

  return (
    <div className="min-h-screen bg-[#1e1e2e] flex flex-col">
      {/* Header */}
      <header className="bg-[#313244] border-b border-[#45475a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(labSessionId ? `/student/session/${labSessionId}` : '/student/dashboard')}
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
                {/* AI Assistance Level Indicator */}
                {activity.aiAssistanceLevel === 0 ? (
                  <span className="text-sm px-2 py-0.5 rounded bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]">
                    🔒 Lockdown
                  </span>
                ) : (
                  <span className="text-sm px-2 py-0.5 rounded bg-[#cba6f7] bg-opacity-20 text-[#cba6f7]">
                    AI Lv.{activity.aiAssistanceLevel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#bac2de]">{getDisplayName(user)}</p>
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
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === 'history'
                  ? 'text-[#89b4fa] border-b-2 border-[#89b4fa]'
                  : 'text-[#bac2de] hover:text-[#cdd6f4]'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              History
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'history' ? (
              <SubmissionHistory
                activityId={activity._id}
                onViewCode={(submission) => {
                  setViewingSubmission(submission);
                }}
              />
            ) : activeTab === 'problem' ? (
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

      {/* Shadow Twin Components */}
      <ShadowTwinButton />
      <HintPanel code={currentCode} errorOutput={lastError} />
    </div>
  );
}

// Problem Tab Component
function ProblemTab({ activity }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#cdd6f4] mb-3">Description</h2>
        <p className="text-[#bac2de] whitespace-pre-wrap">{activity.description}</p>
      </div>

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

  return (
    <TestExecutionViewer
      testLog={results.testExecutionLog || []}
      compileError={results.compileError}
      runtimeError={results.runtimeError}
      isRunning={isRunning}
    />
  );
}

export default ActivityPage;
