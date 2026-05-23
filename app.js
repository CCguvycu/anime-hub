(() => {
  // ── State ──────────────────────────────────────
  let activeCat  = 'all';
  let activeLang = 'all';
  let searchQ    = '';
  let sortBy     = 'name';
  let listMode   = false;
  let favOnly    = false;
  let favs       = new Set(JSON.parse(localStorage.getItem('ah_favs') || '[]'));
  let currentSite = null;
  let frameTimer  = null;

  // ── Elements ───────────────────────────────────
  const grid      = document.getElementById('grid');
  const empty     = document.getElementById('empty');
  const showCount = document.getElementById('showCount');
  const totalCount= document.getElementById('totalCount');
  const favCount  = document.getElementById('favCount');
  const sCnt      = document.getElementById('sCnt');
  const mCnt      = document.getElementById('mCnt');
  const iCnt      = document.getElementById('iCnt');
  const oCnt      = document.getElementById('oCnt');
  const panel     = document.getElementById('panel');
  const overlay   = document.getElementById('overlay');
  const siteFrame = document.getElementById('siteFrame');
  const frameMsg  = document.getElementById('frameMsg');
  const frameMsgText = document.getElementById('frameMsgText');
  const searchInput  = document.getElementById('searchInput');

  // ── Favicon helper ─────────────────────────────
  function faviconURL(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    } catch { return ''; }
  }

  // ── Filter ─────────────────────────────────────
  function filtered() {
    let list = SITES.slice();
    if (favOnly) list = list.filter(s => favs.has(s.id));
    if (activeCat !== 'all') list = list.filter(s => s.cat === activeCat);
    if (activeLang !== 'all') list = list.filter(s => s.lang === activeLang);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        s.cat.toLowerCase().includes(q)
      );
    }
    // sort
    list.sort((a, b) => {
      if (sortBy === 'cat')  return a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name);
      if (sortBy === 'lang') return a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return list;
  }

  // ── Render ─────────────────────────────────────
  function render() {
    const list = filtered();
    showCount.textContent = list.length;

    if (list.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      grid.innerHTML = list.map(site => {
        const faved = favs.has(site.id);
        const icon  = faviconURL(site.url);
        return `
<div class="card${faved ? ' faved' : ''}" data-id="${site.id}" role="button" tabindex="0">
  <button class="fav-star${faved ? ' on' : ''}" data-fav="${site.id}" title="Favourite" aria-label="Favourite ${site.name}">★</button>
  <div class="card-top">
    <img class="card-icon" src="${icon}" alt="" loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div class="card-icon-fallback" style="display:none">⟐</div>
    <div class="card-title">${site.name}</div>
  </div>
  <div class="card-desc">${site.desc}</div>
  <div class="card-footer">
    <span class="tag tag-${site.cat}">${site.cat}</span>
    <span class="lang-tag">${site.lang}</span>
  </div>
</div>`;
      }).join('');
    }

    // sidebar stats
    const all = SITES;
    sCnt.textContent = all.filter(s => s.cat === 'streaming' || s.cat === 'dubbed' || s.cat === 'premium').length;
    mCnt.textContent = all.filter(s => s.cat === 'manga' || s.cat === 'manhwa').length;
    iCnt.textContent = all.filter(s => s.cat === 'info').length;
    oCnt.textContent = all.filter(s => !['streaming','dubbed','premium','manga','manhwa','info'].includes(s.cat)).length;
    favCount.textContent = favs.size;
  }

  // ── Open panel ─────────────────────────────────
  function openPanel(site) {
    currentSite = site;
    document.getElementById('pName').textContent = site.name;
    const urlEl = document.getElementById('pUrl');
    urlEl.textContent = site.url;
    urlEl.href = site.url;
    document.getElementById('pDesc').textContent = site.desc;
    document.getElementById('pOpen').href = site.url;
    document.getElementById('pIcon').src = faviconURL(site.url);

    // tags
    const tagsEl = document.getElementById('pTags');
    tagsEl.innerHTML = `<span class="tag tag-${site.cat}">${site.cat}</span>
      <span class="lang-tag">${site.lang}</span>`;

    // fav button
    const pFav = document.getElementById('pFav');
    pFav.textContent = favs.has(site.id) ? '★ Unfav' : '★ Fav';

    // frame
    showFrameMsg('loading');
    siteFrame.src = 'about:blank';
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.classList.add('panel-open');

    // delay a moment then attempt load
    clearTimeout(frameTimer);
    frameTimer = setTimeout(() => {
      siteFrame.src = site.url;

      // detect block after 5s
      frameTimer = setTimeout(() => {
        // check if iframe loaded
        try {
          // if we can access contentWindow location it's same-origin (unlikely)
          const loc = siteFrame.contentWindow.location.href;
          if (loc === 'about:blank' || loc === '') showFrameBlocked(site);
        } catch (e) {
          // cross-origin — assume blocked
          showFrameBlocked(site);
        }
      }, 5000);
    }, 200);
  }

  function showFrameMsg(type) {
    frameMsg.classList.remove('hidden-msg');
    if (type === 'loading') {
      frameMsg.innerHTML = `<div class="spinner"></div><span id="frameMsgText">Attempting to embed site…</span>`;
    }
  }

  function showFrameBlocked(site) {
    frameMsg.classList.remove('hidden-msg');
    frameMsg.innerHTML = `
      <div class="frame-blocked">
        <div class="block-icon">⚠</div>
        <p>This site blocks embedding for security reasons.<br>
        This is normal — most streaming sites use <code>X-Frame-Options</code> headers.</p>
        <a href="${site.url}" target="_blank" rel="noopener">⊞ Open ${site.name} in New Tab →</a>
      </div>`;
    siteFrame.src = 'about:blank';
  }

  function closePanel() {
    clearTimeout(frameTimer);
    siteFrame.src = 'about:blank';
    panel.classList.add('hidden');
    overlay.classList.add('hidden');
    document.body.classList.remove('panel-open');
    currentSite = null;
  }

  // ── Fav toggle ─────────────────────────────────
  function toggleFav(id) {
    id = parseInt(id);
    if (favs.has(id)) favs.delete(id);
    else favs.add(id);
    localStorage.setItem('ah_favs', JSON.stringify([...favs]));
    render();
  }

  // ── Event: grid clicks ─────────────────────────
  grid.addEventListener('click', e => {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.stopPropagation();
      toggleFav(favBtn.dataset.fav);
      return;
    }
    const card = e.target.closest('.card');
    if (card) {
      const site = SITES.find(s => s.id === parseInt(card.dataset.id));
      if (site) openPanel(site);
    }
  });

  grid.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const card = e.target.closest('.card');
      if (card) {
        const site = SITES.find(s => s.id === parseInt(card.dataset.id));
        if (site) openPanel(site);
      }
    }
  });

  // ── Event: panel controls ──────────────────────
  document.getElementById('pClose').addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  document.getElementById('pFav').addEventListener('click', () => {
    if (currentSite) {
      toggleFav(currentSite.id);
      document.getElementById('pFav').textContent = favs.has(currentSite.id) ? '★ Unfav' : '★ Fav';
    }
  });

  // iframe load event — hide loading message if loaded successfully
  siteFrame.addEventListener('load', () => {
    clearTimeout(frameTimer);
    try {
      const loc = siteFrame.contentWindow.location.href;
      if (!loc || loc === 'about:blank') { showFrameBlocked(currentSite); return; }
      // loaded!
      frameMsg.classList.add('hidden-msg');
    } catch {
      // cross-origin load — could be success or could be error page
      // hide loading, show content (can't inspect cross-origin)
      frameMsg.classList.add('hidden-msg');
    }
  });

  siteFrame.addEventListener('error', () => {
    if (currentSite) showFrameBlocked(currentSite);
  });

  // ── Event: search ──────────────────────────────
  searchInput.addEventListener('input', () => {
    searchQ = searchInput.value.trim();
    render();
  });

  // ── Event: category filter ─────────────────────
  document.querySelectorAll('.fbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      favOnly = false;
      document.getElementById('favBtn').classList.remove('active');
      render();
    });
  });

  // ── Event: language filter ────────────────────
  document.querySelectorAll('.lbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLang = btn.dataset.lang;
      render();
    });
  });

  // ── Event: sort ───────────────────────────────
  document.getElementById('sortSel').addEventListener('change', e => {
    sortBy = e.target.value;
    render();
  });

  // ── Event: view toggle ────────────────────────
  document.getElementById('gridBtn').addEventListener('click', () => {
    listMode = false;
    grid.classList.remove('list-mode');
    document.getElementById('gridBtn').classList.add('active');
    document.getElementById('listBtn').classList.remove('active');
  });

  document.getElementById('listBtn').addEventListener('click', () => {
    listMode = true;
    grid.classList.add('list-mode');
    document.getElementById('listBtn').classList.add('active');
    document.getElementById('gridBtn').classList.remove('active');
  });

  // ── Event: favourites button ──────────────────
  document.getElementById('favBtn').addEventListener('click', () => {
    favOnly = !favOnly;
    document.getElementById('favBtn').classList.toggle('active', favOnly);
    if (favOnly) {
      activeCat = 'all';
      document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
      document.querySelector('.fbtn[data-cat="all"]').classList.add('active');
    }
    render();
  });

  // ── Keyboard: Escape closes panel ─────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.classList.contains('hidden')) closePanel();
  });

  // ── Init ──────────────────────────────────────
  totalCount.textContent = SITES.length;
  render();
})();
