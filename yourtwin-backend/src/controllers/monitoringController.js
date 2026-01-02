import ActivityMonitoring from '../models/ActivityMonitoring.js';
import Submission from '../models/Submission.js';
import { emitMonitoringUpdate, emitFlagAlert, emitStudentActivity } from '../utils/socket.js';

// Start or get monitoring session for an activity
export const startMonitoring = async (req, res) => {
  try {
    const { activityId, labSessionId } = req.body;
    const studentId = req.user._id;

    const monitoring = await ActivityMonitoring.getOrCreate(studentId, activityId, labSessionId);

    res.json({
      success: true,
      monitoringId: monitoring._id,
      message: 'Monitoring session started'
    });
  } catch (error) {
    console.error('Start monitoring error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Record a monitoring event (blur, focus, paste, etc.)
export const recordEvent = async (req, res) => {
  try {
    const { monitoringId, event } = req.body;

    const monitoring = await ActivityMonitoring.findById(monitoringId);
    if (!monitoring) {
      return res.status(404).json({ success: false, message: 'Monitoring session not found' });
    }

    // Verify the student owns this monitoring session
    if (monitoring.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Add the event
    monitoring.addEvent(event);

    // If it's a focus event after blur, calculate the duration
    if (event.type === 'focus' && event.blurDuration) {
      monitoring.updateBlurDuration(event.blurDuration);
    }

    // If it's an idle_end event, update idle time
    if (event.type === 'idle_end' && event.idleDuration) {
      monitoring.totalIdleTime += event.idleDuration;
    }

    // Check for suspicious patterns
    monitoring.checkForSuspiciousPatterns();

    await monitoring.save();

    res.json({
      success: true,
      stats: {
        tabSwitchCount: monitoring.tabSwitchCount,
        pasteCount: monitoring.pasteCount,
        timeAwayPercentage: monitoring.timeAwayPercentage
      }
    });
  } catch (error) {
    console.error('Record event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Batch record multiple events (more efficient)
export const recordEvents = async (req, res) => {
  try {
    const { monitoringId, events } = req.body;

    const monitoring = await ActivityMonitoring.findById(monitoringId)
      .populate('student', 'firstName lastName studentId');
    if (!monitoring) {
      return res.status(404).json({ success: false, message: 'Monitoring session not found' });
    }

    if (monitoring.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const previousFlagCount = monitoring.flags.length;

    // Process all events
    for (const event of events) {
      monitoring.addEvent(event);

      if (event.type === 'focus' && event.blurDuration) {
        monitoring.updateBlurDuration(event.blurDuration);
      }

      if (event.type === 'idle_end' && event.idleDuration) {
        monitoring.totalIdleTime += event.idleDuration;
      }
    }

    monitoring.checkForSuspiciousPatterns();
    await monitoring.save();

    // Emit WebSocket events for real-time updates
    if (monitoring.labSession) {
      // Emit activity update
      emitStudentActivity(monitoring.labSession.toString(), {
        studentId: monitoring.student._id,
        studentName: `${monitoring.student.firstName} ${monitoring.student.lastName}`,
        activityId: monitoring.activity,
        tabSwitchCount: monitoring.tabSwitchCount,
        pasteCount: monitoring.pasteCount,
        largePasteCount: monitoring.largePasteCount,
        timeAwayPercentage: monitoring.timeAwayPercentage,
        totalTimeAway: monitoring.totalTimeAway,
        integrityScore: monitoring.integrityScore,
        eventTypes: events.map(e => e.type)
      });

      // Emit flag alerts for new flags
      if (monitoring.flags.length > previousFlagCount) {
        const newFlags = monitoring.flags.slice(previousFlagCount);
        for (const flag of newFlags) {
          emitFlagAlert(monitoring.labSession.toString(), {
            studentId: monitoring.student._id,
            studentName: `${monitoring.student.firstName} ${monitoring.student.lastName}`,
            activityId: monitoring.activity,
            flagType: flag.type,
            severity: flag.severity,
            description: flag.description
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Record events error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// End monitoring session
export const endMonitoring = async (req, res) => {
  try {
    const { monitoringId, totalActiveTime } = req.body;

    const monitoring = await ActivityMonitoring.findById(monitoringId);
    if (!monitoring) {
      return res.status(404).json({ success: false, message: 'Monitoring session not found' });
    }

    if (monitoring.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    monitoring.totalActiveTime = totalActiveTime || 0;
    monitoring.isActive = false;
    monitoring.checkForSuspiciousPatterns();

    await monitoring.save();

    res.json({
      success: true,
      summary: {
        tabSwitchCount: monitoring.tabSwitchCount,
        pasteCount: monitoring.pasteCount,
        largePasteCount: monitoring.largePasteCount,
        totalTimeAway: monitoring.totalTimeAway,
        timeAwayPercentage: monitoring.timeAwayPercentage,
        flags: monitoring.flags
      }
    });
  } catch (error) {
    console.error('End monitoring error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get monitoring data for a specific activity/student (for student self-view)
export const getMyMonitoring = async (req, res) => {
  try {
    const { activityId } = req.params;
    const studentId = req.user._id;

    const monitoring = await ActivityMonitoring.findOne({
      student: studentId,
      activity: activityId
    }).sort({ createdAt: -1 });

    if (!monitoring) {
      return res.json({ success: true, monitoring: null });
    }

    res.json({
      success: true,
      monitoring: {
        tabSwitchCount: monitoring.tabSwitchCount,
        pasteCount: monitoring.pasteCount,
        timeAwayPercentage: monitoring.timeAwayPercentage,
        totalActiveTime: monitoring.totalActiveTime,
        totalTimeAway: monitoring.totalTimeAway
      }
    });
  } catch (error) {
    console.error('Get my monitoring error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// INSTRUCTOR ENDPOINTS

// Get monitoring data for a lab session
export const getSessionMonitoring = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const monitoringData = await ActivityMonitoring.find({
      labSession: sessionId
    })
      .populate('student', 'firstName lastName studentId')
      .populate('activity', 'title')
      .sort({ lastEventTime: -1 });

    // Group by student
    const studentData = {};
    const now = Date.now();
    for (const m of monitoringData) {
      const studentKey = m.student._id.toString();
      if (!studentData[studentKey]) {
        studentData[studentKey] = {
          student: m.student,
          activities: [],
          totalTabSwitches: 0,
          totalPastes: 0,
          totalLargePastes: 0,
          hasFlags: false,
          lastEventTime: null,
          status: 'offline' // Will be computed based on lastEventTime
        };
      }

      // Track the most recent event time
      if (m.lastEventTime) {
        if (!studentData[studentKey].lastEventTime || m.lastEventTime > studentData[studentKey].lastEventTime) {
          studentData[studentKey].lastEventTime = m.lastEventTime;
        }
      }

      studentData[studentKey].activities.push({
        activity: m.activity,
        tabSwitchCount: m.tabSwitchCount,
        pasteCount: m.pasteCount,
        largePasteCount: m.largePasteCount,
        timeAwayPercentage: m.timeAwayPercentage,
        totalTimeAway: m.totalTimeAway || 0, // Raw time in milliseconds
        totalActiveTime: m.totalActiveTime || 0, // Total session time
        integrityScore: m.integrityScore, // Computed integrity score
        isActive: m.isActive,
        flags: m.flags,
        // Will be populated with submission validation data
        submissionValidation: null
      });
      studentData[studentKey].totalTabSwitches += m.tabSwitchCount;
      studentData[studentKey].totalPastes += m.pasteCount;
      studentData[studentKey].totalLargePastes += m.largePasteCount;
      if (m.flags.length > 0) studentData[studentKey].hasFlags = true;
    }

    // Compute status for each student based on last event time
    for (const key of Object.keys(studentData)) {
      const sd = studentData[key];
      if (sd.lastEventTime) {
        const timeSinceLastEvent = now - new Date(sd.lastEventTime).getTime();
        if (timeSinceLastEvent < 60000) { // Active within last minute
          sd.status = 'active';
        } else if (timeSinceLastEvent < 300000) { // Within last 5 minutes
          sd.status = 'idle';
        } else {
          sd.status = 'away';
        }
      }
    }

    // Fetch submission validation data for the session
    // Note: Submission.studentId references Student collection, but ActivityMonitoring.student references User collection
    // We need to populate studentId to get the Student document, then use Student.userId to match
    const submissions = await Submission.find({
      labSessionId: sessionId,
      status: 'passed'
    })
      .populate('studentId', 'userId') // Get the Student's userId (which is the User._id)
      .select('studentId activityId validationStatus codeAnalysis.aiValidation codeAnalysis.isSuspicious');

    // Map submissions to student activities
    for (const submission of submissions) {
      // Use the Student's userId (User._id) to match with ActivityMonitoring.student
      const userIdFromStudent = submission.studentId?.userId?.toString();
      if (!userIdFromStudent) continue;

      if (studentData[userIdFromStudent]) {
        const activity = studentData[userIdFromStudent].activities.find(
          a => a.activity?._id.toString() === submission.activityId.toString()
        );
        if (activity) {
          activity.submissionValidation = {
            status: submission.validationStatus,
            isSuspicious: submission.codeAnalysis?.isSuspicious || false,
            aiValidation: submission.codeAnalysis?.aiValidation || null
          };
          // Mark student as having flags if AI flagged their submission
          if (submission.validationStatus === 'flagged') {
            studentData[userIdFromStudent].hasFlags = true;
          }
        }
      }
    }

    res.json({
      success: true,
      students: Object.values(studentData)
    });
  } catch (error) {
    console.error('Get session monitoring error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get detailed monitoring for a specific student/activity (instructor view)
export const getStudentActivityMonitoring = async (req, res) => {
  try {
    const { activityId, studentId } = req.params;

    const monitoring = await ActivityMonitoring.findOne({
      student: studentId,
      activity: activityId
    })
      .populate('student', 'firstName lastName studentId')
      .populate('activity', 'title');

    if (!monitoring) {
      return res.json({ success: true, monitoring: null });
    }

    res.json({
      success: true,
      monitoring: {
        student: monitoring.student,
        activity: monitoring.activity,
        tabSwitchCount: monitoring.tabSwitchCount,
        pasteCount: monitoring.pasteCount,
        largePasteCount: monitoring.largePasteCount,
        totalPastedChars: monitoring.totalPastedChars,
        totalTimeAway: monitoring.totalTimeAway,
        totalActiveTime: monitoring.totalActiveTime,
        timeAwayPercentage: monitoring.timeAwayPercentage,
        idleCount: monitoring.idleCount,
        totalIdleTime: monitoring.totalIdleTime,
        flags: monitoring.flags,
        events: monitoring.events, // Full timeline
        startTime: monitoring.startTime,
        lastEventTime: monitoring.lastEventTime
      }
    });
  } catch (error) {
    console.error('Get student activity monitoring error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get students with suspicious activity flags
export const getFlaggedStudents = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get activity-monitoring flagged students
    const flaggedMonitoring = await ActivityMonitoring.find({
      labSession: sessionId,
      'flags.0': { $exists: true } // Has at least one flag
    })
      .populate('student', 'firstName lastName studentId')
      .populate('activity', 'title')
      .sort({ 'flags.severity': -1 });

    const flaggedStudents = flaggedMonitoring.map(m => ({
      student: m.student,
      activity: m.activity,
      flags: m.flags,
      tabSwitchCount: m.tabSwitchCount,
      pasteCount: m.pasteCount,
      timeAwayPercentage: m.timeAwayPercentage,
      flagType: 'behavioral'
    }));

    // Also get AI-flagged submissions
    const aiFlaggedSubmissions = await Submission.find({
      labSessionId: sessionId,
      validationStatus: 'flagged'
    })
      .populate({
        path: 'studentId',
        select: 'userId studentId',
        populate: { path: 'userId', select: 'firstName lastName' }
      })
      .populate('activityId', 'title')
      .select('studentId activityId validationStatus codeAnalysis.aiValidation');

    // Add AI-flagged submissions to the list
    for (const submission of aiFlaggedSubmissions) {
      const user = submission.studentId?.userId;
      if (!user) continue;

      flaggedStudents.push({
        student: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          studentId: submission.studentId.studentId
        },
        activity: submission.activityId,
        flags: [{
          type: 'ai_detected_workaround',
          severity: submission.codeAnalysis?.aiValidation?.confidence >= 85 ? 'high' : 'medium',
          description: submission.codeAnalysis?.aiValidation?.issues?.join(', ') ||
                      submission.codeAnalysis?.aiValidation?.explanation ||
                      'AI detected potential workaround'
        }],
        aiValidation: submission.codeAnalysis?.aiValidation,
        flagType: 'ai_validation'
      });
    }

    res.json({
      success: true,
      flaggedStudents
    });
  } catch (error) {
    console.error('Get flagged students error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
