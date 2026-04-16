// background.js - Chrome Extension Background Script
// Lắng nghe message từ content script và gửi lên API

const API_ENDPOINT = 'https://giautoandien.io.vn/api/sync-tca';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[TCA Background] Received message:', message.type);

  if (message.type === 'TCA_SYNC_REQUEST') {
    // Gửi data lên API
    handleSyncRequest(message.payload)
      .then(result => {
        // Gửi notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'TCA Sync Complete',
          message: result.message || `Synced ${result.stats?.totalRecords || 0} members`
        });

        // Phản hồi cho content script
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

    // Return true để giữ response channel mở
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

// Optional: Badge update khi có activity
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TCA_SCAN_START') {
    chrome.action.setBadgeText({ text: '...' });
    chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });
  }

  if (message.type === 'TCA_SCAN_COMPLETE') {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  }
});

console.log('[TCA Background] Background script initialized');
