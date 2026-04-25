// TCA Auto-Sync Background Script
// Xử lý timer, auto-login, messaging giữa popup và content-script

const API_ENDPOINT = 'https://giautoandien.io.vn/api/sync-tca';
const TELEGRAM_API = 'https://giautoandien.io.vn/api/notify/telegram';

// State
let autoSyncTimer = null;
let autoSyncInterval = 5 * 60 * 1000; // Default 5 minutes (for testing)
let isSyncing = false;

// ==========================================
// INJECTED FUNCTION (runs in page context)
// ==========================================

// This function is injected into the page to do auto-sync
// executeScript will wait for the Promise to resolve
const autoSyncInTab = async function(email, password) {
  console.log('[TCA AutoSync] INJECTED FUNCTION START');
  
  try {
    console.log('[TCA AutoSync] Starting...');
    
    // Detect API base - check localhost first
    const LOCAL_API = 'http://localhost:3000';
    const PROD_API = 'https://giautoandien.io.vn';
    let API_BASE = PROD_API;
    
    try {
      // Use GET endpoint to check if local server is running
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(LOCAL_API + '/api/sync-tca', { 
        method: 'GET',
        signal: controller.signal 
      });
      clearTimeout(timeout);
      // GET returns 200 OK always, so if we get here, local is running
      API_BASE = LOCAL_API;
      console.log('[TCA AutoSync] LOCAL OK');
    } catch (e) {
      console.log('[TCA AutoSync] PROD mode (localhost not available)');
    }
    
    const SYNC_API = API_BASE + '/api/sync-tca';
    const TELEGRAM_API = API_BASE + '/api/notify/telegram';
    console.log('[TCA AutoSync] Using API:', SYNC_API);
    
    // Step 1: Wait for page
    console.log('[TCA AutoSync] Page ready, URL:', window.location.href);
    await new Promise(r => setTimeout(r, 2000));
    
    // Step 2: Check login
    const loginButton = document.querySelector('.btn-red, button.btn-red, [class*="btn-red"]');
    console.log('[TCA AutoSync] Login button:', !!loginButton);
    
    if (loginButton) {
      console.log('[TCA AutoSync] Clicking login...');
      loginButton.click();
      await new Promise(r => setTimeout(r, 5000));
    }
    
    // Step 3: Navigate to group page
    if (!window.location.pathname.includes('group_management')) {
      console.log('[TCA AutoSync] Navigating...');
      window.location.href = 'https://portal.tca.com.vn/group_management/group';
      await new Promise(r => setTimeout(r, 8000));
    }
    
    // Step 4: Wait and trigger scan
    console.log('[TCA AutoSync] On group page, triggering scan...');
    await new Promise(r => setTimeout(r, 5000));
    
    if (!localStorage.getItem('tca_full_tree')) {
      window.postMessage({ type: 'TCA_CONTROL', command: 'startScan' }, '*');
    }
    
    // Step 5: Wait for data (max 3 min) + member info
    console.log('[TCA AutoSync] Waiting for data + member info...');
    for (let i = 0; i < 180; i++) {
      const data = localStorage.getItem('tca_full_tree');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          // Check both nodes and member info
          if (parsed.allNodes && parsed.allNodes.length > 0) {
            const hasAllMemberInfo = Object.keys(parsed.memberInfo || {}).length === parsed.allNodes.length;
            console.log('[TCA AutoSync] Got data:', parsed.allNodes.length, 'nodes,', Object.keys(parsed.memberInfo || {}).length, 'contacts');
            
            // Wait for member info to be complete
            if (hasAllMemberInfo || i > 60) {
              console.log('[TCA AutoSync] Calling sync API...');
              
              // Lấy overviewData nếu có
              let overviewData = null;
              try {
                const overviewStr = localStorage.getItem('tcaOverviewData');
                if (overviewStr) {
                  overviewData = JSON.parse(overviewStr);
                }
              } catch(e) { console.log('[TCA AutoSync] No overviewData'); }
              
              const response = await fetch(SYNC_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  source: 'TCA_EXT_FULL',
                  timestamp: Date.now(),
                  allNodes: parsed.allNodes,
                  memberInfo: parsed.memberInfo || {},
                  overviewData: overviewData,
                  stats: { total: parsed.allNodes.length }
                })
              });
              
              const result = await response.json();
              console.log('[TCA AutoSync] API result:', result);
              
              return { success: true, stats: `Synced ${result.stats?.totalRecords || parsed.allNodes.length} records` };
            }
          }
        } catch (e) {
          console.log('[TCA AutoSync] Parse error:', e);
        }
      }
      await new Promise(r => setTimeout(r, 1000));
      if (i % 30 === 0) console.log('[TCA AutoSync] Waiting...', i, 's');
    }
    
    console.log('[TCA AutoSync] Timeout');
    return { success: false, error: 'Timeout waiting for scan data' };
    
  } catch (error) {
    console.error('[TCA AutoSync] ERROR:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function log(message, type = 'info') {
  console.log(`[TCA Background][${type}] ${message}`);
  
  // Forward log to popup if exists
  chrome.runtime.sendMessage({ 
    action: 'LOG', 
    message, 
    type 
  }).catch(() => {});
}

// Get TCA tabs
function getTcaTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: '*://portal.tca.com.vn/*' }, (tabs) => {
      resolve(tabs);
    });
  });
}

