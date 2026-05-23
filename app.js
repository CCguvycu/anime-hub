(() => {
  // ── State ──────────────────────────────────────────
  let activeCat   = 'all';
  let activeLang  = 'all';
  let searchQ     = '';
  let sortBy      = 'name';
  let favOnly     = false;
  let activeId    = null;
  let frameTimer  = null;
  let favs = new Set(JSON.parse(localStorage.getItem('ah_favs') || '[]'));

  const FEATURED_IDS = [1, 38, 30, 140, 220, 270, 97, 106, 300, 577];

  // ── DOM refs ───────────────────────────────────────
  const sidebar      = document.getElementById('sidebar');
  const siteList     = document.getElementById('siteList');
  const listCount    = document.getElementById('listCount');
  const countBadge   = document.getElementById('countBadge');
  const searchInput  = document.getElementById('searchInput');
  const viewer       = document.getElementById('viewer');
  const viewerBar    = document.getElementById('viewerBar');
  const vbIcon       = document.getElementById('vbIcon');
  const vbName       = document.getElementById('vbName');
  const vbUrl        = document.getElementById('vbUrl');
  const vbTags       = document.getElementById('vbTags');
  const vbFav        = document.getElementById('vbFav');
  const vbOpen       = document.getElementById('vbOpen');
  const vbClose      = document.getElementById('vbClose');
  const vbRefresh    = document.getElementById('vbRefresh');
  const frameWrap    = document.getElementById('frameWrap');
  const siteFrame    = document.getElementById('siteFrame');
  const welcome      = document.getElementById('welcome');
  const loadOverlay  = document.getElementById('loadOverlay');
  const loadText     = document.getElementById('loadText');
  const blockedOv    = document.getElementById('blockedOv');
  const blIcon       = document.getElementById('blIcon');
  const blName       = document.getElementById('blName');
  const blOpen       = document.getElementById('blOpen');
  const blUrl        = document.getElementById('blUrl');
  const favCount     = document.getElementById('favCount');
  const wcFeatured   = document.getElementById('wcFeatured');
  const resizeHandle = document.getElementById('resizeHandle');

  // ── Helpers ────────────────────────────────────────
  function favicon(url) {
    try { return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`; }
    catch { return ''; }
  }

  function dotClass(cat) {
    const map = {
      streaming:'streaming', premium:'premium', manga:'manga', manhwa:'manhwa',
      dubbed:'dubbed', downloads:'downloads', info:'info', news:'news',
      schedule:'schedule', community:'community', learning:'learning',
      music:'music', store:'store'
    };
    return 'dot-' + (map[cat] || 'default');
  }

  function catTagStyle(cat) {
    const cols = {
      streaming:'#00d4ff', premium:'#ffcc00', manga:'#aa44ff', manhwa:'#ff00aa',
      dubbed:'#ff7700', downloads:'#ff3355', info:'#4488ff', news:'#00ff88',
      schedule:'#88ccff', community:'#ff9966', learning:'#66ffcc',
      music:'#ff66cc', store:'#ccff66'
    };
    const c = cols[cat] || '#3d5266';
    return `style="color:${c};border-color:${c};border:1px solid;font-size:9px;padding:2px 5px;letter-spacing:.5px"`;
  }

  // ── Filter ─────────────────────────────────────────
  function filtered() {
    let list = SITES.slice();
    if (favOnly)           list = list.filter(s => favs.has(s.id));
    if (activeCat !== 'all')  list = list.filter(s => s.cat === activeCat);
    if (activeLang !== 'all') list = list.filter(s => s.lang === activeLang);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        s.cat.includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'cat')  return a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name);
      if (sortBy === 'lang') return a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return list;
  }

  // ── Render site list ───────────────────────────────
  function render() {
    const list = filtered();
    listCount.textContent = `${list.length} site${list.length !== 1 ? 's' : ''}`;
    countBadge.textContent = `${list.length} / ${SITES.length}`;
    favCount.textContent = favs.size;

    if (!list.length) {
      siteList.innerHTML = '<div style="padding:20px 10px;color:var(--text3);font-size:11px;text-align:center">No sites found</div>';
      return;
    }

    siteList.innerHTML = list.map(site => {
      const faved = favs.has(site.id);
      const ico   = favicon(site.url);
      const active = site.id === activeId ? ' active' : '';
      return `
<div class="site-item${active}" data-id="${site.id}" tabindex="0" role="button" aria-label="${site.name}">
  <img class="si-ico" src="${ico}" alt="" loading="lazy"
    onerror="this.style.visibility='hidden'">
  <span class="si-name">${site.name}</span>
  <span class="si-dot ${dotClass(site.cat)}"></span>
  <button class="si-fav${faved ? ' on' : ''}" data-fav="${site.id}" aria-label="Favourite">★</button>
</div>`;
    }).join('');
  }

  // ── Load site in viewer ────────────────────────────
  function loadSite(site) {
    activeId = site.id;

    // toolbar
    vbIcon.src = favicon(site.url);
    vbName.textContent = site.name;
    vbUrl.textContent  = site.url;
    vbUrl.href         = site.url;
    vbOpen.href        = site.url;
    vbTags.innerHTML   = `<span class="vtag" ${catTagStyle(site.cat)}>${site.cat}</span>
      <span style="font-size:9px;padding:2px 5px;border:1px solid var(--border);color:var(--text3)">${site.lang}</span>`;
    vbFav.textContent  = favs.has(site.id) ? '★ Unfav' : '★ Fav';
    viewerBar.classList.remove('hidden');

    // show loading, hide others
    welcome.style.display    = 'none';
    blockedOv.classList.add('hidden');
    loadOverlay.classList.remove('hidden');
    loadText.textContent = `Loading ${site.name}…`;

    // reset frame
    siteFrame.src = 'about:blank';
    clearTimeout(frameTimer);

    // attempt load after short delay
    frameTimer = setTimeout(() => {
      siteFrame.src = site.url;

      // after 6s check if blocked (cross-origin access throws = page loaded; about:blank = blocked/errored)
      frameTimer = setTimeout(() => {
        try {
          const loc = siteFrame.contentWindow.location.href;
          // if we get here without throwing, it's same-origin — hide loader
          if (!loc || loc === 'about:blank') {
            showBlocked(site);
          } else {
            loadOverlay.classList.add('hidden');
          }
        } catch {
          // cross-origin = page actually loaded (good!) — hide loader
          loadOverlay.classList.add('hidden');
        }
      }, 6000);
    }, 150);

    render(); // update active highlight
  }

  function showBlocked(site) {
    loadOverlay.classList.add('hidden');
    blockedOv.classList.remove('hidden');
    blIcon.src = favicon(site.url);
    blName.textContent = site.name;
    blOpen.href = site.url;
    blUrl.textContent = site.url;
    siteFrame.src = 'about:blank';
  }

  function closeSite() {
    clearTimeout(frameTimer);
    siteFrame.src = 'about:blank';
    activeId = null;
    viewerBar.classList.add('hidden');
    welcome.style.display    = '';
    loadOverlay.classList.add('hidden');
    blockedOv.classList.add('hidden');
    render();
  }

  // ── Welcome screen featured ────────────────────────
  function buildFeatured() {
    const sites = FEATURED_IDS.map(id => SITES.find(s => s.id === id)).filter(Boolean);
    wcFeatured.innerHTML = sites.map(s => `
<div class="wc-card" data-id="${s.id}">
  <img src="${favicon(s.url)}" alt="" width="16" height="16" loading="lazy" onerror="this.style.visibility='hidden'">
  ${s.name}
</div>`).join('');
    document.getElementById('wc-hint').textContent =
      `${SITES.length} sites · search · filter by category · ★ save favourites`;
  }

  // ── iframe events ──────────────────────────────────
  siteFrame.addEventListener('load', () => {
    clearTimeout(frameTimer);
    const currentSite = SITES.find(s => s.id === activeId);
    if (!currentSite) return;
    try {
      const loc = siteFrame.contentWindow.location.href;
      if (!loc || loc === 'about:blank') {
        showBlocked(currentSite);
      } else {
        loadOverlay.classList.add('hidden');
      }
    } catch {
      // cross-origin load = success
      loadOverlay.classList.add('hidden');
    }
  });

  siteFrame.addEventListener('error', () => {
    const currentSite = SITES.find(s => s.id === activeId);
    if (currentSite) showBlocked(currentSite);
  });

  // ── Event: site list clicks ────────────────────────
  siteList.addEventListener('click', e => {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.stopPropagation();
      toggleFav(parseInt(favBtn.dataset.fav));
      return;
    }
    const item = e.target.closest('.site-item');
    if (item) {
      const site = SITES.find(s => s.id === parseInt(item.dataset.id));
      if (site) loadSite(site);
    }
  });

  siteList.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const item = e.target.closest('.site-item');
      if (item) {
        const site = SITES.find(s => s.id === parseInt(item.dataset.id));
        if (site) loadSite(site);
      }
    }
  });

  // ── Event: welcome card clicks ─────────────────────
  wcFeatured.addEventListener('click', e => {
    const card = e.target.closest('[data-id]');
    if (card) {
      const site = SITES.find(s => s.id === parseInt(card.dataset.id));
      if (site) {
        loadSite(site);
        // scroll to item in list
        const el = siteList.querySelector(`[data-id="${site.id}"]`);
        if (el) el.scrollIntoView({ block: 'center' });
      }
    }
  });

  // ── Event: toolbar controls ────────────────────────
  vbClose.addEventListener('click', closeSite);
  vbRefresh.addEventListener('click', () => {
    const site = SITES.find(s => s.id === activeId);
    if (site) loadSite(site);
  });
  vbFav.addEventListener('click', () => {
    if (activeId !== null) {
      toggleFav(activeId);
      vbFav.textContent = favs.has(activeId) ? '★ Unfav' : '★ Fav';
    }
  });

  // ── Event: search ──────────────────────────────────
  searchInput.addEventListener('input', () => {
    searchQ = searchInput.value.trim();
    render();
  });

  // ── Event: category filter ─────────────────────────
  document.getElementById('catList').addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    favOnly = false;
    document.getElementById('favFilterBtn').classList.remove('active');
    render();
  });

  // ── Event: language filter ─────────────────────────
  document.querySelectorAll('.lbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLang = btn.dataset.lang;
      render();
    });
  });

  // ── Event: sort ────────────────────────────────────
  document.getElementById('sortSel').addEventListener('change', e => {
    sortBy = e.target.value;
    render();
  });

  // ── Event: favourites toggle ───────────────────────
  document.getElementById('favFilterBtn').addEventListener('click', () => {
    favOnly = !favOnly;
    document.getElementById('favFilterBtn').classList.toggle('active', favOnly);
    if (favOnly) {
      activeCat = 'all';
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.cat-btn[data-cat="all"]').classList.add('active');
    }
    render();
  });

  // ── Event: sidebar toggle ──────────────────────────
  document.getElementById('sbToggle').addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // ── Escape closes site ─────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeId !== null) closeSite();
  });

  // ── Fav toggle ─────────────────────────────────────
  function toggleFav(id) {
    if (favs.has(id)) favs.delete(id);
    else favs.add(id);
    localStorage.setItem('ah_favs', JSON.stringify([...favs]));
    render();
  }

  // ── Resize handle drag ─────────────────────────────
  let isResizing = false;

  resizeHandle.addEventListener('mousedown', e => {
    isResizing = true;
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // prevent iframe from stealing mouse events
    siteFrame.style.pointerEvents = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    const newW = Math.max(160, Math.min(520, e.clientX));
    sidebar.style.width = newW + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizeHandle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    siteFrame.style.pointerEvents = '';
  });

  // ── Init ───────────────────────────────────────────
  buildFeatured();
  render();
})();
