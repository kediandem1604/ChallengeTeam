/* ═══════════════════
   NEWS PAGE JS
═══════════════════ */

let currentImgBase64 = '';
let currentVidBase64 = '';

// ─── PARTICLES ───
function initParticles() {
  const bg = document.getElementById('particles-bg');
  if (!bg) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `left:${Math.random()*100}%;width:${size}px;height:${size}px;--dur:${7+Math.random()*8}s;--delay:${Math.random()*10}s;`;
    bg.appendChild(p);
  }
}




// ─── TABS ───
function switchTab(tab) {
  document.getElementById('panel-post').style.display  = tab === 'post'  ? 'block' : 'none';
  document.getElementById('panel-video').style.display = tab === 'video' ? 'block' : 'none';
  document.getElementById('tab-post').classList.toggle('active',  tab === 'post');
  document.getElementById('tab-video').classList.toggle('active', tab === 'video');
}

function toggleVidSource() {
  const t = document.getElementById('vid-type').value;
  document.getElementById('vid-url-wrap').style.display  = t === 'youtube' ? 'block' : 'none';
  document.getElementById('vid-file-wrap').style.display = t === 'upload'  ? 'block' : 'none';
}

// ─── IMAGE FILE HANDLER ───
function handleImgFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    currentImgBase64 = e.target.result;
    const preview = document.getElementById('post-img-preview');
    preview.innerHTML = `<img src="${currentImgBase64}" alt="preview"/>`;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ─── VIDEO FILE HANDLER ───
function handleVideoFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { currentVidBase64 = e.target.result; };
  reader.readAsDataURL(file);
}

// ─── SUBMIT POST ───
async function submitPost() {
  const title   = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  if (!title || !content) { showToast('⚠ Vui lòng điền tiêu đề và nội dung!'); return; }

  const imgUrl = document.getElementById('post-img-url').value.trim();
  const image  = currentImgBase64 || imgUrl || '';

  await DB.addNews({
    title,
    content,
    tag:    document.getElementById('post-tag').value,
    author: document.getElementById('post-author').value.trim() || 'Vô Danh',
    image
  });

  // reset
  document.getElementById('post-title').value   = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-author').value  = '';
  document.getElementById('post-img-url').value = '';
  document.getElementById('post-img-preview').style.display = 'none';
  currentImgBase64 = '';

  showToast('✔ Đã đăng bài viết!');
  // If not using Firebase realtime, render manually
  if (typeof db === 'undefined' || !db) renderAllPosts();
}

// ─── SUBMIT VIDEO ───
async function submitVideo() {
  const title = document.getElementById('vid-title').value.trim();
  const type  = document.getElementById('vid-type').value;
  if (!title) { showToast('⚠ Vui lòng nhập tiêu đề video!'); return; }

  let url = '';
  if (type === 'youtube') {
    url = document.getElementById('vid-url').value.trim();
    if (!url) { showToast('⚠ Vui lòng nhập link YouTube!'); return; }
  } else {
    url = currentVidBase64;
    if (!url) { showToast('⚠ Vui lòng chọn file video!'); return; }
  }

  await DB.addVideo({ title, type, url });
  document.getElementById('vid-title').value = '';
  document.getElementById('vid-url').value   = '';
  currentVidBase64 = '';

  showToast('✔ Đã thêm video!');
  if (typeof db === 'undefined' || !db) renderAllVideos();
}

