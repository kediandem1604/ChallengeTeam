let dungeonsData = [];

function getFactionClass(phai) {
  switch(phai) {
    case 'Thiết Y': return 'f-thiet-y';
    case 'Cửu Linh': return 'f-cuu-linh';
    case 'Thần Tương': return 'f-than-tuong';
    case 'Long Ngâm': return 'f-long-ngam';
    case 'Toái Mộng': return 'f-toai-mong';
    case 'Tố Vấn': return 'f-to-van';
    case 'Huyết Hà': return 'f-huyet-ha';
    default: return '';
  }
}

// Chờ Supabase init xong (tối đa 5 giây) trước khi load
async function waitForSupabase() {
  return new Promise(resolve => {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) { resolve(); return; }
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        clearInterval(iv); resolve();
      } else if (tries >= 50) { // 5 giây
        clearInterval(iv); resolve();
      }
    }, 100);
  });
}

// Helper hiển thị trạng thái loading
function setLoadingMsg(msg) {
  const tbody = document.getElementById('dungeon-body');
  if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="color:var(--t2);text-align:center;padding:1.5rem;">${msg}</td></tr>`;
}

async function loadDungeons() {
  setLoadingMsg('⏳ Đang kết nối Supabase...');

  // Chờ client khởi tạo
  await waitForSupabase();

  // ── Retry logic: Supabase Free Tier cold start có thể mất 2-10 giây ──
  const MAX_RETRIES = 4;
  const RETRY_DELAY = 2500; // ms
  let members = [], dungeons = [];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      [members, dungeons] = await Promise.all([
        DB.getMembers(),
        DB.getDungeons()
      ]);
    } catch (err) {
      console.warn(`loadDungeons attempt ${attempt} error:`, err);
    }

    if (members.length > 0) break; // Thành công, thoát vòng lặp

    if (attempt < MAX_RETRIES) {
      const waitSec = Math.round(RETRY_DELAY / 1000);
      setLoadingMsg(`⚡ Supabase đang khởi động... thử lại (${attempt}/${MAX_RETRIES - 1}) sau ${waitSec}s`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }

  if (members.length === 0) {
    setLoadingMsg('❌ Không thể tải dữ liệu từ Supabase. Vui lòng F5 để thử lại.');
    return;
  }

  const sortedMembers = [...members].reverse();

  dungeonsData = sortedMembers.map(m => {
    let d = dungeons.find(x => String(x.member_id) === String(m.id));
    if (!d) d = dungeons.find(x => x.ingame === (m.igame || m.name));

    if (d) {
      return { ...d, ingame: m.igame || m.name, phai: m.faction, member_id: String(m.id), isVip: m.isVip };
    } else {
      return { 
        id: 'temp_' + m.id, 
        member_id: String(m.id),
        ingame: m.igame || m.name, 
        phai: m.faction,
        isVip: m.isVip,
        boss1: false, boss2: false, boss3: false,
        boss4: false, boss5: false, boss6: false,
        bi_canh: false, dong_dinh: false 
      };
    }
  });

  renderDungeons();
  document.body.classList.add('data-loaded');
}

function renderDungeons() {
  const tbody = document.getElementById('dungeon-body');
  if(!tbody) return;

  if (dungeonsData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--t2)">⚡ Chưa có thành viên nào. Hãy thêm thành viên tại trang <a href="members.html" style="color:var(--c)">Thành Viên</a>.</td></tr>`;
    return;
  }

  // PERF: dùng DocumentFragment để batch insert một lần, không đụng DOM nhiều lần
  const frag = document.createDocumentFragment();

  dungeonsData.forEach(d => {
    const tr = document.createElement('tr');
    // PERF: set innerHTML một lần cho mỗi row (thay vì nhiều appendChild)
    tr.innerHTML = `
      <td><strong style="color:var(--c);font-weight:800;letter-spacing:.5px" class="${d.isVip ? 'vip-name' : ''}" data-faction="${d.phai}">${d.ingame}</strong></td>
      <td><span class="faction-tag ${getFactionClass(d.phai)}">${d.phai}</span></td>
      <td><button class="status-btn ${d.boss1 ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'boss1')">${d.boss1 ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.boss2 ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'boss2')">${d.boss2 ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.boss3 ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'boss3')">${d.boss3 ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.boss4 ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'boss4')">${d.boss4 ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.boss5 ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'boss5')">${d.boss5 ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.boss6 ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'boss6')">${d.boss6 ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.bi_canh ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'bi_canh')">${d.bi_canh ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.dong_dinh ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'dong_dinh')">${d.dong_dinh ? 'Xong' : 'Chưa'}</button></td>
      <td><span style="font-size:0.8rem;color:var(--t2);font-style:italic;">Khóa</span></td>
    `;
    frag.appendChild(tr);
  });

  // PERF: chỉ 1 lần đụng vào DOM thật
  tbody.innerHTML = '';
  tbody.appendChild(frag);
}

async function toggleStatus(id, field) {
  let row = dungeonsData.find(d => String(d.id) === String(id));
  if (row) {
    row[field] = !row[field];
    renderDungeons();
    
    const rowToSave = { ...row };
    if (String(rowToSave.id).startsWith('temp_')) {
      delete rowToSave.id; 
    }
    delete rowToSave.isVip;

    const saved = await DB.saveDungeon(rowToSave);
    if (saved && saved.id) {
      row.id = saved.id;
    }
  }
}

async function resetDungeonsWeekly() {
  const pwd = prompt('Nhập mật khẩu để Reset tiến độ tuần:');
  if (pwd !== '1') {
    alert('Mật khẩu không chính xác!');
    return;
  }
  
  if (confirm('CHÚ Ý: Hành động này sẽ đưa tất cả tiến độ phó bản về trạng thái "Chưa". Bạn có chắc chắn?')) {
    await DB.resetDungeons();
    loadDungeons();
    alert('Đã reset tiến độ tuần thành công!');
  }
}

// ─── UI SHARED ───
function initParticles() {
  const bg = document.getElementById('particles-bg');
  if (!bg) return;
  // PERF: giảm xuống 8 particle (thay vì 20) để giảm tải GPU
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `left:${Math.random()*100}%;width:${size}px;height:${size}px;--dur:${10+Math.random()*10}s;--delay:${Math.random()*10}s;`;
    bg.appendChild(p);
  }
}

function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  // PERF: dùng passive listener để scroll không block main thread
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 60 ? 'rgba(2,2,9,0.99)' : '';
  }, { passive: true });
}

window.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavbar();
  loadDungeons();
});

