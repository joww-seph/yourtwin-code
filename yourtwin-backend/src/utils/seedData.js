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
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    console.log('🌱 Seeding database with BCNF-compliant test data...');

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
      StudentCompetency.deleteMany({})
    ]);

    console.log('✅ Cleared all existing data');

    // =====================
    // CREATE USERS (Base Identity Only)
    // =====================

    // Instructor Users
    const instructorUsers = await User.create([
      {
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Smith',
        email: 'instructor@mmsu.edu.ph',
        password: 'instructor123',
        role: 'instructor'
      },
      {
        firstName: 'Jane',
        lastName: 'Rodriguez',
        middleName: 'Cruz',
        email: 'jane.rodriguez@mmsu.edu.ph',
        password: 'instructor123',
        role: 'instructor'
      }
    ]);

    console.log(`✅ ${instructorUsers.length} instructor users created`);

    // Student Users
    const studentUsers = await User.create([
      // BSIT 3-B Students
      {
        firstName: 'Marc Joseph',
        lastName: 'Sacopaso',
        middleName: 'Buduan',
        email: 'marc@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      {
        firstName: 'Kurt',
        lastName: 'Agcaoili',
        middleName: 'Santos',
        email: 'kurt@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      {
        firstName: 'Angelo',
        lastName: 'Palting',
        middleName: 'Reyes',
        email: 'angelo@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      {
        firstName: 'Meljan',
        lastName: 'Crisostomo',
        middleName: 'Garcia',
        email: 'meljan@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      {
        firstName: 'Maria',
        lastName: 'Santos',
        middleName: 'Dela Cruz',
        email: 'maria.santos@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      {
        firstName: 'Juan',
        lastName: 'Dela Torre',
        middleName: 'Francisco',
        email: 'juan.delatorre@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      // BSIT 3-A Students
      {
        firstName: 'Alexis',
        lastName: 'Rivera',
        middleName: 'Lopez',
        email: 'alexis.rivera@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      {
        firstName: 'Carlos',
        lastName: 'Martinez',
        middleName: 'Ramos',
        email: 'carlos.martinez@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      // BSCS 2-A Students
      {
        firstName: 'Diana',
        lastName: 'Fernandez',
        middleName: 'Torres',
        email: 'diana.fernandez@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      {
        firstName: 'Edward',
        lastName: 'Gonzales',
        middleName: 'Villanueva',
        email: 'edward.gonzales@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      // BSCS 3-A Students
      {
        firstName: 'Fiona',
        lastName: 'Hernandez',
        middleName: 'Pascual',
        email: 'fiona.hernandez@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      },
      {
        firstName: 'Gabriel',
        lastName: 'Mendoza',
        middleName: 'Salazar',
        email: 'gabriel.mendoza@mmsu.edu.ph',
        password: 'student123',
        role: 'student'
      }
    ]);

    console.log(`✅ ${studentUsers.length} student users created`);

    // =====================
    // CREATE INSTRUCTOR PROFILES (Normalized)
    // =====================
    const instructors = await Instructor.create([
      {
        userId: instructorUsers[0]._id,
        employeeId: 'EMP-2024-001',
        department: 'CCIS'
      },
      {
        userId: instructorUsers[1]._id,
        employeeId: 'EMP-2024-002',
        department: 'CCIS'
      }
    ]);

    console.log(`✅ ${instructors.length} instructor profiles created`);

    // =====================
    // CREATE STUDENT PROFILES (Normalized)
    // =====================
    const studentProfileData = [
      // BSIT 3-B Students (indices 0-5)
      { studentId: '23-140148', course: 'BSIT', yearLevel: 3, section: 'B' },
      { studentId: '23-140149', course: 'BSIT', yearLevel: 3, section: 'B' },
      { studentId: '23-140150', course: 'BSIT', yearLevel: 3, section: 'B' },
      { studentId: '23-140151', course: 'BSIT', yearLevel: 3, section: 'B' },
      { studentId: '23-140152', course: 'BSIT', yearLevel: 3, section: 'B' },
      { studentId: '23-140153', course: 'BSIT', yearLevel: 3, section: 'B' },
      // BSIT 3-A Students (indices 6-7)
      { studentId: '23-140201', course: 'BSIT', yearLevel: 3, section: 'A' },
      { studentId: '23-140202', course: 'BSIT', yearLevel: 3, section: 'A' },
      // BSCS 2-A Students (indices 8-9)
      { studentId: '24-150101', course: 'BSCS', yearLevel: 2, section: 'A' },
      { studentId: '24-150102', course: 'BSCS', yearLevel: 2, section: 'A' },
      // BSCS 3-A Students (indices 10-11)
      { studentId: '23-160101', course: 'BSCS', yearLevel: 3, section: 'A' },
      { studentId: '23-160102', course: 'BSCS', yearLevel: 3, section: 'A' }
    ];

    const students = await Student.create(
      studentUsers.map((user, i) => ({
        userId: user._id,
        ...studentProfileData[i]
      }))
    );

    console.log(`✅ ${students.length} student profiles created`);

    // =====================
    // CREATE STUDENT TWINS (Normalized)
    // =====================
    const studentTwins = await StudentTwin.create(
      students.map((student, i) => ({
        studentId: student._id,
        personality: ['visual', 'auditory', 'kinesthetic', 'reading-writing'][i % 4],
        preferredDifficulty: ['easy', 'medium', 'hard'][i % 3],
        strengths: [['arrays', 'loops'], ['functions', 'basics'], ['recursion', 'algorithms']][i % 3],
        weaknesses: [['pointers', 'oop'], ['recursion', 'data-structures'], ['sorting', 'searching']][i % 3],
        recommendedTopics: ['arrays', 'loops', 'functions'],
        behavioralData: {
          avgTypingSpeed: 80 + (i * 10),
          avgThinkingPause: 3 + (i % 5),
          errorFrequency: 0.2 + (i % 3) * 0.1,
          aiDependencyScore: 0.3 + (i % 4) * 0.15
        }
      }))
    );

    console.log(`✅ ${studentTwins.length} student twins created`);

    // =====================
    // CREATE STUDENT COMPETENCIES (Normalized - Separate from StudentTwin)
    // =====================
    const competencyTopics = ['arrays', 'loops', 'functions', 'recursion', 'pointers', 'data-structures'];
    const competencyLevels = [
      // High performers
      [0.9, 0.85, 0.8, 0.7, 0.6, 0.5],
      // Medium performers
      [0.6, 0.65, 0.5, 0.4, 0.3, 0.25],
      // Low performers
      [0.3, 0.4, 0.25, 0.2, 0.15, 0.1],
      // Beginners
      [0.1, 0.15, 0.1, 0.05, 0.02, 0.01]
    ];

    const competencyRecords = [];
    for (let i = 0; i < students.length; i++) {
      const levelProfile = competencyLevels[i % competencyLevels.length];
      for (let j = 0; j < competencyTopics.length; j++) {
        const proficiency = levelProfile[j];
        const totalAttempts = Math.floor(10 + Math.random() * 20);
        const successfulAttempts = Math.floor(totalAttempts * proficiency);
        competencyRecords.push({
          studentId: students[i]._id,
          topic: competencyTopics[j],
          proficiencyLevel: proficiency,
          successRate: proficiency,
          totalAttempts,
          successfulAttempts,
          lastAttemptAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        });
      }
    }

    await StudentCompetency.insertMany(competencyRecords);
    console.log(`✅ ${competencyRecords.length} student competency records created`);

    // =====================
    // CREATE LAB SESSIONS (With Denormalized course/yearLevel/section)
    // =====================
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    // Note: LabSession no longer has allowedStudents - we use SessionEnrollment
    const labSession1 = await LabSession.create({
      title: 'Week 7: Arrays and Loops Fundamentals',
      description: 'Comprehensive introduction to array manipulation, iteration, and loop structures in C++',
      course: 'BSIT',
      yearLevel: 3,
      section: 'B',
      instructor: instructorUsers[0]._id,
      scheduledDate: lastWeek,
      startTime: '09:00',
      endTime: '11:00',
      room: 'CS Lab 1',
      isActive: true,
      status: 'ongoing'
    });

    const labSession2 = await LabSession.create({
      title: 'Week 8: Functions and Recursion',
      description: 'Deep dive into function declarations, parameters, return values, and recursive algorithms',
      course: 'BSIT',
      yearLevel: 3,
      section: 'B',
      instructor: instructorUsers[0]._id,
      scheduledDate: today,
      startTime: '10:00',
      endTime: '12:00',
      room: 'CS Lab 1',
      isActive: false,
      status: 'scheduled'
    });

    const labSession3 = await LabSession.create({
      title: 'Week 9: Pointers and Memory Management',
      description: 'Understanding memory allocation, pointers, and dynamic data structures',
      course: 'BSIT',
      yearLevel: 3,
      section: 'B',
      instructor: instructorUsers[0]._id,
      scheduledDate: nextWeek,
      startTime: '09:00',
      endTime: '11:00',
      room: 'CS Lab 2',
      isActive: false,
      status: 'scheduled'
    });

    const labSession4 = await LabSession.create({
      title: 'Week 5: Data Structures - Stacks and Queues',
      description: 'Implementation and application of stack and queue data structures',
      course: 'BSIT',
      yearLevel: 3,
      section: 'A',
      instructor: instructorUsers[0]._id,
      scheduledDate: today,
      startTime: '13:00',
      endTime: '15:00',
      room: 'CS Lab 3',
      isActive: true,
      status: 'ongoing'
    });

    const labSession5 = await LabSession.create({
      title: 'Week 3: Introduction to Python Programming',
      description: 'Basic Python syntax, variables, data types, and control structures',
      course: 'BSCS',
      yearLevel: 2,
      section: 'A',
      instructor: instructorUsers[1]._id,
      scheduledDate: today,
      startTime: '14:00',
      endTime: '16:00',
      room: 'CS Lab 4',
      isActive: true,
      status: 'ongoing'
    });

    const labSession6 = await LabSession.create({
      title: 'Week 6: Object-Oriented Programming Concepts',
      description: 'Classes, objects, inheritance, and polymorphism in C++',
      course: 'BSCS',
      yearLevel: 3,
      section: 'A',
      instructor: instructorUsers[1]._id,
      scheduledDate: nextWeek,
      startTime: '10:00',
      endTime: '12:00',
      room: 'CS Lab 1',
      isActive: false,
      status: 'scheduled'
    });

    const labSession7 = await LabSession.create({
      title: 'Week 10: Advanced Algorithms',
      description: 'Sorting algorithms, searching techniques, and algorithm analysis',
      course: 'BSIT',
      yearLevel: 3,
      section: 'B',
      instructor: instructorUsers[0]._id,
      scheduledDate: twoWeeksLater,
      startTime: '09:00',
      endTime: '11:00',
      room: 'CS Lab 1',
      isActive: false,
      status: 'scheduled'
    });

    console.log('✅ 7 lab sessions created');

    // =====================
    // CREATE SESSION ENROLLMENTS (Junction Table)
    // =====================
    const enrollments = [];

    // Session 1 (BSIT 3-B) - All 6 BSIT 3-B students
    for (let i = 0; i < 6; i++) {
      enrollments.push({ sessionId: labSession1._id, studentId: students[i]._id });
    }

    // Session 2 (BSIT 3-B) - First 3 students
    for (let i = 0; i < 3; i++) {
      enrollments.push({ sessionId: labSession2._id, studentId: students[i]._id });
    }

    // Session 3 (BSIT 3-B) - All 6 BSIT 3-B students
    for (let i = 0; i < 6; i++) {
      enrollments.push({ sessionId: labSession3._id, studentId: students[i]._id });
    }

    // Session 4 (BSIT 3-A) - 2 BSIT 3-A students
    enrollments.push({ sessionId: labSession4._id, studentId: students[6]._id });
    enrollments.push({ sessionId: labSession4._id, studentId: students[7]._id });

    // Session 5 (BSCS 2-A) - 2 BSCS 2-A students
    enrollments.push({ sessionId: labSession5._id, studentId: students[8]._id });
    enrollments.push({ sessionId: labSession5._id, studentId: students[9]._id });

    // Session 6 (BSCS 3-A) - 2 BSCS 3-A students
    enrollments.push({ sessionId: labSession6._id, studentId: students[10]._id });
    enrollments.push({ sessionId: labSession6._id, studentId: students[11]._id });

    // Session 7 (BSIT 3-B) - 3 students
    enrollments.push({ sessionId: labSession7._id, studentId: students[0]._id });
    enrollments.push({ sessionId: labSession7._id, studentId: students[2]._id });
    enrollments.push({ sessionId: labSession7._id, studentId: students[4]._id });

    await SessionEnrollment.insertMany(enrollments);
    console.log(`✅ ${enrollments.length} session enrollments created`);

    // =====================
    // CREATE ACTIVITIES (Without embedded testCases)
    // =====================
    const activity1 = await Activity.create({
      orderInSession: 1,
      title: 'Activity 1: Array Declaration and Initialization',
      description: 'Declare an integer array of size 5 and initialize it with values: 10, 20, 30, 40, 50. Print all elements separated by spaces.',
      type: 'practice',
      language: 'cpp',
      difficulty: 'easy',
      topic: 'arrays',
      labSession: labSession1._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Declare and initialize an array with: 10, 20, 30, 40, 50\n    // Print all elements separated by spaces\n    \n    return 0;\n}',
      aiAssistanceLevel: 5,
      timeLimit: 30,
      createdBy: instructorUsers[0]._id
    });

    const activity2 = await Activity.create({
      orderInSession: 2,
      title: 'Activity 2: Array Sum Calculator',
      description: 'Read N integers into an array, then calculate and print the sum of all elements.',
      type: 'practice',
      language: 'cpp',
      difficulty: 'easy',
      topic: 'arrays',
      labSession: labSession1._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    \n    // Read array elements\n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n    }\n    \n    // Calculate and print the sum\n    \n    return 0;\n}',
      aiAssistanceLevel: 4,
      timeLimit: 45,
      createdBy: instructorUsers[0]._id
    });

    const activity3 = await Activity.create({
      orderInSession: 3,
      title: 'Activity 3: Find Maximum Element',
      description: 'Given an array of N integers, find and print the maximum element.',
      type: 'practice',
      language: 'cpp',
      difficulty: 'medium',
      topic: 'arrays',
      labSession: labSession1._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    \n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n    }\n    \n    // Find and print the maximum element\n    \n    return 0;\n}',
      aiAssistanceLevel: 3,
      timeLimit: 45,
      createdBy: instructorUsers[0]._id
    });

    const activity4 = await Activity.create({
      orderInSession: 4,
      title: 'Activity 4: Reverse Array',
      description: 'Read N integers into an array and print them in reverse order.',
      type: 'practice',
      language: 'cpp',
      difficulty: 'medium',
      topic: 'arrays',
      labSession: labSession1._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    \n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n    }\n    \n    // Print array in reverse order\n    \n    return 0;\n}',
      aiAssistanceLevel: 2,
      timeLimit: 45,
      createdBy: instructorUsers[0]._id
    });

    const activity5 = await Activity.create({
      orderInSession: 5,
      title: 'Final Activity: Two Sum Problem',
      description: 'Given an array of integers and a target sum, find the indices of two numbers that add up to the target. Print the indices (0-based).',
      type: 'final',
      language: 'cpp',
      difficulty: 'hard',
      topic: 'arrays',
      labSession: labSession1._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n, target;\n    cin >> n;\n    int arr[n];\n    \n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n    }\n    cin >> target;\n    \n    // Find two indices that sum to target\n    // Print the two indices separated by space\n    \n    return 0;\n}',
      aiAssistanceLevel: 0,
      timeLimit: 60,
      createdBy: instructorUsers[0]._id
    });

    const activity6 = await Activity.create({
      orderInSession: 1,
      title: 'Function Basics: Add Two Numbers',
      description: 'Create a function that takes two integers and returns their sum. Call the function from main and print the result.',
      type: 'practice',
      language: 'cpp',
      difficulty: 'easy',
      topic: 'functions',
      labSession: labSession2._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\n// Write your function here\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    // Call function and print result\n    return 0;\n}',
      aiAssistanceLevel: 5,
      timeLimit: 30,
      createdBy: instructorUsers[0]._id
    });

    const activity7 = await Activity.create({
      orderInSession: 2,
      title: 'Recursion: Factorial',
      description: 'Write a recursive function to calculate the factorial of a number N.',
      type: 'practice',
      language: 'cpp',
      difficulty: 'medium',
      topic: 'recursion',
      labSession: labSession2._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\n// Write recursive factorial function here\n\nint main() {\n    int n;\n    cin >> n;\n    // Call function and print result\n    return 0;\n}',
      aiAssistanceLevel: 3,
      timeLimit: 45,
      createdBy: instructorUsers[0]._id
    });

    const activity8 = await Activity.create({
      orderInSession: 1,
      title: 'Stack Implementation: Push and Pop',
      description: 'Implement basic stack operations using arrays.',
      type: 'practice',
      language: 'cpp',
      difficulty: 'medium',
      topic: 'data-structures',
      labSession: labSession4._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Implement stack operations\n    return 0;\n}',
      aiAssistanceLevel: 3,
      timeLimit: 60,
      createdBy: instructorUsers[0]._id
    });

    const activity9 = await Activity.create({
      orderInSession: 1,
      title: 'Activity 1: Hello, Python!',
      description: 'Print Hello, World and a sample computation to verify Python environment.',
      type: 'practice',
      language: 'python',
      difficulty: 'easy',
      topic: 'basics',
      labSession: labSession5._id,
      starterCode: 'def main():\n    # write your code here\n    pass\n\nif __name__ == "__main__":\n    main()',
      aiAssistanceLevel: 5,
      timeLimit: 30,
      createdBy: instructorUsers[1]._id
    });

    const activity10 = await Activity.create({
      orderInSession: 1,
      title: 'Pointers: Pointer Basics and Dereferencing',
      description: 'Demonstrate pointer declaration, assignment, and dereferencing in C++.',
      type: 'practice',
      language: 'cpp',
      difficulty: 'easy',
      topic: 'pointers',
      labSession: labSession3._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a = 10;\n    // use a pointer to print the value of a\n    return 0;\n}',
      aiAssistanceLevel: 5,
      timeLimit: 30,
      createdBy: instructorUsers[0]._id
    });

    const activity11 = await Activity.create({
      orderInSession: 1,
      title: 'OOP: Define a Class and Use Its Methods',
      description: 'Define a simple class with constructor and method, instantiate it and call its method. Use Java for this exercise.',
      type: 'practice',
      language: 'java',
      difficulty: 'medium',
      topic: 'oop',
      labSession: labSession6._id,
      starterCode: 'public class Main {\n    public static void main(String[] args) {\n        // implement class usage here\n    }\n}',
      aiAssistanceLevel: 4,
      timeLimit: 45,
      createdBy: instructorUsers[1]._id
    });

    const activity12 = await Activity.create({
      orderInSession: 1,
      title: 'Sorting: Implement QuickSort',
      description: 'Implement QuickSort and print the sorted array.',
      type: 'practice',
      language: 'cpp',
      difficulty: 'hard',
      topic: 'sorting',
      labSession: labSession7._id,
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // implement quicksort and print sorted elements\n    return 0;\n}',
      aiAssistanceLevel: 2,
      timeLimit: 60,
      createdBy: instructorUsers[0]._id
    });

    console.log('✅ 12 activities created');

    // =====================
    // CREATE TEST CASES (Normalized - Separate from Activity)
    // =====================
    const testCases = await TestCase.insertMany([
      // Activity 1 test cases
      { activityId: activity1._id, input: '', expectedOutput: '10 20 30 40 50 ', isHidden: false, weight: 100, orderIndex: 0 },

      // Activity 2 test cases
      { activityId: activity2._id, input: '5\n1 2 3 4 5', expectedOutput: '15', isHidden: false, weight: 50, orderIndex: 0 },
      { activityId: activity2._id, input: '3\n10 20 30', expectedOutput: '60', isHidden: true, weight: 50, orderIndex: 1 },

      // Activity 3 test cases
      { activityId: activity3._id, input: '5\n3 7 2 9 1', expectedOutput: '9', isHidden: false, weight: 50, orderIndex: 0 },
      { activityId: activity3._id, input: '4\n-5 -2 -8 -1', expectedOutput: '-1', isHidden: true, weight: 50, orderIndex: 1 },

      // Activity 4 test cases
      { activityId: activity4._id, input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1 ', isHidden: false, weight: 50, orderIndex: 0 },
      { activityId: activity4._id, input: '3\n10 20 30', expectedOutput: '30 20 10 ', isHidden: true, weight: 50, orderIndex: 1 },

      // Activity 5 test cases
      { activityId: activity5._id, input: '4\n2 7 11 15\n9', expectedOutput: '0 1', isHidden: false, weight: 50, orderIndex: 0 },
      { activityId: activity5._id, input: '3\n3 2 4\n6', expectedOutput: '1 2', isHidden: true, weight: 50, orderIndex: 1 },

      // Activity 6 test cases
      { activityId: activity6._id, input: '5 3', expectedOutput: '8', isHidden: false, weight: 100, orderIndex: 0 },

      // Activity 7 test cases
      { activityId: activity7._id, input: '5', expectedOutput: '120', isHidden: false, weight: 50, orderIndex: 0 },
      { activityId: activity7._id, input: '0', expectedOutput: '1', isHidden: true, weight: 50, orderIndex: 1 },

      // Activity 8 test cases
      { activityId: activity8._id, input: '3\n1 2 3', expectedOutput: '3 2 1', isHidden: false, weight: 100, orderIndex: 0 },

      // Activity 9 test cases
      { activityId: activity9._id, input: '', expectedOutput: 'Hello, World', isHidden: false, weight: 100, orderIndex: 0 },

      // Activity 10 test cases
      { activityId: activity10._id, input: '', expectedOutput: '10', isHidden: false, weight: 100, orderIndex: 0 },

      // Activity 11 test cases
      { activityId: activity11._id, input: '', expectedOutput: 'Hello from MyClass', isHidden: false, weight: 100, orderIndex: 0 },

      // Activity 12 test cases
      { activityId: activity12._id, input: '5\n5 3 8 1 2', expectedOutput: '1 2 3 5 8 ', isHidden: false, weight: 100, orderIndex: 0 }
    ]);

    console.log(`✅ ${testCases.length} test cases created`);

    // =====================
    // CREATE SUBMISSIONS (Using studentId, activityId, labSessionId)
    // =====================

    // Marc (Student 0) - High performer with multiple attempts
    const submission1 = await Submission.create({
      studentId: students[0]._id,
      activityId: activity1._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int arr[] = {10, 20, 30, 40};\n    for(int i = 0; i < 4; i++) {\n        cout << arr[i] << " ";\n    }\n    return 0;\n}',
      language: 'cpp',
      status: 'failed',
      score: 0,
      attemptNumber: 1,
      executionTime: 0.05,
      createdAt: new Date(Date.now() - 7200000)
    });

    const submission2 = await Submission.create({
      studentId: students[0]._id,
      activityId: activity1._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int arr[] = {10, 20, 30, 40, 50};\n    for(int i = 0; i < 5; i++) {\n        cout << arr[i] << " ";\n    }\n    return 0;\n}',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 2,
      executionTime: 0.05,
      isBestScore: true,
      createdAt: new Date(Date.now() - 5400000)
    });

    const submission3 = await Submission.create({
      studentId: students[0]._id,
      activityId: activity2._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    int sum = 0;\n    \n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n        sum += arr[i];\n    }\n    \n    cout << sum;\n    return 0;\n}',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.12,
      isBestScore: true,
      createdAt: new Date(Date.now() - 3600000)
    });

    const submission4 = await Submission.create({
      studentId: students[0]._id,
      activityId: activity3._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    \n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n    }\n    \n    int max = arr[0];\n    for(int i = 1; i < n; i++) {\n        if(arr[i] > max) max = arr[i];\n    }\n    \n    cout << max;\n    return 0;\n}',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.08,
      isBestScore: true,
      createdAt: new Date(Date.now() - 1800000)
    });

    // Kurt (Student 1) - Medium performer
    const submission5 = await Submission.create({
      studentId: students[1]._id,
      activityId: activity1._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int arr[] = {10, 20, 30, 40, 50};\n    for(int i = 0; i < 5; i++) {\n        cout << arr[i] << " ";\n    }\n    return 0;\n}',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.05,
      isBestScore: true,
      createdAt: new Date(Date.now() - 7000000)
    });

    const submission6 = await Submission.create({
      studentId: students[1]._id,
      activityId: activity2._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    int sum = 0;\n    \n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n    }\n    \n    cout << sum;\n    return 0;\n}',
      language: 'cpp',
      status: 'failed',
      score: 0,
      attemptNumber: 1,
      executionTime: 0.08,
      createdAt: new Date(Date.now() - 4800000)
    });

    const submission7 = await Submission.create({
      studentId: students[1]._id,
      activityId: activity2._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    int sum = 0;\n    \n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n        sum += arr[i];\n    }\n    \n    cout << sum << endl;\n    return 0;\n}',
      language: 'cpp',
      status: 'failed',
      score: 50,
      attemptNumber: 2,
      executionTime: 0.08,
      isBestScore: true,
      createdAt: new Date(Date.now() - 2400000)
    });

    // Angelo (Student 2) - Has compile errors then passed
    const submission8 = await Submission.create({
      studentId: students[2]._id,
      activityId: activity1._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int arr[] = {10, 20, 30, 40, 50};\n    for(int i = 0; i < 5; i++) {\n        cout << arr[i] << " "\n    }\n    return 0;\n}',
      language: 'cpp',
      status: 'error',
      score: 0,
      attemptNumber: 1,
      executionTime: 0,
      compileError: 'main.cpp:6:30: error: expected \';\' before \'}\' token',
      createdAt: new Date(Date.now() - 600000)
    });

    const submission9 = await Submission.create({
      studentId: students[2]._id,
      activityId: activity1._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int arr[] = {10, 20, 30, 40, 50};\n    for(int i = 0; i < 5; i++) {\n        cout << arr[i] << " ";\n    }\n    return 0;\n}',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 2,
      executionTime: 0.05,
      isBestScore: true,
      createdAt: new Date(Date.now() - 300000)
    });

    // Maria (Student 4) - Completed multiple activities
    const submission10 = await Submission.create({
      studentId: students[4]._id,
      activityId: activity1._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int arr[] = {10, 20, 30, 40, 50};\n    for(int i = 0; i < 5; i++) {\n        cout << arr[i] << " ";\n    }\n    return 0;\n}',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.05,
      isBestScore: true,
      createdAt: new Date(Date.now() - 9000000)
    });

    const submission11 = await Submission.create({
      studentId: students[4]._id,
      activityId: activity2._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n], sum = 0;\n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n        sum += arr[i];\n    }\n    cout << sum;\n    return 0;\n}',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.08,
      isBestScore: true,
      createdAt: new Date(Date.now() - 7200000)
    });

    const submission12 = await Submission.create({
      studentId: students[4]._id,
      activityId: activity4._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    for(int i = 0; i < n; i++) cin >> arr[i];\n    for(int i = n-1; i >= 0; i--) cout << arr[i] << " ";\n    return 0;\n}',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.07,
      isBestScore: true,
      createdAt: new Date(Date.now() - 5400000)
    });

    // Juan (Student 5)
    const submission13 = await Submission.create({
      studentId: students[5]._id,
      activityId: activity3._id,
      labSessionId: labSession1._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int arr[n];\n    for(int i = 0; i < n; i++) cin >> arr[i];\n    int max = arr[0];\n    for(int i = 0; i < n; i++) {\n        if(arr[i] > max) max = arr[i];\n    }\n    cout << max;\n    return 0;\n}',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.08,
      isBestScore: true,
      createdAt: new Date(Date.now() - 4000000)
    });

    // Alexis (Student 6) - BSIT 3-A
    const submission14 = await Submission.create({
      studentId: students[6]._id,
      activityId: activity8._id,
      labSessionId: labSession4._id,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Stack implementation\n    return 0;\n}',
      language: 'cpp',
      status: 'failed',
      score: 0,
      attemptNumber: 1,
      executionTime: 0.05,
      createdAt: new Date(Date.now() - 1800000)
    });

    // Marc on Pointers activity (Session 3)
    const submission15 = await Submission.create({
      studentId: students[0]._id,
      activityId: activity10._id,
      labSessionId: labSession3._id,
      code: '#include <iostream>\nusing namespace std;\nint main(){ int a=10; int *p=&a; cout<<*p; return 0; }',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.02,
      isBestScore: true
    });

    // Diana on Python activity (Session 5)
    const submission16 = await Submission.create({
      studentId: students[8]._id,
      activityId: activity9._id,
      labSessionId: labSession5._id,
      code: 'print("Hello, World")',
      language: 'python',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.01,
      isBestScore: true
    });

    // Fiona on OOP activity (Session 6)
    const submission17 = await Submission.create({
      studentId: students[10]._id,
      activityId: activity11._id,
      labSessionId: labSession6._id,
      code: 'class MyClass{ public String say(){ return "Hello from MyClass"; } }',
      language: 'java',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.05,
      isBestScore: true
    });

    // Angelo on QuickSort activity (Session 7)
    const submission18 = await Submission.create({
      studentId: students[2]._id,
      activityId: activity12._id,
      labSessionId: labSession7._id,
      code: '#include <iostream>\nusing namespace std;\nint main(){ cout<<"1 2 3 5 8 "; return 0; }',
      language: 'cpp',
      status: 'passed',
      score: 100,
      attemptNumber: 1,
      executionTime: 0.12,
      isBestScore: true
    });

    console.log('✅ 18 submissions created');

    // =====================
    // CREATE TEST RESULTS (Normalized - Separate from Submission)
    // =====================
    const testResultRecords = [
      // Submission 1 (Marc - failed activity 1)
      { submissionId: submission1._id, testCaseId: testCases[0]._id, input: '', expectedOutput: '10 20 30 40 50 ', actualOutput: '10 20 30 40 ', passed: false, executionTime: 0.05 },

      // Submission 2 (Marc - passed activity 1)
      { submissionId: submission2._id, testCaseId: testCases[0]._id, input: '', expectedOutput: '10 20 30 40 50 ', actualOutput: '10 20 30 40 50 ', passed: true, executionTime: 0.05 },

      // Submission 3 (Marc - passed activity 2)
      { submissionId: submission3._id, testCaseId: testCases[1]._id, input: '5\n1 2 3 4 5', expectedOutput: '15', actualOutput: '15', passed: true, executionTime: 0.06 },
      { submissionId: submission3._id, testCaseId: testCases[2]._id, input: '3\n10 20 30', expectedOutput: '60', actualOutput: '60', passed: true, executionTime: 0.06 },

      // Submission 4 (Marc - passed activity 3)
      { submissionId: submission4._id, testCaseId: testCases[3]._id, input: '5\n3 7 2 9 1', expectedOutput: '9', actualOutput: '9', passed: true, executionTime: 0.04 },
      { submissionId: submission4._id, testCaseId: testCases[4]._id, input: '4\n-5 -2 -8 -1', expectedOutput: '-1', actualOutput: '-1', passed: true, executionTime: 0.04 },

      // Submission 5 (Kurt - passed activity 1)
      { submissionId: submission5._id, testCaseId: testCases[0]._id, input: '', expectedOutput: '10 20 30 40 50 ', actualOutput: '10 20 30 40 50 ', passed: true, executionTime: 0.05 },

      // Submission 6 (Kurt - failed activity 2, attempt 1)
      { submissionId: submission6._id, testCaseId: testCases[1]._id, input: '5\n1 2 3 4 5', expectedOutput: '15', actualOutput: '0', passed: false, executionTime: 0.04 },
      { submissionId: submission6._id, testCaseId: testCases[2]._id, input: '3\n10 20 30', expectedOutput: '60', actualOutput: '0', passed: false, executionTime: 0.04 },

      // Submission 7 (Kurt - partial activity 2, attempt 2)
      { submissionId: submission7._id, testCaseId: testCases[1]._id, input: '5\n1 2 3 4 5', expectedOutput: '15', actualOutput: '15', passed: true, executionTime: 0.04 },
      { submissionId: submission7._id, testCaseId: testCases[2]._id, input: '3\n10 20 30', expectedOutput: '60', actualOutput: '60\n', passed: false, executionTime: 0.04 },

      // Submission 9 (Angelo - passed activity 1, attempt 2)
      { submissionId: submission9._id, testCaseId: testCases[0]._id, input: '', expectedOutput: '10 20 30 40 50 ', actualOutput: '10 20 30 40 50 ', passed: true, executionTime: 0.05 },

      // Submission 10 (Maria - passed activity 1)
      { submissionId: submission10._id, testCaseId: testCases[0]._id, input: '', expectedOutput: '10 20 30 40 50 ', actualOutput: '10 20 30 40 50 ', passed: true, executionTime: 0.05 },

      // Submission 11 (Maria - passed activity 2)
      { submissionId: submission11._id, testCaseId: testCases[1]._id, input: '5\n1 2 3 4 5', expectedOutput: '15', actualOutput: '15', passed: true, executionTime: 0.04 },
      { submissionId: submission11._id, testCaseId: testCases[2]._id, input: '3\n10 20 30', expectedOutput: '60', actualOutput: '60', passed: true, executionTime: 0.04 },

      // Submission 12 (Maria - passed activity 4)
      { submissionId: submission12._id, testCaseId: testCases[5]._id, input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1 ', actualOutput: '5 4 3 2 1 ', passed: true, executionTime: 0.035 },
      { submissionId: submission12._id, testCaseId: testCases[6]._id, input: '3\n10 20 30', expectedOutput: '30 20 10 ', actualOutput: '30 20 10 ', passed: true, executionTime: 0.035 },

      // Submission 13 (Juan - passed activity 3)
      { submissionId: submission13._id, testCaseId: testCases[3]._id, input: '5\n3 7 2 9 1', expectedOutput: '9', actualOutput: '9', passed: true, executionTime: 0.04 },
      { submissionId: submission13._id, testCaseId: testCases[4]._id, input: '4\n-5 -2 -8 -1', expectedOutput: '-1', actualOutput: '-1', passed: true, executionTime: 0.04 },

      // Submission 14 (Alexis - failed activity 8)
      { submissionId: submission14._id, testCaseId: testCases[12]._id, input: '3\n1 2 3', expectedOutput: '3 2 1', actualOutput: '', passed: false, executionTime: 0.05 },

      // Submission 15 (Marc - passed activity 10 pointers)
      { submissionId: submission15._id, testCaseId: testCases[14]._id, input: '', expectedOutput: '10', actualOutput: '10', passed: true, executionTime: 0.02 },

      // Submission 16 (Diana - passed activity 9 python)
      { submissionId: submission16._id, testCaseId: testCases[13]._id, input: '', expectedOutput: 'Hello, World', actualOutput: 'Hello, World', passed: true, executionTime: 0.01 },

      // Submission 17 (Fiona - passed activity 11 OOP)
      { submissionId: submission17._id, testCaseId: testCases[15]._id, input: '', expectedOutput: 'Hello from MyClass', actualOutput: 'Hello from MyClass', passed: true, executionTime: 0.05 },

      // Submission 18 (Angelo - passed activity 12 quicksort)
      { submissionId: submission18._id, testCaseId: testCases[16]._id, input: '5\n5 3 8 1 2', expectedOutput: '1 2 3 5 8 ', actualOutput: '1 2 3 5 8 ', passed: true, executionTime: 0.12 }
    ];

    await TestResult.insertMany(testResultRecords);
    console.log(`✅ ${testResultRecords.length} test results created`);

    // =====================
    // SUMMARY OUTPUT
    // =====================
    console.log('\n🎉 Database seeded successfully with BCNF-compliant data!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('═'.repeat(60));
    console.log('\n👨‍🏫 INSTRUCTORS:');
    console.log('  1. John Doe (instructor@mmsu.edu.ph / instructor123)');
    console.log('     Department: CCIS | Employee ID: EMP-2024-001');
    console.log('     Sessions: 5 lab sessions across BSIT courses');
    console.log('\n  2. Jane Rodriguez (jane.rodriguez@mmsu.edu.ph / instructor123)');
    console.log('     Department: CCIS | Employee ID: EMP-2024-002');
    console.log('     Sessions: 2 lab sessions (BSCS courses)');

    console.log('\n👨‍🎓 STUDENTS (All password: student123):');
    console.log('═'.repeat(60));
    console.log('\n📚 BSIT 3-B Students:');
    console.log('  1. Marc Joseph Sacopaso (marc@mmsu.edu.ph) - ID: 23-140148');
    console.log('  2. Kurt Agcaoili (kurt@mmsu.edu.ph) - ID: 23-140149');
    console.log('  3. Angelo Palting (angelo@mmsu.edu.ph) - ID: 23-140150');
    console.log('  4. Meljan Crisostomo (meljan@mmsu.edu.ph) - ID: 23-140151');
    console.log('  5. Maria Santos (maria.santos@mmsu.edu.ph) - ID: 23-140152');
    console.log('  6. Juan Dela Torre (juan.delatorre@mmsu.edu.ph) - ID: 23-140153');

    console.log('\n📚 BSIT 3-A Students:');
    console.log('  7. Alexis Rivera (alexis.rivera@mmsu.edu.ph) - ID: 23-140201');
    console.log('  8. Carlos Martinez (carlos.martinez@mmsu.edu.ph) - ID: 23-140202');

    console.log('\n📚 BSCS 2-A Students:');
    console.log('  9. Diana Fernandez (diana.fernandez@mmsu.edu.ph) - ID: 24-150101');
    console.log(' 10. Edward Gonzales (edward.gonzales@mmsu.edu.ph) - ID: 24-150102');

    console.log('\n📚 BSCS 3-A Students:');
    console.log(' 11. Fiona Hernandez (fiona.hernandez@mmsu.edu.ph) - ID: 23-160101');
    console.log(' 12. Gabriel Mendoza (gabriel.mendoza@mmsu.edu.ph) - ID: 23-160102');

    console.log('\n📊 BCNF SCHEMA OVERVIEW:');
    console.log('═'.repeat(60));
    console.log('  ✅ Users: Base identity only (no role-specific fields)');
    console.log('  ✅ Students: Normalized with userId reference');
    console.log('  ✅ Instructors: Normalized with userId reference');
    console.log('  ✅ SessionEnrollments: Junction table (no allowedStudents array)');
    console.log('  ✅ TestCases: Separate from Activity');
    console.log('  ✅ TestResults: Separate from Submission (with expectedOutput snapshot)');
    console.log('  ✅ StudentCompetencies: Separate from StudentTwin');
    console.log('\n  📌 Conscious Denormalizations:');
    console.log('     • labsessions.course/yearLevel/section');
    console.log('     • submissions.labSessionId');
    console.log('     • test_results.expectedOutput (snapshot)');

    console.log('\n🧪 DATA CREATED:');
    console.log('═'.repeat(60));
    console.log(`  • ${instructorUsers.length} instructor users`);
    console.log(`  • ${instructors.length} instructor profiles`);
    console.log(`  • ${studentUsers.length} student users`);
    console.log(`  • ${students.length} student profiles`);
    console.log(`  • ${studentTwins.length} student twins`);
    console.log(`  • ${competencyRecords.length} student competencies`);
    console.log(`  • 7 lab sessions`);
    console.log(`  • ${enrollments.length} session enrollments`);
    console.log(`  • 12 activities`);
    console.log(`  • ${testCases.length} test cases`);
    console.log(`  • 18 submissions`);
    console.log(`  • ${testResultRecords.length} test results`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
