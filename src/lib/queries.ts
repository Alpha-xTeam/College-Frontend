import api from './api';

export const dashboardQueries = {
  getDeanStats: () => api.get('/stats/dean').then(res => res.data),
  getDepartmentsFull: () => api.get('/departments-full').then(res => res.data),
  getRecentActivities: () => api.get('/activities/recent').then(res => res.data),
  getAnnouncements: (departmentId: string) => 
    api.get(`/announcements?department_id=${departmentId || ''}`).then(res => res.data),
  
  getHodStats: (deptId: string) => api.get(`/stats/hod/${deptId}`).then(res => res.data),
  getDeptCourses: (deptId: string) => api.get(`/courses/department/${deptId}`).then(res => res.data),
  
  getTeacherStats: (teacherId: string) => api.get(`/stats/teacher/${teacherId}`).then(res => res.data),
  getTeacherLectures: (teacherId: string) => api.get(`/lectures/teacher/${teacherId}`).then(res => res.data),
  getTeacherClassrooms: (teacherId: string) => api.get(`/classrooms?role=teacher&user_id=${teacherId}`).then(res => res.data),
  
  getStudentStats: (studentId: string) => api.get(`/stats/student/${studentId}`).then(res => res.data),
  getLectures: () => api.get(`/lectures`).then(res => res.data),
  getStudentAttendanceStats: (studentId: string) => api.get(`/attendance/student/${studentId}/stats`).then(res => res.data),
  getAcademicLevels: () => api.get('/academic-levels').then(res => res.data),
};
