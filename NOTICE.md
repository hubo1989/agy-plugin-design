# Notices

Agy Design Studio (`agy-plugin-design`) bundles components under a three-tier
licensing model:

## Tier 1 — MIT Licensed Plugin & CLI Tooling

- All Agy-Daddy plugin host adapter code, workspace resolver, isolated-world
  renderer, Gallery HTTP server, Gallery UI, verification scripts, and tests
  (`src/*`, `tools/*`, `scripts/*`, `locales/*`, `test/*`) are licensed under
  the **MIT License** (see `LICENSE`).
- Within `vendor/baoyu-design/`, the local CLI and server wrappers written by
  Jim Liu (`skills/*/scripts/artifact.mjs`, `skills/*/scripts/server.mjs`,
  `skills/*/scripts/lib/*`) are licensed under the **MIT License**.

## Tier 2 — Anthropic Proprietary Assets (NOT MIT)

- Within `vendor/baoyu-design/`, the skill instructions (`skills/claude-*/SKILL.md`),
  `artifact-type/reference/`, `skills/dataviz/`, refactored `scripts/editor/`
  interfaces and behaviors, and `anthropicons-*.woff2` / embedded icon fonts are
  adapted from Anthropic's claude.ai Artifact types.
- **These Anthropic-derived instructions, design assets, and icon fonts remain
  the intellectual property of Anthropic, PBC and are NOT covered by the MIT
  License.**
- `archive/baoyu-design/built-in-skills/frontend-design.md` retains its upstream
  **Apache-2.0** license terms.

## Tier 3 — Third-Party Open-Source Dependencies

- Third-party open-source packages bundled inside the vendored editor builds
  (such as React, Base UI, d3, pptxgenjs, etc.) remain governed by their
  respective original licenses listed in each skill's
  `scripts/editor/third-party-licenses.txt`.

## Vendored Upstream Reference: `baoyu-design` (v2.12.0)

`vendor/baoyu-design/` is a verbatim vendor snapshot of
https://github.com/JimLiu/baoyu-design (`skills/` + `LICENSE` + `NOTICE.md` +
changelogs + READMEs), with idempotent Antigravity workflow notes appended via
`vendor-rewrites.json` (`node tools/vendor-baoyu.mjs apply-rewrites`).
See `vendor/baoyu-design/NOTICE.md` for the authoritative upstream notice text.
