import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface AnalyticsData {
  dashboard: {
    dailyAnalytics: Array<{
      date: string;
      total_study_time_minutes: number;
      total_productive_time_minutes: number;
      total_distracting_time_minutes: number;
      tasks_completed: number;
      tasks_created: number;
      average_productivity_rating: number;
    }>;
    taskStats: {
      total_tasks: number;
      completed_tasks: number;
      in_progress_tasks: number;
      pending_tasks: number;
      overdue_tasks: number;
    };
    syllabusStats: {
      total_topics: number;
      completed_topics: number;
      avg_completion_percentage: number;
      total_subjects: number;
    };
  };
  studySessions: {
    sessions: Array<{
      id: number;
      start_time: string;
      end_time: string;
      duration_minutes: number;
      productivity_rating: number;
      notes: string;
      task_title?: string;
      syllabus_topic?: string;
      syllabus_subject?: string;
    }>;
    stats: {
      total_sessions: number;
      avg_duration_minutes: number;
      total_study_minutes: number;
      avg_productivity_rating: number;
      high_productivity_sessions: number;
    };
  };
}

interface StudySession {
  id: number;
  taskId?: number;
  syllabusId?: number;
  eventId?: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  productivityRating?: number;
  notes?: string;
}

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'tracking'>('overview');
  const [dateRange, setDateRange] = useState('week');
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [sessionForm, setSessionForm] = useState({
    productivityRating: 5,
    notes: '',
    breakCount: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, sessionsResponse] = await Promise.all([
        api.get(`/analytics/dashboard?timeRange=${dateRange}`),
        api.get(`/analytics/study-sessions?startDate=${getStartDate()}&endDate=${getEndDate()}`)
      ]);

      setAnalyticsData({
        dashboard: dashboardResponse.data.dashboard || {
          dailyAnalytics: [],
          taskStats: {
            total_tasks: 0,
            completed_tasks: 0,
            in_progress_tasks: 0,
            pending_tasks: 0,
            overdue_tasks: 0
          },
          syllabusStats: {
            total_topics: 0,
            completed_topics: 0,
            avg_completion_percentage: 0,
            total_subjects: 0
          }
        },
        studySessions: sessionsResponse.data.studySessions || {
          sessions: [],
          stats: {
            total_sessions: 0,
            avg_duration_minutes: 0,
            total_study_minutes: 0,
            avg_productivity_rating: 0,
            high_productivity_sessions: 0
          }
        }
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const getEndDate = () => {
    return new Date().toISOString();
  };

  const startStudySession = async (taskId?: number, syllabusId?: number, eventId?: number) => {
    try {
      const response = await api.post('/analytics/study-sessions', {
        taskId,
        syllabusId,
        eventId
      });
      setActiveSession(response.data.session);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to start study session');
    }
  };

  const endStudySession = async () => {
    if (!activeSession) return;

    try {
      await api.put(`/analytics/study-sessions/${activeSession.id}/end`, sessionForm);
      setActiveSession(null);
      setSessionForm({
        productivityRating: 5,
        notes: '',
        breakCount: 0
      });
      fetchAnalyticsData(); // Refresh data
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to end study session');
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getCompletionRate = (completed: number, total: number) => {
    return total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h2>
          <p className="text-gray-600">Start studying to see your analytics!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Active Session Banner */}
        {activeSession && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">Active Study Session</h3>
                <p className="text-blue-700">
                  Started: {new Date(activeSession.startTime).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700">Productivity (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={sessionForm.productivityRating}
                    onChange={(e) => setSessionForm({
                      ...sessionForm,
                      productivityRating: parseInt(e.target.value)
                    })}
                    className="mt-1 block w-20 px-2 py-1 border border-blue-300 rounded-md"
                  />
                </div>
                <button
                  onClick={endStudySession}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  End Session
                </button>
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-blue-700">Notes</label>
              <input
                type="text"
                value={sessionForm.notes}
                onChange={(e) => setSessionForm({
                  ...sessionForm,
                  notes: e.target.value
                })}
                className="mt-1 block w-full px-3 py-2 border border-blue-300 rounded-md"
                placeholder="Add session notes..."
              />
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Study Sessions
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tracking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Progress Tracking
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Total Study Time</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {formatTime(
                    analyticsData.dashboard.dailyAnalytics.reduce(
                      (sum, day) => sum + day.total_study_time_minutes, 0
                    )
                  )}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Tasks Completed</h3>
                <p className="text-3xl font-bold text-green-600">
                  {analyticsData.dashboard.taskStats.completed_tasks}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Avg Productivity</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {analyticsData.studySessions.stats.avg_productivity_rating?.toFixed(1) || '0'}/5
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Study Sessions</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {analyticsData.studySessions.stats.total_sessions}
                </p>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Task Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Completed Tasks</span>
                      <span>{getCompletionRate(
                        analyticsData.dashboard.taskStats.completed_tasks,
                        analyticsData.dashboard.taskStats.total_tasks
                      )}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${getCompletionRate(
                            analyticsData.dashboard.taskStats.completed_tasks,
                            analyticsData.dashboard.taskStats.total_tasks
                          )}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Tasks</p>
                      <p className="text-lg font-semibold">{analyticsData.dashboard.taskStats.total_tasks}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Overdue</p>
                      <p className="text-lg font-semibold text-red-600">{analyticsData.dashboard.taskStats.overdue_tasks}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Syllabus Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Completed Topics</span>
                      <span>{getCompletionRate(
                        analyticsData.dashboard.syllabusStats.completed_topics,
                        analyticsData.dashboard.syllabusStats.total_topics
                      )}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${getCompletionRate(
                            analyticsData.dashboard.syllabusStats.completed_topics,
                            analyticsData.dashboard.syllabusStats.total_topics
                          )}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Topics</p>
                      <p className="text-lg font-semibold">{analyticsData.dashboard.syllabusStats.total_topics}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Subjects</p>
                      <p className="text-lg font-semibold">{analyticsData.dashboard.syllabusStats.total_subjects}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Study Sessions Tab */}
        {activeTab === 'sessions' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Study Sessions</h2>
              {!activeSession && (
                <button
                  onClick={() => startStudySession()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Start Study Session
                </button>
              )}
            </div>

            {/* Session Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Total Sessions</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {analyticsData.studySessions.stats.total_sessions}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Avg Duration</h3>
                <p className="text-3xl font-bold text-green-600">
                  {formatTime(analyticsData.studySessions.stats.avg_duration_minutes || 0)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">High Productivity</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {analyticsData.studySessions.stats.high_productivity_sessions}
                </p>
              </div>
            </div>

            {/* Sessions List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {analyticsData.studySessions.sessions.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500">
                    No study sessions recorded yet. Start your first session!
                  </li>
                ) : (
                  analyticsData.studySessions.sessions.map((session) => (
                    <li key={session.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(session.start_time).toLocaleDateString()} 
                                {' '}
                                {new Date(session.start_time).toLocaleTimeString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                {session.task_title && `Task: ${session.task_title}`}
                                {session.syllabus_topic && `Topic: ${session.syllabus_topic} (${session.syllabus_subject})`}
                                {!session.task_title && !session.syllabus_topic && 'General Study Session'}
                              </p>
                            </div>
                          </div>
                          {session.notes && (
                            <p className="text-sm text-gray-600 mt-1">{session.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="text-center">
                            <p className="text-gray-500">Duration</p>
                            <p className="font-semibold">{formatTime(session.duration_minutes)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">Rating</p>
                            <p className="font-semibold">{session.productivity_rating}/5</p>
                          </div>
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
        {activeTab === 'tracking' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Progress Tracking</h2>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600">
                Detailed progress tracking features coming soon. This will include:
              </p>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>• Daily study time trends</li>
                <li>• Subject-wise progress charts</li>
                <li>• Productivity patterns analysis</li>
                <li>• Goal tracking and achievements</li>
                <li>• Web activity monitoring</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};