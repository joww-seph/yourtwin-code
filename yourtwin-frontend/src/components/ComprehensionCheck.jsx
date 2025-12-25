import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Brain, RefreshCw } from 'lucide-react';
import { useShadowTwin } from '../contexts/ShadowTwinContext';

function ComprehensionCheck({ question }) {
  const { submitComprehension, isLoading } = useShadowTwin();

  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!answer.trim() || isLoading) return;

    const response = await submitComprehension(answer.trim());

    if (response.success) {
      setResult(response);
      setAttempts(prev => prev + 1);

      if (!response.passed) {
        // Clear answer for retry
        setAnswer('');
      }
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswer('');
  };

  // If passed, show success
  if (result?.passed) {
    return (
      <div className="bg-[#a6e3a1] bg-opacity-10 border border-[#a6e3a1] border-opacity-30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[#a6e3a1] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[#a6e3a1] mb-1">Great understanding!</p>
            <p className="text-sm text-[#a6e3a1] opacity-80">{result.feedback}</p>
          </div>
        </div>
      </div>
    );
  }

  // If failed, show feedback and simpler explanation
  if (result && !result.passed) {
    return (
      <div className="space-y-4 mb-4">
        {/* Feedback */}
        <div className="bg-[#f9e2af] bg-opacity-10 border border-[#f9e2af] border-opacity-30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-[#f9e2af] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#f9e2af] mb-1">Not quite there yet</p>
              <p className="text-sm text-[#f9e2af] opacity-80">{result.feedback}</p>
            </div>
          </div>
        </div>

        {/* Simpler explanation if provided */}
        {result.simplerExplanation && (
          <div className="bg-[#89b4fa] bg-opacity-10 border border-[#89b4fa] border-opacity-30 rounded-lg p-4">
            <p className="text-sm font-medium text-[#89b4fa] mb-2">Let me explain it differently:</p>
            <p className="text-sm text-[#bac2de]">{result.simplerExplanation}</p>
          </div>
        )}

        {/* Retry button */}
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 px-4 py-2 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // Show question and answer form
  return (
    <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-[#cba6f7]" />
        <span className="font-medium text-[#cdd6f4]">Comprehension Check</span>
        {attempts > 0 && (
          <span className="text-xs text-[#6c7086]">Attempt {attempts + 1}</span>
        )}
      </div>

      {/* Question */}
      <p className="text-sm text-[#bac2de] mb-4 p-3 bg-[#1e1e2e] rounded-lg">
        {question}
      </p>

      {/* Answer form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Explain in your own words..."
          className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] resize-none text-sm"
          rows={3}
          disabled={isLoading}
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-[#6c7086]">
            Answer this to unlock the full hint
          </p>

          <button
            type="submit"
            disabled={!answer.trim() || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#cba6f7] hover:bg-[#d4b4fa] text-[#1e1e2e] font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ComprehensionCheck;
