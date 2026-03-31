# Lessons

## 2026-03-26 - Playback Refactor

### Goals Achieved
- Moved playback ownership into `practicePlayer` so `reference`, `click`, and `demo` share one state machine.
- Aligned score rendering and demo playback with one timing source via `buildPlaybackTimeline`.
- Removed homepage direct control of `audioEngine` for normal playback interactions.
- Switched the service worker app shell strategy to `network-first` to reduce stale-script bugs.

### Problems And Solutions
- Problem: homepage open-string buttons and demo playback could be cut off by stale stop/cleanup work.
  Solution: keep session ownership in `practicePlayer`, and keep `audioEngine` limited to audio scheduling.
- Problem: audio timing and UI highlight timing diverged because they were derived separately.
  Solution: drive both from the same `score-utils` timeline model.
- Problem: the tuner page duplicated open-string metadata.
  Solution: add `js/open-string-data.js` and reuse lesson data with a fallback.
- Problem: stale service worker caches made it hard to trust local QA.
  Solution: use `network-first` for HTML/CSS/JS/data and keep icons `cache-first`.

### Architecture Wins
- `practice:notechange` is a cleaner UI contract than passing view callbacks into the audio layer.
- Exporting `createPracticePlayer()` made the playback state machine testable without browser globals.
- Keeping `play all` outside the state machine avoided scope creep while still letting normal playback stop it.

### Mistakes To Avoid
- Do not let views call both `practicePlayer` and `audioEngine` for the same user flow.
- Do not add UI timing callbacks into `audioEngine`; emit state and timing events from the player instead.
- Do not rely on manual cache version bumps alone to distribute frontend fixes.

### Reusable Checklist
- Confirm there is exactly one playback owner for each user-visible sound path.
- Build one timeline model and reuse it for audio scheduling, beat markers, and note highlighting.
- Test session switching paths explicitly: `reference -> demo`, `click -> demo`, `demo -> click(no-op)`.
- Clear service workers and caches during browser QA when touching app shell files.

### General Debugging Heuristics
- Do not treat the most obvious symptom as the most likely root cause.
- When one surface works and another does not, compare the execution paths before changing shared parameters.
- Use disconfirming evidence early: if one counterexample breaks the current hypothesis, lower confidence immediately.
- For any bug around start/stop/toggle/switch flows, check state ownership and timing before checking presentation details.
