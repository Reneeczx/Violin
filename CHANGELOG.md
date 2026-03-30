# Changelog

All notable changes to this project will be documented in this file.

## [0.1.2.0] - 2026-03-30

### Added

- Added a standalone weekly authoring app with local draft shells, Codex export files, JSON import, and one-click publish flow for weekly lesson packages
- Added published week-package storage, lesson catalog tests, and authoring helpers that infer learning profile, coaching focus, and review candidates from recent practice history
- Added simplified SVG staff notation rendering with clickable notation explainers and related unit coverage for notation models and week-package utilities

### Changed

- Switched the student app to published-only practice history, while preserving the previous real lesson as a readonly baseline before the current week is published
- Updated weekly planning and score display flows to support late-published weeks, review-week authoring, and score-mode switching between beginner cells and staff notation
- Expanded authoring, architecture, requirements, and development docs to cover weekly publishing, local asset handling, and practice-history behavior

## [0.1.1.4] - 2026-03-27

### Changed

- Split the homepage practice UI into focused `home-view`, `score-display`, `playback-controls`, and `recording-ui` modules without changing user-facing behavior
- Updated architecture and development docs to reflect the new homepage UI boundaries

### Added

- Added playback-control state tests covering piece and open-string UI sync cases

## [0.1.1.3] - 2026-03-27

### Added

- Added a lightweight iPad/iPhone audio hint on practice and tuner views to remind users to disable silent mode and raise media volume when a tap seems to produce no sound

## [0.1.1.2] - 2026-03-26

### Fixed

- Added a stronger Safari/iPad Web Audio unlock path by priming a silent source inside the first tap gesture and resuming interrupted contexts before playback

## [0.1.1.1] - 2026-03-26

### Fixed

- Restored explicit `AudioContext` unlocking in direct tap handlers for Safari/iPad so open-string and tuner reference tones can start reliably from touch input

## [0.1.1.0] - 2026-03-26

### Added

- Unified playback state machine for `reference`, `click`, and `demo`, with a new `practice:notechange` UI event
- Shared score playback timeline so demo audio, beat markers, and note highlighting use the same timing model
- Beginner theory page plus inline tempo/rest explanations in the practice view
- Project-level [LESSONS.md](/d:/Violin/LESSONS.md) with playback/cache refactor notes

### Changed

- Moved homepage and tuner reference-tone interactions onto `practicePlayer` instead of directly controlling audio from the views
- Reworked `audioEngine` into a pure audio scheduling layer and removed UI callback ownership from sequence playback
- Converted the score display to multiline measures with active-measure tracking and automatic follow behavior
- Switched the service worker app shell to `network-first` with cache fallback to reduce stale frontend code
- Added `favicon.ico` and `mobile-web-app-capable` metadata to clean up install/runtime browser warnings

## [0.1.0.0] - 2026-03-25

### Added

- Focus-visible styles for all interactive elements (buttons, links, inputs) with primary color outline
- `prefers-reduced-motion` media query to disable animations and transitions for users who prefer reduced motion
- Semantic `<h1>` element for page title (was `<span>`)

### Changed

- Removed `user-scalable=no` from viewport meta tag to allow pinch-to-zoom accessibility
- Replaced all `transition: all` declarations with specific property transitions for better performance
- Increased speed button touch targets from 36px to 44px (`--touch-target`) to meet WCAG minimum
