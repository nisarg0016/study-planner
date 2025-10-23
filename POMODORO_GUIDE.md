# Pomodoro Timer Feature

## Overview

The Study Planner now includes a fully integrated Pomodoro Timer that helps you stay focused using the proven Pomodoro Technique. The timer automatically tracks your study sessions and creates events in your calendar.

## What is the Pomodoro Technique?

The Pomodoro Technique is a time management method that uses a timer to break work into intervals:
- **25 minutes** of focused work (called a "Pomodoro")
- **5 minutes** of break
- Repeat the cycle

After 4 Pomodoros, take a longer break (15-30 minutes).

## Features

### ✨ Automatic Session Tracking
When you complete a Pomodoro work session, the timer automatically:
1. **Creates an Event** in your calendar marked as "completed"
2. **Records a Study Session** with productivity data
3. Links the session to any task or syllabus item you specify

### 🎯 Smart Integration
- **Events**: Pomodoro sessions appear in your Events/Calendar view
- **Study Sessions**: Detailed productivity metrics are saved to the database
- **Analytics**: Your Pomodoro sessions count toward your study time analytics

### 🔔 Notifications
- Browser notifications when work sessions complete
- Browser notifications when break time ends
- Audio notification sound (optional)

### ⚙️ Customizable Settings
- **Work Duration**: Adjust from 1-60 minutes (default: 25 minutes)
- **Break Duration**: Adjust from 1-30 minutes (default: 5 minutes)
- **Session Notes**: Add notes about what you're working on
- **Link to Tasks**: Optionally link sessions to specific tasks
- **Link to Syllabus**: Optionally link sessions to syllabus topics

## How to Use

### Starting a Session

1. **Navigate to Pomodoro Timer**
   - Click "🍅 Pomodoro" in the navigation menu

2. **Configure (Optional)**
   - Click the ⚙️ settings icon
   - Set work and break durations
   - Add notes about what you'll work on
   - Select a task or syllabus item (optional)

3. **Start the Timer**
   - Click the "▶️ Start" button
   - An event is automatically created with status "in_progress"
   - Focus on your work!

4. **Timer Completes**
   - When the 25 minutes are up:
     - You'll get a notification
     - The event is updated to "completed"
     - A study session record is created
     - Timer switches to break mode

5. **Take Your Break**
   - The timer automatically starts counting down your break
   - Click "▶️ Start" to begin the break timer
   - Relax and recharge!

6. **Repeat**
   - After the break, the timer resets to work mode
   - Start another Pomodoro session

### Timer Controls

- **▶️ Start**: Begin the current timer (work or break)
- **⏸️ Pause**: Pause the timer temporarily
- **🔄 Reset**: Stop and reset the timer
- **⏭️ Skip to Break**: Jump directly to break mode
- **⏭️ Skip to Work**: Jump back to work mode

### Session Counter

The timer displays how many Pomodoro sessions you've completed in the current session. This helps you track your productivity!

## What Gets Saved?

### When You Start a Work Session
```json
{
  "title": "🍅 Pomodoro Focus Session",
  "event_type": "study_session",
  "status": "in_progress",
  "start_time": "2025-10-23T10:00:00Z",
  "end_time": "2025-10-23T10:25:00Z" // estimated
}
```

### When You Complete a Work Session

**Event Updated:**
```json
{
  "status": "completed",
  "end_time": "2025-10-23T10:25:00Z", // actual
  "description": "Completed 25 minute Pomodoro session"
}
```

**Study Session Created:**
```json
{
  "start_time": "2025-10-23T10:00:00Z",
  "end_time": "2025-10-23T10:25:00Z",
  "duration_minutes": 25,
  "productivity_rating": 4, // default "good"
  "notes": "Your notes here",
  "break_count": 0,
  "task_id": 1, // if linked
  "event_id": 42 // linked to the event
}
```

## Viewing Your Pomodoro History

### In Events Calendar
- Navigate to "Events" in the menu
- Look for events with 🍅 emoji and "Pomodoro Focus Session"
- Completed Pomodoros show with "completed" status

### In Analytics
- Your Pomodoro sessions contribute to:
  - Total study time
  - Daily/weekly productivity stats
  - Subject-specific analytics (if linked to syllabus)

## Tips for Success

### 1. Eliminate Distractions
- Close unnecessary browser tabs
- Put phone on silent
- Use the notes field to stay focused on your goal

### 2. Link to Tasks
- Select a task before starting
- This helps track time spent on specific assignments
- Useful for estimating future task durations

### 3. Take Breaks Seriously
- Don't skip breaks!
- Stand up, stretch, hydrate
- Brief breaks improve long-term focus

### 4. Track Your Progress
- Check the session counter
- Aim for 4-8 Pomodoros per day
- Review your analytics weekly

### 5. Adjust for Your Needs
- If 25 minutes is too long/short, adjust in settings
- Some people prefer 30-minute or 50-minute sessions
- Find what works best for you

## Technical Details

### Database Storage

Study sessions are stored in the `study_sessions` table:
```sql
CREATE TABLE study_sessions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_id INTEGER, -- links to events table
    task_id INTEGER,  -- optional task link
    syllabus_id INTEGER, -- optional syllabus link
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    productivity_rating INTEGER, -- 1-5 scale
    notes TEXT,
    break_count INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### API Endpoints Used

- `POST /api/events` - Create event when starting
- `PUT /api/events/:id` - Update event when completing
- `POST /api/study-sessions` - Record completed session

### Browser Notifications

To enable browser notifications:
1. Click "Start" on the timer
2. Your browser will prompt for notification permission
3. Click "Allow"

If you don't see notifications, check your browser settings.

## Troubleshooting

### Timer doesn't save sessions
- Make sure you're logged in
- Check browser console for errors
- Verify backend server is running

### No browser notifications
- Grant notification permission in browser settings
- Chrome: Settings → Privacy and Security → Site Settings → Notifications
- Firefox: Settings → Privacy & Security → Permissions → Notifications

### Sessions not showing in Events
- Refresh the Events page
- Check date range filters
- Verify session completed (not just reset mid-session)

### Want to delete a session?
- Navigate to Events
- Find the Pomodoro event
- Delete it (study session will remain unless manually deleted)

## Future Enhancements

Possible features for future versions:
- Long break timer (after 4 Pomodoros)
- Statistics dashboard specifically for Pomodoro sessions
- Goal setting (e.g., "Complete 6 Pomodoros today")
- Streak tracking
- Custom notification sounds
- Desktop/mobile app integration

## Benefits

Using the Pomodoro Timer in Study Planner provides:
- ✅ **Automatic time tracking** - No manual entry needed
- ✅ **Productivity insights** - See exactly how much focused work you do
- ✅ **Better planning** - Historical data helps estimate future tasks
- ✅ **Accountability** - Calendar events create a record of your efforts
- ✅ **Reduced burnout** - Enforced breaks prevent exhaustion
- ✅ **Improved focus** - Time-boxing helps maintain concentration

---

**Happy focusing! 🍅✨**
