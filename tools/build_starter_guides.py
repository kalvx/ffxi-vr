#!/usr/bin/env python3
"""Build starter-nation mission and quest guides from structured BG Wiki exports."""
from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import urllib.parse
from pathlib import Path


class LuaTableParser:
    def __init__(self, text: str):
        self.text = text
        self.pos = text.find("return") + len("return")

    def skip(self):
        while self.pos < len(self.text):
            if self.text.startswith("--", self.pos):
                end = self.text.find("\n", self.pos)
                self.pos = len(self.text) if end < 0 else end + 1
            elif self.text[self.pos].isspace():
                self.pos += 1
            else:
                break

    def take(self, token: str):
        self.skip()
        if not self.text.startswith(token, self.pos):
            raise ValueError(f"Expected {token!r} at {self.pos}")
        self.pos += len(token)

    def string(self):
        quote = self.text[self.pos]
        self.pos += 1
        result = []
        escapes = {"n": "\n", "r": "\r", "t": "\t"}
        while self.pos < len(self.text):
            character = self.text[self.pos]
            self.pos += 1
            if character == quote:
                return "".join(result)
            if character == "\\" and self.pos < len(self.text):
                escaped = self.text[self.pos]
                self.pos += 1
                result.append(escapes.get(escaped, escaped))
            else:
                result.append(character)
        raise ValueError("Unterminated Lua string")

    def identifier(self):
        match = re.match(r"[A-Za-z_][A-Za-z0-9_]*", self.text[self.pos :])
        if not match:
            raise ValueError(f"Expected identifier at {self.pos}")
        self.pos += len(match.group())
        return match.group()

    def value(self):
        self.skip()
        character = self.text[self.pos]
        if character in "'\"":
            return self.string()
        if character == "{":
            return self.table()
        number = re.match(r"-?\d+(?:\.\d+)?", self.text[self.pos :])
        if number:
            self.pos += len(number.group())
            return float(number.group()) if "." in number.group() else int(number.group())
        word = self.identifier()
        return {"nil": None, "true": True, "false": False}.get(word, word)

    def table(self):
        self.take("{")
        mapping = {}
        sequence = []
        while True:
            self.skip()
            if self.text.startswith("}", self.pos):
                self.pos += 1
                return mapping if mapping else sequence
            save = self.pos
            key = None
            if self.text.startswith("[", self.pos):
                self.pos += 1
                self.skip()
                key = self.value()
                self.take("]")
                self.take("=")
            else:
                try:
                    candidate = self.identifier()
                    self.skip()
                    if self.text.startswith("=", self.pos):
                        self.pos += 1
                        key = candidate
                    else:
                        self.pos = save
                except ValueError:
                    self.pos = save
            value = self.value()
            if key is None:
                sequence.append(value)
            else:
                mapping[key] = value
            self.skip()
            if self.text.startswith(",", self.pos) or self.text.startswith(";", self.pos):
                self.pos += 1

    def parse(self):
        return self.table()


def slug(value: str):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def normalize_item_name(value: str):
    value = re.sub(r"^\d+\s+", "", value.strip())
    value = re.sub(r"^\[Key Item\]\s*", "", value, flags=re.I)
    return re.sub(r"\s+", " ", value).strip(" .")


class ItemLinker:
    def __init__(self, items):
        self.items = items
        self.names = {item["name"].casefold(): item for item in items if len(item["name"]) >= 5}
        self.trie = {}
        excluded = {
            "mission", "unknown item", "adventurer", "chocobo", "equipment", "fishing rod",
            "chest", "dahlia", "marguerite", "gully", "talekeeper",
        }
        for name, item in self.names.items():
            if name in excluded:
                continue
            node = self.trie
            for character in name:
                node = node.setdefault(character, {})
            node[""] = item

    def exact(self, value):
        clean = normalize_item_name(value)
        item = self.names.get(clean.casefold())
        if not item:
            return html.escape(value)
        return self.anchor(item, value)

    @staticmethod
    def anchor(item, label):
        return f'<a class="item-link" data-item-id="{item["id"]}" href="../../reference/index.html?item={item["id"]}">{html.escape(label)}</a>'

    def text(self, value):
        folded = value.casefold()
        output = []
        plain_start = 0
        index = 0
        while index < len(value):
            if index and value[index - 1].isalnum():
                index += 1
                continue
            node = self.trie
            cursor = index
            match = None
            while cursor < len(value) and folded[cursor] in node:
                node = node[folded[cursor]]
                cursor += 1
                if "" in node and (cursor == len(value) or not value[cursor].isalnum()):
                    candidate = node[""]
                    # Item names in guide prose are proper names. Requiring the
                    # database capitalization prevents phrases such as "large
                    # stone tower" from being linked to the item Large Stone.
                    if value[index:cursor] == candidate["name"]:
                        match = (cursor, candidate)
            if not match:
                index += 1
                continue
            end, item = match
            output.append(html.escape(value[plain_start:index]))
            output.append(self.anchor(item, value[index:end]))
            index = end
            plain_start = end
        output.append(html.escape(value[plain_start:]))
        return "".join(output)


