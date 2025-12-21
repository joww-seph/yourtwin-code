import Student from '../models/Student.js';
import User from '../models/User.js';

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
