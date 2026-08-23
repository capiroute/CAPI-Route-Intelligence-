// ui.js - single page dashboard for the multi-agent CTWA listener.
// Exports one HTML string. Views are switched client side.
// ASCII only on purpose - this file gets pasted through mobile terminals.

export const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CTWA Listener</title>
<style>
  :root{
    --bg:#0a0a0a; --card:#121212; --line:#242424;
    --ink:#f2f2f2; --dim:#8a8a8a; --acc:#ffd400;
    --ok:#4ade80; --bad:#f87171; --warn:#fbbf24;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px}
  .wrap{max-width:760px;margin:0 auto;padding:16px}
  h1{font-size:16px;letter-spacing:2px;color:var(--acc);margin:0 0 4px}
  h2{font-size:13px;letter-spacing:2px;color:var(--acc);margin:0 0 12px;
    text-transform:uppercase}
  .card{background:var(--card);border:1px solid var(--line);
    border-radius:14px;padding:16px;margin-bottom:14px}
  label{display:block;font-size:11px;color:var(--dim);margin:10px 0 5px}
  input,select{width:100%;background:#1a1a1a;border:1px solid var(--line);
    color:var(--ink);border-radius:10px;padding:12px;font:inherit}
  button{background:var(--acc);color:#000;border:0;border-radius:999px;
    padding:12px 20px;font:inherit;font-weight:700;letter-spacing:1px;
    cursor:pointer}
  button.ghost{background:transparent;color:var(--ink);
    border:1px solid var(--line)}
  button.danger{background:transparent;color:var(--bad);
    border:1px solid var(--bad)}
  button:disabled{opacity:.4;cursor:not-allowed}
  .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .stat{background:#1a1a1a;border:1px solid var(--line);
    border-radius:10px;padding:14px}
  .stat b{display:block;font-size:22px;margin-top:6px}
  .stat span{font-size:10px;color:var(--dim);letter-spacing:1px}
  .pill{display:inline-block;font-size:10px;padding:4px 10px;
    border-radius:999px;border:1px solid var(--line);letter-spacing:1px}
  .pill.ok{color:var(--ok);border-color:var(--ok)}
  .pill.bad{color:var(--bad);border-color:var(--bad)}
  .pill.warn{color:var(--warn);border-color:var(--warn)}
  .item{display:flex;justify-content:space-between;align-items:center;
    gap:10px;padding:14px;border:1px solid var(--line);
    border-radius:12px;margin-bottom:10px;background:#1a1a1a}
  .item small{color:var(--dim);display:block;margin-top:4px;font-size:11px}
  .log{background:#0d0d0d;border:1px solid var(--line);border-radius:10px;
    padding:10px;max-height:300px;overflow:auto;font-size:11px}
  .log div{padding:6px 0;border-bottom:1px solid #1c1c1c;
    word-break:break-word}
  .log .ok{color:var(--ok)} .log .error{color:var(--bad)}
  .log .warn{color:var(--warn)} .log .ctwa{color:var(--acc)}
  .msg{padding:10px;border-radius:10px;margin-bottom:12px;font-size:12px}
  .msg.err{background:#2a1212;color:var(--bad)}
  .msg.good{background:#0f2418;color:var(--ok)}
  .hide{display:none}
  .top{display:flex;justify-content:space-between;align-items:center;
    margin-bottom:14px}
  .qr{background:#fff;padding:12px;border-radius:12px;text-align:center}
  .qr img{width:100%;max-width:260px}
  .bar{height:6px;background:#1a1a1a;border-radius:999px;overflow:hidden;
    margin-top:8px}
  .bar i{display:block;height:100%;background:var(--acc)}
</style>
</head>
<body>
<div class="wrap">

  <!-- LOGIN -->
  <div id="v-login">
    <h1>CTWA LISTENER</h1>
    <div class="card">
      <h2>Sign in</h2>
      <div id="loginMsg"></div>
      <label>Email</label>
      <input id="email" type="email" placeholder="you@gmail.com">
      <label id="passLabel">Password</label>
      <input id="password" type="password" placeholder="your password">
      <div class="row"><button onclick="doLogin()">SIGN IN</button></div>
      <p style="color:var(--dim);font-size:11px;margin-top:14px">
        Access is granted by the admin. First sign in sets your password.
      </p>
    </div>
  </div>

  <!-- AGENT LIST -->
  <div id="v-list" class="hide">
    <div class="top">
      <h1>MY AGENTS</h1>
      <div>
        <button class="ghost" id="adminBtn" onclick="go('admin')">ADMIN</button>
        <button class="ghost" onclick="doLogout()">EXIT</button>
      </div>
    </div>
    <div class="card">
      <div id="listMsg"></div>
      <div id="quota" style="font-size:11px;color:var(--dim)"></div>
      <div id="ramWarn"></div>
      <div id="agentList" style="margin-top:14px"></div>
      <div class="row">
        <button id="addBtn" onclick="createAgent()">+ CREATE AGENT</button>
      </div>
    </div>
  </div>

  <!-- AGENT DASHBOARD -->
  <div id="v-agent" class="hide">
    <div class="top">
      <h1 id="agentName">AGENT</h1>
      <button class="ghost" onclick="go('list')">BACK</button>
    </div>

    <div class="card">
      <h2>Whatsapp</h2>
      <div id="connBox"></div>
      <div id="qrBox"></div>
      <div class="row">
        <button onclick="agentAction('link')">LINK / CONNECT</button>
        <button class="ghost" onclick="agentAction('stop')">STOP</button>
        <button class="danger" onclick="clearSession()">CLEAR SESSION</button>
      </div>
    </div>

    <div class="card">
      <h2>Meta Conversions API</h2>
      <div id="cfgMsg"></div>
      <label>Dataset ID</label>
      <input id="datasetId" placeholder="1382224350763266">
      <label>Facebook Page ID</label>
      <input id="pageId" placeholder="1304606986062175">
      <label>Access Token <span id="tokState"></span></label>
      <input id="accessToken" type="password" placeholder="leave blank to keep">
      <label>Event Name</label>
      <select id="eventName">
        <option>LeadSubmitted</option>
        <option>Purchase</option>
      </select>
      <label>Test Event Code (optional)</label>
      <input id="testCode" placeholder="TEST12345">
      <label>Auto-reply text</label>
      <input id="autoReplyText" placeholder="Yes">
      <div class="row">
        <button onclick="saveCfg()">SAVE</button>
        <button class="ghost" onclick="togglePause()" id="pauseBtn">PAUSE</button>
        <button class="ghost" onclick="toggleDebug()" id="debugBtn">DEBUG</button>
      </div>
      <p style="color:var(--dim);font-size:11px;margin-top:12px">
        The dataset must be linked to this Page in Events Manager,
        otherwise Meta rejects the event.
      </p>
    </div>

    <div class="card">
      <h2>Stats</h2>
      <div class="grid">
        <div class="stat"><span>MESSAGES</span><b id="sMsg">0</b></div>
        <div class="stat"><span>CTWA FOUND</span><b id="sCtwa" style="color:var(--acc)">0</b></div>
        <div class="stat"><span>DELIVERED</span><b id="sDel" style="color:var(--ok)">0</b></div>
        <div class="stat"><span>FAILED</span><b id="sFail" style="color:var(--bad)">0</b></div>
      </div>
      <div id="optBox" style="margin-top:14px"></div>
    </div>

    <div class="card">
      <h2>Live log</h2>
      <div class="log" id="logBox"></div>
    </div>
  </div>

  <!-- ADMIN -->
  <div id="v-admin" class="hide">
    <div class="top">
      <h1>ADMIN</h1>
      <button class="ghost" onclick="go('list')">BACK</button>
    </div>
    <div class="card">
      <h2>Server</h2>
      <div id="ramBox"></div>
    </div>
    <div class="card">
      <h2>Grant access</h2>
      <div id="admMsg"></div>
      <label>Email</label>
      <input id="newEmail" type="email" placeholder="client@gmail.com">
      <label>Agent limit</label>
      <input id="newLimit" type="number" value="1" min="1">
      <div class="row"><button onclick="addUser()">GRANT ACCESS</button></div>
    </div>
    <div class="card">
      <h2>Users</h2>
      <div id="userList"></div>
    </div>
  </div>

</div>

<script>
var CUR = null;      // current agent id
var ME = null;
var timer = null;

function $(id){ return document.getElementById(id); }
function show(id, html){ $(id).innerHTML = html; }
function note(id, text, good){
  $(id).innerHTML = text
    ? '<div class="msg ' + (good ? 'good' : 'err') + '">' + text + '</div>'
    : '';
}

async function api(path, opts){
  var o = opts || {};
  o.headers = Object.assign({'Content-Type':'application/json'}, o.headers||{});
  var r = await fetch(path, o);
  var j = {};
  try { j = await r.json(); } catch(e){}
  if (r.status === 401 && CUR !== 'boot') { go('login'); }
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}

function go(view){
  ['login','list','agent','admin'].forEach(function(v){
    $('v-' + v).classList.add('hide');
  });
  $('v-' + view).classList.remove('hide');
  if (timer) { clearInterval(timer); timer = null; }
  if (view === 'list') loadList();
  if (view === 'admin') loadAdmin();
  if (view === 'agent') { loadAgent(); timer = setInterval(loadAgent, 3000); }
}

// ------------------------------------------------------------- auth

async function doLogin(){
  note('loginMsg','');
  try{
    var j = await api('/api/auth/login', { method:'POST', body: JSON.stringify({
      email: $('email').value, password: $('password').value
    })});
    ME = j;
    $('adminBtn').style.display = (j.role === 'admin') ? '' : 'none';
    go('list');
  } catch(e){
    note('loginMsg', e.message);
  }
}

async function doLogout(){
  try { await api('/api/auth/logout', { method:'POST' }); } catch(e){}
  location.reload();
}

// ------------------------------------------------------------- list

async function loadList(){
  try{
    var j = await api('/api/agents');
    $('quota').textContent = 'Agents: ' + j.used + ' of ' + j.limit;
    $('addBtn').disabled = (j.used >= j.limit);
    if (j.used >= j.limit){
      $('addBtn').textContent = 'LIMIT REACHED (' + j.used + ' of ' + j.limit + ')';
    } else {
      $('addBtn').textContent = '+ CREATE AGENT';
    }
    if (j.ram && j.ram.percent >= 80){
      show('ramWarn','<div class="msg err">Server RAM at ' + j.ram.percent
        + '%. Connecting another agent may crash the box.</div>');
    } else { show('ramWarn',''); }

    var html = '';
    if (!j.agents.length){
      html = '<p style="color:var(--dim);font-size:12px">No agents yet.</p>';
    }
    j.agents.forEach(function(a){
      var cls = a.live === 'connected' ? 'ok'
        : (a.live === 'qr' ? 'warn' : 'bad');
      html += '<div class="item"><div>'
        + '<b>' + a.name + '</b>'
        + '<small>' + (a.waNumber ? '+' + a.waNumber : 'not linked')
        + ' - ' + a.status + '</small></div>'
        + '<div><span class="pill ' + cls + '">' + a.live + '</span> '
        + '<button class="ghost" onclick="openAgent(\\'' + a.id + '\\',\\''
        + a.name.replace(/'/g,"") + '\\')">OPEN</button> '
        + '<button class="danger" onclick="delAgent(\\'' + a.id + '\\')">DEL</button>'
        + '</div></div>';
    });
    show('agentList', html);
  } catch(e){ note('listMsg', e.message); }
}

async function createAgent(){
  note('listMsg','');
  try{
    await api('/api/agents', { method:'POST', body: JSON.stringify({}) });
    loadList();
  } catch(e){ note('listMsg', e.message); }
}

async function delAgent(id){
  if (!confirm('Delete this agent? The WhatsApp session is removed and must be scanned again.')) return;
  try{
    await api('/api/agents/' + id, { method:'DELETE' });
    loadList();
  } catch(e){ note('listMsg', e.message); }
}

function openAgent(id, name){
  CUR = id;
  $('agentName').textContent = name.toUpperCase();
  go('agent');
}

// ------------------------------------------------------------ agent

var cfgTouched = false;
['datasetId','pageId','accessToken','testCode','autoReplyText'].forEach(function(f){
  document.addEventListener('input', function(e){
    if (e.target && e.target.id === f) cfgTouched = true;
  });
});

async function loadAgent(){
  if (!CUR) return;
  try{
    var j = await api('/api/agents/' + CUR);

    var cls = j.connState === 'connected' ? 'ok'
      : (j.connState === 'qr' ? 'warn' : 'bad');
    show('connBox','<span class="pill ' + cls + '">' + j.connState + '</span>'
      + (j.selfJid ? ' <span style="color:var(--dim);font-size:11px">'
        + j.selfJid + '</span>' : ''));

    if (j.qrDataUrl && j.connState === 'qr'){
      show('qrBox','<div class="qr" style="margin-top:12px"><img src="'
        + j.qrDataUrl + '"></div>');
    } else if (j.qr && j.connState === 'qr'){
      show('qrBox','<p style="font-size:10px;word-break:break-all;color:var(--dim)">'
        + j.qr + '</p>');
    } else { show('qrBox',''); }

    $('sMsg').textContent  = j.stats.messages;
    $('sCtwa').textContent = j.stats.ctwa;
    $('sDel').textContent  = j.stats.delivered;
    $('sFail').textContent = j.stats.failed;

    if (!cfgTouched){
      $('datasetId').value = j.config.datasetId;
      $('pageId').value = j.config.pageId;
      $('eventName').value = j.config.eventName;
      $('testCode').value = j.config.testCode;
      $('autoReplyText').value = j.config.autoReplyText;
    }
    $('tokState').innerHTML = j.config.hasToken
      ? '<span class="pill ok">SAVED</span>'
      : '<span class="pill bad">NO TOKEN</span>';
    $('pauseBtn').textContent = j.config.enabled ? 'PAUSE' : 'RESUME';
    $('debugBtn').textContent = j.config.debug ? 'DEBUG ON' : 'DEBUG OFF';

    var log = '';
    j.logs.forEach(function(l){
      var t = new Date(l.t).toLocaleTimeString();
      log += '<div class="' + l.level + '">' + t + '  ' + l.msg
        + (l.extra ? ' <span style="color:var(--dim)">'
          + JSON.stringify(l.extra).slice(0,200) + '</span>' : '')
        + '</div>';
    });
    show('logBox', log || '<div style="color:var(--dim)">no activity yet</div>');

    loadEvents();
  } catch(e){ /* silent - polling */ }
}

async function loadEvents(){
  try{
    var j = await api('/api/agents/' + CUR + '/events');
    var pct = Math.min(100, Math.round(j.deliveredLast7Days / j.optimizationTarget * 100));
    show('optBox','<div style="font-size:11px;color:var(--dim)">'
      + 'Delivered in last 7 days: <b style="color:var(--acc)">'
      + j.deliveredLast7Days + '</b> of ' + j.optimizationTarget
      + ' needed to unlock the messaging conversion goal in Ads Manager.'
      + '</div><div class="bar"><i style="width:' + pct + '%"></i></div>');
  } catch(e){}
}

async function agentAction(what){
  try{
    await api('/api/agents/' + CUR + '/' + what, { method:'POST' });
    loadAgent();
  } catch(e){ note('cfgMsg', e.message); }
}

async function clearSession(){
  if (!confirm('Clear the WhatsApp session? You will need to scan again.')) return;
  agentAction('logout');
}

async function saveCfg(){
  note('cfgMsg','');
  try{
    await api('/api/agents/' + CUR + '/config', { method:'POST', body: JSON.stringify({
      datasetId: $('datasetId').value,
      pageId: $('pageId').value,
      accessToken: $('accessToken').value,
      eventName: $('eventName').value,
      testCode: $('testCode').value,
      autoReplyText: $('autoReplyText').value
    })});
    $('accessToken').value = '';
    cfgTouched = false;
    note('cfgMsg','Saved.', true);
    loadAgent();
  } catch(e){ note('cfgMsg', e.message); }
}

async function togglePause(){
  var on = $('pauseBtn').textContent === 'PAUSE';
  try{
    await api('/api/agents/' + CUR + '/config', { method:'POST',
      body: JSON.stringify({ enabled: !on }) });
    loadAgent();
  } catch(e){ note('cfgMsg', e.message); }
}

async function toggleDebug(){
  var on = $('debugBtn').textContent === 'DEBUG ON';
  try{
    await api('/api/agents/' + CUR + '/config', { method:'POST',
      body: JSON.stringify({ debug: !on }) });
    loadAgent();
  } catch(e){ note('cfgMsg', e.message); }
}

// ------------------------------------------------------------ admin

async function loadAdmin(){
  try{
    var j = await api('/api/admin/users');
    var r = j.ram;
    var warn = r.percent >= 80 ? ' class="msg err"' : '';
    show('ramBox','<div' + warn + '>RAM ' + r.usedMb + ' / ' + r.totalMb
      + ' MB (' + r.percent + '%) - running agents: ' + r.running
      + (r.percent >= 80 ? '<br>Adding another agent may crash the box.' : '')
      + '</div><div class="bar"><i style="width:' + r.percent + '%"></i></div>');

    var html = '';
    j.users.forEach(function(u){
      html += '<div class="item"><div><b>' + u.email + '</b>'
        + '<small>' + u.role + ' - ' + u.agents_used + ' of '
        + u.agent_limit + ' agents - ' + u.status + '</small></div><div>'
        + '<button class="ghost" onclick="chLimit(\\'' + u.id + '\\','
        + u.agent_limit + ')">LIMIT</button> '
        + (u.role === 'admin' ? '' :
          '<button class="danger" onclick="delUser(\\'' + u.id
          + '\\')">DEL</button>')
        + '</div></div>';
    });
    show('userList', html);
  } catch(e){ note('admMsg', e.message); }
}

async function addUser(){
  note('admMsg','');
  try{
    await api('/api/admin/users', { method:'POST', body: JSON.stringify({
      email: $('newEmail').value,
      agentLimit: Number($('newLimit').value)
    })});
    $('newEmail').value = '';
    note('admMsg','Access granted. They set their password on first sign in.', true);
    loadAdmin();
  } catch(e){ note('admMsg', e.message); }
}

async function chLimit(id, cur){
  var n = prompt('New agent limit', cur);
  if (n === null) return;
  try{
    await api('/api/admin/users/' + id, { method:'PATCH',
      body: JSON.stringify({ agentLimit: Number(n) }) });
    loadAdmin();
  } catch(e){ note('admMsg', e.message); }
}

async function delUser(id){
  if (!confirm('Delete this user and ALL of their agents? This cannot be undone.')) return;
  try{
    await api('/api/admin/users/' + id, { method:'DELETE' });
    loadAdmin();
  } catch(e){ note('admMsg', e.message); }
}

// ------------------------------------------------------------- boot

(async function(){
  CUR = 'boot';
  try{
    var j = await api('/api/me');
    ME = j;
    CUR = null;
    $('adminBtn').style.display = (j.role === 'admin') ? '' : 'none';
    go('list');
  } catch(e){
    CUR = null;
    go('login');
  }
})();
</script>
</body>
</html>`;
