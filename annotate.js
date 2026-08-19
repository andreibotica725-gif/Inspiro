/* ============================================================
   INSPIRO — VISITOR ANNOTATION ENGINE
   Hover any element -> blue pencil -> side panel -> note.
   Notes persist to notes.json through the local notes server,
   and always mirror to the browser as a fallback.
   ============================================================ */
(function () {
  'use strict';

  var API = 'api/notes';                 // notes-server.js endpoint
  var SEED = 'notes.json';               // static fallback read
  var LS_KEY = 'inspiro.notes.v1';
  var PAGE = (location.pathname.split('/').pop() || 'index.html');

  /* every element type a reviewer can comment on */
  var SEL = [
    'h1','h2','h3','h4','h5','p','li','q','blockquote','img','label',
    'a.btn','button','.tag','.filter-chip','.eyebrow','.stars','.crumb',
    '.industry-card','.criteria-card','.case-card','.service-card','.work-card',
    '.review-card','.faq-item','.stat-card','.pillar-card','.rm-card','.mini-card',
    '.step','.media-card','.frame','.form-card','.field','.target','.mini-stat',
    '.stat-band-grid > div','.strip-grid > div','.footer-grid > div',
    '.hero','.p-hero','.cta-band','.band-dark','.strip','.site-header','.site-footer','section'
  ].join(',');

  var notes = [];
  var remote = false;
  var hoverEl = null;
  var selectedEl = null;
  var pencil, tip, panel, toggle;

  /* ---------- element identity ------------------------------ */
  function pathOf(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      var sel = el.tagName.toLowerCase(), p = el.parentElement;
      if (p) {
        var same = Array.prototype.filter.call(p.children, function (c) {
          return c.tagName === el.tagName;
        });
        if (same.length > 1) sel += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
      }
      parts.unshift(sel);
      el = p;
    }
    return parts.join('>');
  }

  function resolve(path) {
    try { return document.body.querySelector(':scope>' + path); }
    catch (e) { return null; }
  }

  function idOf(el) { return PAGE + '::' + pathOf(el); }

  function labelOf(el) {
    var t = el.tagName.toLowerCase();
    var map = {
      h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4',
      p: 'Text', li: 'List item', q: 'Quote', blockquote: 'Quote',
      img: 'Image', button: 'Button', a: 'Link', section: 'Section',
      header: 'Header', footer: 'Footer', label: 'Field label'
    };
    var base = map[t] || 'Block';
    if (el.classList.contains('btn')) base = 'Button';
    else if (el.classList.contains('frame') || el.classList.contains('media-card')) base = 'Media block';
    else if (el.classList.contains('eyebrow')) base = 'Eyebrow label';
    else if (/card|step|field|faq-item/.test(el.className)) base = 'Card';
    return base;
  }

  function textOf(el) {
    if (el.tagName === 'IMG') return '[image] ' + (el.getAttribute('alt') || el.getAttribute('src') || '');
    var t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 400 ? t.slice(0, 400) + '…' : (t || '[no text content]');
  }

  function notesFor(id) {
    return notes.filter(function (n) { return n.elementId === id; });
  }

  /* ---------- storage --------------------------------------- */
  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(notes)); } catch (e) {}
  }

  function merge(a, b) {
    var out = a.slice(), seen = {};
    out.forEach(function (n) { seen[n.id] = 1; });
    b.forEach(function (n) { if (!seen[n.id]) out.push(n); });
    return out;
  }

  function load(done) {
    fetch(API, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        remote = true;
        notes = merge(d.notes || [], readLocal());
        done();
      })
      .catch(function () {
        fetch(SEED, { cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw 0; return r.json(); })
          .then(function (d) { notes = merge(d.notes || [], readLocal()); done(); })
          .catch(function () { notes = readLocal(); done(); });
      });
  }

  function persist() {
    writeLocal();
    if (!remote) { status(); return; }
    fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updated: new Date().toISOString(), notes: notes })
    }).then(function (r) { remote = r.ok; status(); })
      .catch(function () { remote = false; status(); });
  }

  /* ---------- markers --------------------------------------- */
  function paintMarkers() {
    document.querySelectorAll('[data-anno-count]').forEach(function (el) {
      el.removeAttribute('data-anno-count');
    });
    var counts = {};
    notes.forEach(function (n) {
      if (n.page !== PAGE) return;
      counts[n.elementId] = (counts[n.elementId] || 0) + 1;
    });
    Object.keys(counts).forEach(function (id) {
      var el = resolve(id.split('::')[1]);
      if (el) el.setAttribute('data-anno-count', counts[id]);
    });
    if (toggle) toggle.querySelector('.badge').textContent =
      notes.filter(function (n) { return n.page === PAGE; }).length;
  }

  /* ---------- floating pencil + tooltip --------------------- */
  function placePencil(el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return hidePencil();
    var top = Math.max(6, r.top + 5);
    var left = Math.min(window.innerWidth - 36, r.right - 33);
    pencil.style.top = top + 'px';
    pencil.style.left = left + 'px';
    pencil.classList.add('show');
    var c = el.getAttribute('data-anno-count');
    var badge = pencil.querySelector('.count');
    badge.style.display = c ? 'flex' : 'none';
    badge.textContent = c || '';
  }
  function hidePencil() { pencil.classList.remove('show'); }

  function showTip(el) {
    var list = notesFor(idOf(el));
    if (!list.length) return hideTip();
    tip.innerHTML = '<p class="h">' + list.length + ' note' + (list.length > 1 ? 's' : '') + ' on this ' +
      labelOf(el).toLowerCase() + '</p>' +
      list.slice(0, 3).map(function (n) {
        return '<div class="n">' + esc(n.note) + '<em>' + (esc(n.author) || 'Visitor') + ' · ' + when(n.created) + '</em></div>';
      }).join('') +
      (list.length > 3 ? '<div class="n">+ ' + (list.length - 3) + ' more…</div>' : '');
    tip.classList.add('show');
    var r = el.getBoundingClientRect(), tr = tip.getBoundingClientRect();
    var top = r.top - tr.height - 10;
    if (top < 8) top = Math.min(window.innerHeight - tr.height - 8, r.bottom + 10);
    tip.style.top = Math.max(8, top) + 'px';
    tip.style.left = Math.max(8, Math.min(window.innerWidth - tr.width - 8, r.left)) + 'px';
  }
  function hideTip() { tip.classList.remove('show'); }

  function setHover(el) {
    if (hoverEl === el) return;
    if (hoverEl) hoverEl.classList.remove('anno-target');
    hoverEl = el;
    if (!el) { hidePencil(); hideTip(); return; }
    el.classList.add('anno-target');
    placePencil(el);
    showTip(el);
  }

  /* ---------- panel ----------------------------------------- */
  function openPanel(el) {
    if (selectedEl) selectedEl.classList.remove('anno-selected');
    selectedEl = el;
    el.classList.add('anno-selected');
    renderPanel();
    panel.classList.add('open');
    document.body.classList.add('anno-panel-open');
    setTimeout(function () { var t = panel.querySelector('textarea'); if (t) t.focus(); }, 300);
  }

  function closePanel() {
    panel.classList.remove('open');
    document.body.classList.remove('anno-panel-open');
    if (selectedEl) selectedEl.classList.remove('anno-selected');
    selectedEl = null;
  }

  function renderPanel() {
    var body = panel.querySelector('.anno-body');
    if (!selectedEl) { body.innerHTML = ''; return; }
    var id = idOf(selectedEl);
    var mine = notesFor(id);
    var pageNotes = notes.filter(function (n) { return n.page === PAGE; });

    body.innerHTML =
      '<p class="anno-sec-title">Selected element</p>' +
      '<div class="anno-el">' +
        '<span class="anno-chip">' + labelOf(selectedEl) + '</span>' +
        '<p class="txt">' + esc(textOf(selectedEl)) + '</p>' +
        '<p class="path">' + esc(pathOf(selectedEl)) + '</p>' +
        '<button class="anno-parent" data-parent>&#8593; Select the parent block instead</button>' +
      '</div>' +

      '<p class="anno-sec-title">Add a note</p>' +
      '<div class="anno-field">' +
        '<input type="text" data-author placeholder="Your name (optional)" value="' + esc(lastAuthor()) + '">' +
        '<textarea data-note placeholder="What should change about this element?"></textarea>' +
        '<button class="anno-save" data-save disabled>Save note</button>' +
      '</div>' +

      '<p class="anno-sec-title" style="margin-top:22px;">Notes on this element (' + mine.length + ')</p>' +
      (mine.length ? '<ul class="anno-list">' + mine.map(noteHTML).join('') + '</ul>'
                   : '<p class="anno-empty">No notes yet on this element.</p>') +

      '<p class="anno-sec-title" style="margin-top:26px;">All notes on ' + PAGE + ' (' + pageNotes.length + ')</p>' +
      (pageNotes.length ? '<ul class="anno-list">' + pageNotes.map(function (n) {
          return noteHTML(n, true);
        }).join('') + '</ul>'
        : '<p class="anno-empty">Nothing recorded on this page yet.</p>');

    var ta = body.querySelector('[data-note]');
    var save = body.querySelector('[data-save]');
    ta.addEventListener('input', function () { save.disabled = !ta.value.trim(); });
    save.addEventListener('click', function () {
      addNote(ta.value.trim(), body.querySelector('[data-author]').value.trim());
    });
    ta.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && ta.value.trim()) {
        addNote(ta.value.trim(), body.querySelector('[data-author]').value.trim());
      }
    });
    body.querySelector('[data-parent]').addEventListener('click', function () {
      var p = selectedEl.parentElement && selectedEl.parentElement.closest(SEL);
      if (p && !p.closest('.anno-ui')) openPanel(p);
    });
    body.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () { removeNote(b.getAttribute('data-del')); });
    });
    body.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () {
        var el = resolve(b.getAttribute('data-goto').split('::')[1]);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        openPanel(el);
      });
    });
    status();
  }

  function noteHTML(n, withRef) {
    return '<li class="anno-note">' +
      (withRef ? '<p class="ref" data-goto="' + esc(n.elementId) + '">' + esc(n.elementLabel) + ' · ' +
                 esc((n.elementText || '').slice(0, 60)) + '…</p>' : '') +
      '<p class="who">' + (esc(n.author) || 'Visitor') + '</p>' +
      '<p class="body">' + esc(n.note) + '</p>' +
      '<p class="meta">' + when(n.created) + '</p>' +
      '<button class="anno-del" data-del="' + n.id + '">Delete</button>' +
    '</li>';
  }

  function addNote(text, author) {
    if (!text || !selectedEl) return;
    try { localStorage.setItem('inspiro.notes.author', author || ''); } catch (e) {}
    notes.push({
      id: 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      page: PAGE,
      url: location.href,
      elementId: idOf(selectedEl),
      selector: pathOf(selectedEl),
      elementLabel: labelOf(selectedEl),
      elementText: textOf(selectedEl),
      note: text,
      author: author || '',
      created: new Date().toISOString()
    });
    persist();
    paintMarkers();
    renderPanel();
  }

  function removeNote(id) {
    notes = notes.filter(function (n) { return n.id !== id; });
    persist();
    paintMarkers();
    renderPanel();
  }

  function lastAuthor() {
    try { return localStorage.getItem('inspiro.notes.author') || ''; } catch (e) { return ''; }
  }

  function status() {
    var s = panel.querySelector('.anno-status');
    if (!s) return;
    s.innerHTML = remote
      ? 'Saving to <b>notes.json</b> on the notes server.'
      : 'Notes server not running — stored in this browser. Use <b>Download notes.json</b> to hand them over.';
  }

  function exportJSON() {
    var blob = new Blob([JSON.stringify({ updated: new Date().toISOString(), notes: notes }, null, 2)],
      { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notes.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ---------- helpers --------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function when(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  /* ---------- build UI -------------------------------------- */
  function build() {
    pencil = document.createElement('button');
    pencil.className = 'anno-pencil anno-ui';
    pencil.title = 'Add a note about this element';
    pencil.setAttribute('aria-label', 'Add a note about this element');
    pencil.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/>' +
      '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg><span class="count"></span>';
    document.body.appendChild(pencil);

    tip = document.createElement('div');
    tip.className = 'anno-tip anno-ui';
    document.body.appendChild(tip);

    panel = document.createElement('aside');
    panel.className = 'anno-panel anno-ui';
    panel.innerHTML =
      '<div class="anno-head">' +
        '<div><h2>Review note</h2><p class="sub">Comment on any part of this page</p></div>' +
        '<button class="anno-x" data-close aria-label="Close panel">&times;</button>' +
      '</div>' +
      '<div class="anno-body"></div>' +
      '<div class="anno-foot">' +
        '<button class="anno-btn" data-export>Download notes.json</button>' +
        '<button class="anno-btn danger" data-clear>Clear this page</button>' +
        '<p class="anno-status"></p>' +
      '</div>';
    document.body.appendChild(panel);

    toggle = document.createElement('button');
    toggle.className = 'anno-toggle anno-ui';
    toggle.innerHTML = '<span class="dot"></span>Review mode <span class="badge">0</span>';
    document.body.appendChild(toggle);

    pencil.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (hoverEl) { hideTip(); openPanel(hoverEl); }
    });
    panel.querySelector('[data-close]').addEventListener('click', closePanel);
    panel.querySelector('[data-export]').addEventListener('click', exportJSON);
    panel.querySelector('[data-clear]').addEventListener('click', function () {
      if (!confirm('Delete every note recorded on ' + PAGE + '?')) return;
      notes = notes.filter(function (n) { return n.page !== PAGE; });
      persist(); paintMarkers(); renderPanel();
    });
    toggle.addEventListener('click', function () {
      document.body.classList.toggle('anno-off');
      if (document.body.classList.contains('anno-off')) { setHover(null); closePanel(); }
    });
  }

  /* ---------- events ---------------------------------------- */
  function wire() {
    document.addEventListener('mouseover', function (e) {
      if (document.body.classList.contains('anno-off')) return;
      var t = e.target;
      if (t.closest && t.closest('.anno-ui')) return;          // keep current target
      var el = t.closest ? t.closest(SEL) : null;
      if (!el || el.closest('.anno-ui')) { setHover(null); return; }
      setHover(el);
    }, true);

    document.addEventListener('mouseleave', function () { setHover(null); });

    window.addEventListener('scroll', function () {
      if (hoverEl) { placePencil(hoverEl); hideTip(); }
    }, { passive: true });

    window.addEventListener('resize', function () { setHover(null); paintMarkers(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    /* stop links firing while a reviewer is clicking the pencil area */
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.anno-pencil')) e.preventDefault();
    }, true);
  }

  function init() {
    build();
    wire();
    load(function () { paintMarkers(); status(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