NATIONS = {
    "sandoria": ("San d’Oria", "san-doria"),
    "bastok": ("Bastok", "bastok"),
    "windurst": ("Windurst", "windurst"),
}


def as_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return list(value.values())
    return [value]


def walkthrough_html(text, linker):
    blocks = []
    current = None
    for raw in (text or "No walkthrough information is available.").splitlines():
        line = raw.strip()
        if not line:
            continue
        numbered = re.match(r"^(\d+)\.\s*(.*)", line)
        bullet = re.match(r"^-\s*(.*)", line)
        if numbered:
            current = {"body": linker.text(numbered.group(2)), "notes": []}
            blocks.append(current)
        elif bullet and current:
            current["notes"].append(linker.text(bullet.group(1)))
        elif line.endswith(":") and len(line) < 80:
            current = {"body": f"<strong>{linker.text(line)}</strong>", "notes": []}
            blocks.append(current)
        elif current:
            current["notes"].append(linker.text(line))
        else:
            current = {"body": linker.text(line), "notes": []}
            blocks.append(current)
    return "".join(
        f'<li><div>{block["body"]}</div>'
        + (f'<ul>{"".join(f"<li>{note}</li>" for note in block["notes"])}</ul>' if block["notes"] else "")
        + "</li>"
        for block in blocks
    )


def fact_row(label, value):
    if not value:
        return ""
    if isinstance(value, list):
        value = " · ".join(str(entry) for entry in value)
    return f"<tr><th>{html.escape(label)}</th><td>{html.escape(str(value)).replace(chr(10), '<br>')}</td></tr>"


def chain_row(label, value, available):
    entries = as_list(value)
    if not entries:
        return ""
    links = " · ".join(
        f'<a href="{available[str(entry)]}.html">{html.escape(str(entry))}</a>'
        if str(entry) in available else html.escape(str(entry))
        for entry in entries
    )
    return f"<tr><th>{html.escape(label)}</th><td>{links}</td></tr>"


def page_shell(title, eyebrow, body, section, root="../.."):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Complete Current Reality walkthrough for {html.escape(title)}.">
<title>{html.escape(title)} | Current Reality</title><link rel="stylesheet" href="{root}/assets/site.css"><link rel="stylesheet" href="{root}/assets/wiki.css"><script src="{root}/assets/wiki.js" defer></script></head>
<body><header class="topbar"><a class="brand" href="{root}/index.html"><span class="crystal">✦</span><span><small>FFXI VR</small><strong>Current Reality</strong></span></a><nav aria-label="Main navigation"><a href="{root}/guides/index.html">Guides</a><a{' aria-current="page"' if section == 'missions' else ''} href="{root}/missions/index.html">Missions</a><a{' aria-current="page"' if section == 'quests' else ''} href="{root}/quests/index.html">Quests</a><a href="{root}/trusts/index.html">Trusts</a><a href="{root}/reference/index.html">Items</a><a class="admin-link" href="{root}/admin/index.html">GM Login</a></nav></header>
<main class="wiki-layout"><aside class="wiki-sidebar"><h2>Compendium</h2><nav><h3>Adventure</h3><a href="{root}/guides/index.html">Guide index</a><a href="{root}/missions/index.html">Missions</a><a href="{root}/quests/index.html">Quests</a><a href="{root}/travel/index.html">Travel</a><a href="{root}/trusts/index.html">Trusts</a><h3>Character</h3><a href="{root}/jobs/index.html">Jobs</a><a href="{root}/macros/index.html">Macros</a><a href="{root}/skillchains/index.html">Skillchains</a><h3>Items & systems</h3><a href="{root}/gear/index.html">Gear</a><a href="{root}/crafting/index.html">Crafting</a><a href="{root}/fishing/index.html">Fishing</a><a href="{root}/reference/index.html">Item encyclopedia</a></nav></aside>
<article class="wiki-main"><header class="wiki-title"><p class="eyebrow">{html.escape(eyebrow)}</p><h1>{html.escape(title)}</h1></header>{body}</article></main></body></html>'''


def guide_page(name, entry, nation_name, section, linker, source_url, available):
    requirements = as_list(entry.get("requirements"))
    req_html = "".join(
        f'<li>{linker.exact(str(req.get("name", "Required item")))}{f" ×{req.get("count")}" if req.get("count", 1) != 1 else ""}</li>'
        for req in requirements if isinstance(req, dict)
    )
    facts = "".join([
        fact_row("Start NPC", entry.get("start_npc")),
        fact_row("Starting zone", entry.get("start_zone")),
        fact_row("Coordinates", entry.get("start_pos")),
        fact_row("Fame", entry.get("fame")),
        fact_row("Fame level", entry.get("fame_level")),
        fact_row("Repeatable", entry.get("repeatable")),
        chain_row("Previous", entry.get("previous"), available),
        chain_row("Next", entry.get("next"), available),
        fact_row("Title", entry.get("title")),
    ])
    reward = linker.text(str(entry.get("reward") or "No listed reward")).replace("\n", "<br>")
    notes = f'<section class="wiki-section"><h2>Notes</h2><p>{linker.text(str(entry["notes"]))}</p></section>' if entry.get("notes") else ""
    body = f'''<section class="guide-summary"><p>{linker.text(str(entry.get('description') or ''))}</p><table class="fact-table">{facts}</table></section>
