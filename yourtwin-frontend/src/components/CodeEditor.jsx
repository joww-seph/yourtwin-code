import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Lock, AlertTriangle, Send, CheckCircle } from 'lucide-react';

function CodeEditor({
  initialCode = '',
  starterCode = '', // Original starter code for reset
  language = 'cpp',
  onRun,
  onSubmit, // New: Final submission callback
  isRunning = false,
  isSubmitting = false, // New: Submission loading state
  hasPassed = false, // New: Whether student already passed this activity
  onCodeChange,
  onKeystroke,
  onPaste,
  lockdownMode = false,
  onExternalPasteBlocked,
  onReset // Callback when reset is clicked
}) {
  const [code, setCode] = useState(initialCode);

  // Sync code when initialCode changes (e.g., when loading saved code)
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);
  const [blockedPasteWarning, setBlockedPasteWarning] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const disposablesRef = useRef([]);
  const internalClipboardRef = useRef(''); // Track what was copied inside editor
  const isPastingRef = useRef(false); // Flag to track if we're handling a paste
  const lastContentRef = useRef(''); // Track last content to detect changes

  // Handle paste with clipboard API - this is the core blocking logic
  const handlePasteAttempt = useCallback(async (editor) => {
    if (isPastingRef.current) return;
    isPastingRef.current = true;

    try {
      // Read from clipboard using modern API
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText || clipboardText.length === 0) {
        isPastingRef.current = false;
        return;
      }

      // Check if this is an external paste
      const isExternalPaste = clipboardText !== internalClipboardRef.current;

      // Block external pastes > 10 chars in ALL activities
      if (isExternalPaste && clipboardText.length > 10) {
        console.log('Blocked external paste:', clipboardText.length, 'chars');
        setBlockedPasteWarning(true);
        setTimeout(() => setBlockedPasteWarning(false), 3000);

        if (onExternalPasteBlocked) {
          onExternalPasteBlocked(clipboardText);
        }

        isPastingRef.current = false;
        return; // Don't insert the text
      }

      // Allow the paste - insert text manually at cursor position
      const selection = editor.getSelection();
      const id = { major: 1, minor: 1 };
      const op = {
        identifier: id,
        range: selection,
        text: clipboardText,
        forceMoveMarkers: true
      };
      editor.executeEdits('paste', [op]);

      // Track the paste
      if (onPaste) {
        onPaste(clipboardText, isExternalPaste);
      }
    } catch (err) {
      console.warn('Clipboard access failed, falling back:', err);
      setBlockedPasteWarning(true);
      setTimeout(() => setBlockedPasteWarning(false), 3000);
    }

    isPastingRef.current = false;
  }, [onPaste, onExternalPasteBlocked]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    lastContentRef.current = editor.getValue();

    // Clear any previous disposables
    disposablesRef.current.forEach(d => d.dispose());
    disposablesRef.current = [];

    // Track keystrokes using onKeyDown event
    const keyDisposable = editor.onKeyDown((e) => {
      if (e.keyCode >= 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (onKeystroke) {
          onKeystroke(1);
        }
      }
    });
    disposablesRef.current.push(keyDisposable);

    // Override Ctrl+V / Cmd+V command to intercept pastes at Monaco level
    const pasteCommandDisposable = editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
      () => handlePasteAttempt(editor)
    );
    if (pasteCommandDisposable) {
      disposablesRef.current.push(pasteCommandDisposable);
    }

    // Also override Shift+Insert (alternative paste)
    const shiftInsertDisposable = editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyCode.Insert,
      () => handlePasteAttempt(editor)
    );
    if (shiftInsertDisposable) {
      disposablesRef.current.push(shiftInsertDisposable);
    }

    // Disable context menu paste by intercepting right-click menu
    const contextMenuDisposable = editor.onContextMenu((e) => {
      // The context menu will still show, but paste action is overridden below
    });
    disposablesRef.current.push(contextMenuDisposable);

    // Override the editor's paste action
    const pasteAction = editor.getAction('editor.action.clipboardPasteAction');
    if (pasteAction) {
      pasteAction.run = async () => {
        await handlePasteAttempt(editor);
      };
    }

    // Track copy events to remember internal clipboard
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      const handleCopyEvent = (e) => {
        const selection = editor.getModel()?.getValueInRange(editor.getSelection());
        if (selection) {
          internalClipboardRef.current = selection;
        }
      };

      const handleCutEvent = (e) => {
        const selection = editor.getModel()?.getValueInRange(editor.getSelection());
        if (selection) {
          internalClipboardRef.current = selection;
        }
      };

      // Block paste at DOM level as additional safety layer
      const handlePasteEvent = (e) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (clipboardData) {
          const pastedText = clipboardData.getData('text');
          const isExternalPaste = pastedText !== internalClipboardRef.current;

          if (isExternalPaste && pastedText && pastedText.length > 10) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            setBlockedPasteWarning(true);
            setTimeout(() => setBlockedPasteWarning(false), 3000);

            if (onExternalPasteBlocked) {
              onExternalPasteBlocked(pastedText);
            }
            return false;
          }
        }
      };

      editorDomNode.addEventListener('copy', handleCopyEvent, true);
      editorDomNode.addEventListener('cut', handleCutEvent, true);
      editorDomNode.addEventListener('paste', handlePasteEvent, true);
      window.addEventListener('paste', handlePasteEvent, true);

      disposablesRef.current.push({
        dispose: () => {
          editorDomNode.removeEventListener('copy', handleCopyEvent, true);
          editorDomNode.removeEventListener('cut', handleCutEvent, true);
          editorDomNode.removeEventListener('paste', handlePasteEvent, true);
          window.removeEventListener('paste', handlePasteEvent, true);
        }
      });
    }

    // Track content changes to detect pastes that bypass our checks
    const contentChangeDisposable = editor.onDidChangeModelContent((e) => {
      const currentContent = editor.getValue();

      for (const change of e.changes) {
        if (change.text.length > 50 && !isPastingRef.current) {
          const isFromInternalClipboard = change.text === internalClipboardRef.current;
          if (!isFromInternalClipboard) {
            if (onPaste) {
              onPaste(change.text, true);
            }
          }
        }
      }

      lastContentRef.current = currentContent;
    });
    disposablesRef.current.push(contentChangeDisposable);
  };

  // Cleanup disposables on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => {
        if (d && typeof d.dispose === 'function') {
          d.dispose();
        }
      });
      disposablesRef.current = [];
    };
  }, []);

  // Handle code changes
  const handleChange = (value) => {
    const newCode = value || '';
    setCode(newCode);
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  };

  const handleRun = () => {
    if (onRun) {
      onRun(code);
    }
  };

  const handleSubmit = () => {
    if (onSubmit && !hasPassed) {
      onSubmit(code);
    }
  };

  const handleReset = () => {
    const resetCode = starterCode || initialCode;
    setCode(resetCode);
    if (onCodeChange) {
      onCodeChange(resetCode);
    }
    if (onReset) {
      onReset();
    }
  };

  const languageMap = {
    c: 'c',
    cpp: 'cpp',
    java: 'java',
    python: 'python'
  };

  const languageLabels = {
    c: 'C',
    cpp: 'C++',
    java: 'Java',
    python: 'Python'
  };

  const isLoading = isRunning || isSubmitting;

  return (
    <div className="flex flex-col h-full">
      {/* Blocked Paste Warning */}
      {blockedPasteWarning && (
        <div className="bg-[#f38ba8] text-[#1e1e2e] px-4 py-2 flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            External paste blocked! Only code copied within the editor is allowed. This activity is monitored.
          </span>
        </div>
      )}

      {/* Editor Header */}
      <div className="bg-[#313244] border-b border-[#45475a] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-base text-[#bac2de]">
            Language: <span className="text-[#89b4fa] font-medium">{languageLabels[language] || language.toUpperCase()}</span>
          </span>
          {lockdownMode && (
            <span className="flex items-center gap-1.5 px-2 py-1 bg-[#f38ba8]/20 text-[#f38ba8] rounded text-xs font-medium">
              <Lock className="w-3 h-3" />
              Lockdown Mode
            </span>
          )}
          {hasPassed && (
            <span className="flex items-center gap-1.5 px-2 py-1 bg-[#a6e3a1]/20 text-[#a6e3a1] rounded text-xs font-medium">
              <CheckCircle className="w-3 h-3" />
              Completed
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded text-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="px-4 py-1.5 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] rounded font-medium text-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
          {onSubmit && (
            <button
              onClick={handleSubmit}
              disabled={isLoading || hasPassed}
              className={`px-4 py-1.5 rounded font-medium text-sm flex items-center gap-2 transition disabled:opacity-50 ${
                hasPassed
                  ? 'bg-[#a6e3a1]/20 text-[#a6e3a1] cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#a6e3a1] to-[#89b4fa] hover:opacity-90 text-[#1e1e2e]'
              }`}
              title={hasPassed ? 'You have already passed this activity' : 'Submit your final answer for AI validation'}
            >
              {hasPassed ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Passed
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={languageMap[language]}
          value={code}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true
          }}
        />
      </div>
    </div>
  );
}

export default CodeEditor;
