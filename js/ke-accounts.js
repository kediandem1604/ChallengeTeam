let keAccounts = [];
const SECRET_PWD = "123"; // Mật khẩu mặc định

function checkAuth() {
  const pwd = document.getElementById('auth-pwd').value;
  if (pwd === SECRET_PWD) {
    document.getElementById('auth-panel').style.display = 'none';
    document.getElementById('content-panel').style.display = 'block';
    document.getElementById('auth-error').style.display = 'none';
    loadAccounts();
  } else {
    document.getElementById('auth-error').style.display = 'block';
  }
}

function logoutAuth() {
  document.getElementById('auth-pwd').value = '';
  keAccounts = [];
  const tbody = document.getElementById('account-body');
  if(tbody) tbody.innerHTML = '';
  window.location.href = 'dungeons.html';
}

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

async function loadAccounts() {
  const tbody = document.getElementById('account-body');
  if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text2)">Đang tải dữ liệu...</td></tr>';
  keAccounts = await DB.getKeAccounts();
  renderAccounts();
}

function renderAccounts() {
  const tbody = document.getElementById('account-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  if (keAccounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text2)">Chưa có dữ liệu account. Hãy thêm ở phía dưới.</td></tr>';
    return;
  }

  keAccounts.forEach(acc => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text2); font-size:0.8rem;">${acc.username}</td>
      <td style="color: var(--text2); font-family: monospace; font-size: 0.8rem;">${acc.password}</td>
      <td><strong style="color:var(--gold); font-family:'Playfair Display',serif; font-size:1.1rem; letter-spacing:1px;">${acc.ingame || '---'}</strong></td>
      <td>
        <span class="faction-tag ${getFactionClass(acc.phai)}">
          ${acc.phai}
        </span>
      </td>
      <td><button class="status-btn ${acc.ngoai_cac ? 'done' : ''}" onclick="toggleStatus('${acc.id}', 'ngoai_cac')">${acc.ngoai_cac ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${acc.cam_cac ? 'done' : ''}" onclick="toggleStatus('${acc.id}', 'cam_cac')">${acc.cam_cac ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${acc.bi_canh ? 'done' : ''}" onclick="toggleStatus('${acc.id}', 'bi_canh')">${acc.bi_canh ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${acc.dong_dinh ? 'done' : ''}" onclick="toggleStatus('${acc.id}', 'dong_dinh')">${acc.dong_dinh ? 'Xong' : 'Chưa'}</button></td>
      <td>
        <button class="action-btn" onclick="deleteAccountRow('${acc.id}')" title="Xóa Account">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function toggleStatus(id, field) {
  const row = keAccounts.find(a => String(a.id) === String(id));
  if (row) {
    row[field] = !row[field];
    renderAccounts();
    await DB.saveKeAccount(row);
  }
}

async function addAccountRow() {
  const username = document.getElementById('new-acc').value.trim();
  const password = document.getElementById('new-pwd').value.trim();
  const ingame   = document.getElementById('new-ingame').value.trim();
  const phai     = document.getElementById('new-phai').value;
  
  if (!username) return alert('Vui lòng nhập Tên Tài khoản');

  const newRow = { 
    username, password, ingame, phai,
    ngoai_cac: false, cam_cac: false, bi_canh: false, dong_dinh: false
  };

  await DB.saveKeAccount(newRow);
  
  // Clear inputs
  document.getElementById('new-acc').value = '';
  document.getElementById('new-pwd').value = '';
  document.getElementById('new-ingame').value = '';
  
  loadAccounts();
}

async function deleteAccountRow(id) {
  if (confirm('Bạn có chắc muốn xóa account này khỏi danh sách?')) {
    await DB.deleteKeAccount(id);
    loadAccounts();
  }
}

async function resetKeAccountsWeekly() {
  const pwd = prompt('Nhập mật khẩu để Reset tiến độ tuần cho danh sách Acc:');
  if (pwd !== '1') {
    alert('Mật khẩu không chính xác!');
    return;
  }
  
  if (confirm('Bạn có chắc muốn reset toàn bộ tiến độ các Acc về "Chưa"?')) {
    await DB.resetKeAccounts();
    loadAccounts();
    alert('Đã reset tiến độ tuần!');
  }
}

// ─── UI SHARED ───
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

function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 60 ? 'rgba(2,2,9,0.99)' : '';
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavbar();
});
