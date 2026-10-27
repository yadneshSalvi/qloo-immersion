# Live provider observations

These are measured integration observations, separate from the authored Spanish collection and any educational outcome. This file is updated as the product is verified.

## Initial Qloo coverage check

On 26 October 2026 UTC, seven catalog searches and two restricted Insights requests completed successfully through the pinned official Qloo harness. Each process enforced one HTTP request, an explicit timeout and no redirects or retries.

Catalog review selected Rosalía as an artist and six exact film identities: _Coco_ (2017), _Cinema Paradiso_ (1988), _Chef_ (2014), _Amélie_ (2001), _The Grand Budapest Hotel_ (2014), and _Midnight in Paris_ (2011). The comparison also reused Radiohead's previously reviewed catalog identity; it did not charge a fresh search for that identity. Ambiguous search alternatives were not automatically selected.

Two live Insights requests ranked the identical six-film candidate pool:

| Position | Rosalía as the signal    | Radiohead as the signal  |
| -------- | ------------------------ | ------------------------ |
| 1        | Coco                     | The Grand Budapest Hotel |
| 2        | Chef                     | Amélie                   |
| 3        | The Grand Budapest Hotel | Midnight in Paris        |
| 4        | Midnight in Paris        | Cinema Paradiso          |
| 5        | Amélie                   | Coco                     |
| 6        | Cinema Paradiso          | Chef                     |

Both responses returned all six supplied candidates. No absent result was assigned an invented score, and numeric affinities are not compared across the two profiles. This establishes that the provider changes the order for these inputs; it does not establish that a learner prefers either order or learns more from it.

Connections from film themes to original Spanish fiction are editorial mappings. They do not mean that Qloo indexed the lessons, that the stories adapt the films, or that a creator reviewed or licensed a lesson. Source language, provisional difficulty, authorship, permissions and teaching checks are separate records.

The initial check consumed nine observed Qloo requests. Application budgets and request counts do not reveal the key's remaining credit. Credentials, canonical mappings and raw responses remain outside the public repository.

## Actual local application rehearsal

On 26 October 2026 UTC, a returning fictional test learner used the real browser application and durable worker. The profile had A2 reading/listening bands and a previously recorded request to explore away from food. This was a returning-profile test, not a fresh onboarding demonstration.

The learner searched for Rosalía, reviewed the returned alternatives, and explicitly confirmed the solo artist. One Qloo search completed in 2.707 seconds from job creation to its saved result. Discovery then used one restricted Qloo ranking request and two OpenAI model steps, completing on the first attempt in 7.853 seconds. The saved planning mode was `ai` with `gpt-6.1-sol`.

The five eligible film connections produced these first three original stories:

| Qloo film connection     | Original Spanish story    |
| ------------------------ | ------------------------- |
| Coco                     | El ensayo del domingo     |
| The Grand Budapest Hotel | La lámpara de papel       |
| Midnight in Paris        | La librería de la esquina |

The UI comparison reported two changed positions in the displayed top three and a different first choice against its same-shortlist editorial baseline. The earlier six-film provider comparison and this five-film application result have different eligibility constraints and must not be treated as an identical experiment.

The rehearsal opened _El ensayo del domingo_, played its 83.32-second synthetic narration, and verified passage seeking at approximately 31.4 and 59.2 seconds. The browser reported loaded, playing audio with no media error. A contextual word was saved, three source questions and the fixed expression exercise were completed, and optional writing feedback was requested with explicit processing consent.

The deliberately imperfect test response received `aprende escuchar` → `aprende a escuchar` and `el toca` → `él toca`, with exact supporting source passages. Coaching completed on its first attempt in 8.460 seconds using two model steps. Those suggestions remained separate from the three fixed comprehension answers and the working band. The session completed with independently recorded taste and support feedback; the saved word was recalled and scheduled for the following day.

This local application rehearsal used **two Qloo requests and four OpenAI model steps**. Before the hosted rehearsal, the cumulative observed usage was eleven Qloo requests and four OpenAI steps. Narration production is recorded separately in [the narration notes](../assets/audio/README.md). None of these synthetic product checks is a learner study or evidence of educational effectiveness.

## Actual hosted application rehearsal

