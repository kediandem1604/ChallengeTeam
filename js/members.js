/* ═══════════════════════════════════════════════
   MEMBERS LOGIC — Kiếm Khách Đoàn
═══════════════════════════════════════════════ */

// ─── NÉN ẢNH (Canvas resize + JPEG compress) ───
// maxSize: chiều rộng/cao tối đa (px), quality: 0–1
function compressImage(file, maxSize = 256, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Tính toán kích thước mới (giữ tỷ lệ aspect ratio)
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
        else       { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; } }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Xuất JPEG nén
        const compressed = canvas.toDataURL('image/jpeg', quality);
        const sizeBefore = Math.round(e.target.result.length * 3 / 4 / 1024);
        const sizeAfter  = Math.round(compressed.length  * 3 / 4 / 1024);
        console.log(`🖼️ Ảnh nén: ${sizeBefore}KB → ${sizeAfter}KB (${w}×${h}px)`);
        resolve(compressed);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── XỬ LÝ UPLOAD ───
let currentAvatarBase64 = "";

async function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;

  showToast('⏳ Đang xử lý ảnh...');
  try {
    currentAvatarBase64 = await compressImage(file, 256, 0.75);
    console.log("✔ Đã nạp ảnh đại diện (Base64 compressed)");
    const previewBox = document.getElementById('avatar-preview-box');
    const previewImg = document.getElementById('avatar-preview-img');
    if (previewBox && previewImg) {
      previewImg.src = currentAvatarBase64;
      previewBox.style.display = 'block';
    }
  } catch(err) {
    console.warn('Nén ảnh thất bại, dùng ảnh gốc:', err);
    // fallback: đọc nguyên gốc nếu compress lỗi
    const reader = new FileReader();
    reader.onload = (e) => { currentAvatarBase64 = e.target.result; };
    reader.readAsDataURL(file);
  }
}

// ─── THÊM THÀNH VIÊN ───
async function submitMember() {
  const name = document.getElementById('mem-name').value.trim();
  const igame = document.getElementById('mem-igame').value.trim();
  const faction = document.getElementById('mem-faction').value;
  const avatar = currentAvatarBase64;

  const vipCode = document.getElementById('mem-vip') ? document.getElementById('mem-vip').value.trim() : '';
  const isVip = vipCode.toUpperCase() === 'VIP2026' || vipCode.toUpperCase() === 'SẦPGAME'; // Example secret codes

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

// ─── TOAST NOTIFICATION (dùng cho trang Thành Viên) ───
function showToast(msg, duration = 3500) {
  let t = document.getElementById('members-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'members-toast';
    t.style.cssText = [
      'position:fixed', 'bottom:2rem', 'left:50%', 'transform:translateX(-50%) translateY(20px)',
      'background:rgba(7,7,26,0.95)', 'border:1px solid var(--c)',
      'color:var(--c)', 'padding:0.75rem 1.5rem', 'border-radius:8px',
      'font-family:"Be Vietnam Pro",sans-serif', 'font-size:0.9rem', 'font-weight:600',
      'z-index:99999', 'box-shadow:0 0 20px rgba(0,242,255,0.3)',
      'opacity:0', 'transition:opacity 0.3s ease, transform 0.3s ease',
      'pointer-events:none', 'white-space:nowrap'
    ].join(';');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  // Hiện
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });
  // Ẩn sau duration ms
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, duration);
}

// ─── RENDER DANH SÁCH ───
// ─── RENDER MẠNG LƯỚI QUAN HỆ (VIS-NETWORK) ───
let network = null;
let networkEdges = null;
let networkNodes = null; // expose để có thể update node image từ bên ngoài
let allMembersCache = [];

// ─── HONEYCOMB STATE ───
const HC_COLS = 7, HC_ROWS = 5;
let hcPositions = {}; // { cellIndex: memberId }
let hcMemberMap = {}; // { memberId: cellIndex }
let hcMemberData = {}; // { memberId: memberObject }
let hcDragId = null;
let hcFromCell = null;


