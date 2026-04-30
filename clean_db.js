const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://clekkfpuezhigqcukrug.supabase.co";
const supabaseKey = "sb_publishable_JkpBcj7W-NGs9b9Q-U0wXA_HR4j8P_k";

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDatabase() {
  console.log("Đang kết nối Supabase...");

  // Xóa các vị trí tổ ong dư thừa (cell_index không còn sử dụng)
  console.log("1. Đang dọn dẹp các vị trí tổ ong (honeycomb) cũ không có tọa độ x,y...");
  const { data: positionsData, error: posError } = await supabase
    .from('honeycomb_positions')
    .delete()
    .is('pos_x', null);

  if (posError) {
    console.error(" Lỗi dọn dẹp honeycomb_positions:", posError);
  } else {
    console.log(" Đã xóa các vị trí tổ ong thừa.");
  }

  // Dọn dẹp các liên kết của những member đã bị xóa
  console.log("\n2. Đang dọn dẹp các liên kết mồ côi...");
  const { data: members, error: memErr } = await supabase.from('members').select('id');
  if (memErr) {
    console.error(" Lỗi lấy danh sách member:", memErr);
    return;
  }
  
  const memberIds = members.map(m => String(m.id));
  
  const { data: rels, error: relErr } = await supabase.from('relations').select('*');
  if (relErr) {
    console.error(" Lỗi lấy danh sách liên kết:", relErr);
  } else {
    let orphanedCount = 0;
    for (const rel of rels) {
      if (!memberIds.includes(String(rel.source_id)) || !memberIds.includes(String(rel.target_id))) {
        await supabase.from('relations').delete().eq('id', rel.id);
        orphanedCount++;
      }
    }
    console.log(` Đã dọn dẹp ${orphanedCount} liên kết mồ côi.`);
  }

  console.log("\nHoàn tất dọn dẹp Database!");
}

cleanDatabase();
