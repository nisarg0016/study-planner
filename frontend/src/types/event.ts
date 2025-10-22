export interface Event {
  id: number;
  title: string;
  description?: string;
  event_type: 'study' | 'exam' | 'assignment' | 'meeting' | 'break' | 'other';
  start_time: string;
  end_time: string;
  location?: string;
  is_all_day: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  task_id?: number;
  syllabus_id?: number;
  created_at: string;
  updated_at: string;
  task_title?: string;
  syllabus_topic?: string;
  syllabus_subject?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  eventType?: 'study' | 'exam' | 'assignment' | 'meeting' | 'break' | 'other';
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay?: boolean;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
  taskId?: number;
  syllabusId?: number;
}