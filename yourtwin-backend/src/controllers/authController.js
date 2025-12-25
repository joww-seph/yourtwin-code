import User from '../models/User.js';
import Student from '../models/Student.js';
import Instructor from '../models/Instructor.js';
import StudentTwin from '../models/StudentTwin.js';
import crypto from 'crypto';

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

    // Check role-specific unique constraints
    if (role === 'student' && studentId) {
      const existingStudent = await Student.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already registered'
        });
      }
    }

    if (role === 'instructor' && employeeId) {
      const existingInstructor = await Instructor.findOne({ employeeId });
      if (existingInstructor) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already registered'
        });
      }
    }

    // Create base user
    const user = await User.create({
      firstName,
      lastName,
      middleName,
      email,
      password,
      role: role || 'student'
    });

    let profileData = null;

    // Create role-specific profile
    if (user.role === 'student') {
      const student = await Student.create({
        userId: user._id,
        studentId,
        course,
        section,
        yearLevel
      });
      profileData = student;

      // Create digital twin for student
      await StudentTwin.create({
        studentId: student._id
      });
    } else if (user.role === 'instructor') {
      const instructor = await Instructor.create({
        userId: user._id,
        employeeId,
        department: department || 'CCIS'
      });
      profileData = instructor;
    }

    // Generate token
    const token = user.generateAuthToken();

    // Build response based on role
    const responseData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    if (user.role === 'student' && profileData) {
      responseData.studentId = profileData.studentId;
      responseData.course = profileData.course;
      responseData.section = profileData.section;
      responseData.yearLevel = profileData.yearLevel;
      responseData.studentProfileId = profileData._id;
    } else if (user.role === 'instructor' && profileData) {
      responseData.employeeId = profileData.employeeId;
      responseData.department = profileData.department;
      responseData.instructorProfileId = profileData._id;
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: responseData,
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

// @desc    Login user (email or student ID or employee ID)
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { identifier, password, rememberMe = false } = req.body;

    // First, try to find by email
    let user = await User.findOne({ email: identifier }).select('+password');

    // If not found by email, try studentId or employeeId
    if (!user) {
      // Check if it's a student ID
      const student = await Student.findOne({ studentId: identifier });
      if (student) {
        user = await User.findById(student.userId).select('+password');
      }
    }

    if (!user) {
      // Check if it's an employee ID
      const instructor = await Instructor.findOne({ employeeId: identifier });
      if (instructor) {
        user = await User.findById(instructor.userId).select('+password');
      }
    }

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

    // Get role-specific profile
    let profileData = null;
    if (user.role === 'student') {
      profileData = await Student.findOne({ userId: user._id });
    } else if (user.role === 'instructor') {
      profileData = await Instructor.findOne({ userId: user._id });
    }

    // Generate token with rememberMe option
    const token = user.generateAuthToken(rememberMe);

    // Build response
    const responseData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      fullName: user.fullName,
      displayName: user.displayName,
      email: user.email,
      role: user.role
    };

    if (user.role === 'student' && profileData) {
      responseData.studentId = profileData.studentId;
      responseData.course = profileData.course;
      responseData.section = profileData.section;
      responseData.yearLevel = profileData.yearLevel;
      responseData.studentProfileId = profileData._id;
    } else if (user.role === 'instructor' && profileData) {
      responseData.employeeId = profileData.employeeId;
      responseData.department = profileData.department;
      responseData.instructorProfileId = profileData._id;
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: responseData,
        token,
        expiresIn: rememberMe ? '30d' : '24h'
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

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;

    // Find user by email, studentId, or employeeId
    let user = await User.findOne({ email: identifier });

    if (!user) {
      const student = await Student.findOne({ studentId: identifier });
      if (student) {
        user = await User.findById(student.userId);
      }
    }

    if (!user) {
      const instructor = await Instructor.findOne({ employeeId: identifier });
      if (instructor) {
        user = await User.findById(instructor.userId);
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that identifier'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL (for frontend)
    const resetUrl = `/reset-password/${resetToken}`;

    // In production, this would send an email
    // For now, return the token directly (instructor can share with student)
    res.json({
      success: true,
      message: 'Password reset link generated',
      data: {
        resetUrl,
        resetToken,
        expiresIn: '1 hour',
        // Include user info for instructor reference
        userEmail: user.email,
        userName: user.displayName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate reset link',
      error: error.message
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
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
    if (middleName !== undefined) user.middleName = middleName;

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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get role-specific profile and twin data
    let profileData = null;
    let twinData = null;

    if (user.role === 'student') {
      profileData = await Student.findOne({ userId: user._id });
      if (profileData) {
        twinData = await StudentTwin.findOne({ studentId: profileData._id });
      }
    } else if (user.role === 'instructor') {
      profileData = await Instructor.findOne({ userId: user._id });
    }

    // Build response
    const responseData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      fullName: user.fullName,
      displayName: user.displayName,
      email: user.email,
      role: user.role
    };

    if (user.role === 'student' && profileData) {
      responseData.studentId = profileData.studentId;
      responseData.course = profileData.course;
      responseData.section = profileData.section;
      responseData.yearLevel = profileData.yearLevel;
      responseData.studentProfileId = profileData._id;
    } else if (user.role === 'instructor' && profileData) {
      responseData.employeeId = profileData.employeeId;
      responseData.department = profileData.department;
      responseData.instructorProfileId = profileData._id;
    }

    res.json({
      success: true,
      data: {
        user: responseData,
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
