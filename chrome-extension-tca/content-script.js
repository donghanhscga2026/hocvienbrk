(function() {
  'use strict';

  const MESSAGE_TYPE = 'TCA_XHR_CAPTURE';
  const FULL_TREE_TYPE = 'TCA_FULL_TREE';
  const MEMBER_INFO_TYPE = 'TCA_MEMBER_INFO';

  // Auto-detect API base URL based on current environment
  const isLocalDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('ngrok');
  const API_BASE = isLocalDev ? 'http://localhost:3000' : 'https://giautoandien.io.vn';
  const SYNC_ENDPOINT = API_BASE + '/api/sync-tca';
  const PRECHECK_ENDPOINT = API_BASE + '/api/sync-tca/precheck';
  const SYNC_PREVIEW_ENDPOINT = API_BASE + '/api/sync-tca/preview';
  const PREVIEW_RESULT_KEY = 'tca_preview_result';

  console.log('[TCA Sync] API Base:', API_BASE);

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

  // Bước 1: Gọi /preview API để lấy bảng tổng hợp (thay thế /precheck)
  function callPreviewAPI(nodes) {
    return new Promise((resolve, reject) => {
      // Build allNodes format
      const allNodes = nodes.map(n => ({
        id: n.id,
        type: n.type,
        name: n.name,
        parentFolderId: n.parentFolderId
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

      console.log('[TCA Sync] === PREVIEW START ===');
      console.log('[TCA Sync] Nodes:', allNodes.length);
      console.log('[TCA Sync] API URL:', SYNC_PREVIEW_ENDPOINT);
      
      fetch(SYNC_PREVIEW_ENDPOINT, {
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
        
        // Lưu kết quả vào localStorage để dùng sau
        if (data.rows && data.rows.length > 0) {
          previewRows = data.rows;
          try {
            localStorage.setItem(PREVIEW_RESULT_KEY, JSON.stringify(data));
            console.log('[TCA Sync] Saved preview result to localStorage');
          } catch (e) {
            console.error('[TCA Sync] localStorage error:', e);
          }
        }
        
        console.log('[TCA Sync] === PREVIEW END ===');
        resolve(data);
      })
      .catch(err => {
        console.error('[TCA Sync] Preview ERROR:', err.message || err);
        resolve(null);
      });
    });
  }

  function handleMemberInfo(data) {
    const { memberId, email, phone } = data;
    memberInfoCache[memberId] = { email, phone };
    fetchedCount++;
    console.log(`[TCA Sync] 📋 Member contact updated: ${memberId} (${fetchedCount}/${allNodesGlobal.length})`);
    
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
    console.log('[TCA Sync] showDataPanel called with', allNodes.length, 'nodes');
    addTcaLog(`Đã quét xong ${allNodes.length} thành viên từ TCA.`);
    
    if (previewRows.length === 0) {
      try {
        const saved = localStorage.getItem(PREVIEW_RESULT_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          previewRows = data.rows || [];
          console.log('[TCA Sync] Loaded previewRows from localStorage:', previewRows.length);
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
      update: rows.filter(r => r.action === 'UPDATE').length,
      skip: rows.filter(r => r.action === 'SKIP').length,
      newUser: rows.filter(r => r.match === 'NEW').length,
      phoneEmail: rows.filter(r => r.match === 'PHONE_EMAIL').length
    };
    
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; background:#f5f5f5; border-bottom:2px solid #e0e0e0; flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:15px;">
          <h2 style="margin:0; color:#2e7d32; font-size:18px; font-weight:bold;">TCA Data Explorer <span style="font-size:10px; color:#999; font-weight:normal;">v4.1.2</span></h2>
          <div style="display:flex; gap:8px;">
            <button id="btn-sync-preview" style="background:#2e7d32; border:none; color:white; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">🚀 ĐỒNG BỘ NGAY</button>
            <button id="btn-csv" style="background:#1565c0; border:none; color:white; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">📥 CSV</button>
            <button id="btn-json" style="background:#7b1fa2; border:none; color:white; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">📄 JSON</button>
            <button id="btn-demo-preview-top" style="background:#e65100; border:none; color:white; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">🎯 DEMO</button>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:15px;">
          <div style="font-size:11px; color:#666; background:#fff; padding:4px 8px; border-radius:4px; border:1px solid #ddd;">
            <span style="color:#2e7d32; font-weight:bold;">Tạo: ${viewStats.createAll + viewStats.createSystem}</span> | 
            <span style="color:#f57c00; font-weight:bold;">Sửa: ${viewStats.update}</span> | 
            <span>Tổng: ${viewStats.total}</span>
          </div>
          <button id="btn-close" style="background:#d32f2f; border:none; color:white; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:14px;">X</button>
        </div>
      </div>
      
      <div style="display:flex; flex:1; overflow:hidden;">
        <!-- Cột Bảng dữ liệu (Trái) -->
        <div style="flex:1; display:flex; flex-direction:column; border-right:2px solid #e0e0e0; overflow:hidden;">
          <div style="flex:1; overflow:auto; padding:0;">
            <table style="width:100%; border-collapse:collapse; font-size:11px; min-width:1100px;">
              <thead style="position:sticky; top:0; background:#eeeeee; z-index:10; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                <tr>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:35px;">#</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">TCAID</th>
                  <th style="padding:10px 4px; text-align:left; border-bottom:2px solid #ccc; width:150px;">Tên Thành Viên</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">P.TCAID</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">Match</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">UserID</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">RefID</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:100px;">Action</th>
                  <th style="padding:10px 4px; text-align:center; border-bottom:2px solid #ccc; width:60px;">refSysId</th>
                  <th style="padding:10px 4px; text-align:left; border-bottom:2px solid #ccc; width:120px;">Email</th>
                  <th style="padding:10px 4px; text-align:left; border-bottom:2px solid #ccc; width:100px;">Phone</th>
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
    addTcaLog('Hệ thống đã áp dụng logic đối chiếu dữ liệu v4.1.2: Ưu tiên Referrer hiện tại từ DB (bao gồm ID 0).');
    
    // Gán sự kiện
    document.getElementById('btn-close').addEventListener('click', () => panel.remove());
    document.getElementById('btn-csv').addEventListener('click', () => {
      addTcaLog('Bắt đầu tải file CSV...');
      window.downloadTCACSV();
    });
    document.getElementById('btn-json').addEventListener('click', () => {
      addTcaLog('Bắt đầu tải file JSON...');
      window.downloadTCAJSON();
    });
    document.getElementById('btn-sync-preview').addEventListener('click', () => {
      addTcaLog('Mở bảng điều khiển đồng bộ...');
      showSyncPreviewPanel();
    });
    document.getElementById('btn-demo-preview-top').addEventListener('click', () => {
      addTcaLog('Đang chạy Demo Preview (Simulated)...');
      window.callDemoPreview();
    });

    // Điền dữ liệu vào bảng
    const tbody = document.getElementById('tca-nodes-body');
    const displayRows = previewRows.length > 0 ? previewRows : allNodes;
    
    displayRows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.style.background = idx % 2 === 0 ? '#ffffff' : '#f9f9f9';
      tr.style.borderBottom = '1px solid #eee';
      
      const tcaId = row.id || row.tcaId;
      const name = row.name || '-';
      const parentTcaId = row.parentTcaId || '-';
      const match = row.match || '-';
      const action = row.action || 'SKIP';
      const email = row.email || '-';
      const phone = row.phone || '-';

      // --- LOGIC ĐỐI CHIẾU DỮ LIỆU CHÍNH XÁC ---
      
      // 1. UserID: Ưu tiên DB (Xanh), nếu mới thì lấy đề xuất (Đỏ)
      const dbUserId = row.db?.userId;
      const newUserId = row.userId;
      const userIdVal = dbUserId || newUserId || '-';
      const userIdColor = dbUserId ? '#1565c0' : (newUserId ? '#d32f2f' : '#999');

      // 2. RefID (referrerId): 
      // NẾU User đã tồn tại trong DB VÀ đã có referrerId (kể cả 0) => Hiện cái cũ (Xanh)
      // NẾU CHƯA CÓ hoặc User MỚI => Theo TCA (Đỏ)
      const hasDbReferrer = row.db && (row.db.referrerId !== null && row.db.referrerId !== undefined);
      const refIdVal = hasDbReferrer ? row.db.referrerId : (row.referrerId !== undefined ? row.referrerId : '-');
      const refIdColor = hasDbReferrer ? '#1565c0' : (row.referrerId !== undefined ? '#d32f2f' : '#999');

      // 3. refSysId: Tuân thủ cấu trúc TCA (Đỏ nếu tạo mới, Xanh nếu trùng DB hiện tại)
      const tcaRefSysId = row.refSysId; // Đây là parent theo TCA đã được Server tính toán
      const dbRefSysId = row.db?.refSysId;
      const refSysIdVal = tcaRefSysId !== undefined ? tcaRefSysId : (dbRefSysId || '-');
      const refSysIdColor = (tcaRefSysId !== undefined && tcaRefSysId === dbRefSysId) ? '#1565c0' : '#d32f2f';

      // Match display
      let matchDisplay = '-';
      let matchColor = '#999';
      if (match === 'PHONE_EMAIL') { matchDisplay = 'P+E'; matchColor = '#2e7d32'; }
      else if (match === 'PHONE_ONLY') { matchDisplay = 'P'; matchColor = '#1565c0'; }
      else if (match === 'EMAIL_ONLY') { matchDisplay = 'E'; matchColor = '#c2185b'; }
      else if (match === 'NEW') { matchDisplay = 'NEW'; matchColor = '#555'; }
      
      // Action display
      let actionLabel = action;
      let actionBg = '#999';
      if (action === 'CREATE_ALL') { actionLabel = 'Tạo All'; actionBg = '#2e7d32'; }
      else if (action === 'CREATE_SYSTEM') { actionLabel = 'Tạo Sys'; actionBg = '#1565c0'; }
      else if (action === 'UPDATE') { actionLabel = 'Cập nhật'; actionBg = '#f57c00'; }

      tr.innerHTML = `
        <td style="padding:6px 2px; text-align:center; color:#999; font-size:10px;">${idx + 1}</td>
        <td style="padding:6px 2px; text-align:center; font-family:monospace; font-weight:bold;">${tcaId}</td>
        <td style="padding:6px 4px; color:#000; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500;" title="${name}">${name}</td>
        <td style="padding:6px 2px; text-align:center; color:#666;">${parentTcaId}</td>
        <td style="padding:6px 2px; text-align:center;"><span style="background:${matchColor};color:white;padding:1px 4px;border-radius:2px;font-size:9px;">${matchDisplay}</span></td>
        <td style="padding:6px 2px; text-align:center; color:${userIdColor}; font-weight:bold;">${userIdVal}</td>
        <td style="padding:6px 2px; text-align:center; color:${refIdColor}; font-weight:bold;">${refIdVal}</td>
        <td style="padding:6px 2px; text-align:center;"><span style="background:${actionBg};color:white;padding:2px 6px;border-radius:3px;font-size:9px;">${actionLabel}</span></td>
        <td style="padding:6px 2px; text-align:center; color:${refSysIdColor}; font-weight:bold;">${refSysIdVal}</td>
        <td style="padding:6px 4px; color:#666; font-size:10px; max-width:120px; overflow:hidden; text-overflow:ellipsis;" title="${email}">${email}</td>
        <td style="padding:6px 4px; color:#666; font-size:10px;">${phone}</td>
      `;
      tbody.appendChild(tr);
    });

    window.tcaExtractedData = { allNodes, viewStats, memberInfo, previewRows };
  }

  function updateLogDisplay() {
    const logContainer = document.getElementById('tca-log-content');
    if (logContainer) {
      logContainer.innerHTML = tcaLogs.map(l => `<div style="border-bottom:1px solid #eee;padding:4px 0;word-break:break-all;">${l}</div>`).join('');
    }
  }

  function showSyncPreviewPanel() {
    console.log('[TCA Sync] showSyncPreviewPanel called');
    
    const data = window.tcaExtractedData;
    if (!data || !data.allNodes || data.allNodes.length === 0) {
      alert('Chua co du lieu! Vui long scan TCA truoc.');
      return;
    }

    // Remove existing preview panel
    const existing = document.getElementById('tca-sync-preview-panel');
    if (existing) existing.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'tca-sync-preview-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); z-index: 9999999999;
    `;

    // Create panel
    const panel = document.createElement('div');
    panel.id = 'tca-sync-preview-panel';
    panel.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 95vw; max-width: 1200px; max-height: 90vh;
      background: #fff; border-radius: 12px; z-index: 10000000000;
      font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4); overflow: hidden;
      display: flex; flex-direction: column;
    `;

    // Header
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px; background:#f5f5f5; border-bottom:2px solid #ddd;">
        <div>
          <h2 style="margin:0; color:#2e7d32; font-size:18px;">Xem de xuat dong bo</h2>
          <small style="color:#666;">Kiem tra chi tiet truoc khi dong bo</small>
        </div>
        <div style="display:flex; gap:10px;">
          <button id="btn-demo-preview" style="background:#7b1fa2; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">🎯 DemoPreview</button>
          <button id="btn-show-data" style="background:#00897b; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">📊 ShowData</button>
          <button id="btn-preview-select-all" style="background:#1565c0; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">Chon tat ca</button>
          <button id="btn-preview-deselect-all" style="background:#666; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">Bo chon tat ca</button>
          <span id="panel-version" style="color:#666; font-size:10px; align-self:center;">v3.1.1</span>
          <button id="btn-preview-close" style="background:#d32f2f; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">X Dong</button>
        </div>
      </div>
      
      <div style="padding:15px 20px; background:#e8f5e9; border-bottom:1px solid #ddd;">
        <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:10px;">
          <div style="background:#fff; padding:10px; border-radius:8px; text-align:center; border:1px solid #c8e6c9;">
            <div id="preview-total" style="font-size:24px; font-weight:bold; color:#333;">0</div>
            <div style="color:#666; font-size:10px;">Tong</div>
          </div>
          <div style="background:#fff; padding:10px; border-radius:8px; text-align:center; border:1px solid #c8e6c9;">
            <div id="preview-create-all" style="font-size:24px; font-weight:bold; color:#2e7d32;">0</div>
            <div style="color:#666; font-size:10px;">Tao User</div>
          </div>
          <div style="background:#fff; padding:10px; border-radius:8px; text-align:center; border:1px solid #bbdefb;">
            <div id="preview-create-system" style="font-size:24px; font-weight:bold; color:#1565c0;">0</div>
            <div style="color:#666; font-size:10px;">Tao System</div>
          </div>
          <div style="background:#fff; padding:10px; border-radius:8px; text-align:center; border:1px solid #ffe0b2;">
            <div id="preview-update" style="font-size:24px; font-weight:bold; color:#e65100;">0</div>
            <div style="color:#666; font-size:10px;">Cap nhat</div>
          </div>
          <div style="background:#fff; padding:10px; border-radius:8px; text-align:center; border:1px solid #e0e0e0;">
            <div id="preview-skip" style="font-size:24px; font-weight:bold; color:#999;">0</div>
            <div style="color:#666; font-size:10px;">Khong doi</div>
          </div>
          <div style="background:#fff; padding:10px; border-radius:8px; text-align:center; border:1px solid #c8e6c9;">
            <div id="preview-closures" style="font-size:24px; font-weight:bold; color:#7b1fa2;">0</div>
            <div style="color:#666; font-size:10px;">Closures</div>
          </div>
          <div style="background:#fff; padding:10px; border-radius:8px; text-align:center; border:1px solid #c8e6c9;">
            <div id="preview-selected" style="font-size:24px; font-weight:bold; color:#2e7d32;">0</div>
            <div style="color:#666; font-size:10px;">Da chon</div>
          </div>
        </div>
        <div style="margin-top:10px; font-size:11px; color:#666;">
          Next User ID: <span id="next-user-id" style="color:#2e7d32; font-weight:bold;">-</span> | 
          Next System ID: <span id="next-system-id" style="color:#1565c0; font-weight:bold;">-</span>
        </div>
      </div>
      
      <div id="preview-table-container" style="flex:1; overflow:auto; padding:0 20px;">
        <table style="width:100%; border-collapse:collapse; font-size:11px; min-width:900px;">
          <thead style="position:sticky; top:0; background:#fafafa; z-index:1;">
            <tr>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:25px;">#</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:25px;">Chon</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:50px;">TCA ID</th>
              <th style="padding:8px; text-align:left; border-bottom:2px solid #ddd; width:80px;">Ten</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:50px;">Match</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:70px;">Hanh dong</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:50px;">UserID</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:50px;">RefID</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:50px;">refSysId</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:40px;">Changes</th>
            </tr>
          </thead>
          <tbody id="preview-tbody">
          </tbody>
        </table>
      </div>
      
      <div style="padding:15px 20px; background:#f5f5f5; border-top:2px solid #ddd; display:flex; justify-content:space-between; align-items:center;">
        <div style="color:#666; font-size:11px;">
          Nhan "Chon tat ca" hoac "Bo chon tat ca" de tuy chinh.
        </div>
        <div style="display:flex; gap:10px;">
          <button id="btn-preview-cancel" style="background:#666; border:none; color:white; padding:12px 25px; border-radius:5px; cursor:pointer; font-weight:bold;">Huy</button>
          <button id="btn-preview-sync" style="background:#2e7d32; border:none; color:white; padding:12px 30px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:14px;">Dong y Dong bo</button>
        </div>
      </div>
      
      <div id="preview-loading" style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.9); display:none; justify-content:center; align-items:center; flex-direction:column; gap:15px;">
        <div style="font-size:18px; color:#2e7d32; font-weight:bold;">Dang lay de xuat dong bo...</div>
        <div style="width:200px; height:6px; background:#e0e0e0; border-radius:3px; overflow:hidden;">
          <div id="preview-progress-bar" style="width:0%; height:100%; background:#2e7d32; transition:width 0.3s;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Event listeners
    document.getElementById('btn-preview-close').addEventListener('click', closePreview);
    document.getElementById('btn-demo-preview').addEventListener('click', window.callDemoPreview);
    document.getElementById('btn-show-data').addEventListener('click', window.callShowData);
    document.getElementById('btn-preview-cancel').addEventListener('click', closePreview);
    overlay.addEventListener('click', closePreview);

    document.getElementById('btn-preview-select-all').addEventListener('click', () => {
      document.querySelectorAll('.preview-checkbox').forEach(cb => cb.checked = true);
      updateSelectedCount();
    });

    document.getElementById('btn-preview-deselect-all').addEventListener('click', () => {
      document.querySelectorAll('.preview-checkbox').forEach(cb => cb.checked = false);
      updateSelectedCount();
    });

    document.getElementById('btn-preview-sync').addEventListener('click', executeSync);

    // Fetch preview data
    fetchPreviewData();

    function closePreview() {
      const p = document.getElementById('tca-sync-preview-panel');
      const o = document.getElementById('tca-sync-preview-overlay');
      if (p) p.remove();
      if (o) o.remove();
    }

    function updateSelectedCount() {
      const checked = document.querySelectorAll('.preview-checkbox:checked').length;
      document.getElementById('preview-selected').textContent = checked;
    }

    async function fetchPreviewData() {
      const loading = document.getElementById('preview-loading');
      loading.style.display = 'flex';

      try {
        console.log('[TCA Sync] Fetching sync preview...');
        console.log('[TCA Sync] Nodes:', data.allNodes.length);
        
        const response = await fetch(SYNC_PREVIEW_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allNodes: data.allNodes,
            memberInfo: data.memberInfo
          })
        });

        if (!response.ok) throw new Error('Preview failed: ' + response.status);
        
        const result = await response.json();
        console.log('[TCA Sync] Preview result:', result);

        if (!result.success) throw new Error(result.error || 'Preview failed');

        // Lưu preview response vào cache để dùng khi sync
        previewCache = result;
        console.log('[TCA Sync] Preview cached:', result.rows?.length, 'rows');

        // Update stats - new format
        const createAll = result.rows.filter(r => r.action === 'CREATE_ALL').length;
        const createSystem = result.rows.filter(r => r.action === 'CREATE_SYSTEM').length;
        const update = result.rows.filter(r => r.action === 'UPDATE').length;
        const skip = result.rows.filter(r => r.action === 'SKIP').length;
        
        document.getElementById('preview-total').textContent = result.total;
        document.getElementById('preview-create-all').textContent = createAll;
        document.getElementById('preview-create-system').textContent = createSystem;
        document.getElementById('preview-update').textContent = update;
        document.getElementById('preview-skip').textContent = skip;
        document.getElementById('preview-closures').textContent = createAll + createSystem;
        document.getElementById('next-user-id').textContent = result.nextAvailableUserId || '-';
        document.getElementById('next-system-id').textContent = result.nextAvailableSystemId || '-';

        // Fill table - new format (1 bảng tổng hợp)
        const tbody = document.getElementById('preview-tbody');
        let selectedCount = 0;

        result.rows.forEach((row, idx) => {
          const tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid #eee';
          if (idx % 2 === 0) tr.style.background = '#fff';
          else tr.style.background = '#fafafa';

          // Skip rows are not selected by default
          const isSelected = row.action !== 'SKIP';
          if (isSelected) selectedCount++;

          // UserID: existing (row.db?.userId) or new (row.userId for CREATE_ALL)
          const existingUserId = row.db?.userId;
          const userId = row.userId;
          const userIdColor = userId && !existingUserId ? '#2e7d32' : (existingUserId ? '#1565c0' : '#999');

          // Match type display
          const matchType = row.match || null;
          let matchDisplay = '-';
          if (matchType === 'PHONE_EMAIL') {
            matchDisplay = '<span style="background:#2e7d32;color:white;padding:1px 4px;border-radius:3px;font-size:9px;">P+E</span>';
          } else if (matchType === 'PHONE_ONLY') {
            matchDisplay = '<span style="background:#1565c0;color:white;padding:1px 4px;border-radius:3px;font-size:9px;">P</span>';
          } else if (matchType === 'EMAIL_ONLY') {
            matchDisplay = '<span style="background:#d32f2f;color:white;padding:1px 4px;border-radius:3px;font-size:9px;">E</span>';
          } else if (matchType === 'NEW') {
            matchDisplay = '<span style="background:#666;color:white;padding:1px 4px;border-radius:3px;font-size:9px;">NEW</span>';
          }

          // Action label
          let actionLabel = row.action;
          if (row.action === 'CREATE_ALL') actionLabel = 'Tạo User+System';
          else if (row.action === 'CREATE_SYSTEM') actionLabel = 'Tạo System';
          else if (row.action === 'UPDATE') actionLabel = 'Cập nhật';
          else if (row.action === 'SKIP') actionLabel = 'Bỏ qua';
          const actionColor = row.action === 'CREATE_ALL' ? '#2e7d32' : (row.action === 'CREATE_SYSTEM' ? '#1565c0' : (row.action === 'UPDATE' ? '#f57c00' : '#999'));

          // refSysId = parentUserId (UserID, not System autoId)
          const refId = row.referrerId;
          const refSysId = row.refSysId;

          tr.innerHTML = `
            <td style="padding:4px 2px; text-align:center; color:#999; font-size:9px;">${idx + 1}</td>
            <td style="padding:4px 2px; text-align:center;">
              <input type="checkbox" class="preview-checkbox" data-tca-id="${row.id}" ${isSelected ? 'checked' : ''} ${row.action === 'SKIP' ? 'disabled' : ''}>
            </td>
            <td style="padding:4px 2px; text-align:center; font-family:monospace; color:#333; font-size:10px;">${row.id}</td>
            <td style="padding:4px 2px; color:#000; max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px;" title="${row.name}">${row.name}</td>
            <td style="padding:4px 2px; text-align:center; font-size:10px;">${matchDisplay}</td>
            <td style="padding:4px 2px; text-align:center;">
              <span style="background:${actionColor}; color:white; padding:2px 6px; border-radius:3px; font-size:9px; white-space:nowrap;">${actionLabel}</span>
            </td>
            <td style="padding:4px 2px; text-align:center; color:${userIdColor}; font-weight:bold; font-size:10px;">${userId || '-'}</td>
            <td style="padding:4px 2px; text-align:center; color:${refId ? '#2e7d32' : '#ccc'}; font-weight:bold; font-size:10px;">${refId || '-'}</td>
            <td style="padding:4px 2px; text-align:center; color:${refSysId ? '#1565c0' : '#ccc'}; font-size:10px;">${refSysId || '-'}</td>
            <td style="padding:4px 2px; text-align:center; color:#7b1fa2; font-size:9px;">${row.changes?.length || 0}</td>
          `;
          tbody.appendChild(tr);
        });

        document.getElementById('preview-selected').textContent = selectedCount;

        // Add checkbox listener for count update
        document.querySelectorAll('.preview-checkbox').forEach(cb => {
          cb.addEventListener('change', updateSelectedCount);
        });

        loading.style.display = 'none';

      } catch (err) {
        console.error('[TCA Sync] Preview error:', err);
        loading.style.display = 'none';
        alert('Loi lay de xuat dong bo: ' + err.message);
        closePreview();
      }
    }

    async function executeSync() {
      const selectedCheckboxes = document.querySelectorAll('.preview-checkbox:checked:not(:disabled)');
      const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.tcaId));
      
      if (selectedIds.length === 0) {
        alert('Vui long chon it nhat 1 dong de dong bo!');
        return;
      }

      if (!confirm(`Dong bo ${selectedIds.length} thanh vien vao he thong BRK?\n\nSo du lieu lon co the mat thoi gian. Tiep tuc?`)) {
        return;
      }

      // Filter selected nodes
      const selectedNodes = data.allNodes.filter(n => selectedIds.includes(n.id));
      const selectedMemberInfo = {};
      selectedIds.forEach(id => {
        if (data.memberInfo?.[id]) selectedMemberInfo[id] = data.memberInfo[id];
      });

      const syncBtn = document.getElementById('btn-preview-sync');
      const cancelBtn = document.getElementById('btn-preview-cancel');
      syncBtn.disabled = true;
      cancelBtn.disabled = true;

      // Create step-by-step progress panel
      const progressPanel = document.createElement('div');
      progressPanel.id = 'sync-progress-panel';
      progressPanel.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 500px; background: #fff; border-radius: 12px; z-index: 10000000001;
        font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5); padding: 25px;
        text-align: center;
      `;
      
      let currentStep = 0;
      const steps = [
        { id: 'step1', text: 'Buoc 1: Kiem tra du lieu...', icon: '1' },
        { id: 'step2', text: 'Buoc 2: Xu ly user...', icon: '2' },
        { id: 'step3', text: 'Buoc 3: Tao/Cap nhat System...', icon: '3' },
        { id: 'step4', text: 'Buoc 4: Tao/Cap nhat TCA Member...', icon: '4' },
        { id: 'step5', text: 'Buoc 5: Tao SystemClosure...', icon: '5' },
        { id: 'step6', text: 'Buoc 6: Hoan tat!', icon: '6' }
      ];

      progressPanel.innerHTML = `
        <h2 style="margin:0 0 20px 0; color:#2e7d32;">Dang dong bo ${selectedNodes.length} thanh vien</h2>
        <div style="text-align:left; margin-bottom:20px;">
          ${steps.map((s, i) => `
            <div id="${s.id}" style="display:flex; align-items:center; margin:10px 0; opacity:0.4; transition:opacity 0.3s;">
              <div style="width:28px; height:28px; border-radius:50%; background:#ddd; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; margin-right:12px; transition:background 0.3s;">${s.icon}</div>
              <span style="color:#666;">${s.text}</span>
            </div>
          `).join('')}
        </div>
        <div id="step-detail" style="padding:10px; background:#f5f5f5; border-radius:8px; font-size:12px; color:#666; min-height:40px;"></div>
        <div style="margin-top:20px;">
          <button id="btn-cancel-sync" style="background:#d32f2f; border:none; color:white; padding:10px 25px; border-radius:5px; cursor:pointer; font-weight:bold;">Huy</button>
        </div>
      `;

      document.body.appendChild(progressPanel);
      document.getElementById('btn-cancel-sync').addEventListener('click', () => {
        if (confirm('Huy dong bo? Da dong bo se khong bi roll back.')) {
          progressPanel.remove();
          syncBtn.disabled = false;
          cancelBtn.disabled = false;
          syncBtn.textContent = 'Dong y Dong bo';
        }
      });

      function updateStep(stepIndex, detail = '', success = false) {
        for (let i = 0; i < steps.length; i++) {
          const stepEl = document.getElementById(steps[i].id);
          if (i < stepIndex) {
            stepEl.style.opacity = '1';
            stepEl.querySelector('div').style.background = '#2e7d32';
          } else if (i === stepIndex) {
            stepEl.style.opacity = '1';
            stepEl.querySelector('div').style.background = success ? '#2e7d32' : '#1565c0';
          } else {
            stepEl.style.opacity = '0.4';
            stepEl.querySelector('div').style.background = '#ddd';
          }
        }
        if (detail) {
          document.getElementById('step-detail').innerHTML = detail;
        }
      }

      function showMatchSummary(rows) {
        const peCount = rows.filter(r => r.matchType === 'PHONE_EMAIL').length;
        const pCount = rows.filter(r => r.matchType === 'PHONE_ONLY').length;
        const pWarnCount = rows.filter(r => r.matchType === 'PHONE_ONLY' && r.emailMismatch).length;
        const eCount = rows.filter(r => r.matchType === 'EMAIL_ONLY').length;
        const newCount = rows.filter(r => !r.matchType).length;
        
        return `
          <div style="margin-top:10px; text-align:left;">
            <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
              <span style="background:#2e7d32;color:white;padding:3px 8px;border-radius:3px;font-size:11px;">P+E: ${peCount}</span>
              <span style="background:#1565c0;color:white;padding:3px 8px;border-radius:3px;font-size:11px;">P: ${pCount - pWarnCount}</span>
              <span style="background:#f57c00;color:white;padding:3px 8px;border-radius:3px;font-size:11px;">P! (email khac): ${pWarnCount}</span>
              <span style="background:#d32f2f;color:white;padding:3px 8px;border-radius:3px;font-size:11px;">E: ${eCount}</span>
              <span style="background:#999;color:white;padding:3px 8px;border-radius:3px;font-size:11px;">MOI: ${newCount}</span>
            </div>
          </div>
        `;
      }

      updateStep(0, 'Bat dau dong bo...');
      
      // Dùng previewCache thay vì gọi preview lại
      try {
        const previewData = previewCache;
        
        updateStep(0, 'Su dung du lieu tu preview da co san...');
        
        if (previewData.rows) {
          updateStep(1, `
            <strong>Phan tich ket qua match:</strong>
            ${previewData.rows.length} thanh vien can xu ly
            ${showMatchSummary(previewData.rows)}
          `);
        }
        
        await new Promise(r => setTimeout(r, 500)); // Small delay for visibility
        
        updateStep(2, 'Dang gui yeu cau dong bo toi server...');
        console.log('[TCA Sync] Executing sync for', selectedNodes.length, 'nodes');

        // Build expectedIds từ preview cache - filter chỉ lấy selected IDs (new format)
        const expectedIds = {};
        if (previewData.rows && previewData.rows.length > 0) {
          previewData.rows.forEach(row => {
            // Chỉ lấy những TCA ID nào được check để sync
            if (selectedIds.includes(row.id)) {
              // userId: new format uses row.userId directly
              if (row.userId || row.referrerId || row.refSysId) {
                expectedIds[row.id] = {
                  userId: row.userId || null,
                  referrerId: row.referrerId || null,
                  refSysId: row.refSysId || null
                };
              }
            }
          });
          console.log('[TCA Sync] expectedIds:', expectedIds);
          console.log('[TCA Sync] selectedIds:', selectedIds);
        }

        const response = await fetch(SYNC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'TCA_EXT_PREVIEW',
            timestamp: Date.now(),
            allNodes: selectedNodes,
            memberInfo: selectedMemberInfo,
            stats: { total: selectedNodes.length, folders: 0, items: selectedNodes.length },
            expectedIds: expectedIds
          })
        });

        if (!response.ok) throw new Error('Sync failed: ' + response.status);
        
        const result = await response.json();
        console.log('[TCA Sync] Sync result:', result);

        if (result.success) {
          updateStep(3, `
            <strong>Dong bo thanh cong!</strong><br>
            Tao User: ${result.stats.usersCreated}<br>
            Tao System: ${result.stats.systemsCreated}<br>
            TCA Member: ${result.stats.tcaMembersCreated} tao, ${result.stats.tcaMembersUpdated} cap nhat
          `, true);
          
          await new Promise(r => setTimeout(r, 1500));
          progressPanel.remove();
          
          alert(`Dong bo thanh cong!\n\n` +
            `Tao User: ${result.stats.usersCreated}\n` +
            `Cap nhat User: ${result.stats.usersUpdated}\n` +
            `Tao System: ${result.stats.systemsCreated}\n` +
            `Tao TCA Member: ${result.stats.tcaMembersCreated}\n` +
            `Cap nhat TCA Member: ${result.stats.tcaMembersUpdated}\n` +
            `Loi: ${result.stats.failed}`
          );
          closePreview();
        } else {
          throw new Error(result.error || 'Sync failed');
        }

      } catch (err) {
        console.error('[TCA Sync] Sync error:', err);
        progressPanel.remove();
        alert('Loi dong bo: ' + err.message);
        syncBtn.disabled = false;
        cancelBtn.disabled = false;
        syncBtn.textContent = 'Dong y Dong bo';
      }
    }
  }

  // Make functions globally accessible
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
    if (!data) {
      alert('Chưa có dữ liệu để tải!');
      return;
    }

    // Build node map for parent name lookup
    const nodeMap = new Map();
    data.allNodes.forEach(n => nodeMap.set(n.id, n));

    // Header với parent info - UTF-8 with BOM for Vietnamese
    const BOM = '\uFEFF';
    let csv = BOM + 'ID,Ten,Ca nhan,Tong,Cap,Tinh,TL CN,TL DN,BH,TD,Type,Email,Phone,DB_Status,UserID\n';
    data.allNodes.forEach(node => {
      // Get contact info
      const contact = data.memberInfo?.[node.id] || {};
      const email = contact.email || '';
      const phone = contact.phone || '';
      
      // Get precheck status
      const precheckResult = data.precheckCache?.[node.id];
      const dbStatus = precheckResult?.exists ? 'EXISTS' : (node.type === 'item' ? 'NEW' : '-');
      const userId = precheckResult?.userId || '';
      
      csv += `${node.id},"${node.name || ''}",${node.personalScore || '0'},${node.totalScore || '0'},${node.level || '1'},"${node.location || ''}","${node.personalRate || '-'}","${node.teamRate || '-'}","${node.hasBH ? 'Yes' : 'No'}","${node.hasTD ? 'Yes' : 'No'}","${node.type}","${email}","${phone}","${dbStatus}",${userId}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tca_data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[TCA Sync] CSV downloaded!');
  };

  window.downloadTCAJSON = function() {
    const data = window.tcaExtractedData;
    if (!data) {
      alert('Chưa có dữ liệu để tải!');
      return;
    }

    // Build enriched data with parent names
    const nodeMap = new Map();
    data.allNodes.forEach(n => nodeMap.set(n.id, n));
    
    const enrichedData = data.allNodes.map(node => ({
      ...node,
      precheckStatus: data.precheckCache?.[node.id]?.exists ? 'EXISTS' : (node.type === 'item' ? 'NEW' : '-'),
      userId: data.precheckCache?.[node.id]?.userId || null
    }));

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

  window.downloadTCAJSON = function() {
    const data = window.tcaExtractedData;
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tca_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
