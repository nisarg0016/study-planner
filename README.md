# Study Planner - Web-Integrated Study Organizer with Performance Feedback

A comprehensive study planning application that helps students manage their time efficiently, track productivity, and receive performance feedback through intelligent planning algorithms.

##  Current Status

 **Backend**: Fully implemented and functional
- Complete REST API with 30+ endpoints
- SQLite database with automated setup
- JWT authentication system
- All CRUD operations working

 **Frontend**: Working demo application  
- Simple React/TypeScript interface
- Login and dashboard functionality
- Builds successfully without errors
- Production-ready deployment

 **Errors Fixed**: All frontend compilation errors resolved
- TypeScript configuration added
- Missing dependencies installed
- Import errors resolved
- Application successfully builds and runs

##  Features

### Core Features
- **User Management & Authentication**: JWT-based authentication with user registration, login, and role management (User, Academic Advisor)
- **Task Management**: Create, edit, delete, and track tasks with priorities, due dates, and difficulty levels
- **Syllabus Management**: Organize study topics by subject with completion tracking and progress monitoring
- **Calendar Integration**: Schedule study sessions and events with React Big Calendar
- **Performance Analytics**: Visual dashboard with charts showing study progress and productivity metrics
- **Web Tracking**: Monitor time spent on productive vs. distracting websites (simulated)
- **Intelligent Planning**: AI-powered study plan generation and adaptive scheduling based on performance
- **Academic Advisor Support**: Special role for educators to monitor student progress

### Technical Features
- **Modern Tech Stack**: React frontend with Node.js/Express backend
- **Database**: PostgreSQL with comprehensive schema
- **Real-time Updates**: RESTful API with efficient data synchronization
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Security**: JWT authentication, input validation, and SQL injection protection

## 🛠 Tech Stack

### Backend  COMPLETED
- **Framework**: Node.js with Express.js
- **Database**: SQLite (lightweight, serverless database)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Status**: Fully implemented with all API endpoints

### Frontend  WORKING DEMO
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Status**: Simplified working demo with login and dashboard
- **Build**: Successfully compiles without errors
- **Deployment**: Production-ready build available

##  Project Structure

```
study-planner/
├── backend/
│   ├── config/
│   │   └── database.js          # Database connection
│   ├── database/
│   │   └── schema.sql           # Database schema
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── tasks.js             # Task management routes
│   │   ├── syllabus.js          # Syllabus management routes
│   │   ├── events.js            # Calendar events routes
│   │   ├── analytics.js         # Performance analytics routes
│   │   ├── planning.js          # Intelligent planning routes
│   │   └── users.js             # User management routes
│   ├── scripts/
│   │   └── setupDatabase.js     # Database setup script
│   ├── .env.example             # Environment variables template
│   ├── package.json             # Backend dependencies
│   └── server.js                # Main server file
├── frontend/
│   ├── public/
│   │   └── index.html           # HTML template
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── contexts/            # React context providers
│   │   ├── pages/               # Page components
│   │   ├── services/            # API service functions
│   │   ├── types/               # TypeScript type definitions
│   │   ├── App.tsx              # Main App component
│   │   ├── index.tsx            # React entry point
│   │   └── index.css            # Global styles
│   ├── package.json             # Frontend dependencies
│   └── tailwind.config.js       # Tailwind CSS configuration
└── README.md                    # This file
```

##  Quick Start

### Easy Setup (Recommended)
```bash
cd study-planner
./setup.sh
```

### Demo Account
After setup, you can login with:
- **Email**: `demo@studyplanner.com`
- **Password**: `password123`

### Manual Setup
Follow the detailed installation steps below.

## 🛠 Manual Installation & Setup
### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

**Note**: No separate database installation required! SQLite is embedded and will be automatically created.

### Prerequisites

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd study-planner/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   The default configuration works out of the box with SQLite:
   ```env
   PORT=5000
   NODE_ENV=development
   
   # Database configuration (SQLite)
   DB_PATH=./database/study_planner.db
   
   # JWT configuration
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRES_IN=7d
   
   # CORS configuration
   FRONTEND_URL=http://localhost:3000
   ```

4. **Set up database and create tables**:
   ```bash
   npm run setup-db
   ```

5. **Start the backend server**:
   ```bash
   npm run dev
   ```
   The backend will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd study-planner/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Tailwind CSS**:
   ```bash
   npx tailwindcss init -p
   ```

