import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Editor from '@monaco-editor/react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  ArrowLeft,
  Play,
  Terminal as TerminalIcon,
  Code,
  Square,
  RotateCcw,
  Copy,
  Check,
  Save
} from 'lucide-react';

const STARTER_CODE = {
  python: `name = input("Enter your name: ")
age = input("Enter your age: ")
print(f"Hello, {name}! You are {age} years old.")
`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = scanner.nextLine();
        System.out.print("Enter your age: ");
        int age = scanner.nextInt();
        System.out.println("Hello, " + name + "! You are " + age + " years old.");
    }
}
`,
  cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int age;
    cout << "Enter your name: ";
    getline(cin, name);
    cout << "Enter your age: ";
    cin >> age;
    cout << "Hello, " << name << "! You are " << age << " years old." << endl;
    return 0;
}
`
};

function SandboxPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('sandbox_language') || 'python';
  });
  const [code, setCode] = useState(() => {
    const savedLang = localStorage.getItem('sandbox_language') || 'python';
    const savedCode = localStorage.getItem(`sandbox_code_${savedLang}`);
    return savedCode || STARTER_CODE[savedLang];
  });
  const [isRunning, setIsRunning] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Terminal refs
  const terminalRef = useRef(null);
  const terminalContainerRef = useRef(null);
  const fitAddonRef = useRef(null);
  const inputBufferRef = useRef('');
  const isRunningRef = useRef(false);
  const socketRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalContainerRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        cursorAccent: '#1e1e2e',
        selection: '#585b7066',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#cba6f7',
        cyan: '#94e2d5',
        white: '#bac2de',
        brightBlack: '#585b70',
        brightRed: '#f38ba8',
        brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af',
        brightBlue: '#89b4fa',
        brightMagenta: '#cba6f7',
        brightCyan: '#94e2d5',
        brightWhite: '#a6adc8'
      },
      fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'bar',
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalContainerRef.current);

    // Delay fit to ensure container is properly rendered
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn('Terminal fit error:', e);
      }
    }, 100);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('\x1b[38;5;105m========================================\x1b[0m');
    term.writeln('\x1b[38;5;105m  YourTwin Code Sandbox Terminal\x1b[0m');
    term.writeln('\x1b[38;5;105m========================================\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[38;5;243mAll languages run interactively!\x1b[0m');
    term.writeln('\x1b[38;5;243mType input directly when prompted.\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[38;5;243mPress Run (Ctrl+Enter) to execute.\x1b[0m');
    term.writeln('');

    // Handle user input
    term.onData((data) => {
      if (!isRunningRef.current) return;

      // Handle special keys
      if (data === '\r' || data === '\n') {
        // Enter pressed - send input to server
        term.writeln('');
        if (socketRef.current) {
          socketRef.current.emit('sandbox-input', { input: inputBufferRef.current });
        }
        inputBufferRef.current = '';
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\x03') {
        // Ctrl+C - stop execution
        if (socketRef.current) {
          socketRef.current.emit('sandbox-stop');
        }
      } else if (data >= ' ' || data === '\t') {
        // Regular character
        inputBufferRef.current += data;
        term.write(data);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleOutput = (data) => {
      const term = terminalRef.current;
      if (!term) return;

      if (data.type === 'stdout') {
        term.write(data.data);
      } else if (data.type === 'stderr') {
        term.write(`\x1b[31m${data.data}\x1b[0m`);
      } else if (data.type === 'system') {
        term.write(`\x1b[33m${data.data}\x1b[0m`);
      }
    };

    const handleDone = (data) => {
      const term = terminalRef.current;
      if (term) {
        if (data.exitCode === 0) {
          term.writeln('\n\x1b[32m--- Program finished ---\x1b[0m\n');
        } else {
          term.writeln(`\n\x1b[31m--- Program exited with code ${data.exitCode} ---\x1b[0m\n`);
        }
      }
      setIsRunning(false);
      inputBufferRef.current = '';
    };

    const handleError = (data) => {
      const term = terminalRef.current;
      if (term) {
        term.writeln(`\x1b[31mError: ${data.message}\x1b[0m\n`);
      }
      setIsRunning(false);
      inputBufferRef.current = '';
    };

    const handleStopped = () => {
      const term = terminalRef.current;
      if (term) {
        term.writeln('\n\x1b[33m--- Stopped ---\x1b[0m\n');
      }
      setIsRunning(false);
      inputBufferRef.current = '';
    };

    socket.on('sandbox-output', handleOutput);
    socket.on('sandbox-done', handleDone);
    socket.on('sandbox-error', handleError);
    socket.on('sandbox-stopped', handleStopped);

    return () => {
      socket.off('sandbox-output', handleOutput);
      socket.off('sandbox-done', handleDone);
      socket.off('sandbox-error', handleError);
      socket.off('sandbox-stopped', handleStopped);
    };
  }, [socket]);

  // Auto-save code to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`sandbox_code_${language}`, code);
      localStorage.setItem('sandbox_language', language);
    }, 1000);
    return () => clearTimeout(timer);
  }, [code, language]);

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Reset code to starter
  const handleResetCode = () => {
    setCode(STARTER_CODE[language]);
    localStorage.removeItem(`sandbox_code_${language}`);
    terminalRef.current?.writeln('\x1b[33mCode reset to starter template.\x1b[0m\n');
  };

  // Manual save with feedback
  const handleSaveCode = () => {
    localStorage.setItem(`sandbox_code_${language}`, code);
    localStorage.setItem('sandbox_language', language);
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  };

  const handleRun = () => {
    if (isRunning || !socket) return;

    const term = terminalRef.current;
    term.clear();
    term.writeln(`\x1b[36m--- Running ${language.toUpperCase()} ---\x1b[0m`);
    term.writeln('\x1b[38;5;243mType input when prompted. Ctrl+C to stop.\x1b[0m\n');

    setIsRunning(true);
    inputBufferRef.current = '';

    socket.emit('sandbox-run', { code, language });
  };

  const handleStop = () => {
    if (socket) {
      socket.emit('sandbox-stop');
    }
    setIsRunning(false);
    inputBufferRef.current = '';
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    const savedCode = localStorage.getItem(`sandbox_code_${newLanguage}`);
    setCode(savedCode || STARTER_CODE[newLanguage]);

    const term = terminalRef.current;
    if (term) {
      term.clear();
      term.writeln(`\x1b[36mSwitched to ${newLanguage.toUpperCase()}\x1b[0m`);
      term.writeln('\x1b[38;5;243mAll languages run interactively.\x1b[0m\n');
    }
  };

  const handleClearTerminal = () => {
    terminalRef.current?.clear();
    terminalRef.current?.writeln('\x1b[38;5;243mTerminal cleared.\x1b[0m\n');
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isRunning) {
      e.preventDefault();
      handleRun();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveCode();
    }
  }, [isRunning, code, language, socket]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const languageMap = {
    cpp: 'cpp',
    java: 'java',
    python: 'python'
  };

  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
    return 'Student';
  };

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
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] bg-clip-text text-transparent flex items-center gap-2">
                <Code className="w-5 h-5 text-[#89b4fa]" />
                Code Sandbox
              </h1>
              <p className="text-sm text-[#bac2de]">
                Interactive terminal - type input when prompted
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#bac2de]">{getDisplayName()}</p>
            <p className="text-xs text-[#6c7086]">
              {user?.course} {user?.yearLevel}-{user?.section}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-1/2 flex flex-col border-r border-[#45475a]">
          {/* Editor Header */}
          <div className="bg-[#313244] border-b border-[#45475a] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-[#45475a] border border-[#585b70] rounded px-3 py-1.5 text-[#cdd6f4] text-sm focus:outline-none focus:border-[#89b4fa]"
              >
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>

              <span className="px-2 py-1 bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1] text-xs rounded-full">
                Interactive
              </span>

              {savedIndicator && (
                <span className="px-2 py-1 bg-[#89b4fa] bg-opacity-20 text-[#89b4fa] text-xs rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded text-sm flex items-center gap-1.5 transition"
                title="Copy Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-[#a6e3a1]" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleResetCode}
                className="px-3 py-1.5 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded text-sm flex items-center gap-1.5 transition"
                title="Reset to Starter Code"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleSaveCode}
                className="px-3 py-1.5 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded text-sm flex items-center gap-1.5 transition"
                title="Save Code (Ctrl+S)"
              >
                <Save className="w-4 h-4" />
              </button>
              {isRunning ? (
                <button
                  onClick={handleStop}
                  className="px-4 py-1.5 bg-[#f38ba8] hover:bg-[#e57a97] text-[#1e1e2e] rounded font-medium text-sm flex items-center gap-2 transition"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleRun}
                  disabled={!socket}
                  title="Run Code (Ctrl+Enter)"
                  className="px-4 py-1.5 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] hover:opacity-90 text-[#1e1e2e] rounded font-medium text-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Run (Ctrl+Enter)
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
              onChange={(value) => setCode(value || '')}
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

        {/* Right Panel - Terminal */}
        <div className="w-1/2 flex flex-col">
          {/* Terminal Header */}
          <div className="bg-[#313244] border-b border-[#45475a] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-[#a6e3a1]" />
              <span className="text-sm font-medium text-[#cdd6f4]">Terminal</span>
              {isRunning && (
                <span className="text-xs text-[#f9e2af] animate-pulse">
                  Running... Type input here
                </span>
              )}
            </div>
            <button
              onClick={handleClearTerminal}
              className="px-3 py-1 text-xs text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#45475a] rounded transition"
            >
              Clear
            </button>
          </div>

          {/* Terminal Container */}
          <div
            ref={terminalContainerRef}
            className="flex-1 p-2 bg-[#1e1e2e]"
            style={{ minHeight: '300px' }}
          />
        </div>
      </div>
    </div>
  );
}

export default SandboxPage;
