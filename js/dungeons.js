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

async function loadDungeons() {
  const tbody = document.getElementById('dungeon-body');
  if(tbody) tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text2)">Đang tải dữ liệu...</td></tr>';
  
  // Lấy cả 2 bảng: members và dungeons
  const [members, dungeons] = await Promise.all([
    DB.getMembers(),
    DB.getDungeons()
  ]);

  // Thành viên tạo trước xếp trên cùng (getMembers trả về mới nhất trước, nên đảo ngược lại)
  const sortedMembers = [...members].reverse();

  // Xây dựng dungeonsData dựa trên danh sách sortedMembers
  dungeonsData = sortedMembers.map(m => {
    // Tìm record dungeon tương ứng qua member_id hoặc tên (nếu record cũ)
    let d = dungeons.find(x => String(x.member_id) === String(m.id));
    if (!d) d = dungeons.find(x => x.ingame === (m.igame || m.name));

    if (d) {
      // Cập nhật tên/phái mới nhất từ mảng members
      return { ...d, ingame: m.igame || m.name, phai: m.faction, member_id: String(m.id), isVip: m.isVip };
    } else {
      // Nếu chưa có trong bảng dungeons, tạo dữ liệu tạm
      return { 
        id: 'temp_' + m.id, 
        member_id: String(m.id),
        ingame: m.igame || m.name, 
        phai: m.faction,
        isVip: m.isVip,
        ngoai_cac: false, cam_cac: false, bi_canh: false, dong_dinh: false 
      };
    }
  });

  renderDungeons();
}

function renderDungeons() {
  const tbody = document.getElementById('dungeon-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  if (dungeonsData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--t2)">⚡ Chưa có thành viên nào. Hãy thêm thành viên tại trang <a href="members.html" style="color:var(--c)">Thành Viên</a>.</td></tr>`;
    return;
  }

  dungeonsData.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="color:var(--c);font-weight:800;letter-spacing:.5px" class="${d.isVip ? 'vip-name' : ''}" data-faction="${d.phai}">${d.ingame}</strong></td>
      <td>
        <span class="faction-tag ${getFactionClass(d.phai)}">
          ${d.phai}
        </span>
      </td>
      <td><button class="status-btn ${d.ngoai_cac ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'ngoai_cac')">${d.ngoai_cac ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.cam_cac ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'cam_cac')">${d.cam_cac ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.bi_canh ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'bi_canh')">${d.bi_canh ? 'Xong' : 'Chưa'}</button></td>
      <td><button class="status-btn ${d.dong_dinh ? 'done' : ''}" onclick="toggleStatus('${d.id}', 'dong_dinh')">${d.dong_dinh ? 'Xong' : 'Chưa'}</button></td>
      <td>
        <span style="font-size:0.8rem;color:var(--t2);font-style:italic;">Khóa</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function toggleStatus(id, field) {
  let row = dungeonsData.find(d => String(d.id) === String(id));
  if (row) {
    row[field] = !row[field];
    renderDungeons(); // render nhanh trước cho mượt
    
    // Nếu là dòng ảo (chưa lưu vào DB bao giờ), thì tạo mới DB
    const rowToSave = { ...row };
    if (String(rowToSave.id).startsWith('temp_')) {
      delete rowToSave.id; 
    }
    
    // Xóa các trường chỉ dùng để hiển thị UI trước khi lưu vào DB
    delete rowToSave.isVip;

    const saved = await DB.saveDungeon(rowToSave);
    if (saved && saved.id) {
      row.id = saved.id; // Cập nhật id thật sau khi lưu thành công
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
  loadDungeons();
});
