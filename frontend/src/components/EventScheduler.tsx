import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Event {
  id: number;
  title: string;
  description?: string;
  event_type: 'study_session' | 'exam' | 'assignment' | 'meeting' | 'break' | 'other';
  start_time: string;
  end_time?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  attendees?: string;
  reminders?: number;
  created_at: string;
  updated_at: string;
}

interface NewEventForm {
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isRecurring: boolean;
  recurrencePattern: string;
  priority: string;
  location: string;
  attendees: string;
  reminders: number;
}

export const EventScheduler: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'today'>('today');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Helper function to get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // Returns HH:MM
  };

  // Helper function to get time one hour from now
  const getOneHourLater = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toTimeString().slice(0, 5); // Returns HH:MM
  };

  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    description: '',
    eventType: 'study_session',
    startDate: new Date().toISOString().split('T')[0],
    startTime: getCurrentTime(),
    endDate: new Date().toISOString().split('T')[0],
    endTime: getOneHourLater(),
    isRecurring: false,
    recurrencePattern: 'weekly',
    priority: 'medium',
    location: '',
    attendees: '',
    reminders: 15
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/events');
      const eventsData = response.data.events || response.data || [];
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load events');
      setEvents([]); // Ensure events is always an array
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        event_type: newEvent.eventType,
        start_date: `${newEvent.startDate}T${newEvent.startTime}:00.000Z`,
        end_date: `${newEvent.endDate}T${newEvent.endTime}:00.000Z`,
        is_recurring: newEvent.isRecurring,
        recurrence_pattern: newEvent.isRecurring ? newEvent.recurrencePattern : null,
        priority: newEvent.priority,
        location: newEvent.location || null,
        attendees: newEvent.attendees || null,
        reminders: newEvent.reminders
      };

      const response = await api.post('/events', eventData);
      setEvents([response.data.event, ...events]);
      setShowAddForm(false);
      resetForm();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create event');
    }
  };

  const updateEvent = async (id: number, updates: Partial<Event>) => {
    try {
      const response = await api.put(`/events/${id}`, updates);
      setEvents(events.map(event => 
        event.id === id ? response.data.event : event
      ));
      setEditingEvent(null);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update event');
    }
  };

  const deleteEvent = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await api.delete(`/events/${id}`);
      setEvents(events.filter(event => event.id !== id));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete event');
    }
  };

  const resetForm = () => {
    setNewEvent({
      title: '',
      description: '',
      eventType: 'study_session',
      startDate: new Date().toISOString().split('T')[0],
      startTime: getCurrentTime(),
      endDate: new Date().toISOString().split('T')[0],
      endTime: getOneHourLater(),
      isRecurring: false,
      recurrencePattern: 'weekly',
      priority: 'medium',
      location: '',
      attendees: '',
      reminders: 15
    });
  };

  const getTodayEvents = () => {
    const today = new Date().toISOString().split('T')[0];
    return events.filter(event => 
      event.start_time.split('T')[0] === today
    );
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    return events.filter(event => 
      new Date(event.start_time) >= today
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const getEventsByDate = (date: string) => {
    return events.filter(event => 
      event.start_time.split('T')[0] === date
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exam': return 'bg-red-500';
      case 'assignment': return 'bg-orange-500';
      case 'study_session': return 'bg-blue-500';
      case 'meeting': return 'bg-green-500';
      case 'break': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Scheduler</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Schedule Event
          </button>
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
              onClick={() => setActiveTab('today')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'today'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Today ({getTodayEvents().length})
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calendar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Calendar View
            </button>
          </nav>
        </div>

        {/* Add Event Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Schedule New Event</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Event Title</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.eventType}
                    onChange={(e) => setNewEvent({...newEvent, eventType: e.target.value})}
                  >
                    <option value="study_session">Study Session</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="meeting">Meeting</option>
                    <option value="break">Break</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.priority}
                    onChange={(e) => setNewEvent({...newEvent, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({...newEvent, startDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="time"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reminder (minutes before)</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newEvent.reminders}
                    onChange={(e) => setNewEvent({...newEvent, reminders: parseInt(e.target.value)})}
                  >
                    <option value={0}>No reminder</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={1440}>1 day</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={newEvent.isRecurring}
                    onChange={(e) => setNewEvent({...newEvent, isRecurring: e.target.checked})}
                  />
                  <label className="ml-2 block text-sm text-gray-900">Recurring Event</label>
                </div>

                {newEvent.isRecurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Recurrence Pattern</label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={newEvent.recurrencePattern}
                      onChange={(e) => setNewEvent({...newEvent, recurrencePattern: e.target.value})}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {setShowAddForm(false); resetForm();}}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={createEvent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Schedule Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Today Tab */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Today's Events</h2>
            {getTodayEvents().length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                No events scheduled for today.
              </div>
            ) : (
              <div className="space-y-3">
                {getTodayEvents().map((event) => (
                  <div key={event.id} className="bg-white p-4 rounded-lg shadow border-l-4" style={{borderLeftColor: getTypeColor(event.event_type).replace('bg-', '#')}}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {event.end_time && (
                            <span>- {new Date(event.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(event.priority)}`}>
                            {event.priority}
                          </span>
                          <span className="capitalize">{event.event_type.replace('_', ' ')}</span>
                          {event.location && <span>📍 {event.location}</span>}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Events Tab */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">All Events</h2>
            {events.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                No events scheduled. Click "Schedule Event" to create your first event.
              </div>
            ) : (
              <div className="space-y-3">
                {getUpcomingEvents().map((event) => (
                  <div key={event.id} className="bg-white p-4 rounded-lg shadow border-l-4" style={{borderLeftColor: getTypeColor(event.event_type).replace('bg-', '#')}}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{new Date(event.start_time).toLocaleDateString()}</span>
                          <span>{new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {event.end_time && (
                            <span>- {new Date(event.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(event.priority)}`}>
                            {event.priority}
                          </span>
                          <span className="capitalize">{event.event_type.replace('_', ' ')}</span>
                          {event.location && <span>📍 {event.location}</span>}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">Calendar View</h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Events for {new Date(selectedDate).toLocaleDateString()}
              </h3>
              {getEventsByDate(selectedDate).length === 0 ? (
                <p className="text-gray-500">No events scheduled for this date.</p>
              ) : (
                <div className="space-y-3">
                  {getEventsByDate(selectedDate).map((event) => (
                    <div key={event.id} className="p-3 border rounded-md border-l-4" style={{borderLeftColor: getTypeColor(event.event_type).replace('bg-', '#')}}>
                      <h4 className="font-medium">{event.title}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getPriorityColor(event.priority)}`}>
                          {event.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};