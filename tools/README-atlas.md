# Atlas data maintenance

The atlas uses local versioned shards for the existing 210-area directory. It never connects a browser to the game database. The generator takes an anonymous read-only gameplay snapshot, the preserved directory/map/travel registry, and installed Mappy map metadata. It reuses existing item-source and NPC-reference records without modifying those databases.

Run `python tools/build-atlas.py SNAPSHOT DIRECTORY_JSON MAPPY_MAPS`, then `node tools/check-atlas.mjs`, `node tools/check-zone-travel.mjs`, and `node tools/check-monster-sources.mjs`. Python needs Pillow only for optional extra-area map preparation. Do not pass `--include-extra` for the current publication: its directory must remain the existing 210 areas.

Entity slots are potential spawns, not live population counts. Keep all coordinates and label placeholders. Purgonorgo is the southern Bibiki subarea, not arena zone 44. Native shared drops are conditional; direct loot-table rates are base chances per roll. Existing item sources define exclusions, thresholds and cooldowns. Never invent drop rates or silently treat shared candidates as guaranteed drops. Indexed NPC service references without native slots remain explicitly identified.

Versioned IndexedDB keys retain unchanged zone shards. The resource revision includes existing item-source contents. Keep requests deduplicated and retryable, failures visible, loading nonblocking, and updates limited to the affected card. Item/monster/map overlays must keep searches and loaded records intact. Reference walkthroughs open separately.

Coverage is an index of available server records and reviewed compendium references. Scripted spawn phases, every encounter condition, gathering, fishing and unnamed world objects still need individual verification; a row count does not prove those features are complete. Private continuation notes, raw export and deployment checks live outside this public repository in the project maintenance documentation. Do not publish credentials, character/account records or raw database exports.
