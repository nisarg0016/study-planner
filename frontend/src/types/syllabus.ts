export interface SyllabusItem {
  id: number;
  subject: string;
  topic: string;
  description?: string;
  chapter_number?: number;
  estimated_study_hours?: number;
  completed: boolean;
  completion_percentage: number;
  start_date?: string;
  target_completion_date?: string;
  actual_completion_date?: string;
  difficulty_level?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSyllabusRequest {
  subject: string;
  topic: string;
  description?: string;
  chapterNumber?: number;
  estimatedStudyHours?: number;
  startDate?: string;
  targetCompletionDate?: string;
  difficultyLevel?: number;
}

export interface SyllabusStats {
  total_topics: number;
  completed_topics: number;
  avg_completion_percentage: number;
  total_subjects: number;
  total_estimated_hours: number;
  overdue_topics: number;
}

export interface SubjectProgress {
  subject: string;
  total_topics: number;
  completed_topics: number;
  avg_completion: number;
  total_estimated_hours: number;
}