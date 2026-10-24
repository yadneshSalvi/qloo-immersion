import type { Adaptation, SupportMode, TasteFeedback } from './learning';

export const clusters = ['music', 'cinema', 'literature', 'food', 'design', 'places'] as const;
export type Cluster = (typeof clusters)[number];
export type Band = 'A2' | 'B1';
export type Format = 'read' | 'listen';
export const clusterLabels: Record<Cluster, string> = {
  music: 'Music & sound',
  cinema: 'Cinema',
  literature: 'Books & stories',
  food: 'Food culture',
  design: 'Art & design',
  places: 'Everyday places',
};
export interface Profile {
  name: string;
  readingBand: Band;
  listeningBand: Band;
  minutes: 6 | 10 | 15;
  interests: Cluster[];
  references: string[];
  support: SupportMode;
  timezone: string;
  adaptation: (Adaptation & { fromPiece: string; cluster: Cluster; at: string }) | null;
}
export interface Learner {
  id: string;
  profile: Profile;
  version: number;
  createdAt: string;
}
export interface Segment {
  id: string;
  text: string;
  translation: string;
  label: string;
}
export interface GlossaryTerm {
  id: string;
  word: string;
  meaning: string;
  segmentId: string;
  note: string;
}
export interface Piece {
  id: string;
  versionId: string;
  title: string;
  subtitle: string;
  description: string;
  cluster: Cluster;
  band: Band;
  format: Format;
  minutes: number;
  country: string;
  variety: string;
  scene: string;
  palette: string;
  issue: string;
  objective: string;
  preview: string;
  wordCount: number;
  releasedAt: string;
  provenance: {
    mode: 'authored-sample';
    authorship: string;
    educatorReview: 'pending';
    license: string;
    qlooMapping: null;
  };
}
export interface Source extends Piece {
  segments: Segment[];
  glossary: GlossaryTerm[];
}
export interface PublicAssessment {
  id: string;
  objectiveId: string;
  kind: 'comprehension' | 'practice';
  prompt: string;
  options: { id: string; text: string }[];
  sourceSegmentIds: string[];
  hint: string;
}
export interface AssessmentResult {
  assessmentId: string;
  answer: string;
  correct: boolean;
  feedback: string;
  sourceQuote: string;
  attempts: number;
}
export interface SessionView {
  id: string;
  version: number;
  state: 'active' | 'practice' | 'completed';
  position: number;
  support: SupportMode;
  piece: Source;
  assessments: PublicAssessment[];
  responses: AssessmentResult[];
  savedWordIds: string[];
  note: string;
  startedAt: string;
  completedAt: string | null;
  feedback: {
    taste: TasteFeedback;
    difficulty: 'comfortable' | 'some-help' | 'hard';
    consent: boolean;
    comprehension: number;
    adaptation: Adaptation | null;
  } | null;
}
export interface ReviewView {
  id: string;
  version: number;
  stage: number;
  meaning: string;
  sourceTitle: string;
  sourceId: string;
  termId: string;
  context: string;
  dueAt: string;
  due: boolean;
  lastResult: boolean | null;
}
export interface TraceEvent {
  id: string;
  kind: string;
  summary: string;
  detail: Record<string, unknown>;
  createdAt: string;
}
export interface DiscoveryCard {
  piece: Piece;
  route: 'A familiar thread' | 'A new connection' | 'Continue your story';
  reason: string;
}
export interface PathView {
  sessions: {
    id: string;
    title: string;
    pieceId: string;
    cluster: Cluster;
    state: string;
    completedAt: string | null;
    startedAt: string;
    comprehension: number | null;
    responses: number;
  }[];
  saved: Piece[];
  words: number;
  dueWords: number;
  reviews: number;
  correctReviews: number;
  events: TraceEvent[];
}
