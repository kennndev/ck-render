import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/webchat/widget
 *
 * Serves the embeddable webchat widget JavaScript.
 * Users add this script to their website and it creates a floating chat bubble.
 */
export async function GET(req: Request) {
  // The base URL of *this* SaaS app (not the user's site)
  const origin = new URL(req.url).origin

  const widgetJS = `
(function() {
  'use strict';

  // Read config from the script tag or data attributes
  var scriptTag = document.currentScript || (function() {
    var scripts = document.querySelectorAll('script[data-instance-id]');
    return scripts[scripts.length - 1];
  })();

  var config = {
    instanceId: scriptTag ? scriptTag.dataset.instanceId || scriptTag.dataset.instanceid : '',
    theme: scriptTag ? (scriptTag.dataset.theme || 'light') : 'light',
    position: scriptTag ? (scriptTag.dataset.position || 'bottom-right') : 'bottom-right',
    color: scriptTag ? (scriptTag.dataset.color || '#7c3aed') : '#7c3aed',
    greeting: scriptTag ? (scriptTag.dataset.greeting || 'Hi! How can I help you?') : 'Hi! How can I help you?',
    apiUrl: '${origin}/api/webchat',
  };

  if (!config.instanceId) {
    console.error('[Kainat Widget] Missing data-instance-id attribute');
    return;
  }

  var sessionId = 'webchat-' + Math.random().toString(36).substr(2, 9);
  var messages = [];
  var isOpen = false;
  var isLoading = false;

  // CSS injection
  var style = document.createElement('style');
  style.textContent = [
    '.kainat-widget-container * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }',
    '.kainat-fab { position: fixed; width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 99998; transition: transform 0.2s, box-shadow 0.2s; }',
    '.kainat-fab:hover { transform: scale(1.05); box-shadow: 0 6px 24px rgba(0,0,0,0.25); }',
    '.kainat-fab svg { width: 24px; height: 24px; fill: white; }',
    '.kainat-chat { position: fixed; width: 380px; height: 520px; border-radius: 16px; overflow: hidden; display: none; flex-direction: column; z-index: 99999; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }',
    '.kainat-chat.open { display: flex; }',
    '.kainat-header { padding: 16px; display: flex; align-items: center; gap: 12px; }',
    '.kainat-header-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }',
    '.kainat-header-avatar svg { width: 20px; height: 20px; fill: white; }',
    '.kainat-header-info { flex: 1; }',
    '.kainat-header-name { color: white; font-weight: 600; font-size: 14px; }',
    '.kainat-header-status { color: rgba(255,255,255,0.7); font-size: 12px; }',
    '.kainat-close { background: none; border: none; color: white; cursor: pointer; padding: 4px; font-size: 20px; line-height: 1; }',
    '.kainat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }',
    '.kainat-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }',
    '.kainat-msg-bot { align-self: flex-start; border-bottom-left-radius: 4px; }',
    '.kainat-msg-user { align-self: flex-end; color: white; border-bottom-right-radius: 4px; }',
    '.kainat-msg-loading { align-self: flex-start; }',
    '.kainat-dots { display: flex; gap: 4px; padding: 4px 0; }',
    '.kainat-dots span { width: 6px; height: 6px; border-radius: 50%; animation: kainatBounce 1.4s infinite ease-in-out both; }',
    '.kainat-dots span:nth-child(1) { animation-delay: -0.32s; }',
    '.kainat-dots span:nth-child(2) { animation-delay: -0.16s; }',
    '@keyframes kainatBounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }',
    '.kainat-input-area { padding: 12px; display: flex; gap: 8px; border-top: 1px solid; }',
    '.kainat-input { flex: 1; border: 1px solid; border-radius: 24px; padding: 10px 16px; font-size: 14px; outline: none; }',
    '.kainat-input:focus { border-color: ' + config.color + '; }',
    '.kainat-send { width: 40px; height: 40px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }',
    '.kainat-send:disabled { opacity: 0.5; cursor: not-allowed; }',
    '.kainat-send svg { width: 18px; height: 18px; fill: white; }',
    '.kainat-powered { text-align: center; padding: 6px; font-size: 11px; }',
    '.kainat-powered a { text-decoration: none; }',
  ].join('\\n');
  document.head.appendChild(style);

  // Theme colors
  var isLight = config.theme === 'light';
  var bgChat = isLight ? '#ffffff' : '#1a1a2e';
  var bgMsg = isLight ? '#f3f4f6' : '#2d2d44';
  var bgInput = isLight ? '#ffffff' : '#2d2d44';
  var textColor = isLight ? '#1f2937' : '#e5e7eb';
  var borderColor = isLight ? '#e5e7eb' : '#3d3d5c';
  var poweredColor = isLight ? '#9ca3af' : '#6b7280';

  // Position
  var isRight = config.position === 'bottom-right';

  // Create container
  var container = document.createElement('div');
  container.className = 'kainat-widget-container';

  // FAB button
  var fab = document.createElement('button');
  fab.className = 'kainat-fab';
  fab.style.cssText = 'background:' + config.color + ';' + (isRight ? 'right:20px' : 'left:20px') + ';bottom:20px;';
  fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>';
  fab.onclick = function() { toggleChat(); };

  // Chat window
  var chat = document.createElement('div');
  chat.className = 'kainat-chat';
  chat.style.cssText = 'background:' + bgChat + ';' + (isRight ? 'right:20px' : 'left:20px') + ';bottom:88px;';

  // Header
  var header = document.createElement('div');
  header.className = 'kainat-header';
  header.style.background = config.color;
  header.innerHTML = '<div class="kainat-header-avatar"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></div><div class="kainat-header-info"><div class="kainat-header-name"></div><div class="kainat-header-status">Online</div></div><button class="kainat-close">&times;</button>';

  // Messages area
  var messagesEl = document.createElement('div');
  messagesEl.className = 'kainat-messages';
  messagesEl.style.background = bgChat;

  // Input area
  var inputArea = document.createElement('div');
  inputArea.className = 'kainat-input-area';
  inputArea.style.cssText = 'background:' + bgChat + ';border-color:' + borderColor + ';';

  var input = document.createElement('input');
  input.className = 'kainat-input';
  input.style.cssText = 'background:' + bgInput + ';color:' + textColor + ';border-color:' + borderColor + ';';
  input.placeholder = 'Type a message...';

  var sendBtn = document.createElement('button');
  sendBtn.className = 'kainat-send';
  sendBtn.style.background = config.color;
  sendBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

  // Powered by
  var powered = document.createElement('div');
  powered.className = 'kainat-powered';
  powered.style.cssText = 'background:' + bgChat + ';color:' + poweredColor + ';';
  powered.innerHTML = 'Powered by <a href="${origin}" target="_blank" style="color:' + config.color + ';font-weight:600;">Kainat</a>';

  // Assemble
  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
  chat.appendChild(header);
  chat.appendChild(messagesEl);
  chat.appendChild(inputArea);
  chat.appendChild(powered);
  container.appendChild(fab);
  container.appendChild(chat);
  document.body.appendChild(container);

  // Set agent name
  fetch(config.apiUrl + '?instanceId=' + config.instanceId)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var nameEl = header.querySelector('.kainat-header-name');
      if (nameEl) nameEl.textContent = d.agentName || 'AI Assistant';
      var statusEl = header.querySelector('.kainat-header-status');
      if (statusEl) statusEl.textContent = d.online ? 'Online' : 'Offline';
    })
    .catch(function() {});

  // Close button handler
  header.querySelector('.kainat-close').onclick = function() { toggleChat(); };

  // Send handlers
  sendBtn.onclick = function() { sendMessage(); };
  input.onkeydown = function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  function toggleChat() {
    isOpen = !isOpen;
    chat.classList.toggle('open', isOpen);
    if (isOpen && messages.length === 0) {
      addMessage(config.greeting, 'bot');
    }
    if (isOpen) input.focus();
  }

  function addMessage(text, role) {
    messages.push({ text: text, role: role });
    var msgEl = document.createElement('div');
    msgEl.className = 'kainat-msg kainat-msg-' + role;
    if (role === 'bot') {
      msgEl.style.cssText = 'background:' + bgMsg + ';color:' + textColor + ';';
    } else {
      msgEl.style.background = config.color;
    }
    msgEl.textContent = text;
    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msgEl;
  }

  function showLoading() {
    var loadEl = document.createElement('div');
    loadEl.className = 'kainat-msg kainat-msg-bot kainat-msg-loading';
    loadEl.style.cssText = 'background:' + bgMsg + ';';
    loadEl.innerHTML = '<div class="kainat-dots"><span style="background:' + config.color + '"></span><span style="background:' + config.color + '"></span><span style="background:' + config.color + '"></span></div>';
    messagesEl.appendChild(loadEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return loadEl;
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text || isLoading) return;

    addMessage(text, 'user');
    input.value = '';
    isLoading = true;
    sendBtn.disabled = true;

    var loadEl = showLoading();

    fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: config.instanceId,
        message: text,
        sessionId: sessionId,
      }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      messagesEl.removeChild(loadEl);
      addMessage(data.reply || 'Sorry, no response received.', 'bot');
      if (data.sessionId) sessionId = data.sessionId;
    })
    .catch(function(err) {
      messagesEl.removeChild(loadEl);
      addMessage('Sorry, something went wrong. Please try again.', 'bot');
    })
    .finally(function() {
      isLoading = false;
      sendBtn.disabled = false;
    });
  }
})();
`;

  return new NextResponse(widgetJS, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
