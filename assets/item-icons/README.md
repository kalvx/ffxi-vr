# Current Reality item-icon assets

This directory accepts locally generated FFXI inventory-icon sprite sheets.

Required files:

- `index.json`
- `items-0.png`, `items-1.png`, and the remaining sheets referenced by the index

The index maps each numeric FFXI item ID to `[sheetName, column, row]` and records `cols` and `iconSize`. The Compendium loads the index once, lazy-decorates visible item records, and leaves the existing text-only layout intact when the files are absent.

Generate these assets only from the Current Reality client's legally installed FFXI DAT files. Do not download or hotlink FFXIAH assets.
