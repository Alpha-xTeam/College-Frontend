// ============================================
// College Management System - Type Definitions
// ============================================

export type UserRole = 'owner' | 'dean' | 'hod' | 'teacher' | 'student' | 'supervisor';

export interface User {
  id: string;
  email: string;
  full_name: string;
  full_name_ar: string;
  role: UserRole;
  department_id: string | null;
  section_id?: string | null;
  group_id?: string | null;
  level?: number | null;
  avatar_url: string | null;
  created_at: string;
  student_id?: string;
  teacher_id?: string;
  password_changed?: boolean;
}

export interface Department {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  hod_id: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  department_id: string;
  teacher_id: string;
  credits: number;
  semester: number;
  created_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  description: string;
  course_id: string;
  teacher_id: string;
  class_code: string;
  created_at: string;
  enrolled_count: number;
  banner_url?: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  department_id: string | null;
  type: 'scientific' | 'theoretical';
  code: string;
}

export interface Lecture {
  id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  teacher_id: string;
  teacher_name: string;
  room_id: string;
  room_name: string;
  academic_year: number; // 1, 2, 3, 4
  day_of_week: number; // 0=Sunday ... 6=Saturday
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  department_id: string;
  lecture_type: 'theoretical' | 'practical';
  study_type: 'morning' | 'evening';
  section_id?: string;
  group_id?: string;
  section_name?: string;
  group_name?: string;
  color: string;
  assistants?: { id: string; full_name: string; full_name_ar?: string }[];
  is_rescheduled?: boolean;
  reason?: string;
}

export interface AcademicSection {
  id: string;
  name: string;
  department_id: string;
  created_at: string;
}

export interface AcademicGroup {
  id: string;
  name: string;
  department_id: string;
  created_at: string;
}

export interface AcademicLevel {
  id: number;
  name_ar: string;
  name_en: string;
  level_number: number;
}

export interface ClassroomPost {
  id: string;
  classroom_id: string;
  author_id: string;
  author_name?: string;
  author_role?: string;
  title?: string;
  content: string;
  file_url?: string;
  file_type?: string;
  post_type: 'announcement' | 'file' | 'poll' | 'assignment';
  created_at: string;
  comments?: PostComment[];
  max_score?: number;
  due_date?: string;
  poll_options?: string[];
  poll_responses?: PollResponse[];
  submissions?: AssignmentSubmission[];
}

export interface PollResponse {
  id: string;
  post_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  post_id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  grade?: number;
  feedback?: string;
  submitted_at: string;
  profiles?: User;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: User;
}

export interface Material {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  type: 'pdf' | 'link' | 'video' | 'assignment';
  url: string;
  uploaded_by: string;
  created_at: string;
}

export interface AttendanceSession {
  id: string;
  lecture_id: string;
  course_name: string;
  date: string;
  opened_at: string;
  closed_at: string | null;
  is_active: boolean;
  teacher_id: string;
  qr_token?: string;
  expires_at?: string;
}

export interface AttendanceLog {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  marked_at: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

export interface AttendanceAnalytics {
  course_name: string;
  course_code: string;
  total_sessions: number;
  attended: number;
  percentage: number;
}

export type DayName = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface ScheduleConflict {
  type: 'room' | 'teacher';
  message: string;
  conflicting_lecture: Lecture;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  department_id: string | null;
  is_global: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  publisher_name?: string;
  publisher_role?: string;
}
