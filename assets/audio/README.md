# Original Spanish narration

This directory contains 15 synthetic narrations of IMMERSION's original stories, plus a manifest binding each recording to its exact source version and Spanish text hash. The application serves these files through its session and source-permission checks, with byte-range playback support.

The source hash is SHA-256 of the UTF-8 Spanish segment texts joined by two newline characters, without additional normalization. Segment boundaries and word times were aligned using Spanish speech recognition. Eleven transcripts matched exactly; four had reviewed spelling variants such as accents or word spacing. All 45 segment boundaries matched. These are automated and transcript checks, not a claim of human listening or educator review.

Three listening pieces have no generated file because the provider declined those requests. The application offers clearly labelled browser speech, when available, and the original text. It must not present missing narration as a completed generation.

The approved audio totals 1,268.265 seconds. No measured sample clipping, invalid samples or infinite samples were found. Only approved final MP3s are included; raw provider responses and discarded generations remain outside the repository. See [content licensing](../../CONTENT_LICENSE.md).
