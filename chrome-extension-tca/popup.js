// TCA Auto-Sync Popup Script

const ELEMENTS = {
  autoSyncEnabled: document.getElementById('autoSyncEnabled'),
  intervalHours: document.getElementById('intervalHours'),
  tcaEmail: document.getElementById('tcaEmail'),
  tcaPassword: document.getElementById('tcaPassword'),
  saveCredentials: document.getElementById('saveCredentials'),
  syncNow: document.getElementById('syncNow'),
  syncBtnText: document.getElementById('syncBtnText'),
  statusAutoSync: document.getElementById('statusAutoSync'),
  statusTimer: document.getElementById('statusTimer'),
  statusLastSync: document.getElementById('statusLastSync'),
  statusTab: document.getElementById('statusTab'),
  logBox: document.getElementById('logBox')
};

// State
let isSyncing = false;

// ==========================================
// LOGGING
// ==========================================
function addLog(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  ELEMENTS.logBox.insertBefore(entry, ELEMENTS.logBox.firstChild);
  
  // Keep only last 20 logs
  while (ELEMENTS.logBox.children.length > 20) {
    ELEMENTS.logBox.removeChild(ELEMENTS.logBox.lastChild);
  }
  
  console.log(`[TCA Popup] ${type}: ${message}`);
}

// ==========================================
// STORAGE
// ==========================================
const DEFAULT_SETTINGS = {
  autoSyncEnabled: false,
  intervalHours: 0.083, // 5 minutes = 0.083 hours
  tcaEmail: '',
  tcaPassword: '',
  lastSyncTime: null,
  lastSyncResult: null
};

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (items) => {
      const settings = { ...DEFAULT_SETTINGS, ...items };
      resolve(settings);
    });
  });
}

async function saveSettings(updates) {
  return new Promise((resolve) => {
    chrome.storage.local.set(updates, () => {
      addLog('Đã lưu cài đặt', 'success');
      resolve();
    });
  });
}

// ==========================================
// UI UPDATE
// ==========================================
async function updateUI() {
  const settings = await loadSettings();
  
  // Update inputs
  ELEMENTS.autoSyncEnabled.checked = settings.autoSyncEnabled;
  ELEMENTS.intervalHours.value = settings.intervalHours;
  ELEMENTS.tcaEmail.value = settings.tcaEmail;
  ELEMENTS.tcaPassword.value = settings.tcaPassword;
  
  // Update status
  ELEMENTS.statusAutoSync.textContent = settings.autoSyncEnabled ? 'Bật' : 'Tắt';
  ELEMENTS.statusAutoSync.className = `status-value ${settings.autoSyncEnabled ? 'success' : ''}`;
  
  if (settings.lastSyncTime) {
    const date = new Date(settings.lastSyncTime);
    ELEMENTS.statusLastSync.textContent = date.toLocaleString('vi-VN');
  } else {
    ELEMENTS.statusLastSync.textContent = 'Chưa sync';
  }
  
  const intervalMins = Math.round(settings.intervalHours * 60);
  ELEMENTS.statusTimer.textContent = settings.autoSyncEnabled 
    ? (intervalMins < 60 ? `${intervalMins} phút` : `${settings.intervalHours}h`) 
    : 'Tắt';
  
  // Check TCA tab status
  checkTcaTab();
}

async function checkTcaTab() {
  const tabs = await getTcaTabs();
  if (tabs.length > 0) {
    ELEMENTS.statusTab.textContent = 'Đang mở';
    ELEMENTS.statusTab.className = 'status-value success';
  } else {
    ELEMENTS.statusTab.textContent = 'Chưa mở';
    ELEMENTS.statusTab.className = 'status-value';
  }
}

function getTcaTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: '*://portal.tca.com.vn/*' }, (tabs) => {
      resolve(tabs);
    });
  });
}

// ==========================================
// EVENT HANDLERS
// ==========================================

