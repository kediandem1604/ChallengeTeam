/* ═══════════════════════════
   MAIN.JS — Homepage logic
═══════════════════════════ */

// ─── PARTICLES ───
function initParticles() {
  const bg = document.getElementById('particles-bg');
  if (!bg) return;
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1;
    p.style.cssText = `
      left:${Math.random()*100}%;
      width:${size}px; height:${size}px;
      --dur:${6 + Math.random()*10}s;
      --delay:${Math.random()*10}s;
    `;
    bg.appendChild(p);
  }
}

// ─── FALLING PETALS ───
function initPetals() {
  const wrap = document.getElementById('petals');
  if (!wrap) return;
  const symbols = ['✦','✧','❋','✿','❀'];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    p.textContent = symbols[Math.floor(Math.random()*symbols.length)];
    p.style.cssText = `
      left:${Math.random()*100}%;
      --pd:${7 + Math.random()*8}s;
      --pdelay:${Math.random()*8}s;
      font-size:${0.7 + Math.random()*0.8}rem;
    `;
    wrap.appendChild(p);
  }
}

// ─── NAVBAR SCROLL ───
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 60
      ? 'rgba(10,6,4,0.99)'
      : 'linear-gradient(180deg,rgba(10,6,4,0.98) 0%,rgba(10,6,4,0.85) 100%)';
  });
}



// ─── ADMIN PANEL ───
async function toggleAdmin() {
  const panel = document.getElementById('admin-panel');
  if (!panel) return;
  panel.classList.toggle('open');
}

// ─── TOAST ───
function showToast(msg, duration = 3000) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ─── RENDER NEWS (homepage preview) ───
async function renderHomeNews(customItems = null) {
  const grid = document.getElementById('news-grid');
  const placeholder = document.getElementById('news-placeholder');
  if (!grid) return;

  const allItems = customItems || await DB.getNews();
  const items = allItems.slice(0, 3);
  
  if (items.length === 0) {
    if (placeholder) placeholder.style.display = 'block';
    // Xóa các card cũ nếu có
    Array.from(grid.children).forEach(child => {
      if (child.id !== 'news-placeholder') child.remove();
    });
    return;
  }
  if (placeholder) placeholder.style.display = 'none';

  // Chỉ giữ lại placeholder (sẽ bị ẩn), xóa các card cũ
  Array.from(grid.children).forEach(child => {
    if (child.id !== 'news-placeholder') child.remove();
  });

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      ${item.image
        ? `<img class="news-card-img" src="${item.image}" alt="${item.title}" loading="lazy"/>`
        : `<div class="news-card-img-placeholder">📜</div>`}
      <div class="news-card-body">
        <span class="news-card-tag">${item.tag || 'TIN TỨC'}</span>
        <div class="news-card-title">${item.title}</div>
        <div class="news-card-excerpt">${item.content}</div>
      </div>
      <div class="news-card-footer">
        <span>✦ ${item.author || 'Vô Danh'}</span>
        <span>${item.date}</span>
      </div>
    `;
    card.onclick = () => openModal(item);
    grid.appendChild(card);
  });
}

// ─── RENDER VIDEOS (homepage preview) ───
async function renderHomeVideos(customItems = null) {
  const grid = document.getElementById('video-grid');
  const placeholder = document.getElementById('video-placeholder');
  if (!grid) return;

  const allItems = customItems || await DB.getVideos();
  const items = allItems.slice(0, 3);
  
  if (items.length === 0) {
    if (placeholder) placeholder.style.display = 'block';
    Array.from(grid.children).forEach(child => {
      if (child.id !== 'video-placeholder') child.remove();
    });
    return;
  }
  if (placeholder) placeholder.style.display = 'none';

  Array.from(grid.children).forEach(child => {
    if (child.id !== 'video-placeholder') child.remove();
  });

  items.forEach(item => {
    const wrap = document.createElement('div');
    wrap.className = 'video-wrapper';
    let embedHtml = '';
    if (item.type === 'youtube') {
      const id = extractYouTubeId(item.url);
      embedHtml = id
        ? `<iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen loading="lazy"></iframe>`
        : `<div class="news-card-img-placeholder">🎬</div>`;
    } else if (item.type === 'upload') {
      embedHtml = `<video controls src="${item.url}"></video>`;
    } else {
      embedHtml = `<div class="news-card-img-placeholder">🎬</div>`;
    }
    wrap.innerHTML = `${embedHtml}<div class="video-caption">${item.title}</div>`;
    grid.appendChild(wrap);
  });
}

// ─── RENDER MEMBERS PREVIEW ───
async function renderHomeMembers(customItems = null) {
  const box = document.getElementById('members-preview');
  if (!box) return;
  
  const allItems = customItems || await DB.getMembers();
  // Sort by likes, take top 4
  const items = allItems.sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 4);
  
  if (items.length === 0) {
    box.innerHTML = `
      <div class="news-empty">
        <div class="empty-icon">👥</div>
        <p>Chưa có hồ sơ nào. <a href="pages/members.html">Thêm thành viên đầu tiên!</a></p>
      </div>`;
    return;
  }
  
  box.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = `member-card ${item.isVip ? 'vip-card' : ''}`;
    el.innerHTML = `
      <div class="member-avatar">
        ${item.avatar ? `<img src="${item.avatar}" alt="${item.name}">` : `<div class="avatar-placeholder">👥</div>`}
      </div>
      <div class="member-info">
        <div class="member-name ${item.isVip ? 'vip-name' : ''}" data-faction="${item.faction}">${item.name}</div>
        <div class="member-igame">🎮 ${item.igame || 'Chưa cập nhật'}</div>
        <div class="member-faction">⚔ Phái: ${item.faction}</div>
      </div>
      <div class="member-stats">
        <span>❤️ ${item.likes || 0}</span>
        <span>⭐ ${(item.rating_count > 0 ? (item.rating_sum / item.rating_count).toFixed(1) : 0)}/5</span>
      </div>
    `;
    // onclick go to members page
    el.onclick = () => window.location.href = `pages/members.html`;
    box.appendChild(el);
  });
}

// ─── YOUTUBE ID EXTRACT ───
function extractYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return m ? m[1] : null;
}

// ─── INTERSECTION OBSERVER (fade in) ───
function initObserver() {
  const style = document.createElement('style');
  style.textContent = `
    .fade-in { opacity:0; transform:translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
    .fade-in.visible { opacity:1; transform:none; }
  `;
  document.head.appendChild(style);

  const targets = document.querySelectorAll('.section, .excel-banner');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
  }, { threshold: 0.1 });
  targets.forEach(el => { el.classList.add('fade-in'); obs.observe(el); });
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initPetals();
  initNavbar();
  initObserver();
  
  // Render initial load
  renderHomeNews();
  renderHomeVideos();
  renderHomeMembers();
  
  // Set up real-time listeners if Supabase is available
  setTimeout(() => {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      DB.onNewsChange(items => renderHomeNews(items));
      DB.onVideosChange(items => renderHomeVideos(items));
      DB.onMembersChange(items => renderHomeMembers(items));
    }
  }, 1000); // Wait for Supabase to initialize
});
