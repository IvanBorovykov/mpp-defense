'use strict';

const contributions = window.defenseEvidence;
const tabs = [...document.querySelectorAll('[data-person]')];
const get = (id) => document.getElementById(id);

function element(tag, text, className) {
  const result = document.createElement(tag);
  if (text) result.textContent = text;
  if (className) result.className = className;
  return result;
}

function select(key, updateUrl = true) {
  const person = contributions[key];
  for (const tab of tabs) {
    const active = tab.dataset.person === key;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  get('participant').setAttribute('aria-labelledby', 'tab-' + key);
  get('participant-label').textContent = person.name + ' · ' + person.platform;
  get('headline').textContent = person.title;
  get('summary').textContent = person.summary;
  get('speech').replaceChildren(...person.speech.map((text) => element('p', text)));
  get('files').replaceChildren(...person.files.map(([paths, description]) => {
    const row = element('article', '', 'file');
    row.append(element('h4', paths), element('p', description));
    return row;
  }));
  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set('participant', key);
    history.replaceState(null, '', url);
  }
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => select(tab.dataset.person));
  tab.addEventListener('keydown', (event) => {
    const positions = { ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (!Object.hasOwn(positions, event.key)) return;
    event.preventDefault();
    const next = tabs[positions[event.key]];
    select(next.dataset.person);
    next.focus();
  });
}

const requested = new URLSearchParams(location.search).get('participant');
select(Object.hasOwn(contributions, requested) ? requested : 'ivan', false);
