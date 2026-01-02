import mongoose from 'mongoose';

/**
 * CodeSnapshot Model
 * Stores periodic snapshots of student code during activity sessions.
 * Used for code revision analysis and detecting coding patterns.
 */
const codeSnapshotSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true,
    index: true
  },
  labSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabSession',
    index: true
  },
  // The code at this snapshot
  code: {
    type: String,
    required: true,
    maxlength: 100000
  },
  // Snapshot metadata
  language: {
    type: String,
    required: true
  },
  snapshotType: {
    type: String,
    enum: ['auto', 'submit', 'run', 'hint_request', 'manual', 'draft'],
    default: 'auto'
  },
  // Code metrics at snapshot time
  metrics: {
    lineCount: { type: Number, default: 0 },
    charCount: { type: Number, default: 0 },
    syntaxErrors: { type: Number, default: 0 }
  },
  // Diff from previous snapshot
  diffFromPrevious: {
    linesAdded: { type: Number, default: 0 },
    linesRemoved: { type: Number, default: 0 },
    linesModified: { type: Number, default: 0 },
    timeSincePrevious: { type: Number, default: 0 } // seconds
  },
  // Behavioral context
  behavioralContext: {
    keystrokesSinceLastSnapshot: { type: Number, default: 0 },
    pasteEventsSinceLastSnapshot: { type: Number, default: 0 },
    idleTimeSinceLastSnapshot: { type: Number, default: 0 } // seconds
  },
  // Sequence number within activity session
  sequenceNumber: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Compound indexes
codeSnapshotSchema.index({ studentId: 1, activityId: 1, createdAt: -1 });
codeSnapshotSchema.index({ activityId: 1, createdAt: -1 });

/**
 * Get the latest snapshot for a student-activity pair
 */
codeSnapshotSchema.statics.getLatest = async function(studentId, activityId) {
  return this.findOne({ studentId, activityId })
    .sort({ createdAt: -1 });
};

/**
 * Get all snapshots for analysis
 */
codeSnapshotSchema.statics.getSnapshotsForActivity = async function(studentId, activityId) {
  return this.find({ studentId, activityId })
    .sort({ createdAt: 1 })
    .select('code metrics diffFromPrevious snapshotType createdAt sequenceNumber');
};

/**
 * Calculate diff between two code strings
 */
codeSnapshotSchema.statics.calculateDiff = function(oldCode, newCode) {
  const oldLines = (oldCode || '').split('\n');
  const newLines = (newCode || '').split('\n');

  let linesAdded = 0;
  let linesRemoved = 0;
  let linesModified = 0;

  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      linesAdded++;
    } else if (oldLine !== undefined && newLine === undefined) {
      linesRemoved++;
    } else if (oldLine !== newLine) {
      linesModified++;
    }
  }

  return { linesAdded, linesRemoved, linesModified };
};

/**
 * Create a new snapshot with automatic diff calculation
 */
codeSnapshotSchema.statics.createSnapshot = async function(data) {
  const {
    studentId,
    activityId,
    labSessionId,
    code,
    language,
    snapshotType = 'auto',
    behavioralContext = {}
  } = data;

  // Get previous snapshot
  const previousSnapshot = await this.getLatest(studentId, activityId);

  // Calculate sequence number
  const sequenceNumber = previousSnapshot ? previousSnapshot.sequenceNumber + 1 : 1;

  // Calculate code metrics
  const lines = code.split('\n');
  const metrics = {
    lineCount: lines.length,
    charCount: code.length,
    syntaxErrors: 0 // Could be enhanced with actual syntax checking
  };

  // Calculate diff from previous
  let diffFromPrevious = { linesAdded: 0, linesRemoved: 0, linesModified: 0, timeSincePrevious: 0 };
  if (previousSnapshot) {
    const diff = this.calculateDiff(previousSnapshot.code, code);
    diffFromPrevious = {
      ...diff,
      timeSincePrevious: Math.round((Date.now() - previousSnapshot.createdAt.getTime()) / 1000)
    };
  }

  return this.create({
    studentId,
    activityId,
    labSessionId,
    code,
    language,
    snapshotType,
    metrics,
    diffFromPrevious,
    behavioralContext,
    sequenceNumber
  });
};

/**
 * Analyze code revision patterns for a student-activity pair
 */
codeSnapshotSchema.statics.analyzeRevisionPatterns = async function(studentId, activityId) {
  const snapshots = await this.getSnapshotsForActivity(studentId, activityId);

  if (snapshots.length < 2) {
    return {
      totalSnapshots: snapshots.length,
      avgLinesPerSnapshot: 0,
      totalLinesAdded: 0,
      totalLinesRemoved: 0,
      totalLinesModified: 0,
      revisionFrequency: 0,
      codingPattern: 'insufficient_data'
    };
  }

  // Calculate totals
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  let totalLinesModified = 0;
  let totalLineCount = 0;

  snapshots.forEach(snapshot => {
    totalLinesAdded += snapshot.diffFromPrevious.linesAdded;
    totalLinesRemoved += snapshot.diffFromPrevious.linesRemoved;
    totalLinesModified += snapshot.diffFromPrevious.linesModified;
    totalLineCount += snapshot.metrics.lineCount;
  });

  // Calculate time span
  const timeSpanMinutes = (snapshots[snapshots.length - 1].createdAt - snapshots[0].createdAt) / 60000;
  const revisionFrequency = timeSpanMinutes > 0 ? snapshots.length / timeSpanMinutes : 0;

  // Determine coding pattern
  let codingPattern = 'balanced';
  const totalChanges = totalLinesAdded + totalLinesRemoved + totalLinesModified;

  if (totalLinesRemoved > totalLinesAdded * 1.5) {
    codingPattern = 'iterative_refiner'; // Removes more than adds = refining approach
  } else if (totalLinesAdded > totalLinesModified * 2) {
    codingPattern = 'incremental_builder'; // Adds progressively
  } else if (totalLinesModified > totalLinesAdded) {
    codingPattern = 'modifier'; // Modifies existing code frequently
  }

  return {
    totalSnapshots: snapshots.length,
    avgLinesPerSnapshot: Math.round(totalLineCount / snapshots.length),
    totalLinesAdded,
    totalLinesRemoved,
    totalLinesModified,
    revisionFrequency: Math.round(revisionFrequency * 100) / 100,
    timeSpanMinutes: Math.round(timeSpanMinutes),
    codingPattern
  };
};

const CodeSnapshot = mongoose.model('CodeSnapshot', codeSnapshotSchema);

export default CodeSnapshot;
