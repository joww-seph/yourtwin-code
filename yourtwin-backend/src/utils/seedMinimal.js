import User from '../models/User.js';
import Activity from '../models/Activity.js';
import StudentTwin from '../models/StudentTwin.js';
import LabSession from '../models/LabSession.js';
import Submission from '../models/Submission.js';
import Instructor from '../models/Instructor.js';
import Student from '../models/Student.js';
import SessionEnrollment from '../models/SessionEnrollment.js';
import TestCase from '../models/TestCase.js';
import TestResult from '../models/TestResult.js';
import StudentCompetency from '../models/StudentCompetency.js';
import ActivityMonitoring from '../models/ActivityMonitoring.js';
import HintRequest from '../models/HintRequest.js';
import CodeSnapshot from '../models/CodeSnapshot.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const seedMinimal = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing ALL data from database...');

    // Clear all existing data
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Instructor.deleteMany({}),
      Activity.deleteMany({}),
      StudentTwin.deleteMany({}),
      LabSession.deleteMany({}),
      Submission.deleteMany({}),
      SessionEnrollment.deleteMany({}),
      TestCase.deleteMany({}),
      TestResult.deleteMany({}),
      StudentCompetency.deleteMany({}),
      ActivityMonitoring.deleteMany({}),
      HintRequest.deleteMany({}),
      CodeSnapshot.deleteMany({})
    ]);

    console.log('✅ All data cleared');

    // Create instructor user
    const instructorUser = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      middleName: 'Smith',
      email: 'instructor@mmsu.edu.ph',
      password: 'instructor123',
      role: 'instructor'
    });

    // Create instructor profile
    await Instructor.create({
      userId: instructorUser._id,
      employeeId: 'EMP-2024-001',
      department: 'CCIS'
    });

    console.log('✅ Instructor account created');

    // Create student user
    const studentUser = await User.create({
      firstName: 'Marc Joseph',
      lastName: 'Sacopaso',
      middleName: 'Buduan',
      email: 'student@mmsu.edu.ph',
      password: 'student123',
      role: 'student'
    });

    // Create student profile
    const student = await Student.create({
      userId: studentUser._id,
      studentId: '23-140148',
      course: 'BSIT',
      yearLevel: 3,
      section: 'B'
    });

    // Create student twin (required for AI features)
    await StudentTwin.create({
      studentId: student._id,
      personality: 'visual',
      preferredDifficulty: 'medium',
      strengths: ['arrays', 'loops'],
      weaknesses: ['pointers', 'recursion'],
      recommendedTopics: ['arrays', 'loops', 'functions'],
      behavioralData: {
        avgTypingSpeed: 90,
        avgThinkingPause: 3,
        errorFrequency: 0.2,
        aiDependencyScore: 0.3
      }
    });

    console.log('✅ Student account created');

    console.log('\n🎉 Minimal seed completed!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('═'.repeat(50));
    console.log('\n👨‍🏫 INSTRUCTOR:');
    console.log('   Email: instructor@mmsu.edu.ph');
    console.log('   Password: instructor123');
    console.log('\n👨‍🎓 STUDENT:');
    console.log('   Email: student@mmsu.edu.ph');
    console.log('   Password: student123');
    console.log('   Student ID: 23-140148');
    console.log('   Course: BSIT 3-B');
    console.log('\n═'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedMinimal();
