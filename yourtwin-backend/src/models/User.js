import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  // Separate name fields (LFM format)
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  // Student-specific fields
  studentId: {
    type: String,
    unique: true,
    sparse: true // Only required for students
  },
  course: {
    type: String,
    enum: ['BSIT', 'BSCS'],
    uppercase: true
  },
  section: {
    type: String,
    uppercase: true,
    trim: true
  },
  yearLevel: {
    type: Number,
    min: 1,
    max: 4
  },
  // Instructor-specific fields
  department: {
    type: String,
    default: 'CCIS'
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true // Only for instructors
  },
  // Common fields
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.middleName) {
    return `${this.lastName}, ${this.firstName} ${this.middleName.charAt(0)}.`;
  }
  return `${this.lastName}, ${this.firstName}`;
});

// Virtual for display name (First Last)
userSchema.virtual('displayName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      userId: this._id, 
      email: this.email, 
      role: this.role,
      studentId: this.studentId 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const User = mongoose.model('User', userSchema);

export default User;