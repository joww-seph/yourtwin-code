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

## Prerequisites

- **Node.js** >= 18.x
- **MongoDB** (local or Atlas)
- **Judge0** API (self-hosted or RapidAPI)
- **Compilers** (for Sandbox): Python 3, Java JDK, g++

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/yourtwin-code.git
cd yourtwin-code
```

### 2. Backend Setup
```bash
cd yourtwin-backend
npm install
```

Create a `.env` file:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/yourtwin

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Judge0 API
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=your-api-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Optional: Compiler paths (Windows)
# GPP_PATH=C:\mingw64\bin\g++.exe
# PYTHON_PATH=python
# JAVAC_PATH=javac
```

### 3. Frontend Setup
```bash
cd yourtwin-frontend
npm install
```

Create a `.env` file (optional):
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Seed the Database (Optional)
```bash
cd yourtwin-backend
npm run seed
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd yourtwin-backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd yourtwin-frontend
npm run dev
```

Access the application at `http://localhost:5173`

### Production Build

**Frontend:**
```bash
cd yourtwin-frontend
npm run build
```

**Backend:**
```bash
cd yourtwin-backend
npm start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | User login |
| `GET /api/auth/me` | Get current user |
| `GET /api/lab-sessions` | List lab sessions |
| `POST /api/lab-sessions` | Create lab session |
| `GET /api/activities/:id` | Get activity details |
| `POST /api/activities` | Create activity |
| `POST /api/submissions` | Submit code |
| `GET /api/submissions/history` | Get submission history |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `sandbox-run` | Client → Server | Execute code in sandbox |
| `sandbox-input` | Client → Server | Send stdin input |
| `sandbox-stop` | Client → Server | Stop execution |
| `sandbox-output` | Server → Client | Receive stdout/stderr |
| `sandbox-done` | Server → Client | Execution completed |
| `session-updated` | Server → Client | Lab session changed |

## Database Models

- **User** - Base user with role (student/instructor)
- **Student** - Student profile with course/year/section
- **Instructor** - Instructor profile with department
- **LabSession** - Scheduled lab sessions
- **Activity** - Coding problems with settings
- **TestCase** - Input/output test cases
- **Submission** - Student code submissions
- **TestResult** - Individual test results
- **StudentTwin** - AI digital twin profile
- **StudentCompetency** - Topic-based competencies
- **SessionEnrollment** - Student-session mapping

## Default Credentials

After seeding:
- **Student:** `student@mmsu.edu.ph` / `student123`
- **Instructor:** `instructor@mmsu.edu.ph` / `instructor123`

## Deployment

### Using Docker (Recommended)

```bash
# Build and run with docker-compose
docker-compose up -d
```

### Manual Deployment

1. Set up MongoDB Atlas or self-hosted MongoDB
2. Deploy backend to Render/Railway/Heroku
3. Deploy frontend to Vercel/Netlify
4. Set up Judge0 on a VPS (optional)
5. Configure environment variables

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Authors

**RamboTeam** - Initial development

---

Built with React, Node.js, and MongoDB
