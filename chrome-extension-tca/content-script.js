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

  console.log('[TCA Sync] API Base:', API_BASE);

  let memberInfoCache = {};
  let precheckCache = {};  // Store precheck results: { tcaId: { exists: boolean, userId: number } }
  let pendingNodeIds = [];  // IDs cần fetch member info
  let fetchedCount = 0;    // Số member info đã fetch
  let allNodesGlobal = []; // Lưu allNodes để dùng sau
  let precheckDone = false; // Flag để tránh gọi precheck nhiều lần

  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected-script.js');
    script.onload = function() {
      script.remove();
      console.log('[TCA Sync] Injected script loaded');
    };
    (document.head || document.documentElement).appendChild(script);
  }

  function callPrecheckAPI(nodes) {
    return new Promise((resolve, reject) => {
      // Build allNodes format
      const allNodes = nodes.map(n => ({
        id: n.id,
        type: n.type,
        name: n.name
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
        console.log('[TCA Sync] No nodes to precheck');
        resolve({});
        return;
      }

      console.log('[TCA Sync] === PRECHECK START ===');
      console.log('[TCA Sync] Nodes:', allNodes.length);
      console.log('[TCA Sync] API URL:', PRECHECK_ENDPOINT);
      
      // Log first few nodes
      const sampleNodes = allNodes.slice(0, 3);
      sampleNodes.forEach(n => {
        console.log(`[TCA Sync]   Node ${n.id}: ${n.name}, phone=${memberInfo[n.id]?.phone || 'none'}, email=${memberInfo[n.id]?.email || 'none'}`);
      });
      
      fetch(PRECHECK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allNodes, memberInfo })
      })
      .then(res => {
        console.log('[TCA Sync] Response status:', res.status, res.statusText);
        if (!res.ok) {
          throw new Error('Precheck failed: ' + res.status);
        }
        return res.json();
      })
      .then(data => {
        console.log('[TCA Sync] === PRECHECK RESPONSE ===');
        console.log('[TCA Sync] Success:', data.success);
        console.log('[TCA Sync] Total members:', data.members?.length || 0);
        
        // Build precheckCache from members array - MERGE instead of replace
        if (data.members && Array.isArray(data.members)) {
          data.members.forEach(m => {
            precheckCache[m.tcaId] = {
              exists: m.status === 'EXISTING_SYSTEM',
              userFound: m.existingUserId !== null,
              userId: m.existingUserId,
              matchType: m.matchType,
              emailMismatch: m.emailMismatch,
              existingUserEmail: m.existingUserEmail,
              referrerId: m.referrerId
            };
            if (m.existingUserId) {
              console.log(`[TCA Sync]   Found: TCA ${m.tcaId} -> User ${m.existingUserId} (${m.name}), matchType=${m.matchType}, emailMismatch=${m.emailMismatch}`);
            }
          });
          console.log('[TCA Sync] Cache entries:', Object.keys(precheckCache).length);
        }
        
        console.log('[TCA Sync] === PRECHECK END ===');
        resolve(precheckCache);
      })
      .catch(err => {
        console.error('[TCA Sync] Precheck ERROR:', err.message || err);
        resolve({});
      });
    });
  }

  function handleMemberInfo(data) {
    const { memberId, email, phone } = data;
    memberInfoCache[memberId] = { email, phone };
    fetchedCount++;
    console.log(`[TCA Sync] 📋 Member contact updated: ${memberId} (${fetchedCount}/${allNodesGlobal.length})`);
    
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
      
      // Gọi precheck với dữ liệu đầy đủ
      callPrecheckAPI(allNodesGlobal).then(() => {
        console.log('[TCA Sync] === PRECHECK COMPLETE ===');
        // Cập nhật panel nếu đang hiển thị
        const panel = document.getElementById('tca-sync-panel');
        if (panel) {
          panel.remove();
          showDataPanel(allNodesGlobal, { total: allNodesGlobal.length, folders: 0, items: allNodesGlobal.filter(n => n.type === 'item').length }, memberInfoCache);
        }
      });
    }
  }

  function showDataPanel(allNodes, stats, memberInfo) {
    console.log('[TCA Sync] showDataPanel called with', allNodes.length, 'nodes');
    console.log('[TCA Sync] precheckCache keys:', Object.keys(precheckCache));
    console.log('[TCA Sync] precheckCache[60073]:', precheckCache[60073]);
    console.log('[TCA Sync] precheckCache[61752]:', precheckCache[61752]);
    
    // Remove existing panel
    const existing = document.getElementById('tca-sync-panel');
    if (existing) existing.remove();
    
    // Build node map for parent lookup
    const nodeMap = new Map();
    allNodes.forEach(node => nodeMap.set(node.id, node));
    
    // Merge member info
    const memberInfoMap = memberInfo || {};
    
    // Create panel
    const panel = document.createElement('div');
    panel.id = 'tca-sync-panel';
    panel.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      width: 800px !important;
      max-height: 85vh !important;
      max-width: 95vw !important;
      background: #ffffff !important;
      color: #333 !important;
      border: 3px solid #2e7d32 !important;
      border-radius: 12px !important;
      padding: 15px !important;
      z-index: 999999999 !important;
      font-family: 'Segoe UI', Arial, sans-serif !important;
      font-size: 12px !important;
      overflow-y: auto !important;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;

    // Count members with contact info
    const withContact = allNodes.filter(n => memberInfoMap[n.id]?.email || memberInfoMap[n.id]?.phone).length;
    
    // Count precheck results - tính cho TẤT CẢ nodes (không phân biệt folder/item)
    const existsInDB = allNodes.filter(n => precheckCache[n.id]?.exists).length;
    const userOnlyCount = allNodes.filter(n => precheckCache[n.id]?.userFound && !precheckCache[n.id]?.exists).length;
    const newItems = allNodes.filter(n => !precheckCache[n.id]?.exists && !precheckCache[n.id]?.userFound).length;

    // Header
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #e0e0e0; padding-bottom:10px;">
        <div>
          <h2 style="margin:0; color:#2e7d32; font-size:18px;"> TCA Data Extracted <span style="font-size:10px; color:#999;">v2.5.1</span></h2>
          <small style="color:#666;">Auto-scanned from TCA Portal</small>
        </div>
        <button id="btn-close" style="
          background:#d32f2f; border:none; color:white; padding:5px 12px; border-radius:5px; cursor:pointer; font-weight:bold;
        ">X Close</button>
      </div>
      
      <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin-bottom:15px;">
        <div style="background:#e8f5e9; padding:8px; border-radius:8px; text-align:center; border:1px solid #c8e6c9;">
          <div style="font-size:18px; font-weight:bold; color:#2e7d32;">${allNodes.length}</div>
          <div style="color:#555; font-size:9px;">Tong</div>
        </div>
        <div style="background:#fff3e0; padding:8px; border-radius:8px; text-align:center; border:1px solid #ffe0b2;">
          <div style="font-size:18px; font-weight:bold; color:#e65100;">${allNodes.filter(n => n.type === 'folder').length}</div>
          <div style="color:#555; font-size:9px;">Folders</div>
        </div>
        <div style="background:#e3f2fd; padding:8px; border-radius:8px; text-align:center; border:1px solid #bbdefb;">
          <div style="font-size:18px; font-weight:bold; color:#1565c0;">${allNodes.filter(n => n.type === 'item').length}</div>
          <div style="color:#555; font-size:9px;">Items</div>
        </div>
        <div style="background:#fce4ec; padding:8px; border-radius:8px; text-align:center; border:1px solid #f48fb1;">
          <div style="font-size:18px; font-weight:bold; color:#c2185b;">${withContact}</div>
          <div style="color:#555; font-size:9px;">Email/Phone</div>
        </div>
        <div style="background:#c8e6c9; padding:8px; border-radius:8px; text-align:center; border:1px solid #a5d6a7;">
          <div style="font-size:18px; font-weight:bold; color:#2e7d32;">${existsInDB}</div>
          <div style="color:#555; font-size:9px;">EXISTS</div>
        </div>
        <div style="background:#bbdefb; padding:8px; border-radius:8px; text-align:center; border:1px solid #90caf9;">
          <div style="font-size:18px; font-weight:bold; color:#1565c0;">${userOnlyCount}</div>
          <div style="color:#555; font-size:9px;">USER</div>
        </div>
        <div style="background:#fff9c4; padding:8px; border-radius:8px; text-align:center; border:1px solid #fff176;">
          <div style="font-size:18px; font-weight:bold; color:#f57f17;">${newItems}</div>
          <div style="color:#555; font-size:9px;">NEW</div>
        </div>
      </div>
      
      <div style="max-height:400px; overflow-y:auto; border:1px solid #ddd; border-radius:8px;">
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead style="position:sticky; top:0; background:#f5f5f5; z-index:1;">
            <tr>
              <th style="padding:6px; text-align:center; border-bottom:2px solid #ddd; color:#333; width:40px;">ID</th>
              <th style="padding:6px; text-align:left; border-bottom:2px solid #ddd; color:#333;">Ten thanh vien</th>
              <th style="padding:6px; text-align:center; border-bottom:2px solid #ddd; color:#333; width:45px;">Match</th>
              <th style="padding:6px; text-align:center; border-bottom:2px solid #ddd; color:#333; width:50px;">DB</th>
              <th style="padding:6px; text-align:center; border-bottom:2px solid #ddd; color:#333; width:50px;">UserID</th>
              <th style="padding:6px; text-align:left; border-bottom:2px solid #ddd; color:#333; width:110px;">Email</th>
              <th style="padding:6px; text-align:center; border-bottom:2px solid #ddd; color:#333; width:80px;">Phone</th>
            </tr>
          </thead>
          <tbody id="tca-nodes-body">
          </tbody>
        </table>
      </div>
      
      <div style="margin-top:10px; padding:8px; background:#e8f5e9; border-radius:6px; font-size:11px; color:#2e7d32;">
        <strong>Da lay du lieu cho ${allNodes.length} thanh vien tu TCA Portal</strong>
      </div>
      
      <div style="margin-top:15px; padding:10px; background:#f5f5f5; border-radius:8px; text-align:center;">
        <button id="btn-csv" style="
          background:#2e7d32; border:none; color:white; padding:10px 20px; border-radius:5px; 
          cursor:pointer; font-weight:bold; margin-right:10px; font-size:12px;
        ">📥 Download CSV</button>
        <button id="btn-json" style="
          background:#e65100; border:none; color:white; padding:10px 20px; border-radius:5px; 
          cursor:pointer; font-weight:bold; margin-right:10px; font-size:12px;
        ">📄 Download JSON</button>
        <button id="btn-sync-preview" style="
          background:#1565c0; border:none; color:white; padding:10px 20px; border-radius:5px; 
          cursor:pointer; font-weight:bold; font-size:12px;
        ">🔄 Xem de xuat dong bo</button>
      </div>
    `;

    document.body.appendChild(panel);
    
    // Attach event listeners
    document.getElementById('btn-close').addEventListener('click', () => panel.remove());
    document.getElementById('btn-csv').addEventListener('click', window.downloadTCACSV);
    document.getElementById('btn-json').addEventListener('click', window.downloadTCAJSON);
    document.getElementById('btn-sync-preview').addEventListener('click', () => showSyncPreviewPanel());

    // Fill table with parent info
    const tbody = document.getElementById('tca-nodes-body');
    allNodes.forEach((node, idx) => {
      const tr = document.createElement('tr');
      
      // Alternating background
      if (idx % 2 === 0) {
        tr.style.background = '#ffffff';
      } else {
        tr.style.background = '#f9f9f9';
      }
      // Highlight folders
      if (node.type === 'folder') {
        tr.style.background = '#e8f5e9';
        tr.style.fontWeight = 'bold';
      }
      tr.style.borderBottom = '1px solid #eee';
      
      // Get contact info
      const contact = memberInfoMap[node.id] || {};
      const email = contact.email || '-';
      const phone = contact.phone || '-';
      
      // Get precheck status & UserID - KHÔNG phân biệt folder/item
      const precheckResult = precheckCache[node.id];
      const isExisting = precheckResult?.exists;  // User + System both exist
      const userFound = precheckResult?.userFound;  // User found (may not have System)
      const userId = precheckResult?.userId;
      const matchType = precheckResult?.matchType;
      const emailMismatch = precheckResult?.emailMismatch;
      const existingUserEmail = precheckResult?.existingUserEmail;
      
      // DB status: EXISTS = User+System, USER = User only, NEW = No user
      let dbStatus = '-';
      if (isExisting) {
        dbStatus = '<span style="color:#2e7d32;font-weight:bold;">EXISTS</span>';
      } else if (userFound) {
        dbStatus = '<span style="color:#1565c0;font-weight:bold;">USER</span>';
      } else {
        dbStatus = '<span style="color:#e65100;font-weight:bold;">NEW</span>';
      }
      const userIdDisplay = userId ? `<span style="color:#1565c0;font-weight:bold;">${userId}</span>` : '-';
      
      // Match type display với tooltip chi tiết
      let matchDisplay = '-';
      let matchBgColor = '#999';
      let matchTitle = '';
      
      if (matchType === 'PHONE_EMAIL') {
        matchDisplay = '<span style="background:#2e7d32;color:white;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;">P+E</span>';
        matchBgColor = '#2e7d32';
        matchTitle = `Phone va Email cung trung - User ${userId} da xac nhan`;
      } else if (matchType === 'PHONE_ONLY') {
        if (emailMismatch) {
          matchDisplay = '<span style="background:#f57c00;color:white;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;">P! EMAIL</span>';
          matchBgColor = '#f57c00';
          matchTitle = `CANH BAO: Phone trung (User ${userId}) nhung Email khac!\n` +
                       `  TCA email: ${email || '-'}\n` +
                       `  DB email: ${existingUserEmail || '-'}\n` +
                       `  => Se goi y cap nhat email`;
        } else {
          matchDisplay = '<span style="background:#1565c0;color:white;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;">P</span>';
          matchBgColor = '#1565c0';
          matchTitle = `Phone trung - User ${userId}`;
        }
      } else if (matchType === 'EMAIL_ONLY') {
        matchDisplay = '<span style="background:#d32f2f;color:white;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:bold;">E</span>';
        matchBgColor = '#d32f2f';
        matchTitle = `CHI Email trung - User ${userId}. Phone khong trung!`;
      }
      
      tr.innerHTML = `
        <td style="padding:6px 4px; text-align:center; font-family:monospace; font-size:10px; color:#333;">${node.id}</td>
        <td style="padding:6px 4px; color:#000; font-weight:${node.type === 'folder' ? 'bold' : 'normal'}; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${node.name || '-'}">${node.name || '-'}</td>
        <td style="padding:6px 4px; text-align:center; font-size:10px;" title="${matchTitle}">${matchDisplay}</td>
        <td style="padding:6px 4px; text-align:center; font-size:10px;">${dbStatus}</td>
        <td style="padding:6px 4px; text-align:center; font-size:10px; color:#1565c0; font-weight:bold;">${userIdDisplay}</td>
        <td style="padding:6px 4px; font-size:10px; color:${email === '-' ? '#999' : '#1565c0'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" data-member-email="${node.id}">${email}</td>
        <td style="padding:6px 4px; text-align:center; font-size:10px; color:${phone === '-' ? '#999' : '#e65100'};" data-member-phone="${node.id}">${phone}</td>
      `;
      tbody.appendChild(tr);
    });

    // Store data for download functions
    window.tcaExtractedData = { allNodes, stats, memberInfo: memberInfoMap, precheckCache };
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
          <button id="btn-preview-select-all" style="background:#1565c0; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">Chon tat ca</button>
          <button id="btn-preview-deselect-all" style="background:#666; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">Bo chon tat ca</button>
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
        <table style="width:100%; border-collapse:collapse; font-size:11px; min-width:1300px;">
          <thead style="position:sticky; top:0; background:#fafafa; z-index:1;">
            <tr>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:25px;">#</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:25px;">Chon</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:50px;">TCA ID</th>
              <th style="padding:8px; text-align:left; border-bottom:2px solid #ddd; width:70px;">Ten</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:50px;">Match</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:70px;">Hanh dong</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:40px;">Cur User</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:45px;">New User</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:45px;">New Sys</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:45px;">RefID</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:45px;">RefSys</th>
              <th style="padding:8px; text-align:center; border-bottom:2px solid #ddd; width:30px;">#Cl</th>
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

        // Update stats
        document.getElementById('preview-total').textContent = result.total;
        document.getElementById('preview-create-all').textContent = result.willCreate.users;
        document.getElementById('preview-create-system').textContent = result.willCreate.systems;
        document.getElementById('preview-update').textContent = result.willUpdate.tcaMembers;
        document.getElementById('preview-skip').textContent = result.willSkip;
        document.getElementById('preview-closures').textContent = result.willCreate.closures || 0;
        document.getElementById('next-user-id').textContent = result.nextAvailableUserId || '-';
        document.getElementById('next-system-id').textContent = result.nextAvailableSystemId || '-';

        // Fill table
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

          // Color for new IDs
          const newUserIdColor = row.expectedUserId ? '#2e7d32' : '#999';
          const newSysIdColor = row.expectedSystemId ? '#1565c0' : '#999';

          // RefID: hiển thị cho tất cả users (đã tồn tại hoặc mới)
          // Với user đã tồn tại: lấy current referrerId
          // Với user mới: lấy expectedReferrerId
          const currentReferrerId = row.currentData?.referrerId;
          const refId = row.expectedReferrerId ?? currentReferrerId;
          const refIdColor = refId != null ? '#2e7d32' : '#ccc';

          // RefSys tương tự
          const currentRefSysId = row.currentData?.refSysId;
          const refSysId = row.expectedRefSysId ?? currentRefSysId;
          const refSysIdColor = refSysId != null ? '#1565c0' : '#ccc';
          
          // Get match type from API response
          const matchType = row.matchType || null;
          const emailMismatch = row.emailMismatch || false;
          
          // Match type display
          let matchDisplay = '-';
          if (matchType === 'PHONE_EMAIL') {
            matchDisplay = '<span style="background:#2e7d32;color:white;padding:1px 4px;border-radius:3px;font-size:9px;">P+E</span>';
          } else if (matchType === 'PHONE_ONLY') {
            if (emailMismatch) {
              matchDisplay = '<span style="background:#f57c00;color:white;padding:1px 4px;border-radius:3px;font-size:9px;" title="Email khac">P!</span>';
            } else {
              matchDisplay = '<span style="background:#1565c0;color:white;padding:1px 4px;border-radius:3px;font-size:9px;">P</span>';
            }
          } else if (matchType === 'EMAIL_ONLY') {
            matchDisplay = '<span style="background:#d32f2f;color:white;padding:1px 4px;border-radius:3px;font-size:9px;">E</span>';
          }
          
          tr.innerHTML = `
            <td style="padding:4px 2px; text-align:center; color:#999; font-size:9px;">${idx + 1}</td>
            <td style="padding:4px 2px; text-align:center;">
              <input type="checkbox" class="preview-checkbox" data-tca-id="${row.tcaId}" ${isSelected ? 'checked' : ''} ${row.action === 'SKIP' ? 'disabled' : ''}>
            </td>
            <td style="padding:4px 2px; text-align:center; font-family:monospace; color:#333; font-size:10px;">${row.tcaId}</td>
            <td style="padding:4px 2px; color:#000; max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px;" title="${row.name}">${row.name}</td>
            <td style="padding:4px 2px; text-align:center; font-size:10px;">${matchDisplay}</td>
            <td style="padding:4px 2px; text-align:center;">
              <span style="background:${row.actionColor}; color:white; padding:2px 6px; border-radius:3px; font-size:9px; white-space:nowrap;">${row.actionLabel}</span>
            </td>
            <td style="padding:4px 2px; text-align:center; color:${row.currentData?.userId ? '#1565c0' : '#ccc'}; font-weight:bold; font-size:10px;">${row.currentData?.userId || '-'}</td>
            <td style="padding:4px 2px; text-align:center; color:${newUserIdColor}; font-weight:bold; font-size:10px;">${row.expectedUserId || '-'}</td>
            <td style="padding:4px 2px; text-align:center; color:${newSysIdColor}; font-weight:bold; font-size:10px;">${row.expectedSystemId || '-'}</td>
            <td style="padding:4px 2px; text-align:center; color:${refIdColor}; font-weight:bold; font-size:10px;">${refId ?? '-'}</td>
            <td style="padding:4px 2px; text-align:center; color:${refSysIdColor}; font-size:10px;">${refSysId ?? '-'}</td>
            <td style="padding:4px 2px; text-align:center; color:#7b1fa2; font-size:9px;">${row.closuresToCreate || 0}</td>
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
      
      // Fetch preview again to get match info
      try {
        updateStep(0, 'Dang goi API Preview de lay thong tin match...');
        const previewRes = await fetch(SYNC_PREVIEW_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allNodes: selectedNodes,
            memberInfo: selectedMemberInfo
          })
        });
        const previewData = await previewRes.json();
        
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

        const response = await fetch(SYNC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'TCA_EXT_PREVIEW',
            timestamp: Date.now(),
            allNodes: selectedNodes,
            memberInfo: selectedMemberInfo,
            stats: { total: selectedNodes.length, folders: 0, items: selectedNodes.length }
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
