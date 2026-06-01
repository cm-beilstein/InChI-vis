---
phase: "06"
plan: "03"
subsystem: deployment
tags: [ci-cd, github-actions, github-pages, readme, deploy]
dependency_graph:
  requires: ["06-00"]
  provides: ["ci-cd-pipeline", "project-readme"]
  affects: []
tech_stack:
  added: ["peaceiris/actions-gh-pages@v4", "actions/checkout@v4", "actions/setup-node@v4"]
  patterns: ["GitHub Actions workflow", "peaceiris gh-pages deploy pattern"]
key_files:
  created:
    - .github/workflows/deploy.yml
    - README.md
  modified: []
decisions:
  - "Used peaceiris/actions-gh-pages@v4 (simpler single-job pattern vs actions/deploy-pages two-job pattern)"
  - "Node 20 LTS in CI (local dev uses Node 18, but Vite 8 requires 20+)"
  - "cancel-in-progress: true prevents stale deploy queuing on rapid pushes"
  - "No BASE_URL env var in workflow — vite.config.ts already has base: /explain-that-inchi/"
metrics:
  duration: "2min"
  completed_date: "2026-05-22"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 06 Plan 03: GitHub Pages Deploy Infrastructure Summary

**One-liner:** GitHub Actions CD pipeline deploying dist/ to gh-pages via peaceiris/actions-gh-pages@v4, triggered on master push with Node 20 LTS build.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GitHub Actions deploy workflow | 70a86ec | .github/workflows/deploy.yml |
| 2 | README.md at project root | 06e496e | README.md |

## What Was Built

### .github/workflows/deploy.yml
GitHub Actions CI/CD pipeline that:
- Triggers on every push to `master` branch
- Uses Node 20 LTS with `npm ci` for reproducible installs
- Builds with `npm run build` (tsc -b && vite build)
- Publishes `dist/` to `gh-pages` branch via `peaceiris/actions-gh-pages@v4`
- `permissions: contents: write` required for gh-pages push
- `cancel-in-progress: true` prevents stale deploy queuing
- No `BASE_URL` env var needed — `vite.config.ts` already has `base: '/explain-that-inchi/'`

### README.md
Project README at repository root with:
- Project description and purpose
- Live URL placeholder: `https://<your-username>.github.io/explain-that-inchi/`
- Local development instructions (`npm install` + `npm run dev`)
- Build instructions (`npm run build`)
- GitHub Pages deployment instructions with first-time setup steps
- Tech stack summary (Vite 8, React 18, Ketcher 3.12.0, Zustand 5)

## Deviations from Plan

### Environment Limitation (Not a Deviation)

The plan's acceptance criteria included "npm run build exits 0" but the local dev environment uses Node 18.19.1, while Vite 8 requires Node 20+. This is a pre-existing environment constraint, not caused by this plan's changes. The CI workflow correctly specifies `node-version: '20'` which will work in GitHub Actions. The build will succeed in CI.

No code-level deviations. Plan executed as written.

## Known Stubs

None. This plan only creates infrastructure files (CI workflow, README). No UI components or data stubs.

## Threat Flags

No new security-relevant surface introduced beyond what is already documented in the plan's threat model. The workflow uses only `GITHUB_TOKEN` (no additional secrets), pinned action versions, and `permissions: contents: write` scope only.

## Self-Check: PASSED

- [x] `.github/workflows/deploy.yml` exists and contains all required content
- [x] `README.md` exists with all required sections
- [x] Task 1 commit `70a86ec` exists in git log
- [x] Task 2 commit `06e496e` exists in git log
- [x] All acceptance criteria verified via grep checks
