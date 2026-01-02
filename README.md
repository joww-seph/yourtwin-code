# YourTwin: CODE

<img width="5540" height="1791" alt="header" src="https://github.com/user-attachments/assets/93c12036-95f8-4729-a948-2a28cd075c1b" />

A full-stack coding education platform for programming labs with real-time code execution, interactive terminal, AI-powered student analytics, and MindSpore-based machine learning for predictive insights.

## Features

### For Students
- **Interactive Code Editor** - Monaco Editor with syntax highlighting for Python, Java, and C++
- **Code Sandbox** - Free coding environment with real-time interactive terminal (WebSocket-based)
- **Activity Submissions** - Submit code against test cases with automatic grading
- **Progress Tracking** - View submission history and scores
- **Session Enrollment** - Join lab sessions based on course/year/section
- **AI-Powered Hints** - Shadow Twin AI assistant with progressive hint levels

### For Instructors
- **Lab Session Management** - Create, edit, activate/deactivate lab sessions
- **Activity Builder** - Create coding activities with test cases, difficulty levels, and time limits
- **Test Case Configuration** - Define input/output pairs with visibility settings
- **Real-time Monitoring** - Live student activity tracking with integrity scoring
- **Analytics Dashboard** - Student performance metrics and AI usage analytics

### ML-Powered Features (MindSpore)
- **Success Prediction** - LSTM + Attention model predicts student success probability
- **Anomaly Detection** - VAE-based detection of unusual learning patterns
- **Learning Path Optimization** - DQN agent recommends optimal activity sequences
- **Knowledge Graph** - GAT model for student-topic-activity relationships

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
| **AI (Local)** | Ollama (llama3.2) |
| **AI (Cloud)** | Google Gemini |
| **Code Execution** | Judge0 API |
| **ML Framework** | MindSpore 2.7.1 |
| **ML API** | Flask + Python 3.11 |
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
│   │   ├── services/           # AI & business logic
│   │   └── utils/              # Socket.io & utilities
│   └── package.json
│
├── yourtwin-ml/                # MindSpore ML Service
│   ├── src/
│   │   ├── api/                # Flask REST API
│   │   ├── models/             # Neural network models
│   │   ├── training/           # Training pipeline
│   │   ├── inference/          # Model inference
│   │   ├── features/           # Feature extraction
│   │   └── utils/              # Model registry
│   ├── config/                 # Configuration files
│   └── requirements.txt        # Python dependencies
│
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11
- MongoDB
- Ollama (optional, for local AI)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/yourtwin-code.git
   cd yourtwin-code
   ```

2. **Install Backend Dependencies**
   ```bash
   cd yourtwin-backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd yourtwin-frontend
   npm install
   ```

4. **Setup ML Service**
   ```bash
   cd yourtwin-ml

   # Create virtual environment (Python 3.11)
   py -3.11 -m venv venv                    # Windows
   python3.11 -m venv venv                  # Linux/Mac

   # Activate virtual environment
   .\venv\Scripts\activate                  # Windows
   source venv/bin/activate                 # Linux/Mac

   # Install dependencies
   pip install -r requirements.txt

   # Install MindSpore
   pip install mindspore==2.7.1 -i https://repo.mindspore.cn/pypi/simple --trusted-host repo.mindspore.cn --extra-index-url https://repo.huaweicloud.com/repository/pypi/simple
   ```

5. **Configure Environment**
   - Copy `.env.example` to `.env` in both frontend and backend
   - Set MongoDB URI, JWT secret, and API keys

### Running the Application

You need three terminal windows to run all services:

**Terminal 1 - Backend (Port 5000)**
```bash
cd yourtwin-backend
npm run dev
```

**Terminal 2 - Frontend (Port 5173)**
```bash
cd yourtwin-frontend
npm run dev
```

**Terminal 3 - ML Service (Port 5001)**
```bash
cd yourtwin-ml
.\venv\Scripts\activate                  # Windows
source venv/bin/activate                 # Linux/Mac
python src/api/app.py
```

## ML Service API

The MindSpore ML service provides REST endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/api/predict/success` | POST | Predict student success probability |
| `/api/learning-path` | POST | Get optimal learning path |
| `/api/anomaly/check` | POST | Detect behavioral anomalies |
| `/api/hint/personalized` | POST | Get personalized hint suggestions |

### Example Request
```bash
curl -X POST http://localhost:5001/api/predict/success \
  -H "Content-Type: application/json" \
  -d '{"studentId": "abc123", "activityId": "def456"}'
```

### Example Response
```json
{
  "probability": 0.75,
  "confidence": 0.85,
  "contributing_factors": [
    {"name": "High Success Rate", "impact": "positive", "value": "78%"}
  ],
  "risk_level": "low",
  "model_version": "v1.0.0"
}
```

## ML Models

### 1. StudentBehaviorModel (LSTM + Attention)
Predicts success probability based on behavioral sequences:
- Typing patterns, thinking pauses
- Performance history
- AI interaction patterns

### 2. BehaviorVAE (Anomaly Detection)
Detects unusual learning patterns:
- Copy-paste spikes
- Unusual session durations
- AI dependency anomalies

### 3. LearningPathAgent (DQN)
Recommends optimal activity sequences:
- State: Student competencies + profile
- Action: Next activity to recommend
- Reward: Learning gain

### 4. KnowledgeGraphModel (GAT)
Models relationships between entities:
- Students ↔ Topics (proficiency)
- Activities → Topics (teaches)
- Topics → Topics (prerequisites)

---

## License

MIT License - See LICENSE file for details.

---

**CURRENTLY IN DEVELOPMENT**
