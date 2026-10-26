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

This application rehearsal used **two Qloo requests and four model steps**. Combined with initial coverage checks, observed IMMERSION usage at this point is **eleven Qloo requests and four OpenAI steps**. Narration production is recorded separately in `assets/audio/README.md`. None of these synthetic product checks is a learner study or evidence of educational effectiveness.