4. **Start the frontend development server**:
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:3000`

## 🔄 Database Migration

### For Existing Installations

If you're upgrading from an older version of the application, you may need to run the migration script to add new database columns:

```bash
cd backend
node scripts/migrateDatabase.js
```

This will add:
- `attendees` and `reminders` columns to the `events` table
- `updated_at` column to the `study_sessions` table

### For New Installations

New installations using `./setup.sh` or `npm run setup-db` will automatically have all the latest schema changes applied. No migration needed!

##  Database Schema

The application uses SQLite with the following main tables:

### Core Tables
- **users**: User accounts with authentication and profile information
- **tasks**: Individual tasks with priorities, due dates, and progress tracking
- **syllabus**: Study topics organized by subject with completion tracking
- **events**: Calendar events and study sessions
- **web_tracking**: Website usage tracking for productivity analysis
- **study_sessions**: Detailed study session records with productivity ratings
- **performance_analytics**: Aggregated daily performance metrics
- **user_preferences**: User settings and preferences
- **website_categories**: User-defined website categorization for tracking

### Key Features
- **Referential Integrity**: Foreign key constraints ensure data consistency
- **Automatic IDs**: Auto-incrementing primary keys with INTEGER AUTOINCREMENT
- **Indexes**: Optimized queries for better performance
- **JSON Support**: Flexible preferences and settings storage as TEXT
- **Date/Time**: SQLite DATETIME and DATE types for temporal data

### Database Scripts

The following npm scripts are available for database management:

```bash
# Initial database setup (for new installations)
npm run setup-db

# Migrate existing database (adds new columns to existing tables)
npm run migrate-db

