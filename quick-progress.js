(function (root) {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let undoAction = null;
  let toast;
  function notify(message, undo) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'qp-toast';
      toast.innerHTML = '<span role="status" aria-live="polite"></span><button type="button">Undo</button>';
      document.body.append(toast);
      toast.querySelector('button').addEventListener('click', () => undoAction?.());
    }
    undoAction = undo || null;
    toast.hidden = false;
    toast.querySelector('span').textContent = message;
    toast.querySelector('button').hidden = !undo;
  }
  function restoreFocus(id, action) {
    requestAnimationFrame(() => {
      const exact = [...document.querySelectorAll('[data-qp-id]')].find(el => el.dataset.qpId === id && el.dataset.action === action);
      (exact || document.querySelector('.qp-controls input'))?.focus({preventScroll:true});
    });
  }
  function change(key, next, apply, message) {
    const active = document.activeElement;
    const id = active?.dataset.qpId;
    const action = active?.dataset.action;
    let previous, serialized;
    try {
      previous = localStorage.getItem(key);
      if (previous !== null) {
        const stored = JSON.parse(previous);
        if (!stored || typeof stored !== 'object' || Array.isArray(stored) !== Array.isArray(next)) {
          throw new Error('Invalid saved progress');
        }
      }
      serialized = JSON.stringify(next);
      localStorage.setItem(key, serialized);
    } catch (error) {
      if (active?.type === 'checkbox') active.checked = !active.checked;
      notify('Not saved. Browser storage is unavailable.');
      return false;
    }
    apply(next);
    if (id) restoreFocus(id, action);
    notify(message + ' Saved on this device.', () => {
      try {
        if (localStorage.getItem(key) !== serialized) {
          notify('Progress changed since then. Use the question controls to update it.');
          return;
        }
        if (previous === null) localStorage.removeItem(key); else localStorage.setItem(key, previous);
      } catch (error) { notify('Could not undo. Browser storage is unavailable.'); return; }
      apply(previous === null ? (Array.isArray(next) ? [] : {}) : JSON.parse(previous));
      if (id) restoreFocus(id, action);
      notify('Change undone.');
    });
    return true;
  }
  function controls({id, solved, review, solveAction = 'solve', reviewAction = 'quickReview'}) {
    return `<div class="qp-controls" role="group" aria-label="Your progress">
      <label class="qp-check ${solved ? 'is-solved' : ''}"><input type="checkbox" data-qp-id="${escape(id)}" data-action="${escape(solveAction)}" ${solved ? 'checked' : ''}><span>Solved</span></label>
      <label class="qp-check qp-review ${review ? 'is-review' : ''}"><input type="checkbox" data-qp-id="${escape(id)}" data-action="${escape(reviewAction)}" ${review ? 'checked' : ''}><span>Needs review</span></label>
    </div>`;
  }
  root.EliteQuickProgress = {controls, change, notify};
})(window);
