import type { User, Department, Course, Classroom, Room, Lecture, Material, AttendanceSession, AttendanceLog, AttendanceAnalytics } from '@/types';

// ============ USERS ============
export const users: User[] = [
  { id: 'u1', email: 'dean@college.edu', full_name: 'Dr. Ahmad Al-Rashid', full_name_ar: 'د. أحمد الراشد', role: 'dean', department_id: null, avatar_url: null, created_at: '2024-01-01' },
  { id: 'u2', email: 'hod.cs@college.edu', full_name: 'Dr. Sara Al-Fahad', full_name_ar: 'د. سارة الفهد', role: 'hod', department_id: 'd1', avatar_url: null, created_at: '2024-01-01' },
  { id: 'u3', email: 'hod.eng@college.edu', full_name: 'Dr. Omar Khalil', full_name_ar: 'د. عمر خليل', role: 'hod', department_id: 'd2', avatar_url: null, created_at: '2024-01-01' },
  { id: 'u4', email: 'teacher1@college.edu', full_name: 'Prof. Layla Hassan', full_name_ar: 'أ. ليلى حسن', role: 'teacher', department_id: 'd1', avatar_url: null, created_at: '2024-01-01' },
  { id: 'u5', email: 'teacher2@college.edu', full_name: 'Prof. Khaled Noor', full_name_ar: 'أ. خالد نور', role: 'teacher', department_id: 'd1', avatar_url: null, created_at: '2024-01-01' },
  { id: 'u6', email: 'teacher3@college.edu', full_name: 'Prof. Fatima Zahra', full_name_ar: 'أ. فاطمة زهراء', role: 'teacher', department_id: 'd2', avatar_url: null, created_at: '2024-01-01' },
  { id: 'u7', email: 'student1@college.edu', full_name: 'Ali Mohammed', full_name_ar: 'علي محمد', role: 'student', department_id: 'd1', avatar_url: null, created_at: '2024-01-01' },
  { id: 'u8', email: 'student2@college.edu', full_name: 'Nour Al-Din', full_name_ar: 'نور الدين', role: 'student', department_id: 'd1', avatar_url: null, created_at: '2024-01-01' },
  { id: 'u9', email: 'student3@college.edu', full_name: 'Zainab Kareem', full_name_ar: 'زينب كريم', role: 'student', department_id: 'd1', avatar_url: null, created_at: '2024-01-01' },
  { id: 'u10', email: 'student4@college.edu', full_name: 'Yasir Abbas', full_name_ar: 'ياسر عباس', role: 'student', department_id: 'd2', avatar_url: null, created_at: '2024-01-01' },
];

// ============ DEPARTMENTS ============
export const departments: Department[] = [
  { id: 'd1', name: 'Computer Science', name_ar: 'علوم الحاسوب', code: 'CS', hod_id: 'u2', created_at: '2024-01-01' },
  { id: 'd2', name: 'Engineering', name_ar: 'الهندسة', code: 'ENG', hod_id: 'u3', created_at: '2024-01-01' },
  { id: 'd3', name: 'Mathematics', name_ar: 'الرياضيات', code: 'MATH', hod_id: null, created_at: '2024-01-01' },
  { id: 'd4', name: 'Physics', name_ar: 'الفيزياء', code: 'PHY', hod_id: null, created_at: '2024-01-01' },
];

// ============ ROOMS ============
export const rooms: Room[] = [
  { id: 'r1', name: 'Room 101', building: 'Building A', capacity: 40 },
  { id: 'r2', name: 'Room 102', building: 'Building A', capacity: 35 },
  { id: 'r3', name: 'Lab 201', building: 'Building B', capacity: 30 },
  { id: 'r4', name: 'Lab 202', building: 'Building B', capacity: 25 },
  { id: 'r5', name: 'Hall 301', building: 'Building C', capacity: 100 },
  { id: 'r6', name: 'Room 103', building: 'Building A', capacity: 45 },
];

