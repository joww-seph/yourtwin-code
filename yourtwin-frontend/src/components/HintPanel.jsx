import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Clock,
  Sparkles,
  History,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { useShadowTwin } from '../contexts/ShadowTwinContext';
import ComprehensionCheck from './ComprehensionCheck';

// Based on Scaffolding / Zone of Proximal Development (ZPD) Learning Theory
const HINT_LEVELS = [
  {
    level: 1,
    name: 'Prompt',
    desc: 'Gentle nudge with guiding questions',
    detail: '"Have you considered edge cases?" - Helps you discover the answer yourself'
  },
  {
    level: 2,
    name: 'Concept',
    desc: 'Reminds you of the theory or algorithm',
    detail: '"This problem involves recursion" - Names the concept without code'
  },
  {
    level: 3,
    name: 'Strategy',
    desc: 'Suggests the approach to take',
    detail: '"Try dividing the array into halves" - High-level problem-solving strategy'
  },
  {
    level: 4,
    name: 'Procedure',
    desc: 'Shows step-by-step pseudocode',
    detail: '"First split, then recursively sort, then merge" - Detailed steps in plain English'
  },
  {
    level: 5,
    name: 'Solution',
    desc: 'Reveals the answer with code template',
    detail: 'Full worked solution with TODOs for you to complete'
  }
];

