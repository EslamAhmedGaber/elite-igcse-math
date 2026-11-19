(function () {
  const root = document.querySelector('[data-topic-finder]');
  if (!root) return;
  const course = root.querySelector('[data-finder-course]');
  const input = root.querySelector('input');
  const list = root.querySelector('ul');
  const status = root.querySelector('[data-finder-status]');
  const more = root.querySelector('[data-finder-more]');
  const courses = window.ELITE_COURSE_MODULES?.courses || [];
  const normalize = (text) => String(text).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
  const topics = [];
  const unavailable = new Set();
  const pageSize = 10;
  let limit = pageSize;
  let loading = true;

  function addTopic(entry, definition) {
    const title = normalize(entry.topic);
    topics.push({...entry, title, key: normalize(title + ' ' + definition.name + ' ' + definition.code + ' ' + definition.family), definition});
  }

  for (const definition of courses) {
    course.add(new Option(definition.name, definition.id));
    if (definition.group !== 'modular') continue;
    const index = window.ELITE_TOPIC_INDEX?.[definition.id];
    if (!index) { unavailable.add(definition.id); continue; }
    for (const row of Object.values(index.topics)) {
      if (!row.practice) continue;
      const url = new URL(row.practice, document.baseURI);
      const topic = url.searchParams.get('topic');
      url.searchParams.set('bank', 'all');
      url.hash = 'questionGrid';
      if (topic) addTopic({topic, path: url.href}, definition);
    }
  }

  function render() {
    const query = normalize(input.value);
    const words = query.split(' ').filter(Boolean);
    const searching = Boolean(query || course.value);
    const matches = searching ? topics.filter((t) =>
      (!course.value || t.definition.id === course.value) && words.every((w) => t.key.includes(w))) : [];
    const rank = (t) => query && t.title === query ? 0 : query && t.title.startsWith(query) ? 1 : 2;
    matches.sort((a, b) => rank(a) - rank(b) || a.topic.localeCompare(b.topic) || a.definition.name.localeCompare(b.definition.name));
    list.replaceChildren(...matches.slice(0, limit).map((t) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const title = document.createElement('span');
      const detail = document.createElement('small');
      link.href = t.path;
      title.textContent = t.topic;
      const description = t.questions == null ? 'Practice' : t.questions + (t.questions === 1 ? ' question' : ' questions');
      detail.textContent = t.definition.name + ' · ' + description;
      link.append(title, detail);
      item.append(link);
      return item;
    }));
    more.hidden = matches.length <= limit;
    const incomplete = course.value ? unavailable.has(course.value) : unavailable.size > 0;
    if (!searching) status.textContent = '';
    else if (loading && !matches.length) status.textContent = 'Loading topics…';
    else {
      const count = matches.length;
      const message = count ? (count > limit ? 'Showing ' + limit + ' of ' : '') + count + (count === 1 ? ' topic.' : ' topics.')
        : incomplete ? '' : 'No matching topics. Try a shorter word or another course.';
      status.textContent = [message, incomplete ? 'Some topics could not load. Reload the page to try again.' : ''].filter(Boolean).join(' ');
    }
  }

  function resetSearch() { limit = pageSize; render(); }
  input.addEventListener('input', resetSearch);
  course.addEventListener('change', resetSearch);
  more.addEventListener('click', () => {
    const firstNew = limit;
    limit += pageSize;
    render();
    list.children[firstNew]?.querySelector('a').focus();
  });

  fetch('data/topic-pages.json?v=20261024a').then((response) => {
    if (!response.ok) throw new Error('Topic index unavailable');
    return response.json();
  }).then((data) => {
    for (const entry of data.pages) {
      const definition = courses.find((c) => c.id === entry.course);
      if (entry.type === 'topic' && definition) addTopic(entry, definition);
    }
  }).catch(() => {
    courses.filter((c) => c.group !== 'modular').forEach((c) => unavailable.add(c.id));
  }).finally(() => { loading = false; render(); });
})();