// ============ COURSES ============
export const courses: Course[] = [
  { id: 'c1', name: 'Data Structures', name_ar: 'هياكل البيانات', code: 'CS201', department_id: 'd1', teacher_id: 'u4', credits: 3, semester: 3, created_at: '2024-01-01' },
  { id: 'c2', name: 'Algorithms', name_ar: 'الخوارزميات', code: 'CS301', department_id: 'd1', teacher_id: 'u4', credits: 3, semester: 5, created_at: '2024-01-01' },
  { id: 'c3', name: 'Database Systems', name_ar: 'نظم قواعد البيانات', code: 'CS302', department_id: 'd1', teacher_id: 'u5', credits: 3, semester: 5, created_at: '2024-01-01' },
  { id: 'c4', name: 'Web Development', name_ar: 'تطوير الويب', code: 'CS303', department_id: 'd1', teacher_id: 'u5', credits: 3, semester: 6, created_at: '2024-01-01' },
  { id: 'c5', name: 'Circuit Analysis', name_ar: 'تحليل الدوائر', code: 'ENG201', department_id: 'd2', teacher_id: 'u6', credits: 4, semester: 3, created_at: '2024-01-01' },
  { id: 'c6', name: 'Thermodynamics', name_ar: 'الديناميكا الحرارية', code: 'ENG301', department_id: 'd2', teacher_id: 'u6', credits: 3, semester: 5, created_at: '2024-01-01' },
];

// ============ LECTURES (SCHEDULE) ============
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export const initialLectures: Lecture[] = [
  { id: 'l1', course_id: 'c1', course_name: 'Data Structures', course_code: 'CS201', teacher_id: 'u4', teacher_name: 'Prof. Layla Hassan', room_id: 'r1', room_name: 'Room 101', day_of_week: 0, start_time: '08:00', end_time: '09:30', department_id: 'd1', color: COLORS[0] },
  { id: 'l2', course_id: 'c1', course_name: 'Data Structures', course_code: 'CS201', teacher_id: 'u4', teacher_name: 'Prof. Layla Hassan', room_id: 'r3', room_name: 'Lab 201', day_of_week: 2, start_time: '10:00', end_time: '11:30', department_id: 'd1', color: COLORS[0] },
  { id: 'l3', course_id: 'c2', course_name: 'Algorithms', course_code: 'CS301', teacher_id: 'u4', teacher_name: 'Prof. Layla Hassan', room_id: 'r1', room_name: 'Room 101', day_of_week: 1, start_time: '08:00', end_time: '09:30', department_id: 'd1', color: COLORS[1] },
  { id: 'l4', course_id: 'c2', course_name: 'Algorithms', course_code: 'CS301', teacher_id: 'u4', teacher_name: 'Prof. Layla Hassan', room_id: 'r1', room_name: 'Room 101', day_of_week: 3, start_time: '08:00', end_time: '09:30', department_id: 'd1', color: COLORS[1] },
  { id: 'l5', course_id: 'c3', course_name: 'Database Systems', course_code: 'CS302', teacher_id: 'u5', teacher_name: 'Prof. Khaled Noor', room_id: 'r2', room_name: 'Room 102', day_of_week: 0, start_time: '10:00', end_time: '11:30', department_id: 'd1', color: COLORS[2] },
  { id: 'l6', course_id: 'c3', course_name: 'Database Systems', course_code: 'CS302', teacher_id: 'u5', teacher_name: 'Prof. Khaled Noor', room_id: 'r4', room_name: 'Lab 202', day_of_week: 2, start_time: '08:00', end_time: '09:30', department_id: 'd1', color: COLORS[2] },
  { id: 'l7', course_id: 'c4', course_name: 'Web Development', course_code: 'CS303', teacher_id: 'u5', teacher_name: 'Prof. Khaled Noor', room_id: 'r3', room_name: 'Lab 201', day_of_week: 1, start_time: '10:00', end_time: '11:30', department_id: 'd1', color: COLORS[3] },
  { id: 'l8', course_id: 'c4', course_name: 'Web Development', course_code: 'CS303', teacher_id: 'u5', teacher_name: 'Prof. Khaled Noor', room_id: 'r3', room_name: 'Lab 201', day_of_week: 3, start_time: '10:00', end_time: '11:30', department_id: 'd1', color: COLORS[3] },
  { id: 'l9', course_id: 'c5', course_name: 'Circuit Analysis', course_code: 'ENG201', teacher_id: 'u6', teacher_name: 'Prof. Fatima Zahra', room_id: 'r6', room_name: 'Room 103', day_of_week: 0, start_time: '08:00', end_time: '09:30', department_id: 'd2', color: COLORS[4] },
  { id: 'l10', course_id: 'c5', course_name: 'Circuit Analysis', course_code: 'ENG201', teacher_id: 'u6', teacher_name: 'Prof. Fatima Zahra', room_id: 'r4', room_name: 'Lab 202', day_of_week: 2, start_time: '12:00', end_time: '13:30', department_id: 'd2', color: COLORS[4] },
  { id: 'l11', course_id: 'c6', course_name: 'Thermodynamics', course_code: 'ENG301', teacher_id: 'u6', teacher_name: 'Prof. Fatima Zahra', room_id: 'r5', room_name: 'Hall 301', day_of_week: 1, start_time: '12:00', end_time: '13:30', department_id: 'd2', color: COLORS[5] },
  { id: 'l12', course_id: 'c6', course_name: 'Thermodynamics', course_code: 'ENG301', teacher_id: 'u6', teacher_name: 'Prof. Fatima Zahra', room_id: 'r5', room_name: 'Hall 301', day_of_week: 3, start_time: '12:00', end_time: '13:30', department_id: 'd2', color: COLORS[5] },
];