const relColors = {
  sudo: { color: '#ff9900', dashes: false, label: 'Sư Đồ' },
  triki: { color: '#ff00ff', dashes: false, label: 'Tri Kỉ' },
  banthan: { color: '#ffd700', dashes: false, label: 'Cục Nợ' },
  kimlan: { color: '#00f2ff', dashes: false, label: 'Kim Lan' },
  clone: { color: '#888888', dashes: true, label: 'Clone' },
  nhat: { color: '#00ff88', dashes: true, label: 'Nhặt từ PB' },
  osin: { color: '#8b4513', dashes: false, label: 'Osin' },
  conno: { color: '#dc143c', dashes: false, label: 'Con Nợ' },
  kimlancu: { color: '#64748b', dashes: true, label: 'Kim Lan Cũ' },
  tinh1dem: { color: '#e11d48', dashes: false, label: 'Tình 1 Đêm' },
  discord: { color: '#5865F2', dashes: false, label: 'Cùng Discord' }
};

const factionColors = {
  'Thiết Y': '#ffd700', 'Cửu Linh': '#d8b4fe',
  'Thần Tương': '#60a5fa', 'Long Ngâm': '#34d399',
  'Toái Mộng': '#22d3ee', 'Tố Vấn': '#f472b6',
  'Huyết Hà': '#f87171'
};

const hexImgCache = {};

// Tạo ảnh hex bằng canvas (avatar clip vào lục giác, viền màu phái)
function generateHexImage(m, cb) {
  const key = m.id + '_' + (m.avatar ? m.avatar.slice(0, 20) : '');
  if (hexImgCache[key]) { cb(hexImgCache[key]); return; }

  const S = 90, cx = 45, cy = 45, r = 42, ir = 38;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const fcolor = factionColors[m.faction] || '#00f2ff';
  const borderCol = fcolor;

  function hexPath(radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 6;
      i === 0 ? ctx.moveTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a))
        : ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    }
    ctx.closePath();
  }

  // Vẽ viền
  hexPath(r); ctx.fillStyle = borderCol; ctx.fill();

  function finish() {
    // Glow nếu VIP
    if (m.isVip) {
      hexPath(r); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.shadowColor = fcolor; ctx.shadowBlur = 12; ctx.stroke();
      ctx.shadowBlur = 0;
    }
    const url = canvas.toDataURL();
    hexImgCache[key] = url; cb(url);
  }

  if (m.avatar && m.avatar.length > 10) {
    const img = new Image();
    img.onload = () => {
      ctx.save(); hexPath(ir); ctx.clip();
      ctx.drawImage(img, cx - ir, cy - ir, ir * 2, ir * 2);
      ctx.restore(); finish();
    };
    img.onerror = () => {
      hexPath(ir); ctx.fillStyle = '#020209'; ctx.fill(); finish();
    };
    img.src = m.avatar;
  } else {
    hexPath(ir); ctx.fillStyle = '#020209'; ctx.fill(); finish();
  }
}

