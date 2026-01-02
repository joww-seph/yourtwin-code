import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Socket.io utility for emitting real-time events
let io = null;

// Store active processes for each socket
const activeProcesses = new Map();

// Track online users by role
const onlineUsers = {
  students: new Map(), // Map<socketId, { userId, sessionId }>
  instructors: new Map()
};

// Get online students count
export const getOnlineStudentsCount = () => onlineUsers.students.size;
export const getOnlineInstructorsCount = () => onlineUsers.instructors.size;
export const getOnlineStudentsList = () => Array.from(onlineUsers.students.values());

// Find executable on Windows by checking common paths
function findExecutable(name, commonPaths = []) {
  // Check environment variable override first
  const envVarName = name.toUpperCase().replace('+', 'P') + '_PATH';
  if (process.env[envVarName]) {
    return process.env[envVarName];
  }

  // First try the command directly (in PATH)
  try {
    if (process.platform === 'win32') {
      execSync(`where ${name}`, { stdio: 'ignore' });
      return name;
    } else {
      execSync(`which ${name}`, { stdio: 'ignore' });
      return name;
    }
  } catch (e) {
    // Not in PATH, check common locations
  }

  // Check common installation paths on Windows
  if (process.platform === 'win32') {
    const windowsPaths = [
      ...commonPaths,
      `C:\\MinGW\\bin\\${name}.exe`,
      `C:\\mingw64\\bin\\${name}.exe`,
      `C:\\mingw-w64\\bin\\${name}.exe`,
      `C:\\msys64\\mingw64\\bin\\${name}.exe`,
      `C:\\msys64\\mingw32\\bin\\${name}.exe`,
      `C:\\msys64\\ucrt64\\bin\\${name}.exe`,
      `C:\\msys64\\clang64\\bin\\${name}.exe`,
      `C:\\msys64\\usr\\bin\\${name}.exe`,
      `C:\\Program Files\\mingw-w64\\x86_64-8.1.0-posix-seh-rt_v6-rev0\\mingw64\\bin\\${name}.exe`,
      `C:\\Program Files (x86)\\mingw-w64\\i686-8.1.0-posix-dwarf-rt_v6-rev0\\mingw32\\bin\\${name}.exe`,
      `C:\\TDM-GCC-64\\bin\\${name}.exe`,
      `C:\\TDM-GCC-32\\bin\\${name}.exe`,
      `C:\\cygwin64\\bin\\${name}.exe`,
      `C:\\cygwin\\bin\\${name}.exe`,
      `${process.env.USERPROFILE}\\scoop\\apps\\gcc\\current\\bin\\${name}.exe`,
      `${process.env.USERPROFILE}\\scoop\\shims\\${name}.exe`,
      `C:\\ProgramData\\chocolatey\\bin\\${name}.exe`,
      `C:\\Program Files (x86)\\Dev-Cpp\\MinGW64\\bin\\${name}.exe`,
      `C:\\Program Files\\CodeBlocks\\MinGW\\bin\\${name}.exe`,
    ];

    for (const p of windowsPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  return name;
}

// Cache found executables
const executableCache = {};

function getExecutable(name, commonPaths = []) {
  if (!executableCache[name]) {
    executableCache[name] = findExecutable(name, commonPaths);
  }
  return executableCache[name];
}

// Preprocess C code to disable output buffering
function preprocessCCode(code) {
  if (code.includes('setvbuf') || code.includes('setbuf')) {
    return code;
  }

  const mainRegex = /(\b(int|void)\s+)?main\s*\([^)]*\)\s*\{/;
  const match = code.match(mainRegex);

  if (match) {
    const insertPos = match.index + match[0].length;
    const injection = '\n    setvbuf(stdout, NULL, _IONBF, 0);\n';
    return code.slice(0, insertPos) + injection + code.slice(insertPos);
  }

  return code;
}

// Language configurations
const LANGUAGE_CONFIG = {
  python: {
    extension: '.py',
    command: () => getExecutable('python'),
    args: (filepath) => [filepath]
  },
  java: {
    extension: '.java',
    compile: (filepath, dir) => ({ command: getExecutable('javac'), args: [filepath] }),
    run: (classname, dir) => ({ command: getExecutable('java'), args: ['-cp', dir, classname] })
  },
  cpp: {
    extension: '.cpp',
    compile: (filepath, outpath) => ({ command: getExecutable('g++'), args: [filepath, '-o', outpath] }),
    run: (outpath) => ({ command: outpath, args: [] })
  },
  c: {
    extension: '.c',
    compile: (filepath, outpath) => ({ command: getExecutable('gcc'), args: [filepath, '-o', outpath] }),
    run: (outpath) => ({ command: outpath, args: [] })
  }
};

export const initializeSocket = (socketIO) => {
  io = socketIO;

  io.on('connection', (socket) => {
    // Join room based on role and userId
    socket.on('join-room', (data) => {
      const { userId, role, userName } = data;
      if (role === 'student') {
        socket.join(`student-${userId}`);
        onlineUsers.students.set(socket.id, { socketId: socket.id, userId, userName, joinedAt: new Date() });
        broadcastOnlineCount();
      } else if (role === 'instructor') {
        socket.join(`instructor-${userId}`);
        onlineUsers.instructors.set(socket.id, { socketId: socket.id, userId, userName, joinedAt: new Date() });
      }
      socket.join(`role-${role}`);
    });

    // Join specific lab session room
    socket.on('join-lab-session', (data) => {
      const sessionId = typeof data === 'object' ? data.sessionId : data;
      const sessionTitle = typeof data === 'object' ? data.sessionTitle : null;

      socket.join(`lab-session-${sessionId}`);

      const studentInfo = onlineUsers.students.get(socket.id);
      if (studentInfo) {
        const joinEvent = {
          studentId: studentInfo.userId,
          studentName: studentInfo.userName,
          sessionId: sessionId,
          sessionTitle: sessionTitle,
          timestamp: new Date()
        };
        io.to('role-instructor').emit('student-joined-session', joinEvent);
        io.to(`lab-session-${sessionId}`).emit('student-joined-session', joinEvent);
      }
    });

    // Leave specific lab session room
    socket.on('leave-lab-session', (sessionId) => {
      socket.leave(`lab-session-${sessionId}`);
    });

    // === SANDBOX CODE EXECUTION ===
    socket.on('sandbox-run', async (data) => {
      const { code, language } = data;

      if (activeProcesses.has(socket.id)) {
        const proc = activeProcesses.get(socket.id);
        proc.kill('SIGTERM');
        activeProcesses.delete(socket.id);
      }

      try {
        await runCodeInteractive(socket, code, language);
      } catch (error) {
        socket.emit('sandbox-error', { message: error.message });
      }
    });

    // Handle stdin input from client
    socket.on('sandbox-input', (data) => {
      const { input } = data;
      const proc = activeProcesses.get(socket.id);
      if (proc && proc.stdin && !proc.stdin.destroyed) {
        proc.stdin.write(input + '\n');
      }
    });

    // Stop running process
    socket.on('sandbox-stop', () => {
      const proc = activeProcesses.get(socket.id);
      if (proc) {
        proc.kill('SIGTERM');
        activeProcesses.delete(socket.id);
        socket.emit('sandbox-stopped');
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const proc = activeProcesses.get(socket.id);
      if (proc) {
        proc.kill('SIGTERM');
        activeProcesses.delete(socket.id);
      }
      const wasStudent = onlineUsers.students.has(socket.id);
      onlineUsers.students.delete(socket.id);
      onlineUsers.instructors.delete(socket.id);
      if (wasStudent) {
        broadcastOnlineCount();
      }
    });
  });
};

// Broadcast online count to all instructors
function broadcastOnlineCount() {
  if (io) {
    io.to('role-instructor').emit('online-count-update', {
      studentsOnline: onlineUsers.students.size,
      instructorsOnline: onlineUsers.instructors.size,
      students: Array.from(onlineUsers.students.values()).map(s => ({
        userId: s.userId,
        userName: s.userName,
        joinedAt: s.joinedAt
      }))
    });
  }
}

// Run code interactively with streaming I/O
async function runCodeInteractive(socket, code, language) {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    socket.emit('sandbox-error', { message: `Unsupported language: ${language}` });
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-'));
  const filename = language === 'java' ? 'Main' : 'script';
  const filepath = path.join(tempDir, filename + config.extension);

  try {
    fs.writeFileSync(filepath, code);

    if (language === 'java') {
      socket.emit('sandbox-output', { type: 'system', data: 'Compiling Java...\n' });
      const compiled = await compileCode(config.compile(filepath, tempDir));
      if (!compiled.success) {
        socket.emit('sandbox-output', { type: 'stderr', data: compiled.error });
        socket.emit('sandbox-done', { exitCode: 1 });
        cleanup(tempDir);
        return;
      }
      const { command, args } = config.run('Main', tempDir);
      runProcess(socket, command, args, tempDir);
    } else if (language === 'cpp') {
      socket.emit('sandbox-output', { type: 'system', data: 'Compiling C++...\n' });
      const exeExt = process.platform === 'win32' ? '.exe' : '';
      const outpath = path.join(tempDir, 'program' + exeExt);
      const compiled = await compileCode(config.compile(filepath, outpath));
      if (!compiled.success) {
        socket.emit('sandbox-output', { type: 'stderr', data: compiled.error });
        socket.emit('sandbox-done', { exitCode: 1 });
        cleanup(tempDir);
        return;
      }
      const { command, args } = config.run(outpath);
      runProcess(socket, command, args, tempDir, language);
    } else if (language === 'c') {
      socket.emit('sandbox-output', { type: 'system', data: 'Compiling C...\n' });

      const processedCode = preprocessCCode(code);
      fs.writeFileSync(filepath, processedCode);

      const exeExt = process.platform === 'win32' ? '.exe' : '';
      const outpath = path.join(tempDir, 'program' + exeExt);

      const compiled = await compileCode(config.compile(filepath, outpath));
      if (!compiled.success) {
        socket.emit('sandbox-output', { type: 'stderr', data: compiled.error });
        socket.emit('sandbox-done', { exitCode: 1 });
        cleanup(tempDir);
        return;
      }

      if (!fs.existsSync(outpath)) {
        socket.emit('sandbox-output', { type: 'stderr', data: `Compilation succeeded but executable not found\n` });
        socket.emit('sandbox-done', { exitCode: 1 });
        cleanup(tempDir);
        return;
      }

      const { command, args } = config.run(outpath);
      runProcess(socket, command, args, tempDir, language);
    } else {
      const command = config.command();
      const args = config.args(filepath);
      runProcess(socket, command, args, tempDir);
    }
  } catch (error) {
    socket.emit('sandbox-error', { message: error.message });
    cleanup(tempDir);
  }
}

// Compile code and return result
function compileCode({ command, args }) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      shell: process.platform === 'win32'
    });
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        error: stderr
      });
    });

    proc.on('error', (error) => {
      let message = error.message;
      if (error.code === 'ENOENT') {
        const tool = command.includes('javac') ? 'Java compiler (javac)' :
                     command.includes('g++') ? 'g++ (C++ compiler)' :
                     command.includes('gcc') ? 'gcc (C compiler)' : command;
        message = `${tool} not found. Please ensure it's installed and added to your system PATH.`;
      }
      resolve({
        success: false,
        error: message
      });
    });
  });
}