// ============ CLASSROOMS ============
export const classrooms: Classroom[] = [
  { id: 'cl1', name: 'Data Structures - Fall 2024', code: 'CS201', description: 'Learn fundamental data structures including arrays, linked lists, trees, and graphs.', course_id: 'c1', teacher_id: 'u4', class_code: 'DS2024X', created_at: '2024-09-01', enrolled_count: 35 },
  { id: 'cl2', name: 'Algorithms - Fall 2024', code: 'CS301', description: 'Advanced algorithm design and analysis.', course_id: 'c2', teacher_id: 'u4', class_code: 'ALG24Y', created_at: '2024-09-01', enrolled_count: 28 },
  { id: 'cl3', name: 'Database Systems - Fall 2024', code: 'CS302', description: 'Relational databases, SQL, and database design principles.', course_id: 'c3', teacher_id: 'u5', class_code: 'DB24ZZ', created_at: '2024-09-01', enrolled_count: 32 },
  { id: 'cl4', name: 'Web Development - Fall 2024', code: 'CS303', description: 'Modern web development with React, Node.js, and databases.', course_id: 'c4', teacher_id: 'u5', class_code: 'WEB24A', created_at: '2024-09-01', enrolled_count: 40 },
  { id: 'cl5', name: 'Circuit Analysis - Fall 2024', code: 'ENG201', description: 'Fundamentals of electrical circuit analysis.', course_id: 'c5', teacher_id: 'u6', class_code: 'CIR24B', created_at: '2024-09-01', enrolled_count: 25 },
];

// ============ MATERIALS ============
export const materials: Material[] = [
  { id: 'm1', classroom_id: 'cl1', title: 'Chapter 1 - Introduction to Data Structures', description: 'Overview of basic data structures and their applications.', type: 'pdf', url: '#', uploaded_by: 'u4', created_at: '2024-09-05' },
  { id: 'm2', classroom_id: 'cl1', title: 'Linked List Implementation Tutorial', description: 'Step-by-step guide for implementing linked lists.', type: 'video', url: '#', uploaded_by: 'u4', created_at: '2024-09-10' },
  { id: 'm3', classroom_id: 'cl1', title: 'Assignment 1 - Arrays and Strings', description: 'Complete all 5 problems. Due: Week 3.', type: 'assignment', url: '#', uploaded_by: 'u4', created_at: '2024-09-12' },
  { id: 'm4', classroom_id: 'cl1', title: 'Visualgo - Data Structure Visualizations', description: 'Interactive tool for visualizing data structures.', type: 'link', url: 'https://visualgo.net', uploaded_by: 'u4', created_at: '2024-09-15' },
  { id: 'm5', classroom_id: 'cl3', title: 'SQL Fundamentals', description: 'Introduction to SQL queries and database operations.', type: 'pdf', url: '#', uploaded_by: 'u5', created_at: '2024-09-05' },
  { id: 'm6', classroom_id: 'cl3', title: 'ER Diagram Tutorial', description: 'How to design entity-relationship diagrams.', type: 'video', url: '#', uploaded_by: 'u5', created_at: '2024-09-08' },
  { id: 'm7', classroom_id: 'cl4', title: 'React Basics', description: 'Getting started with React.js.', type: 'pdf', url: '#', uploaded_by: 'u5', created_at: '2024-09-05' },
  { id: 'm8', classroom_id: 'cl4', title: 'Project Requirements', description: 'Build a full-stack web application.', type: 'assignment', url: '#', uploaded_by: 'u5', created_at: '2024-09-20' },
];

