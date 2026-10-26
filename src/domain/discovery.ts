import type {
  CulturalBridge,
  ConfirmedInterest,
  DiscoveryResult,
  EvidenceMode,
  LiveDiscoveryCard,
} from './live';
import type { Piece, Profile, Source } from './types';

export const DISCOVERY_SELECTION_POLICY = 'same-eligible-corpus-categories-novelty-v1';
export interface DiscoveryOption {
  bridge: CulturalBridge;
  pieces: Source[];
}
export interface DiscoverySnapshot {
  profileVersion: number;
  profile: Pick<
    Profile,
    'readingBand' | 'listeningBand' | 'minutes' | 'interests' | 'support' | 'adaptation'
  >;
  signals: ConfirmedInterest[];
  options: DiscoveryOption[];
}
export interface StudyStep {
  bridgeKey: string;
  versionId: string;
  studyFocus: string;
  warmupQuestion: string;
  sourceQuote: string;
}
export function eligibleDiscoveryOptions(
  profile: DiscoverySnapshot['profile'],
  sources: Source[],
  bridges: CulturalBridge[],
  completed: Set<string>,
): DiscoveryOption[] {
  return bridges
    .map((bridge) => {
      if (
        profile.adaptation?.route === 'new-interest' &&
        profile.adaptation.cluster === bridge.cluster
      )
        return { bridge, pieces: [] };
      const pieces = sources.filter((piece) => {
        const band = piece.format === 'read' ? profile.readingBand : profile.listeningBand;
        const easier =
          profile.adaptation?.route === 'same-interest' &&
          profile.adaptation.cluster === piece.cluster &&
          profile.adaptation.challenge === 'easier-piece' &&
          piece.band === 'A2';
        return (
          piece.cluster === bridge.cluster &&
          piece.minutes <= profile.minutes &&
          (piece.band === band || easier)
        );
      });
      pieces.sort((a, b) => {
        const priority = (piece: Source) =>
          (completed.has(piece.versionId) ? 100 : 0) +
          (profile.adaptation?.challenge === 'easier-piece' &&
          profile.adaptation.cluster === piece.cluster &&
          piece.band !== 'A2'
            ? 10
            : 0);
        return priority(a) - priority(b) || a.issue.localeCompare(b.issue);
      });
      const unseen = pieces.filter((piece) => !completed.has(piece.versionId));
      return { bridge, pieces: (unseen.length ? unseen : pieces).slice(0, 3) };
    })
    .filter((option) => option.pieces.length > 0);
}
export function orderedOptions(snapshot: DiscoverySnapshot, rankedIds: string[]) {
  const byId = new Map(snapshot.options.map((option) => [option.bridge.entityId, option]));
  const ranked = rankedIds
    .map((id) => byId.get(id))
    .filter((item): item is DiscoveryOption => !!item);
  const adaptation = snapshot.profile.adaptation;
  if (adaptation?.route === 'same-interest')
    ranked.sort(
      (a, b) =>
        Number(b.bridge.cluster === adaptation.cluster) -
        Number(a.bridge.cluster === adaptation.cluster),
    );
  return ranked;
}
export function baselineOptions(snapshot: DiscoverySnapshot) {
  const adaptation = snapshot.profile.adaptation;
  const rank = (option: DiscoveryOption) => {
    if (adaptation?.route === 'same-interest' && option.bridge.cluster === adaptation.cluster)
      return -1;
    const index = snapshot.profile.interests.indexOf(option.bridge.cluster);
    return index >= 0 ? index : 8;
  };
  return [...snapshot.options].sort(
    (a, b) => rank(a) - rank(b) || a.pieces[0].issue.localeCompare(b.pieces[0].issue),
  );
}
function pieceOnly(source: Source): Piece {
  const { segments: _segments, glossary: _glossary, ...piece } = source;
  return piece;
}
export function buildDiscoveryResult(
  snapshot: DiscoverySnapshot,
  rankedIds: string[],
  evidence: { mode: EvidenceMode; evidenceAt: string },
  steps: StudyStep[] | null,
  model: string | null,
): DiscoveryResult {
  const chosen = orderedOptions(snapshot, rankedIds).slice(0, 3);
  const baseline = baselineOptions(snapshot).slice(0, chosen.length);
  const routes = ['A familiar thread', 'A new connection', 'Continue your story'] as const;
  const recommendations: LiveDiscoveryCard[] = chosen.map((option, index) => {
    const study = steps?.find((item) => item.bridgeKey === option.bridge.key);
    const source =
      option.pieces.find((piece) => piece.versionId === study?.versionId) ?? option.pieces[0];
    const adapted =
      snapshot.profile.adaptation?.route === 'same-interest' &&
      snapshot.profile.adaptation.cluster === source.cluster;
    return {
      piece: pieceOnly(source),
      route: routes[index],
      reason: `${adapted ? 'Your feedback keeps this cultural thread in view. ' : ''}Qloo ranked ${option.bridge.name} among this request’s film references. IMMERSION connects its ${option.bridge.theme.toLocaleLowerCase()} theme to this original story. The story is not a film excerpt or adaptation.`,
      evidence: {
        anchorName: option.bridge.name,
        theme: option.bridge.theme,
        explanation: option.bridge.explanation,
        sourceUrl: option.bridge.sourceUrl,
        providerRank: rankedIds.indexOf(option.bridge.entityId) + 1,
        ...(study
          ? {
              studyFocus: study.studyFocus,
              warmupQuestion: study.warmupQuestion,
              sourceQuote: study.sourceQuote,
            }
          : {}),
      },
    };
  });
  // Shared anchors use the identical chosen story in both lists, so the model's
  // within-theme choice cannot masquerade as a Qloo ordering difference.
  const baseRows = baseline.map((option) => {
    const shared = recommendations.find((item) => item.evidence.anchorName === option.bridge.name);
    const piece = shared?.piece ?? option.pieces[0];
    return { title: piece.title, pieceId: piece.id, anchorName: option.bridge.name };
  });
  const qlooRows = recommendations.map((item) => ({
    title: item.piece.title,
    pieceId: item.piece.id,
    anchorName: item.evidence.anchorName,
  }));
  return {
    kind: 'discovery',
    ...evidence,
    profileVersion: snapshot.profileVersion,
    recommendations,
    comparison: {
      baseline: baseRows,
      qloo: qlooRows,
      sameFirstChoice: baseRows[0]?.pieceId === qlooRows[0]?.pieceId,
      changedPositions: qlooRows.filter((item, i) => item.pieceId !== baseRows[i]?.pieceId).length,
      candidateCount: snapshot.options.length,
      policy: DISCOVERY_SELECTION_POLICY,
    },
    planning: {
      mode: steps ? 'ai' : 'deterministic',
      model: steps ? model : null,
      policyVersion: 'source-bound-study-plan-v1',
    },
    notes: [
      'Qloo ranks film references. IMMERSION supplies editorial theme connections and original Spanish stories; no film text, endorsement, or media rights are implied.',
      'The comparison uses the same eligible corpus and learner constraints. A changed order is an implementation observation, not evidence of greater appeal or learning.',
      ...(rankedIds.length < snapshot.options.length
        ? [
            `Qloo returned ${rankedIds.length} of ${snapshot.options.length} eligible film references. Unreturned references are not assigned an invented rank.`,
          ]
        : []),
      ...(snapshot.profile.adaptation?.route === 'same-interest'
        ? [
            'Your explicit feedback places the same cultural thread first when it appears in Qloo’s returned shortlist. Provider ranks remain visible.',
          ]
        : []),
      ...(!steps
        ? [
            'Study notes are unavailable for this run. Story selection uses the recorded cultural order and the deterministic support policy.',
          ]
        : []),
    ],
  };
}