async function renderMembers(customItems = null) {
  const container = document.getElementById('network-graph');
  if (!container) return;

  // Hiện skeleton ngay lập tức
  if (!customItems) {
    container.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:1rem;">
      <div style="width:48px;height:48px;border:3px solid var(--c);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <p style="color:var(--t2);font-size:0.9rem;">⏳ Đang kết nối Supabase...</p>
    </div>`;
  }

  try {
    // B1: Fetch metadata nhẹ + relations + positions song song (không có avatar nặng)
    const [allItems, allRels, savedPosArr] = await Promise.all([
      customItems ? Promise.resolve(customItems) : DB.getMembersLight(),
      DB.getRelations(),
      DB.getHoneycombPositions()
    ]);

    // Merge avatar từ cache cũ vào data mới — tránh mất avatar sau re-render
    const prevCache = allMembersCache;
    allItems.forEach(newItem => {
      const old = prevCache.find(c => String(c.id) === String(newItem.id));
      if (old && old.avatar) newItem.avatar = old.avatar;
    });
    allMembersCache = allItems;

    // Cập nhật dropdowns
    const src = document.getElementById('rel-source');
    const tgt = document.getElementById('rel-target');
    const fdd = document.getElementById('focus-dropdown');
    
    if (src && tgt) {
      let opts = '<option value="">-- Chọn --</option>';
      allItems.forEach(m => {
        opts += `<option value="${m.id}">${m.igame || m.name} (${m.faction})</option>`;
      });
      src.innerHTML = tgt.innerHTML = opts;
    }

    if (fdd) {
      let fopts = '';
      allItems.forEach(m => {
        fopts += `<div style="padding:0.4rem 0.8rem; cursor:pointer; color:var(--t2); font-size:0.85rem; border-bottom:1px solid rgba(0,242,255,0.1);" onmouseover="this.style.background='rgba(0,242,255,0.15)'; this.style.color='var(--c)'" onmouseout="this.style.background='transparent'; this.style.color='var(--t2)'" onclick="focusOnMember('${m.id}')">${m.igame || m.name}</div>`;
      });
      fdd.innerHTML = fopts;
    }

    if (!allItems || allItems.length === 0) {
      container.innerHTML = `<div class="news-empty" style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;"><div class="empty-icon">👥</div><p>Chưa có hồ sơ nào.</p></div>`;
      return;
    }

    // Build position lookup {memberId: {x, y}}
    const savedPos = {};
    savedPosArr.forEach(p => {
      if (p.pos_x != null && p.pos_y != null)
        savedPos[String(p.member_id)] = { x: p.pos_x, y: p.pos_y };
    });
    const hasSaved = Object.keys(savedPos).length > 0;

    // Pre-generate tất cả hex images trước khi build network
    // Dùng cache để tránh re-generate khi re-render
    let pending = allItems.length;
    const hexImages = {};
    allItems.forEach(m => {
      generateHexImage(m, url => {
        hexImages[String(m.id)] = url;
        if (--pending === 0) buildNetwork(container, allItems, allRels, savedPos, hasSaved, hexImages);
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="news-empty"><p style="color:red">Lỗi: ${err.message}</p></div>`;
  }
}

function buildNetwork(container, allItems, allRels, savedPos, hasSaved, hexImages) {
  const nodes = new vis.DataSet(allItems.map(m => {
    const sp = savedPos[String(m.id)];
    const fcolor = factionColors[m.faction] || '#00f2ff';
    return {
      id: m.id,
      shape: 'image',
      image: hexImages[String(m.id)] || 'https://via.placeholder.com/90',
      size: 38,
      label: `${m.igame || m.name}\n[${m.faction}]`,
      color: {
        border: 'transparent', background: 'transparent',
        highlight: { border: fcolor, background: 'transparent' }
      },
      borderWidth: 0,
      font: { color: fcolor, face: 'Be Vietnam Pro', size: 13, strokeWidth: 2, strokeColor: '#000' },
      shadow: { enabled: true, color: fcolor, size: 15, x: 0, y: 0 },
      x: sp ? sp.x : undefined,
      y: sp ? sp.y : undefined
    };
  }));

  const pairCounts = {};
  allRels.forEach(r => {
    const key = [r.source_id, r.target_id].sort().join('-');
    pairCounts[key] = (pairCounts[key] || 0) + 1;
  });

  const pairCounters = {};
  const edges = new vis.DataSet(allRels.map(r => {
    const conf = relColors[r.type] || relColors.banthan;
    const key = [r.source_id, r.target_id].sort().join('-');
    const total = pairCounts[key];
    pairCounters[key] = (pairCounters[key] || 0) + 1;
    const idx = pairCounters[key];

    let smooth = { type: 'continuous' };
    if (total > 1) {
      const spread = 0.25;
      let roundness = (idx - (total + 1) / 2) * spread;
      if (r.source_id > r.target_id) roundness = -roundness;
      smooth = { type: 'curvedCW', roundness: roundness };
    }

    const isKimLan = r.type === 'kimlan' || r.type === 'kimlancu';
    return {
      id: r.id, from: r.source_id, to: r.target_id,
      rel_type: r.type,
      label: conf.label,
      color: { color: conf.color, highlight: '#ffffff' },
      dashes: conf.dashes,
      font: { color: conf.color, size: 12, strokeWidth: 2, strokeColor: '#000', align: 'horizontal' },
      arrows: conf.arrows || ((r.type === 'sudo' || r.type === 'clone') ? 'to' : (r.type === 'banthan' || r.type === 'conno') ? { to: { enabled: true, scaleFactor: 1.2 } } : ''),
      smooth: smooth,
      hidden: isKimLan
    };
  }));

  networkEdges = edges;
  networkNodes = nodes; // expose globally

  const options = {
    physics: hasSaved ? false : {
      forceAtlas2Based: { gravitationalConstant: -60, centralGravity: 0.01, springLength: 120, springConstant: 0.08 },
      maxVelocity: 50, solver: 'forceAtlas2Based', timestep: 0.35,
      stabilization: { iterations: 150 }
    },
    nodes: {},
    edges: { smooth: { type: 'continuous' } },
    interaction: { dragView: true, zoomView: false, hover: true, tooltipDelay: 200 }
  };

  network = new vis.Network(container, { nodes, edges }, options);

  // Lưu toàn bộ vị trí sau khi physics stabilize lần đầu
  network.on('stabilizationIterationsDone', () => {
    network.setOptions({ physics: false });
    const positions = network.getPositions();
    Object.keys(positions).forEach(nid => {
      DB.setHoneycombPosition(nid, positions[nid].x, positions[nid].y);
    });
  });

  // Lưu vị trí ngay sau khi kéo thả một node
  network.on('dragEnd', params => {
    if (!params.nodes.length) return;
    const positions = network.getPositions(params.nodes);
    params.nodes.forEach(nid => {
      DB.setHoneycombPosition(nid, positions[nid].x, positions[nid].y);
    });
  });

  // Click node → hiện modal; click edge → xóa liên kết
  network.on('click', params => {
    if (params.nodes.length > 0) {
      updateKimLanVisibility();
      showMemberModal(params.nodes[0]);
    } else {
      updateKimLanVisibility();
      if (params.edges.length > 0) {
        if (confirm('Bạn muốn xóa liên kết này?')) {
          DB.deleteRelation(params.edges[0]).then(() => renderMembers());
        }
      }
    }
  });

  network.on('hoverNode', params => {
    updateKimLanVisibility(params.node);
  });
  
  network.on('blurNode', () => {
    updateKimLanVisibility();
  });

  // Load avatar trong background sau khi network đã hiện
  setTimeout(() => loadAvatarsBackground(), 200);
}

// ─── BACKGROUND AVATAR LOADER ───
// Fetch avatar riêng sau khi network đã render — không block UI
async function loadAvatarsBackground() {
  if (!supabaseClient || !networkNodes) return;
  try {
    // Chỉ lấy 2 cột nhẹ (id + avatar) — tránh timeout
    const { data, error } = await supabaseClient
      .from('members')
      .select('id, avatar')
      .not('avatar', 'is', null);

    if (error || !data) return;

    data.forEach(row => {
      if (!row.avatar || row.avatar.length < 20) return;

      // Cập nhật cache
      const m = allMembersCache.find(x => String(x.id) === String(row.id));
      if (!m) return;
      m.avatar = row.avatar;

      // Xóa hexImgCache cũ (có thể đang dùng key không có avatar)
      Object.keys(hexImgCache).forEach(k => {
        if (k.startsWith(String(m.id) + '_')) delete hexImgCache[k];
      });

      // Vẽ lại hex image và cập nhật node trên mạng lưỚi
      generateHexImage(m, url => {
        if (networkNodes) {
          try { networkNodes.update([{ id: m.id, image: url }]); } catch(e) {}
        }
      });
    });
  } catch(e) {
    console.warn('⚠ loadAvatarsBackground error:', e);
  }
}

function updateKimLanVisibility(hoverNodeId = null) {
  if (!networkEdges || !network) return;
  const selectedNodes = network.getSelectedNodes() || [];
  const updates = [];
  networkEdges.forEach(edge => {
    if (edge.rel_type === 'kimlan' || edge.rel_type === 'kimlancu') {
      const isHovered = hoverNodeId && (String(edge.from) === String(hoverNodeId) || String(edge.to) === String(hoverNodeId));
      const isSelected = selectedNodes.some(id => String(edge.from) === String(id) || String(edge.to) === String(id));
      updates.push({ id: edge.id, hidden: !(isHovered || isSelected) });
    }
  });
  if (updates.length > 0) networkEdges.update(updates);
}

function resetNetworkZoom() {
  if (network) network.fit({ animation: { duration: 800, easingFunction: 'easeInOutQuad' } });
}
function zoomNetworkIn() {
  if (network) network.moveTo({ scale: network.getScale() * 1.5, animation: { duration: 300 } });
}
function zoomNetworkOut() {
  if (network) network.moveTo({ scale: network.getScale() / 1.5, animation: { duration: 300 } });
}

function toggleFocusDropdown() {
  const fdd = document.getElementById('focus-dropdown');
  if (fdd) {
    fdd.style.display = fdd.style.display === 'none' ? 'block' : 'none';
  }
}

function focusOnMember(id) {
  if (network) {
    network.focus(id, { scale: 1.2, animation: { duration: 800, easingFunction: 'easeInOutQuad' } });
    network.selectNodes([id]);
    updateKimLanVisibility(id);
  }
  const fdd = document.getElementById('focus-dropdown');
  if (fdd) fdd.style.display = 'none';
}

// Close dropdown if click outside
document.addEventListener('click', function(e) {
  const fdd = document.getElementById('focus-dropdown');
  if (fdd && fdd.style.display === 'block') {
    const btn = e.target.closest('button[onclick="toggleFocusDropdown()"]');
    if (!btn && !fdd.contains(e.target)) {
      fdd.style.display = 'none';
    }
  }
});



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
async function showMemberModal(id) {
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

  // Hiển thị modal ngay (avatar placeholder trước)
  content.innerHTML = `
    <!-- Avatar + nút chỉnh sửa -->
    <div style="display: flex; justify-content: center; margin-bottom: 1rem; width: 100%;">
      <div style="position:relative; width:88px; height:88px;">
        <div class="member-avatar" style="margin:0; width:100%; height:100%;">
          <div class="avatar-placeholder" id="modal-avatar-wrap">👥</div>
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
    <div style="margin-top: 1.5rem; display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
      <button class="btn-delete" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;" onclick="deleteMember('${item.id}')">🗑 Xóa Hồ Sơ</button>
      <button id="btn-download-avatar" style="
        font-size: 0.8rem; padding: 0.4rem 0.9rem;
        background: rgba(0,242,255,0.1); border: 1px solid rgba(0,242,255,0.4);
        color: var(--c); border-radius: 6px; cursor: pointer;
        font-family: 'Be Vietnam Pro', sans-serif; font-weight: 600;
        transition: 0.2s; opacity: 0.4; pointer-events: none;
      " onclick="downloadMemberAvatar('${item.id}', '${item.name || 'avatar'}')">📥 Tải ảnh xuống</button>
    </div>
  `;

  modal.style.display = 'flex';

  // Hàm bật nút tải sau khi avatar đã load
  function enableDownloadBtn() {
    const btn = document.getElementById('btn-download-avatar');
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }

  // Fetch avatar riêng (chỉ khi chưa có trong cache)
  if (!item.avatar && supabaseClient) {
    supabaseClient.from('members').select('avatar').eq('id', item.id).single()
      .then(({ data }) => {
        if (data && data.avatar) {
          item.avatar = data.avatar; // lưu vào cache
          const wrap = document.getElementById('modal-avatar-wrap');
          if (wrap) {
            wrap.outerHTML = `<img id="modal-avatar-img" src="${data.avatar}" alt="${item.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`;
          }
          enableDownloadBtn();
        }
      });
  } else if (item.avatar && item.avatar.length > 10) {
    const wrap = document.getElementById('modal-avatar-wrap');
    if (wrap) {
      wrap.outerHTML = `<img id="modal-avatar-img" src="${item.avatar}" alt="${item.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`;
    }
    enableDownloadBtn();
  }
}

