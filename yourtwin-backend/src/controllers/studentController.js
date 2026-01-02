import Student from '../models/Student.js';
import User from '../models/User.js';
import StudentTwin from '../models/StudentTwin.js';
import StudentCompetency from '../models/StudentCompetency.js';

// @desc    Search and filter students
// @route   GET /api/students/search
export const searchStudents = async (req, res) => {
  try {
    const { q, course, yearLevel, section } = req.query;
    const filter = {};

    // Filter by course
    if (course) {
      filter.course = course.toUpperCase();
    }

    // Filter by year level
    if (yearLevel) {
      filter.yearLevel = parseInt(yearLevel);
    }

    // Filter by section
    if (section) {
      filter.section = section.toUpperCase();
    }

    // Find students with user info
    let students = await Student.find(filter)
      .populate('userId', 'firstName lastName middleName email')
      .sort({ 'userId.lastName': 1, 'userId.firstName': 1 })
      .limit(100);

    // Filter by search query
    if (q) {
      const regex = new RegExp(q, 'i');
      students = students.filter(s =>
        regex.test(s.userId.firstName) ||
        regex.test(s.userId.lastName) ||
        regex.test(s.userId.middleName || '') ||
        regex.test(s.studentId)
      );
    }

    // Format response
    const formattedStudents = students.map(s => ({
      _id: s._id,
      firstName: s.userId.firstName,
      lastName: s.userId.lastName,
      middleName: s.userId.middleName,
      email: s.userId.email,
      studentId: s.studentId,
      course: s.course,
      section: s.section,
      yearLevel: s.yearLevel,
      createdAt: s.createdAt
    }));

    res.json({
      success: true,
      count: formattedStudents.length,
      data: formattedStudents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search students',
      error: error.message
    });
  }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
export const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('userId', 'firstName lastName middleName email');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: {
        _id: student._id,
        firstName: student.userId.firstName,
        lastName: student.userId.lastName,
        middleName: student.userId.middleName,
        email: student.userId.email,
        studentId: student.studentId,
        course: student.course,
        section: student.section,
        yearLevel: student.yearLevel
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student',
      error: error.message
    });
  }
};

// @desc    Get my profile with twin and competency data
// @route   GET /api/students/me/profile
export const getMyProfile = async (req, res) => {
  try {
    // Get student profile
    const studentProfile = await Student.findOne({ userId: req.user._id })
      .populate('userId', 'firstName lastName email');

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Get or create student twin
    const twin = await StudentTwin.getOrCreate(studentProfile._id);

    // Get all competencies
    const competencies = await StudentCompetency.find({ studentId: studentProfile._id })
      .sort({ proficiencyLevel: -1 });

    // Format competencies for visualization
    const formattedCompetencies = competencies.map(c => ({
      topic: c.topic,
      proficiencyLevel: c.proficiencyLevel,
      totalAttempts: c.totalAttempts,
      successfulAttempts: c.successfulAttempts,
      successRate: c.totalAttempts > 0
        ? Math.round((c.successfulAttempts / c.totalAttempts) * 100)
        : 0,
      lastAttemptAt: c.lastAttemptAt
    }));

    res.json({
      success: true,
      data: {
        profile: {
          _id: studentProfile._id,
          studentId: studentProfile.studentId,
          course: studentProfile.course,
          section: studentProfile.section,
          yearLevel: studentProfile.yearLevel,
          firstName: studentProfile.userId.firstName,
          lastName: studentProfile.userId.lastName,
          email: studentProfile.userId.email
        },
        twin: {
          personality: twin.personality,
          preferredDifficulty: twin.preferredDifficulty,
          averageTimePerProblem: twin.averageTimePerProblem,
          strengths: twin.strengths,
          weaknesses: twin.weaknesses,
          recommendedTopics: twin.recommendedTopics,
          behavioralData: twin.behavioralData,
          learningVelocity: twin.learningVelocity,
          totalAIRequests: twin.totalAIRequests,
          totalActivitiesCompleted: twin.totalActivitiesCompleted,
          totalActivitiesAttempted: twin.totalActivitiesAttempted,
          lastActivityDate: twin.lastActivityDate
        },
        competencies: formattedCompetencies
      }
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// @desc    Get all students (with pagination)
// @route   GET /api/students
export const getAllStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const students = await Student.find()
      .populate('userId', 'firstName lastName middleName email')
      .skip(skip)
      .limit(limit);

    const total = await Student.countDocuments();

    // Format response
    const formattedStudents = students.map(s => ({
      _id: s._id,
      firstName: s.userId.firstName,
      lastName: s.userId.lastName,
      middleName: s.userId.middleName,
      email: s.userId.email,
      studentId: s.studentId,
      course: s.course,
      section: s.section,
      yearLevel: s.yearLevel
    }));

    res.json({
      success: true,
      count: formattedStudents.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formattedStudents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};