// ─── RENDER POSTS ───
async function renderAllPosts(customItems = null) {
  const grid  = document.getElementById('all-posts-grid');
  const empty = document.getElementById('posts-empty');
  if (!grid) return;
  grid.innerHTML = '';

  const items = customItems || await DB.getNews();
  if (items.length === 0) {
    grid.innerHTML = `<div class="news-empty" id="posts-empty"><div class="empty-icon">📜</div><p>Chưa có bài viết nào.</p></div>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.id = `post-${item.id}`;
    card.innerHTML = `
      ${item.image
        ? `<img class="news-card-img" src="${item.image}" alt="${item.title}" loading="lazy"/>`
        : `<div class="news-card-img-placeholder">📜</div>`}
      <div class="news-card-body">
        <span class="news-card-tag">${item.tag}</span>
        <div class="news-card-title">${item.title}</div>
        <div class="news-card-excerpt">${item.content}</div>
      </div>
      <div class="news-card-footer">
        <span>✦ ${item.author}</span><span>${item.date}</span>
      </div>
      <div class="news-card-actions">
        <button class="btn-delete" onclick="deletePost('${item.id}',event)">🗑 Xóa</button>
      </div>
    `;
    card.onclick = () => openModal(item);
    grid.appendChild(card);
  });

  // anchor scroll
  const hash = window.location.hash;
  if (hash && !customItems) { // only on first load
    const el = document.querySelector(hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 300);
  }
}

// ─── RENDER VIDEOS ───
async function renderAllVideos(customItems = null) {
  const grid = document.getElementById('all-videos-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const items = customItems || await DB.getVideos();
  if (items.length === 0) {
    grid.innerHTML = `<div class="news-empty" id="videos-empty"><div class="empty-icon">🎬</div><p>Chưa có video nào.</p></div>`;
    return;
  }

  items.forEach(item => {
    const wrap = document.createElement('div');
    wrap.className = 'video-wrapper';
    let embedHtml = '';
    if (item.type === 'youtube') {
      const id = extractYouTubeId(item.url);
      embedHtml = id
        ? `<iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen loading="lazy"></iframe>`
        : `<div class="news-card-img-placeholder">🎬</div>`;
    } else {
      embedHtml = `<video controls src="${item.url}"></video>`;
    }
    wrap.innerHTML = `
      ${embedHtml}
      <div class="video-caption" style="display:flex;justify-content:space-between;align-items:center;">
        <span>${item.title}</span>
        <button class="btn-delete" style="margin:0;" onclick="deleteVideo('${item.id}',event)">🗑</button>
      </div>
    `;
    grid.appendChild(wrap);
  });
}

// ─── DELETE ───
async function deletePost(id, e) {
  e.stopPropagation();
  if (!confirm('Xóa bài viết này?')) return;
  await DB.deleteNews(id);
  showToast('Đã xóa bài viết.');
  if (typeof db === 'undefined' || !db) renderAllPosts();
}
async function deleteVideo(id, e) {
  e.stopPropagation();
  if (!confirm('Xóa video này?')) return;
  await DB.deleteVideo(id);
  showToast('Đã xóa video.');
  if (typeof db === 'undefined' || !db) renderAllVideos();
}

// ─── MODAL ───
function openModal(item) {
  const box = document.getElementById('modal-content');
  box.innerHTML = `
    ${item.image ? `<img class="modal-img" src="${item.image}" alt="${item.title}"/>` : ''}
    <div class="modal-tag">${item.tag}</div>
    <div class="modal-title">${item.title}</div>
    <div class="modal-meta">✦ ${item.author} &nbsp;·&nbsp; ${item.date}</div>
    <div class="modal-body">${item.content}</div>
  `;
  document.getElementById('post-modal').classList.add('open');
}
function closeModal(e) {
  if (e.target === document.getElementById('post-modal'))
    document.getElementById('post-modal').classList.remove('open');
}

// ─── YOUTUBE ID ───
function extractYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return m ? m[1] : null;
}

// ─── TOAST ───
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── NAVBAR SCROLL ───
function initNavbar() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 60 ? 'rgba(10,6,4,0.99)' : '';
  });
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavbar();
  
  // Initial render
  renderAllPosts();
  renderAllVideos();
  
  // Real-time updates if Firebase is ready
  setTimeout(() => {
    if (typeof db !== 'undefined' && db) {
      DB.onNewsChange(items => renderAllPosts(items));
      DB.onVideosChange(items => renderAllVideos(items));
    }
  }, 1000);
});
