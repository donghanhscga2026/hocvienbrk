(function() {
  'use strict';

  const MESSAGE_TYPE = 'TCA_XHR_CAPTURE';
  const FULL_TREE_TYPE = 'TCA_FULL_TREE';
  const MEMBER_INFO_TYPE = 'TCA_MEMBER_INFO';
  const SYNC_ENDPOINT = 'https://giautoandien.io.vn/api/sync-tca';
  const PRECHECK_ENDPOINT = 'https://giautoandien.io.vn/api/sync-tca/precheck';

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
              userId: m.existingUserId
            };
            if (m.existingUserId) {
              console.log(`[TCA Sync]   Found: TCA ${m.tcaId} -> User ${m.existingUserId} (${m.name})`);
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
          <h2 style="margin:0; color:#2e7d32; font-size:18px;"> TCA Data Extracted <span style="font-size:10px; color:#999;">v2.0.8</span></h2>
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
              <th style="padding:6px; text-align:center; border-bottom:2px solid #ddd; color:#333; width:50px;">CN/Tong</th>
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
          cursor:pointer; font-weight:bold; font-size:12px;
        ">📄 Download JSON</button>
      </div>
    `;

    document.body.appendChild(panel);
    
    // Attach event listeners
    document.getElementById('btn-close').addEventListener('click', () => panel.remove());
    document.getElementById('btn-csv').addEventListener('click', window.downloadTCACSV);
    document.getElementById('btn-json').addEventListener('click', window.downloadTCAJSON);

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
      
      tr.innerHTML = `
        <td style="padding:6px 4px; text-align:center; font-family:monospace; font-size:10px; color:#333;">${node.id}</td>
        <td style="padding:6px 4px; color:#000; font-weight:${node.type === 'folder' ? 'bold' : 'normal'}; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${node.name || '-'}">${node.name || '-'}</td>
        <td style="padding:6px 4px; text-align:center; font-size:10px; color:#333;">${node.personalScore || '0'}/${node.totalScore || '0'}</td>
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
