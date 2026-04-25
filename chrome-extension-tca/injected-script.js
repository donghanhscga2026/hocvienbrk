(function() {
  'use strict';

  const TARGET_URL_PATTERN = 'group_management';  // Bắt tất cả requests trong group_management
  const MEMBER_INFO_PATTERN = 'member_info';  // API lấy thông tin chi tiết member
  const MESSAGE_TYPE = 'TCA_XHR_CAPTURE';
  const MEMBER_INFO_TYPE = 'TCA_MEMBER_INFO';
  const BASE_URL = 'https://portal.tca.com.vn';

  let isIntercepting = false;
  let capturedUrls = new Set();
  let capturedMembers = new Map();  // Lưu thông tin members đã capture
  let autoScanEnabled = true; // MẶC ĐỊNH BẬT - quét tự động khi trang được load
  let scannedIds = new Set();
  let pendingFolders = [];
  let isScanning = false;
  let fullTree = [];
  let scanStats = { total: 0, folders: 0, items: 0 };
  let isFirstCapture = true;  // Track initial capture

  function extractFolderIds(data) {
    if (!data || !data.data) return [];
    return data.data
      .filter(item => item.type === 'folder')
      .map(item => item.additionalParameters?.id)
      .filter(id => id && !scannedIds.has(id));
  }

  function extractNodeInfo(item) {
    const id = item.additionalParameters?.id;
    
    // item.name chứa HTML, cần strip trước khi parse
    const rawName = item.name || '';
    
    // Strip HTML tags để lấy text thuần
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawName;
    const nameText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Kiểm tra nếu là node "Tổ chức phân nhánh" - đây là node ROOT của hệ thống TCA
    const isRootNode = nameText.includes('Tổ chức phân nhánh') || nameText.includes('Tổ chức') && nameText.includes('phân nhánh');
    
    // Parse text thuần: tìm pattern SCORE / SCORE để xác định vị trí
    // Format: "NHÓM - TÊN - 17.463 / 52.161 - Cấp X" hoặc "Tổ chức phân nhánh - 17.006 / 194.305 - Cấp 2"
    
    let groupName = '';
    let fullName = nameText.trim();
    let personalScore = '0';
    let totalScore = '0';
    let level = '1';
    
    // Tìm pattern điểm số: số/số (có thể có số thập phân)
    const scorePattern = /([\d.]+)\s*\/\s*([\d.]+)/;
    const scoreMatch = nameText.match(scorePattern);
    
    if (scoreMatch) {
      personalScore = scoreMatch[1];
      totalScore = scoreMatch[2];
      
      // Lấy phần trước dấu "/" để parse group/name
      const beforeScore = nameText.substring(0, nameText.indexOf(scoreMatch[0])).trim();
      const parts = beforeScore.split(' - ').map(p => p.trim()).filter(p => p.length > 0);
      
      // Tìm "Cấp X" trong text
      const levelMatch = nameText.match(/Cấp\s*(\d+)/);
      if (levelMatch) level = levelMatch[1];
      
      if (parts.length === 1) {
        // Format: "TÊN"
        groupName = '';
        fullName = parts[0].replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
      } else if (parts.length === 2) {
        // Format: "NHÓM - TÊN"
        groupName = parts[0].replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
        fullName = parts[1].replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
      } else if (parts.length >= 3) {
        // Format: "NHÓM - TÊN - [extra]"
        // groupName = parts[0], name = parts[1]
        groupName = parts[0].replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
        fullName = parts[1].replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
      }
    } else {
      // Không tìm thấy pattern điểm, thử parse đơn giản
      const parts = nameText.split(' - ').map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2) {
        fullName = parts[parts.length - 1].replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
        groupName = parts.slice(0, -1).join(' - ').replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
      } else if (parts.length === 1) {
        fullName = parts[0].replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
        groupName = '';
      }
    }
    
    // Extract location từ rawHtml
    let location = item.location || '';
    if (!location) {
      const locMatch = item.rawHtml?.match(/class='hidden-xs'[^>]*>\s*-\s*([^<]+)/);
      if (locMatch) location = locMatch[1].trim();
    }
    
    // Parse rates từ rawHtml
    let personalRate = '-';
    let teamRate = '-';
    
    if (item.rawHtml) {
      const rateMatch = item.rawHtml.match(/>([\d.]+%)\s*\/\s*([^<]+?)</);
      if (rateMatch) {
        personalRate = rateMatch[1];
        teamRate = rateMatch[2].trim();
      }
    }
    
    const hasBH = item.rawHtml?.includes('(BH)') || false;
    const hasTD = item.rawHtml?.includes('(TD)') || false;

    return {
      id: id,
      type: item.type,
      isRootNode: isRootNode || false,
      groupName: groupName,
      name: fullName,
      personalScore: personalScore,
      totalScore: totalScore,
      level: level,
      location: location,
      personalRate: personalRate,
      teamRate: teamRate,
      hasBH: hasBH,
      hasTD: hasTD,
      rawHtml: item.rawHtml || ''
    };
  }

  function injectMemberInfoHandler() {
    // Monkey-patch showMemberInfo để bắt thông tin
    const originalShowMemberInfo = window.showMemberInfo;
    
    window.showMemberInfo = function(memberId) {
      console.log('[TCA Sync] 📌 showMemberInfo called for ID:', memberId);
      
      // Gọi original function để hiện popup
      if (originalShowMemberInfo) {
        originalShowMemberInfo(memberId);
      }
    };
    
    // Hook vào modal/popup để lấy thông tin
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            // Tìm modal info
            const modal = node.querySelector?.('.modal') || node.querySelector?.('#memberInfoModal') || node;
            
            // Tìm email và phone trong nội dung
            const text = modal.textContent || '';
            
            // Extract email
            const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            const email = emailMatch ? emailMatch[0] : null;
            
            // Extract phone (various formats)
            const phoneMatch = text.match(/(?:Điện thoại|Phone|Mobile|SĐT)[\s:]*([\d\s\.,-]+)|(\d{9,11})/i);
            let phone = null;
            if (phoneMatch) {
              phone = (phoneMatch[1] || phoneMatch[2] || '').trim();
            }
            
            if (email || phone) {
              const memberId = modal.id?.match(/\d+/) || modal.dataset?.memberId;
              if (memberId) {
                capturedMembers.set(parseInt(memberId), { email, phone });
                console.log('[TCA Sync] 📋 Member info captured:', { id: memberId, email, phone });
                
                // Send to content script
                window.postMessage({
                  type: MEMBER_INFO_TYPE,
                  memberId: parseInt(memberId),
                  email: email,
                  phone: phone
                }, '*');
              }
            }
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[TCA Sync] 👁️ Member info observer active');
  }

  async function fetchMemberInfo(memberId) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      // Thử các endpoint có thể có
      const endpoints = [
        `${BASE_URL}/group_management/member_info?id=${memberId}`,
        `${BASE_URL}/group_management/get_member?id=${memberId}`,
        `${BASE_URL}/group_management/member/${memberId}`,
        `${BASE_URL}/api/member/${memberId}`,
      ];
      
      let tried = 0;
      const tryNext = () => {
        if (tried >= endpoints.length) {
          resolve(null);
          return;
        }
        
        xhr.open('GET', endpoints[tried], true);
        xhr.withCredentials = true;
        xhr.onload = function() {
          if (this.status === 200) {
            try {
              const data = JSON.parse(this.responseText);
              console.log('[TCA Sync] 📋 Member info API found:', endpoints[tried]);
              resolve(data);
            } catch (e) {
              tryNext();
            }
          } else {
            tried++;
            tryNext();
          }
        };
        xhr.onerror = () => {
          tried++;
          tryNext();
        };
        xhr.send();
      };
      
      tryNext();
    });
  }

  async function fetchFolder(folderId) {
    if (scannedIds.has(folderId)) return null;
    if (!autoScanEnabled) return null;
    
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      // Sử dụng URL đầy đủ với session cookie
      xhr.open('GET', `${BASE_URL}/group_management/group_tree?id=${folderId}`, true);
      // Copy cookies từ page hiện tại
      xhr.withCredentials = true;
      
      xhr.onload = function() {
        try {
          if (this.status === 200) {
            const data = JSON.parse(this.responseText);
            scannedIds.add(folderId);
            
            const folders = extractFolderIds(data);
            const items = data.data || [];
            
            console.log(`[TCA AutoScan] Fetched ${items.length} items (${folders.length} folders) for ID ${folderId}`);
            
            // Update stats
            scanStats.total += items.length;
            scanStats.items += items.length - folders.length;
            scanStats.folders += folders.length;
            
            // Add to queue
            folders.forEach(fid => {
              if (!scannedIds.has(fid)) {
                pendingFolders.push(fid);
              }
            });
            
            resolve({ id: folderId, data: data, nodes: items.map(extractNodeInfo) });
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error('[TCA AutoScan] Parse error:', e);
          resolve(null);
        }
      };
      
      xhr.onerror = function() {
        console.error(`[TCA AutoScan] Failed to fetch folder ${folderId}`);
        resolve(null);
      };
      
      xhr.send();
    });
  }

  async function autoScanTree(initialData) {
    if (isScanning) {
      console.log('[TCA AutoScan] ⏳ Already scanning, skipping...');
      return;
    }
    isScanning = true;
    
    console.log('==========================================');
    console.log('[TCA AutoScan] 🚀 STARTING FULL TREE SCAN');
    console.log('==========================================');
    
    // Reset state
    scannedIds = new Set();
    pendingFolders = [];
    fullTree = [];
    scanStats = { total: 0, folders: 0, items: 0 };
    isFirstCapture = false;
    capturedMembers = new Map();
    
    // Initial data
    if (initialData && initialData.data) {
      const folders = extractFolderIds(initialData);
      folders.forEach(fid => pendingFolders.push(fid));
      fullTree.push({ id: 'root', data: initialData, nodes: initialData.data.map(extractNodeInfo) });
      console.log(`[TCA AutoScan] 📦 Root level: ${initialData.data.length} items (${folders.length} folders)`);
    }
    
    // Inject click handler for member info button
    injectMemberInfoHandler();
    
    console.log(`[TCA AutoScan] 📋 Queue: ${pendingFolders.length} folders to scan`);
    console.log('[TCA AutoScan] ⏳ Scanning...');
    
    // Process queue
    let iteration = 0;
    while (pendingFolders.length > 0 && autoScanEnabled) {
      const folderId = pendingFolders.shift();
      iteration++;
      
      if (scannedIds.has(folderId)) continue;
      
      // Progress update every 5 iterations
      if (iteration % 5 === 0 || pendingFolders.length === 0) {
        console.log(`[TCA AutoScan] 📊 Progress: ${iteration} scanned | ${pendingFolders.length} remaining | ${scanStats.total} items found`);
      }
      
      const result = await fetchFolder(folderId);
      if (result) {
        fullTree.push(result);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log('==========================================');
    console.log('[TCA AutoScan] ✅ SCAN COMPLETE!');
    console.log('==========================================');
    console.log(`📊 Final Stats:`);
    console.log(`   Total iterations: ${iteration}`);
    console.log(`   Total items collected: ${scanStats.total}`);
    console.log(`   Folders scanned: ${scanStats.folders}`);
    console.log(`   Leaf items: ${scanStats.items}`);
    console.log(`   Full tree responses: ${fullTree.length}`);
    console.log(`   Members with contact info: ${capturedMembers.size}`);
    console.log('==========================================');
    console.log('[TCA AutoScan] 📤 Sending data to panel...');
    console.log('==========================================');
    
    // Send complete tree to content script with member info
    window.postMessage({
      type: 'TCA_FULL_TREE',
      tree: fullTree,
      stats: scanStats,
      memberInfo: Object.fromEntries(capturedMembers),
      timestamp: Date.now()
    }, '*');
    
    // Auto fetch member info - collect IDs from fullTree (tất cả nodes có id, không chỉ type='item')
    const allMemberIds = [];
    fullTree.forEach(folder => {
      if (folder.nodes) {
        folder.nodes.forEach(node => {
          if (node.id) {
            allMemberIds.push(node.id);
          }
        });
      }
    });
    console.log('[TCA AutoScan] 📊 Collecting IDs for member info fetch:', allMemberIds.length, 'total IDs');
    const memberIds = allMemberIds.filter(id => !capturedMembers.has(id));
    if (memberIds.length > 0) {
      console.log('[TCA AutoScan] 🔍 Starting auto-fetch member info for', memberIds.length, 'members...');
      autoFetchMemberInfo(memberIds);
    }
    
    isScanning = false;
  }

  async function autoFetchMemberInfo(memberIds) {
    console.log('[TCA AutoFetch] Starting to fetch member info for', memberIds.length, 'members...');
    
    const results = new Map();
    let fetched = 0;
    
    for (const memberId of memberIds) {
      if (capturedMembers.has(memberId)) continue; // Already have info
      
      try {
        const info = await tryFetchMemberInfo(memberId);
        if (info) {
          capturedMembers.set(memberId, info);
          results.set(memberId, info);
          fetched++;
          
          // Send update to content script - Bổ sung đầy đủ thông tin cho Table Display mở rộng
          window.postMessage({
            type: MEMBER_INFO_TYPE,
            memberId: memberId,
            email: info.email,
            phone: info.phone,
            address: info.address,
            joinDate: info.joinDate,
            contractDate: info.contractDate,
            promotionDate: info.promotionDate
          }, '*');
          console.log('[TCA AutoFetch] 📋 Full member info:', { memberId, email: info.email, phone: info.phone, joinDate: info.joinDate, contractDate: info.contractDate, promotionDate: info.promotionDate });
        }
      } catch (e) {
        // Silently continue
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
      
      // Update progress every 10
      if (fetched % 10 === 0) {
        console.log(`[TCA AutoFetch] Progress: ${fetched}/${memberIds.length}`);
      }
    }
    
    console.log('[TCA AutoFetch] ✅ Complete! Fetched info for', fetched, 'members');
    return results;
  }

  async function tryFetchMemberInfo(memberId) {
    // Sử dụng endpoint chính xác: ajax_get_member_info
    const endpoint = `${BASE_URL}/group_management/ajax_get_member_info?id=${memberId}`;
    
    try {
      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) return null;
      
      const responseText = await response.text();
      
      // Parse HTML bằng DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(responseText, 'text/html');
      const rawText = doc.body.innerText.replace(/\s+/g, ' ').trim();
      
      // Regex anchor-to-anchor
      const extract = (start, end) => {
        const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`${escapedStart}\\s*(.*?)\\s*${escapedEnd}`, 'i');
        const match = rawText.match(pattern);
        return match ? match[1].trim() : null;
      };
      
      // Trích xuất các trường
      const phone = extract('Số điện thoại', 'Email');
      const email = extract('Email', 'Địa chỉ');
      const address = extract('Địa chỉ', 'Ngày gia nhập TCA');
      const joinDate = extract('Ngày gia nhập TCA', 'Ngày nộp hợp đồng');
      const contractDate = extract('Hợp đồng đầu', 'BHNT đầu tiên');
      const promotionDate = extract('BHNT đầu tiên', 'Ngày thăng hạng');
      
      const result = { phone, email, address, joinDate, contractDate, promotionDate };
      
      // Chỉ return nếu có ít nhất phone hoặc email
      if (phone || email) {
        console.log('[TCA AutoFetch] ✅ Fetched:', { memberId, phone, email, address: address?.substring(0, 30) });
        return result;
      }
      
      return null;
    } catch (e) {
      console.log('[TCA AutoFetch] ❌ Error:', e.message);
      return null;
    }
  }
  
  async function callShowMemberInfo(memberId) {
    return new Promise((resolve) => {
      // Lưu lại original AJAX handler
      const originalAjax = window.$.ajax;
      let resolved = false;
      
      // Override jQuery ajax để bắt response
      if (window.$ && $.ajax) {
        $.ajax = function(options) {
          const originalSuccess = options.success;
          options.success = function(data) {
            if (!resolved && data) {
              const email = data.email || data.mail || data.Email;
              const phone = data.phone || data.phone_number || data.Phone || data.sdt;
              
              if (email || phone) {
                resolved = true;
                $.ajax = originalAjax;
                resolve({ email, phone });
                return;
              }
            }
            if (originalSuccess) originalSuccess(data);
          };
          return originalAjax.apply(this, arguments);
        };
      }
      
      // Gọi showMemberInfo
      if (window.showMemberInfo) {
        showMemberInfo(memberId);
      }
      
      // Timeout sau 3s
      setTimeout(() => {
        if (!resolved && window.$ && $.ajax) {
          $.ajax = originalAjax;
        }
        resolve(null);
      }, 3000);
    });
  }

  function init() {
    if (isIntercepting) return;
    isIntercepting = true;

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      // Store full URL for logging
      const fullUrl = url.startsWith('http') ? url : (window.location.origin + url);
      this._xhrUrl = fullUrl;
      this._xhrMethod = method;
      // Include cookies for authenticated requests
      this.withCredentials = true;
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function(body) {
      this.addEventListener('load', function() {
        try {
          // Check if URL contains group_management (more flexible)
          if (this._xhrUrl && this._xhrUrl.includes('group_management')) {
            const responseText = this.responseText;
            
            if (responseText) {
              const data = JSON.parse(responseText);
              
              // Check if this is a folder expand request (has ?id=X where X != initial)
              const urlParams = new URL(this._xhrUrl, BASE_URL).searchParams;
              const folderId = urlParams.get('id');
              
              // Debug: log all captured URLs
              if (!capturedUrls.has(this._xhrUrl)) {
                capturedUrls.add(this._xhrUrl);
                console.log('[TCA XHR] 📡 Captured:', this._xhrUrl);
                
                // Check if this is member info API
                if (this._xhrUrl.includes('member_info') || this._xhrUrl.includes('get_member')) {
                  console.log('[TCA XHR] 👤 Member info API detected');
                }
              }
              
              // Chỉ trigger auto-scan khi có data.data (tree structure)
              if (data && data.data && Array.isArray(data.data)) {
                console.log('[TCA XHR] 📦 Tree data received:', {
                  folderId: folderId,
                  items: data.data.length,
                  isFirstCapture: isFirstCapture
                });

                // Send individual capture
                window.postMessage({
                  type: MESSAGE_TYPE,
                  url: this._xhrUrl,
data: data,
                  folderId: folderId,
                  timestamp: Date.now()
                }, '*');
                
              // CHẠY AUTO-SCAN KHI autoScanEnabled = true (mặc định = true)
              if (isFirstCapture && autoScanEnabled && !isScanning) {
                // Trigger full tree download
                console.log('[TCA AutoScan] 🚀 First capture detected, starting auto-scan...');
                autoScanTree(data).catch(e => console.error('[TCA AutoScan] Error:', e));
              }
              }
            }
          }
        } catch (e) {
          console.error('[TCA Sync] Parse error:', e);
        }
      });

      return originalSend.apply(this, [body]);
    };

    // Listen for control messages
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'TCA_CONTROL') {
        if (event.data.command === 'stopScan') {
          autoScanEnabled = false;
          console.log('[TCA AutoScan] ⏹️ Scan stopped');
        } else if (event.data.command === 'startScan') {
          autoScanEnabled = true;
          if (!isScanning) {
            console.log('[TCA AutoScan] ▶️ Resuming scan...');
          }
        }
      }
    });

    // =====================================================
    // EXTRACT OVERVIEW DATA - Lấy điểm tổng hệ thống từ dòng "Tổ chức phân nhánh"
    // =====================================================
    function extractOverviewData() {
      console.log('[TCA Overview] 🔎 ========== BẮT ĐẦU TÌM ROOT DATA ==========');
      
      try {
        // DEBUG: Liệt kê tất cả elements có thể chứa text
        const allElements = Array.from(document.querySelectorAll('*'));
        const candidateElements = allElements.filter(el => {
          const text = el.innerText || '';
          return text.includes('Tổ chức') || text.includes('phân nhánh');
        });
        
        console.log('[TCA Overview] 🔍 Tìm thấy', candidateElements.length, 'elements chứa "Tổ chức" hoặc "phân nhánh"');
        
        if (candidateElements.length > 0) {
          // In chi tiết từng element
          candidateElements.forEach((el, i) => {
            if (i < 5) {
              console.log(`[TCA Overview] [${i}] ${el.tagName}: "${el.innerText.substring(0, 100)}..."`);
            }
          });
        }
        
        // Tìm element có đủ cả "Tổ chức" và "phân nhánh"
        const targetEl = candidateElements.find(el => {
          const text = el.innerText || '';
          return text.includes('Tổ chức') && text.includes('phân nhánh');
        });

        console.log('[TCA Overview] TargetEl:', targetEl ? `${targetEl.tagName} - TÌM THẤY` : 'KHÔNG TÌM THẤY');

        if (targetEl) {
          const text = targetEl.innerText;
          const cleanText = text.replace(/\s+/g, ' ').trim();
          console.log('[TCA Overview] Full text:', cleanText);

          // Regex: with trailing content
          const regex = /Tổ chức\s*phân\s*nhánh.*?([\d.]+).*?\/.*?([\d.]+).*?Cấp\s*(\d+)/i;
          const match = cleanText.match(regex);
          console.log('[TCA Overview] Regex match:', match);

          // Portal dùng '.' là dấu thập phân: '17.006' = 17.006 điểm
          const personalPoints = parseFloat(match[1]) || 0;
          const teamPoints = parseFloat(match[2]) || 0;
          const level = parseInt(match[3]) || 1;

          console.log('[TCA Overview] ✅ SUCCESS - personalPoints:', personalPoints, 'teamPoints:', teamPoints, 'level:', level);

          const overviewData = {
            type: 'OVERVIEW_REPORT',
            personal_points: personalPoints,
            team_points: teamPoints,
            level: level,
            timestamp: new Date().toISOString(),
            raw_text: cleanText
          };

          try {
            localStorage.setItem('tcaOverviewData', JSON.stringify(overviewData));
            console.log('[TCA Overview] 💾 Saved to localStorage');
          } catch (e) {}

          return overviewData;
        } else {
          console.log('[TCA Overview] ⚠️ KHÔNG tìm thấy element với cả "Tổ chức" và "phân nhánh"');
        }
      } catch (e) {
        console.log('[TCA Overview] ❌ LỖI:', e.message);
      }
      return null;
    }

    // Gọi extractOverviewData sau khi DOM load xong
    window.extractTcaOverview = extractOverviewData;

    // CHỈ GỌI KHI CÓ LỆNH (không tự động)
    // Lắng nghe TCA_CONTROL messages
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'TCA_CONTROL') {
        if (event.data.command === 'startScan' && typeof window.extractTcaOverview === 'function') {
          console.log('[TCA Sync] ▶️ startScan command received');
          window.extractTcaOverview();
        }
      }
    });

    console.log('[TCA Sync] XHR interceptor initialized');
    console.log('[TCA Sync] Waiting for startScan command...');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
