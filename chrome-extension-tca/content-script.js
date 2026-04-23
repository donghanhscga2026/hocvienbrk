(function() {
  'use strict';

  const MESSAGE_TYPE = 'TCA_XHR_CAPTURE';
  const FULL_TREE_TYPE = 'TCA_FULL_TREE';
  const MEMBER_INFO_TYPE = 'TCA_MEMBER_INFO';

// Auto-detect API: thử localhost:3000 trước, nếu không phản hồi → dùng production
  const LOCAL_API = 'http://localhost:3000';
  const PROD_API = 'https://giautoandien.io.vn';
  
  // Biến động, sẽ được set sau khi ping xong
  let API_BASE = PROD_API; // Default là production
  let SYNC_ENDPOINT = API_BASE + '/api/sync-tca';
  let PREVIEW_ENDPOINT = API_BASE + '/api/sync-tca/preview';
  const PREVIEW_RESULT_KEY = 'tca_preview_result';

  // Ping localhost để kiểm tra server local có đang chạy không
  async function detectApiBase() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500); // Timeout 1.5s
      const res = await fetch(LOCAL_API + '/api/sync-tca', {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok || res.status < 500) {
        API_BASE = LOCAL_API;
        SYNC_ENDPOINT = LOCAL_API + '/api/sync-tca';
        PREVIEW_ENDPOINT = LOCAL_API + '/api/sync-tca/preview';
        console.log('[TCA Sync] 🟢 Dùng LOCAL server:', LOCAL_API);
        addTcaLog(`✅ Kết nối LOCAL server: ${LOCAL_API}`);
        return;
      }
    } catch (e) {
      // localhost không phản hồi → dùng production
    }
    console.log('[TCA Sync] 🔵 Dùng PRODUCTION server:', PROD_API);
    addTcaLog(`🌐 Kết nối PRODUCTION server: ${PROD_API}`);
  }

  console.log('[TCA Sync] API Base (default):', API_BASE);


  let memberInfoCache = {};
  let precheckCache = {};  // Store precheck results: { tcaId: { exists: boolean, userId: number } }
  let pendingNodeIds = [];  // IDs cần fetch member info
  let fetchedCount = 0;    // Số member info đã fetch
  let allNodesGlobal = []; // Lưu allNodes để dùng sau
  let precheckDone = false; // Flag để tránh gọi precheck nhiều lần
  let previewCache = {};   // Lưu preview response để dùng khi sync
  let previewRows = [];   // Lưu kết quả preview từ /preview API

  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected-script.js');
    script.onload = function() {
      script.remove();
      console.log('[TCA Sync] Injected script loaded');
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Bước 1: Gọi /staging-sync (sync Prod→Test trước) hoặc /preview API để lấy bảng tổng hợp
  function callPreviewAPI(nodes) {
    return new Promise((resolve, reject) => {
      // Build allNodes format - gửi đầy đủ thông tin điểm số và cấp bậc
      const allNodes = nodes.map(n => ({
        id: n.id,
        type: n.type,
        name: n.name,
        parentFolderId: n.parentFolderId,
        // Điểm số và cấp bậc TCA (đã parse bởi injected-script.js)
        isRootNode: n.isRootNode || false,
        personalScore: n.personalScore || '0',
        totalScore: n.totalScore || '0',
        level: n.level || '1',
        hasBH: n.hasBH || false,
        hasTD: n.hasTD || false,
        groupName: n.groupName || '',
        location: n.location || '',
        personalRate: n.personalRate || '-',
        teamRate: n.teamRate || '-'
      }));
      
      // Build memberInfo format
      const memberInfo = {};
      nodes.forEach(n => {
        memberInfo[n.id] = {
          phone: n.phone || null,
          email: n.email || null
        };
      });

      if (allNodes.length === 0) {
        console.log('[TCA Sync] No nodes to preview');
        resolve({});
        return;
      }

      // Dùng /preview để lấy bảng tổng hợp (dựa trên Production DB)
      const endpoint = PREVIEW_ENDPOINT;
      console.log('[TCA Sync] === PREVIEW START ===');
      console.log('[TCA Sync] Nodes:', allNodes.length);
      console.log('[TCA Sync] API URL:', endpoint);
      
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allNodes, memberInfo })
      })
      .then(res => {
        console.log('[TCA Sync] Response status:', res.status, res.statusText);
        if (!res.ok) {
          throw new Error('Preview failed: ' + res.status);
        }
        return res.json();
      })
      .then(data => {
        console.log('[TCA Sync] === PREVIEW RESPONSE ===');
        console.log('[TCA Sync] Success:', data.success);
        console.log('[TCA Sync] Total rows:', data.rows?.length || 0);
        
        // LOG CHI TIẾT: Show first 3 rows để verify fields
        if (data.rows && data.rows.length > 0) {
          console.log('[TCA Sync] === PREVIEW SAMPLE (first 3) ===');
          data.rows.slice(0, 3).forEach((row, i) => {
            console.log(`[TCA Sync] Row ${i+1}:`, {
              id: row.id,
              name: row.name,
              match: row.match,
              userId: row.userId,
              parentUserId: row.parentUserId,
              referrerId: row.referrerId,
              refSysId: row.refSysId,
              action: row.action
            });
          });
          console.log('[TCA Sync] === PREVIEW SAMPLE END ===');
          
          // Cập nhật previewRows NGAY LẬP TỨC (không qua localStorage)
          previewRows = data.rows;
          console.log('[TCA Sync] previewRows updated directly:', previewRows.length, 'rows');
          
          // Lưu kết quả vào localStorage để backup
          try {
            localStorage.setItem(PREVIEW_RESULT_KEY, JSON.stringify(data));
            console.log('[TCA Sync] Saved preview result to localStorage');
          } catch (e) {
            console.error('[TCA Sync] localStorage error:', e);
          }
        }
        
        console.log('[TCA Sync] === STAGING SYNC END ===');
        resolve(data);
      })
      .catch(err => {
        console.error('[TCA Sync] Staging Sync ERROR:', err.message || err);
        resolve(null);
      });
    });
  }

  function handleMemberInfo(data) {
    // Nhận đầy đủ 6 trường từ injected-script: email, phone, address, joinDate, contractDate, promotionDate
    const { memberId, email, phone, address, joinDate, contractDate, promotionDate } = data;
    memberInfoCache[memberId] = { email, phone, address, joinDate, contractDate, promotionDate };
    fetchedCount++;
    console.log(`[TCA Sync] 📋 Member contact updated: ${memberId} (${fetchedCount}/${allNodesGlobal.length}) - joinDate: ${joinDate}, contractDate: ${contractDate}`);
    
    // Ghi log tiến trình
    if (fetchedCount % 10 === 0 || fetchedCount === allNodesGlobal.length) {
      addTcaLog(`Tiến độ lấy thông tin liên lạc: ${fetchedCount}/${allNodesGlobal.length}`);
    }
    
    // Update panel if exists
    const emailCell = document.querySelector(`[data-member-email="${memberId}"]`);
    const phoneCell = document.querySelector(`[data-member-phone="${memberId}"]`);
    if (emailCell) emailCell.textContent = email || '-';
    if (phoneCell) phoneCell.textContent = phone || '-';
    
    // Gọi precheck khi TẤT CẢ members đã được fetch
    if (!precheckDone && fetchedCount >= allNodesGlobal.length) {
      precheckDone = true;
      console.log(`[TCA Sync] === ALL MEMBER INFO FETCHED === (${fetchedCount}/${allNodesGlobal.length})`);
      
      // Cập nhật allNodes với member info mới nhất
      allNodesGlobal.forEach(node => {
        if (memberInfoCache[node.id]) {
          node.email = memberInfoCache[node.id].email;
          node.phone = memberInfoCache[node.id].phone;
        }
      });
      
      // Detect API base (localhost ưu tiên, fallback production)
      detectApiBase().then(() => {
        // Gọi preview với dữ liệu đầy đủ (Bước 1: Lấy bảng tổng hợp)
        callPreviewAPI(allNodesGlobal).then((previewData) => {
          console.log('[TCA Sync] === PREVIEW COMPLETE ===');
          console.log('[TCA Sync] Preview rows:', previewData?.rows?.length || 0);
          // Cập nhật panel nếu đang hiển thị (truyền cả previewRows)
          const panel = document.getElementById('tca-sync-panel');
          if (panel) {
            panel.remove();
            // Gọi lại với previewRows đã lưu
            showDataPanel(allNodesGlobal, { total: allNodesGlobal.length, folders: 0, items: allNodesGlobal.filter(n => n.type === 'item').length }, memberInfoCache);
          }
        });
      });
    }
  }

  let tcaLogs = [];
  function addTcaLog(msg) {
    const timestamp = new Date().toLocaleTimeString();
    tcaLogs.unshift(`[${timestamp}] ${msg}`);
    if (tcaLogs.length > 50) tcaLogs.pop();
    const logContainer = document.getElementById('tca-log-content');
    if (logContainer) {
      logContainer.innerHTML = tcaLogs.map(l => `<div style="border-bottom:1px solid #eee;padding:4px 0;word-break:break-all;">${l}</div>`).join('');
    }
  }

  function showDataPanel(allNodes, stats, memberInfo) {
    console.log('[TCA Sync] showDataPanel called with', allNodes.length, 'nodes, previewRows:', previewRows.length);
    addTcaLog(`Đã quét xong ${allNodes.length} thành viên từ TCA.`);
    
    if (previewRows.length === 0) {
      try {
        const saved = localStorage.getItem(PREVIEW_RESULT_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          previewRows = data.rows || [];
          addTcaLog(`Đã tải ${previewRows.length} dòng dữ liệu so sánh từ bộ nhớ tạm.`);
        }
      } catch (e) {
        console.error('[TCA Sync] Error loading previewRows:', e);
      }
    }
    
    const existing = document.getElementById('tca-sync-panel');
    if (existing) existing.remove();
    
    const panel = document.createElement('div');
    panel.id = 'tca-sync-panel';
    panel.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 90vw !important;
      height: 80vh !important;
      background: #ffffff !important;
      color: #333 !important;
      border: 3px solid #2e7d32 !important;
      border-radius: 12px !important;
      z-index: 999999999 !important;
      font-family: 'Segoe UI', Arial, sans-serif !important;
      font-size: 12px !important;
      box-shadow: 0 10px 60px rgba(0,0,0,0.4) !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    `;

    const rows = previewRows.length > 0 ? previewRows : allNodes;
    const viewStats = {
      total: rows.length,
      createAll: rows.filter(r => r.action === 'CREATE_ALL').length,
      createSystem: rows.filter(r => r.action === 'CREATE_SYSTEM').length,
      update: rows.filter(r => r.action === 'UPDATE').length
    };
    
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; background:#f5f5f5; border-bottom:2px solid #e0e0e0; flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:15px;">
          <h2 style="margin:0; color:#2e7d32; font-size:18px; font-weight:bold;">TCA Dashboard <span style="font-size:10px; color:#c2185b; font-weight:normal;">v7.6.0 [Root Sync: Auto]</span></h2>
          <div style="display:flex; gap:8px;">
            <button id="btn-csv" style="background:#1565c0; border:none; color:white; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">📥 CSV</button>
            <button id="btn-json" style="background:#7b1fa2; border:none; color:white; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">📄 JSON</button>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:15px;">
          <button id="btn-final-sync-header" style="background:#ff9800; border:none; color:white; padding:8px 20px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:13px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">✅ XÁC NHẬN ĐỒNG BỘ</button>
          <div style="font-size:11px; color:#666; background:#fff; padding:4px 8px; border-radius:4px; border:1px solid #ddd;">
            <span style="color:#2e7d32; font-weight:bold;">Tạo: ${viewStats.createAll + viewStats.createSystem}</span> | 
            <span style="color:#f57c00; font-weight:bold;">Sửa: ${viewStats.update}</span> | 
            <span>Tổng: ${viewStats.total}</span> |
            <span id="selected-count-label" style="color:#1565c0; font-weight:bold;">Đã chọn: 0</span>
          </div>
          <button id="btn-close" style="background:#d32f2f; border:none; color:white; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:14px;">X</button>
        </div>
      </div>
      
      <div style="display:flex; flex:1; overflow:hidden;">
        <!-- Cột Bảng dữ liệu (Trái) -->
        <div style="flex:1; display:flex; flex-direction:column; border-right:2px solid #e0e0e0; overflow:hidden;">
          <div style="flex:1; overflow:auto; padding:0;">
            <table style="width:100%; border-collapse:collapse; font-size:11px; table-layout:auto;">
              <thead style="position:sticky; top:0; background:#eeeeee; z-index:10; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                <tr>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:30px;">
                    <input type="checkbox" id="check-all-nodes" checked title="Chọn tất cả">
                  </th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:35px;">#</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">TCAID</th>
                  <th style="padding:10px 4px; text-align:left; border-bottom:2px solid #ccc; min-width:200px;">Tên Thành Viên</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">P.TCAID</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; min-width:80px;">Match</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">UserID</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">RefID</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:100px;">Action</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">refSysId</th>
                  <th style="padding:10px 4px; text-align:left; border-bottom:2px solid #ccc; min-width:180px;">Email</th>
                  <th style="padding:10px 4px; text-align:left; border-bottom:2px solid #ccc; width:100px;">Phone</th>
                  <!-- 10 cột mới bổ sung (không có Địa Chỉ, không trùng Cấp) -->
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">Điểm CN</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">Điểm Đội</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">Ngày Gia Nhập</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">Ngày Nộp HĐ</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">Ngày Thăng Hạng</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">BH</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">TD</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">% CN</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">% Đội</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc;">Cấp TV</th>
                </tr>
              </thead>
              <tbody id="tca-nodes-body"></tbody>
            </table>
          </div>
        </div>
        
        <!-- Cột Log (Phải) -->
        <div style="width:250px; background:#f9f9f9; display:flex; flex-direction:column; flex-shrink:0;">
          <div style="padding:8px; background:#e0e0e0; font-weight:bold; font-size:11px; color:#555;">NHẬT KÝ HOẠT ĐỘNG</div>
          <div id="tca-log-content" style="flex:1; overflow-y:auto; padding:8px; font-family:monospace; font-size:10px; line-height:1.4; color:#444;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    updateLogDisplay();
    addTcaLog('Đã sẵn sàng v7.2.0: Mở rộng 10 cột (Điểm CN, Điểm Đội, Ngày Gia Nhập, Ngày Nộp HĐ, Ngày Thăng Hạng, BH, TD, % CN, % Đội, Cấp TV)');
    
    // Gán sự kiện
    document.getElementById('btn-close').addEventListener('click', () => panel.remove());
    document.getElementById('btn-csv').addEventListener('click', () => window.downloadTCACSV());
    document.getElementById('btn-json').addEventListener('click', () => window.downloadTCAJSON());
    document.getElementById('btn-final-sync-header').addEventListener('click', () => executeSyncFromHeader());
    
    const checkAll = document.getElementById('check-all-nodes');
    checkAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      document.querySelectorAll('.node-checkbox').forEach(cb => cb.checked = isChecked);
      updateSelectedCount();
    });

    // Điền dữ liệu vào bảng
    const tbody = document.getElementById('tca-nodes-body');
    const displayRows = previewRows.length > 0 ? previewRows : allNodes;
    
    // Lấy thông tin chi tiết từ allNodes và memberInfoCache cho 12 cột mới
    // Xử lý "Không có thông tin" -> "-"
    const cleanDate = (val) => {
      if (!val || val === 'null' || val === 'undefined' || val.includes('Không có thông tin')) return '-';
      return val;
    };
    const getNodeExtra = (id) => {
      const node = allNodes.find(n => n.id === id);
      const info = memberInfoCache[id] || {};
      return {
        personalScore: node?.personalScore || '-',
        totalScore: node?.totalScore || '-',
        level: node?.level || '1',
        location: node?.location || '-',
        personalRate: node?.personalRate || '-',
        teamRate: node?.teamRate || '-',
        hasBH: node?.hasBH ? '✓' : '-',
        hasTD: node?.hasTD ? '✓' : '-',
        address: info?.address || '-',
        joinDate: cleanDate(info?.joinDate),
        contractDate: cleanDate(info?.contractDate),
        promotionDate: cleanDate(info?.promotionDate)
      };
    };
    
    displayRows.forEach((row, idx) => {
      const tcaId = Number(row.id) || 0;
      const name = row.name || '-';
      const parentTcaId = row.parentTcaId || '-';
      const match = row.match || '-';
      const action = row.action || 'SKIP';
      const email = row.email || '-';
      const phone = row.phone || '-';

      // Lấy 12 trường bổ sung
      const extra = getNodeExtra(tcaId);
      
      // So sánh điểm số TCA với DB để tô màu
      const tcaScores = row.tcaScores || {};
      const dbScores = row.dbScores || {};
      const hasScoreChange = row.hasScoreChange || false;
      const needSync = action && action !== 'SKIP' && action !== '-';
      
      // Màu điểm số: đỏ nếu khác nhau, xanh nếu giống hoặc chưa có DB
      const pScoreChanged = hasScoreChange && (tcaScores.personalScore !== dbScores.personalScore);
      const tScoreChanged = hasScoreChange && (tcaScores.totalScore !== dbScores.totalScore);
      const personalScoreColor = pScoreChanged ? '#d32f2f' : (dbScores.personalScore ? '#2e7d32' : '#999');
      const totalScoreColor = tScoreChanged ? '#d32f2f' : (dbScores.totalScore ? '#1565c0' : '#999');
      
      // Hiển thị: "TCA -> DB" nếu khác nhau
      const displayPersonalScore = dbScores.personalScore != null 
        ? `${tcaScores.personalScore || 0} → ${dbScores.personalScore}`
        : (tcaScores.personalScore || '-');
      const displayTotalScore = dbScores.totalScore != null 
        ? `${tcaScores.totalScore || 0} → ${dbScores.totalScore}`
        : (tcaScores.totalScore || '-');

      // --- DÙNG TRỰC TIẾP previewRows (không transform) ---
      // Chỉ render row ra bảng, KHÔNG tạo mảng riêng
      const userId = row.userId;
      // Transform: Ưu tiên DB referrerId (đúng), fallback TCA proposal
      const hasDbReferrer = row.db && (row.db.referrerId !== null && row.db.referrerId !== undefined);
      const referrerId = hasDbReferrer ? Number(row.db.referrerId) : Number(row.referrerId || 0);
      // refSysId: Dùng trực tiếp từ TCA hoặc DB (khác với referrerId!)
      const refSysId = row.refSysId != null ? Number(row.refSysId) : (row.db?.refSysId != null ? Number(row.db.refSysId) : 0);
      
      // --- RENDER GIAO DIỆN ---
      const tr = document.createElement('tr');
      tr.style.background = idx % 2 === 0 ? '#ffffff' : '#f9f9f9';
      tr.style.borderBottom = '1px solid #eee';

      const userIdColor = (row.db?.userId) ? '#1565c0' : (userId ? '#d32f2f' : '#999');
      const refIdColor = (row.db?.referrerId != null) ? '#1565c0' : (referrerId != null ? '#d32f2f' : '#999');
      const refSysIdColor = (row.db?.refSysId != null) ? '#1565c0' : '#d32f2f';

      let matchDisplay = match;
      let matchColor = '#999';
      // S: Da co System - MAU XANH
      if (match?.includes('S')) { matchColor = '#2e7d32'; }
      // TCA: Da co trong TCAMember - MAU CAM
      else if (match?.includes('TCA')) { matchColor = '#ff9800'; }
      // PE/Pe/pE: Co trong User - MAU HONG
      else if (match?.match(/PE|Pe|pE/)) { matchColor = '#c2185b'; }
      // N: Moi hoan toan - MAU XAM
      else if (match === 'N') { matchColor = '#555'; }
      // Default
      else { matchColor = '#999'; }
      
      let actionLabel = action;
      let actionBg = '#999';
      if (action === 'CREATE_ALL') { actionLabel = 'Tạo All'; actionBg = '#2e7d32'; }
      else if (action === 'CREATE_SYSTEM') { actionLabel = 'Tạo Sys'; actionBg = '#1565c0'; }
      else if (action === 'UPDATE') { actionLabel = 'Cập nhật'; actionBg = '#f57c00'; }
      else if (action === 'SKIP') { actionLabel = 'Bỏ qua'; actionBg = '#999'; }

      // Checkbox: chỉ check nếu cần sync
      const checkboxChecked = needSync ? 'checked' : '';

      tr.innerHTML = `
        <td style="padding:6px 2px; text-align:center;">
          <input type="checkbox" class="node-checkbox" data-tca-id="${tcaId}" ${checkboxChecked}>
        </td>
        <td style="padding:6px 2px; text-align:center; color:#999; font-size:10px;">${idx + 1}</td>
        <td style="padding:6px 2px; text-align:center; font-family:monospace; font-weight:bold;">${tcaId}</td>
        <td style="padding:6px 4px; color:#000; min-width:200px; font-weight:500;" title="${name}">${name}</td>
        <td style="padding:6px 2px; text-align:center; color:#666;">${parentTcaId}</td>
        <td style="padding:6px 2px; text-align:center; min-width:80px;"><span style="background:${matchColor};color:white;padding:2px 6px;border-radius:2px;font-size:9px;white-space:nowrap;">${matchDisplay}</span></td>
        <td style="padding:6px 2px; text-align:center; color:${userIdColor}; font-weight:bold;">${userId || '-'}</td>
        <td style="padding:6px 2px; text-align:center; color:${refIdColor}; font-weight:bold;">${referrerId != null ? referrerId : '-'}</td>
        <td style="padding:6px 2px; text-align:center;"><span style="background:${actionBg};color:white;padding:2px 6px;border-radius:3px;font-size:9px;">${actionLabel}</span></td>
        <td style="padding:6px 2px; text-align:center; color:${refSysIdColor}; font-weight:bold;">${refSysId || '-'}</td>
        <td style="padding:6px 4px; color:#666; font-size:10px; min-width:180px;" title="${email}">${email}</td>
        <td style="padding:6px 4px; color:#666; font-size:10px;">${phone}</td>
        <!-- 10 cột mới bổ sung (không có Địa Chỉ, không trùng Cấp) -->
        <td style="padding:6px 2px; text-align:center; color:${personalScoreColor}; font-weight:bold;" ${pScoreChanged ? 'title="Điểm thay đổi"' : ''}>${displayPersonalScore}</td>
        <td style="padding:6px 2px; text-align:center; color:${totalScoreColor}; font-weight:bold;" ${tScoreChanged ? 'title="Điểm thay đổi"' : ''}>${displayTotalScore}</td>
        <td style="padding:6px 2px; text-align:center; color:#666; font-size:10px;">${extra.joinDate}</td>
        <td style="padding:6px 2px; text-align:center; color:#666; font-size:10px;">${extra.contractDate}</td>
        <td style="padding:6px 2px; text-align:center; color:#666; font-size:10px;">${extra.promotionDate}</td>
        <td style="padding:6px 2px; text-align:center; color:#2e7d32; font-weight:bold;">${extra.hasBH}</td>
        <td style="padding:6px 2px; text-align:center; color:#1565c0; font-weight:bold;">${extra.hasTD}</td>
        <td style="padding:6px 2px; text-align:center; color:#666;">${extra.personalRate}</td>
        <td style="padding:6px 2px; text-align:center; color:#666;">${extra.teamRate}</td>
        <td style="padding:6px 2px; text-align:center; color:#7b1fa2; font-weight:bold;">${extra.level}</td>
      `;
      tbody.appendChild(tr);
    });

    updateSelectedCount();
    document.querySelectorAll('.node-checkbox').forEach(cb => cb.addEventListener('change', updateSelectedCount));
    window.tcaExtractedData = { allNodes, viewStats, memberInfo, previewRows };
  }

  function updateLogDisplay() {
    const logContainer = document.getElementById('tca-log-content');
    if (logContainer) {
      logContainer.innerHTML = tcaLogs.map(l => `<div style="border-bottom:1px solid #eee;padding:4px 0;word-break:break-all;">${l}</div>`).join('');
    }
  }

  function updateSelectedCount() {
    const checked = document.querySelectorAll('.node-checkbox:checked').length;
    const label = document.getElementById('selected-count-label');
    if (label) label.textContent = `Đã chọn: ${checked}`;
  }

  async function prepareAndShowDemo() {
    const selectedCheckboxes = document.querySelectorAll('.node-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.tcaId));
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thành viên!');
      return;
    }

    addTcaLog(`Đang tạo dữ liệu mẫu Local cho ${selectedIds.length} thành viên...`);
    // DÙNG TRỰC TIẾP previewRows (không tạo mảng riêng)
    const selectedRows = previewRows.filter(r => selectedIds.includes(Number(r.id)));
    
    // --- THUẬT TOÁN TẠO BẢNG DỮ LIỆU MÔ PHỎNG (LOCAL) ---
    const tables = {
      User: selectedRows.map(n => ({
        id: n.userId,
        name: n.name,
        email: n.email,
        phone: n.phone,
        referrerId: n.referrerId || 0
      })),
      System: selectedRows.map(n => ({
        userId: n.userId,
        refSysId: n.refSysId || 0
      })),
      TCAMember: selectedRows.map(n => ({
        tcaId: n.id,
        userId: n.userId,
        name: n.name,
        email: n.email,
        phone: n.phone,
        parentTcaId: n.parentTcaId
      })),
      user_closure: [],
      system_closure: []
    };

    // Tạo closure cơ bản (tự tham chiếu depth 0 và cha trực tiếp depth 1)
    selectedRows.forEach(n => {
      const uid = Number(n.userId) || 0;
      const ref = Number(n.referrerId) || 0;
      const sys = Number(n.refSysId) || 0;
      if (uid) {
        tables.user_closure.push({ ancestor: uid, descendant: uid, depth: 0 });
        if (ref) tables.user_closure.push({ ancestor: ref, descendant: uid, depth: 1 });
        tables.system_closure.push({ ancestor: uid, descendant: uid, depth: 0 });
        if (sys) tables.system_closure.push({ ancestor: sys, descendant: uid, depth: 1 });
      }
    });

    addTcaLog('Bảng mẫu Local đã được xây dựng thành công.');
    
    // Gửi previewRows TRỰC TIẾP cho table display (không cần expectedIdsMap riêng)
    showDemoResultPanel(tables, selectedRows, memberInfoCache, previewRows);
  }

  function showDemoResultPanel(tables, selectedNodes, selectedMemberInfo, sourceRows) {
    const existing = document.getElementById('tca-demo-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'tca-demo-panel';
    panel.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); z-index: 1000000000;
      display: flex; justify-content: center; align-items: center;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      width: 95vw; height: 95vh; background: #fff; border-radius: 12px;
      display: flex; flex-direction: column; overflow: hidden;
    `;

    const tableNames = Object.keys(tables);
    let activeTab = tableNames[0];

    function renderTables() {
      return tableNames.map(name => `
        <div id="tab-content-${name}" style="display: ${name === activeTab ? 'block' : 'none'}; flex:1; overflow:auto;">
          <h3 style="padding: 10px 15px; margin:0; background:#e8f5e9; color:#2e7d32; position:sticky; top:0;">Bảng: ${name} (${tables[name].length} dòng)</h3>
          <table style="width:100%; border-collapse:collapse; font-size:11px; font-family:monospace;">
            <thead style="background:#f5f5f5; position:sticky; top:35px;">
              <tr>
                ${Object.keys(tables[name][0] || {}).map(k => `<th style="padding:8px; border:1px solid #ddd;">${k}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tables[name].map(row => `
                <tr>
                  ${Object.values(row).map(v => `<td style="padding:6px; border:1px solid #ddd; word-break:break-all;">${v === null ? '<span style="color:#ccc;">null</span>' : v}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('');
    }

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px; background:#2e7d32; color:white;">
        <div>
          <h2 style="margin:0; font-size:20px;">XEM TRƯỚC DỮ LIỆU SẼ ĐẨY VÀO DATABASE</h2>
          <small>Kiểm tra kỹ trước khi xác nhận đồng bộ thực tế</small>
        </div>
        <div style="display:flex; gap:10px;">
          <button id="btn-demo-cancel" style="background:rgba(255,255,255,0.2); border:1px solid white; color:white; padding:8px 20px; border-radius:5px; cursor:pointer; font-weight:bold;">QUAY LẠI SỬA</button>
          <button id="btn-promote" style="background:#ff9800; border:none; color:white; padding:8px 20px; border-radius:5px; cursor:pointer; font-weight:bold;">🚀 ĐẨY LÊN PRODUCTION</button>
          <button id="btn-final-sync" style="background:#ffeb3b; border:none; color:#333; padding:10px 30px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:14px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">✅ XÁC NHẬN ĐỒNG BỘ THẬT</button>
        </div>
      </div>
      
      <div style="display:flex; background:#f0f0f0; border-bottom:1px solid #ddd;">
        ${tableNames.map(name => `
          <div class="demo-tab" data-tab="${name}" style="padding:12px 25px; cursor:pointer; font-weight:bold; border-right:1px solid #ddd; ${name === activeTab ? 'background:#fff; color:#2e7d32; border-bottom:3px solid #2e7d32;' : 'color:#666;'}">
            ${name}
          </div>
        `).join('')}
      </div>
      
      <div id="demo-tab-container" style="flex:1; overflow:hidden; display:flex; flex-direction:column;">
        ${renderTables()}
      </div>
    `;

    panel.appendChild(content);
    document.body.appendChild(panel);

    // Tab logic
    document.querySelectorAll('.demo-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        document.querySelectorAll('.demo-tab').forEach(t => {
          t.style.background = t.dataset.tab === activeTab ? '#fff' : '#f0f0f0';
          t.style.color = t.dataset.tab === activeTab ? '#2e7d32' : '#666';
          t.style.borderBottom = t.dataset.tab === activeTab ? '3px solid #2e7d32' : 'none';
        });
        tableNames.forEach(name => {
          document.getElementById(`tab-content-${name}`).style.display = name === activeTab ? 'block' : 'none';
        });
      });
    });

    document.getElementById('btn-demo-cancel').addEventListener('click', () => panel.remove());
    
    // Nút Promote - Copy Test data lên Production
    document.getElementById('btn-promote').addEventListener('click', () => {
      if (!confirm('Đẩy dữ liệu Test lên Production?\n\nSau khi đẩy, dữ liệu Test sẽ bị XÓA.')) return;
      if (!confirm('Xác nhận lần cuối?')) return;
      
      const url = API_BASE + '/api/sync-tca/promote';
      addTcaLog('Đang Promote dữ liệu Test lên Production...');
      
      fetch(url, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            addTcaLog('✅ Promote thành công! ' + data.message);
            alert('Promote thành công!\n' + data.message);
          } else {
            addTcaLog('❌ Promote thất bại: ' + data.error);
            alert('Lỗi: ' + data.error);
          }
        })
        .catch(err => {
          addTcaLog('Lỗi: ' + err.message);
        });
    });
    
    // Nút Xác nhận - Ghi vào bảng Test (Staging)
    document.getElementById('btn-final-sync').addEventListener('click', () => {
      if (confirm('BẠN CÓ CHẮC CHẮN? Dữ liệu sẽ được ghi thật vào Database ngay bây giờ.')) {
        panel.remove();
        executeFinalSync(previewRows, selectedMemberInfo);
      }
    });
  }

  async function executeSyncFromHeader() {
    // Lấy các checkbox được chọn
    const selectedCheckboxes = document.querySelectorAll('.node-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.tcaId));
    
    // Lấy thông tin root từ overviewData (đã parse đúng format decimal từ injected-script)
    const overview = window.tcaOverviewData;
    const rootPersonal = overview ? Number(overview.personal_points).toFixed(3) : '0';
    const rootTeam = overview ? Number(overview.team_points).toFixed(3) : '0';
    const rootLevel = overview?.level || '?';
    const hasRootData = overview && (overview.personal_points > 0 || overview.team_points > 0);
    
    if (selectedIds.length === 0 && !hasRootData) {
      alert('Không có thành viên nào được chọn và root không có dữ liệu!');
      return;
    }
    
    // Lọc previewRows chỉ lấy các member được chọn (nếu có)
    let syncRows = previewRows;
    if (selectedIds.length > 0) {
      syncRows = previewRows.filter(r => selectedIds.includes(Number(r.id)));
    } else {
      syncRows = [];
    }
    
    // Thông báo chi tiết
    const msg = `XÁC NHẬN ĐỒNG BỘ\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 ROOT #861:\n` +
      `   • Điểm CN: ${rootPersonal}\n` +
      `   • Điểm Đội: ${rootTeam}\n` +
      `   • Cấp: ${rootLevel}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👥 Members được chọn: ${selectedIds.length}\n` +
      `   (Dòng sẽ sync: ${syncRows.length})`;
    
    if (!confirm(msg)) {
      return;
    }
    
    addTcaLog(`🚀 Bắt đầu đồng bộ - Root CN:${rootPersonal} Đội:${rootTeam}...`);
    executeFinalSync(syncRows, memberInfoCache);
  }

  async function executeFinalSync(sourceRows, memberInfo) {
    // Transform same as Table Display before sending to API
    const syncRows = (sourceRows || []).map(row => {
      // referrerId: DB trước, fallback TCA (như table display)
      const hasDbReferrer = row.db && row.db.referrerId != null;
      const referrerId = hasDbReferrer ? Number(row.db.referrerId) : Number(row.referrerId || 0);
      // refSysId: TCA trước, fallback DB (như table display)
      const refSysId = row.refSysId != null ? Number(row.refSysId) : (row.db?.refSysId != null ? Number(row.db.refSysId) : 0);
      
      // === FIX CLIENT-SIDE: Override action dựa trên match ===
      // Production server có thể trả SKIP nhưng ta vẫn cần update điểm/email/phone
      let action = row.action || 'SKIP';
      const match = row.match || '';
      
      if (action === 'SKIP' || action === '') {
        // Phân tích lại match type để xác định đúng action
        if (match === 'PE S TCA' || match === 'S TCA PE' || match === 'PE TCA S') {
          action = 'TCA';           // Đủ hết → chỉ cập nhật điểm TCAMember
        } else if (match === 'Pe S TCA' || match === 'Pe TCA S' || match === 'S TCA Pe') {
          action = 'E TCA';         // Đủ hết + email khác → update email + điểm
        } else if (match === 'pE S TCA' || match === 'pE TCA S' || match === 'S TCA pE') {
          action = 'P TCA';         // Đủ hết + phone khác → update phone + điểm
        } else if (match === 'S TCA') {
          action = 'TCA';           // Có System+TCA → chỉ cập nhật điểm
        }
        // Các trường hợp khác giữ SKIP (N, chưa có đủ thông tin)
      }
      
      return {
        id: row.id,
        name: row.name,
        userId: row.userId,
        referrerId: referrerId,
        refSysId: refSysId,
        action: action,             // Dùng action đã override
        match: match,
        parentTcaId: row.parentTcaId,
        email: row.email,
        phone: row.phone
      };
    });
    
    console.log('[SYNC] === SYNC ROWS (first 3) ===');
    syncRows.slice(0, 3).forEach((r, i) => {
      console.log(`[SYNC] Row ${i+1}: id=${r.id}, userId=${r.userId}, referrerId=${r.referrerId}, refSysId=${r.refSysId}, action=${r.action}`);
    });
    console.log('[SYNC] === END ===');
    
    const progressPanel = document.createElement('div');
    progressPanel.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 400px; background: #fff; border-radius: 12px; z-index: 2000000000;
      padding: 30px; box-shadow: 0 10px 50px rgba(0,0,0,0.5); text-align: center;
    `;
    progressPanel.innerHTML = `
      <h2 style="color:#2e7d32; margin-top:0;">ĐANG ĐẨY DỮ LIỆU...</h2>
      <div style="margin: 20px 0; font-size: 14px; color:#666;">Vui lòng không đóng trình duyệt.</div>
      <div style="width:100%; height:8px; background:#eee; border-radius:4px; overflow:hidden;">
        <div id="sync-progress" style="width:30%; height:100%; background:#2e7d32; transition:width 0.5s;"></div>
      </div>
    `;
    document.body.appendChild(progressPanel);
    addTcaLog('Bắt đầu đẩy dữ liệu thật vào DB...');

    try {
      // GỬI syncRows (đã transform giống table display) lên API
      // Gửi kèm allNodesGlobal để server lấy personalScore, totalScore, level
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'TCA_EXT_PREVIEW_ROWS',
          timestamp: Date.now(),
          previewRows: syncRows,
          memberInfo: memberInfo,
          // Gửi allNodes để server đọc điểm số khi upsert TCAMember
          allNodes: allNodesGlobal.map(n => ({
            id: n.id,
            isRootNode: n.isRootNode || false,
            personalScore: n.personalScore || '0',
            totalScore: n.totalScore || '0',
            level: n.level || '1',
            groupName: n.groupName || '',
            hasBH: n.hasBH || false,
            hasTD: n.hasTD || false,
            personalRate: n.personalRate || '-',
            teamRate: n.teamRate || '-'
          })),
          // Overview data - điểm tổng hệ thống từ dòng "Tổ chức phân nhánh"
          overviewData: window.tcaOverviewData || null
        })
      });

      const result = await response.json();
      console.log('[SYNC] Response:', JSON.stringify(result).slice(0, 500));
      progressPanel.remove();

      if (result.success) {
        const syncId = result.syncId || 'N/A';
        addTcaLog(`✅ ĐỒNG BỘ THÀNH CÔNG! Phiên: ${syncId}`);
        addTcaLog(`Sử dụng mã phiên trên tại /tools/tca-sync nếu cần Rollback.`);
        
        alert(`CHÚC MỪNG! Dữ liệu đã được đồng bộ an toàn.\n\nMã phiên (SyncID): ${syncId}\n\nLưu ý: Bạn có thể hoàn tác (Rollback) phiên này tại trang công cụ hệ thống.`);
      } else {
        addTcaLog(`❌ LỖI ĐỒNG BỘ: ${result.error}`);
        alert('Lỗi: ' + result.error);
      }
    } catch (err) {
      if (typeof progressPanel !== 'undefined') progressPanel.remove();
      addTcaLog(`LỖI KẾT NỐI: ${err.message}`);
    }
  }

  // DemoPreview - xem du lieu se tao (khong day len DB)
  window.callDemoPreview = async function() {
    const data = window.tcaExtractedData;
    if (!data || !data.allNodes || data.allNodes.length === 0) {
      alert('Chua co du lieu! Vui long quet TCA truoc.');
      return;
    }

    // Sử dụng API_BASE đã định nghĩa ở trên
    const url = API_BASE + '/api/sync-tca/demo-preview';

    console.log('[TCA Sync] Calling DemoPreview:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allNodes: data.allNodes,
          memberInfo: data.memberInfo
        })
      });

      const result = await response.json();
      console.log('[TCA Sync] DemoPreview result:', result);

      if (result.success) {
        // Hien ket qua trong alert
        const summary = result.summary;
        const msg = `🎯 DEMO PREVIEW RESULTS\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Tong TCA: ${summary.totalTCA}\n` +
          `Users (create): ${summary.usersToCreate}\n` +
          `Users (exists): ${summary.usersExists}\n` +
          `User Closures: ${summary.userClosures}\n` +
          `TCAMembers: ${summary.tcaMembers}\n` +
          `Systems: ${summary.systems}\n` +
          `System Closures: ${summary.systemClosures}\n\n` +
          `Xem chi tiet trong console!`;

        alert(msg);

        // Log chi tiet ra console
        console.table(result.tables.User);
        console.table(result.tables.System);
        console.table(result.tables.SystemClosure);
      } else {
        alert('Loi: ' + result.error);
      }
    } catch (err) {
      console.error('[TCA Sync] DemoPreview error:', err);
      alert('Loi goi API: ' + err.message);
    }
  };

  // ShowData - xem du lieu cac bang
  window.callShowData = async function() {
    const data = window.tcaExtractedData;
    if (!data || !data.allNodes || data.allNodes.length === 0) {
      alert('Chua co du lieu! Vui long quet TCA truoc.');
      return;
    }

    // Sử dụng API_BASE đã định nghĩa ở trên
    const url = API_BASE + '/api/sync-tca/show-data';

    console.log('[TCA Sync] Calling ShowData:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allNodes: data.allNodes,
          memberInfo: data.memberInfo
        })
      });

      const result = await response.json();
      console.log('[TCA Sync] ShowData result:', result);

      if (result.success) {
        const summary = result.summary;
        const msg = `📊 SHOW DATA RESULTS\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Users: ${summary.users}\n` +
          `user_closure: ${summary.userClosures}\n` +
          `TCAMember: ${summary.tcaMembers}\n` +
          `System: ${summary.systems}\n` +
          `SystemClosure: ${summary.systemClosures}\n\n` +
          `Xem chi tiet trong console!`;

        alert(msg);

        // Log chi tiet ra console
        console.log('=== User ===');
        console.table(result.tables.User);
        console.log('=== user_closure ===');
        console.table(result.tables.user_closure);
        console.log('=== TCAMember ===');
        console.table(result.tables.TCAMember);
        console.log('=== System ===');
        console.table(result.tables.System);
        console.log('=== SystemClosure ===');
        console.table(result.tables.SystemClosure);
      } else {
        alert('Loi: ' + result.error);
      }
    } catch (err) {
      console.error('[TCA Sync] ShowData error:', err);
      alert('Loi goi API: ' + err.message);
    }
  };

window.downloadTCACSV = function() {
    const data = window.tcaExtractedData;
    if (!data || !data.previewRows) {
      alert('Chưa có dữ liệu để tải!');
      return;
    }

    // TRỰC TIẾP từ previewRows (giống y hệt bảng đang hiển thị)
    // Bổ sung 11 cột mới: Điểm CN, Điểm Đội, Địa Chỉ, Ngày Gia Nhập, Ngày Nộp HĐ, Ngày Thăng Hạng, BH, TD, % CN, % Đội, Cấp TV (Địa Chỉ luôn có trong file export dù ẩn ở bảng)
    const BOM = '\uFEFF';
    let csv = BOM + 'TCAID,Ten,P.TCAID,Match,UserID,RefID,Action,refSysId,Email,Phone,DiemCN,DiemDo,DiaChi,NgayGiaNhap,NgayNopHD,NgayThangHang,BH,TD,PCN,PDoi,CapTV\n';
    
    // Lấy thông tin chi tiết từ allNodes và memberInfoCache cho 11 cột mới (có Địa Chỉ)
    const getNodeExtra = (id) => {
      const node = (data.allNodes || []).find(n => n.id === id);
      const info = (data.memberInfo || {})[id] || {};
      return {
        personalScore: node?.personalScore || '-',
        totalScore: node?.totalScore || '-',
        level: node?.level || '1',
        location: node?.location || '-',
        personalRate: node?.personalRate || '-',
        teamRate: node?.teamRate || '-',
        hasBH: node?.hasBH ? '✓' : '-',
        hasTD: node?.hasTD ? '✓' : '-',
        address: info?.address || '-',
        joinDate: info?.joinDate || '-',
        contractDate: info?.contractDate || '-',
        promotionDate: info?.promotionDate || '-'
      };
    };
    
    data.previewRows.forEach(row => {
      const tcaId = row.id || '';
      const ten = row.name || '';
      const pTcaId = row.parentTcaId || '-';
      const match = row.match || '-';
      const userId = row.userId || '';
      // Transform: Ưu tiên DB referrerId (đúng với table), fallback TCA
      const hasDbRef = row.db && (row.db.referrerId !== null && row.db.referrerId !== undefined);
      const refId = hasDbRef ? Number(row.db.referrerId) : Number(row.referrerId || 0);
      const actionVal = row.action || '-';
      // refSysId: Dùng trực tiếp từ TCA hoặc DB
      const refSysId = row.refSysId != null ? Number(row.refSysId) : (row.db?.refSysId != null ? Number(row.db.refSysId) : 0);
      const email = row.email || '';
      const phone = row.phone || '';
      
      // Lấy 11 trường bổ sung (có Địa Chỉ)
      const extra = getNodeExtra(Number(tcaId));
      
      csv += `${tcaId},"${ten}",${pTcaId},${match},${userId},${refId},${actionVal},${refSysId},"${email}","${phone}",${extra.personalScore},${extra.totalScore},"${extra.address}","${extra.joinDate}","${extra.contractDate}","${extra.promotionDate}",${extra.hasBH},${extra.hasTD},${extra.personalRate},${extra.teamRate},${extra.level}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `tca_data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    
console.log('[TCA Sync] CSV downloaded! Rows:', data.previewRows.length);
  }

  window.downloadTCAJSON = function() {
    const data = window.tcaExtractedData;
    if (!data) {
      alert('Chưa có dữ liệu để tải!');
      return;
    }

    // Build previewRows map (từ bảng TCA Dashboard đang hiển thị)
    const previewMap = new Map();
    (data.previewRows || []).forEach(row => previewMap.set(row.id, row));
    
    // Enrich data với previewRows (UserID từ bảng đang hiển thị) + 11 cột mới (có Địa Chỉ trong file export dù ẩn ở bảng)
    const enrichedData = data.allNodes.map(node => {
      const previewRow = previewMap.get(node.id);
      const memberInfo = (data.memberInfo || {})[node.id] || {};
      return {
        ...node,
        match: previewRow?.match || '-',
        action: previewRow?.action || '-',
        userId: previewRow?.userId || null,
        referrerId: previewRow?.referrerId || null,
        refSysId: previewRow?.refSysId || null,
        // 11 cột mới bổ sung (có Địa Chỉ: location + address)
        personalScore: node.personalScore || '-',
        totalScore: node.totalScore || '-',
        level: node.level || '1',
        location: node.location || '-',
        address: memberInfo.address || '-',
        personalRate: node.personalRate || '-',
        teamRate: node.teamRate || '-',
        hasBH: node.hasBH || false,
        hasTD: node.hasTD || false,
        joinDate: memberInfo.joinDate || '-',
        contractDate: memberInfo.contractDate || '-',
        promotionDate: memberInfo.promotionDate || '-'
      };
    });

    const blob = new Blob([JSON.stringify({ ...data, enrichedData }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tca_data_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[TCA Sync] JSON downloaded!');
  };

  async function handleFullTree(data) {
    console.log('[TCA Sync] handleFullTree received data:', data);
    
    // Build allNodes
    const allNodes = [];
    if (data.tree) {
      data.tree.forEach(folder => {
        if (folder.nodes) {
          folder.nodes.forEach(node => {
            allNodes.push({
              ...node,
              parentFolderId: folder.id === 'root' ? null : folder.id
            });
          });
        }
      });
    }

    // Lưu allNodes toàn cục để dùng sau
    allNodesGlobal = allNodes;
    
    // Merge member info
    memberInfoCache = data.memberInfo || {};
    
    // Add email/phone to nodes
    allNodes.forEach(node => {
      if (memberInfoCache[node.id]) {
        node.email = memberInfoCache[node.id].email;
        node.phone = memberInfoCache[node.id].phone;
      }
    });

    console.log('[TCA Sync] Built allNodes:', allNodes.length, 'nodes');
    console.log('[TCA Sync] Member info:', Object.keys(memberInfoCache).length, 'contacts');

    // KHÔNG gọi precheck ở đây - sẽ gọi sau khi member info fetch xong
    
    // Save to localStorage
    try {
      localStorage.setItem('tca_full_tree', JSON.stringify({ ...data, allNodes, precheckCache }));
      console.log('[TCA Sync] Saved to localStorage');
    } catch (e) {
      console.error('[TCA Sync] localStorage error:', e);
    }

    // Show panel with precheck results
    if (allNodes.length > 0) {
      showDataPanel(allNodes, data.stats || { total: allNodes.length, folders: 0, items: allNodes.length }, memberInfoCache);
    }

    // Gọi extractOverviewData để lấy điểm tổng hệ thống
    // Thử đọc từ localStorage trước, nếu không có thì gọi function
    const tryExtractOverview = () => {
      // THỬ ĐỌC từ localStorage trước
      let overview = null;
      try {
        const stored = localStorage.getItem('tcaOverviewData');
        if (stored) {
          overview = JSON.parse(stored);
          console.log('[TCA Sync] 📊 Đọc overview từ localStorage:', overview);
        }
      } catch (e) {}
      
      // Nếu không có trong localStorage, thử gọi function
      if (!overview && typeof window.extractTcaOverview === 'function') {
        overview = window.extractTcaOverview();
      }
      
      if (overview) {
        window.tcaOverviewData = overview;
        
        // Chỉ lấy phần quan trọng từ raw_text - tìm dòng "Tổ chức phân nhánh"
        const rootLine = (overview.raw_text || '').split('\n').find(l => l.includes('Tổ chức phân nhánh')) || overview.raw_text || '';
        
        const cn = Number(overview.personal_points).toFixed(3);
        const dd = Number(overview.team_points).toFixed(3);
        
        addTcaLog(`📊 ROOT: ${rootLine.substring(0, 60)}...`);
        addTcaLog(`   ▸ CN: ${cn} | ĐỘI: ${dd} | Cấp: ${overview.level}`);
        
        window.tcaRootFormatted = { cn, dd, level: overview.level };
      } else {
        addTcaLog('⚠️ Chưa có overview data - thử lại sau...');
        setTimeout(tryExtractOverview, 2000);
      }
    };
    
    // Bắt đầu thử sau 2s
    setTimeout(tryExtractOverview, 2000);

    console.log('==========================================');
    console.log('[TCA Sync] ✅ DATA EXTRACTED SUCCESS!');
    console.log('==========================================');
    console.log(`Total: ${allNodes.length} nodes`);
    console.log('Panel should be visible on screen (top-right corner)');
    console.log('Click "Download CSV" or "Download JSON" buttons');
  }

  function handleMessage(event) {
    if (!event.data || !event.data.type) return;
    
    if (event.data.type === FULL_TREE_TYPE) {
      handleFullTree(event.data);  // async - will run in background
    }
    
    if (event.data.type === MEMBER_INFO_TYPE) {
      handleMemberInfo(event.data);
    }
  }

  function init() {
    // Reset state khi khởi tạo
    memberInfoCache = {};
    precheckCache = {};
    pendingNodeIds = [];
    fetchedCount = 0;
    allNodesGlobal = [];
    precheckDone = false;
    
    injectScript();
    window.addEventListener('message', handleMessage);
    console.log('[TCA Sync] Content script initialized - RESET all state');
    console.log('[TCA Sync] Auto-scan enabled - will capture full tree');
  }

  init();
})();