# Reset database (deletes and recreates from scratch - requires confirmation)
npm run reset-db
```

**When to use each script:**
- `setup-db`: First time installation or when setting up on a new server
- `migrate-db`: When upgrading from an older version (preserves existing data)
- `reset-db`: When you want to start completely fresh (DELETES ALL DATA)

##  API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

#### POST /api/auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### GET /api/auth/profile
Get current user profile (requires authentication).

### Task Management Endpoints

#### GET /api/tasks
Get all tasks for the authenticated user.

**Query Parameters:**
- `status`: Filter by task status (pending, in_progress, completed, cancelled)
- `priority`: Filter by priority (low, medium, high, urgent)
- `subject`: Filter by subject
- `page`: Page number for pagination
- `limit`: Items per page

#### POST /api/tasks
Create a new task.

**Request Body:**
```json
{
  "title": "Complete Math Assignment",
  "description": "Solve problems 1-20",
  "subject": "Mathematics",
  "priority": "high",
  "dueDate": "2024-12-31T23:59:59Z",
  "estimatedHours": 3,
  "difficultyLevel": 4
}
```

#### PUT /api/tasks/:id
Update an existing task.

#### DELETE /api/tasks/:id
Delete a task.

### Syllabus Management Endpoints

#### GET /api/syllabus
Get all syllabus items.

#### POST /api/syllabus
Create a new syllabus item.

**Request Body:**
```json
{
  "subject": "Computer Science",
  "topic": "Data Structures",
  "description": "Learn about arrays, linked lists, and trees",
  "chapterNumber": 5,
  "estimatedStudyHours": 8,
  "targetCompletionDate": "2024-12-31",
  "difficultyLevel": 3
}
```

#### GET /api/syllabus/by-subject
Get syllabus items grouped by subject.

### Calendar Events Endpoints

#### GET /api/events
Get all events for the authenticated user.

#### POST /api/events
Create a new calendar event.

**Request Body:**
```json
{
  "title": "Study Session - Math",
  "description": "Focus on calculus problems",
  "eventType": "study",
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "location": "Library",
  "taskId": 1
}
```

#### GET /api/events/calendar/:year/:month
Get events for calendar view.

### Analytics Endpoints

#### GET /api/analytics/dashboard
Get comprehensive dashboard data including daily analytics, task statistics, and productivity trends.

#### POST /api/analytics/web-tracking
Add web tracking data (simulated).

**Request Body:**
```json
{
  "websiteUrl": "https://stackoverflow.com",
  "websiteCategory": "productive",
  "timeSpentMinutes": 45,
  "sessionDate": "2024-01-15"
}
```

#### POST /api/analytics/study-sessions
Start a new study session.

#### PUT /api/analytics/study-sessions/:id/end
End a study session with productivity rating.

### Planning Endpoints

#### POST /api/planning/generate-plan
Generate an intelligent study plan.

**Request Body:**
```json
{
  "startDate": "2024-01-15",
  "endDate": "2024-01-31",
  "dailyStudyHours": 6,
  "includeWeekends": true,
  "prioritizeDueTasks": true
}
```

#### POST /api/planning/apply-plan
Apply a generated study plan by creating calendar events.

#### GET /api/planning/recommendations
Get adaptive recommendations based on performance.

##  Frontend Features

### Pages and Components

#### Authentication Pages
- **Login Page**: Secure user authentication
- **Register Page**: New user registration with form validation

#### Main Application Pages
- **Dashboard**: Overview of tasks, progress, and upcoming events
- **Tasks Page**: Complete task management with CRUD operations
- **Syllabus Page**: Subject-wise topic organization and progress tracking
- **Calendar Page**: Interactive calendar with event management
- **Analytics Page**: Performance dashboard with charts and insights
- **Settings Page**: User preferences and website categorization

#### Reusable Components
- **Layout Component**: Main application layout with navigation
- **Form Components**: Reusable form inputs with validation
- **Chart Components**: Analytics visualizations using Recharts
- **Modal Components**: Dialog boxes for actions and confirmations
- **Loading Components**: Spinners and skeleton loaders

### State Management
- **AuthContext**: Global authentication state
- **TaskContext**: Task management state (optional)
- **Local State**: Component-specific state with React hooks

### Routing
- **Protected Routes**: Authenticated user access only
- **Public Routes**: Login and registration pages
- **Route Guards**: Automatic redirection based on authentication status

##  Intelligent Planning Algorithm

### Study Plan Generation
The planning algorithm considers multiple factors:

1. **Task Priority**: Urgent and high-priority tasks are scheduled first
2. **Due Dates**: Items with approaching deadlines get priority
3. **Difficulty Level**: Complex topics are scheduled during optimal study times
4. **Available Time**: Considers existing calendar events and user preferences
5. **Study Patterns**: Adapts based on historical performance data

### Adaptive Recommendations
The system provides personalized recommendations:

- **Performance-based**: Suggests improvements based on productivity ratings
- **Time Management**: Recommends schedule adjustments for better efficiency
- **Difficulty Management**: Identifies challenging topics needing extra attention
- **Deadline Awareness**: Alerts for upcoming due dates and overdue items

### Algorithm Features
- **Load Balancing**: Distributes study time evenly across subjects
- **Break Integration**: Includes optimal break times for productivity
- **Flexibility**: Allows manual adjustments to generated plans
- **Continuous Learning**: Improves recommendations based on user feedback

## Performance Analytics

### Dashboard Metrics
- **Study Time Tracking**: Daily, weekly, and monthly study duration
- **Task Completion Rates**: Progress tracking with completion percentages
- **Productivity Ratings**: Self-assessed study session effectiveness
- **Subject Progress**: Per-subject completion and time investment
- **Web Usage Analysis**: Productive vs. distracting website time

### Visualization Types
- **Line Charts**: Study time trends over time
- **Bar Charts**: Task completion by priority and subject
- **Pie Charts**: Time distribution across different activities
- **Progress Bars**: Syllabus completion and goal progress
- **Heat Maps**: Study pattern analysis (planned feature)

### Data Insights
- **Performance Trends**: Identify peak productivity periods
- **Goal Achievement**: Track progress toward study objectives
- **Time Management**: Analyze time allocation effectiveness
- **Habit Formation**: Monitor study consistency and patterns

## Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: bcrypt encryption for password storage
- **Role-based Access**: Different permissions for users and advisors
- **Token Expiration**: Automatic session timeout for security

### Data Protection
- **Input Validation**: Comprehensive server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin requests
- **Rate Limiting**: API abuse prevention
- **Helmet.js**: Security headers for Express application

### Privacy
- **Data Isolation**: User data is strictly separated
- **Secure Headers**: HTTP security headers implementation
- **Environment Variables**: Sensitive configuration protection

##  Deployment

### Production Setup

#### Backend Deployment
1. Set up production PostgreSQL database
2. Configure environment variables for production
3. Use PM2 or similar for process management
4. Set up SSL certificates for HTTPS
5. Configure reverse proxy (Nginx recommended)

#### Frontend Deployment
1. Build the React application:
   ```bash
   npm run build
   ```
2. Serve static files with web server (Nginx, Apache)
3. Configure API proxy for backend communication
4. Set up CDN for static assets (optional)

#### Database Considerations
- Regular backups and maintenance
- Connection pooling for better performance
- Database indexing optimization
- Monitor query performance

##  Testing

### Backend Testing
- Unit tests for API endpoints
- Integration tests for database operations
- Authentication and authorization testing
- Input validation testing

### Frontend Testing
- Component unit tests with React Testing Library
- Integration tests for user workflows
- End-to-end testing with Cypress (recommended)
- Accessibility testing

## Mobile Responsiveness

The application is fully responsive and works well on:
- Desktop computers (1200px+)
- Tablets (768px - 1199px)
- Mobile devices (320px - 767px)

Key responsive features:
- Adaptive navigation menu
- Touch-friendly interface elements
- Optimized calendar view for mobile
- Responsive charts and dashboards

## Future Enhancements

### Planned Features
- **Browser Extension**: Real-time web tracking
- **Mobile Applications**: Native iOS and Android apps
- **Collaborative Features**: Study groups and shared calendars
- **Advanced Analytics**: Machine learning-powered insights
- **Integration APIs**: Connect with external calendar and task apps
- **Offline Support**: PWA capabilities for offline access

### Technical Improvements
- **Real-time Updates**: WebSocket implementation
- **Microservices**: Service-oriented architecture
- **Caching**: Redis integration for better performance
- **Monitoring**: Application performance monitoring
- **Testing**: Comprehensive test coverage

## Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write comprehensive tests
- Document new features and APIs
- Follow semantic versioning

##  License

This project is licensed under the MIT License - see the LICENSE file for details.

## Team

- **Backend Development**: Node.js/Express API with PostgreSQL
- **Frontend Development**: React/TypeScript with modern UI components
- **Database Design**: Comprehensive schema with optimization
- **UI/UX Design**: User-centered design with accessibility focus
---

**Study Planner** - Empowering students with intelligent study organization and performance insights. Built with modern web technologies for scalability, security, and user experience.
