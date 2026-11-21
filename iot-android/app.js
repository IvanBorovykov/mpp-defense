'use strict';

const people = window.defenseEvidence;
const tabs = [...document.querySelectorAll('[data-person]')];
const get = (id) => document.getElementById(id);
const search = get('commit-search');
const expand = get('expand-commits');
const date = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
let selected;
let step = 0;
let showAll = false;

function element(tag, text, className) {
  const result = document.createElement(tag);
  if (text) result.textContent = text;
  if (className) result.className = className;
  return result;
}

function link(label, url) {
  const result = element('a', label);
  result.href = url;
  return result;
}

function links(entries) {
  const result = element('div', '', 'evidence-links');
  result.append(...entries.map(([label, url]) => link(label, url)));
  return result;
}

function facts(items, className) {
  return items.map(({ title, detail, links: entries }) => {
    const card = element('article', '', className);
    const text = element('div');
    text.append(element('h3', title), element('p', detail));
    card.append(text, links(entries));
    return card;
  });
}

function renderStage() {
  const stages = people[selected].stages;
  const active = stages[step];
  get('stage-time').textContent = active.time;
  get('stage-title').textContent = active.title;
  get('stage-notes').replaceChildren(...active.notes.map((note) => element('li', note)));
  get('stage-links').replaceChildren(...active.links.map(([label, url]) => link(label, url)));
  [...get('stages').children].forEach((item, index) => {
    const button = item.firstElementChild;
    if (index === step) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  get('prev-stage').disabled = step === 0;
  get('next-stage').disabled = step === stages.length - 1;
}

function renderCommands(commands) {
  get('commands').replaceChildren(...commands.map(({ title, platform, text }) => {
    const details = element('details');
    const bar = element('div', '', 'cmd-head');
    const copy = element('button', 'Копіювати', 'copy');
    const code = element('code', text);
    const pre = element('pre');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = 'Скопійовано';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = 'Текст виділено';
      }
      window.setTimeout(() => { copy.textContent = 'Копіювати'; }, 2000);
    });
    pre.append(code);
    bar.append(element('span', platform), copy);
    details.append(element('summary', title), bar, pre);
    return details;
  }));
}

function renderCommits() {
  const query = search.value.trim().toLowerCase();
  const all = people[selected].commits;
  const matches = all.filter((item) => (`${item.hash} ${item.title}`).toLowerCase().includes(query));
  const visible = showAll || query ? matches : matches.slice(0, 8);
  const rows = visible.map((item) => {
    const row = element('li');
    const time = element('time', date.format(new Date(item.date)));
    time.dateTime = item.date;
    row.append(link(item.hash, item.url), time, element('span', item.title));
    return row;
  });
  get('commit-list').replaceChildren(...rows);
  if (!rows.length) get('commit-list').append(element('li', 'За запитом збігів немає.', 'empty'));
  get('commit-count').textContent = `${visible.length} із ${all.length}`;
  expand.hidden = Boolean(query) || all.length <= 8;
  expand.textContent = showAll ? 'Згорнути список' : `Показати всі ${all.length}`;
  expand.setAttribute('aria-expanded', String(showAll));
}

function select(key, updateUrl = true) {
  const person = people[key];
  selected = key;
  step = 0;
  showAll = false;
  search.value = '';
  for (const tab of tabs) {
    const active = tab.dataset.person === key;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  get('person-panel').setAttribute('aria-labelledby', `tab-${key}`);
  get('current-label').textContent = `${person.name} · ${person.platform}`;
  get('contribution-title').textContent = person.title;
  get('person-intro').textContent = person.intro;
  get('person-metrics').replaceChildren(element('span', `${person.prs} злитих PR`), element('span', `${person.tasks} задач закрито`));
  get('work').replaceChildren(...facts(person.work, 'work-card'));
  get('demo-info').textContent = `${person.platform} · 13 хвилин`;
  get('stages').replaceChildren(...person.stages.map(({ title }, index) => {
    const item = element('li');
    const button = element('button');
    button.type = 'button';
    button.append(element('span', String(index + 1), 'stage-number'), element('span', title));
    button.addEventListener('click', () => { step = index; renderStage(); });
    item.append(button);
    return item;
  }));
  renderStage();
  renderCommands(person.commands);
  get('primary-chain').replaceChildren(
    element('h3', 'Від задачі до merge'),
    element('p', person.chain.detail),
    links([...person.chain.links, ['Закриті задачі', person.issuesUrl]]),
    element('p', person.note)
  );
  get('reviews').replaceChildren(...facts(person.reviews, 'review'));
  renderCommits();
  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set('participant', key);
    history.replaceState(null, '', url);
  }
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => select(tab.dataset.person));
  tab.addEventListener('keydown', (event) => {
    const next = { ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(tabs[next].dataset.person);
    tabs[next].focus();
  });
}

get('prev-stage').addEventListener('click', () => { step -= 1; renderStage(); });
get('next-stage').addEventListener('click', () => { step += 1; renderStage(); });
search.addEventListener('input', renderCommits);
expand.addEventListener('click', () => { showAll = !showAll; renderCommits(); });
const requested = new URLSearchParams(location.search).get('participant');
select(Object.hasOwn(people, requested) ? requested : 'ivan', false);
