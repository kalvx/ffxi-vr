# FFXI VR: Current Reality Compendium

Static GitHub Pages site for `https://kalvx.github.io/ffxi-vr/`.

## Before publishing

1. Test locally with `START_LOCAL.bat`.
2. Confirm no GM-command data or secrets are present.
3. Publish the contents of this folder to the `main` branch of `kalvx/ffxi-vr`.
4. In GitHub, enable Pages from `main` / `(root)`.

## Layout

- `/` — lightweight category hub and server-aligned Vana’diel clock.
- `/guides/` — player travel, nation mission, and city quest guides.
- `/library.html` — searchable jobs, macros, addons, items, crafting, skillchains, fishing, and calendar tools.
- `/admin/` — information-only bridge to the separately hosted private admin server.

## Security note

GitHub Pages has no server-side authentication. Never commit GM commands, private reference exports, credentials, database passwords, personal data, password hashes, or authentication scripts to this repository. The operational GM manual belongs only in the separate password-protected private admin server.

## Rebuilding item locations

After generating `assets/data/game-data.json` with `build_compendium_data.py`, enrich it from a matching LandSandBoat source tree:

```text
python tools/enrich_item_sources.py assets/data/game-data.json PATH_TO_ITEM_WIKI_SOURCE assets/data/game-data.enriched.json --shard-dir assets/data/item-sources
```

The source tree must contain `sql`, `zones`, and `quests`. The enrichment pass adds the exact Auction House hierarchy from `item_basic.aH`, NPC and guild shops, monster drops, quest-script involvement, recipes that produce each item, and recipes that consume it. The published database loads the generated item-source shards on demand; the full enriched output is retained for review and does not replace the compact base database.
