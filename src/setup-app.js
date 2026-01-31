// MadBull Setup Wizard - Client JS
// Proper step-by-step wizard with navigation, validation, and full API integration.

(function () {
  // ── Element refs ──
  var statusEl = document.getElementById('status');
  var statusVersionEl = document.getElementById('statusVersion');
  var authGroupEl = document.getElementById('authGroup');
  var authChoiceEl = document.getElementById('authChoice');
  var logEl = document.getElementById('log');
  var launchLinksEl = document.getElementById('launchLinks');

  // Navigation
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');

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

  // ── Wizard State ──
  var currentStep = 1;
  var totalSteps = 3;
  var isConfigured = false;

  // ── Step Navigation ──
  function showStep(step) {
    if (step < 1) step = 1;
    if (step > totalSteps) step = totalSteps;
    currentStep = step;

    // Update step indicators
    var steps = document.querySelectorAll('.step');
    for (var i = 0; i < steps.length; i++) {
      var s = Number(steps[i].getAttribute('data-step'));
      steps[i].classList.remove('active', 'done');
      if (s === step) steps[i].classList.add('active');
      else if (s < step) steps[i].classList.add('done');
    }

    // Update step circle content (checkmark for completed)
    for (var i = 0; i < steps.length; i++) {
      var s = Number(steps[i].getAttribute('data-step'));
      var numEl = steps[i].querySelector('.step-num');
      if (numEl) {
        numEl.textContent = s < step ? '\u2713' : String(s);
      }
    }

    // Update connecting lines
    var lines = document.querySelectorAll('.step-line');
    for (var i = 0; i < lines.length; i++) {
      var afterStep = Number(lines[i].getAttribute('data-after'));
      lines[i].classList.toggle('done', afterStep < step);
    }

    // Show/hide panels
    var panels = document.querySelectorAll('.panel');
    for (var i = 0; i < panels.length; i++) {
      var ps = Number(panels[i].getAttribute('data-step'));
      panels[i].classList.toggle('active', ps === step);
    }

    // Update navigation buttons
    prevBtn.style.display = step > 1 ? '' : 'none';

    if (step === totalSteps) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = '';
      nextBtn.textContent = step === 1 ? 'Continue \u2192' : 'Continue \u2192';
    }
  }

  // Step click navigation
  var stepEls = document.querySelectorAll('.step');
  for (var i = 0; i < stepEls.length; i++) {
    (function (el) {
      el.addEventListener('click', function () {
        var target = Number(el.getAttribute('data-step'));
        showStep(target);
      });
    })(stepEls[i]);
  }

  // Prev/Next buttons
  prevBtn.addEventListener('click', function () {
    showStep(currentStep - 1);
  });

  nextBtn.addEventListener('click', function () {
    showStep(currentStep + 1);
  });

  // ── Toast ──
  var toastTimer = null;
  function showToast(message, type) {
    type = type || 'success';
    toastEl.className = 'toast active ' + type;
    toastMessageEl.textContent = message;

    var icons = { success: '\u2713', error: '\u2717', warning: '\u26A0' };
    toastIconEl.textContent = icons[type] || '\u2022';

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('active');
    }, 4000);
  }

  // ── Modal ──
  function showModal(header, body, onConfirm) {
    modalHeaderEl.textContent = header;
    if (typeof body === 'string') {
      modalBodyEl.textContent = body;
    } else {
      modalBodyEl.innerHTML = '';
      modalBodyEl.appendChild(body);
    }
    modalEl.classList.add('active');

    modalConfirmEl.onclick = function () {
      closeModal();
      if (onConfirm) onConfirm();
    };
  }

  window.closeModal = function () {
    modalEl.classList.remove('active');
  };

  // Click outside modal to close
  modalEl.addEventListener('click', function (e) {
    if (e.target === modalEl) closeModal();
  });

  // ── Button Loading State ──
  function setButtonLoading(btn, loading, text) {
    if (loading) {
      btn.disabled = true;
      var icon = btn.querySelector('#runIcon');
      if (icon) icon.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div>';
      var textEl = btn.querySelector('#runText');
      if (textEl) textEl.textContent = text || 'Processing...';
    } else {
      btn.disabled = false;
      var icon = btn.querySelector('#runIcon');
      if (icon) icon.innerHTML = '&#9654;';
      var textEl = btn.querySelector('#runText');
      if (textEl) textEl.textContent = 'Run Setup';
    }
  }

  // ── Helpers ──
  function formatError(err) {
    var msg = String(err);
    if (msg.includes('at ') && msg.indexOf('\n') !== -1) {
      return msg.split('\n')[0];
    }
    return msg;
  }

  // Resolve relative URLs against origin to strip any embedded credentials
  // (browsers block fetch when the page URL contains user:pass@).
  function resolveUrl(url) {
    if (url.charAt(0) === '/') return window.location.origin + url;
    return url;
  }

  function httpJson(url, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    // Abort after 15 seconds to avoid hanging forever when CLI commands stall.
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 15000);
    opts.signal = controller.signal;
    return fetch(resolveUrl(url), opts).then(function (res) {
      clearTimeout(timeoutId);
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + ': ' + (t || res.statusText));
        });
      }
      return res.json();
    }).catch(function (e) {
      clearTimeout(timeoutId);
      throw e;
    });
  }

  // ── Status ──
  function setStatus(configured, version) {
    statusEl.innerHTML = '';
    isConfigured = !!configured;

    var badge = document.createElement('div');
    if (configured === null) {
      badge.className = 'status-badge loading';
      badge.innerHTML = '<div class="spinner"></div><span>Loading...</span>';
    } else if (configured) {
      badge.className = 'status-badge configured';
      badge.innerHTML = '<span>\u2713</span><span>Configured</span>';
    } else {
      badge.className = 'status-badge not-configured';
      badge.innerHTML = '<span>!</span><span>Not Configured</span>';
    }
    statusEl.appendChild(badge);

    if (version && statusVersionEl) {
      statusVersionEl.textContent = 'v' + version;
    }

    // Show launch links if configured
    if (launchLinksEl) {
      launchLinksEl.style.display = configured ? 'flex' : 'none';
    }
  }

  // ── Auth Rendering ──
  function renderAuth(groups) {
    authGroupEl.innerHTML = '';
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var opt = document.createElement('option');
      opt.value = g.value;
      opt.textContent = g.label + (g.hint ? ' \u2013 ' + g.hint : '');
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
        opt2.textContent = o.label + (o.hint ? ' \u2013 ' + o.hint : '');
        authChoiceEl.appendChild(opt2);
      }
    };
    authGroupEl.onchange();
  }

  // ── Fallback auth groups (mirrors server-side AUTH_GROUPS) ──
  // Used when the /setup/api/status endpoint fails or times out so
  // provider dropdowns are always populated.
  var FALLBACK_AUTH_GROUPS = [
    { value: "openai", label: "OpenAI", hint: "Codex OAuth + API key", options: [
      { value: "codex-cli", label: "OpenAI Codex OAuth (Codex CLI)" },
      { value: "openai-codex", label: "OpenAI Codex (ChatGPT OAuth)" },
      { value: "openai-api-key", label: "OpenAI API key" }
    ]},
    { value: "anthropic", label: "Anthropic", hint: "Claude Code CLI + API key", options: [
      { value: "claude-cli", label: "Anthropic token (Claude Code CLI)" },
      { value: "token", label: "Anthropic token (paste setup-token)" },
      { value: "apiKey", label: "Anthropic API key" }
    ]},
    { value: "google", label: "Google", hint: "Gemini API key + OAuth", options: [
      { value: "gemini-api-key", label: "Google Gemini API key" },
      { value: "google-antigravity", label: "Google Antigravity OAuth" },
      { value: "google-gemini-cli", label: "Google Gemini CLI OAuth" }
    ]},
    { value: "openrouter", label: "OpenRouter", hint: "API key", options: [
      { value: "openrouter-api-key", label: "OpenRouter API key" }
    ]},
    { value: "ai-gateway", label: "Vercel AI Gateway", hint: "API key", options: [
      { value: "ai-gateway-api-key", label: "Vercel AI Gateway API key" }
    ]},
    { value: "moonshot", label: "Moonshot AI", hint: "Kimi K2 + Kimi Code", options: [
      { value: "moonshot-api-key", label: "Moonshot AI API key" },
      { value: "kimi-code-api-key", label: "Kimi Code API key" }
    ]},
    { value: "zai", label: "Z.AI (GLM 4.7)", hint: "API key", options: [
      { value: "zai-api-key", label: "Z.AI (GLM 4.7) API key" }
    ]},
    { value: "minimax", label: "MiniMax", hint: "M2.1 (recommended)", options: [
      { value: "minimax-api", label: "MiniMax M2.1" },
      { value: "minimax-api-lightning", label: "MiniMax M2.1 Lightning" }
    ]},
    { value: "qwen", label: "Qwen", hint: "OAuth", options: [
      { value: "qwen-portal", label: "Qwen OAuth" }
    ]},
    { value: "copilot", label: "Copilot", hint: "GitHub + local proxy", options: [
      { value: "github-copilot", label: "GitHub Copilot (GitHub device login)" },
      { value: "copilot-proxy", label: "Copilot Proxy (local)" }
    ]},
    { value: "synthetic", label: "Synthetic", hint: "Anthropic-compatible (multi-model)", options: [
      { value: "synthetic-api-key", label: "Synthetic API key" }
    ]},
    { value: "opencode-zen", label: "OpenCode Zen", hint: "API key", options: [
      { value: "opencode-zen", label: "OpenCode Zen (multi-model proxy)" }
    ]}
  ];

  // ── Refresh Status ──
  function refreshStatus() {
    setStatus(null, '');
    return httpJson('/setup/api/status').then(function (j) {
      setStatus(j.configured, j.openclawVersion);
      renderAuth(j.authGroups && j.authGroups.length ? j.authGroups : FALLBACK_AUTH_GROUPS);

      // Surface server-side warnings (CLI timeouts, command failures, etc.)
      var bannerEl = document.getElementById('warningBanner');
      if (j.warnings && j.warnings.length) {
        // Show inline warning banner (visible on every step)
        if (bannerEl) {
          var html = '<div class="warn-title">\u26A0 ' + j.warnings.length + ' warning(s) from server</div>';
          for (var w = 0; w < j.warnings.length; w++) {
            html += '<div class="warn-item">' + j.warnings[w] + '</div>';
          }
          bannerEl.innerHTML = html;
          bannerEl.style.display = 'block';
        }
        // Also append to log area for full context
        for (var w2 = 0; w2 < j.warnings.length; w2++) {
          if (logEl) logEl.textContent += '\u26A0 ' + j.warnings[w2] + '\n';
        }
      } else if (bannerEl) {
        bannerEl.style.display = 'none';
        bannerEl.innerHTML = '';
      }

      if (j.channelsAddHelp && j.channelsAddHelp.indexOf('telegram') === -1) {
        if (logEl && !logEl.textContent.includes('telegram')) {
          logEl.textContent += '\u26A0 Note: This build may not support Telegram auto-configuration.\n';
        }
      }

      if (configReloadEl && configTextEl) {
        loadConfigRaw();
      }
    }).catch(function (e) {
      setStatus(false, '');
      renderAuth(FALLBACK_AUTH_GROUPS);
      // Show error in banner so it's visible on any step
      var bannerEl = document.getElementById('warningBanner');
      if (bannerEl) {
        bannerEl.innerHTML = '<div class="warn-title">\u26A0 Status API unreachable</div>' +
          '<div class="warn-item">' + formatError(e) + '</div>' +
          '<div class="warn-item" style="color:var(--text-2);margin-top:4px">Provider list loaded from defaults. Setup may still work.</div>';
        bannerEl.style.display = 'block';
      }
      showToast('Status API failed \u2013 using defaults', 'warning');
    });
  }

  // ── File Input Display ──
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

  // ── Run Setup (NDJSON streaming) ──
  document.getElementById('run').addEventListener('click', function () {
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

    logEl.textContent = '\u2699 Starting setup...\n';
    setButtonLoading(btn, true, 'Running...');

    fetch(resolveUrl('/setup/api/run'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.body) {
        // Fallback for browsers that don't support ReadableStream
        return res.text().then(function (text) {
          var lines = text.split('\n');
          var ok = false;
          for (var i = 0; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            try {
              var msg = JSON.parse(lines[i]);
              if (msg.type === 'log') logEl.textContent += msg.text;
              if (msg.type === 'done') ok = msg.ok;
            } catch (_e) {
              logEl.textContent += lines[i] + '\n';
            }
          }
          return ok;
        });
      }

      // Stream NDJSON line by line
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var finalOk = false;

      function processChunk(result) {
        if (result.done) return finalOk;
        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete last line in buffer
        for (var i = 0; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          try {
            var msg = JSON.parse(lines[i]);
            if (msg.type === 'log') {
              logEl.textContent += msg.text;
              logEl.scrollTop = logEl.scrollHeight;
            }
            if (msg.type === 'done') finalOk = msg.ok;
          } catch (_e) {
            logEl.textContent += lines[i] + '\n';
          }
        }
        return reader.read().then(processChunk);
      }

      return reader.read().then(processChunk);
    }).then(function (ok) {
      if (ok) {
        showToast('Setup completed successfully!', 'success');
      } else {
        showToast('Setup failed \u2013 check logs above', 'error');
      }
      return refreshStatus();
    }).catch(function (e) {
      logEl.textContent += '\n\u2717 Error: ' + formatError(e) + '\n';
      showToast('Setup failed: ' + formatError(e), 'error');
    }).finally(function () {
      setButtonLoading(btn, false);
    });
  });

  // ── Debug Console ──
  function runConsole() {
    if (!consoleCmdEl || !consoleRunEl) return;
    var cmd = consoleCmdEl.value;
    var arg = consoleArgEl ? consoleArgEl.value : '';
    var btn = consoleRunEl;

    if (consoleOutEl) consoleOutEl.textContent = '\u2699 Running ' + cmd + '...\n';
    btn.disabled = true;

    return httpJson('/setup/api/console/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: cmd, arg: arg })
    }).then(function (j) {
      if (consoleOutEl) {
        consoleOutEl.textContent = (j.ok ? '\u2713 Success\n\n' : '\u2717 Failed\n\n');
        consoleOutEl.textContent += (j.output || JSON.stringify(j, null, 2));
      }
      if (j.ok) showToast('Command executed', 'success');
      return refreshStatus();
    }).catch(function (e) {
      if (consoleOutEl) consoleOutEl.textContent += '\n\u2717 Error: ' + formatError(e) + '\n';
      showToast('Command failed: ' + formatError(e), 'error');
    }).finally(function () {
      btn.disabled = false;
    });
  }

  if (consoleRunEl) consoleRunEl.addEventListener('click', runConsole);

  // ── Config Editor ──
  function loadConfigRaw() {
    if (!configTextEl) return;
    if (configOutEl) configOutEl.textContent = '';
    return httpJson('/setup/api/config/raw').then(function (j) {
      if (configPathEl) {
        var status = j.exists ? '\u2713 exists' : '\u2717 not created yet';
        configPathEl.textContent = (j.path || '(unknown)') + ' (' + status + ')';
      }
      configTextEl.value = j.content || '';
    }).catch(function (e) {
      if (configOutEl) configOutEl.textContent = '\u2717 Error loading config: ' + formatError(e);
      showToast('Failed to load config', 'error');
    });
  }

  function saveConfigRaw() {
    if (!configTextEl) return;
    showModal(
      'Save Configuration',
      'Save config and restart the gateway? A timestamped backup will be created.',
      function () {
        if (configOutEl) configOutEl.textContent = '\u2699 Saving...\n';
        httpJson('/setup/api/config/raw', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content: configTextEl.value })
        }).then(function (j) {
          if (configOutEl) configOutEl.textContent = '\u2713 Saved: ' + (j.path || '') + '\nGateway restarted.\n';
          showToast('Config saved & gateway restarted', 'success');
          return refreshStatus();
        }).catch(function (e) {
          if (configOutEl) configOutEl.textContent += '\n\u2717 Error: ' + formatError(e) + '\n';
          showToast('Failed to save config: ' + formatError(e), 'error');
        });
      }
    );
  }

  if (configReloadEl) configReloadEl.addEventListener('click', loadConfigRaw);
  if (configSaveEl) configSaveEl.addEventListener('click', saveConfigRaw);

  // ── Import Backup ──
  function runImport() {
    if (!importRunEl || !importFileEl) return;
    var f = importFileEl.files && importFileEl.files[0];
    if (!f) {
      showToast('Select a .tar.gz file first', 'warning');
      return;
    }

    showModal(
      'Import Backup',
      'This overwrites files under /data and restarts the gateway. Continue?',
      function () {
        if (importOutEl) importOutEl.textContent = '\u2699 Uploading ' + f.name + ' (' + Math.round(f.size / 1024) + ' KB)...\n';
        importRunEl.disabled = true;

        f.arrayBuffer().then(function (buf) {
          return fetch(resolveUrl('/setup/import'), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/gzip' },
            body: buf
          });
        }).then(function (res) {
          return res.text().then(function (t) {
            if (importOutEl) importOutEl.textContent += t + '\n';
            if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + t);
            showToast('Backup imported', 'success');
            return refreshStatus();
          });
        }).catch(function (e) {
          if (importOutEl) importOutEl.textContent += '\n\u2717 Error: ' + formatError(e) + '\n';
          showToast('Import failed: ' + formatError(e), 'error');
        }).finally(function () {
          importRunEl.disabled = false;
        });
      }
    );
  }

  if (importRunEl) importRunEl.addEventListener('click', runImport);

  // ── Pairing Approve ──
  var pairingBtn = document.getElementById('pairingApprove');
  if (pairingBtn) {
    pairingBtn.addEventListener('click', function () {
      var body = document.createElement('div');
      body.innerHTML =
        '<div style="margin-bottom:12px"><label style="display:block;font-size:12px;font-weight:600;color:#8e8ea0;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em">Channel</label>' +
        '<select id="pairingChannel" style="width:100%;padding:10px 14px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#ececf0;font-size:14px;font-family:inherit;outline:none">' +
        '<option value="telegram">Telegram</option><option value="discord">Discord</option></select></div>' +
        '<div><label style="display:block;font-size:12px;font-weight:600;color:#8e8ea0;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em">Pairing Code</label>' +
        '<input id="pairingCode" type="text" placeholder="e.g. 3EY4PUYS" style="width:100%;padding:10px 14px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#ececf0;font-size:14px;font-family:inherit;outline:none"></div>';

      showModal('Approve Pairing', body, function () {
        var channel = document.getElementById('pairingChannel').value;
        var code = document.getElementById('pairingCode').value.trim();
        if (!code) {
          showToast('Enter a pairing code', 'warning');
          return;
        }

        logEl.textContent += '\n\u2699 Approving pairing for ' + channel + '...\n';

        fetch(resolveUrl('/setup/api/pairing/approve'), {
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
            logEl.textContent += '\u2717 Error: ' + formatError(e) + '\n';
            showToast('Pairing failed: ' + formatError(e), 'error');
          });
      });
    });
  }

  // ── Reset Setup ──
  document.getElementById('reset').addEventListener('click', function () {
    showModal(
      'Reset Setup',
      'Delete the config file so onboarding can run again? Credentials and sessions are kept.',
      function () {
        logEl.textContent = '\u2699 Resetting...\n';
        fetch(resolveUrl('/setup/api/reset'), { method: 'POST', credentials: 'same-origin' })
          .then(function (res) { return res.text(); })
          .then(function (t) {
            logEl.textContent += t + '\n';
            showToast('Setup reset', 'success');
            return refreshStatus();
          })
          .catch(function (e) {
            logEl.textContent += '\u2717 Error: ' + formatError(e) + '\n';
            showToast('Reset failed: ' + formatError(e), 'error');
          });
      }
    );
  });

  // ── Initialize ──
  showStep(1);
  refreshStatus();
})();
