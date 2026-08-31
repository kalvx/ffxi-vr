# Valkrum Rising FFXI Field Guide

Static GitHub Pages site for `https://kalvx.github.io/ffxi-vr/`.

## Before publishing

1. Run `tools\SET_ADMIN_PASSWORD.ps1` in PowerShell.
2. Test locally with `START_LOCAL.bat`.
3. Publish the contents of this folder to the `main` branch of `kalvx/ffxi-vr`.
4. In GitHub, enable Pages from `main` / `(root)`.

## Layout

- `/` — public jobs, macro, abilities, weapons, quests, and missions field guide.
- `/admin/` — passphrase gate.
- `/admin/content/` — Valkrum Rising GM command compendium.

## Security note

GitHub Pages has no server-side authentication. The admin gate stores a SHA-256 hash and prevents casual browser access, but determined visitors can inspect or download anything committed to a public repository. Do not put credentials, database passwords, personal data, or other secrets in this repository.