// ─── TẢI ẢNH XUỐNG TỪ BASE64 ───
function downloadMemberAvatar(memberId, memberName) {
  const item = allMembersCache.find(m => String(m.id) === String(memberId));
  if (!item || !item.avatar) {
    showToast('⚠ Chưa có ảnh để tải!');
    return;
  }

  // Xác định đuôi file từ MIME type
  const mime = item.avatar.split(';')[0].split(':')[1] || 'image/jpeg';
  const ext = mime === 'image/png' ? 'png' : mime === 'image/gif' ? 'gif' : 'jpg';
  const filename = `avatar_${memberName.replace(/\s+/g, '_')}.${ext}`;

  // Tạo link download tạm thời
  const a = document.createElement('a');
  a.href = item.avatar;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`✔ Đã tải ảnh: ${filename}`);
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
async function updateMemberAvatar(id, input) {
  const file = input.files[0];
  if (!file) return;

  showToast('⏳ Đang nén ảnh...');
  let base64;
  try {
    base64 = await compressImage(file, 256, 0.75);
  } catch(err) {
    console.warn('Nén thất bại, dùng ảnh gốc');
    base64 = await new Promise(res => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.readAsDataURL(file);
    });
  }

  await DB.updateMember(id, { avatar: base64 });

  // Cập nhật trong allMembersCache
  const m = allMembersCache.find(x => String(x.id) === String(id));
  if (m) m.avatar = base64;

  // Xóa hexImgCache của member này → sẽ được vẽ lại với avatar mới
  Object.keys(hexImgCache).forEach(k => {
    if (k.startsWith(String(id) + '_')) delete hexImgCache[k];
  });

  // Cập nhật ảnh trực tiếp trong modal ngay lập tức
  const img = document.getElementById('modal-avatar-img');
  if (img) img.src = base64;
  const wrap = document.getElementById('modal-avatar-wrap');
  if (wrap) wrap.outerHTML = `<img id="modal-avatar-img" src="${base64}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;

  // Bật nút download
  const dlBtn = document.getElementById('btn-download-avatar');
  if (dlBtn) { dlBtn.style.opacity = '1'; dlBtn.style.pointerEvents = 'auto'; }

  showToast('✔ Đổi ảnh đại diện thành công!');

  // Re-render mạng lưới (avatar cache đã được merge, hex image sẽ dùng ảnh mới)
  renderMembers();
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
    p.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;--dur:${7 + Math.random() * 8}s;--delay:${Math.random() * 10}s;`;
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

