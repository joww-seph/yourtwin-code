# YourTwin: CODE

<img width="5540" height="1791" alt="header" src="https://github.com/user-attachments/assets/93c12036-95f8-4729-a948-2a28cd075c1b" />

A full-stack coding education platform for programming labs with real-time code execution, interactive terminal, and AI-powered student analytics.

## Features

### For Students
- **Interactive Code Editor** - Monaco Editor with syntax highlighting for Python, Java, and C++
- **Code Sandbox** - Free coding environment with real-time interactive terminal (WebSocket-based)
- **Activity Submissions** - Submit code against test cases with automatic grading
- **Progress Tracking** - View submission history and scores
- **Session Enrollment** - Join lab sessions based on course/year/section

### For Instructors
- **Lab Session Management** - Create, edit, activate/deactivate lab sessions
- **Activity Builder** - Create coding activities with test cases, difficulty levels, and time limits
- **Test Case Configuration** - Define input/output pairs with visibility settings
- **Real-time Updates** - WebSocket-powered live session updates

### Technical Features
- **Real-time Communication** - Socket.io for live updates and interactive code execution
- **Code Execution** - Judge0 API integration + local execution for sandbox
- **BCNF Database Schema** - Optimized MongoDB schema with proper indexing
- **JWT Authentication** - Secure role-based access control
- **Digital Twin System** - AI-ready student learning analytics (schema implemented)

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, TailwindCSS |
| **Code Editor** | Monaco Editor |
| **Terminal** | xterm.js |
| **Backend** | Node.js, Express |
| **Database** | MongoDB + Mongoose |
| **Real-time** | Socket.io |
| **Auth** | JWT + bcryptjs |
| **Code Execution** | Judge0 API |
| **Icons** | Lucide React |
| **Alerts** | SweetAlert2 |

## Project Structure

```
yourtwin-code/
├── yourtwin-frontend/          # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── contexts/           # React contexts (Auth, Socket)
│   │   ├── pages/              # Page components
│   │   ├── services/           # API services
│   │   └── styles/             # CSS styles
│   └── package.json
│
├── yourtwin-backend/           # Node.js backend
│   ├── src/
│   │   ├── config/             # Database configuration
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Auth & error handling
│   │   ├── models/             # Mongoose models
│   │   ├── routes/             # API routes
│   │   └── utils/              # Socket.io & utilities
│   └── package.json
│
└── README.md
```

---

CURRENTLY IN DEVELOPMENT

