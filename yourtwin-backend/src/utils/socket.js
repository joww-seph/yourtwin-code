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
  // Check environment variable override first (e.g., GPP_PATH, JAVAC_PATH, PYTHON_PATH)
  const envVarName = name.toUpperCase().replace('+', 'P') + '_PATH';
  if (process.env[envVarName]) {
    console.log(`Using ${name} from env ${envVarName}: ${process.env[envVarName]}`);
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
      // MinGW variations
      `C:\\MinGW\\bin\\${name}.exe`,
      `C:\\mingw64\\bin\\${name}.exe`,
      `C:\\mingw-w64\\bin\\${name}.exe`,
      // MSYS2 variations
      `C:\\msys64\\mingw64\\bin\\${name}.exe`,
      `C:\\msys64\\mingw32\\bin\\${name}.exe`,
      `C:\\msys64\\ucrt64\\bin\\${name}.exe`,
      `C:\\msys64\\clang64\\bin\\${name}.exe`,
      `C:\\msys64\\usr\\bin\\${name}.exe`,
      // Other common locations
      `C:\\Program Files\\mingw-w64\\x86_64-8.1.0-posix-seh-rt_v6-rev0\\mingw64\\bin\\${name}.exe`,
      `C:\\Program Files (x86)\\mingw-w64\\i686-8.1.0-posix-dwarf-rt_v6-rev0\\mingw32\\bin\\${name}.exe`,
      `C:\\TDM-GCC-64\\bin\\${name}.exe`,
      `C:\\TDM-GCC-32\\bin\\${name}.exe`,
      `C:\\cygwin64\\bin\\${name}.exe`,
      `C:\\cygwin\\bin\\${name}.exe`,
      // Scoop and Chocolatey
      `${process.env.USERPROFILE}\\scoop\\apps\\gcc\\current\\bin\\${name}.exe`,
      `${process.env.USERPROFILE}\\scoop\\shims\\${name}.exe`,
      `C:\\ProgramData\\chocolatey\\bin\\${name}.exe`,
      // Dev-C++ and Code::Blocks
      `C:\\Program Files (x86)\\Dev-Cpp\\MinGW64\\bin\\${name}.exe`,
      `C:\\Program Files\\CodeBlocks\\MinGW\\bin\\${name}.exe`,
    ];

    for (const p of windowsPaths) {
      if (fs.existsSync(p)) {
        console.log(`✅ Found ${name} at: ${p}`);
        return p;
      }
    }

    console.log(`⚠️ Could not find ${name} in common paths. Searched:\n${windowsPaths.slice(0, 5).join('\n')}...`);
  }

  return name; // Return original name, will fail with helpful error
}

// Cache found executables
const executableCache = {};

function getExecutable(name, commonPaths = []) {
  if (!executableCache[name]) {
    executableCache[name] = findExecutable(name, commonPaths);
  }
  return executableCache[name];
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
  }
};

