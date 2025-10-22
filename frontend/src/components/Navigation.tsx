import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
  };

  if (!user) return null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-semibold text-gray-900 hover:text-blue-600">
              Study Planner
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/tasks"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/tasks')
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Tasks
              </Link>
              <Link
                to="/syllabus"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/syllabus')
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Syllabus
              </Link>
              <Link
                to="/events"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/events')
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Events
              </Link>
              <Link
                to="/analytics"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/analytics')
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Analytics
              </Link>
              {(user.role === 'academic_advisor' || user.role === 'admin') && (
                <Link
                  to="/courses"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/courses') || location.pathname.startsWith('/course/')
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Courses
                </Link>
              )}
            </nav>
            
            {/* Mobile Navigation Button */}
            <div className="md:hidden">
              <button
                type="button"
                className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* User Info and Actions */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700">
                Welcome, {user.firstName || 'User'}!
              </span>
              
              <div className="relative">
                <Link
                  to="/profile"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/profile')
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Profile
                </Link>
              </div>
              
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
          <Link
            to="/"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/')
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/tasks"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/tasks')
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tasks
          </Link>
          <Link
            to="/syllabus"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/syllabus')
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Syllabus
          </Link>
          <Link
            to="/events"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/events')
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Events
          </Link>
          <Link
            to="/analytics"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/analytics')
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Analytics
          </Link>
          {(user.role === 'academic_advisor' || user.role === 'admin') && (
            <Link
              to="/courses"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/courses') || location.pathname.startsWith('/course/')
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Courses
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};