A fresh fictional guest, **Maya Demo**, used the [Google Cloud application](https://immersion-web-dnp3wctt7a-uc.a.run.app) with self-selected A2 reading and listening bands, a six-minute session, and Cinema and Art & Design interests. Unlike the returning local test profile, this guest had no prior negative food preference. The learner searched for Rosalía and explicitly confirmed the solo artist before requesting discovery.

The three provider-backed runs were created on 26 October 2026 UTC. A read-only database observation on 27 October confirmed that all three succeeded on attempt one with live results:

| Saved run           | Observed elapsed time | Evidence                                                     |
| ------------------- | --------------------- | ------------------------------------------------------------ |
| Identity resolution | 5.979 seconds         | Live Qloo search; the learner explicitly confirmed a match   |
| Discovery           | 8.755 seconds         | Live restricted Qloo ranking; saved planning mode `ai`       |
| Writing feedback    | 7.677 seconds         | Live source-grounded feedback after separate learner consent |

Elapsed time is measured from each job's creation to its saved completion. It includes queueing, application work and saving; it is not an isolated provider-latency measurement or a performance guarantee.

Six film anchors were eligible for this guest. The first three connections were:

| Qloo film connection     | Original Spanish story |
| ------------------------ | ---------------------- |
| Coco                     | El ensayo del domingo  |
| Chef                     | Una mesa en el mercado |
| The Grand Budapest Hotel | La lámpara de papel    |

The UI's comparison against the same-shortlist editorial baseline showed **three changed positions in the displayed top three and a different first choice**. This compares two orders under this guest's constraints. It is separate from the initial Rosalía/Radiohead provider comparison and the returning local guest's five-anchor result. Film-to-story themes remain IMMERSION's editorial interpretation, not a claim that Qloo indexed the original lessons.

In _El ensayo del domingo_, the browser loaded and played the approved 83.32-second synthetic narration with no media error. Passage controls sought to approximately 31.38 and 59.2 seconds. The learner saved `ensayan`, answered all three fixed source questions correctly, and completed the expression exercise with `Primero`.

The deliberately imperfect typed opinion received `aprende escuchar` → `aprende a escuchar` and `Primero el toca` → `Primero él toca`, each accompanied by a supporting source quote. Generated feedback remained separate from the fixed 3/3 comprehension result and the self-selected bands.

The learner then chose “More like this,” “I needed more support,” and adaptation consent. The saved decision retained A2, selected extra support, and held the challenge; it did not reduce the fixed score or reinterpret the taste choice. A correct recall of `ensayan` scheduled the next review one day later, on 28 October 2026. This demonstrates the implemented schedule, not measured long-term recall.

The next editorial recommendation was _Un disco para la tarde_. This came from the saved adaptation policy and did **not** make another Qloo request. Its preview preserved extra support when the already-selected support option was clicked. English began open, and the recorded narration began paused at 0.75×. At the first practice question, both the authored hint and source panel were open; DOM inspection and a visual capture showed the source passage and its passage-specific hint together. The second lesson remained in progress at that first question. Browser inspection reported no console errors during the hosted walkthrough. The separate provider-free [hosted acceptance pass](VERIFICATION.md#hosted-release) also verified closable help and the saved-speed override without creating provider jobs.

## Observed request accounting and limits

The hosted database recorded two Qloo reservations, one each for search and ranking, and four model reservations across the discovery and coaching runs. Each model run used two bounded OpenAI steps. These counts agree with the saved successful runs; no retry was needed in either application rehearsal.

| Verification stage      | Qloo requests | OpenAI model steps |
| ----------------------- | ------------- | ------------------ |
| Initial coverage check  | 9             | 0                  |
| Local application flow  | 2             | 4                  |
| Hosted application flow | 2             | 4                  |
| **Observed total**      | **13**        | **8**              |

These are observed IMMERSION verification requests, not the key's remaining credit, a cost estimate, or a count of narration-production requests. Gemini narration generation and Deepgram alignment are separate from the application flows; approved assets and their checks are described in [the narration notes](../assets/audio/README.md). The independent hosted acceptance run attempted zero paid-provider calls.

All learners in these observations are fictional test guests. The 36 original stories, provisional A2/B1 bands, translations, glosses and fixed exercises have not received independent educator validation. Fifteen of the eighteen listening pieces have approved synthetic narration; three provide labelled browser-voice/text fallback. No pronunciation assessment, learner study, certified proficiency change, retention improvement or fluency gain is claimed. Software behavior, source permissions and cultural ranking evidence are distinct from teaching effectiveness.