// Get settings from storage
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'autoSyncEnabled',
      'intervalHours',
      'tcaEmail',
      'tcaPassword'
    ], (items) => {
      resolve({
        autoSyncEnabled: items.autoSyncEnabled || false,
        intervalHours: items.intervalHours || 0.083,
        tcaEmail: items.tcaEmail || '',
        tcaPassword: items.tcaPassword || ''
      });
    });
  });
}

// Save to storage
function saveToStorage(updates) {
  return new Promise((resolve) => {
    chrome.storage.local.set(updates, resolve);
  });
}

// ==========================================
// AUTO SYNC LOGIC
// ==========================================

async function startAutoSync(intervalHours) {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
  
  autoSyncInterval = intervalHours * 60 * 60 * 1000;
  log(`Setting timer for ${intervalHours} hours = ${autoSyncInterval}ms`);
  
  autoSyncTimer = setInterval(() => {
    log('TIMER TRIGGERED! Running autoSync...');
    autoSync();
  }, autoSyncInterval);
  
  log(`Auto-Sync started with interval ${intervalHours} hours`);
  
  // Also trigger immediately once
  log('Running immediate sync in 3 seconds...');
  setTimeout(autoSync, 3000);
}

function stopAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
  log('Auto-Sync stopped');
}

async function autoSync() {
  if (isSyncing) {
    log('Sync already in progress, skipping...');
    return;
  }
  
  isSyncing = true;
  log('Starting auto-sync...');
  
  try {
    const settings = await getSettings();
    
    if (!settings.tcaEmail || !settings.tcaPassword) {
      log('Missing credentials, cannot auto-sync', 'error');
      isSyncing = false;
      return;
    }
    
    // Notify popup
    chrome.runtime.sendMessage({ action: 'SYNC_STARTED' }).catch(() => {});
    
    // Get or create TCA tab
    let tabs = await getTcaTabs();
    let tab;
    
    if (tabs.length > 0) {
      tab = tabs[0];
      log('Using existing TCA tab');
    } else {
      log('Creating new TCA tab');
      tab = await new Promise((resolve) => {
        chrome.tabs.create({ url: 'https://portal.tca.com.vn' }, (newTab) => {
          resolve(newTab);
        });
      });
    }
    
// Activate tab
    chrome.tabs.update(tab.id, { active: true });
    
    // Wait for page to load, then trigger sync using executeScript
    log('Waiting for page to load...');
    
    setTimeout(async () => {
      log(`Executing script in tab ${tab.id}`);
      
      try {
        log('Calling chrome.scripting.executeScript...');
        
        // Use scripting.executeScript
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: autoSyncInTab,
          args: [settings.tcaEmail, settings.tcaPassword]
        });
        
        log(`executeScript results: ${JSON.stringify(results)}`);
        isSyncing = false;
        
        if (!results || !results[0]) {
          log('executeScript returned no results', 'error');
          return;
        }
        
        if (results[0].exceptionInfo) {
          log(`Script exception: ${results[0].exceptionInfo}`, 'error');
          return;
        }
        
        const result = results[0].result;
        if (result && result.success) {
          log(`Auto-sync completed: ${result.stats}`, 'success');
          chrome.runtime.sendMessage({ 
            action: 'SYNC_COMPLETE', 
            stats: result.stats,
            result: result
          }).catch(() => {});
          
          saveToStorage({ 
            lastSyncTime: Date.now(),
            lastSyncResult: result 
          });
        } else {
          const errorMsg = result?.error || 'Unknown error';
          log(`Auto-sync failed: ${errorMsg}`, 'error');
          chrome.runtime.sendMessage({ 
            action: 'SYNC_ERROR', 
            error: errorMsg
          }).catch(() => {});
        }
      } catch (error) {
        isSyncing = false;
        log(`Execute script error: ${error.message}`, 'error');
        chrome.runtime.sendMessage({ 
          action: 'SYNC_ERROR', 
          error: error.message 
        }).catch(() => {});
      }
    }, 3000);
    
  } catch (error) {
    isSyncing = false;
    log(`Auto-sync error: ${error.message}`, 'error');
    chrome.runtime.sendMessage({ 
      action: 'SYNC_ERROR', 
      error: error.message 
    }).catch(() => {});
  }
}

