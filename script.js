(function(){
  const STORAGE_KEY = 'marginalia-notes';
  let notes = [];
  let newColor = 'cream';

  const composer = document.getElementById('composer');
  const newTitle = document.getElementById('newTitle');
  const newBody = document.getElementById('newBody');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const newSwatches = document.getElementById('newSwatches');
  const searchInput = document.getElementById('searchInput');
  const pinnedGrid = document.getElementById('pinnedGrid');
  const notesGrid = document.getElementById('notesGrid');
  const pinnedLabel = document.getElementById('pinnedLabel');
  const othersLabel = document.getElementById('othersLabel');
  const emptyState = document.getElementById('emptyState');
  const tally = document.getElementById('tally');
  const focusComposerBtn = document.getElementById('focusComposerBtn');

  function uid(){ return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  function tiltFor(id){
    let h = 0;
    for (let i=0;i<id.length;i++) h = (h*31 + id.charCodeAt(i)) % 1000;
    return ((h/1000) * 1.6 - 0.8).toFixed(2) + 'deg';
  }

  function fmtDate(ts){
    const d = new Date(ts);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + String(d.getHours()%12||12).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + (d.getHours()>=12?'pm':'am');
  }

  async function loadNotes(){
    try {
      const res = await window.storage.get(STORAGE_KEY, false);
      if (res && res.value) {
        notes = JSON.parse(res.value);
      }
    } catch(e) {
      notes = [];
    }
    render();
  }

  async function persist(){
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(notes), false);
    } catch(e) {
      console.error('Could not save notes', e);
    }
  }

  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function render(){
    const query = searchInput.value.trim().toLowerCase();
    const filtered = notes.filter(n =>
      !query || n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query)
    );

    const pinned = filtered.filter(n => n.pinned).sort((a,b)=>b.updatedAt-a.updatedAt);
    const rest = filtered.filter(n => !n.pinned).sort((a,b)=>b.updatedAt-a.updatedAt);

    pinnedLabel.style.display = pinned.length ? 'flex' : 'none';
    othersLabel.style.display = (rest.length && (pinned.length || notes.length)) ? 'flex' : 'none';

    pinnedGrid.innerHTML = pinned.map(cardHtml).join('');
    notesGrid.innerHTML = rest.map(cardHtml).join('');

    emptyState.style.display = filtered.length === 0 ? 'block' : 'none';
    tally.textContent = notes.length + (notes.length === 1 ? ' note' : ' notes');

    attachCardHandlers();
  }

  function cardHtml(n){
    const colorClass = n.color && n.color !== 'cream' ? 'color-' + n.color : '';
    return `
    <div class="card ${colorClass} ${n.pinned ? 'is-pinned' : ''}" data-id="${n.id}" style="--tilt:${tiltFor(n.id)}">
      <div class="perf"><span></span><span></span></div>
      <button class="pin-toggle" title="${n.pinned ? 'Unpin' : 'Pin'}" data-action="pin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2a2416" stroke-width="1.6">
          <circle cx="12" cy="9" r="4"/><line x1="12" y1="13" x2="12" y2="21"/>
        </svg>
      </button>
      <h3 data-field="title">${escapeHtml(n.title) || 'Untitled'}</h3>
      <p class="body" data-field="body">${escapeHtml(n.body)}</p>
      <div class="card-footer">
        <span class="stamp">${fmtDate(n.updatedAt)}</span>
        <div class="card-actions">
          <button class="icon-btn" data-action="edit" title="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2a2416" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="icon-btn delete" data-action="delete" title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2a2416" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  function attachCardHandlers(){
    document.querySelectorAll('.card').forEach(card => {
      const id = card.dataset.id;
      const note = notes.find(n => n.id === id);
      if (!note) return;

      card.querySelector('[data-action="pin"]').addEventListener('click', () => {
        note.pinned = !note.pinned;
        note.updatedAt = Date.now();
        persist(); render();
      });

      card.querySelector('[data-action="delete"]').addEventListener('click', () => {
        notes = notes.filter(n => n.id !== id);
        persist(); render();
      });

      card.querySelector('[data-action="edit"]').addEventListener('click', () => {
        enterEditMode(card, note);
      });
    });
  }

  function enterEditMode(card, note){
    const titleEl = card.querySelector('[data-field="title"]');
    const bodyEl = card.querySelector('[data-field="body"]');

    const titleInput = document.createElement('input');
    titleInput.className = 'edit-title';
    titleInput.value = note.title;

    const bodyTextarea = document.createElement('textarea');
    bodyTextarea.className = 'edit-field';
    bodyTextarea.value = note.body;

    titleEl.replaceWith(titleInput);
    bodyEl.replaceWith(bodyTextarea);
    titleInput.focus();

    const footer = card.querySelector('.card-footer');
    const doneBtn = document.createElement('button');
    doneBtn.className = 'save-btn';
    doneBtn.textContent = 'Done';
    doneBtn.style.fontSize = '12px';
    doneBtn.style.padding = '6px 12px';
    footer.parentNode.insertBefore(doneBtn, footer);
    footer.style.display = 'none';

    function commit(){
      note.title = titleInput.value.trim();
      note.body = bodyTextarea.value.trim();
      note.updatedAt = Date.now();
      persist(); render();
    }
    doneBtn.addEventListener('click', commit);
    titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
  }

  // Composer behavior
  function expandComposer(){ composer.classList.add('expanded'); }
  function collapseComposer(){
    composer.classList.remove('expanded');
    newTitle.value = '';
    newBody.value = '';
    newBody.style.height = 'auto';
    newColor = 'cream';
    newSwatches.querySelectorAll('.swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === 'cream'));
  }

  newTitle.addEventListener('focus', expandComposer);
  newBody.addEventListener('focus', expandComposer);
  focusComposerBtn.addEventListener('click', () => { expandComposer(); newTitle.focus(); });

  newBody.addEventListener('input', () => {
    newBody.style.height = 'auto';
    newBody.style.height = newBody.scrollHeight + 'px';
  });

  newSwatches.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      newColor = sw.dataset.color;
      newSwatches.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
  });

  cancelBtn.addEventListener('click', collapseComposer);

  saveBtn.addEventListener('click', () => {
    const title = newTitle.value.trim();
    const body = newBody.value.trim();
    if (!title && !body) { collapseComposer(); return; }
    notes.push({
      id: uid(),
      title: title,
      body: body,
      color: newColor,
      pinned: false,
      updatedAt: Date.now()
    });
    persist();
    collapseComposer();
    render();
  });

  document.addEventListener('click', (e) => {
    if (!composer.contains(e.target) && composer.classList.contains('expanded')) {
      const hasContent = newTitle.value.trim() || newBody.value.trim();
      if (!hasContent) collapseComposer();
    }
  });

  searchInput.addEventListener('input', render);

  loadNotes();
})();