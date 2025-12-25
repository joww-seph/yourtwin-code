import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Eye, EyeOff, Bot, Lock, HelpCircle } from 'lucide-react';
import { showWarning } from '../utils/sweetalert';

// AI Assistance Level definitions
const AI_LEVELS = [
  { level: 0, name: 'Lockdown', desc: 'No AI help - Assessment mode', color: '#f38ba8', icon: Lock },
  { level: 1, name: 'Questions', desc: 'Socratic guiding questions only', color: '#fab387' },
  { level: 2, name: 'Concepts', desc: 'Algorithm/data structure hints', color: '#f9e2af' },
  { level: 3, name: 'Pseudocode', desc: 'Step-by-step logic guidance', color: '#a6e3a1' },
  { level: 4, name: 'Examples', desc: 'Similar problem patterns', color: '#89b4fa' },
  { level: 5, name: 'Guided', desc: 'Detailed help with code hints', color: '#cba6f7' }
];

function CreateActivityModal({ isOpen, onClose, onSubmit, loading = false, initialData = null, mode = 'create' }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [showPreview, setShowPreview] = useState(false);

  const isEditMode = mode === 'edit';
  const isDuplicateMode = mode === 'duplicate';

  const getDefaultFormData = () => ({
    title: '',
    description: '',
    topic: '',
    difficulty: 'medium',
    type: 'practice',
    language: 'python',
    timeLimit: 30,
    aiAssistanceLevel: 5,
    testCases: []
  });

  const [formData, setFormData] = useState(getDefaultFormData());

  const [currentTestCase, setCurrentTestCase] = useState({
    input: '',
    expectedOutput: ''
  });

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Populate form with existing data for edit/duplicate mode
        setFormData({
          title: isDuplicateMode ? `${initialData.title} (Copy)` : initialData.title || '',
          description: initialData.description || '',
          topic: initialData.topic || '',
          difficulty: initialData.difficulty || 'medium',
          type: initialData.type || 'practice',
          language: initialData.language || 'python',
          timeLimit: initialData.timeLimit || 30,
          aiAssistanceLevel: initialData.aiAssistanceLevel ?? 5,
          testCases: initialData.testCases ? initialData.testCases.map(tc => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            description: tc.description || ''
          })) : []
        });
      } else {
        // Reset all form data when modal opens in create mode
        setFormData(getDefaultFormData());
      }
      setCurrentTestCase({
        input: '',
        expectedOutput: '',
        description: ''
      });
      setActiveTab('basic');
      setShowPreview(false);
    }
  }, [isOpen, initialData, mode]);

  // Keep language options aligned with backend Activity model enum
  const languages = ['python', 'java', 'cpp'];
  const difficulties = ['easy', 'medium', 'hard'];
  // Activity types must match backend enum: 'practice' or 'final'
  const types = ['practice', 'final'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestCaseChange = (field, value) => {
    setCurrentTestCase(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTestCase = () => {
    if (!currentTestCase.expectedOutput.trim()) {
      showWarning('Missing field', 'Please fill in the expected output');
      return;
    }

    setFormData(prev => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        { ...currentTestCase }
      ]
    }));

    setCurrentTestCase({
      input: '',
      expectedOutput: ''
    });
  };

  const removeTestCase = (index) => {
    setFormData(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      showWarning('Missing fields', 'Please fill in title and description');
      return;
    }

    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      topic: '',
      difficulty: 'medium',
      type: 'practice',
      language: 'python',
      timeLimit: 30,
      aiAssistanceLevel: 5,
      testCases: []
    });
    setCurrentTestCase({
      input: '',
      expectedOutput: ''
    });
    setActiveTab('basic');
    setShowPreview(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313244] border border-[#45475a] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#45475a] px-6 py-4 flex items-center justify-between border-b border-[#585b70]">
          <h2 className="text-xl font-bold text-[#cdd6f4]">
            {isEditMode ? 'Edit Activity' : isDuplicateMode ? 'Duplicate Activity' : 'Create Activity'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[#585b70] rounded transition"
          >
            <X className="w-6 h-6 text-[#bac2de]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#45475a] bg-[#1e1e2e]">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 px-4 py-3 font-medium transition ${
              activeTab === 'basic'
                ? 'border-b-2 border-[#89b4fa] text-[#89b4fa]'
                : 'text-[#bac2de] hover:text-[#cdd6f4]'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('testcases')}
            className={`flex-1 px-4 py-3 font-medium transition ${
              activeTab === 'testcases'
                ? 'border-b-2 border-[#89b4fa] text-[#89b4fa]'
                : 'text-[#bac2de] hover:text-[#cdd6f4]'
            }`}
          >
            Test Cases ({formData.testCases.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 px-4 py-3 font-medium transition ${
              activeTab === 'preview'
                ? 'border-b-2 border-[#89b4fa] text-[#89b4fa]'
                : 'text-[#bac2de] hover:text-[#cdd6f4]'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Activity Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Fibonacci Sequence"
                  className="w-full bg-[#45475a] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the problem statement, requirements, and examples..."
                  rows="4"
                  className="w-full bg-[#45475a] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => handleInputChange('topic', e.target.value)}
                    placeholder="e.g., Arrays, Strings"
                    className="w-full bg-[#45475a] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                    Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    className="w-full bg-[#45475a] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa]"
                  >
                    {languages.map(lang => (
                      <option key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleInputChange('difficulty', e.target.value)}
                    className="w-full bg-[#45475a] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa]"
                  >
                    {difficulties.map(diff => (
                      <option key={diff} value={diff}>
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full bg-[#45475a] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa]"
                  >
                    {types.map(t => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                    Time Limit (min)
                  </label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value))}
                    min="5"
                    max="120"
                    className="w-full bg-[#45475a] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa]"
                  />
                </div>
              </div>

              {/* AI Assistance Level Selector */}
              <div className="mt-6 pt-4 border-t border-[#45475a]">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-5 h-5 text-[#cba6f7]" />
                  <label className="text-sm font-medium text-[#cdd6f4]">
                    AI Assistance Level
                  </label>
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-[#6c7086] cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-[#1e1e2e] border border-[#45475a] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <p className="text-xs text-[#bac2de]">
                        Controls the maximum level of AI help students can request.
                        Lower levels promote independent problem-solving.
                        Level 0 (Lockdown) disables AI completely for assessments.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {AI_LEVELS.map(({ level, name, desc, color, icon: Icon }) => {
                    const isSelected = formData.aiAssistanceLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleInputChange('aiAssistanceLevel', level)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-opacity-100 bg-opacity-20'
                            : 'border-[#45475a] hover:border-opacity-50 bg-transparent'
                        }`}
                        style={{
                          borderColor: isSelected ? color : undefined,
                          backgroundColor: isSelected ? `${color}20` : undefined
                        }}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {Icon ? (
                            <Icon className="w-5 h-5" style={{ color }} />
                          ) : (
                            <span className="text-lg font-bold" style={{ color }}>{level}</span>
                          )}
                          <span className="text-xs font-medium text-[#cdd6f4]">{name}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#a6e3a1]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected level description */}
                <div className="mt-3 p-3 rounded-lg" style={{
                  backgroundColor: `${AI_LEVELS[formData.aiAssistanceLevel]?.color}15`
                }}>
                  <p className="text-sm" style={{ color: AI_LEVELS[formData.aiAssistanceLevel]?.color }}>
                    <span className="font-medium">Level {formData.aiAssistanceLevel}:</span>{' '}
                    {AI_LEVELS[formData.aiAssistanceLevel]?.desc}
                  </p>
                  {formData.aiAssistanceLevel === 0 && (
                    <p className="text-xs text-[#f38ba8] mt-1">
                      Students will not be able to use Shadow Twin AI assistance during this activity.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Test Cases Tab */}
          {activeTab === 'testcases' && (
            <div className="space-y-4">
              {/* Add Test Case Form */}
              <div className="bg-[#45475a] rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-[#cdd6f4]">Add Test Case</h3>

                <div>
                  <label className="block text-sm text-[#bac2de] mb-1">
                    Input <span className="text-[#6c7086]">(optional)</span>
                  </label>
                  <textarea
                    value={currentTestCase.input}
                    onChange={(e) => handleTestCaseChange('input', e.target.value)}
                    placeholder="Enter test input (leave empty if not needed)"
                    rows="2"
                    className="w-full bg-[#1e1e2e] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#bac2de] mb-1">
                    Expected Output *
                  </label>
                  <textarea
                    value={currentTestCase.expectedOutput}
                    onChange={(e) => handleTestCaseChange('expectedOutput', e.target.value)}
                    placeholder="Enter expected output"
                    rows="2"
                    className="w-full bg-[#1e1e2e] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#bac2de] mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={currentTestCase.description}
                    onChange={(e) => handleTestCaseChange('description', e.target.value)}
                    placeholder="e.g., Edge case with large input"
                    className="w-full bg-[#1e1e2e] border border-[#585b70] rounded px-3 py-2 text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa]"
                  />
                </div>

                <button
                  onClick={addTestCase}
                  className="w-full px-4 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] font-medium rounded transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Test Case
                </button>
              </div>

              {/* Test Cases List */}
              {formData.testCases.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-[#cdd6f4]">Added Test Cases</h3>
                  {formData.testCases.map((testCase, index) => (
                    <div key={index} className="bg-[#45475a] rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-[#cdd6f4]">Test Case {index + 1}</h4>
                        <button
                          onClick={() => removeTestCase(index)}
                          className="text-[#f38ba8] hover:text-[#f28482] transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {testCase.description && (
                        <p className="text-sm text-[#bac2de]">{testCase.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[#6c7086] mb-1">Input:</p>
                          <pre className={`bg-[#1e1e2e] rounded p-2 overflow-x-auto whitespace-pre-wrap break-words font-mono ${testCase.input ? 'text-[#a6e3a1]' : 'text-[#6c7086] italic'}`}>
                            {testCase.input || '(no input)'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-[#6c7086] mb-1">Expected Output:</p>
                          <pre className="bg-[#1e1e2e] rounded p-2 text-[#a6e3a1] overflow-x-auto whitespace-pre-wrap break-words font-mono">
                            {testCase.expectedOutput}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formData.testCases.length === 0 && (
                <p className="text-center text-[#6c7086] py-8">
                  No test cases added yet
                </p>
              )}
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="bg-[#45475a] rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-[#cdd6f4]">{formData.title || 'Untitled Activity'}</h3>

                <div>
                  <p className="text-sm text-[#bac2de] mb-2">Description:</p>
                  <p className="text-[#cdd6f4] whitespace-pre-wrap">
                    {formData.description || 'No description provided'}
                  </p>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <span className="px-2 py-1 bg-[#89b4fa] bg-opacity-20 text-[#89b4fa] text-xs rounded">
                    {formData.topic || 'No topic'}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    formData.difficulty === 'easy'
                      ? 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]'
                      : formData.difficulty === 'medium'
                      ? 'bg-[#f9e2af] bg-opacity-20 text-[#f9e2af]'
                      : 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
                  }`}>
                    {formData.difficulty}
                  </span>
                  <span className="px-2 py-1 bg-[#cba6f7] bg-opacity-20 text-[#cba6f7] text-xs rounded">
                    {formData.language}
                  </span>
                  <span className="px-2 py-1 bg-[#94e2d5] bg-opacity-20 text-[#94e2d5] text-xs rounded">
                    {formData.type}
                  </span>
                  <span className="px-2 py-1 bg-[#bac2de] bg-opacity-20 text-[#bac2de] text-xs rounded">
                    {formData.timeLimit} min
                  </span>
                  <span
                    className="px-2 py-1 text-xs rounded flex items-center gap-1"
                    style={{
                      backgroundColor: `${AI_LEVELS[formData.aiAssistanceLevel]?.color}20`,
                      color: AI_LEVELS[formData.aiAssistanceLevel]?.color
                    }}
                  >
                    {formData.aiAssistanceLevel === 0 ? (
                      <><Lock className="w-3 h-3" /> Lockdown</>
                    ) : (
                      <>AI Lv.{formData.aiAssistanceLevel}</>
                    )}
                  </span>
                </div>

                {formData.testCases.length > 0 && (
                  <div>
                    <p className="text-sm text-[#bac2de] mb-2">Test Cases: {formData.testCases.length}</p>
                    <div className="space-y-2">
                      {formData.testCases.map((tc, idx) => (
                        <div key={idx} className="bg-[#1e1e2e] rounded p-2 text-xs text-[#6c7086]">
                          Test {idx + 1}: {tc.input ? `${tc.input.split('\n')[0]}...` : '(no input)'} → {tc.expectedOutput.split('\n')[0]}...
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#1e1e2e] border-t border-[#45475a] px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || !formData.title.trim() || !formData.description.trim()}
            className="px-6 py-2 bg-[#a6e3a1] hover:bg-[#94d982] disabled:opacity-50 disabled:cursor-not-allowed text-[#1e1e2e] font-medium rounded transition"
          >
            {loading
              ? (isEditMode ? 'Saving...' : 'Creating...')
              : (isEditMode ? 'Save Changes' : isDuplicateMode ? 'Create Copy' : 'Create Activity')
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateActivityModal;
