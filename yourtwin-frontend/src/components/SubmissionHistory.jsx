import { useState, useEffect } from 'react';
import { submissionAPI } from '../services/api';
import { CheckCircle, XCircle, Clock, TrendingUp, Code } from 'lucide-react';

function SubmissionHistory({ activityId, onViewCode }) {
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, [activityId]);

  const fetchSubmissions = async () => {
    try {
      const response = await submissionAPI.getMySubmissions(activityId);
      setSubmissions(response.data.data || []);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#6c7086]">No submissions yet. Run your code to see results here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#89b4fa]" />
              <span className="text-xs text-[#bac2de]">Best Score</span>
            </div>
            <p className="text-2xl font-bold text-[#cdd6f4]">{stats.bestScore}%</p>
          </div>
          
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-4 h-4 text-[#a6e3a1]" />
              <span className="text-xs text-[#bac2de]">Attempts</span>
            </div>
            <p className="text-2xl font-bold text-[#cdd6f4]">{stats.totalAttempts}</p>
          </div>
          
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#f9e2af]" />
              <span className="text-xs text-[#bac2de]">Status</span>
            </div>
            <p className={`text-sm font-medium ${
              stats.passed ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'
            }`}>
              {stats.passed ? 'Completed' : 'In Progress'}
            </p>
          </div>
        </div>
      )}

      {/* Submission List */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-[#cdd6f4] mb-3">Submission History</h3>
        {submissions.map((submission, index) => (
          <div
            key={submission._id}
            className={`border rounded-lg p-4 cursor-pointer transition ${
              submission.isBestScore
                ? 'bg-[#89b4fa] bg-opacity-10 border-[#89b4fa] border-opacity-30'
                : 'bg-[#313244] border-[#45475a] hover:border-[#585b70]'
            }`}
            onClick={() => onViewCode && onViewCode(submission)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#bac2de]">
                  Attempt #{submission.attemptNumber}
                </span>
                {submission.isBestScore && (
                  <span className="text-xs px-2 py-0.5 bg-[#f9e2af] bg-opacity-20 text-[#f9e2af] rounded">
                    Best Score
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {submission.status === 'passed' ? (
                  <CheckCircle className="w-4 h-4 text-[#a6e3a1]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#f38ba8]" />
                )}
                <span className={`text-sm font-bold ${
                  submission.status === 'passed' ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'
                }`}>
                  {submission.score}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#6c7086] mb-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(submission.createdAt).toLocaleString()}</span>
              </div>
              {submission.executionTime && (
                <span>Execution: {submission.executionTime}s</span>
              )}
            </div>

            {submission.compileError && (
              <div className="mt-2 p-2 bg-[#f38ba8] bg-opacity-10 border border-[#f38ba8] border-opacity-20 rounded text-xs text-[#f38ba8]">
                <p className="font-medium">Compile Error</p>
                <p className="line-clamp-2">{submission.compileError.substring(0, 100)}</p>
              </div>
            )}

            {submission.runtimeError && (
              <div className="mt-2 p-2 bg-[#f38ba8] bg-opacity-10 border border-[#f38ba8] border-opacity-20 rounded text-xs text-[#f38ba8]">
                <p className="font-medium">Runtime Error</p>
                <p className="line-clamp-2">{submission.runtimeError.substring(0, 100)}</p>
              </div>
            )}

            {submission.testExecutionLog && submission.testExecutionLog.length > 0 && (
              <div className="mt-2 text-xs text-[#89b4fa]">
                Test Log: {submission.testExecutionLog.length} steps
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubmissionHistory;