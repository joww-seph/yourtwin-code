import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    default: ''
  },
  expectedOutput: {
    type: String,
    required: true
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    default: 1
  }
});

const activitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['practice', 'final'],
    default: 'practice'
  },
  language: {
    type: String,
    enum: ['cpp', 'java', 'python'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  topic: {
    type: String,
    required: true // e.g., 'arrays', 'loops', 'functions'
  },
  starterCode: {
    type: String,
    default: ''
  },
  testCases: [testCaseSchema],
  aiAssistanceLevel: {
    type: Number,
    min: 0, // 0 = lockdown, 5 = full assistance
    max: 5,
    default: 5
  },
  timeLimit: {
    type: Number, // in minutes
    default: 60
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;