// ─── HONEYCOMB VIEW ───

function switchView(view) {
  const netSec = document.getElementById('network-section');
  const hcSec = document.getElementById('honeycomb-section');
  const btnNet = document.getElementById('tab-network');
  const btnHc = document.getElementById('tab-honeycomb');
  if (!netSec || !hcSec) return;
  if (view === 'honeycomb') {
    netSec.style.display = 'none'; hcSec.style.display = 'block';
    btnNet.classList.remove('active'); btnHc.classList.add('active');
    renderHoneycomb();
  } else {
    netSec.style.display = 'block'; hcSec.style.display = 'none';
    btnNet.classList.add('active'); btnHc.classList.remove('active');
  }
}

async function renderHoneycomb() {
  const wrap = document.getElementById('hc-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<p style="color:var(--t2);text-align:center;padding:2rem">&#x23F3; Dang tai...</p>';
  const [members, positions] = await Promise.all([DB.getMembers(), DB.getHoneycombPositions()]);
  allMembersCache = members;
  hcPositions = {}; hcMemberMap = {}; hcMemberData = {};
  members.forEach(m => { hcMemberData[String(m.id)] = m; });
  positions.forEach(p => {
    hcPositions[p.cell_index] = String(p.member_id);
    hcMemberMap[String(p.member_id)] = p.cell_index;
  });
  wrap.innerHTML = buildHoneycombHTML();
  attachHexDrop();
}

function buildHoneycombHTML() {
  const placed = new Set(Object.values(hcPositions));
  const unplaced = Object.values(hcMemberData).filter(m => !placed.has(String(m.id)));

  const chips = unplaced.map(m => {
    const av = (m.avatar && m.avatar.length > 10) ? m.avatar : '';
    return '<div class="hc-chip" draggable="true" data-mid="' + m.id + '" title="' + (m.igame || m.name) + ' [' + m.faction + ']">'
      + '<div class="hc-chip-av" style="background-image:url(\'' + av + '\')">' + (av ? '' : 'X') + '</div>'
      + '<span class="hc-chip-nm">' + (m.igame || m.name).substring(0, 12) + '</span></div>';
  }).join('');

  let gridHTML = '';
  for (let row = 0; row < HC_ROWS; row++) {
    gridHTML += '<div class="hc-row' + (row % 2 === 1 ? ' hc-off' : '') + '">';
    for (let col = 0; col < HC_COLS; col++) {
      const ci = row * HC_COLS + col;
      const mid = hcPositions[ci];
      const m = mid ? hcMemberData[mid] : null;
      const av = m && m.avatar && m.avatar.length > 10 ? m.avatar : '';
      gridHTML += '<div class="hc-cell' + (m ? ' hc-occ' : '') + '" data-ci="' + ci + '"'
        + (m ? ' draggable="true" data-mid="' + m.id + '"' : '') + '>'
        + '<div class="hc-outer"><div class="hc-inner">'
        + (m
          ? '<div class="hc-av" style="background-image:url(\'' + av + '\')">' + (av ? '' : 'X') + '</div>'
          + '<div class="hc-nm">' + (m.igame || m.name).substring(0, 9) + '</div>'
          : '<span class="hc-plus">+</span>')
        + '</div></div></div>';
    }
    gridHTML += '</div>';
  }

  return '<div class="hc-layout">'
    + '<div class="hc-sidebar">'
    + '<div class="hc-sb-title">Chua xep (' + unplaced.length + ')</div>'
    + '<div class="hc-sb-list" id="hc-sb-list">' + (chips || '<p class="hc-all-done">&#10003; Tat ca da xep!</p>') + '</div>'
    + '<div class="hc-remove-zone" id="hc-remove-zone">&#x2715; Keo vao day de go ra</div>'
    + '</div>'
    + '<div class="hc-grid-wrap"><div class="hc-grid" id="hc-grid">' + gridHTML + '</div></div>'
    + '</div>';
}

function attachHexDrop() {
  document.querySelectorAll('.hc-chip').forEach(el => {
    el.addEventListener('dragstart', () => { hcDragId = el.dataset.mid; hcFromCell = null; });
  });
  document.querySelectorAll('.hc-cell').forEach(cell => {
    if (cell.dataset.mid) {
      cell.addEventListener('dragstart', () => { hcDragId = cell.dataset.mid; hcFromCell = parseInt(cell.dataset.ci); });
    }
    cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('hc-hover'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('hc-hover'));
    cell.addEventListener('drop', e => { e.preventDefault(); cell.classList.remove('hc-hover'); dropToCell(parseInt(cell.dataset.ci)); });
  });
  const rz = document.getElementById('hc-remove-zone');
  if (rz) {
    rz.addEventListener('dragover', e => { e.preventDefault(); rz.classList.add('hc-hover'); });
    rz.addEventListener('dragleave', () => rz.classList.remove('hc-hover'));
    rz.addEventListener('drop', e => { e.preventDefault(); rz.classList.remove('hc-hover'); dropToRemove(); });
  }
}

function dropToCell(targetCi) {
  if (hcDragId == null) return;
  const memberId = String(hcDragId);
  const existingId = hcPositions[targetCi] ? String(hcPositions[targetCi]) : null;
  if (hcFromCell !== null) { delete hcPositions[hcFromCell]; delete hcMemberMap[memberId]; }
  if (existingId && existingId !== memberId) {
    if (hcFromCell !== null) {
      hcPositions[hcFromCell] = existingId; hcMemberMap[existingId] = hcFromCell;
      DB.setHoneycombPosition(existingId, hcFromCell);
    } else { delete hcPositions[targetCi]; delete hcMemberMap[existingId]; DB.clearHoneycombPosition(existingId); }
  }
  hcPositions[targetCi] = memberId; hcMemberMap[memberId] = targetCi;
  DB.setHoneycombPosition(memberId, targetCi);
  hcDragId = null; hcFromCell = null;
  const w = document.getElementById('hc-wrap');
  if (w) { w.innerHTML = buildHoneycombHTML(); attachHexDrop(); }
}

function dropToRemove() {
  if (hcDragId == null || hcFromCell === null) return;
  const memberId = String(hcDragId);
  delete hcPositions[hcFromCell]; delete hcMemberMap[memberId];
  DB.clearHoneycombPosition(memberId);
  hcDragId = null; hcFromCell = null;
  const w = document.getElementById('hc-wrap');
  if (w) { w.innerHTML = buildHoneycombHTML(); attachHexDrop(); }
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavbar();
  switchView('network');

  if (window.location.hash === '#add') {
    setTimeout(() => document.getElementById('add').scrollIntoView({ behavior: 'smooth' }), 500);
  }

  // Chờ Supabase sẵn sàng rồi mới render → đảm bảo dữ liệu từ đám mây
  ensureSupabase().then(() => {
    renderMembers();
    if (supabaseClient) {
      DB.onMembersChange(items => renderMembers(items));
    }
  });
});
