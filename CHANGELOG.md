# Changelog

All notable changes to this project will be documented in this file.

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
