import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw } from 'lucide-react';

function CodeEditor({ 
  initialCode = '', 
  language = 'cpp',
  onRun,
  isRunning = false 
}) {
  const [code, setCode] = useState(initialCode);
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const handleRun = () => {
    if (onRun) {
      onRun(code);
    }
  };

  const handleReset = () => {
    setCode(initialCode);
  };

  const languageMap = {
    cpp: 'cpp',
    java: 'java',
    python: 'python'
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="bg-[#313244] border-b border-[#45475a] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#bac2de]">
            Language: <span className="text-[#89b4fa] font-medium">{language.toUpperCase()}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded text-sm flex items-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-4 py-1.5 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] hover:opacity-90 text-[#1e1e2e] rounded font-medium text-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={languageMap[language]}
          value={code}
          onChange={(value) => setCode(value || '')}
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