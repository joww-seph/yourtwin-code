import mongoose from 'mongoose';

const competencySchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true // 'arrays', 'loops', 'functions', etc.
  },
  level: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const studentTwinSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  competencies: [competencySchema],
  behavioralData: {
    avgTypingSpeed: {
      type: Number, // characters per minute
      default: 0
    },
    avgThinkingPause: {
      type: Number, // seconds
      default: 0
    },
    errorFrequency: {
      type: Number,
      default: 0
    },
    aiDependencyScore: {
      type: Number, // 0-1, higher = more dependent
      min: 0,
      max: 1,
      default: 0
    }
  },
  learningVelocity: {
    type: Number, // Rate of improvement
    default: 0
  },
  totalAIRequests: {
    type: Number,
    default: 0
  },
  totalActivitiesCompleted: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Method to update competency
studentTwinSchema.methods.updateCompetency = function(topic, newLevel) {
  const competency = this.competencies.find(c => c.topic === topic);
  
  if (competency) {
    competency.level = newLevel;
    competency.lastUpdated = new Date();
  } else {
    this.competencies.push({
      topic,
      level: newLevel,
      lastUpdated: new Date()
    });
  }
  
  return this.save();
};

// Method to get competency for a topic
studentTwinSchema.methods.getCompetency = function(topic) {
  const competency = this.competencies.find(c => c.topic === topic);
  return competency ? competency.level : 0;
};

const StudentTwin = mongoose.model('StudentTwin', studentTwinSchema);

export default StudentTwin;