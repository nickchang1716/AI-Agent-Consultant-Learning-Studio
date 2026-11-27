export type SimulatorId = 'sim1' | 'sim2' | 'sim3' | 'sim4' | 'sim5';
export type BlueprintId = 'azureml' | 'foundry' | 'langsmith';

export interface VideoItem {
  title: string;
  url: string;
  /** 標記為「搜尋入口」，可由使用者替換為精選影片 */
  isSearch?: boolean;
}

export interface FlowStep {
  label: string;
  input: string;
  output: string;
  keywords: string[];
  example: string;
}

export interface Concept {
  title: string;
  body: string;
}

export interface QA {
  q: string;
  a: string;
}

export interface ModuleData {
  id: number; // 0..11
  phase: number; // 0..5
  hours: number;
  title: string;
  deliverable: string;
  simulators: SimulatorId[];
  blueprint?: BlueprintId;
  videos: VideoItem[];
  flow: FlowStep[];
  concepts: Concept[];
  lab: string;
  knowledgeCheck: QA;
}

export interface PhaseData {
  id: number; // 0..5
  title: string;
}

export interface Flashcard {
  id: string;
  moduleId: number;
  term: string;
  termZh: string;
  hint: string;
  definition: string;
  example: string;
  followUp: string;
}

export interface QuizQuestion {
  id: string;
  moduleId: number;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Hotspot {
  id: number;
  x: number; // %
  y: number; // %
  title: string;
  description: string;
  tip: string;
}

export interface BlueprintData {
  id: BlueprintId;
  title: string;
  moduleId: number;
  hotspots: Hotspot[];
}

export interface ArchNode {
  id: string;
  layer: number;
  label: string;
  subtitle: string;
  analogy: string;
  scenario: string;
  pitfall: string;
  moduleIds: number[];
}

// ---------- 學習狀態 ----------
export interface Preferences {
  lastModuleId: number;
  theme: 'light' | 'dark';
  streakDays: number;
  lastStudyDate: string | null; // YYYY-MM-DD
}

export interface ModuleProgress {
  moduleId: number;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface VideoProgress {
  moduleId: number;
  videoKey: string;
  watched: boolean;
  lastPositionSec: number;
}

export interface CustomVideo {
  id: string;
  moduleId: number;
  title: string;
  url: string;
  replacesIndex: number | null;
  createdAt: string;
}

export interface TimestampNote {
  id: string;
  moduleId: number;
  videoKey: string;
  timestampSec: number;
  noteText: string;
  createdAt: string;
}

export type Rating = 'again' | 'hard' | 'good';

export interface CardReview {
  cardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string; // ISO
  lastRating: Rating | null;
}

export interface ParkingQuestion {
  id: string;
  moduleId: number | null;
  question: string;
  answer: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningSnapshot {
  preferences: Preferences;
  moduleProgress: ModuleProgress[];
  videoProgress: VideoProgress[];
  customVideos: CustomVideo[];
  moduleNotes: Record<number, string>;
  timestampNotes: TimestampNote[];
  cardReviews: CardReview[];
  parkingQuestions: ParkingQuestion[];
}

export interface LegacyProgress {
  done: number[];
  watched: Record<string, boolean>;
  notes: Record<string, string>;
  last: number;
}

export type SyncStatus = 'guest' | 'syncing' | 'synced' | 'error';
