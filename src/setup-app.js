// Served at /setup/app.js
// Modern UX with modals, toasts, loading states, and collapsible sections

(function () {
  var statusEl = document.getElementById('status');
  var statusVersionEl = document.getElementById('statusVersion');
  var authGroupEl = document.getElementById('authGroup');
  var authChoiceEl = document.getElementById('authChoice');
  var logEl = document.getElementById('log');

  // Debug console
  var consoleCmdEl = document.getElementById('consoleCmd');
  var consoleArgEl = document.getElementById('consoleArg');
  var consoleRunEl = document.getElementById('consoleRun');
  var consoleOutEl = document.getElementById('consoleOut');

  // Config editor
  var configPathEl = document.getElementById('configPath');
  var configTextEl = document.getElementById('configText');
  var configReloadEl = document.getElementById('configReload');
  var configSaveEl = document.getElementById('configSave');
  var configOutEl = document.getElementById('configOut');

  // Import
  var importFileEl = document.getElementById('importFile');
  var importRunEl = document.getElementById('importRun');
  var importOutEl = document.getElementById('importOut');
  var fileInputTextEl = document.getElementById('fileInputText');

  // Modal
  var modalEl = document.getElementById('modal');
  var modalHeaderEl = document.getElementById('modalHeader');
  var modalBodyEl = document.getElementById('modalBody');
  var modalConfirmEl = document.getElementById('modalConfirm');

  // Toast
  var toastEl = document.getElementById('toast');
  var toastIconEl = document.getElementById('toastIcon');
  var toastMessageEl = document.getElementById('toastMessage');

  var currentStep = 1;

  // Update step indicator
  function setActiveStep(step) {
    currentStep = step;
    var steps = document.querySelectorAll('.step');
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.remove('active');
      if (Number(steps[i].getAttribute('data-step')) === step) {
        steps[i].classList.add('active');
      }
    }
  }

  // Show toast notification
  function showToast(message, type) {
    type = type || 'success';
    toastEl.className = 'toast active ' + type;
    toastMessageEl.textContent = message;

    var icons = {
      success: '✓',
      error: '✗',
      warning: '⚠'
    };
    toastIconEl.textContent = icons[type] || '•';

    setTimeout(function () {
      toastEl.classList.remove('active');
    }, 4000);
  }

  // Show modal
  function showModal(header, body, onConfirm) {
    modalHeaderEl.textContent = header;
    modalBodyEl.textContent = body;
    modalEl.classList.add('active');

    modalConfirmEl.onclick = function () {
      closeModal();
      if (onConfirm) onConfirm();
    };
  }

  // Close modal
  window.closeModal = function () {
    modalEl.classList.remove('active');
  };

  // Toggle collapsible
  window.toggleCollapsible = function (id) {
    var content = document.getElementById(id + 'Content');
    var toggle = document.getElementById(id + 'Toggle');

    if (content.classList.contains('open')) {
      content.classList.remove('open');
      toggle.classList.remove('open');
    } else {
      content.classList.add('open');
      toggle.classList.add('open');
    }
  };

  // Set button loading state
  function setButtonLoading(btn, loading, text) {
    if (loading) {
      btn.disabled = true;
      var icon = btn.querySelector('#runIcon');
      if (icon) {
        icon.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div>';
      }
      var textEl = btn.querySelector('#runText');
      if (textEl) textEl.textContent = text || 'Processing...';
    } else {
      btn.disabled = false;
      var icon = btn.querySelector('#runIcon');
      if (icon) icon.textContent = '▶';
      var textEl = btn.querySelector('#runText');
      if (textEl) textEl.textContent = 'Run Setup';
    }
  }

  // Format error messages nicely
  function formatError(err) {
    var msg = String(err);
    // Hide stack traces from users
    if (msg.includes('at ') && msg.includes('\n')) {
      var lines = msg.split('\n');
      return lines[0];
    }
    return msg;
  }

  function setStatus(configured, version) {
    statusEl.innerHTML = '';

    var badge = document.createElement('div');
    if (configured === null) {
      badge.className = 'status-badge loading';
      badge.innerHTML = '<div class="spinner"></div><span>Loading...</span>';
    } else if (configured) {
      badge.className = 'status-badge configured';
      badge.innerHTML = '<span>✓</span><span>Configured & Ready</span>';
    } else {
      badge.className = 'status-badge not-configured';
      badge.innerHTML = '<span>!</span><span>Not Configured</span>';
    }

    statusEl.appendChild(badge);

    if (version && statusVersionEl) {
      statusVersionEl.textContent = 'Version: ' + version;
    }
  }

  function renderAuth(groups) {
    authGroupEl.innerHTML = '';
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var opt = document.createElement('option');
      opt.value = g.value;
      opt.textContent = g.label + (g.hint ? ' - ' + g.hint : '');
      authGroupEl.appendChild(opt);
    }

    authGroupEl.onchange = function () {
      var sel = null;
      for (var j = 0; j < groups.length; j++) {
        if (groups[j].value === authGroupEl.value) sel = groups[j];
      }
      authChoiceEl.innerHTML = '';
      var opts = (sel && sel.options) ? sel.options : [];
      for (var k = 0; k < opts.length; k++) {
        var o = opts[k];
        var opt2 = document.createElement('option');
        opt2.value = o.value;
        opt2.textContent = o.label + (o.hint ? ' - ' + o.hint : '');
        authChoiceEl.appendChild(opt2);
      }
    };

    authGroupEl.onchange();
  }

  function httpJson(url, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    return fetch(url, opts).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + ': ' + (t || res.statusText));
        });
      }
      return res.json();
    });
  }

  function refreshStatus() {
    setStatus(null, '');
    return httpJson('/setup/api/status').then(function (j) {
      setStatus(j.configured, j.openclawVersion);
      renderAuth(j.authGroups || []);

      // If channels are unsupported, show warning
      if (j.channelsAddHelp && j.channelsAddHelp.indexOf('telegram') === -1) {
        if (logEl && !logEl.textContent.includes('telegram in `channels add --help`')) {
          logEl.textContent += '\n⚠ Note: This MadBull build may not support Telegram auto-configuration.\n';
        }
      }

      // Load config editor content
      if (configReloadEl && configTextEl) {
        loadConfigRaw();
      }

    }).catch(function (e) {
      setStatus(false, '');
      showToast('Failed to load status: ' + formatError(e), 'error');
    });
  }

  // File input display
  if (importFileEl && fileInputTextEl) {
    importFileEl.onchange = function () {
      var f = importFileEl.files && importFileEl.files[0];
      if (f) {
        fileInputTextEl.textContent = f.name + ' (' + Math.round(f.size / 1024) + ' KB)';
      } else {
        fileInputTextEl.textContent = 'Choose .tar.gz file...';
      }
    };
  }

  // Run setup
  document.getElementById('run').onclick = function () {
    var btn = this;
    var payload = {
      flow: document.getElementById('flow').value,
      authChoice: authChoiceEl.value,
      authSecret: document.getElementById('authSecret').value,
      telegramToken: document.getElementById('telegramToken').value,
      discordToken: document.getElementById('discordToken').value,
      slackBotToken: document.getElementById('slackBotToken').value,
      slackAppToken: document.getElementById('slackAppToken').value
    };

    logEl.textContent = '⚙ Starting setup process...\n';
    setButtonLoading(btn, true, 'Running...');
    setActiveStep(3);

    fetch('/setup/api/run', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.text();
    }).then(function (text) {
      var j;
      try { j = JSON.parse(text); } catch (_e) { j = { ok: false, output: text }; }

      logEl.textContent += '\n' + (j.output || JSON.stringify(j, null, 2));

      if (j.ok) {
        showToast('Setup completed successfully!', 'success');
      } else {
        showToast('Setup failed - check logs', 'error');
      }

      return refreshStatus();
    }).catch(function (e) {
      logEl.textContent += '\n✗ Error: ' + formatError(e) + '\n';
      showToast('Setup failed: ' + formatError(e), 'error');
    }).finally(function () {
      setButtonLoading(btn, false);
    });
  };

  // Debug console runner
  function runConsole() {
    if (!consoleCmdEl || !consoleRunEl) return;
    var cmd = consoleCmdEl.value;
    var arg = consoleArgEl ? consoleArgEl.value : '';
    var btn = consoleRunEl;

    if (consoleOutEl) consoleOutEl.textContent = '⚙ Running ' + cmd + '...\n';
    btn.disabled = true;

    return httpJson('/setup/api/console/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: cmd, arg: arg })
    }).then(function (j) {
      if (consoleOutEl) {
        consoleOutEl.textContent = j.ok ? '✓ Success\n\n' : '✗ Failed\n\n';
        consoleOutEl.textContent += (j.output || JSON.stringify(j, null, 2));
      }
      if (j.ok) {
        showToast('Command executed successfully', 'success');
      }
      return refreshStatus();
    }).catch(function (e) {
      if (consoleOutEl) consoleOutEl.textContent += '\n✗ Error: ' + formatError(e) + '\n';
      showToast('Command failed: ' + formatError(e), 'error');
    }).finally(function () {
      btn.disabled = false;
    });
  }

  if (consoleRunEl) {
    consoleRunEl.onclick = runConsole;
  }

  // Config raw load/save
  function loadConfigRaw() {
    if (!configTextEl) return;
    if (configOutEl) configOutEl.textContent = '';
    return httpJson('/setup/api/config/raw').then(function (j) {
      if (configPathEl) {
        var status = j.exists ? '✓ exists' : '✗ does not exist yet';
        configPathEl.textContent = (j.path || '(unknown)') + ' (' + status + ')';
      }
      configTextEl.value = j.content || '';
    }).catch(function (e) {
      if (configOutEl) configOutEl.textContent = '✗ Error loading config: ' + formatError(e);
      showToast('Failed to load config', 'error');
    });
  }

  function saveConfigRaw() {
    if (!configTextEl) return;

    showModal(
      'Save Configuration',
      'Save config and restart gateway? A timestamped .bak backup will be created.',
      function () {
        if (configOutEl) configOutEl.textContent = '⚙ Saving...\n';

        httpJson('/setup/api/config/raw', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content: configTextEl.value })
        }).then(function (j) {
          if (configOutEl) configOutEl.textContent = '✓ Saved: ' + (j.path || '') + '\nGateway restarted.\n';
          showToast('Config saved and gateway restarted', 'success');
          return refreshStatus();
        }).catch(function (e) {
          if (configOutEl) configOutEl.textContent += '\n✗ Error: ' + formatError(e) + '\n';
          showToast('Failed to save config: ' + formatError(e), 'error');
        });
      }
    );
  }

  if (configReloadEl) configReloadEl.onclick = loadConfigRaw;
  if (configSaveEl) configSaveEl.onclick = saveConfigRaw;

  // Import backup
  function runImport() {
    if (!importRunEl || !importFileEl) return;
    var f = importFileEl.files && importFileEl.files[0];
    if (!f) {
      showToast('Please select a .tar.gz file first', 'warning');
      return;
    }

    showModal(
      'Import Backup',
      'Import backup? This overwrites files under /data and restarts the gateway.',
      function () {
        if (importOutEl) importOutEl.textContent = '⚙ Uploading ' + f.name + ' (' + Math.round(f.size / 1024) + ' KB)...\n';
        importRunEl.disabled = true;

        f.arrayBuffer().then(function (buf) {
          return fetch('/setup/import', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/gzip' },
            body: buf
          });
        }).then(function (res) {
          return res.text().then(function (t) {
            if (importOutEl) importOutEl.textContent += t + '\n';
            if (!res.ok) {
              throw new Error('HTTP ' + res.status + ': ' + t);
            }
            showToast('Backup imported successfully', 'success');
            return refreshStatus();
          });
        }).catch(function (e) {
          if (importOutEl) importOutEl.textContent += '\n✗ Error: ' + formatError(e) + '\n';
          showToast('Import failed: ' + formatError(e), 'error');
        }).finally(function () {
          importRunEl.disabled = false;
        });
      }
    );
  }

  if (importRunEl) importRunEl.onclick = runImport;

  // Pairing approve helper
  var pairingBtn = document.getElementById('pairingApprove');
  if (pairingBtn) {
    pairingBtn.onclick = function () {
      var modalBody = document.createElement('div');
      modalBody.innerHTML = '<label style="margin-bottom:0.5rem;">Channel</label>' +
        '<select id="pairingChannel" style="width:100%;margin-bottom:1rem;">' +
        '<option value="telegram">Telegram</option>' +
        '<option value="discord">Discord</option>' +
        '</select>' +
        '<label style="margin-bottom:0.5rem;">Pairing Code</label>' +
        '<input id="pairingCode" type="text" placeholder="e.g. 3EY4PUYS" style="width:100%;" />';

      modalHeaderEl.textContent = 'Approve Pairing';
      modalBodyEl.innerHTML = '';
      modalBodyEl.appendChild(modalBody);
      modalEl.classList.add('active');

      modalConfirmEl.onclick = function () {
        var channel = document.getElementById('pairingChannel').value;
        var code = document.getElementById('pairingCode').value.trim();

        if (!code) {
          showToast('Please enter a pairing code', 'warning');
          return;
        }

        closeModal();
        logEl.textContent += '\n⚙ Approving pairing for ' + channel + '...\n';

        fetch('/setup/api/pairing/approve', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ channel: channel, code: code })
        }).then(function (r) { return r.text(); })
          .then(function (t) {
            logEl.textContent += t + '\n';
            showToast('Pairing approved for ' + channel, 'success');
          })
          .catch(function (e) {
            logEl.textContent += '✗ Error: ' + formatError(e) + '\n';
            showToast('Pairing failed: ' + formatError(e), 'error');
          });
      };
    };
  }

  // Reset setup
  document.getElementById('reset').onclick = function () {
    showModal(
      'Reset Setup',
      'Reset setup? This deletes the config file so onboarding can run again.',
      function () {
        logEl.textContent = '⚙ Resetting...\n';
        fetch('/setup/api/reset', { method: 'POST', credentials: 'same-origin' })
          .then(function (res) { return res.text(); })
          .then(function (t) {
            logEl.textContent += t + '\n';
            showToast('Setup reset successfully', 'success');
            return refreshStatus();
          })
          .catch(function (e) {
            logEl.textContent += '✗ Error: ' + formatError(e) + '\n';
            showToast('Reset failed: ' + formatError(e), 'error');
          });
      }
    );
  };

  // Initialize
  setActiveStep(1);
  refreshStatus();

  // Click outside modal to close
  modalEl.onclick = function (e) {
    if (e.target === modalEl) {
      closeModal();
    }
  };
})();
