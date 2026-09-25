(() => {
  const input = document.getElementById('npc-query');
  const area = document.getElementById('npc-area');
  const technical = document.getElementById('npc-technical');
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
    if (person.bgFact?.grid) card.append(element('p', 'npc-location', `Reference map grid: ${person.bgFact.grid}`));
    if (person.notes) for (const note of person.notes) card.append(element('p', 'npc-note', note));
    if (person.activities) for (const activity of person.activities) card.append(element('p', 'npc-activity', activity));
    if (person.referenceRole) {
      const reference = element('p', 'npc-activity', `Reference role: ${person.referenceRole} `);
      const source = element('a', '', 'Source ↗'); source.href = person.referenceUrl; source.target = '_blank'; source.rel = 'noopener';
      reference.append(source); card.append(reference);
    }
    if (person.bgFact && (person.bgFact.role || person.bgFact.type)) {
      const detail = [person.bgFact.role, person.bgFact.type && `Type: ${person.bgFact.type}`].filter(Boolean).join(' ');
      const reference = element('p', 'npc-activity', `Reference: ${detail} `);
      const source = element('a', '', 'Source ↗'); source.href = person.bgUrl; source.target = '_blank'; source.rel = 'noopener';
      reference.append(source); card.append(reference);
    }
    if (person.worldRole) {
      const role = element('p', 'npc-activity', `World object: ${person.worldRole} `);
      if (person.referenceUrl) { const source = element('a', '', 'Source ↗'); source.href = person.referenceUrl; source.target = '_blank'; source.rel = 'noopener'; role.append(source); }
      card.append(role);
    }
    if (person.connections) for (const connection of person.connections) {
      if (!person.quests.some(q => connection.endsWith(q.title))) card.append(element('p', 'npc-activity', `Server story connection · ${connection}`));
    }
    if (!person.quests.length && !person.activities?.length && !person.connections?.length && !person.referenceRole && !person.worldRole && !person.bgFact?.role && !person.bgFact?.type) card.append(element('p', 'npc-note', 'This name has a recorded location, but no specific service, dialogue action, or story connection was found in the indexed references. Current Reality custom behavior may differ.'));
    for (const quest of person.quests) {
      const block = element('section', 'npc-quest');
      block.append(element('span', 'npc-role', quest.role));
      const link = element('a', 'npc-quest-link', quest.title + ' →');
      link.href = quest.url;
      block.append(link);
      if (quest.role.endsWith('starts here') && quest.requirements && !/no advance item requirement/i.test(quest.requirements)) block.append(element('p', 'npc-requirements', `Required items: ${quest.requirements}`));
      for (const step of quest.interactions) block.append(element('p', 'npc-step', step));
      card.append(block);
    }
    return card;
  }
  function render() {
    const query = input.value.trim().toLocaleLowerCase();
    const selected = area.value;
    const matches = people.filter(p => (technical.checked || !p.technical) && p.name.toLocaleLowerCase().includes(query) && (!selected || p.zones.includes(selected)));
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
  technical.addEventListener('change', render);
  fetch('quest-index.json').then(response => { if (!response.ok) throw Error('Index unavailable'); return response.json(); }).then(data => {
    people = data;
    for (const zone of [...new Set(data.flatMap(p => p.zones))].sort((a, b) => a.localeCompare(b))) {
      const option = document.createElement('option'); option.value = zone; option.textContent = zone; area.append(option);
    }
    input.value = new URLSearchParams(location.search).get('q') || '';
    render();
  }).catch(() => { status.textContent = 'NPC directory could not load. Try refreshing the page.'; });
})();
