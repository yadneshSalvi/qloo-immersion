import type { Cluster, DiscoveryCard } from './types';

export const culturalTypes = ['artist', 'movie', 'book', 'person', 'brand', 'place'] as const;
export type CulturalType = (typeof culturalTypes)[number];
export type EvidenceMode = 'live' | 'cached';
export interface CulturalCandidate {
  entityId: string;
  entityType: CulturalType;
  name: string;
  disambiguation: string;
}
export interface ConfirmedInterest extends CulturalCandidate {
  confirmedAt: string;
  evidenceAt: string;
}
export interface CulturalBridge {
  key: string;
  entityId: string;
  entityType: 'movie';
  name: string;
  cluster: Cluster;
  theme: string;
  explanation: string;
  sourceUrl: string;
  verifiedAt: string;
}
export interface ResolutionResult {
  kind: 'resolution';
  query: string;
  entityType: CulturalType;
  candidates: CulturalCandidate[];
  mode: EvidenceMode;
  evidenceAt: string;
}
export interface DiscoveryEvidence {
  anchorName: string;
  theme: string;
  explanation: string;
  sourceUrl: string;
  providerRank: number;
  studyFocus?: string;
  warmupQuestion?: string;
  sourceQuote?: string;
}
export interface LiveDiscoveryCard extends DiscoveryCard {
  evidence: DiscoveryEvidence;
}
export interface DiscoveryResult {
  kind: 'discovery';
  mode: EvidenceMode;
  evidenceAt: string;
  profileVersion: number;
  recommendations: LiveDiscoveryCard[];
  comparison: {
    baseline: { title: string; pieceId: string; anchorName: string }[];
    qloo: { title: string; pieceId: string; anchorName: string }[];
    sameFirstChoice: boolean;
    changedPositions: number;
    candidateCount: number;
    policy: string;
  };
  notes: string[];
  planning: { mode: 'ai' | 'deterministic'; model: string | null; policyVersion: string };
}
export interface CoachingResult {
  kind: 'coaching';
  status: 'feedback' | 'try-again';
  success: string;
  corrections: { before: string; after: string; explanation: string }[];
  modelAnswer: string;
  nextPrompt: string;
  sourceEvidence: { segmentId: string; quote: string }[];
  mode: 'live';
  evidenceAt: string;
  model: string;
  policyVersion: string;
}
export type RunResult = ResolutionResult | DiscoveryResult | CoachingResult;
export interface RunView {
  id: string;
  kind: 'resolution' | 'discovery' | 'coaching';
  state: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  stage: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  result: RunResult | null;
  error: { code: string; message: string; retryable: boolean } | null;
  trace: { stage: string; summary: string; at: string }[];
  submittedAnswer?: string;
}
export interface LiveOverview {
  profileVersion: number;
  interests: ConfirmedInterest[];
  latestDiscovery: RunView | null;
  latestResolution: RunView | null;
  qlooAvailable: boolean;
  coachingAvailable: boolean;
}
