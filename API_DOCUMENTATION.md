# Study Planner API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Error Responses
All endpoints may return these error formats:

```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `500`: Internal server error

## Authentication Endpoints

### Register User
```http
POST /auth/register
```

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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

### Get Profile
```http
GET /auth/profile
```
*Requires authentication*

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "profilePicture": null,
    "timezone": "UTC",
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLogin": "2024-01-15T15:45:00Z",
    "preferences": {
      "studyHoursPerDay": 8,
      "breakDurationMinutes": 15,
      "workSessionDurationMinutes": 45,
      "theme": "light"
    }
  }
}
```

### Update Profile
```http
PUT /auth/profile
```
*Requires authentication*

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "timezone": "America/New_York",
  "profilePicture": "https://example.com/avatar.jpg"
}
```

### Verify Token
```http
GET /auth/verify
```
*Requires authentication*

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

## Task Management

### Get All Tasks
```http
GET /tasks
```
*Requires authentication*

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `in_progress`, `completed`, `cancelled`)
- `priority` (optional): Filter by priority (`low`, `medium`, `high`, `urgent`)
- `subject` (optional): Filter by subject (partial match)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Complete Math Assignment",
      "description": "Solve problems 1-20 from chapter 5",
      "subject": "Mathematics",
      "priority": "high",
      "status": "pending",
      "due_date": "2024-01-20T23:59:59Z",
      "estimated_hours": 3,
      "actual_hours": null,
      "difficulty_level": 4,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "completed_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### Get Single Task
```http
GET /tasks/:id
```
*Requires authentication*

### Create Task
```http
POST /tasks
```
*Requires authentication*

**Request Body:**
```json
{
  "title": "Complete Math Assignment",
  "description": "Solve problems 1-20 from chapter 5",
  "subject": "Mathematics",
  "priority": "high",
  "dueDate": "2024-01-20T23:59:59Z",
  "estimatedHours": 3,
  "difficultyLevel": 4
}
```

### Update Task
```http
PUT /tasks/:id
```
*Requires authentication*

**Request Body:**
```json
{
  "status": "completed",
  "actualHours": 2.5
}
```

### Delete Task
```http
DELETE /tasks/:id
```
*Requires authentication*

### Get Task Statistics
```http
GET /tasks/stats/overview
```
*Requires authentication*

**Response:**
```json
{
  "stats": {
    "total": "10",
    "pending": "3",
    "in_progress": "2",
    "completed": "4",
    "cancelled": "1",
    "overdue": "1"
  }
}
```

## Syllabus Management

### Get All Syllabus Items
```http
GET /syllabus
```
*Requires authentication*

**Query Parameters:**
- `subject` (optional): Filter by subject (partial match)
- `completed` (optional): Filter by completion status (true/false)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

### Get Syllabus by Subject
```http
GET /syllabus/by-subject
```
*Requires authentication*

**Response:**
```json
{
  "subjects": [
    {
      "subject": "Mathematics",
      "total_topics": "5",
      "completed_topics": "2",
      "avg_completion": "60.00",
      "total_estimated_hours": "25.5"
    }
  ]
}
```

### Create Syllabus Item
```http
POST /syllabus
```
*Requires authentication*

**Request Body:**
```json
{
  "subject": "Computer Science",
  "topic": "Data Structures",
  "description": "Learn about arrays, linked lists, and trees",
  "chapterNumber": 5,
  "estimatedStudyHours": 8,
  "startDate": "2024-01-15",
  "targetCompletionDate": "2024-01-31",
  "difficultyLevel": 3
}
```

### Update Syllabus Item
```http
PUT /syllabus/:id
```
*Requires authentication*

**Request Body:**
```json
{
  "completed": true,
  "completionPercentage": 100,
  "actualCompletionDate": "2024-01-25"
}
```

### Get Syllabus Statistics
```http
GET /syllabus/stats/overview
```
*Requires authentication*

## Calendar Events

### Get All Events
```http
GET /events
```
*Requires authentication*

**Query Parameters:**
- `startDate` (optional): Filter events from this date (ISO 8601)
- `endDate` (optional): Filter events until this date (ISO 8601)
- `eventType` (optional): Filter by event type
- `page` (optional): Page number
- `limit` (optional): Items per page

### Create Event
```http
POST /events
```
*Requires authentication*

**Request Body:**
```json
{
  "title": "Study Session - Math",
  "description": "Focus on calculus problems",
  "eventType": "study",
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "location": "Library",
  "isAllDay": false,
  "taskId": 1,
  "syllabusId": null
}
```

### Get Calendar View
```http
GET /events/calendar/:year/:month
```
*Requires authentication*

**Example:**
```http
GET /events/calendar/2024/01
```

## Analytics

### Get Dashboard Data
```http
GET /analytics/dashboard
```
*Requires authentication*

**Query Parameters:**
- `startDate` (optional): Start date for analytics (default: 30 days ago)
- `endDate` (optional): End date for analytics (default: today)

**Response:**
```json
{
  "dashboard": {
    "dailyAnalytics": [
      {
        "date": "2024-01-15",
        "total_study_time_minutes": 180,
        "total_productive_time_minutes": 120,
        "total_distracting_time_minutes": 30,
        "tasks_completed": 2,
        "tasks_created": 1,
        "average_productivity_rating": "4.50"
      }
    ],
    "taskStats": {
      "total_tasks": "10",
      "completed_tasks": "6",
      "in_progress_tasks": "2",
      "pending_tasks": "1",
      "overdue_tasks": "1",
      "avg_time_accuracy": "1.15"
    },
    "syllabusStats": {
      "total_topics": "8",
      "completed_topics": "3",
      "avg_completion_percentage": "67.50",
      "total_subjects": "3"
    },
    "productivityTrend": [
      {
        "period": "current_week",
        "avg_study_time": "165.50",
        "avg_productive_time": "130.25",
        "avg_rating": "4.20"
      }
    ]
  }
}
```

### Add Web Tracking Data
```http
POST /analytics/web-tracking
```
*Requires authentication*

**Request Body:**
```json
{
  "websiteUrl": "https://stackoverflow.com",
  "websiteCategory": "productive",
  "timeSpentMinutes": 45,
  "sessionDate": "2024-01-15"
}
```

### Get Web Tracking Analytics
```http
GET /analytics/web-tracking
```
*Requires authentication*

**Query Parameters:**
- `startDate` (optional): Start date (default: 7 days ago)
- `endDate` (optional): End date (default: today)

### Start Study Session
```http
POST /analytics/study-sessions
```
*Requires authentication*

**Request Body:**
```json
{
  "taskId": 1,
  "syllabusId": null,
  "eventId": null
}
```

### End Study Session
```http
PUT /analytics/study-sessions/:id/end
```
*Requires authentication*

**Request Body:**
```json
{
  "productivityRating": 4,
  "notes": "Good focus, completed all planned topics",
  "breakCount": 2
}
```

### Get Study Sessions
```http
GET /analytics/study-sessions
```
*Requires authentication*

## Intelligent Planning

### Generate Study Plan
```http
POST /planning/generate-plan
```
*Requires authentication*

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

**Response:**
```json
{
  "message": "Study plan generated successfully",
  "studyPlan": {
    "totalDays": 12,
    "totalStudyHours": 48,
    "dailyPlans": [
      {
        "date": "2024-01-15",
        "totalHours": 6,
        "sessions": [
          {
            "title": "Study: Complete Math Assignment",
            "startTime": "2024-01-15T09:00:00Z",
            "endTime": "2024-01-15T11:30:00Z",
            "taskId": 1,
            "syllabusId": null,
            "subject": "Mathematics",
            "difficulty": 4,
            "estimatedHours": 2.5
          }
        ]
      }
    ]
  }
}
```

### Apply Study Plan
```http
POST /planning/apply-plan
```
*Requires authentication*

**Request Body:**
```json
{
  "planItems": [
    {
      "title": "Study: Complete Math Assignment",
      "startTime": "2024-01-15T09:00:00Z",
      "endTime": "2024-01-15T11:30:00Z",
      "taskId": 1,
      "syllabusId": null
    }
  ]
}
```

### Get Recommendations
```http
GET /planning/recommendations
```
*Requires authentication*

**Response:**
```json
{
  "recommendations": [
    {
      "type": "performance",
      "priority": "high",
      "title": "Improve Study Effectiveness",
      "description": "Your recent productivity ratings are below average. Consider shorter, more focused study sessions with regular breaks.",
      "action": "Try the Pomodoro Technique: 25-minute focused sessions with 5-minute breaks."
    }
  ]
}
```

## User Management

### Get User Preferences
```http
GET /users/preferences
```
*Requires authentication*

**Response:**
```json
{
  "preferences": {
    "studyHoursPerDay": 8,
    "breakDurationMinutes": 15,
    "workSessionDurationMinutes": 45,
    "preferredStudyTimes": [
      { "start": "09:00", "end": "12:00" },
      { "start": "14:00", "end": "17:00" }
    ],
    "notificationSettings": {
      "taskReminders": true,
      "studySessionAlerts": true,
      "deadlineWarnings": true
    },
    "theme": "light",
    "websiteCategories": [
      {
        "website_url": "https://stackoverflow.com",
        "category": "productive"
      }
    ]
  }
}
```

### Update User Preferences
```http
PUT /users/preferences
```
*Requires authentication*

**Request Body:**
```json
{
  "studyHoursPerDay": 6,
  "breakDurationMinutes": 10,
  "theme": "dark",
  "notificationSettings": {
    "taskReminders": true,
    "studySessionAlerts": false,
    "deadlineWarnings": true
  }
}
```

### Manage Website Categories
```http
POST /users/website-categories
```
*Requires authentication*

**Request Body:**
```json
{
  "websiteUrl": "https://youtube.com",
  "category": "distracting"
}
```

### Get Website Categories
```http
GET /users/website-categories
```
*Requires authentication*

### Delete Website Category
```http
DELETE /users/website-categories/:id
```
*Requires authentication*

## Admin Endpoints (Academic Advisors)

### Get All Users
```http
GET /users/all
```
*Requires authentication and academic_advisor/admin role*

### Get User Details
```http
GET /users/:id
```
*Requires authentication and academic_advisor/admin role*

## Health Check

### API Health
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Study Planner API is running",
  "timestamp": "2024-01-15T15:30:00Z"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: May have stricter limits

When rate limit is exceeded, the API returns:
```json
{
  "message": "Too many requests, please try again later."
}
```

## Data Validation

All endpoints perform server-side validation. Common validation rules:

### Required Fields
- Email addresses must be valid format
- Passwords must be at least 6 characters
- Names must not be empty
- Dates must be in ISO 8601 format

### Optional Fields
- Numeric fields have min/max constraints
- Enum fields accept only specific values
- URL fields must be valid URLs

### Response Pagination

For endpoints returning lists, pagination is implemented:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## WebSocket Support (Future)

Real-time features will be implemented using WebSocket connections for:
- Live study session updates
- Real-time notifications
- Collaborative features
- Live progress tracking

---

This API documentation covers all available endpoints in the Study Planner application. For additional support or questions, please refer to the main README.md file or create an issue in the project repository.