export const initializeSocket = (socketIO) => {
  io = socketIO;

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Join room based on role and userId
    socket.on('join-room', (data) => {
      const { userId, role, userName } = data;
      if (role === 'student') {
        socket.join(`student-${userId}`);
        onlineUsers.students.set(socket.id, { socketId: socket.id, userId, userName, joinedAt: new Date() });
        // Notify instructors about student count update
        broadcastOnlineCount();
      } else if (role === 'instructor') {
        socket.join(`instructor-${userId}`);
        onlineUsers.instructors.set(socket.id, { socketId: socket.id, userId, userName, joinedAt: new Date() });
      }
      socket.join(`role-${role}`);
      console.log(`User ${userId} (${userName || 'Unknown'}) joined ${role} room. Online: ${onlineUsers.students.size} students, ${onlineUsers.instructors.size} instructors`);
    });

    // Join specific lab session room
    socket.on('join-lab-session', (sessionId) => {
      socket.join(`lab-session-${sessionId}`);
      console.log(`Socket ${socket.id} joined lab-session-${sessionId}`);
    });

    // Leave specific lab session room
    socket.on('leave-lab-session', (sessionId) => {
      socket.leave(`lab-session-${sessionId}`);
      console.log(`Socket ${socket.id} left lab-session-${sessionId}`);
    });

    // === SANDBOX CODE EXECUTION ===
    socket.on('sandbox-run', async (data) => {
      const { code, language } = data;
      console.log(`🚀 [Sandbox] Running ${language} code for socket ${socket.id}`);

      // Kill any existing process for this socket
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
      console.log('❌ Client disconnected:', socket.id);
      // Clean up any running process
      const proc = activeProcesses.get(socket.id);
      if (proc) {
        proc.kill('SIGTERM');
        activeProcesses.delete(socket.id);
      }
      // Remove from online users tracking
      const wasStudent = onlineUsers.students.has(socket.id);
      onlineUsers.students.delete(socket.id);
      onlineUsers.instructors.delete(socket.id);
      // Notify instructors if a student disconnected
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

  // Create temp directory and file
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-'));
  const filename = language === 'java' ? 'Main' : 'script';
  const filepath = path.join(tempDir, filename + config.extension);

  try {
    // Write code to file
    fs.writeFileSync(filepath, code);

    // For compiled languages, compile first
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
      const outpath = path.join(tempDir, 'program');
      const compiled = await compileCode(config.compile(filepath, outpath));
      if (!compiled.success) {
        socket.emit('sandbox-output', { type: 'stderr', data: compiled.error });
        socket.emit('sandbox-done', { exitCode: 1 });
        cleanup(tempDir);
        return;
      }
      const { command, args } = config.run(outpath);
      runProcess(socket, command, args, tempDir);
    } else {
      // Interpreted language (Python)
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
      shell: process.platform === 'win32' // Use shell on Windows to resolve PATH
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
      // Provide user-friendly error messages
      let message = error.message;
      if (error.code === 'ENOENT') {
        const tool = command.includes('javac') ? 'Java compiler (javac)' :
                     command.includes('g++') ? 'g++ (C++ compiler)' : command;
        message = `${tool} not found. Please ensure it's installed and added to your system PATH, then restart the server.`;
      }
      resolve({
        success: false,
        error: message
      });
    });
  });
}

// Run process with streaming I/O
function runProcess(socket, command, args, tempDir) {
  const proc = spawn(command, args, {
    cwd: tempDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    shell: process.platform === 'win32' // Use shell on Windows to resolve PATH
  });

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
    // Provide user-friendly error messages
    let message = error.message;
    if (error.code === 'ENOENT') {
      const tool = command.includes('python') ? 'Python' :
                   command.includes('java') ? 'Java' :
                   command.includes('g++') ? 'g++ (C++ compiler)' : command;
      message = `${tool} not found. Please ensure it's installed and added to your system PATH, then restart the server.`;
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
    console.error('Cleanup error:', e);
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
    console.log(`📡 [Socket Emit] Emitting '${event}' to role-student room`);
    const sent = io.to('role-student').emit(event, data);
    console.log(`📡 [Socket Emit] Event '${event}' emitted to role-student`);
  } else {
    console.error('❌ [Socket Error] Socket.io not initialized!');
  }
};

export const emitToAllInstructors = (event, data) => {
  if (io) {
    console.log(`📡 [Socket Emit] Emitting '${event}' to role-instructor room`);
    io.to('role-instructor').emit(event, data);
    console.log(`📡 [Socket Emit] Event '${event}' emitted to role-instructor`);
  } else {
    console.error('❌ [Socket Error] Socket.io not initialized!');
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
    // Emit to both student and instructor rooms for this user
    io.to(`student-${userId}`).to(`instructor-${userId}`).emit(event, data);
    console.log(`📡 [Socket] Emitting '${event}' to user ${userId}`);
  }
};

// Emit to multiple specific users
export const emitToUsers = (userIds, event, data) => {
  if (io && userIds && userIds.length > 0) {
    userIds.forEach(userId => {
      const id = userId._id ? userId._id.toString() : userId.toString();
      io.to(`student-${id}`).to(`instructor-${id}`).emit(event, data);
    });
    console.log(`📡 [Socket] Emitting '${event}' to ${userIds.length} users`);
  }
};
