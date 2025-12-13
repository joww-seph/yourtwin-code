import User from '../models/User.js';
import StudentTwin from '../models/StudentTwin.js';

// @desc    Register new user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      middleName, 
      email, 
      password, 
      role, 
      studentId, 
      course, 
      section, 
      yearLevel,
      employeeId,
      department
    } = req.body;
    
    // Check if user exists by email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if student ID exists (for students)
    if (role === 'student' && studentId) {
      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already registered'
        });
      }
    }

    // Check if employee ID exists (for instructors)
    if (role === 'instructor' && employeeId) {
      const existingInstructor = await User.findOne({ employeeId });
      if (existingInstructor) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already registered'
        });
      }
    }
    
    // Create user
    const userData = {
      firstName,
      lastName,
      middleName,
      email,
      password,
      role: role || 'student'
    };

    // Add role-specific fields
    if (role === 'student') {
      userData.studentId = studentId;
      userData.course = course;
      userData.section = section;
      userData.yearLevel = yearLevel;
    } else if (role === 'instructor') {
      userData.employeeId = employeeId;
      userData.department = department;
    }

    const user = await User.create(userData);
    
    // If student, create digital twin
    if (user.role === 'student') {
      await StudentTwin.create({
        student: user._id,
        competencies: [],
        behavioralData: {}
      });
    }
    
    // Generate token
    const token = user.generateAuthToken();
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          course: user.course,
          section: user.section,
          yearLevel: user.yearLevel
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// @desc    Login user (email or student ID)
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or studentId
    
    // Find user by email or studentId
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { studentId: identifier },
        { employeeId: identifier }
      ]
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = user.generateAuthToken();
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          fullName: user.fullName,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          course: user.course,
          section: user.section,
          yearLevel: user.yearLevel,
          employeeId: user.employeeId,
          department: user.department
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, middleName, password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update name fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (middleName !== undefined) user.middleName = middleName; // Allow empty string

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      user.password = password;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          fullName: user.fullName,
          displayName: user.displayName,
          email: user.email
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // If student, include twin data
    let twinData = null;
    if (user.role === 'student') {
      twinData = await StudentTwin.findOne({ student: user._id });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          fullName: user.fullName,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          course: user.course,
          section: user.section,
          yearLevel: user.yearLevel,
          employeeId: user.employeeId,
          department: user.department
        },
        twin: twinData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
      error: error.message
    });
  }
};