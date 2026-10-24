export type TasteFeedback = 'more' | 'different' | 'unsure';
export type SupportMode = 'independent' | 'guided' | 'extra';
export interface LearningEvidence {
  taste: TasteFeedback;
  comprehension: number | null;
  assessedItems: number;
  consecutiveStrongSessions: number;
  support: SupportMode;
}
export interface Adaptation {
  route: 'same-interest' | 'new-interest' | 'ask';
  support: SupportMode;
  challenge: 'hold' | 'easier-piece' | 'try-stretch';
  reason: string;
  /** A session does not certify or overwrite a learner's proficiency band. */
  changeProficiencyBand: false;
}

/** Interest and demonstrated comprehension are independent inputs, not one reward. */
export function chooseAdaptation(evidence: LearningEvidence): Adaptation {
  if (
    !['more', 'different', 'unsure'].includes(evidence.taste) ||
    !['independent', 'guided', 'extra'].includes(evidence.support) ||
    !Number.isInteger(evidence.assessedItems) ||
    evidence.assessedItems < 0 ||
    !Number.isInteger(evidence.consecutiveStrongSessions) ||
    evidence.consecutiveStrongSessions < 0 ||
    (evidence.comprehension !== null &&
      (!Number.isFinite(evidence.comprehension) ||
        evidence.comprehension < 0 ||
        evidence.comprehension > 1))
  ) {
    throw new Error('Invalid learning evidence');
  }
  const route =
    evidence.taste === 'different'
      ? 'new-interest'
      : evidence.taste === 'more'
        ? 'same-interest'
        : 'ask';
  if (evidence.comprehension === null || evidence.assessedItems < 2) {
    return {
      route,
      support: evidence.support,
      challenge: 'hold',
      changeProficiencyBand: false,
      reason: 'We need another short comprehension check before changing the challenge.',
    };
  }
  if (evidence.comprehension < 0.6) {
    return {
      route,
      support: 'extra',
      challenge: 'easier-piece',
      changeProficiencyBand: false,
      reason:
        evidence.taste === 'more'
          ? 'You liked the topic. We will keep that thread and add more support.'
          : evidence.taste === 'different'
            ? 'We will try a different topic with more support. These are two separate changes.'
            : 'We will add support and ask which topic you would prefer.',
    };
  }
  if (
    evidence.comprehension >= 0.8 &&
    evidence.consecutiveStrongSessions >= 3 &&
    evidence.taste === 'more'
  ) {
    return {
      route,
      support: evidence.support,
      challenge: 'try-stretch',
      changeProficiencyBand: false,
      reason:
        'You enjoyed this thread and understood several sessions. Try a slightly richer piece, with support still available.',
    };
  }
  return {
    route,
    support: evidence.support,
    challenge: 'hold',
    changeProficiencyBand: false,
    reason:
      evidence.taste === 'different'
        ? 'Same challenge, a different cultural direction.'
        : evidence.taste === 'more'
          ? 'Keep following this interest at a similar challenge.'
          : 'Keep the challenge steady while you choose a direction.',
  };
}

export interface RightsRecord {
  versionId: string;
  state: 'draft' | 'released' | 'withdrawn';
  revoked: boolean;
  expiresAt: number | null;
  canHost: boolean;
  canShowTranscript: boolean;
  canAdapt: boolean;
  canProcessWithModel: boolean;
}

export function canUseSource(
  rights: RightsRecord,
  versionId: string,
  use: 'host' | 'transcript' | 'adapt' | 'model',
  now: number,
): boolean {
  if (
    !Number.isFinite(now) ||
    rights.versionId !== versionId ||
    rights.state !== 'released' ||
    rights.revoked ||
    (rights.expiresAt !== null && (!Number.isFinite(rights.expiresAt) || rights.expiresAt <= now))
  )
    return false;
  switch (use) {
    case 'host':
      return rights.canHost === true;
    case 'transcript':
      return rights.canShowTranscript === true;
    case 'adapt':
      return rights.canAdapt === true;
    case 'model':
      return rights.canProcessWithModel === true;
    default:
      return false;
  }
}

const reviewDays = [1, 3, 7, 14] as const;
/** An explicit elapsed-day policy, not a claim of optimal learning scheduling. */
export function scheduleReview(stage: number, correct: boolean, completedAt: number) {
  if (
    !Number.isInteger(stage) ||
    stage < 0 ||
    stage > 4 ||
    !Number.isFinite(completedAt) ||
    typeof correct !== 'boolean'
  )
    throw new Error('Invalid review state');
  const nextStage = correct ? Math.min(stage + 1, 4) : 0;
  const days = correct ? reviewDays[Math.min(stage, 3)] : 1;
  const dueAt = new Date(completedAt + days * 86_400_000).toISOString();
  return { nextStage, dueAt, days, policyVersion: 'elapsed-days-1' };
}

export function isAssignedAssessment(
  session: { id: string; learnerId: string; contentVersionId: string },
  assignment: {
    sessionId: string;
    contentVersionId: string;
    objectiveId: string;
    assessmentId: string;
  },
  submitted: { learnerId: string; objectiveId: string; assessmentId: string },
): boolean {
  return (
    session.learnerId === submitted.learnerId &&
    session.id === assignment.sessionId &&
    session.contentVersionId === assignment.contentVersionId &&
    assignment.objectiveId === submitted.objectiveId &&
    assignment.assessmentId === submitted.assessmentId
  );
}
