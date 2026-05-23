(() => {
  // ── Embed sources ──────────────────────────────────
  const SOURCES = [
    { name: 'AutoEmbed', url: (id, ep) => `https://autoembed.cc/anime/anilist/${id}-${ep}` },
    { name: 'VidBinge',  url: (id, ep) => `https://vidbinge.dev/embed/anime/${id}/${ep}` },
    { name: 'VidLink',   url: (id, ep) => `https://vidlink.pro/anime/${id}/${ep}` },
    { name: 'VidSrc',    url: (id, ep) => `https://vidsrc.dev/embed/anime?anilist=${id}&episode=${ep}` },
  ];

  const FEATURED_IDS = [1, 38, 30, 140, 220, 270, 97, 106, 300, 577];

  // ── State ──────────────────────────────────────────
  let activeCat  = 'all';
  let activeLang = 'all';
  let searchQ    = '';
  let sortBy     = 'name';
  let favOnly    = false;
  let activeId   = null;   // active site item in sidebar
  let srcIdx     = 0;
  let curEp      = 1;
  let totalEps   = 0;
  let curAnimeId = null;
  let curAnimeData = null;
  let favs = new Set(JSON.parse(localStorage.getItem('ah_favs') || '[]'));

  // ── DOM refs ───────────────────────────────────────
  const sidebar      = document.getElementById('sidebar');
  const siteList     = document.getElementById('siteList');
  const listCount    = document.getElementById('listCount');
  const countBadge   = document.getElementById('countBadge');
  const searchInput  = document.getElementById('searchInput');
  const favCount     = document.getElementById('favCount');
  const wcFeatured   = document.getElementById('wcFeatured');
  const resizeHandle = document.getElementById('resizeHandle');

  const viewWelcome = document.getElementById('viewWelcome');
  const viewResults = document.getElementById('viewResults');
  const viewPlayer  = document.getElementById('viewPlayer');
  const viewSite    = document.getElementById('viewSite');

  const animeSearch    = document.getElementById('animeSearch');
  const animeSearchBtn = document.getElementById('animeSearchBtn');

  const vrBack  = document.getElementById('vrBack');
  const vrQuery = document.getElementById('vrQuery');
  const vrCount = document.getElementById('vrCount');
  const vrGrid  = document.getElementById('vrGrid');

  const srcBtnRow  = document.getElementById('srcBtnRow');
  const playerFrame = document.getElementById('playerFrame');
  const playerTitle = document.getElementById('playerTitle');
  const prevEpBtn  = document.getElementById('prevEpBtn');
  const nextEpBtn  = document.getElementById('nextEpBtn');
  const retryBtn   = document.getElementById('retryBtn');
  const fsBtn      = document.getElementById('fsBtn');
  const epList     = document.getElementById('epList');
  const epTotal    = document.getElementById('epTotal');
  const backToSearch = document.getElementById('backToSearch');

  const siteLpBack = document.getElementById('siteLpBack');
  const lpIcon     = document.getElementById('lpIcon');
  const lpName     = document.getElementById('lpName');
  const lpCat      = document.getElementById('lpCat');
  const lpDesc     = document.getElementById('lpDesc');
  const lpOpen     = document.getElementById('lpOpen');

  // ── View management ────────────────────────────────
  function showView(panel) {
    [viewWelcome, viewResults, viewPlayer, viewSite].forEach(v => {
      v.classList.toggle('hidden', v !== panel);
    });
  }

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
    if (favOnly)             list = list.filter(s => favs.has(s.id));
    if (activeCat !== 'all') list = list.filter(s => s.cat === activeCat);
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
      const faved  = favs.has(site.id);
      const ico    = favicon(site.url);
      const active = site.id === activeId ? ' active' : '';
      return `
<div class="site-item${active}" data-id="${site.id}" tabindex="0" role="button" aria-label="${site.name}">
  <img class="si-ico" src="${ico}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
  <span class="si-name">${site.name}</span>
  <span class="si-dot ${dotClass(site.cat)}"></span>
  <button class="si-fav${faved ? ' on' : ''}" data-fav="${site.id}" aria-label="Favourite">★</button>
</div>`;
    }).join('');
  }

  // ── AniList search ─────────────────────────────────
  async function searchAniList(query) {
    const resp = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($q:String){Page(perPage:40){media(search:$q,type:ANIME,sort:POPULARITY_DESC){
          id title{romaji english} coverImage{large} episodes
          nextAiringEpisode{episode} status format
        }}}`,
        variables: { q: query }
      })
    });
    const json = await resp.json();
    return json.data?.Page?.media || [];
  }

  async function fetchAnimeDetail(id) {
    const resp = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($id:Int){Media(id:$id,type:ANIME){
          id title{romaji english} coverImage{large} episodes
          nextAiringEpisode{episode} status format
        }}`,
        variables: { id }
      })
    });
    const json = await resp.json();
    return json.data?.Media || null;
  }

  // ── Render search results ──────────────────────────
  function renderResults(results, query) {
    vrQuery.textContent = `"${query}"`;
    vrCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
    vrGrid.innerHTML = results.map(a => {
      const title = a.title.english || a.title.romaji;
      const eps   = a.episodes || (a.nextAiringEpisode ? a.nextAiringEpisode.episode - 1 : '?');
      return `
<div class="vr-card" data-anime-id="${a.id}" title="${title}">
  <img class="vr-card-img" src="${a.coverImage.large}" alt="" loading="lazy">
  <div class="vr-card-info">
    <div class="vr-card-title">${title}</div>
    <div class="vr-card-sub">${a.format || 'ANIME'} · ${eps} eps</div>
  </div>
</div>`;
    }).join('');
    showView(viewResults);
  }

  // ── Player ─────────────────────────────────────────
  function buildSrcBtns() {
    srcBtnRow.innerHTML = '';
    SOURCES.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'src-btn' + (i === srcIdx ? ' active' : '');
      b.textContent = s.name;
      b.addEventListener('click', () => { srcIdx = i; loadFrame(); });
      srcBtnRow.appendChild(b);
    });
  }

  function loadFrame() {
    srcBtnRow.querySelectorAll('.src-btn').forEach((b, i) =>
      b.classList.toggle('active', i === srcIdx)
    );
    playerFrame.src = SOURCES[srcIdx].url(curAnimeId, curEp);
  }

  function buildEpList() {
    epTotal.textContent = totalEps ? `${totalEps} eps` : '';
    epList.innerHTML = '';
    const count = totalEps || 1;
    for (let i = 1; i <= count; i++) {
      const div = document.createElement('div');
      div.className = 'ep-row' + (i === curEp ? ' active' : '');
      div.dataset.ep = i;
      div.textContent = `Episode ${i}`;
      div.addEventListener('click', () => goEp(i));
      epList.appendChild(div);
    }
  }

  function highlightEp() {
    epList.querySelectorAll('.ep-row').forEach(r =>
      r.classList.toggle('active', parseInt(r.dataset.ep) === curEp)
    );
    const active = epList.querySelector('.ep-row.active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function updateNav() {
    prevEpBtn.disabled = curEp <= 1;
    nextEpBtn.disabled = totalEps > 0 && curEp >= totalEps;
  }

  function updateTitle() {
    if (!curAnimeData) return;
    const t = curAnimeData.title.english || curAnimeData.title.romaji;
    playerTitle.textContent = `${t} · Episode ${curEp}`;
  }

  function goEp(ep) {
    if (ep < 1 || (totalEps > 0 && ep > totalEps)) return;
    curEp = ep;
    updateNav();
    updateTitle();
    highlightEp();
    loadFrame();
  }

  async function openAnime(animeId) {
    curAnimeId   = animeId;
    curEp        = 1;
    srcIdx       = 0;
    curAnimeData = null;
    totalEps     = 0;

    buildSrcBtns();
    updateNav();
    playerTitle.textContent = 'Loading…';
    buildEpList();
    showView(viewPlayer);
    loadFrame();

    const data = await fetchAnimeDetail(animeId);
    if (!data) return;
    curAnimeData = data;
    totalEps = data.episodes || (data.nextAiringEpisode ? data.nextAiringEpisode.episode - 1 : 0);
    if (totalEps && curEp > totalEps) curEp = totalEps;
    updateNav();
    updateTitle();
    buildEpList();
    highlightEp();
  }

  // ── Site launch pad ────────────────────────────────
  function openSiteLaunchPad(site) {
    activeId = site.id;
    lpIcon.src         = favicon(site.url);
    lpName.textContent = site.name;
    lpCat.textContent  = site.cat.toUpperCase();
    lpDesc.textContent = site.desc;
    lpOpen.href        = site.url;
    showView(viewSite);
    render();
  }

  // ── Welcome featured ───────────────────────────────
  function buildFeatured() {
    const sites = FEATURED_IDS.map(id => SITES.find(s => s.id === id)).filter(Boolean);
    wcFeatured.innerHTML = sites.map(s => `
<div class="wc-card" data-id="${s.id}">
  <img src="${favicon(s.url)}" alt="" width="16" height="16" loading="lazy" onerror="this.style.visibility='hidden'">
  ${s.name}
</div>`).join('');
  }

  // ── Anime search flow ──────────────────────────────
  async function doAnimeSearch() {
    const q = animeSearch.value.trim();
    if (!q) return;
    vrGrid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);grid-column:1/-1">Searching…</div>';
    showView(viewResults);
    vrQuery.textContent = `"${q}"`;
    vrCount.textContent = '';
    const results = await searchAniList(q);
    renderResults(results, q);
  }

  // ── Fav toggle ─────────────────────────────────────
  function toggleFav(id) {
    if (favs.has(id)) favs.delete(id);
    else favs.add(id);
    localStorage.setItem('ah_favs', JSON.stringify([...favs]));
    render();
  }

  // ── Events: anime search ───────────────────────────
  animeSearchBtn.addEventListener('click', doAnimeSearch);
  animeSearch.addEventListener('keydown', e => { if (e.key === 'Enter') doAnimeSearch(); });

  // ── Events: search results ─────────────────────────
  vrBack.addEventListener('click', () => showView(viewWelcome));

  vrGrid.addEventListener('click', e => {
    const card = e.target.closest('[data-anime-id]');
    if (card) openAnime(parseInt(card.dataset.animeId));
  });

  // ── Events: player controls ────────────────────────
  backToSearch.addEventListener('click', () => showView(viewResults));
  prevEpBtn.addEventListener('click', () => goEp(curEp - 1));
  nextEpBtn.addEventListener('click', () => goEp(curEp + 1));
  retryBtn.addEventListener('click', () => loadFrame());
  fsBtn.addEventListener('click', () => {
    const box = document.getElementById('playerBox');
    (box.requestFullscreen || box.webkitRequestFullscreen || box.mozRequestFullScreen).call(box);
  });

  // ── Events: site launch pad ────────────────────────
  siteLpBack.addEventListener('click', () => {
    activeId = null;
    showView(viewWelcome);
    render();
  });

  // ── Events: welcome featured cards ────────────────
  wcFeatured.addEventListener('click', e => {
    const card = e.target.closest('[data-id]');
    if (card) {
      const site = SITES.find(s => s.id === parseInt(card.dataset.id));
      if (site) {
        openSiteLaunchPad(site);
        const el = siteList.querySelector(`[data-id="${site.id}"]`);
        if (el) el.scrollIntoView({ block: 'center' });
      }
    }
  });

  // ── Events: site list ──────────────────────────────
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
      if (site) openSiteLaunchPad(site);
    }
  });

  siteList.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const item = e.target.closest('.site-item');
      if (item) {
        const site = SITES.find(s => s.id === parseInt(item.dataset.id));
        if (site) openSiteLaunchPad(site);
      }
    }
  });

  // ── Events: sidebar filters ────────────────────────
  searchInput.addEventListener('input', () => {
    searchQ = searchInput.value.trim();
    render();
  });

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

  document.querySelectorAll('.lbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLang = btn.dataset.lang;
      render();
    });
  });

  document.getElementById('sortSel').addEventListener('change', e => {
    sortBy = e.target.value;
    render();
  });

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

  document.getElementById('sbToggle').addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (viewPlayer.classList.contains('hidden') === false) showView(viewResults);
      else if (viewResults.classList.contains('hidden') === false) showView(viewWelcome);
      else if (viewSite.classList.contains('hidden') === false) { activeId = null; showView(viewWelcome); render(); }
    }
  });

  // ── Resize handle drag ─────────────────────────────
  let isResizing = false;

  resizeHandle.addEventListener('mousedown', () => {
    isResizing = true;
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    playerFrame.style.pointerEvents = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    sidebar.classList.remove('collapsed');
    const newW = Math.max(160, Math.min(520, e.clientX));
    sidebar.style.width = newW + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizeHandle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    playerFrame.style.pointerEvents = '';
  });

  // ── Init ───────────────────────────────────────────
  buildFeatured();
  render();
})();