function HintPanel({ code, errorOutput }) {
  const {
    isPanelOpen,
    togglePanel,
    currentHint,
    hintHistory,
    comprehensionPending,
    submitFeedback,
    requestHint,
    isLoading,
    error,
    hintsUsed,
    maxHints,
    recommendedLevel,
    aiAssistanceLevel,
    fetchHintHistory,
    clearError
  } = useShadowTwin();

  const [activeTab, setActiveTab] = useState('current');
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const [selectedHistoryHint, setSelectedHistoryHint] = useState(null);
  const [lastHintId, setLastHintId] = useState(null); // Track last hint to detect new ones

  // Request form state
  const [description, setDescription] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(recommendedLevel || 1);

  // Update selected level when recommended changes
  useEffect(() => {
    setSelectedLevel(recommendedLevel || 1);
  }, [recommendedLevel]);

  // Fetch history when panel opens
  useEffect(() => {
    if (isPanelOpen) {
      fetchHintHistory();
    }
  }, [isPanelOpen, fetchHintHistory]);

  // Switch to current tab ONLY when a NEW hint is received (not when navigating)
  useEffect(() => {
    if (currentHint && currentHint.id !== lastHintId) {
      // A new hint was received
      setLastHintId(currentHint.id);
      setActiveTab('current');
      setDescription('');
      setFeedbackGiven(null);
      setSelectedHistoryHint(null);
    }
  }, [currentHint, lastHintId]);

  if (!isPanelOpen) return null;

  const handleFeedback = async (wasHelpful) => {
    if (currentHint?.id && feedbackGiven === null) {
      await submitFeedback(currentHint.id, wasHelpful);
      setFeedbackGiven(wasHelpful);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!description.trim() || isLoading) return;

    await requestHint({
      code,
      errorOutput,
      hintLevel: selectedLevel,
      description: description.trim(),
      whatTried: ''
    });
  };

  const viewHistoryHint = (hint) => {
    setSelectedHistoryHint(hint);
    setActiveTab('current');
  };

  const displayedHint = selectedHistoryHint || currentHint;
  const canSelectLevel = (level) => level <= aiAssistanceLevel;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={togglePanel}
      />

      {/* Panel - 50% width */}
      <div className="fixed bottom-0 left-0 z-50 w-full md:w-1/2 max-h-[90vh] bg-[#1e1e2e] border border-[#45475a] border-b-0 rounded-t-2xl shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#1e1e2e]" />
            <h2 className="font-bold text-[#1e1e2e]">Shadow Twin</h2>
            <span className="text-xs bg-[#1e1e2e]/20 px-2 py-0.5 rounded-full text-[#1e1e2e]">
              {maxHints - hintsUsed} hints left
            </span>
          </div>
          <button
            onClick={togglePanel}
            className="p-1.5 hover:bg-black/10 rounded-lg transition"
          >
            <ChevronDown className="w-5 h-5 text-[#1e1e2e]" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#45475a] flex-shrink-0 bg-[#181825]">
          <button
            onClick={() => {
              setActiveTab('current');
              setSelectedHistoryHint(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition border-b-2 ${
              activeTab === 'current'
                ? 'text-[#89b4fa] border-[#89b4fa]'
                : 'text-[#7f849c] border-transparent hover:text-[#cdd6f4]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Hint</span>
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition border-b-2 ${
              activeTab === 'request'
                ? 'text-[#89b4fa] border-[#89b4fa]'
                : 'text-[#7f849c] border-transparent hover:text-[#cdd6f4]'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Ask</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition border-b-2 ${
              activeTab === 'history'
                ? 'text-[#89b4fa] border-[#89b4fa]'
                : 'text-[#7f849c] border-transparent hover:text-[#cdd6f4]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{hintHistory.length}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Current Hint Tab */}
          {activeTab === 'current' && (
            <div className="p-5">
              {comprehensionPending && currentHint?.comprehensionQuestion && !selectedHistoryHint && (
                <ComprehensionCheck question={currentHint.comprehensionQuestion} />
              )}

              {displayedHint && !comprehensionPending && (
                <div className="space-y-4">
                  {selectedHistoryHint && (
                    <div className="flex items-center justify-between p-2.5 bg-[#f9e2af]/10 border border-[#f9e2af]/30 rounded-lg">
                      <span className="text-sm text-[#f9e2af]">Previous hint</span>
                      <button
                        onClick={() => setSelectedHistoryHint(null)}
                        className="text-xs text-[#f9e2af] hover:underline"
                      >
                        Back
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-[#89b4fa]/20 text-[#89b4fa] text-sm font-medium rounded-full">
                      Level {displayedHint.level || displayedHint.hintLevel}
                    </span>
                  </div>

                  {/* Hint content - improved readability */}
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-headings:text-[#f5f5f5] prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
                    prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                    prose-p:text-[#e0e0e0] prose-p:my-2 prose-p:leading-relaxed
                    prose-strong:text-[#ffffff] prose-strong:font-semibold
                    prose-em:text-[#cba6f7]
                    prose-code:text-[#a6e3a1] prose-code:bg-[#313244] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-[#313244] prose-pre:border prose-pre:border-[#45475a] prose-pre:rounded-lg prose-pre:p-4
                    prose-ul:text-[#e0e0e0] prose-ul:my-2
                    prose-ol:text-[#e0e0e0] prose-ol:my-2
                    prose-li:text-[#e0e0e0] prose-li:my-1
                    prose-blockquote:border-l-4 prose-blockquote:border-[#89b4fa] prose-blockquote:pl-4 prose-blockquote:text-[#b8c0e0]"
                  >
                    <ReactMarkdown>
                      {displayedHint.content || displayedHint.generatedHint || ''}
                    </ReactMarkdown>
                  </div>

                  {!selectedHistoryHint && currentHint && (
                    <div className="pt-4 border-t border-[#45475a] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#9399b2]">Helpful?</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleFeedback(true)}
                            disabled={feedbackGiven !== null}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${
                              feedbackGiven === true
                                ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]'
                                : feedbackGiven === null
                                ? 'hover:bg-[#45475a] text-[#cdd6f4]'
                                : 'opacity-40 text-[#7f849c]'
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleFeedback(false)}
                            disabled={feedbackGiven !== null}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${
                              feedbackGiven === false
                                ? 'bg-[#f38ba8]/20 text-[#f38ba8]'
                                : feedbackGiven === null
                                ? 'hover:bg-[#45475a] text-[#cdd6f4]'
                                : 'opacity-40 text-[#7f849c]'
                            }`}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Need More Help button - always visible */}
                      {hintsUsed < maxHints && (
                        <button
                          onClick={() => {
                            setActiveTab('request');
                            setFeedbackGiven(null);
                            clearError(); // Clear any previous errors
                          }}
                          className="w-full py-2 text-sm text-[#89b4fa] hover:bg-[#45475a] rounded-lg transition flex items-center justify-center gap-2"
                        >
                          <Lightbulb className="w-4 h-4" />
                          Need More Help? Ask Again
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!displayedHint && !comprehensionPending && (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 text-[#45475a]" />
                  <p className="text-[#9399b2] mb-4">No hint yet</p>
                  <button
                    onClick={() => setActiveTab('request')}
                    className="text-[#89b4fa] hover:underline text-sm"
                  >
                    Ask for help →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Request Tab */}
          {activeTab === 'request' && (
            <form onSubmit={handleSubmitRequest} className="p-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-[#f38ba8]/10 border border-[#f38ba8]/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-[#f38ba8] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#f38ba8]">{error}</p>
                </div>
              )}

              {/* Hints remaining info */}
              <div className="flex items-center justify-between p-3 bg-[#313244] rounded-lg">
                <span className="text-sm text-[#bac2de]">Hints remaining</span>
                <span className={`text-sm font-bold ${maxHints - hintsUsed > 3 ? 'text-[#a6e3a1]' : maxHints - hintsUsed > 0 ? 'text-[#f9e2af]' : 'text-[#f38ba8]'}`}>
                  {maxHints - hintsUsed} / {maxHints}
                </span>
              </div>

              {/* Problem description */}
              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  What's the problem?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you're stuck on... (e.g., 'My loop never ends' or 'I don't understand the error')"
                  className="w-full px-3 py-2.5 bg-[#313244] border border-[#45475a] rounded-lg text-[#e0e0e0] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] resize-none text-sm"
                  rows={3}
                  required
                />
              </div>

              {/* Hint level selection - improved with context */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#cdd6f4]">Choose help level</span>
                  {recommendedLevel && (
                    <span className="text-xs text-[#a6e3a1] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Level {recommendedLevel} recommended
                    </span>
                  )}
                </div>

                {/* Level buttons with names */}
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {HINT_LEVELS.map(({ level, name }) => {
                    const isUnlocked = canSelectLevel(level);
                    const isSelected = selectedLevel === level;
                    const isRecommended = level === recommendedLevel;

                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => isUnlocked && setSelectedLevel(level)}
                        disabled={!isUnlocked}
                        className={`py-2.5 px-1 rounded-lg text-xs font-medium transition relative flex flex-col items-center gap-0.5 ${
                          isSelected
                            ? 'bg-[#89b4fa] text-[#1e1e2e] ring-2 ring-[#89b4fa] ring-offset-2 ring-offset-[#1e1e2e]'
                            : isUnlocked
                            ? 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a] border border-[#45475a]'
                            : 'bg-[#313244] text-[#585b70] cursor-not-allowed border border-[#313244]'
                        }`}
                      >
                        <span className="text-base font-bold">{level}</span>
                        <span className="text-[10px] opacity-80">{name}</span>
                        {isRecommended && !isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#a6e3a1] rounded-full flex items-center justify-center">
                            <Sparkles className="w-2 h-2 text-[#1e1e2e]" />
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="absolute inset-0 flex items-center justify-center bg-[#313244]/80 rounded-lg">
                            🔒
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected level description */}
                <div className="p-3 bg-[#313244] rounded-lg border border-[#45475a]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[#89b4fa]">
                      Level {selectedLevel}: {HINT_LEVELS.find(h => h.level === selectedLevel)?.name}
                    </span>
                  </div>
                  <p className="text-xs text-[#bac2de]">
                    {HINT_LEVELS.find(h => h.level === selectedLevel)?.desc}
                  </p>
                  <p className="text-xs text-[#6c7086] mt-1 italic">
                    {HINT_LEVELS.find(h => h.level === selectedLevel)?.detail}
                  </p>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !description.trim() || hintsUsed >= maxHints}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] hover:from-[#d4b4fa] hover:to-[#9fc4ff] disabled:from-[#45475a] disabled:to-[#45475a] text-[#1e1e2e] disabled:text-[#6c7086] font-bold rounded-lg transition text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Shadow Twin is thinking...</span>
                  </>
                ) : hintsUsed >= maxHints ? (
                  <span>No hints remaining</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Get Level {selectedLevel} {HINT_LEVELS.find(h => h.level === selectedLevel)?.name} Hint</span>
                  </>
                )}
              </button>

              {/* Hint philosophy note */}
              <p className="text-xs text-center text-[#6c7086]">
                Lower levels encourage self-discovery. Higher levels provide more direct help.
              </p>
            </form>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="divide-y divide-[#45475a]">
              {hintHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto mb-3 text-[#45475a]" />
                  <p className="text-[#9399b2]">No history yet</p>
                </div>
              ) : (
                hintHistory.map((hint, index) => (
                  <button
                    key={hint._id || index}
                    onClick={() => viewHistoryHint({
                      ...hint,
                      content: hint.generatedHint,
                      level: hint.hintLevel
                    })}
                    className="w-full px-5 py-3 hover:bg-[#313244] transition text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-2 py-0.5 bg-[#89b4fa]/20 text-[#89b4fa] text-xs font-medium rounded">
                        Lv.{hint.hintLevel}
                      </span>
                      <span className="text-xs text-[#6c7086] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(hint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-[#b8c0e0] line-clamp-2">
                      {hint.generatedHint?.substring(0, 100)}...
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default HintPanel;
