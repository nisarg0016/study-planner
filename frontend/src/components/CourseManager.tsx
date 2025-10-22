import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Course {
  id: number;
  title: string;
  description: string;
  course_code: string;
  credits: number;
  semester: string;
  year: number;
  start_date?: string;
  end_date?: string;
  instructor_id: number;
  instructor_name: string;
  is_active: boolean;
  enrolled_students: number;
  created_at: string;
  updated_at: string;
}

interface NewCourseForm {
  title: string;
  description: string;
  course_code: string;
  credits: number;
  semester: string;
  year: number;
  start_date: string;
  end_date: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
}

interface ProgressData {
  task_statistics: Array<{
    user_id: number;
    student_name: string;
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    pending_tasks: number;
  }>;
}

export const CourseManager: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'courses' | 'progress' | 'notifications'>('courses');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newCourse, setNewCourse] = useState<NewCourseForm>({
    title: '',
    description: '',
    course_code: '',
    credits: 3,
    semester: 'Fall',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchCourses();
    if (user?.role === 'academic_advisor') {
      fetchNotifications();
      fetchProgressData();
    }
  }, [user]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses');
      setCourses(response.data.courses || []);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
    }
  };

  const fetchProgressData = async () => {
    try {
      const response = await api.get('/notifications/progress-tracking');
      setProgressData(response.data);
    } catch (error: any) {
      console.error('Failed to load progress data:', error);
    }
  };

  const createCourse = async () => {
    try {
      const response = await api.post('/courses', newCourse);
      setCourses([response.data.course, ...courses]);
      setShowAddForm(false);
      setNewCourse({
        title: '',
        description: '',
        course_code: '',
        credits: 3,
        semester: 'Fall',
        year: new Date().getFullYear(),
        start_date: '',
        end_date: ''
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create course');
    }
  };

  const deleteCourse = async (courseId: number) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      await api.delete(`/courses/${courseId}`);
      setCourses(courses.filter(course => course.id !== courseId));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete course');
    }
  };

  const createProgressNotifications = async () => {
    try {
      const response = await api.post('/notifications/create-progress-notifications');
      alert(`${response.data.notifications_sent} progress notifications sent successfully!`);
      fetchNotifications();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create progress notifications');
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user?.role !== 'academic_advisor' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only academic advisors can access course management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Course & Progress Management</h1>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('courses')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'courses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Course Management
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'progress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Progress Tracking
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notifications
            </button>
          </nav>
        </div>

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Course Management</h2>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add New Course
              </button>
            </div>

            {/* Course Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Total Courses</h3>
                <p className="text-3xl font-bold text-blue-600">{courses.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Active Courses</h3>
                <p className="text-3xl font-bold text-green-600">
                  {courses.filter(course => course.is_active).length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Total Enrollments</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {courses.reduce((sum, course) => sum + (course.enrolled_students || 0), 0)}
                </p>
              </div>
            </div>

            {/* Add Course Form Modal */}
            {showAddForm && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Course</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Course Title</label>
                      <input
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newCourse.title}
                        onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Course Code</label>
                      <input
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newCourse.course_code}
                        onChange={(e) => setNewCourse({...newCourse, course_code: e.target.value})}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        value={newCourse.description}
                        onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Credits</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newCourse.credits}
                        onChange={(e) => setNewCourse({...newCourse, credits: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Semester</label>
                      <select
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newCourse.semester}
                        onChange={(e) => setNewCourse({...newCourse, semester: e.target.value})}
                      >
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                        <option value="Fall">Fall</option>
                        <option value="Winter">Winter</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Year</label>
                      <input
                        type="number"
                        min="2020"
                        max="2030"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newCourse.year}
                        onChange={(e) => setNewCourse({...newCourse, year: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newCourse.start_date}
                        onChange={(e) => setNewCourse({...newCourse, start_date: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newCourse.end_date}
                        onChange={(e) => setNewCourse({...newCourse, end_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createCourse}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create Course
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Courses List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {courses.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500">
                    No courses yet. Click "Add New Course" to create your first course.
                  </li>
                ) : (
                  courses.map((course) => (
                    <li key={course.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">
                              {course.title} ({course.course_code})
                            </h3>
                            <div className="flex space-x-2">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                course.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {course.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                          
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <span>Credits: {course.credits}</span>
                            <span>{course.semester} {course.year}</span>
                            <span>Instructor: {course.instructor_name}</span>
                            <span>Enrolled: {course.enrolled_students || 0}</span>
                          </div>
                        </div>

                        <div className="ml-4 flex space-x-2">
                          <button
                            onClick={() => deleteCourse(course.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Progress Tracking Tab */}
        {activeTab === 'progress' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Student Progress Tracking</h2>
              <button
                onClick={createProgressNotifications}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Send Progress Notifications
              </button>
            </div>

            {progressData && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Student Task Statistics
                  </h3>
                </div>
                <ul className="divide-y divide-gray-200">
                  {progressData.task_statistics.map((student) => (
                    <li key={student.user_id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">{student.student_name}</h4>
                          <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Total Tasks</p>
                              <p className="text-lg font-semibold text-blue-600">{student.total_tasks}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Completed</p>
                              <p className="text-lg font-semibold text-green-600">{student.completed_tasks}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">In Progress</p>
                              <p className="text-lg font-semibold text-yellow-600">{student.in_progress_tasks}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Pending</p>
                              <p className="text-lg font-semibold text-red-600">{student.pending_tasks}</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Completion Rate</p>
                            <p className="text-lg font-semibold">
                              {student.total_tasks > 0 
                                ? ((student.completed_tasks / student.total_tasks) * 100).toFixed(1)
                                : 0}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Notifications</h2>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {notifications.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500">
                    No notifications found.
                  </li>
                ) : (
                  notifications.map((notification) => (
                    <li key={notification.id} className="px-6 py-4">
                      <div className={`flex items-center justify-between ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}>
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">{notification.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span className={`px-2 py-1 rounded-full ${
                              notification.priority === 'high' 
                                ? 'bg-red-100 text-red-800'
                                : notification.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {notification.priority} priority
                            </span>
                            <span>{new Date(notification.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {!notification.is_read && (
                          <button
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};