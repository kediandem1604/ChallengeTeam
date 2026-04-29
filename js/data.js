/* ═══════════════════════════════════════════════
   DATA LAYER — Supabase + localStorage fallback
═══════════════════════════════════════════════ */

let supabaseClient = null;

function initSupabase() {
  if (!SUPABASE_READY || typeof supabase === 'undefined') return false;
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('%c✔ Supabase connected!', 'color:#c9a84c;font-weight:bold;');
    return true;
  } catch (e) {
    console.warn('Supabase init failed, using localStorage:', e);
    return false;
  }
}

// Chờ kết nối (max 2 giây)
async function waitForConnection() {
  if (supabaseClient) return true;
  if (!SUPABASE_READY) return false;
  
  return new Promise(resolve => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (supabaseClient) {
        clearInterval(interval);
        resolve(true);
      } else if (attempts > 20) { // Đợi tối đa 2s
        clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
}

// ─── HELPER: Timestamp ───
function nowDate() { return new Date().toLocaleDateString('vi-VN'); }
function generateId() { return Date.now().toString(); }

/* ══════════════════════════════
   DATA OPERATIONS
══════════════════════════════ */
const DB = {
  // ── NEWS ──
  async getNews() {
    await waitForConnection();
    if (supabaseClient) {
      const { data } = await supabaseClient.from('news').select('*').order('created_at', { ascending: false });
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem('kkd_news') || '[]');
  },

  async addNews(item) {
    item.date = nowDate();
    if (supabaseClient) {
      const { data } = await supabaseClient.from('news').insert([item]).select();
      if (data) return data[0];
    }
    const arr = JSON.parse(localStorage.getItem('kkd_news') || '[]');
    item.id = generateId();
    arr.unshift(item);
    localStorage.setItem('kkd_news', JSON.stringify(arr));
    return item;
  },

  async deleteNews(id) {
    if (supabaseClient) { await supabaseClient.from('news').delete().eq('id', id); return; }
    const arr = JSON.parse(localStorage.getItem('kkd_news') || '[]');
    localStorage.setItem('kkd_news', JSON.stringify(arr.filter(n => String(n.id) !== String(id))));
  },

  // ── VIDEOS ──
  async getVideos() {
    await waitForConnection();
    if (supabaseClient) {
      const { data } = await supabaseClient.from('videos').select('*').order('created_at', { ascending: false });
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem('kkd_videos') || '[]');
  },

  async addVideo(item) {
    item.date = nowDate();
    if (supabaseClient) {
      const { data } = await supabaseClient.from('videos').insert([item]).select();
      if (data) return data[0];
    }
    const arr = JSON.parse(localStorage.getItem('kkd_videos') || '[]');
    item.id = generateId();
    arr.unshift(item);
    localStorage.setItem('kkd_videos', JSON.stringify(arr));
    return item;
  },

  async deleteVideo(id) {
    if (supabaseClient) { await supabaseClient.from('videos').delete().eq('id', id); return; }
    const arr = JSON.parse(localStorage.getItem('kkd_videos') || '[]');
    localStorage.setItem('kkd_videos', JSON.stringify(arr.filter(v => String(v.id) !== String(id))));
  },

  // ── MEMBERS (Thành Viên) ──
  async getMembers() {
    await waitForConnection();
    if (supabaseClient) {
      const { data } = await supabaseClient.from('members').select('*').order('created_at', { ascending: false });
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem('kkd_members') || '[]');
  },

  async addMember(item) {
    item.likes = 0;
    item.rating_sum = 0;
    item.rating_count = 0;
    if (supabaseClient) {
      const { data } = await supabaseClient.from('members').insert([item]).select();
      if (data) return data[0];
    }
    const arr = JSON.parse(localStorage.getItem('kkd_members') || '[]');
    item.id = generateId();
    arr.unshift(item);
    localStorage.setItem('kkd_members', JSON.stringify(arr));
    return item;
  },

  async likeMember(id) {
    if (supabaseClient) {
      // In a real app we'd use an RPC for safe atomic increment, here we just read and update for simplicity
      const { data } = await supabaseClient.from('members').select('likes').eq('id', id).single();
      if (data) await supabaseClient.from('members').update({ likes: (data.likes || 0) + 1 }).eq('id', id);
      return;
    }
    const arr = JSON.parse(localStorage.getItem('kkd_members') || '[]');
    const m = arr.find(x => String(x.id) === String(id));
    if (m) m.likes = (m.likes || 0) + 1;
    localStorage.setItem('kkd_members', JSON.stringify(arr));
  },

  async rateMember(id, stars) {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('members').select('rating_sum, rating_count').eq('id', id).single();
      if (data) {
        await supabaseClient.from('members').update({
          rating_sum: (data.rating_sum || 0) + stars,
          rating_count: (data.rating_count || 0) + 1
        }).eq('id', id);
      }
      return;
    }
    const arr = JSON.parse(localStorage.getItem('kkd_members') || '[]');
    const m = arr.find(x => String(x.id) === String(id));
    if (m) {
      m.rating_sum = (m.rating_sum || 0) + stars;
      m.rating_count = (m.rating_count || 0) + 1;
    }
    localStorage.setItem('kkd_members', JSON.stringify(arr));
  },

  async deleteMember(id) {
    if (supabaseClient) { await supabaseClient.from('members').delete().eq('id', id); return; }
    const arr = JSON.parse(localStorage.getItem('kkd_members') || '[]');
    localStorage.setItem('kkd_members', JSON.stringify(arr.filter(m => String(m.id) !== String(id))));
  },

  async updateMember(id, fields) {
    if (supabaseClient) {
      await supabaseClient.from('members').update(fields).eq('id', id);
      return;
    }
    const arr = JSON.parse(localStorage.getItem('kkd_members') || '[]');
    const m = arr.find(x => String(x.id) === String(id));
    if (m) Object.assign(m, fields);
    localStorage.setItem('kkd_members', JSON.stringify(arr));
  },

  // ── RELATIONS (Mạng Lưới Quan Hệ) ──
  async getRelations() {
    await waitForConnection();
    if (supabaseClient) {
      const { data } = await supabaseClient.from('relations').select('*');
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem('kkd_relations') || '[]');
  },

  async addRelation(rel) {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('relations').insert([rel]).select();
      if (data) return data[0];
    }
    const arr = JSON.parse(localStorage.getItem('kkd_relations') || '[]');
    rel.id = generateId();
    arr.push(rel);
    localStorage.setItem('kkd_relations', JSON.stringify(arr));
    return rel;
  },

  async deleteRelation(id) {
    if (supabaseClient) { await supabaseClient.from('relations').delete().eq('id', id); return; }
    const arr = JSON.parse(localStorage.getItem('kkd_relations') || '[]');
    localStorage.setItem('kkd_relations', JSON.stringify(arr.filter(r => String(r.id) !== String(id))));
  },

  // ── EXCEL LINK ──
  async getExcelLink() {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('settings').select('url').eq('id', 'excel').single();
      if (data) return data.url;
      return '';
    }
    return localStorage.getItem('kkd_excel') || '';
  },

  async setExcelLink(url) {
    if (supabaseClient) {
      await supabaseClient.from('settings').upsert({ id: 'excel', url });
      return;
    }
    localStorage.setItem('kkd_excel', url);
  },

  // ── DUNGEONS (Tiến độ phó bản) ──
  async getDungeons() {
    await waitForConnection();
    if (supabaseClient) {
      const { data } = await supabaseClient.from('dungeons').select('*').order('created_at', { ascending: true });
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem('kkd_dungeons') || '[]');
  },

  async saveDungeon(item) {
    if (supabaseClient) {
      if (item.id) {
        const { data } = await supabaseClient.from('dungeons').update(item).eq('id', item.id).select();
        if (data) return data[0];
      } else {
        const { data } = await supabaseClient.from('dungeons').insert([item]).select();
        if (data) return data[0];
      }
    }
    const arr = JSON.parse(localStorage.getItem('kkd_dungeons') || '[]');
    if (item.id) {
      const index = arr.findIndex(x => String(x.id) === String(item.id));
      if (index !== -1) arr[index] = { ...arr[index], ...item };
    } else {
      item.id = generateId();
      arr.push(item);
    }
    localStorage.setItem('kkd_dungeons', JSON.stringify(arr));
    return item;
  },

  async deleteDungeon(id) {
    if (supabaseClient) { await supabaseClient.from('dungeons').delete().eq('id', id); return; }
    const arr = JSON.parse(localStorage.getItem('kkd_dungeons') || '[]');
    localStorage.setItem('kkd_dungeons', JSON.stringify(arr.filter(d => String(d.id) !== String(id))));
  },

  async resetDungeons() {
    if (supabaseClient) {
      // In a real scenario we might need to fetch all and update, or use RPC.
      // For now, let's fetch all and update statuses to false/empty.
      const { data } = await supabaseClient.from('dungeons').select('*');
      if (data) {
        for (let d of data) {
          await supabaseClient.from('dungeons').update({ ngoai_cac: false, cam_cac: false, bi_canh: false, dong_dinh: false }).eq('id', d.id);
        }
      }
      return;
    }
    const arr = JSON.parse(localStorage.getItem('kkd_dungeons') || '[]');
    const resetArr = arr.map(d => ({ ...d, ngoai_cac: false, cam_cac: false, bi_canh: false, dong_dinh: false }));
    localStorage.setItem('kkd_dungeons', JSON.stringify(resetArr));
  },

  // ── KE ACCOUNTS (List acc Kẹ) ──
  async getKeAccounts() {
    await waitForConnection();
    if (supabaseClient) {
      const { data } = await supabaseClient.from('ke_accounts').select('*').order('created_at', { ascending: true });
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem('kkd_ke_accounts') || '[]');
  },

  async saveKeAccount(item) {
    if (supabaseClient) {
      if (item.id) {
        const { data } = await supabaseClient.from('ke_accounts').update(item).eq('id', item.id).select();
        if (data) return data[0];
      } else {
        const { data } = await supabaseClient.from('ke_accounts').insert([item]).select();
        if (data) return data[0];
      }
    }
    const arr = JSON.parse(localStorage.getItem('kkd_ke_accounts') || '[]');
    if (item.id) {
      const index = arr.findIndex(x => String(x.id) === String(item.id));
      if (index !== -1) arr[index] = { ...arr[index], ...item };
    } else {
      item.id = generateId();
      arr.push(item);
    }
    localStorage.setItem('kkd_ke_accounts', JSON.stringify(arr));
    return item;
  },

  async deleteKeAccount(id) {
    if (supabaseClient) { await supabaseClient.from('ke_accounts').delete().eq('id', id); return; }
    const arr = JSON.parse(localStorage.getItem('kkd_ke_accounts') || '[]');
    localStorage.setItem('kkd_ke_accounts', JSON.stringify(arr.filter(a => String(a.id) !== String(id))));
  },

  async resetKeAccounts() {
    if (supabaseClient) {
      const { data } = await supabaseClient.from('ke_accounts').select('*');
      if (data) {
        for (let a of data) {
          await supabaseClient.from('ke_accounts').update({ ngoai_cac: false, cam_cac: false, bi_canh: false, dong_dinh: false }).eq('id', a.id);
        }
      }
      return;
    }
    const arr = JSON.parse(localStorage.getItem('kkd_ke_accounts') || '[]');
    const resetArr = arr.map(a => ({ ...a, ngoai_cac: false, cam_cac: false, bi_canh: false, dong_dinh: false }));
    localStorage.setItem('kkd_ke_accounts', JSON.stringify(resetArr));
  },

  // ── REALTIME LISTENERS (fallback to polling or dummy if not configured) ──
  onNewsChange(callback) {
    if (!supabaseClient) return null;
    return supabaseClient.channel('custom-news-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        this.getNews().then(callback);
      }).subscribe();
  },

  onVideosChange(callback) {
    if (!supabaseClient) return null;
    return supabaseClient.channel('custom-videos-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => {
        this.getVideos().then(callback);
      }).subscribe();
  },

  onMembersChange(callback) {
    if (!supabaseClient) return null;
    return supabaseClient.channel('custom-members-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        this.getMembers().then(callback);
      }).subscribe();
  }
};

// ─── Khởi tạo ngay lập tức ───
if (typeof SUPABASE_READY !== 'undefined') initSupabase();

// ─── GLOBAL UI HELPER ───
window.toggleMenu = function() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) navLinks.classList.toggle('open');
};

