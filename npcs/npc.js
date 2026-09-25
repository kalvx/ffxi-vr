(() => {
  const input = document.getElementById('npc-query');
  const area = document.getElementById('npc-area');
  const results = document.getElementById('npc-results');
  const status = document.getElementById('npc-status');
  let people = [];
  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  };
  function cardFor(person) {
    const card = element('article', 'npc-card');
    card.append(element('h3', '', person.name));
    card.append(element('p', 'npc-location', `Location: ${person.locations.join(' · ') || 'Not documented'}`));
    if (person.notes) for (const note of person.notes) card.append(element('p', 'npc-note', note));
    if (!person.quests.length) card.append(element('p', 'npc-note', 'No quest walkthrough for this NPC is documented here yet.'));
    for (const quest of person.quests) {
      const block = element('section', 'npc-quest');
      block.append(element('span', 'npc-role', quest.role));
      const link = element('a', 'npc-quest-link', quest.title + ' →');
      link.href = quest.url;
      block.append(link);
      if (quest.role === 'Starts here' && quest.requirements && !/no advance item requirement/i.test(quest.requirements)) block.append(element('p', 'npc-requirements', `Quest items: ${quest.requirements}`));
      for (const step of quest.interactions) block.append(element('p', 'npc-step', step));
      card.append(block);
    }
    return card;
  }
  function render() {
    const query = input.value.trim().toLocaleLowerCase();
    const selected = area.value;
    const matches = people.filter(p => p.name.toLocaleLowerCase().includes(query) && (!selected || p.zones.includes(selected)));
    const groups = new Map();
    for (const p of matches) for (const zone of p.zones.length ? p.zones : ['Location not documented']) {
      if (selected && zone !== selected) continue;
      if (!groups.has(zone)) groups.set(zone, []);
      groups.get(zone).push(p);
    }
    results.replaceChildren();
    status.textContent = `${matches.length} NPC${matches.length === 1 ? '' : 's'} in ${groups.size} area${groups.size === 1 ? '' : 's'}`;
    if (!matches.length) { results.append(element('p', 'npc-empty', 'No NPCs match this name and area.')); return; }
    for (const [zone, members] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
      const section = element('details', 'npc-area');
      const summary = element('summary', '', `${zone} · ${members.length} NPC${members.length === 1 ? '' : 's'}`);
      section.append(summary);
      const list = element('div', 'npc-area-list');
      let filled = false;
      const fill = () => {
        if (filled) return;
        filled = true;
        for (const person of members) {
          const details = element('details', 'npc-entry');
          details.append(element('summary', '', person.name));
          details.addEventListener('toggle', () => { if (details.open && !details.querySelector('.npc-card')) details.append(cardFor(person)); });
          list.append(details);
        }
      };
      section.addEventListener('toggle', () => { if (section.open) fill(); });
      section.append(list);
      results.append(section);
      if (query || selected) section.open = true;
    }
  }
  input.addEventListener('input', render);
  area.addEventListener('change', render);
  fetch('quest-index.json').then(response => { if (!response.ok) throw Error('Index unavailable'); return response.json(); }).then(data => {
    people = data;
    for (const zone of [...new Set(data.flatMap(p => p.zones))].sort((a, b) => a.localeCompare(b))) {
      const option = document.createElement('option'); option.value = zone; option.textContent = zone; area.append(option);
    }
    input.value = new URLSearchParams(location.search).get('q') || '';
    render();
  }).catch(() => { status.textContent = 'NPC directory could not load. Try refreshing the page.'; });
})();