// ============ ATTENDANCE ============
export const attendanceSessions: AttendanceSession[] = [
  { id: 'as1', lecture_id: 'l1', course_name: 'Data Structures', date: '2024-12-01', opened_at: '2024-12-01T08:00:00', closed_at: '2024-12-01T08:15:00', is_active: false, teacher_id: 'u4' },
  { id: 'as2', lecture_id: 'l3', course_name: 'Algorithms', date: '2024-12-02', opened_at: '2024-12-02T08:00:00', closed_at: '2024-12-02T08:10:00', is_active: false, teacher_id: 'u4' },
  { id: 'as3', lecture_id: 'l5', course_name: 'Database Systems', date: '2024-12-01', opened_at: '2024-12-01T10:00:00', closed_at: null, is_active: true, teacher_id: 'u5' },
  { id: 'as4', lecture_id: 'l2', course_name: 'Data Structures', date: '2024-12-03', opened_at: '2024-12-03T10:00:00', closed_at: '2024-12-03T10:20:00', is_active: false, teacher_id: 'u4' },
];

export const attendanceLogs: AttendanceLog[] = [
  { id: 'al1', session_id: 'as1', student_id: 'u7', student_name: 'Ali Mohammed', marked_at: '2024-12-01T08:02:00', status: 'present' },
  { id: 'al2', session_id: 'as1', student_id: 'u8', student_name: 'Nour Al-Din', marked_at: '2024-12-01T08:05:00', status: 'present' },
  { id: 'al3', session_id: 'as1', student_id: 'u9', student_name: 'Zainab Kareem', marked_at: '2024-12-01T08:12:00', status: 'late' },
  { id: 'al4', session_id: 'as2', student_id: 'u7', student_name: 'Ali Mohammed', marked_at: '2024-12-02T08:01:00', status: 'present' },
  { id: 'al5', session_id: 'as2', student_id: 'u9', student_name: 'Zainab Kareem', marked_at: '2024-12-02T08:03:00', status: 'present' },
  { id: 'al6', session_id: 'as3', student_id: 'u7', student_name: 'Ali Mohammed', marked_at: '2024-12-01T10:02:00', status: 'present' },
  { id: 'al7', session_id: 'as4', student_id: 'u7', student_name: 'Ali Mohammed', marked_at: '2024-12-03T10:01:00', status: 'present' },
  { id: 'al8', session_id: 'as4', student_id: 'u8', student_name: 'Nour Al-Din', marked_at: '2024-12-03T10:15:00', status: 'late' },
];

export const studentAnalytics: AttendanceAnalytics[] = [
  { course_name: 'Data Structures', course_code: 'CS201', total_sessions: 24, attended: 22, percentage: 91.7 },
  { course_name: 'Algorithms', course_code: 'CS301', total_sessions: 24, attended: 20, percentage: 83.3 },
  { course_name: 'Database Systems', course_code: 'CS302', total_sessions: 24, attended: 18, percentage: 75.0 },
  { course_name: 'Web Development', course_code: 'CS303', total_sessions: 24, attended: 23, percentage: 95.8 },
];

// ============ HELPER: Generate class code ============
export function generateClassCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
