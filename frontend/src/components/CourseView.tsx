import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
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

interface Enrollment {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  enrolled_at: string;
}

interface CourseViewProps {}

export const CourseView: React.FC<CourseViewProps> = () => {
  const { user } = useAuth();
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'students' | 'progress'>('details');
  const [enrollmentForm, setEnrollmentForm] = useState({
    user_id: '',
    showForm: false
  });

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const courseResponse = await api.get(`/courses/${courseId}`);
      setCourse(courseResponse.data.course);

      // If user is academic advisor, also fetch enrollments
      if (user?.role === 'academic_advisor' || user?.role === 'admin') {
        const enrollmentsResponse = await api.get(`/courses/${courseId}/enrollments`);
        setEnrollments(enrollmentsResponse.data.enrollments || []);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const updateCourse = async (updates: Partial<Course>) => {
    try {
      const response = await api.put(`/courses/${courseId}`, updates);
      setCourse(response.data.course);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update course');
    }
  };

  const enrollStudent = async () => {
    try {
      await api.post(`/courses/${courseId}/enroll`, {
        user_id: parseInt(enrollmentForm.user_id)
      });
      setEnrollmentForm({ user_id: '', showForm: false });
      fetchCourseData(); // Refresh data
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to enroll student');
    }
  };

  const toggleCourseStatus = async () => {
    if (!course) return;
    await updateCourse({ is_active: !course.is_active });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h2>
          <button
            onClick={() => navigate('/courses')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/courses')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to Courses
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {course.title} ({course.course_code})
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              course.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {course.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {(user?.role === 'academic_advisor' || user?.role === 'admin') && (
            <div className="flex space-x-3">
              <button
                onClick={toggleCourseStatus}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  course.is_active
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {course.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Course Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Credits</h3>
            <p className="text-3xl font-bold text-blue-600">{course.credits}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Semester</h3>
            <p className="text-3xl font-bold text-green-600">{course.semester} {course.year}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Instructor</h3>
            <p className="text-lg font-bold text-purple-600">{course.instructor_name}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Enrolled Students</h3>
            <p className="text-3xl font-bold text-orange-600">{course.enrolled_students}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Course Details
            </button>
            {(user?.role === 'academic_advisor' || user?.role === 'admin') && (
              <>
                <button
                  onClick={() => setActiveTab('students')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'students'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Enrolled Students ({enrollments.length})
                </button>
                <button
                  onClick={() => setActiveTab('progress')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'progress'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Student Progress
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Course Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Course Information
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {course.description || 'No description provided'}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Course Code</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {course.course_code}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Credits</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {course.credits}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Semester</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {course.semester} {course.year}
                  </dd>
                </div>
                {course.start_date && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(course.start_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {course.end_date && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">End Date</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(course.end_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Instructor</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {course.instructor_name}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      course.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(course.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (user?.role === 'academic_advisor' || user?.role === 'admin') && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Enrolled Students</h2>
              <button
                onClick={() => setEnrollmentForm({ ...enrollmentForm, showForm: true })}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Enroll Student
              </button>
            </div>

            {/* Enrollment Form Modal */}
            {enrollmentForm.showForm && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Enroll Student</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Student ID</label>
                    <input
                      type="number"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={enrollmentForm.user_id}
                      onChange={(e) => setEnrollmentForm({
                        ...enrollmentForm,
                        user_id: e.target.value
                      })}
                      placeholder="Enter student user ID"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setEnrollmentForm({ user_id: '', showForm: false })}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={enrollStudent}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={!enrollmentForm.user_id}
                    >
                      Enroll
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Students List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {enrollments.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500">
                    No students enrolled yet.
                  </li>
                ) : (
                  enrollments.map((enrollment) => (
                    <li key={enrollment.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {enrollment.first_name} {enrollment.last_name}
                          </h4>
                          <p className="text-sm text-gray-500">{enrollment.email}</p>
                          <p className="text-xs text-gray-400">
                            Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {enrollment.user_id}
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (user?.role === 'academic_advisor' || user?.role === 'admin') && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Student Progress</h2>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600">
                Student progress tracking for this course will be available soon. This will include:
              </p>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>• Individual student task completion rates</li>
                <li>• Study time analytics per student</li>
                <li>• Assignment submission tracking</li>
                <li>• Attendance and participation metrics</li>
                <li>• Performance trends and insights</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};