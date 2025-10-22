export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'academic_advisor' | 'admin';
  profilePicture?: string;
  timezone?: string;
  createdAt: string;
  lastLogin?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  studyHoursPerDay: number;
  breakDurationMinutes: number;
  workSessionDurationMinutes: number;
  theme: 'light' | 'dark' | 'auto';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'user' | 'academic_advisor';
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}