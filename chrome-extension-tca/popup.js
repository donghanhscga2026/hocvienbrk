// TCA Auto-Sync Popup Script

const ELEMENTS = {
  autoSyncEnabled: document.getElementById('autoSyncEnabled'),
  intervalHours: document.getElementById('intervalHours'),
  intervalMinutes: document.getElementById('intervalMinutes'),
  tcaEmail: document.getElementById('tcaEmail'),
  tcaPassword: document.getElementById('tcaPassword'),
  saveCredentials: document.getElementById('saveCredentials'),
  syncNow: document.getElementById('syncNow'),
  syncBtnText: document.getElementById('syncBtnText'),
  syncPreview: document.getElementById('syncPreview'),
  previewBtnText: document.getElementById('previewBtnText'),
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
  intervalHours: 12,
  intervalMinutes: 0,
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
  ELEMENTS.intervalHours.value = settings.intervalHours || 12;
  ELEMENTS.intervalMinutes.value = settings.intervalMinutes || 0;
  ELEMENTS.tcaEmail.value = settings.tcaEmail;
  ELEMENTS.tcaPassword.value = settings.tcaPassword;
  
  // Update button text - keep as click button
  ELEMENTS.syncBtnText.textContent = '⚡ Auto Sync';
  ELEMENTS.syncBtnText.parentElement.classList.add('btn-success');
  
  // Update status
  ELEMENTS.statusAutoSync.textContent = settings.autoSyncEnabled ? 'Bật' : 'Tắt';
  ELEMENTS.statusAutoSync.className = `status-value ${settings.autoSyncEnabled ? 'success' : ''}`;
  
  if (settings.lastSyncTime) {
    const date = new Date(settings.lastSyncTime);
    ELEMENTS.statusLastSync.textContent = date.toLocaleString('vi-VN');
  } else {
    ELEMENTS.statusLastSync.textContent = 'Chưa sync';
  }
  
  const totalMins = (settings.intervalHours || 12) * 60 + (settings.intervalMinutes || 0);
  ELEMENTS.statusTimer.textContent = settings.autoSyncEnabled 
    ? (totalMins >= 60 ? `${Math.floor(totalMins/60)}h${totalMins%60 > 0 ? totalMins%60 + 'p' : ''}` : `${totalMins} phút`)
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
  const hours = parseFloat(ELEMENTS.intervalHours.value) || 12;
  const mins = parseInt(ELEMENTS.intervalMinutes.value) || 0;
  const totalHours = hours + mins / 60;
  
  await saveSettings({ 
    autoSyncEnabled: enabled,
    intervalHours: hours,
    intervalMinutes: mins
  });
  
  if (enabled) {
    chrome.runtime.sendMessage({ 
      action: 'START_AUTO_SYNC',
      intervalHours: totalHours
    });
    addLog(`Bật Auto-Sync: ${hours}h ${mins}p`, 'success');
  } else {
    chrome.runtime.sendMessage({ action: 'STOP_AUTO_SYNC' });
    addLog('Tắt Auto-Sync', 'info');
  }
  
  updateUI();
});

// Change Interval
ELEMENTS.intervalHours.addEventListener('change', async () => {
  const hours = parseFloat(ELEMENTS.intervalHours.value) || 12;
  const mins = parseInt(ELEMENTS.intervalMinutes.value) || 0;
  const totalHours = hours + mins / 60;
  
  await saveSettings({ 
    intervalHours: hours,
    intervalMinutes: mins
  });
  
  if (ELEMENTS.autoSyncEnabled.checked) {
    chrome.runtime.sendMessage({ 
      action: 'START_AUTO_SYNC',
      intervalHours: totalHours
    });
    addLog(`Đổi interval: ${hours}h ${mins}p`, 'info');
  }
});

ELEMENTS.intervalMinutes.addEventListener('change', async () => {
  const hours = parseFloat(ELEMENTS.intervalHours.value) || 12;
  const mins = parseInt(ELEMENTS.intervalMinutes.value) || 0;
  const totalHours = hours + mins / 60;
  
  await saveSettings({ 
    intervalHours: hours,
    intervalMinutes: mins
  });
  
  if (ELEMENTS.autoSyncEnabled.checked) {
    chrome.runtime.sendMessage({ 
      action: 'START_AUTO_SYNC',
      intervalHours: totalHours
    });
    addLog(`Đổi interval: ${hours}h ${mins}p`, 'info');
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

// Sync Now Button - Run Immediate Sync
ELEMENTS.syncNow.addEventListener('click', async () => {
  if (isSyncing) return;
  
  const settings = await loadSettings();
  if (!settings.tcaEmail || !settings.tcaPassword) {
    addLog('Chưa có thông tin đăng nhập!', 'error');
    return;
  }
  
  isSyncing = true;
  ELEMENTS.syncBtnText.innerHTML = '<span class="spinner"></span> Đang sync...';
  addLog('⚡ Bắt đầu sync ngay...', 'info');
  
  chrome.runtime.sendMessage({ action: 'START_CAPTURE' }, (response) => {
    if (response && response.success) {
      addLog('Đã gửi lệnh - đợi kết quả...', 'info');
    } else {
      addLog('Lỗi gửi lệnh', 'error');
    }
  });
  
  setTimeout(() => {
    isSyncing = false;
    ELEMENTS.syncBtnText.textContent = '⚡ Auto Sync';
  }, 3000);
  
  updateUI();
});

// Preview + Sync Button
ELEMENTS.syncPreview.addEventListener('click', async () => {
  if (isSyncing) return;
  
  const settings = await loadSettings();
  if (!settings.tcaEmail || !settings.tcaPassword) {
    addLog('Chưa có thông tin đăng nhập!', 'error');
    return;
  }
  
  isSyncing = true;
  ELEMENTS.previewBtnText.innerHTML = '<span class="spinner"></span> Đang xử lý...';
  addLog('📋 Preview + Sync...', 'info');
  
  // Mở TCA Portal để chạy preview (người dùng tự thao tác)
  chrome.tabs.create({ url: 'https://portal.tca.com.vn/group_management/group' }, (tab) => {
    addLog('Đã mở TCA Portal - tự quét và sync', 'info');
    addLog('Nếu cần xem trước dữ liệu, dùng nút trên trang web', 'info');
  });
  
  setTimeout(() => {
    isSyncing = false;
    ELEMENTS.previewBtnText.textContent = '📋 Preview + Sync';
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
        const hours = Math.floor(status.intervalHours);
        const mins = Math.round((status.intervalHours % 1) * 60);
        ELEMENTS.statusTimer.textContent = `${hours}h${mins > 0 ? mins + 'p' : ''}`;
        addLog(`Auto-Sync: ${hours}h ${mins}p`, 'success');
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