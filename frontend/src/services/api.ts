/**
 * EXAMOS - API Service Layer
 * Centralized API client with JWT interceptor.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("examos_token");
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    const authToken = token || this.getToken();

    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string> || {}),
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(fetchOptions.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  }

  // ── Auth ──
  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<User>("/api/auth/me");
  }

  // ── Exams ──
  async getExams() {
    return this.request<Exam[]>("/api/exams/");
  }

  async getExam(id: number) {
    return this.request<Exam>(`/api/exams/${id}`);
  }

  async createExam(data: CreateExamData) {
    return this.request<Exam>("/api/exams/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateExam(id: number, data: Partial<Exam>) {
    return this.request<Exam>(`/api/exams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ── Questions ──
  async getQuestions(examId: number) {
    return this.request<Question[]>(`/api/exams/${examId}/questions`);
  }

  async addQuestions(examId: number, questions: CreateQuestionData[]) {
    return this.request<Question[]>(`/api/exams/${examId}/questions`, {
      method: "POST",
      body: JSON.stringify(questions),
    });
  }

  async updateQuestion(questionId: number, data: Partial<Question>) {
    return this.request<Question>(`/api/exams/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteQuestion(questionId: number) {
    return this.request(`/api/exams/questions/${questionId}`, { method: "DELETE" });
  }

  // ── Attempts ──
  async startExam(examId: number) {
    return this.request<Attempt>("/api/exams/attempts/start", {
      method: "POST",
      body: JSON.stringify({ exam_id: examId }),
    });
  }

  async getMyAttempts() {
    return this.request<Attempt[]>("/api/exams/attempts/my");
  }

  async getAttempt(attemptId: number) {
    return this.request<Attempt>(`/api/exams/attempts/${attemptId}`);
  }

  async getNextQuestion(attemptId: number) {
    return this.request<StudentQuestion>(`/api/exams/attempts/${attemptId}/next-question`);
  }

  async submitAnswer(attemptId: number, questionId: number, answer: string, timeTaken: number) {
    return this.request<AnswerResponse>(`/api/exams/attempts/${attemptId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        question_id: questionId,
        selected_answer: answer,
        time_taken_seconds: timeTaken,
      }),
    });
  }

  async submitExam(attemptId: number, autoSubmitted = false) {
    return this.request<Attempt>(`/api/exams/attempts/${attemptId}/submit?auto_submitted=${autoSubmitted}`, {
      method: "POST",
    });
  }

  async getAttemptAnswers(attemptId: number) {
    return this.request<AnswerResponse[]>(`/api/exams/attempts/${attemptId}/answers`);
  }

  // ── AI ──
  async generateQuestions(file: File, numQuestions: number = 10) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("num_questions", String(numQuestions));

    return this.request<GenerateQuestionsResponse>("/api/ai/generate-questions", {
      method: "POST",
      body: formData,
    });
  }

  // ── Monitoring ──
  async reportEvent(attemptId: number, eventType: string, details?: Record<string, unknown>) {
    return this.request("/api/monitoring/events", {
      method: "POST",
      body: JSON.stringify({
        attempt_id: attemptId,
        event_type: eventType,
        details,
      }),
    });
  }

  async getEvents(attemptId: number) {
    return this.request<MonitoringEvent[]>(`/api/monitoring/events/${attemptId}`);
  }

  async getTrustScore(attemptId: number) {
    return this.request<{ attempt_id: number; trust_score: number }>(`/api/monitoring/trust-score/${attemptId}`);
  }

  // ── Analytics ──
  async getStudentAnalytics() {
    return this.request<StudentAnalytics>("/api/analytics/student");
  }

  async getExamAnalytics(examId: number) {
    return this.request<ExamAnalytics>(`/api/analytics/exam/${examId}`);
  }

  async getClassAnalytics() {
    return this.request<ClassAnalytics>("/api/analytics/class");
  }
}

export const api = new ApiClient(API_URL);

// ── Type definitions ──
export interface User {
  id: number;
  email: string;
  name: string;
  role: "student" | "teacher" | "admin";
  created_at?: string;
}

export interface Exam {
  id: number;
  title: string;
  description?: string;
  teacher_id: number;
  duration_minutes: number;
  is_active: boolean;
  is_adaptive: boolean;
  total_questions: number;
  created_at?: string;
}

export interface CreateExamData {
  title: string;
  description?: string;
  duration_minutes: number;
  is_adaptive: boolean;
}

export interface Question {
  id: number;
  exam_id: number;
  text: string;
  question_type: string;
  options?: string[];
  correct_answer?: string;
  difficulty: number;
  topic?: string;
  explanation?: string;
}

export interface CreateQuestionData {
  text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  difficulty: number;
  topic?: string;
  explanation?: string;
}

export interface StudentQuestion {
  id: number;
  text: string;
  question_type: string;
  options?: string[];
  difficulty: number;
  topic?: string;
}

export interface Attempt {
  id: number;
  student_id: number;
  exam_id: number;
  started_at?: string;
  finished_at?: string;
  score?: number;
  total_correct: number;
  total_answered: number;
  trust_score: number;
  current_difficulty: number;
  is_completed: boolean;
  is_auto_submitted: boolean;
}

export interface AnswerResponse {
  id: number;
  question_id: number;
  selected_answer?: string;
  is_correct?: boolean;
  time_taken_seconds: number;
  difficulty_at_time: number;
}

export interface MonitoringEvent {
  id: number;
  attempt_id: number;
  event_type: string;
  severity: string;
  trust_score_impact: number;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface GenerateQuestionsResponse {
  questions: CreateQuestionData[];
  source: "gemini" | "fallback";
  message: string;
}

export interface StudentAnalytics {
  total_exams: number;
  average_score: number;
  average_trust_score: number;
  topic_accuracy: { topic: string; correct: number; total: number; accuracy: number }[];
  difficulty_distribution: { difficulty: number; count: number; correct: number; accuracy: number }[];
  recent_scores: { exam_title: string; score: number; trust_score: number; date: string }[];
}

export interface ExamAnalytics {
  exam_id: number;
  exam_title: string;
  total_attempts: number;
  average_score: number;
  average_trust_score: number;
  completion_rate: number;
  question_stats: {
    question_id: number;
    text: string;
    difficulty: number;
    topic: string;
    total_attempts: number;
    correct_count: number;
    accuracy: number;
    avg_time_seconds: number;
  }[];
}

export interface ClassAnalytics {
  total_exams: number;
  total_students: number;
  exam_summaries: {
    exam_id: number;
    title: string;
    total_attempts: number;
    completed: number;
    average_score: number;
    is_active: boolean;
  }[];
}