// Toggle Auto-Sync
ELEMENTS.autoSyncEnabled.addEventListener('change', async () => {
  const enabled = ELEMENTS.autoSyncEnabled.checked;
  await saveSettings({ autoSyncEnabled: enabled });
  
  if (enabled) {
    // Start timer in background
    const intervalHours = parseFloat(ELEMENTS.intervalHours.value) || 0.083;
    chrome.runtime.sendMessage({ 
      action: 'START_AUTO_SYNC',
      intervalHours 
    });
    const mins = Math.round(intervalHours * 60);
    addLog(`Bật Auto-Sync mỗi ${mins < 60 ? mins + ' phút' : intervalHours + ' tiếng'}`, 'success');
  } else {
    // Stop timer
    chrome.runtime.sendMessage({ action: 'STOP_AUTO_SYNC' });
    addLog('Tắt Auto-Sync', 'info');
  }
  
  await updateUI();
});

// Change Interval
ELEMENTS.intervalHours.addEventListener('change', async () => {
  const hours = parseFloat(ELEMENTS.intervalHours.value) || 0.083;
  await saveSettings({ intervalHours: hours });
  
  if (ELEMENTS.autoSyncEnabled.checked) {
    chrome.runtime.sendMessage({ 
      action: 'START_AUTO_SYNC',
      intervalHours: hours 
    });
    addLog(`Đổi interval thành ${hours} tiếng`, 'info');
  }
});

// Save Credentials
ELEMENTS.saveCredentials.addEventListener('click', async () => {
  const email = ELEMENTS.tcaEmail.value.trim();
  const password = ELEMENTS.tcaPassword.value;
  
  if (!email || !password) {
    addLog('Vui lòng nhập đầy đủ email và mật khẩu', 'error');
    return;
  }
  
  await saveSettings({ tcaEmail: email, tcaPassword: password });
  addLog('Đã lưu thông tin đăng nhập', 'success');
});

// Sync Now Button
ELEMENTS.syncNow.addEventListener('click', async () => {
  if (isSyncing) return;
  
  const settings = await loadSettings();
  if (!settings.tcaEmail || !settings.tcaPassword) {
    addLog('Chưa có thông tin đăng nhập!', 'error');
    return;
  }
  
  isSyncing = true;
  ELEMENTS.syncBtnText.innerHTML = '<span class="spinner"></span> Đang xử lý...';
  addLog('📌 Bắt đầu sync thủ công...', 'info');
  
  // Send START_CAPTURE command to content script via background
  chrome.runtime.sendMessage({ action: 'START_CAPTURE' }, (response) => {
    if (response && response.success) {
      addLog('Đã gửi lệnh capture - đợi kết quả...', 'info');
    } else {
      addLog('Lỗi gửi lệnh capture', 'error');
    }
  });
  
  // Update UI after short delay
  setTimeout(() => {
    isSyncing = false;
    ELEMENTS.syncBtnText.textContent = '🔄 Sync Now';
  }, 3000);
  
  updateUI();
});

// ==========================================
// LISTEN FOR MESSAGES FROM BACKGROUND
// ==========================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SYNC_STARTED') {
    addLog(`Auto-sync bắt đầu lúc ${new Date().toLocaleTimeString()}`, 'info');
  } else if (message.action === 'SYNC_COMPLETE') {
    addLog(`Auto-sync hoàn tất: ${message.stats}`, 'success');
    saveSettings({ 
      lastSyncTime: Date.now(),
      lastSyncResult: message.result 
    });
    updateUI();
  } else if (message.action === 'SYNC_ERROR') {
    addLog(`Auto-sync lỗi: ${message.error}`, 'error');
  } else if (message.action === 'LOG') {
    addLog(message.message, message.type || 'info');
  }
});

// ==========================================
// INITIALIZE
// ==========================================
async function init() {
  addLog('Popup khởi tạo...', 'info');
  await updateUI();
  
  // Request current status from background
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (status) => {
    if (status) {
      if (status.autoSyncRunning) {
        const mins = Math.round(status.intervalHours * 60);
        ELEMENTS.statusTimer.textContent = mins < 60 ? `${mins} phút` : `${status.intervalHours}h`;
        addLog(`Auto-Sync đang chạy mỗi ${mins < 60 ? mins + ' phút' : status.intervalHours + ' tiếng'}`, 'success');
      }
    }
  });
  
  addLog('Sẵn sàng!', 'success');
}

init();

// Refresh status every 5 seconds
setInterval(async () => {
  await checkTcaTab();
}, 5000);