// Run process with streaming I/O
function runProcess(socket, command, args, tempDir, language = '') {
  const isWindows = process.platform === 'win32';
  const isCompiledExe = command.endsWith('.exe');

  let proc;
  if (isWindows && isCompiledExe) {
    proc = spawn('cmd.exe', ['/c', command], {
      cwd: tempDir,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
  } else if (isWindows) {
    proc = spawn(command, args, {
      cwd: tempDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } else {
    proc = spawn(command, args, {
      cwd: tempDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }

  activeProcesses.set(socket.id, proc);

  proc.stdout.on('data', (data) => {
    socket.emit('sandbox-output', { type: 'stdout', data: data.toString() });
  });

  proc.stderr.on('data', (data) => {
    socket.emit('sandbox-output', { type: 'stderr', data: data.toString() });
  });

  proc.on('close', (code) => {
    activeProcesses.delete(socket.id);
    socket.emit('sandbox-done', { exitCode: code });
    cleanup(tempDir);
  });

  proc.on('error', (error) => {
    activeProcesses.delete(socket.id);
    let message = error.message;
    if (error.code === 'ENOENT') {
      const tool = command.includes('python') ? 'Python' :
                   command.includes('java') ? 'Java' :
                   command.includes('g++') ? 'g++ (C++ compiler)' : command;
      message = `${tool} not found. Please ensure it's installed and added to your system PATH.`;
    }
    socket.emit('sandbox-error', { message });
    cleanup(tempDir);
  });
}

// Cleanup temp directory
function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    // Silent cleanup
  }
}

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Emit events to specific rooms
export const emitToLabSession = (sessionId, event, data) => {
  if (io) {
    io.to(`lab-session-${sessionId}`).emit(event, data);
  }
};

export const emitToAllStudents = (event, data) => {
  if (io) {
    io.to('role-student').emit(event, data);
  }
};

export const emitToAllInstructors = (event, data) => {
  if (io) {
    io.to('role-instructor').emit(event, data);
  }
};

export const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// Emit to a specific user by their ID
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`student-${userId}`).to(`instructor-${userId}`).emit(event, data);
  }
};

// Emit to multiple specific users
export const emitToUsers = (userIds, event, data) => {
  if (io && userIds && userIds.length > 0) {
    userIds.forEach(userId => {
      const id = userId._id ? userId._id.toString() : userId.toString();
      io.to(`student-${id}`).to(`instructor-${id}`).emit(event, data);
    });
  }
};

// ===== MONITORING WEBSOCKET EVENTS =====

// Emit monitoring update to lab session instructors
export const emitMonitoringUpdate = (labSessionId, studentData) => {
  if (io) {
    io.to(`lab-session-${labSessionId}`).to('role-instructor').emit('monitoring-update', {
      sessionId: labSessionId,
      student: studentData,
      timestamp: new Date()
    });
  }
};

// Emit new flag alert to instructors
export const emitFlagAlert = (labSessionId, flagData) => {
  if (io) {
    io.to(`lab-session-${labSessionId}`).to('role-instructor').emit('monitoring-flag', {
      sessionId: labSessionId,
      ...flagData,
      timestamp: new Date()
    });
  }
};

// Emit student activity event (tab switch, paste, etc.)
export const emitStudentActivity = (labSessionId, activityData) => {
  if (io) {
    io.to(`lab-session-${labSessionId}`).emit('student-activity', {
      sessionId: labSessionId,
      ...activityData,
      timestamp: new Date()
    });
  }
};

// ===== LAB SESSION STATUS EVENTS =====

// Emit lab session status change to all connected users
export const emitLabSessionStatusChange = (sessionData) => {
  if (io) {
    const event = {
      sessionId: sessionData._id,
      title: sessionData.title,
      status: sessionData.status,
      isActive: sessionData.isActive,
      course: sessionData.course,
      yearLevel: sessionData.yearLevel,
      section: sessionData.section,
      timestamp: new Date()
    };

    // Emit to all students and instructors
    io.to('role-student').emit('lab-session-status-change', event);
    io.to('role-instructor').emit('lab-session-status-change', event);

    // Also emit to the specific session room
    io.to(`lab-session-${sessionData._id}`).emit('lab-session-status-change', event);

    console.log(`📡 Emitted lab-session-status-change: ${sessionData.title} -> ${sessionData.status} (active: ${sessionData.isActive})`);
  }
};
