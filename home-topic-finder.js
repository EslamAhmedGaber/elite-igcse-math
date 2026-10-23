// Home "Find a topic": type a topic name, jump straight to its topic page (questions + worked solutions).
// Data: data/topic-pages.json, written by tools/build_topic_pages.cjs.
(function () {
  const root = document.querySelector('[data-topic-finder]');
  if (!root) return;
  const input = root.querySelector('input');
  const list = root.querySelector('ul');
  const empty = root.querySelector('.e27-finder-empty');
  const COURSE = {linear: 'IGCSE (Linear & Modular)', wma11: 'Pure 1', wma12: 'Pure 2', wma13: 'Pure 3', wme01: 'Mechanics 1'};
  const norm = (text) => String(text).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
  const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  let topics = [];

  function render() {
    const words = norm(input.value).split(' ').filter(Boolean);
    const matches = words.length ? topics.filter((t) => words.every((w) => t.key.includes(w))).slice(0, 10) : [];
    list.innerHTML = matches.map((t) => `<li><a href="${esc(t.path)}"><span>${esc(t.topic)}</span><small>${esc(COURSE[t.course] || '')} &middot; ${t.questions} Qs</small></a></li>`).join('');
    empty.hidden = !(words.length && !matches.length);
  }

  fetch('data/topic-pages.json?v=20261024a')
    .then((res) => res.json())
    .then((data) => {
      topics = data.pages.filter((p) => p.type === 'topic').map((p) => ({...p, key: norm(`${p.topic} ${COURSE[p.course] || ''} ${p.course}`)}));
      input.disabled = false;
      render();
    })
    .catch(() => { root.hidden = true; });
  input.addEventListener('input', render);
})();
