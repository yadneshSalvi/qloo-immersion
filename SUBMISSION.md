# IMMERSION

**Follow your curiosity into Spanish.**

IMMERSION is a cultural reading and listening studio for adults learning Spanish. A learner confirms an artist, film, book, or other favorite; Qloo finds cultural connections; an AI study planner helps choose an original Spanish story and a source-grounded focus. The learner then explores the actual text, hears available synthetic narration, practices language, and carries useful words into scheduled recall.

The central idea is that _what you want to explore_ and _how much support you need_ are separate decisions. Disliking a topic should not lower a language band. Enjoying a challenging story should not push a learner away from that interest.

## What judges can try

1. Start a browser-scoped adult learning path with self-selected A2 reading/listening bands. Pick cultural categories and a comfortable session length.
2. Confirm a favorite against actual Qloo catalog alternatives. Rosalía is a verified example. A typed name alone is never treated as a confirmed entity.
3. Request cultural discovery. Open the film → editorial theme → original Spanish story explanation and the same-shortlist order comparison. Request details distinguish live evidence, previously recorded evidence, model planning, and a deterministic fallback.
4. Open a story, listen where recorded narration is available, seek between passages, reveal contextual meanings and save a word.
5. Complete its three fixed source questions and one expression exercise. Optionally write a short Spanish opinion and consent to AI feedback. Corrections are tied to the submitted draft and exact source quotations.
6. Give separate enjoyment and difficulty feedback. Inspect the stored adaptation, recall the saved word, and see its next review date.
7. Inspect the evidence page, export your guest data, or delete that guest space through settings. Keep exports private.

[Open the live application](https://immersion-web-dnp3wctt7a-uc.a.run.app) or inspect the public [qloo-immersion repository](https://github.com/yadneshSalvi/qloo-immersion). [Watch the 171-second demo film](https://immersion-demo-dnp3wctt7a-uc.a.run.app).

## Why Qloo belongs in this product

A favorite artist and an original Spanish reading exercise do not share a simple genre label. Qloo supplies a cross-domain cultural ranking over a small, reviewed film-reference shortlist. IMMERSION supplies a transparent editorial bridge from each film's theme to an original Spanish story. The LLM inspects eligible source material and proposes study guidance within those constraints.

The responsibilities stay visible: Qloo does not supply the stories, language bands, fixed answers, narration rights, or learning outcomes. The model cannot change the confirmed interests, substitute an ineligible source, fabricate a quotation, or turn a recommendation score into a proficiency assessment. This makes the cultural layer both useful and inspectable.

## Built and observed

The collection contains 36 original fictional pieces across six cultural threads, 144 fixed exercises, and 15 generated Spanish narrations with timed passage seeking. Real PostgreSQL stores guest profiles, exact source assignments, answers, vocabulary schedules, adaptation records, durable provider runs, and usage reservations. A separate worker makes bounded Qloo and OpenAI requests; the public web process holds no provider keys.

Live provider checks ranked the same six film candidates differently for Rosalía and Radiohead. Both local and hosted browser rehearsals completed identity confirmation, Qloo discovery, AI study planning, narration, practice, source-grounded writing feedback, adaptation, and word recall. In the hosted rehearsal, three correct source answers plus a request for help produced extra support while preserving the A2 band. The following lesson opened its source and authored hint, and the saved word was scheduled for the next day. These are measured integration observations, documented in [live observations](docs/LIVE-OBSERVATIONS.md), not claims about learner preference or educational improvement.

## Design and interaction

IMMERSION uses an editorial collection, original SVG illustrations, a focused reading/listening studio, and a word notebook. Fraunces and Source Sans 3 are served locally. The interface supports keyboard interaction, contextual help, small screens, reduced motion, explicit media controls, and useful loading, error and recovery states. Pending provider requests and submitted drafts survive reloads.

## Impact hypothesis and next evidence

The intended value is to make voluntary Spanish practice easier to return to by starting from interests a learner already has. An adult subscription or a language-school collection are possible distribution models; neither willingness to pay nor a revenue result has been measured.

A credible next study would first obtain independent educator review of the source material, translations, working bands and answer keys. It would then compare Qloo-informed ordering against the implemented same-eligible-corpus baseline, holding content availability and learning support constant. Voluntary story selection and return behavior would be measured separately from source comprehension and delayed vocabulary recall. The application currently provides implementation evidence, not that study's results.

## Honest limits

All stories are original, AI-assisted fiction pending educator review. Working bands are provisional, not certified CEFR placement. Three listening pieces use a labelled browser-voice/text fallback. There is no pronunciation scoring, licensed film footage, creator endorsement, independent learner trial, or measured retention gain. Guest access is browser-scoped without account recovery; the cookie expires after 30 days, while stored guest records persist until explicit deletion. Provider quotas and outages can limit live requests; editorial browsing remains usable.

See [verification](docs/VERIFICATION.md), [content provenance](CONTENT_LICENSE.md), and [Google Cloud deployment](deploy/gcp/README.md) for reproducible details.
