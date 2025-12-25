import { useState, useEffect } from 'react';
import { plagiarismAPI } from '../services/api';
import {
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  X
} from 'lucide-react';

function PlagiarismReport({ activityId, activityTitle, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(70);
  const [expandedPair, setExpandedPair] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [activityId, threshold]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await plagiarismAPI.getActivityReport(activityId, threshold);
      setReport(response.data.data);
    } catch (error) {
      console.error('Failed to fetch plagiarism report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async (sub1Id, sub2Id) => {
    setLoadingComparison(true);
    try {
      const response = await plagiarismAPI.compareSubmissions(sub1Id, sub2Id);
      setComparison(response.data.data);
    } catch (error) {
      console.error('Failed to compare submissions:', error);
    } finally {
      setLoadingComparison(false);
    }
  };

  const getSimilarityColor = (similarity) => {
    if (similarity >= 90) return '#f38ba8';
    if (similarity >= 80) return '#fab387';
    if (similarity >= 70) return '#f9e2af';
    return '#a6e3a1';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#313244] rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b4fa] mx-auto"></div>
          <p className="text-[#bac2de] mt-4">Analyzing submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313244] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#45475a] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#cdd6f4] flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#89b4fa]" />
              Plagiarism Report
            </h2>
            <p className="text-sm text-[#bac2de] mt-1">{activityTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#45475a] rounded-lg transition"
          >
            <X className="w-5 h-5 text-[#bac2de]" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-[#45475a] flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#bac2de]">Threshold:</label>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="bg-[#45475a] border border-[#585b70] rounded px-3 py-1 text-[#cdd6f4] text-sm"
            >
              <option value={50}>50%</option>
              <option value={60}>60%</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
            </select>
          </div>
          <button
            onClick={fetchReport}
            className="flex items-center gap-2 px-3 py-1 bg-[#45475a] hover:bg-[#585b70] rounded text-sm text-[#cdd6f4] transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="p-4 border-b border-[#45475a]">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1e1e2e] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-[#cdd6f4]">
                {report?.report?.totalSubmissions || 0}
              </p>
              <p className="text-xs text-[#6c7086]">Total Submissions</p>
            </div>
            <div className="bg-[#1e1e2e] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: report?.report?.summary?.totalFlagged > 0 ? '#f38ba8' : '#a6e3a1' }}>
                {report?.report?.summary?.totalFlagged || 0}
              </p>
              <p className="text-xs text-[#6c7086]">Flagged Pairs</p>
            </div>
            <div className="bg-[#1e1e2e] rounded-lg p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: getSimilarityColor(report?.report?.summary?.maxSimilarity || 0) }}>
                {report?.report?.summary?.maxSimilarity || 0}%
              </p>
              <p className="text-xs text-[#6c7086]">Max Similarity</p>
            </div>
          </div>
        </div>

        {/* Flagged Pairs */}
        <div className="flex-1 overflow-y-auto p-4">
          {report?.report?.flaggedPairs?.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-[#a6e3a1] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#cdd6f4]">No Plagiarism Detected</h3>
              <p className="text-[#6c7086] mt-2">
                No submissions exceeded the {threshold}% similarity threshold.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {report?.report?.flaggedPairs?.map((pair, idx) => (
                <div
                  key={idx}
                  className="bg-[#1e1e2e] rounded-lg border border-[#45475a] overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-[#45475a] transition"
                    onClick={() => setExpandedPair(expandedPair === idx ? null : idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <AlertTriangle
                          className="w-5 h-5"
                          style={{ color: getSimilarityColor(pair.similarity) }}
                        />
                        <div>
                          <p className="text-[#cdd6f4] font-medium">
                            {pair.submission1.studentName} vs {pair.submission2.studentName}
                          </p>
                          <p className="text-xs text-[#6c7086]">
                            Submitted {new Date(pair.submission1.submittedAt).toLocaleString()} and {new Date(pair.submission2.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          className="px-3 py-1 rounded-full text-sm font-bold"
                          style={{
                            backgroundColor: `${getSimilarityColor(pair.similarity)}20`,
                            color: getSimilarityColor(pair.similarity)
                          }}
                        >
                          {pair.similarity}% Similar
                        </div>
                        {expandedPair === idx ? (
                          <ChevronUp className="w-5 h-5 text-[#6c7086]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#6c7086]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedPair === idx && (
                    <div className="p-4 border-t border-[#45475a] bg-[#181825]">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-sm text-[#6c7086]">Token Similarity</p>
                          <p className="text-lg font-bold text-[#cdd6f4]">{pair.details.tokenSimilarity}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[#6c7086]">Fingerprint Match</p>
                          <p className="text-lg font-bold text-[#cdd6f4]">{pair.details.fingerprintSimilarity}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[#6c7086]">Structure Match</p>
                          <p className="text-lg font-bold text-[#cdd6f4]">{pair.details.structuralSimilarity}%</p>
                        </div>
                      </div>
                      {pair.details.exactMatch && (
                        <div className="mb-4 p-2 bg-[#f38ba8] bg-opacity-20 rounded text-center">
                          <p className="text-[#f38ba8] font-medium">Exact Match Detected!</p>
                        </div>
                      )}
                      <button
                        onClick={() => handleCompare(pair.submission1.id, pair.submission2.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] rounded-lg font-medium transition"
                      >
                        <Eye className="w-4 h-4" />
                        View Side-by-Side Comparison
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Modal */}
      {comparison && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#313244] rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#45475a] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#cdd6f4]">
                Code Comparison - {comparison.similarity.overall}% Similar
              </h3>
              <button
                onClick={() => setComparison(null)}
                className="p-2 hover:bg-[#45475a] rounded-lg transition"
              >
                <X className="w-5 h-5 text-[#bac2de]" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex">
              {/* Left Side */}
              <div className="flex-1 flex flex-col border-r border-[#45475a]">
                <div className="p-3 bg-[#1e1e2e] border-b border-[#45475a]">
                  <p className="font-medium text-[#cdd6f4]">{comparison.submission1.studentName}</p>
                  <p className="text-xs text-[#6c7086]">
                    {comparison.submission1.studentId} - {comparison.submission1.lineCount} lines
                  </p>
                </div>
                <pre className="flex-1 overflow-auto p-4 text-sm text-[#cdd6f4] bg-[#1e1e2e]">
                  <code>{comparison.submission1.code}</code>
                </pre>
              </div>
              {/* Right Side */}
              <div className="flex-1 flex flex-col">
                <div className="p-3 bg-[#1e1e2e] border-b border-[#45475a]">
                  <p className="font-medium text-[#cdd6f4]">{comparison.submission2.studentName}</p>
                  <p className="text-xs text-[#6c7086]">
                    {comparison.submission2.studentId} - {comparison.submission2.lineCount} lines
                  </p>
                </div>
                <pre className="flex-1 overflow-auto p-4 text-sm text-[#cdd6f4] bg-[#1e1e2e]">
                  <code>{comparison.submission2.code}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for comparison */}
      {loadingComparison && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-[#313244] rounded-lg p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#89b4fa] mx-auto"></div>
            <p className="text-[#bac2de] mt-4">Loading comparison...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlagiarismReport;