<div class="guide-columns"><section class="wiki-section"><h2>Required items and key items</h2>{f'<ul class="requirement-list">{req_html}</ul>' if req_html else '<p class="empty">No advance item requirement is listed.</p>'}</section><section class="wiki-section"><h2>Rewards</h2><p>{reward}</p></section></div>
<section class="wiki-section"><h2>Complete walkthrough</h2><ol class="guide-steps">{walkthrough_html(entry.get('walkthrough'), linker)}</ol></section>{notes}
<p class="guide-attribution">Guide facts adapted from <a href="{source_url}" target="_blank" rel="noopener">BG Wiki</a> under <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/" target="_blank" rel="license noopener">CC BY-NC-SA 3.0</a>; organized for Current Reality with item links and server-reference details.</p>'''
    return page_shell(name, f"{nation_name} {section[:-1]} walkthrough", body, section)


def build_index(nation_name, section, entries, name_slugs):
    cards = []
    for name, entry in entries:
        summary = entry.get("description") or "Complete walkthrough, requirements, and rewards."
        cards.append(f'<a class="guide-card" href="{name_slugs[name]}.html"><small>{html.escape(str(entry.get("start_zone") or nation_name))}</small><h2>{html.escape(name)}</h2><p>{html.escape(summary)}</p></a>')
    body = f'<section class="wiki-section"><div class="guide-directory">{"".join(cards)}</div></section><p class="notice">Open any entry for its complete route, requirements, rewards, item links, and follow-up steps.</p>'
    return page_shell(f"{nation_name} {section.title()}", f"{len(entries)} complete walkthroughs", body, section)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("chronicle_root")
    parser.add_argument("site_root")
    args = parser.parse_args()
    chronicle = Path(args.chronicle_root)
    site = Path(args.site_root)
    game_data = json.loads((site / "assets/data/game-data.json").read_text(encoding="utf-8"))
    linker = ItemLinker(game_data["items"])
    counts = {}
    guide_uses = {}
    for section in ("missions", "quests"):
        for key, (nation_name, directory_name) in NATIONS.items():
            source = chronicle / "wiki" / section / f"{key}.lua"
            parsed = LuaTableParser(source.read_text(encoding="utf-8")).parse()
            entries = sorted(parsed.items(), key=lambda pair: (pair[1].get("id", 9999), pair[0]))
            slug_counts = {}
            available = {}
            for name, entry in entries:
                base = slug(name)
                slug_counts[base] = slug_counts.get(base, 0) + 1
                available[name] = base if slug_counts[base] == 1 else f'{base}-{entry.get("id", slug_counts[base])}'
            destination = site / section / directory_name
            destination.mkdir(parents=True, exist_ok=True)
            for stale in destination.glob("*.html"):
                stale.unlink()
            for name, entry in entries:
                source_url = "https://www.bg-wiki.com/ffxi/" + urllib.parse.quote(name.replace(" ", "_"), safe="_'-()")
                filename = f"{available[name]}.html"
                page = guide_page(name, entry, nation_name, section, linker, source_url, available)
                (destination / filename).write_text(page, encoding="utf-8")
                for item_id in set(re.findall(r'data-item-id="(\d+)"', page)):
                    use = {"title": name, "kind": section[:-1].title(), "nation": nation_name, "path": f"{section}/{directory_name}/{filename}"}
                    guide_uses.setdefault(item_id, []).append(use)
            (destination / "index.html").write_text(build_index(nation_name, section, entries, available), encoding="utf-8")
            counts[f"{section}/{directory_name}"] = len(entries)
    shard_root = site / "assets/data/item-sources"
    for shard_file in shard_root.glob("[0-9]*.json"):
        records = json.loads(shard_file.read_text(encoding="utf-8"))
        changed = False
        for item_id, record in records.items():
            uses = guide_uses.get(item_id, [])
            if record.setdefault("sources", {}).get("guideUses") != uses:
                record["sources"]["guideUses"] = uses
                changed = True
        if changed:
            shard_file.write_text(json.dumps(records, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    counts["linkedItems"] = len(guide_uses)
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
