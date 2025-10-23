import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthPage } from './components/AuthPage';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { TaskManager } from './components/TaskManager';
import { CourseManager } from './components/CourseManager';
import { CourseView } from './components/CourseView';
import { Analytics } from './components/Analytics';
import { SyllabusManager } from './components/SyllabusManager';
import { EventScheduler } from './components/EventScheduler';
import { Notifications } from './components/Notifications';
import PomodoroTimer from './components/PomodoroTimer';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Protected Route component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'academic_advisor' && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// App Layout component
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {children}
    </div>
  );
};

// Main App Content
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <AuthPage />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute>
              <TaskManager />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/syllabus" 
          element={
            <ProtectedRoute>
              <SyllabusManager />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/events" 
          element={
            <ProtectedRoute>
              <EventScheduler />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/pomodoro" 
          element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 py-8">
                <PomodoroTimer />
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Course routes - accessible to all users but with different permissions */}
        <Route 
          path="/courses" 
          element={
            <ProtectedRoute>
              <CourseManager />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/course/:id" 
          element={
            <ProtectedRoute>
              <CourseView />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

// Main App component
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;