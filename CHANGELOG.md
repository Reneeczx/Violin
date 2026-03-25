# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0.0] - 2026-03-25

### Added

- Focus-visible styles for all interactive elements (buttons, links, inputs) with primary color outline
- `prefers-reduced-motion` media query to disable animations and transitions for users who prefer reduced motion
- Semantic `<h1>` element for page title (was `<span>`)

### Changed

- Removed `user-scalable=no` from viewport meta tag to allow pinch-to-zoom accessibility
- Replaced all `transition: all` declarations with specific property transitions for better performance
- Increased speed button touch targets from 36px to 44px (`--touch-target`) to meet WCAG minimum
