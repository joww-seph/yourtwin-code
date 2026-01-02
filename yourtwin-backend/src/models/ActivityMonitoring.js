import mongoose from 'mongoose';

// Schema for tracking individual events
const monitoringEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['focus', 'blur', 'paste', 'blocked_paste', 'idle_start', 'idle_end', 'code_change'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // For paste events
  pasteSize: Number,
  pasteContent: String, // First 100 chars for review
  // For code change events
  lineCount: Number,
  charCount: Number,
  // Duration for blur/idle events (calculated on next focus)
  duration: Number // milliseconds
}, { _id: false });

const activityMonitoringSchema = new mongoose.Schema({
  // Reference to the submission or activity attempt
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  labSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabSession'
  },

  // Summary statistics
  tabSwitchCount: {
    type: Number,
    default: 0
  },
  totalTimeAway: {
    type: Number, // milliseconds
    default: 0
  },
  totalActiveTime: {
    type: Number, // milliseconds
    default: 0
  },

  // Paste tracking
  pasteCount: {
    type: Number,
    default: 0
  },
  largePasteCount: {
    type: Number, // Pastes > 50 chars
    default: 0
  },
  totalPastedChars: {
    type: Number,
    default: 0
  },

  // Idle tracking
  idleCount: {
    type: Number,
    default: 0
  },
  totalIdleTime: {
    type: Number, // milliseconds
    default: 0
  },

  // Blocked paste attempts (in lockdown mode)
  blockedPasteCount: {
    type: Number,
    default: 0
  },

  // Suspicious activity flags
  flags: [{
    type: {
      type: String,
      enum: ['excessive_tab_switches', 'large_paste', 'long_absence', 'rapid_completion', 'copy_paste_pattern', 'blocked_external_paste']
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    }
  }],

  // Detailed event log (for timeline view)
  events: [monitoringEventSchema],

  // Session timing
  startTime: {
    type: Date,
    default: Date.now
  },
  lastEventTime: {
    type: Date,
    default: Date.now
  },

  // Is monitoring active?
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
activityMonitoringSchema.index({ student: 1, activity: 1 });
activityMonitoringSchema.index({ labSession: 1, student: 1 });
activityMonitoringSchema.index({ submission: 1 });
activityMonitoringSchema.index({ 'flags.type': 1 });

// Virtual for time away percentage
activityMonitoringSchema.virtual('timeAwayPercentage').get(function() {
  const totalTime = this.totalActiveTime + this.totalTimeAway;
  if (totalTime === 0) return 0;
  return Math.round((this.totalTimeAway / totalTime) * 100);
});

// Method to add an event
activityMonitoringSchema.methods.addEvent = function(eventData) {
  const event = {
    type: eventData.type,
    timestamp: eventData.timestamp || new Date(),
    pasteSize: eventData.pasteSize,
    pasteContent: eventData.pasteContent?.substring(0, 100),
    lineCount: eventData.lineCount,
    charCount: eventData.charCount,
    duration: eventData.duration
  };

  this.events.push(event);
  this.lastEventTime = event.timestamp;

  // Update summary stats based on event type
  switch (eventData.type) {
    case 'blur':
      this.tabSwitchCount += 1;
      break;
    case 'paste':
      this.pasteCount += 1;
      this.totalPastedChars += eventData.pasteSize || 0;
      if (eventData.pasteSize > 50) {
        this.largePasteCount += 1;
      }
      break;
    case 'blocked_paste':
      this.blockedPasteCount += 1;
      // Immediately flag blocked paste attempts
      if (!this.flags.find(f => f.type === 'blocked_external_paste')) {
        this.flags.push({
          type: 'blocked_external_paste',
          description: `Attempted to paste ${eventData.pasteSize || 0} chars from external source`,
          severity: 'high'
        });
      }
      break;
    case 'idle_start':
      this.idleCount += 1;
      break;
  }

  return this;
};

// Method to update time-away duration when focus returns
activityMonitoringSchema.methods.updateBlurDuration = function(duration) {
  this.totalTimeAway += duration;

  // Check for suspicious long absence (> 5 minutes)
  if (duration > 5 * 60 * 1000) {
    this.flags.push({
      type: 'long_absence',
      description: `Left activity for ${Math.round(duration / 60000)} minutes`,
      severity: duration > 10 * 60 * 1000 ? 'high' : 'medium'
    });
  }
};

// Method to check and flag suspicious patterns
activityMonitoringSchema.methods.checkForSuspiciousPatterns = function() {
  // Excessive tab switches (> 5 in a session is suspicious)
  if (this.tabSwitchCount >= 5 && !this.flags.find(f => f.type === 'excessive_tab_switches')) {
    this.flags.push({
      type: 'excessive_tab_switches',
      description: `${this.tabSwitchCount} tab switches detected`,
      severity: this.tabSwitchCount >= 10 ? 'high' : 'medium'
    });
  } else if (this.tabSwitchCount >= 10) {
    // Upgrade severity if already flagged but count increased
    const existingFlag = this.flags.find(f => f.type === 'excessive_tab_switches');
    if (existingFlag && existingFlag.severity !== 'high') {
      existingFlag.severity = 'high';
      existingFlag.description = `${this.tabSwitchCount} tab switches detected`;
    }
  }

  // Large paste detection (any paste > 50 chars is suspicious)
  if (this.largePasteCount >= 1 && !this.flags.find(f => f.type === 'large_paste')) {
    this.flags.push({
      type: 'large_paste',
      description: `${this.largePasteCount} large paste(s) detected (${this.totalPastedChars} chars total)`,
      severity: this.largePasteCount >= 3 || this.totalPastedChars > 500 ? 'high' : 'medium'
    });
  }

  // High paste to typing ratio (> 100 chars pasted)
  if (this.totalPastedChars > 100 && !this.flags.find(f => f.type === 'copy_paste_pattern')) {
    this.flags.push({
      type: 'copy_paste_pattern',
      description: `${this.totalPastedChars} characters pasted`,
      severity: this.totalPastedChars > 300 ? 'high' : 'medium'
    });
  }

  // High time away percentage (> 30% is concerning, > 50% is high)
  const timeAwayPct = this.timeAwayPercentage;
  if (timeAwayPct >= 30 && !this.flags.find(f => f.type === 'long_absence')) {
    this.flags.push({
      type: 'long_absence',
      description: `${timeAwayPct}% of time spent away from activity`,
      severity: timeAwayPct >= 50 ? 'high' : 'medium'
    });
  }

  return this.flags;
};

// Static method to get or create monitoring record
activityMonitoringSchema.statics.getOrCreate = async function(studentId, activityId, labSessionId = null) {
  let monitoring = await this.findOne({
    student: studentId,
    activity: activityId,
    isActive: true
  });

  if (!monitoring) {
    monitoring = new this({
      student: studentId,
      activity: activityId,
      labSession: labSessionId
    });
    await monitoring.save();
  }

  return monitoring;
};

// Virtual for integrity score (100 = perfect, lower = more suspicious)
activityMonitoringSchema.virtual('integrityScore').get(function() {
  let score = 100;
  const totalSessionTime = this.totalActiveTime + this.totalTimeAway;

  // Deduct for time away (max -30 points)
  const timeAwayPct = this.timeAwayPercentage;
  if (timeAwayPct > 50) score -= 30;
  else if (timeAwayPct > 30) score -= 20;
  else if (timeAwayPct > 15) score -= 10;

  // Deduct for tab switches (max -25 points)
  if (this.tabSwitchCount >= 15) score -= 25;
  else if (this.tabSwitchCount >= 10) score -= 20;
  else if (this.tabSwitchCount >= 5) score -= 10;
  else if (this.tabSwitchCount >= 3) score -= 5;

  // Deduct for large pastes (max -30 points)
  if (this.largePasteCount >= 3) score -= 30;
  else if (this.largePasteCount >= 2) score -= 20;
  else if (this.largePasteCount >= 1) score -= 15;

  // Deduct for blocked paste attempts (severe, -15 points each, max -30)
  if (this.blockedPasteCount > 0) {
    score -= Math.min(this.blockedPasteCount * 15, 30);
  }

  // Deduct for high severity flags (-10 each)
  const highSeverityFlags = this.flags.filter(f => f.severity === 'high').length;
  score -= highSeverityFlags * 10;

  return Math.max(0, Math.min(100, score));
});

// Method to compute final score breakdown
activityMonitoringSchema.methods.computeFinalScore = function() {
  const totalSessionTime = this.totalActiveTime + this.totalTimeAway;
  const sessionDurationMinutes = Math.round(totalSessionTime / 60000);
  const timeAwayMinutes = Math.round(this.totalTimeAway / 60000);

  return {
    integrityScore: this.integrityScore,
    breakdown: {
      sessionDuration: {
        total: sessionDurationMinutes,
        active: sessionDurationMinutes - timeAwayMinutes,
        away: timeAwayMinutes,
        awayPercentage: this.timeAwayPercentage
      },
      behavior: {
        tabSwitches: this.tabSwitchCount,
        totalPastes: this.pasteCount,
        largePastes: this.largePasteCount,
        blockedPastes: this.blockedPasteCount,
        totalPastedChars: this.totalPastedChars
      },
      flags: this.flags.map(f => ({
        type: f.type,
        severity: f.severity,
        description: f.description
      })),
      highSeverityCount: this.flags.filter(f => f.severity === 'high').length
    },
    summary: this.integrityScore >= 80 ? 'Good' :
             this.integrityScore >= 60 ? 'Moderate Concerns' :
             this.integrityScore >= 40 ? 'Significant Concerns' : 'Review Required'
  };
};

// Include virtuals when converting to JSON
activityMonitoringSchema.set('toJSON', { virtuals: true });
activityMonitoringSchema.set('toObject', { virtuals: true });

const ActivityMonitoring = mongoose.model('ActivityMonitoring', activityMonitoringSchema);

export default ActivityMonitoring;
