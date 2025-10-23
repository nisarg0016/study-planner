import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

type TimerMode = 'work' | 'break';

interface PomodoroSession {
  mode: TimerMode;
  duration: number;
  startTime: Date;
  eventId?: number; // Track the event ID for this session
}

const PomodoroTimer: React.FC = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [syllabusId, setSyllabusId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Work and break durations (in minutes)
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);

  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCx+zPLTgjMGHm7A7+OZSA0PVKzn77BdGAo+ldz0xXEqBSuBzvLZiTYHGGi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQQsfsz');
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = async () => {
    // Play notification sound
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Timer', {
        body: mode === 'work' 
          ? '🎉 Work session complete! Time for a break.' 
          : '✨ Break is over! Ready to focus?',
        icon: '/favicon.ico'
      });
    }

    if (mode === 'work') {
      // Save completed work session to database
      await saveStudySession();
      setSessionCount((prev) => prev + 1);
      
      // Switch to break mode
      setMode('break');
      setTimeLeft(breakDuration * 60);
    } else {
      // Switch back to work mode
      setMode('work');
      setTimeLeft(workDuration * 60);
    }

    setIsRunning(false);
  };

  const saveStudySession = async () => {
    if (!currentSession || !user) return;

    try {
      const startTime = currentSession.startTime;
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
      
      let eventId = currentSession.eventId;

      // Update the existing event to mark it as completed
      if (eventId) {
        await api.put(`/events/${eventId}`, {
          end_time: endTime.toISOString(),
          status: 'completed',
          description: `Completed ${duration} minute Pomodoro session`
        });
      } else {
        // Fallback: create event if it doesn't exist
        const eventResponse = await api.post('/events', {
          title: notes || '🍅 Pomodoro Focus Session',
          description: `Completed ${duration} minute Pomodoro session`,
          event_type: 'study_session',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          priority: 'medium',
          status: 'completed',
          task_id: taskId,
          syllabus_id: syllabusId
        });
        eventId = eventResponse.data.id;
      }
      
      // Create a study session record linked to the event
      await api.post('/study-sessions', {
        task_id: taskId,
        syllabus_id: syllabusId,
        event_id: eventId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: duration,
        productivity_rating: 4, // Default good rating for completed Pomodoro
        notes: notes || 'Pomodoro session',
        break_count: 0
      });

      console.log('Pomodoro session saved as event and study session successfully');
    } catch (error) {
      console.error('Error saving study session:', error);
    }
  };

  const startTimer = async () => {
    setIsRunning(true);
    
    if (!currentSession && mode === 'work') {
      // Create an event when starting a work session
      try {
        const startTime = new Date();
        const estimatedEndTime = new Date(startTime.getTime() + workDuration * 60 * 1000);
        
        const eventResponse = await api.post('/events', {
          title: notes || '🍅 Pomodoro Focus Session',
          description: `${workDuration} minute Pomodoro work session`,
          event_type: 'study_session',
          start_time: startTime.toISOString(),
          end_time: estimatedEndTime.toISOString(),
          priority: 'medium',
          status: 'in_progress',
          task_id: taskId,
          syllabus_id: syllabusId
        });

        setCurrentSession({
          mode,
          duration: workDuration,
          startTime: startTime,
          eventId: eventResponse.data.id
        });
        
        console.log('Pomodoro session event created:', eventResponse.data.id);
      } catch (error) {
        console.error('Error creating event:', error);
        // Still allow timer to start even if event creation fails
        setCurrentSession({
          mode,
          duration: workDuration,
          startTime: new Date()
        });
      }
    } else if (!currentSession) {
      // For break sessions, don't create an event
      setCurrentSession({
        mode,
        duration: mode === 'work' ? workDuration : breakDuration,
        startTime: new Date()
      });
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = async () => {
    setIsRunning(false);
    
    // Handle the current session
    if (currentSession && mode === 'work') {
      const sessionDuration = Math.round((Date.now() - currentSession.startTime.getTime()) / 1000 / 60);
      
      // If session ran for more than 1 minute, save it
      if (sessionDuration >= 1) {
        await saveStudySession();
      } else if (currentSession.eventId) {
        // If session was very short, cancel the event instead
        try {
          await api.put(`/events/${currentSession.eventId}`, {
            status: 'cancelled',
            end_time: new Date().toISOString()
          });
          console.log('Event cancelled due to early reset');
        } catch (error) {
          console.error('Error cancelling event:', error);
        }
      }
    }
    
    setCurrentSession(null);
    setMode('work');
    setTimeLeft(workDuration * 60);
    setNotes('');
  };

  const skipToBreak = () => {
    setMode('break');
    setTimeLeft(breakDuration * 60);
    setIsRunning(false);
    setCurrentSession(null);
  };

  const skipToWork = () => {
    setMode('work');
    setTimeLeft(workDuration * 60);
    setIsRunning(false);
    setCurrentSession(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    const total = mode === 'work' ? workDuration * 60 : breakDuration * 60;
    return ((total - timeLeft) / total) * 100;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md mx-auto">
      <div className="text-center">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            🍅 Pomodoro Timer
          </h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
            title="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-left">
            <h3 className="font-semibold mb-3 text-gray-800 dark:text-white">Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  value={workDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 25;
                    setWorkDuration(val);
                    if (mode === 'work' && !isRunning) setTimeLeft(val * 60);
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  min="1"
                  max="60"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  value={breakDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 5;
                    setBreakDuration(val);
                    if (mode === 'break' && !isRunning) setTimeLeft(val * 60);
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  min="1"
                  max="30"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What are you working on?"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mode Indicator */}
        <div className="mb-4">
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
            mode === 'work' 
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}>
            {mode === 'work' ? '💼 Focus Time' : '☕ Break Time'}
          </span>
        </div>

        {/* Circular Progress */}
        <div className="relative w-64 h-64 mx-auto mb-6">
          <svg className="transform -rotate-90 w-64 h-64">
            <circle
              cx="128"
              cy="128"
              r="112"
              stroke="currentColor"
              strokeWidth="16"
              fill="transparent"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="128"
              cy="128"
              r="112"
              stroke="currentColor"
              strokeWidth="16"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 112}
              strokeDashoffset={2 * Math.PI * 112 * (1 - getProgress() / 100)}
              className={mode === 'work' ? 'text-red-500' : 'text-green-500'}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-5xl font-bold text-gray-800 dark:text-white">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Session Counter */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Completed Sessions: <span className="font-bold text-gray-800 dark:text-white">{sessionCount}</span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center mb-4">
          {!isRunning ? (
            <button
              onClick={startTimer}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              ▶️ Start
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
            >
              ⏸️ Pause
            </button>
          )}
          
          <button
            onClick={resetTimer}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
          >
            🔄 Reset
          </button>
        </div>

        {/* Skip Buttons */}
        <div className="flex gap-2 justify-center">
          {mode === 'work' && (
            <button
              onClick={skipToBreak}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Skip to Break ⏭️
            </button>
          )}
          {mode === 'break' && (
            <button
              onClick={skipToWork}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Skip to Work ⏭️
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          <p>🍅 Work sessions are automatically saved to your study history</p>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;
