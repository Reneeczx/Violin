# Authoring Subapp

This subapp is the builder-facing weekly authoring console for `Violin`.

## Purpose

- Create a local draft shell for a new lesson week or review week
- Export Codex-ready context files
- Import a strict `week-package.json`
- Preview the generated result before publish
- Publish a week package so the student app can consume it

## Entry Points

- [index.html](/d:/Violin/author/index.html)
- [app.js](/d:/Violin/author/js/app.js)
- [author-view.js](/d:/Violin/author/js/ui/author-view.js)
- [author.css](/d:/Violin/author/css/author.css)

## v1 Workflow

1. Save a draft shell with:
   - `weekOf`
   - `planKind`
   - `publishedFromDayNumber`
   - `teacherBrief`
   - optional source score files
2. Download:
   - `week-manifest.json`
   - `codex-prompt.md`
   These now include planner role, an auto-generated learning profile, suggested coaching focus, confirmed weekly focus, runtime practice budget, carry-over context, and output self-check guidance.
3. Generate `week-package.json` in Codex IDE
4. Import the JSON back into the authoring console
5. Preview and publish
6. Treat published weeks as readonly. If you need a new revision or a new week, change `weekOf` and save a fresh draft shell instead of overwriting the published one.

Published week packages become visible in the student app. Before the current week is published, the student app may also surface one readonly embedded baseline for the previous real lesson week.

## Storage Model

- Week-package metadata: `localStorage` via [week-package-store.js](/d:/Violin/js/week-package-store.js)
- Source asset blobs: IndexedDB via [source-asset-store.js](/d:/Violin/js/source-asset-store.js)

The student app reads only the published package's `generatedLesson`.

## Key Files

- [week-package-store.js](/d:/Violin/js/week-package-store.js): lifecycle, runtime resolution, publish-only history
- [week-package-utils.js](/d:/Violin/js/week-package-utils.js): validation, manifest export, prompt export
- [source-asset-store.js](/d:/Violin/js/source-asset-store.js): PDF/image asset persistence
- [lesson-catalog.js](/d:/Violin/js/lesson-catalog.js): published-week catalog for the plan page

## Maintenance Rules

- Keep the student app independent from the authoring UI
- Do not bypass validation when importing or publishing
- Do not overwrite published week packages in place; published weeks are readonly and must be replaced by a new draft with a new `weekOf`
- Preserve the contract that student-visible history shows published packages first, with at most one readonly embedded baseline for continuity
- Treat `lesson-current.js` as the embedded fallback, not the primary authored source
- Treat `lesson-archive.js` as seed/reference only, not as runtime history

## Verification

```powershell
node --check author/js/app.js
node --check author/js/ui/author-view.js
node --check js/week-package-store.js
node --check js/week-package-utils.js
node --test --experimental-default-type=module tests/*.test.js
```
