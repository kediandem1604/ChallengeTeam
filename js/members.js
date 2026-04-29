/* ═══════════════════════════════════════════════
   MEMBERS LOGIC — Kiếm Khách Đoàn
═══════════════════════════════════════════════ */



// ─── XỬ LÝ UPLOAD ───
let currentAvatarBase64 = "";

function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    currentAvatarBase64 = e.target.result;
    console.log("✔ Đã nạp ảnh đại diện (Base64 ready)");
    const previewBox = document.getElementById('avatar-preview-box');
    const previewImg = document.getElementById('avatar-preview-img');
    if (previewBox && previewImg) {
      previewImg.src = currentAvatarBase64;
      previewBox.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

// ─── THÊM THÀNH VIÊN ───
async function submitMember() {
  const name = document.getElementById('mem-name').value.trim();
  const igame = document.getElementById('mem-igame').value.trim();
  const faction = document.getElementById('mem-faction').value;
  const avatar = currentAvatarBase64;

  const vipCode = document.getElementById('mem-vip') ? document.getElementById('mem-vip').value.trim() : '';
  const isVip = vipCode.toUpperCase() === 'VIP2026' || vipCode.toUpperCase() === 'SẬPGAME'; // Example secret codes

  if (!name || !faction) {
    showToast('⚠ Vui lòng nhập Tên và chọn Phái!');
    return;
  }

  const savedMember = await DB.addMember({ name, igame, faction, avatar, isVip });

  // Reset
  document.getElementById('mem-name').value = '';
  document.getElementById('mem-igame').value = '';
  if (document.getElementById('mem-vip')) document.getElementById('mem-vip').value = '';
  document.getElementById('mem-avatar-file').value = '';
  document.getElementById('avatar-preview-box').style.display = 'none';
  currentAvatarBase64 = "";

  showToast('✔ Đã thêm thành viên!');
  if (typeof supabaseClient === 'undefined' || !supabaseClient) renderMembers();
}

// ─── RENDER DANH SÁCH ───
// ─── RENDER MẠNG LƯỚI QUAN HỆ (VIS-NETWORK) ───
let network = null;
let allMembersCache = [];

const relColors = {
  sudo: { color: '#ff9900', dashes: false, label: 'Sư Đồ' },
  triki: { color: '#ff00ff', dashes: false, label: 'Tri Kỉ' },
  banthan: { color: '#ffd700', dashes: false, label: 'Bạn Thân' },
  kimlan: { color: '#00f2ff', dashes: false, label: 'Kim Lan' },
  clone: { color: '#888888', dashes: true, label: 'Clone' },
  nhat: { color: '#00ff88', dashes: true, label: 'Nhặt từ PB' }
};

async function renderMembers(customItems = null) {
  const container = document.getElementById('network-graph');
  if (!container) return;
  
  try {
    const allItems = customItems || await DB.getMembers();
    allMembersCache = allItems;
    
    // Update dropdowns
    const src = document.getElementById('rel-source');
    const tgt = document.getElementById('rel-target');
    if (src && tgt) {
      let opts = '<option value="">-- Chọn --</option>';
      allItems.forEach(m => {
        const displayName = m.igame || m.name;
        opts += `<option value="${m.id}">${displayName} (${m.faction})</option>`;
      });
      src.innerHTML = opts;
      tgt.innerHTML = opts;
    }

    if (!allItems || allItems.length === 0) {
      container.innerHTML = `<div class="news-empty" style="height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;"><div class="empty-icon">👥</div><p>Chưa có hồ sơ nào.</p></div>`;
      return;
    }
    
    // Fetch relations
    const allRels = await DB.getRelations();

    // Map Nodes
    const nodes = new vis.DataSet(allItems.map(m => {
      return {
        id: m.id,
        shape: 'circularImage',
        image: (m.avatar && m.avatar.length > 10) ? m.avatar : 'https://via.placeholder.com/150/020209/00f2ff?text=User',
        label: `${m.igame || m.name}\n[${m.faction}]`,
        color: {
          border: m.isVip ? '#bf00ff' : '#00f2ff',
          background: '#020209',
          highlight: { border: '#ffffff', background: '#020209' }
        },
        borderWidth: m.isVip ? 4 : 2,
        font: { color: '#e0f7fa', face: 'Be Vietnam Pro', size: 14, strokeWidth: 2, strokeColor: '#000000' }
      };
    }));

    // Map Edges
    const edges = new vis.DataSet(allRels.map(r => {
      const conf = relColors[r.type] || relColors.banthan;
      return {
        id: r.id,
        from: r.source_id,
        to: r.target_id,
        label: conf.label,
        color: { color: conf.color, highlight: '#ffffff' },
        dashes: conf.dashes,
        font: { color: conf.color, size: 12, strokeWidth: 2, strokeColor: '#000000', align: 'horizontal' },
        arrows: (r.type === 'sudo' || r.type === 'clone') ? 'to' : ''
      };
    }));

    const data = { nodes: nodes, edges: edges };
    const options = {
      physics: {
        forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springLength: 100, springConstant: 0.08 },
        maxVelocity: 50,
        solver: 'forceAtlas2Based',
        timestep: 0.35,
        stabilization: { iterations: 150 }
      },
      nodes: { shadow: { enabled: true, color: 'rgba(0, 242, 255, 0.5)', size: 10, x: 0, y: 0 } },
      edges: { smooth: { type: 'continuous' } },
      interaction: { dragView: true, zoomView: false, hover: true, tooltipDelay: 200 }
    };

    network = new vis.Network(container, data, options);

    // Tắt physics sau khi đã tự động sắp xếp xong để cố định các node
    network.on("stabilizationIterationsDone", function () {
      network.setOptions( { physics: false } );
    });

    // On Click Node -> Show Modal
    network.on("click", function (params) {
      if (params.nodes.length > 0) {
        showMemberModal(params.nodes[0]);
      } else if (params.edges.length > 0) {
        // Handle Edge Click (Delete Relation)
        if (confirm("Bạn muốn xóa liên kết này?")) {
          DB.deleteRelation(params.edges[0]).then(() => renderMembers());
        }
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="news-empty"><p style="color:red">Lỗi tải dữ liệu: ${err.message}</p></div>`;
  }
}

function resetNetworkZoom() {
  if (network) {
    network.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
  }
}

function zoomNetworkIn() {
  if (network) {
    const scale = network.getScale();
    network.moveTo({ scale: scale * 1.5, animation: { duration: 300 } });
  }
}

function zoomNetworkOut() {
  if (network) {
    const scale = network.getScale();
    network.moveTo({ scale: scale / 1.5, animation: { duration: 300 } });
  }
}

// ─── TẠO LIÊN KẾT ───
async function addRelation() {
  const source = document.getElementById('rel-source').value;
  const target = document.getElementById('rel-target').value;
  const type = document.getElementById('rel-type').value;

  if (!source || !target) {
    showToast('⚠ Vui lòng chọn cả 2 người!');
    return;
  }
  if (source === target) {
    showToast('⚠ Không thể tự liên kết với chính mình!');
    return;
  }

  await DB.addRelation({ source_id: source, target_id: target, type: type });
  showToast('✔ Đã tạo liên kết!');
  renderMembers();
}

// ─── HIỂN THỊ HỒ SƠ ───
function showMemberModal(id) {
  const item = allMembersCache.find(m => String(m.id) === String(id));
  if (!item) return;

  const modal = document.getElementById('member-modal');
  const modalCard = document.getElementById('modal-card');
  const content = document.getElementById('modal-content');

  if (item.isVip) {
    modalCard.style.background = "url('../Background_card.png') center/cover";
    modalCard.style.backdropFilter = "none";
  } else {
    modalCard.style.background = "rgba(7,7,26,.85)";
    modalCard.style.backdropFilter = "blur(14px)";
  }
  
  const ratingCount = item.rating_count || 0;
  const ratingSum = item.rating_sum || 0;
  const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : 0;
  const vipLabel = item.isVip ? '✨ Tắt VIP' : '✨ Bật VIP';
  const vipBtnClass = item.isVip ? 'btn-sword btn-secondary' : 'btn-sword';

  content.innerHTML = `
    <!-- Avatar + nút chỉnh sửa -->
    <div style="display: flex; justify-content: center; margin-bottom: 1rem; width: 100%;">
      <div style="position:relative; width:88px; height:88px;">
        <div class="member-avatar" style="margin:0; width:100%; height:100%;">
          ${(item.avatar && item.avatar.length > 10)
            ? `<img id="modal-avatar-img" src="${item.avatar}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/150?text=Error'">`
            : `<div class="avatar-placeholder">👥</div>`}
        </div>
        <label for="modal-avatar-input" title="Đổi ảnh đại diện" style="
          position:absolute; bottom:-4px; right:-4px;
          width:26px; height:26px; border-radius:50%;
          background:var(--c); color:#000; font-size:0.75rem;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; border:2px solid #000;
          box-shadow: 0 0 8px var(--c);
        ">✏️</label>
        <input type="file" id="modal-avatar-input" accept="image/*" style="display:none"
          onchange="updateMemberAvatar('${item.id}', this)">
      </div>
    </div>

    <div class="member-info">
      <div class="member-name ${item.isVip ? 'vip-name' : ''}" data-faction="${item.faction}" style="font-size:1.8rem;">${item.name}</div>
      <div class="member-igame" style="margin-top:0.5rem;">🎮 ${item.igame || 'Chưa cập nhật'}</div>
      <div class="member-faction" style="margin-top:0.5rem;">⚔ ${item.faction}</div>
    </div>
    <div class="member-stats" style="margin: 1.5rem 0; justify-content:center; gap:2rem;">
      <span>❤️ ${item.likes || 0}</span>
      <span>⭐ ${avgRating}/5 (${ratingCount})</span>
    </div>

    <div style="display:flex; justify-content:center; gap: 0.5rem; flex-wrap:wrap;">
      <button class="btn-sword" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="likeMember('${item.id}')">
        Thích 👍
      </button>
      <button class="btn-sword btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="openRateModal('${item.id}', '${item.name}')">
        Đánh giá ⭐
      </button>
      <button class="${vipBtnClass}" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="toggleVip('${item.id}', ${item.isVip})">
        ${vipLabel}
      </button>
    </div>
    <div style="margin-top: 1.5rem;">
      <button class="btn-delete" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;" onclick="deleteMember('${item.id}')">🗑 Xóa Hồ Sơ</button>
    </div>
  `;
  
  modal.style.display = 'flex';
}

// ─── TOGGLE VIP ───
async function toggleVip(id, currentVip) {
  if (!currentVip) {
    // Bật VIP → cần nhập mã
    const code = prompt('Nhập mã VIP bí mật để kích hoạt:');
    if (code === null) return;
    const valid = code.toUpperCase() === 'VIP2026' || code.toUpperCase() === 'SẬPGAME';
    if (!valid) {
      showToast('⚠ Mã VIP không đúng!');
      return;
    }
    await DB.updateMember(id, { isVip: true });
    showToast('✨ Đã kích hoạt VIP!');
  } else {
    // Tắt VIP
    if (!confirm('Bạn có chắc muốn tắt VIP cho thành viên này?')) return;
    await DB.updateMember(id, { isVip: false });
    showToast('VIP đã được tắt.');
  }
  // Cập nhật cache và re-render
  const m = allMembersCache.find(x => String(x.id) === String(id));
  if (m) m.isVip = !currentVip;
  renderMembers();
  document.getElementById('member-modal').style.display = 'none';
}

// ─── ĐỔI AVATAR TỪ MODAL ───
function updateMemberAvatar(id, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result;
    await DB.updateMember(id, { avatar: base64 });
    const m = allMembersCache.find(x => String(x.id) === String(id));
    if (m) m.avatar = base64;
    // Cập nhật ảnh trực tiếp trong modal không cần đóng
    const img = document.getElementById('modal-avatar-img');
    if (img) img.src = base64;
    showToast('✔ Đã cập nhật ảnh đại diện!');
    renderMembers();
  };
  reader.readAsDataURL(file);
}

// ─── TƯƠNG TÁC ───
async function likeMember(id) {
  // Prevent spam by checking localStorage (optional)
  const liked = localStorage.getItem('liked_' + id);
  if (liked) {
    showToast('⚠ Bạn đã thích hồ sơ này rồi!');
    return;
  }
  
  await DB.likeMember(id);
  localStorage.setItem('liked_' + id, 'true');
  showToast('✔ Đã thích hồ sơ!');
  if (typeof supabaseClient === 'undefined' || !supabaseClient) renderMembers();
}

async function deleteMember(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ này?\n(Sẽ xóa luôn khỏi bảng Tiến Độ Phó Bản)')) return;

  // Xóa member, bảng tiến độ sẽ tự động cập nhật
  await DB.deleteMember(id);
  
  // Close modal
  const modal = document.getElementById('member-modal');
  if (modal) modal.style.display = 'none';

  showToast('Đã xóa hồ sơ.');
  if (typeof supabaseClient === 'undefined' || !supabaseClient) renderMembers();
}

// ─── MODAL ĐÁNH GIÁ ───
let currentRateId = null;

function openRateModal(id, name) {
  currentRateId = id;
  // Use JS prompt for quick rating
  const stars = prompt(`Nhập số sao đánh giá cho ${name} (từ 1 đến 5):`, "5");
  if (stars === null) return;
  
  const num = parseInt(stars);
  if (isNaN(num) || num < 1 || num > 5) {
    showToast('⚠ Vui lòng nhập số từ 1 đến 5!');
    return;
  }
  
  submitRate(id, num);
}

async function submitRate(id, stars) {
  const rated = localStorage.getItem('rated_' + id);
  if (rated) {
    showToast('⚠ Bạn đã đánh giá hồ sơ này rồi!');
    return;
  }
  
  await DB.rateMember(id, stars);
  localStorage.setItem('rated_' + id, 'true');
  showToast(`✔ Đã gửi đánh giá ${stars} sao!`);
  if (typeof supabaseClient === 'undefined' || !supabaseClient) renderMembers();
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

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavbar();
  
  // Tải dữ liệu lần đầu
  renderMembers();

  // Nếu sau 1.5s vẫn chưa có gì (có thể do mạng chậm), thử tải lại
  setTimeout(() => {
    const list = document.getElementById('public-list');
    if (list && list.querySelector('.news-empty')) {
      console.log("Thử tải lại danh sách thành viên...");
      renderMembers();
    }
  }, 1500);

  // Cuộn xuống nếu có #add
  if (window.location.hash === '#add') {
    setTimeout(() => {
      document.getElementById('add').scrollIntoView({ behavior: 'smooth' });
    }, 500);
  }

  // Lắng nghe thay đổi Realtime
  setTimeout(() => {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      DB.onMembersChange(items => renderMembers(items));
    }
  }, 500);
});
