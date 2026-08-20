export const HTML = String.raw`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>CTWA Listener</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#000;--surface:#0A0A0B;--border:#1E1E20;--ink:#F7F5F2;--muted:#9E9AA3;--y:#FFDD00;--g:#4ade80;--r:#ff6b6b}
body{background:var(--bg);color:var(--ink);font-family:"Instrument Sans",system-ui,sans-serif;padding:16px;max-width:820px;margin:auto;padding-bottom:60px}
.mono{font-family:"JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase}
h1{font-size:22px;font-weight:600;letter-spacing:-.03em}
.sub{color:var(--muted);font-size:13px;margin-top:4px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;margin-top:14px}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
label{display:block;font-size:10px;color:var(--muted);margin:12px 0 6px}
input,select{width:100%;background:#111;border:1px solid var(--border);color:var(--ink);border-radius:9px;padding:0 12px;height:46px;font-size:16px;font-family:"JetBrains Mono",monospace}
input:focus,select:focus{outline:none;border-color:var(--y)}
input:disabled{opacity:.5}
button{background:var(--y);color:#0A0A00;border:0;border-radius:999px;height:46px;padding:0 22px;font-weight:700;font-size:12px;cursor:pointer;font-family:"JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase}
button.ghost{background:transparent;color:var(--ink);border:1px solid var(--border)}
button.danger{background:transparent;color:var(--r);border:1px solid #3a1e1e}
button.sm{height:34px;padding:0 14px;font-size:10px}
button:active{transform:translateY(1px)}
button:disabled{opacity:.45;cursor:default}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:8px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.stat{background:#111;border:1px solid var(--border);border-radius:10px;padding:12px}
.stat b{font-size:22px;display:block;margin-top:2px}
.logs{max-height:340px;overflow:auto;font-family:"JetBrains Mono",monospace;font-size:11px;line-height:1.65}
.logs div{padding:6px 0;border-bottom:1px solid #141416;word-break:break-word}
.l-ok{color:var(--g)}.l-error{color:var(--r)}.l-warn{color:var(--y)}.l-ctwa{color:var(--y);font-weight:700}.l-info{color:var(--muted)}
#qr{width:100%;max-width:280px;border-radius:12px;margin:12px auto;display:block;background:#fff;padding:8px}
.code{font-family:"JetBrains Mono",monospace;font-size:30px;letter-spacing:.22em;text-align:center;color:var(--y);padding:16px 0}
.hint{font-size:11px;color:var(--muted);margin-top:6px;line-height:1.5}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:10px;padding:4px 10px;border-radius:999px;font-family:"JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase}
.pill.on{background:rgba(74,222,128,.12);color:var(--g);border:1px solid rgba(74,222,128,.3)}
.pill.off{background:rgba(255,107,107,.1);color:var(--r);border:1px solid rgba(255,107,107,.3)}
.banner{border-radius:10px;padding:11px 13px;font-size:12px;margin-top:12px;line-height:1.5;display:none}
.banner.err{background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.35);color:#ffb3b3}
.banner.ok{background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.35);color:#a7f3c4}
#gate{position:fixed;inset:0;background:#000;display:none;align-items:center;justify-content:center;padding:24px;z-index:50}
#gate .box{width:100%;max-width:340px}
</style></head><body>

<div id="gate"><div class="box">
  <h1>CTWA Listener</h1>
  <div class="sub" style="margin-bottom:16px">Enter the dashboard password.</div>
  <input id="pass" type="password" placeholder="Password" autocomplete="current-password">
  <div class="banner err" id="gateErr"></div>
  <div style="margin-top:12px"><button onclick="unlock()" style="width:100%">Unlock</button></div>
</div></div>

<div id="app" style="display:none">
<h1>CTWA Listener</h1>
<div class="sub">Reads the Click-to-WhatsApp click ID from incoming messages and reports the conversion to Meta. It never sends anything on WhatsApp.</div>

<div class="banner err" id="netErr"></div>

<div class="card">
  <div class="row">
    <div class="mono" style="font-size:11px"><span class="dot" id="dot"></span><span id="state">...</span></div>
    <div class="mono" style="font-size:10px;color:var(--muted)" id="jid"></div>
  </div>
  <div style="margin-top:12px">
    <label>Link method</label>
    <select id="mode">
      <option value="qr">QR code - scan from WhatsApp</option>
      <option value="pairing">Pairing code - enter number on phone</option>
    </select>
    <div id="numwrap" style="display:none">
      <label>Phone number with country code, no +</label>
      <input id="number" inputmode="numeric" placeholder="923001234567">
    </div>
    <div style="margin-top:12px" class="row">
      <button onclick="link()" id="linkBtn">Link Device</button>
      <button class="danger" onclick="logout()">Clear Session</button>
    </div>
    <img id="qr" style="display:none">
    <div class="code" id="pcode" style="display:none"></div>
    <div class="hint" id="linkhint"></div>
  </div>
</div>

<div class="card">
  <div class="row" style="margin-bottom:4px">
    <div class="mono" style="font-size:11px;color:var(--y)">Meta Conversions API</div>
    <span class="pill off" id="tokPill">No token</span>
  </div>

  <label>Dataset ID <span style="color:#555">- Events Manager -> your dataset</span></label>
  <input id="datasetId" inputmode="numeric" placeholder="1234567890">

  <label>Facebook Page ID <span style="color:#555">- Page -> About -> Page transparency</span></label>
  <input id="pageId" inputmode="numeric" placeholder="1234567890">

  <label>Access Token <span style="color:#555">- dataset -> Settings -> Generate</span></label>
  <div style="display:flex;gap:8px;align-items:center">
    <input id="accessToken" type="password" placeholder="EAAG..." style="flex:1">
    <button class="ghost sm" id="tokBtn" onclick="tokMode()">Change</button>
  </div>
  <div class="hint" id="tokHint">A token is stored. Leave this blank to keep it.</div>

  <label>Event Name</label>
  <select id="eventName">
    <option>Contact</option><option>Lead</option><option>ViewContent</option>
    <option>CompleteRegistration</option><option>Schedule</option><option>SubmitApplication</option>
  </select>

  <label>Test Event Code <span style="color:#555">- optional, for Events Manager -> Test Events</span></label>
  <input id="testEventCode" placeholder="TEST12345">

  <div style="margin-top:14px" class="row">
    <button onclick="save()" id="saveBtn">Save</button>
    <button class="ghost" onclick="toggle()" id="tgl">Pause</button>
  </div>
  <div class="banner ok" id="saveOk"></div>
  <div class="hint">The dataset must be linked to this Page in Events Manager, otherwise Meta rejects the event.</div>
</div>

<div class="card">
  <div class="grid">
    <div class="stat"><span class="mono" style="font-size:9px;color:var(--muted)">Messages</span><b id="s1">0</b></div>
    <div class="stat"><span class="mono" style="font-size:9px;color:var(--muted)">CTWA found</span><b id="s2" style="color:var(--y)">0</b></div>
    <div class="stat"><span class="mono" style="font-size:9px;color:var(--muted)">Delivered</span><b id="s3" style="color:var(--g)">0</b></div>
    <div class="stat"><span class="mono" style="font-size:9px;color:var(--muted)">Failed</span><b id="s4" style="color:var(--r)">0</b></div>
  </div>
</div>

<div class="card">
  <div class="row" style="margin-bottom:10px">
    <div class="mono" style="font-size:11px;color:var(--y)">Live Log</div>
    <span class="mono" style="font-size:9px;color:var(--muted)" id="lastPoll"></span>
  </div>
  <div class="logs" id="logs"></div>
</div>
</div>

<script>
const $ = id => document.getElementById(id);
let PASS = sessionStorage.getItem('dashPass') || '';

function hdrs(){ return PASS ? {'Content-Type':'application/json','x-dash-pass':PASS}
                             : {'Content-Type':'application/json'}; }

function banner(el, msg, ms){
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
  if (msg && ms) setTimeout(() => { el.style.display='none'; }, ms);
}

async function probe(){
  const r = await fetch('/api/state', {headers: hdrs()});
  return r.status !== 401;
}
async function unlock(){
  PASS = $('pass').value;
  const r = await fetch('/api/login', {method:'POST',headers:{'Content-Type':'application/json'},
    body: JSON.stringify({pass: PASS})});
  const d = await r.json().catch(() => ({}));
  if (d.ok) {
    sessionStorage.setItem('dashPass', PASS);
    $('gate').style.display='none';
    $('app').style.display='block';
    tick();
  } else {
    banner($('gateErr'), 'Wrong password.');
  }
}
(async () => {
  if (await probe()) { $('app').style.display='block'; tick(); }
  else { $('gate').style.display='flex'; }
})();

$('mode').onchange = e => $('numwrap').style.display = e.target.value === 'pairing' ? 'block' : 'none';

let tokEditing = false;
function tokMode(){
  tokEditing = !tokEditing;
  $('accessToken').disabled = !tokEditing;
  $('tokBtn').textContent = tokEditing ? 'Cancel' : 'Change';
  $('accessToken').value = '';
  if (tokEditing) $('accessToken').focus();
}

let touched = false;
['datasetId','pageId','eventName','testEventCode'].forEach(k =>
  $(k).addEventListener('input', () => touched = true));

async function link(){
  const mode = $('mode').value;
  const number = $('number').value;
  if (mode === 'pairing' && !number) { banner($('netErr'),'Enter the phone number first.',4000); return; }
  $('linkBtn').disabled = true;
  $('linkhint').textContent = 'Starting...';
  try {
    const r = await fetch('/api/link', {method:'POST',headers:hdrs(),body:JSON.stringify({mode, number})});
    if (!r.ok) throw new Error('HTTP ' + r.status);
  } catch (e) {
    banner($('netErr'), 'Could not start the connection: ' + e.message, 6000);
  }
  setTimeout(() => { $('linkBtn').disabled = false; }, 4000);
}

async function logout(){
  if (!confirm('Clear the session? The device will need to be linked again.')) return;
  try { await fetch('/api/logout', {method:'POST',headers:hdrs()}); }
  catch(e){ banner($('netErr'),'Failed: '+e.message,5000); }
}

async function save(){
  $('saveBtn').disabled = true;
  const body = {
    datasetId: $('datasetId').value,
    pageId: $('pageId').value,
    eventName: $('eventName').value,
    testEventCode: $('testEventCode').value,
  };
  if (tokEditing && $('accessToken').value.trim()) body.accessToken = $('accessToken').value.trim();

  try {
    const r = await fetch('/api/config', {method:'POST',headers:hdrs(),body:JSON.stringify(body)});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    touched = false;
    if (tokEditing) tokMode();
    banner($('saveOk'), 'Saved.', 3000);
  } catch (e) {
    banner($('netErr'), 'Save failed: ' + e.message, 6000);
  }
  $('saveBtn').disabled = false;
}

let enabled = true;
async function toggle(){
  enabled = !enabled;
  try {
    await fetch('/api/config', {method:'POST',headers:hdrs(),body:JSON.stringify({enabled})});
    banner($('saveOk'), enabled ? 'Listener resumed.' : 'Listener paused - events will not be sent.', 3000);
  } catch(e){ banner($('netErr'),'Failed: '+e.message,5000); }
}

const COLORS = {connected:'#4ade80', qr:'#FFDD00', starting:'#FFDD00', reconnecting:'#FFDD00',
  logged_out:'#ff6b6b', replaced:'#ff6b6b', disconnected:'#555'};

async function tick(){
  let d;
  try {
    const r = await fetch('/api/state', {headers: hdrs()});
    if (r.status === 401) { $('app').style.display='none'; $('gate').style.display='flex'; return; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    d = await r.json();
    banner($('netErr'), '');
  } catch (e) {
    banner($('netErr'), 'Cannot reach the server: ' + e.message);
    return;
  }

  $('dot').style.background = COLORS[d.connState] || '#555';
  $('state').textContent = d.connState.replace('_',' ');
  $('jid').textContent = d.selfJid ? d.selfJid.split(':')[0] : '';
  $('lastPoll').textContent = new Date().toLocaleTimeString();

  $('qr').style.display = d.qr ? 'block' : 'none';
  if (d.qr) $('qr').src = d.qr;
  $('pcode').style.display = d.pairingCode ? 'block' : 'none';
  if (d.pairingCode) {
    $('pcode').textContent = d.pairingCode;
    $('linkhint').textContent = 'On the phone: WhatsApp > Linked devices > Link with phone number > enter this code.';
  } else if (d.qr) {
    $('linkhint').textContent = 'On the phone: WhatsApp > Linked devices > Link a device > scan this.';
  } else if (d.connState === 'connected') {
    $('linkhint').textContent = 'Listening. Send a message from a number that has never messaged this account before.';
  } else if (d.connState === 'replaced') {
    $('linkhint').textContent = 'Another WhatsApp Web session took this slot. Remove other linked devices on the phone, then press Link Device.';
  }

  $('s1').textContent = d.stats.messages;
  $('s2').textContent = d.stats.ctwa;
  $('s3').textContent = d.stats.sent;
  $('s4').textContent = d.stats.failed;

  const c = d.config || {};
  enabled = c.enabled;
  $('tgl').textContent = enabled ? 'Pause' : 'Resume';

  const has = !!c.hasToken;
  $('tokPill').className = 'pill ' + (has ? 'on' : 'off');
  $('tokPill').textContent = has ? 'Token set' : 'No token';
  if (!tokEditing) {
    $('accessToken').disabled = has;
    $('accessToken').placeholder = has ? 'Stored - press Change to replace' : 'EAAG...';
    $('tokHint').textContent = has
      ? 'A token is stored on the server and is never sent back to this page.'
      : 'No token saved yet. Paste one and press Save.';
  }

  if (!touched) {
    $('datasetId').value = c.datasetId || '';
    $('pageId').value = c.pageId || '';
    $('eventName').value = c.eventName || 'Contact';
    $('testEventCode').value = c.testEventCode || '';
  }

  $('logs').innerHTML = (d.logs || []).map(l => {
    const t = new Date(l.t).toLocaleTimeString();
    const extra = Object.keys(l).filter(k => !['t','level','msg'].includes(k))
      .map(k => k + '=' + l[k]).join('  ');
    return '<div class="l-' + l.level + '">' + t + '  ' + l.msg + (extra ? '  ' + extra : '') + '</div>';
  }).join('');
}
setInterval(() => { if ($('app').style.display !== 'none') tick(); }, 2000);
</script>
</body></html>`;
