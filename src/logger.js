'use strict';

/*
  Logger capture module
  - Capture các cuộc gọi console.log/warn/error/info/debug/group/groupEnd
  - Lưu vào window.__APP_LOGS (mảng các entries)
  - Cung cấp API: window.APP_LOGGER = { push, getLogs, clear, exportLogs, enable, disable }
  - Tự động tạo nút nổi "Download Logs" trên UI (nếu chạy trong browser)
*/

(function(global){
  const ORIGINAL = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
    group: console.group ? console.group.bind(console) : () => {},
    groupCollapsed: console.groupCollapsed ? console.groupCollapsed.bind(console) : () => {},
    groupEnd: console.groupEnd ? console.groupEnd.bind(console) : () => {}
  };

  const LOGS = [];
  let enabled = true;

  function timestamp() { return (new Date()).toISOString(); }

  function pushEntry(level, args) {
    try {
      const entry = {
        ts: timestamp(),
        level,
        message: Array.from(args).map(a => {
          // stringify args for JSON-safety; preserve objects
          try {
            if (typeof a === 'object') return JSON.parse(JSON.stringify(a));
            return a;
          } catch (e) {
            try { return String(a); } catch (e2) { return '[unserializable]'; }
          }
        })
      };
      LOGS.push(entry);
    } catch (e) {
      // ignore
    }
  }

  // patch console
  function wrapConsoleMethod(name) {
    return function(...args) {
      if (enabled) pushEntry(name, args);
      ORIGINAL[name](...args);
    };
  }

  console.log = wrapConsoleMethod('log');
  console.info = wrapConsoleMethod('info');
  console.warn = wrapConsoleMethod('warn');
  console.error = wrapConsoleMethod('error');
  console.debug = wrapConsoleMethod('debug');

  // groups - capture boundaries
  console.group = function(...args){
    if (enabled) pushEntry('group', args);
    ORIGINAL.group(...args);
  };
  console.groupCollapsed = function(...args){
    if (enabled) pushEntry('groupCollapsed', args);
    ORIGINAL.groupCollapsed(...args);
  };
  console.groupEnd = function(...args){
    if (enabled) pushEntry('groupEnd', args);
    ORIGINAL.groupEnd(...args);
  };

  function getLogs() {
    return LOGS.slice();
  }

  function clearLogs() {
    LOGS.length = 0;
  }

  function exportLogs(filename) {
    const data = {
      exportedAt: timestamp(),
      userAgent: navigator.userAgent,
      logs: LOGS.slice()
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `app-logs-${(new Date()).toISOString().replace(/[:.]/g,'-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // create floating button for download & clear
  function createDownloadUI() {
    try {
      const btn = document.createElement('button');
      btn.id = 'app-log-download-btn';
      btn.textContent = 'Download Logs';
      btn.style.position = 'fixed';
      btn.style.right = '12px';
      btn.style.bottom = '12px';
      btn.style.zIndex = 99999;
      btn.style.background = '#0f172a';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.padding = '8px 12px';
      btn.style.borderRadius = '6px';
      btn.style.cursor = 'pointer';
      btn.style.boxShadow = '0 4px 12px rgba(2,6,23,0.2)';
      btn.title = 'Click to download debug logs (JSON)';
      btn.addEventListener('click', () => {
        exportLogs();
      });

      const clearBtn = document.createElement('button');
      clearBtn.textContent = 'Clear Logs';
      clearBtn.style.marginLeft = '8px';
      clearBtn.style.background = '#111827';
      clearBtn.style.color = 'white';
      clearBtn.style.border = 'none';
      clearBtn.style.padding = '8px 12px';
      clearBtn.style.borderRadius = '6px';
      clearBtn.style.cursor = 'pointer';
      clearBtn.addEventListener('click', () => {
        clearLogs();
        ORIGINAL.log('APP_LOGGER: logs cleared');
      });

      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.right = '12px';
      wrapper.style.bottom = '12px';
      wrapper.style.zIndex = 99999;
      wrapper.style.display = 'flex';
      wrapper.style.gap = '8px';
      wrapper.appendChild(btn);
      wrapper.appendChild(clearBtn);

      document.body.appendChild(wrapper);
    } catch (e) {
      ORIGINAL.warn('APP_LOGGER: could not create UI button', e);
    }
  }

  // expose API
  const API = {
    push: (level, ...args) => pushEntry(level, args),
    getLogs,
    clear: clearLogs,
    exportLogs,
    enable: () => { enabled = true; },
    disable: () => { enabled = false; }
  };

  // attach to window
  global.APP_LOGGER = API;
  global.__APP_LOGS = LOGS;

  // create button after DOMReady (or immediately if ready)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    createDownloadUI();
  } else {
    document.addEventListener('DOMContentLoaded', createDownloadUI, { once: true });
  }

  ORIGINAL.log('APP_LOGGER initialized. Use window.APP_LOGGER.getLogs()/exportLogs()/clear()');
})(window);