// ==========================================
// ORIGINAL FUNCTIONALITY
// ==========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[TCA Background] Received message:', message.type);

  if (message.type === 'TCA_SYNC_REQUEST') {
    handleSyncRequest(message.payload)
      .then(result => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'TCA Sync Complete',
          message: result.message || `Synced ${result.stats?.totalRecords || 0} members`
        });
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'TCA Sync Failed',
          message: error.message || 'Unknown error'
        });
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'TCA_ROLLBACK_REQUEST') {
    handleRollbackRequest(message.syncId)
      .then(result => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'TCA Rollback Complete',
          message: `Rolled back ${result.rolledBack || 0} records`
        });
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'TCA Rollback Failed',
          message: error.message || 'Unknown error'
        });
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  // ========== NEW AUTO-SYNC MESSAGES ==========
  console.log('[TCA Background] Message received:', message.action || message.type);
  
  if (message.action === 'START_AUTO_SYNC') {
    console.log('[TCA Background] Starting auto-sync with interval:', message.intervalHours);
    startAutoSync(message.intervalHours || 0.083);
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'STOP_AUTO_SYNC') {
    stopAutoSync();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'GET_STATUS') {
    sendResponse({
      autoSyncRunning: autoSyncTimer !== null,
      intervalHours: autoSyncInterval / (60 * 60 * 1000),
      isSyncing
    });
    return true;
  }
  
  if (message.action === 'SYNC_NOW') {
    console.log('[TCA Background] SYNC_NOW received');
    syncNow();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'START_CAPTURE') {
    // Gửi lệnh bắt đầu capture đến content script
    getTcaTabs().then(tabs => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'START_MANUAL_CAPTURE' });
      }
    });
    sendResponse({ success: true });
    return true;
  }
  
  // Badge update khi có activity
  if (message.type === 'TCA_SCAN_START') {
    chrome.action.setBadgeText({ text: '...' });
    chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });
    // Forward to popup
    chrome.runtime.sendMessage({ action: 'LOG', message: '🔍 Bắt đầu quét...', type: 'info' }).catch(() => {});
    return false;
  }

  if (message.type === 'TCA_SCAN_COMPLETE') {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    // Forward to popup
    chrome.runtime.sendMessage({ action: 'LOG', message: '✅ Quét xong - đang sync...', type: 'success' }).catch(() => {});
    return false;
  }
  
  // Forward any LOG messages from content scripts
  if (message.type === 'LOG') {
    chrome.runtime.sendMessage({ action: 'LOG', message: message.message, type: message.logType || 'info' }).catch(() => {});
    return false;
  }
});

async function handleSyncRequest(payload) {
  console.log('[TCA Background] Sending sync request to API...');
  console.log('[TCA Background] Payload size:', JSON.stringify(payload).length, 'bytes');

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'TCA_EXT_FULL',
        timestamp: Date.now(),
        allNodes: payload.allNodes,
        memberInfo: payload.memberInfo,
        stats: payload.stats
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[TCA Background] Sync result:', result);

    return result;
  } catch (error) {
    console.error('[TCA Background] Sync error:', error);
    throw error;
  }
}

async function handleRollbackRequest(syncId) {
  console.log('[TCA Background] Sending rollback request...');

  try {
    const response = await fetch(`${API_ENDPOINT}/rollback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ syncId })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[TCA Background] Rollback result:', result);

    return result;
  } catch (error) {
    console.error('[TCA Background] Rollback error:', error);
    throw error;
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

async function init() {
  console.log('[TCA Background] Extension initialized');
  console.log('[TCA Background] Checking stored settings...');
  
  // Check if auto-sync was enabled before
  const settings = await getSettings();
  console.log('[TCA Background] Settings loaded:', settings);
  console.log('[TCA Background] autoSyncEnabled:', settings.autoSyncEnabled);
  
  // TEMP DISABLED: Ngăn auto-start kể cả khi đã bật trước đó
  // if (settings.autoSyncEnabled) {
  //   console.log('[TCA Background] Auto-sync was enabled, restoring...');
  //   log('Restoring auto-sync from previous session');
  //   startAutoSync(settings.intervalHours);
  // } else {
  //   console.log('[TCA Background] Auto-sync was NOT enabled');
  // }
  console.log('[TCA Background] Auto-sync TẠM TẮT - chỉ bật thủ công');
}

init();