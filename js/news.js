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
async function openModal(item) {
  const modal = document.getElementById('post-modal');
  const box   = document.getElementById('modal-content');
  if (!modal || !box) return;

  const id    = String(item.id);
  const liked = DB.hasLikedNews(id);

  // Hiện modal ngay với ⋯ loading cho like/comment
  box.innerHTML = `
    ${item.image ? `<img class="modal-img" src="${item.image}" alt="${item.title}"/>` : ''}
    <div class="modal-tag">${item.tag}</div>
    <div class="modal-title">${item.title}</div>
    <div class="modal-meta">✦ ${item.author} &nbsp;·&nbsp; ${item.date}</div>
    <div class="modal-body">${item.content}</div>
    <div class="modal-actions">
      <button class="modal-like-btn ${liked ? 'liked' : ''}" id="like-btn-${id}" onclick="handleLike('${id}', event)">
        <span class="like-icon">❤️</span>
        <span class="like-count" id="like-count-${id}">⋯</span>
        <span class="like-label">${liked ? 'Đã thích' : 'Thích'}</span>
      </button>
      <button class="modal-comment-btn" onclick="toggleCommentBox('${id}')">
        💬 <span id="comment-count-${id}">⋯</span> Bình Luận
      </button>
    </div>
    <div class="modal-comment-section" id="comment-section-${id}">
      <div class="comment-input-wrap">
        <input type="text" id="comment-author-${id}" placeholder="Tên của bạn (tùy chọn)..." maxlength="30" />
        <textarea id="comment-text-${id}" placeholder="Viết bình luận..." rows="2" maxlength="500"></textarea>
        <button class="comment-submit-btn" onclick="submitComment('${id}')">→ Gửi</button>
      </div>
      <div class="comments-list" id="comments-list-${id}">
        <p class="no-comments" style="opacity:0.5">⏳ Đang tải bình luận...</p>
      </div>
    </div>
  `;
  modal.classList.add('open');

  // Load song song từ Supabase
  const [likeCount, comments] = await Promise.all([
    DB.getNewsLikes(id),
    DB.getComments(id)
  ]);

  const likeEl = document.getElementById(`like-count-${id}`);
  if (likeEl) likeEl.textContent = likeCount;

  const commentCountEl = document.getElementById(`comment-count-${id}`);
  if (commentCountEl) commentCountEl.textContent = comments.length;

  const list = document.getElementById(`comments-list-${id}`);
  if (list) {
    list.innerHTML = comments.length === 0
      ? '<p class="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên!</p>'
      : comments.map(c => `
          <div class="comment-item">
            <div class="comment-author">✦ ${escapeHtml(c.author)} <span class="comment-date">${c.date}</span></div>
            <div class="comment-text">${escapeHtml(c.text)}</div>
          </div>
        `).join('');
  }
}

function closeModal(e) {
  if (e.target === document.getElementById('post-modal'))
    document.getElementById('post-modal').classList.remove('open');
}

async function handleLike(id, e) {
  e.stopPropagation();
  const btn     = document.getElementById(`like-btn-${id}`);
  const countEl = document.getElementById(`like-count-${id}`);
  if (btn) btn.disabled = true; // chống double-click

  const ok = await DB.likeNews(id);
  if (btn) btn.disabled = false;

  if (!ok) { showToast('♥ Bạn đã thích bài viết này rồi!'); return; }

  if (btn) { btn.classList.add('liked'); btn.querySelector('.like-label').textContent = 'Đã thích'; }
  const newCount = await DB.getNewsLikes(id);
  if (countEl) countEl.textContent = newCount;
  showToast('❤️ Đã thích bài viết!');
}

function toggleCommentBox(id) {
  const section = document.getElementById(`comment-section-${id}`);
  if (section) section.classList.toggle('visible');
}

async function submitComment(id) {
  const authorEl  = document.getElementById(`comment-author-${id}`);
  const textEl    = document.getElementById(`comment-text-${id}`);
  const submitBtn = textEl ? textEl.closest('.comment-input-wrap')?.querySelector('.comment-submit-btn') : null;
  const text      = textEl ? textEl.value.trim() : '';
  if (!text) { showToast('⚠ Vui lòng nhập nội dung bình luận!'); return; }

  // Disable nút để tránh gửi 2 lần
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Đang gửi...'; }

  const author = authorEl ? (authorEl.value.trim() || 'Vô Danh') : 'Vô Danh';
  const entry  = await DB.addComment(id, { author, text });

  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '→ Gửi'; }

  const list = document.getElementById(`comments-list-${id}`);
  if (list) {
    const noMsg = list.querySelector('.no-comments');
    if (noMsg) noMsg.remove();
    const div = document.createElement('div');
    div.className = 'comment-item new-comment';
    div.innerHTML = `
      <div class="comment-author">❆ ${escapeHtml(entry.author)} <span class="comment-date">${entry.date}</span></div>
      <div class="comment-text">${escapeHtml(entry.text)}</div>
    `;
    list.prepend(div);
  }
  // Cập nhật count thực tế từ DB
  const comments = await DB.getComments(id);
  const countEl  = document.getElementById(`comment-count-${id}`);
  if (countEl) countEl.textContent = comments.length;
  if (textEl) textEl.value = '';
  showToast('💬 Đã gửi bình luận!');
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  // Chỉ init news-page logic khi đang ở trang news.html
  const isNewsPage = !!document.getElementById('all-posts-grid');

  if (isNewsPage) {
    initParticles();
    initNavbar();
    renderAllPosts();
    renderAllVideos();

    // Real-time updates if Firebase is ready
    setTimeout(() => {
      if (typeof db !== 'undefined' && db) {
        DB.onNewsChange(items => renderAllPosts(items));
        DB.onVideosChange(items => renderAllVideos(items));
      }
    }, 1000);
  }
});

