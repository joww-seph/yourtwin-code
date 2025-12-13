import User from '../models/User.js';
import Activity from '../models/Activity.js';
import StudentTwin from '../models/StudentTwin.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Seeding database...');
    
    // Clear existing data
    await User.deleteMany({});
    await Activity.deleteMany({});
    await StudentTwin.deleteMany({});
    
    // Create instructor
    const instructor = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      middleName: 'Smith',
      email: 'instructor@mmsu.edu.ph',
      password: 'instructor123',
      role: 'instructor',
      employeeId: 'EMP-2024-001',
      department: 'CCIS'
    });
    
    console.log('✅ Instructor created');
    
    // Create students
    const students = await User.create([
      {
        firstName: 'Marc Joseph',
        lastName: 'Sacopaso',
        middleName: 'Dela Cruz',
        email: 'marc@mmsu.edu.ph',
        password: 'student123',
        role: 'student',
        studentId: '2021-12345',
        course: 'BSIT',
        section: '3A',
        yearLevel: 3
      },
      {
        firstName: 'Kurt',
        lastName: 'Agcaoili',
        middleName: 'Santos',
        email: 'kurt@mmsu.edu.ph',
        password: 'student123',
        role: 'student',
        studentId: '2021-12346',
        course: 'BSIT',
        section: '3A',
        yearLevel: 3
      },
      {
        firstName: 'Angelo',
        lastName: 'Palting',
        middleName: 'Reyes',
        email: 'angelo@mmsu.edu.ph',
        password: 'student123',
        role: 'student',
        studentId: '2021-12347',
        course: 'BSIT',
        section: '3A',
        yearLevel: 3
      },
      {
        firstName: 'Meljan',
        lastName: 'Crisostomo',
        middleName: 'Garcia',
        email: 'meljan@mmsu.edu.ph',
        password: 'student123',
        role: 'student',
        studentId: '2021-12348',
        course: 'BSIT',
        section: '3A',
        yearLevel: 3
      }
    ]);
    
    console.log(`✅ ${students.length} students created`);
    
    // Create digital twins for students
    for (const student of students) {
      await StudentTwin.create({
        student: student._id,
        competencies: [
          { topic: 'arrays', level: 0.5 },
          { topic: 'loops', level: 0.6 },
          { topic: 'functions', level: 0.4 }
        ],
        behavioralData: {
          avgTypingSpeed: 120,
          avgThinkingPause: 5,
          errorFrequency: 0.3,
          aiDependencyScore: 0.5
        }
      });
    }
    
    console.log('✅ Digital twins created');
    
    // Create sample activities
    const activities = await Activity.create([
      {
        title: 'Activity 1: Array Declaration',
        description: 'Declare an integer array of size 5 and initialize it with values: 10, 20, 30, 40, 50. Print all elements.',
        type: 'practice',
        language: 'cpp',
        difficulty: 'easy',
        topic: 'arrays',
        starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
        testCases: [
          {
            input: '',
            expectedOutput: '10 20 30 40 50 ',
            isHidden: false,
            points: 10
          }
        ],
        aiAssistanceLevel: 5,
        timeLimit: 30,
        createdBy: instructor._id
      },
      {
        title: 'Activity 2: Array Sum',
        description: 'Given an array of N integers, calculate and print the sum of all elements.',
        type: 'practice',
        language: 'cpp',
        difficulty: 'easy',
        topic: 'arrays',
        starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    \n    // Read array\n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n    }\n    \n    // Your code here\n    \n    return 0;\n}',
        testCases: [
          {
            input: '5\n1 2 3 4 5',
            expectedOutput: '15',
            isHidden: false,
            points: 10
          },
          {
            input: '3\n10 20 30',
            expectedOutput: '60',
            isHidden: true,
            points: 5
          }
        ],
        aiAssistanceLevel: 5,
        timeLimit: 45,
        createdBy: instructor._id
      },
      {
        title: 'Final Activity: Array Challenge',
        description: 'Find two numbers in an array that add up to a target sum.',
        type: 'final',
        language: 'cpp',
        difficulty: 'medium',
        topic: 'arrays',
        starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
        testCases: [
          {
            input: '5\n2 7 11 15 9\n9',
            expectedOutput: '0 1',
            isHidden: false,
            points: 50
          },
          {
            input: '4\n3 2 4\n6',
            expectedOutput: '1 2',
            isHidden: true,
            points: 50
          }
        ],
        aiAssistanceLevel: 0, // Lockdown mode
        timeLimit: 45,
        createdBy: instructor._id
      }
    ]);
    
    console.log(`✅ ${activities.length} activities created`);
    
    console.log('🎉 Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Instructor: instructor@mmsu.edu.ph / instructor123');
    console.log('Student: marc@mmsu.edu.ph / student123 (Student ID: 2021-12345)');
    console.log('Student: kurt@mmsu.edu.ph / student123 (Student ID: 2021-12346)');
    console.log('Student: angelo@mmsu.edu.ph / student123 (Student ID: 2021-12347)');
    console.log('Student: meljan@mmsu.edu.ph / student123 (Student ID: 2021-12348)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();