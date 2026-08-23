// ui.js - dashboard for the multi-agent CTWA listener.
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
    --bg:#0b0b0c; --panel:#141416; --sunk:#0e0e10; --line:#26262a;
    --ink:#f4f4f5; --dim:#7e7e86; --faint:#4a4a52;
    --acc:#ffcc00; --ok:#3ddc84; --bad:#ff5c5c; --warn:#ffa726;
    --sans:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
    --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
    font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased}
  .wrap{max-width:720px;margin:0 auto;padding:18px 16px 48px}

  .hdr{display:flex;justify-content:space-between;align-items:flex-start;
    gap:12px;margin-bottom:20px}
  .hdr h1{font-size:19px;font-weight:650;letter-spacing:-.3px;margin:0}
  .hdr .sub{font-family:var(--mono);font-size:12px;color:var(--dim);
    margin-top:3px}
  .hdr .acts{display:flex;gap:8px;flex-shrink:0}

  .live{display:inline-flex;align-items:center;gap:7px;font-size:13px;
    font-weight:600}
  .dot{width:8px;height:8px;border-radius:50%;background:var(--faint);
    flex-shrink:0}
  .dot.on{background:var(--ok);box-shadow:0 0 0 3px rgba(61,220,132,.15)}
  .dot.wait{background:var(--warn);box-shadow:0 0 0 3px rgba(255,167,38,.15)}
  .dot.off{background:var(--bad);box-shadow:0 0 0 3px rgba(255,92,92,.12)}

  /* signature: the signal chain */
  .chain{background:var(--panel);border:1px solid var(--line);
    border-radius:16px;padding:18px 14px;margin-bottom:14px}
  .chain .eyebrow{font-family:var(--mono);font-size:10px;
    letter-spacing:1.6px;color:var(--faint);text-transform:uppercase;
    margin-bottom:16px}
  .links{display:flex;align-items:flex-start}
  .node{flex:1;text-align:center;position:relative;min-width:0}
  .node .n{font-family:var(--mono);font-size:24px;font-weight:600;
    line-height:1;color:var(--faint)}
  .node.live-n .n{color:var(--ink)}
  .node.hot .n{color:var(--acc)}
  .node.err .n{color:var(--bad)}
  .node .cap{font-size:10px;color:var(--dim);margin-top:8px;
    letter-spacing:.2px}
  .arrow{width:22px;padding-top:8px;text-align:center;color:var(--faint);
    font-family:var(--mono);font-size:13px;flex-shrink:0}
  .chain .verdict{margin-top:16px;padding-top:14px;
    border-top:1px solid var(--line);font-size:13px;color:var(--dim)}
  .chain .verdict b{color:var(--ink);font-weight:600}
  .chain .verdict.bad b{color:var(--bad)}

  /* readiness */
  .ready{background:var(--panel);border:1px solid var(--line);
    border-radius:16px;padding:18px;margin-bottom:14px}
  .ready .top{display:flex;justify-content:space-between;
    align-items:baseline;margin-bottom:10px}
  .ready .lab{font-size:13px;font-weight:600}
  .ready .cnt{font-family:var(--mono);font-size:13px;color:var(--dim)}
  .ready .cnt b{color:var(--acc);font-size:17px}
  .track{height:5px;background:var(--sunk);border-radius:99px;
    overflow:hidden}
  .track i{display:block;height:100%;background:var(--acc);
    border-radius:99px;transition:width .5s ease}
  .ready p{font-size:12px;color:var(--dim);margin:10px 0 0}

  /* collapsible sections */
  details{background:var(--panel);border:1px solid var(--line);
    border-radius:16px;margin-bottom:10px;overflow:hidden}
  summary{padding:15px 18px;cursor:pointer;font-size:14px;font-weight:600;
    list-style:none;display:flex;justify-content:space-between;
    align-items:center;gap:10px}
  summary::-webkit-details-marker{display:none}
  summary .hint{font-family:var(--mono);font-size:11px;color:var(--dim);
    font-weight:400}
  summary::after{content:'+';color:var(--dim);font-family:var(--mono);
    font-size:15px}
  details[open] summary::after{content:'-'}
  details[open] summary{border-bottom:1px solid var(--line)}
  .body{padding:18px}

  label{display:block;font-size:12px;color:var(--dim);margin:16px 0 6px;
    font-weight:500}
  label:first-child{margin-top:0}
  input,select{width:100%;background:var(--sunk);border:1px solid var(--line);
    color:var(--ink);border-radius:10px;padding:12px 13px;
    font-family:var(--mono);font-size:14px}
  input::placeholder{color:var(--faint);font-style:italic}
  input:focus,select:focus{outline:2px solid var(--acc);outline-offset:-1px;
    border-color:transparent}
  .unset{font-family:var(--mono);font-size:12px;color:var(--warn);
    margin-top:6px}

  button{background:var(--acc);color:#000;border:0;border-radius:10px;
    padding:12px 18px;font-family:var(--sans);font-size:14px;
    font-weight:650;cursor:pointer}
  button:hover{filter:brightness(1.08)}
  button.ghost{background:transparent;color:var(--ink);
    border:1px solid var(--line);font-weight:500}
  button.sm{padding:8px 13px;font-size:13px}
  button:disabled{opacity:.35;cursor:not-allowed;filter:none}
  .link{background:none;border:0;color:var(--bad);font-size:13px;
    padding:6px 0;cursor:pointer;text-decoration:underline;
    text-underline-offset:3px;font-family:var(--sans)}
  .link.mute{color:var(--dim)}
  .row{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px;
    align-items:center}

  .danger{margin-top:20px;padding-top:16px;border-top:1px solid var(--line);
    display:flex;gap:18px;flex-wrap:wrap}

  .qr{background:#fff;padding:14px;border-radius:14px;text-align:center;
    margin:16px 0}
  .qr img{width:100%;max-width:230px;display:block;margin:0 auto}
  .qr p{color:#333;font-size:12px;margin:10px 0 0;font-family:var(--sans)}

  .log{background:var(--sunk);border-radius:10px;padding:4px 12px;
    max-height:280px;overflow:auto;font-family:var(--mono);font-size:11.5px}
  .log div{padding:8px 0;border-bottom:1px solid #1a1a1e;
    word-break:break-word;color:var(--dim)}
  .log div:last-child{border:0}
  .log .t{color:var(--faint);margin-right:8px}
  .log .ok{color:var(--ok)} .log .error{color:var(--bad)}
  .log .warn{color:var(--warn)} .log .ctwa{color:var(--acc)}

  .item{display:flex;justify-content:space-between;align-items:center;
    gap:12px;padding:15px 16px;border:1px solid var(--line);
    border-radius:13px;margin-bottom:9px;background:var(--panel)}
  .item .nm{font-weight:600;font-size:14px}
  .item .meta{font-family:var(--mono);font-size:11.5px;color:var(--dim);
    margin-top:3px}
  .item .side{display:flex;gap:7px;align-items:center;flex-shrink:0}

  .msg{padding:12px 14px;border-radius:10px;margin-bottom:14px;
    font-size:13px}
  .msg.err{background:rgba(255,92,92,.1);color:var(--bad);
    border:1px solid rgba(255,92,92,.25)}
  .msg.good{background:rgba(61,220,132,.1);color:var(--ok);
    border:1px solid rgba(61,220,132,.25)}
  .empty{text-align:center;padding:34px 18px;color:var(--dim);font-size:13px}
  .hide{display:none}
  .card{background:var(--panel);border:1px solid var(--line);
    border-radius:16px;padding:18px;margin-bottom:14px}
  .card h2{font-size:14px;font-weight:650;margin:0 0 4px}
  .card .note{font-size:12px;color:var(--dim);margin:0 0 4px}
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="wrap">

  <!-- SIGN IN -->
  <div id="v-login">
    <div class="hdr"><div>
      <h1>CTWA Listener</h1>
      <div class="sub">Click-to-WhatsApp attribution</div>
    </div></div>
    <div class="card">
      <h2>Sign in</h2>
      <p class="note">Your admin grants access. Your first sign in sets your password.</p>
      <div id="loginMsg" style="margin-top:14px"></div>
      <label>Email</label>
      <input id="email" type="email" placeholder="you@example.com">
      <label>Password</label>
      <input id="password" type="password" placeholder="at least 8 characters">
      <div class="row"><button onclick="doLogin()">Sign in</button></div>
    </div>
  </div>

  <!-- AGENT LIST -->
  <div id="v-list" class="hide">
    <div class="hdr">
      <div><h1>Agents</h1><div class="sub" id="quota"></div></div>
      <div class="acts">
        <button class="ghost sm" id="adminBtn" onclick="go('admin')">Admin</button>
        <button class="ghost sm" onclick="doLogout()">Sign out</button>
      </div>
    </div>
    <div id="listMsg"></div>
    <div id="ramWarn"></div>
    <div id="agentList"></div>
    <div class="row"><button id="addBtn" onclick="createAgent()">Add agent</button></div>
  </div>

  <!-- AGENT DASHBOARD -->
  <div id="v-agent" class="hide">
    <div class="hdr">
      <div>
        <h1 id="agentName">Agent</h1>
        <div class="live" style="margin-top:5px">
          <span class="dot" id="dot"></span><span id="connWord">Checking</span>
        </div>
      </div>
      <div class="acts">
        <button class="ghost sm" onclick="go('list')">Agents</button>
      </div>
    </div>

    <!-- signature: the signal chain -->
    <div class="chain">
      <div class="eyebrow">Signal chain</div>
      <div class="links">
        <div class="node" id="n1"><div class="n" id="v1">-</div>
          <div class="cap">Messages<br>received</div></div>
        <div class="arrow">&gt;</div>
        <div class="node" id="n2"><div class="n" id="v2">-</div>
          <div class="cap">Click IDs<br>captured</div></div>
        <div class="arrow">&gt;</div>
        <div class="node" id="n3"><div class="n" id="v3">-</div>
          <div class="cap">Events<br>at Meta</div></div>
        <div class="arrow">&gt;</div>
        <div class="node" id="n4"><div class="n" id="v4">-</div>
          <div class="cap">Send<br>failures</div></div>
      </div>
      <div class="verdict" id="verdict"></div>
    </div>

    <!-- readiness -->
    <div class="ready">
      <div class="top">
        <span class="lab">Optimisation readiness</span>
        <span class="cnt"><b id="rNow">0</b> / <span id="rGoal">10</span></span>
      </div>
      <div class="track"><i id="rBar" style="width:0%"></i></div>
      <p id="rNote"></p>
    </div>

    <details id="dConn">
      <summary>WhatsApp connection <span class="hint" id="hConn"></span></summary>
      <div class="body">
        <div id="qrBox"></div>
        <div id="connMsg"></div>
        <div class="row">
          <button id="linkBtn" onclick="agentAction('link')">Connect</button>
          <button class="ghost" onclick="agentAction('stop')">Stop</button>
        </div>
        <div class="danger">
          <button class="link" onclick="clearSession()">Clear session and re-scan</button>
        </div>
      </div>
    </details>

    <details id="dCfg">
      <summary>Meta settings <span class="hint" id="hCfg"></span></summary>
      <div class="body">
        <div id="cfgMsg"></div>
        <label>Dataset ID</label>
        <input id="datasetId" placeholder="not set">
        <label>Facebook Page ID</label>
        <input id="pageId" placeholder="not set">
        <label>Access token</label>
        <input id="accessToken" type="password" placeholder="leave blank to keep current">
        <div class="unset" id="tokState"></div>
        <label>Event sent to Meta</label>
        <select id="eventName">
          <option>LeadSubmitted</option>
          <option>Purchase</option>
        </select>
        <label>Auto-reply sent to every lead</label>
        <input id="autoReplyText" placeholder="Yes">
        <label>Test event code (optional)</label>
        <input id="testCode" placeholder="leave blank for live events">
        <div class="row">
          <button onclick="saveCfg()">Save changes</button>
          <button class="ghost" onclick="togglePause()" id="pauseBtn">Pause</button>
        </div>
        <p class="note" style="margin-top:16px">
          The dataset must be linked to this Page in Events Manager,
          otherwise Meta rejects every event.
        </p>
        <div class="danger">
          <button class="link mute" onclick="toggleDebug()" id="debugBtn">Debug logging</button>
          <button class="link" onclick="delSelf()">Delete this agent</button>
        </div>
      </div>
    </details>

    <details id="dLog">
      <summary>Activity <span class="hint" id="hLog"></span></summary>
      <div class="body"><div class="log" id="logBox"></div></div>
    </details>
  </div>

  <!-- ADMIN -->
  <div id="v-admin" class="hide">
    <div class="hdr">
      <div><h1>Admin</h1><div class="sub" id="ramLine"></div></div>
      <div class="acts"><button class="ghost sm" onclick="go('list')">Back</button></div>
    </div>
    <div class="card">
      <h2>Server capacity</h2>
      <div id="ramBox"></div>
    </div>
    <div class="card">
      <h2>Grant access</h2>
      <p class="note">They set their own password the first time they sign in.</p>
      <div id="admMsg" style="margin-top:14px"></div>
      <label>Email</label>
      <input id="newEmail" type="email" placeholder="client@example.com">
      <label>How many agents they may create</label>
      <input id="newLimit" type="number" value="1" min="1">
      <div class="row"><button onclick="addUser()">Grant access</button></div>
    </div>
    <div class="card">
      <h2>People with access</h2>
      <div id="userList" style="margin-top:14px"></div>
    </div>
  </div>

</div>

<script>
var CUR = null, ME = null, timer = null, cfgTouched = false;

function $(id){ return document.getElementById(id); }
function show(id,h){ $(id).innerHTML = h; }
function note(id,t,good){
  $(id).innerHTML = t ? '<div class="msg '+(good?'good':'err')+'">'+t+'</div>' : '';
}
function esc(s){ return String(s).replace(/[<>&"]/g,function(c){
  return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]; }); }

async function api(p,o){
  o = o || {};
  o.headers = Object.assign({'Content-Type':'application/json'}, o.headers||{});
  var r = await fetch(p,o), j = {};
  try { j = await r.json(); } catch(e){}
  if (r.status === 401 && CUR !== 'boot') go('login');
  if (!r.ok) throw new Error(j.error || ('Request failed ('+r.status+')'));
  return j;
}

function go(v){
  ['login','list','agent','admin'].forEach(function(x){
    $('v-'+x).classList.add('hide'); });
  $('v-'+v).classList.remove('hide');
  window.scrollTo(0,0);
  if (timer){ clearInterval(timer); timer = null; }
  if (v === 'list') loadList();
  if (v === 'admin') loadAdmin();
  if (v === 'agent'){ loadAgent(); timer = setInterval(loadAgent, 3000); }
}

// Land straight on the dashboard when there is only one agent.
async function enter(){
  try{
    var j = await api('/api/agents');
    if (j.agents.length === 1){ openAgent(j.agents[0].id, j.agents[0].name); return; }
  } catch(e){}
  go('list');
}

// ---------------------------------------------------------------- auth

async function doLogin(){
  note('loginMsg','');
  try{
    var j = await api('/api/auth/login',{ method:'POST', body: JSON.stringify({
      email: $('email').value, password: $('password').value })});
    ME = j;
    $('adminBtn').style.display = (j.role === 'admin') ? '' : 'none';
    enter();
  } catch(e){ note('loginMsg', e.message); }
}

async function doLogout(){
  try { await api('/api/auth/logout',{ method:'POST' }); } catch(e){}
  location.reload();
}

// ---------------------------------------------------------------- list

async function loadList(){
  try{
    var j = await api('/api/agents');
    $('quota').textContent = j.used + ' of ' + j.limit + ' agents used';
    $('addBtn').disabled = (j.used >= j.limit);
    $('addBtn').textContent = (j.used >= j.limit)
      ? 'Limit reached' : 'Add agent';

    show('ramWarn', (j.ram && j.ram.percent >= 80)
      ? '<div class="msg err">Server memory is at '+j.ram.percent
        +'%. Connecting another agent may take the server down.</div>' : '');

    if (!j.agents.length){
      show('agentList','<div class="empty">No agents yet. '
        + 'Add one to connect a WhatsApp number.</div>');
      return;
    }
    var h = '';
    j.agents.forEach(function(a){
      var d = a.live === 'connected' ? 'on'
        : (a.live === 'qr' ? 'wait' : 'off');
      var word = a.live === 'connected' ? 'Live'
        : (a.live === 'qr' ? 'Waiting for scan' : 'Offline');
      h += '<div class="item"><div><div class="nm">'+esc(a.name)+'</div>'
        + '<div class="meta">'+(a.waNumber ? '+'+a.waNumber : 'no number linked')
        + '</div></div><div class="side">'
        + '<span class="live"><span class="dot '+d+'"></span>'+word+'</span>'
        + '<button class="ghost sm" onclick="openAgent(\\''+a.id+'\\',\\''
        + esc(a.name).replace(/'/g,'') + '\\')">Open</button>'
        + '</div></div>';
    });
    show('agentList', h);
  } catch(e){ note('listMsg', e.message); }
}

async function createAgent(){
  note('listMsg','');
  try{ await api('/api/agents',{ method:'POST', body:'{}' }); loadList(); }
  catch(e){ note('listMsg', e.message); }
}

function openAgent(id,name){
  CUR = id; cfgTouched = false;
  $('agentName').textContent = name;
  go('agent');
}

async function delSelf(){
  if (!confirm('Delete this agent? Its WhatsApp session is removed and must be scanned again.')) return;
  try{ await api('/api/agents/'+CUR,{ method:'DELETE' }); CUR = null; go('list'); }
  catch(e){ note('cfgMsg', e.message); }
}

// --------------------------------------------------------------- agent

document.addEventListener('input', function(e){
  if (e.target && e.target.closest && e.target.closest('#dCfg')) cfgTouched = true;
});

async function loadAgent(){
  if (!CUR) return;
  try{
    var j = await api('/api/agents/'+CUR);
    var st = j.connState;

    var d = st === 'connected' ? 'on' : (st === 'qr' ? 'wait' : 'off');
    var word = st === 'connected' ? 'Live and listening'
      : st === 'qr' ? 'Waiting for you to scan'
      : st === 'reconnecting' ? 'Reconnecting'
      : st === 'logged_out' ? 'Signed out on the phone'
      : st === 'starting' ? 'Starting'
      : 'Not connected';
    $('dot').className = 'dot ' + d;
    $('connWord').textContent = word;
    $('hConn').textContent = j.agent.waNumber ? '+'+j.agent.waNumber : word;

    // signal chain
    var s = j.stats;
    setNode('n1','v1', s.messages, s.messages > 0 ? 'live-n' : '');
    setNode('n2','v2', s.ctwa,     s.ctwa > 0 ? 'hot' : '');
    setNode('n3','v3', s.delivered,s.delivered > 0 ? 'hot' : '');
    setNode('n4','v4', s.failed,   s.failed > 0 ? 'err' : '');

    var v = '', bad = false;
    if (!j.config.datasetId || !j.config.pageId || !j.config.hasToken){
      v = 'Meta settings are incomplete, so no event can be sent.'; bad = true;
    } else if (st !== 'connected'){
      v = 'WhatsApp is not connected, so no lead is being seen.'; bad = true;
    } else if (s.failed > 0){
      v = 'Meta rejected ' + s.failed + ' event(s). Open Activity for the reason.';
      bad = true;
    } else if (!j.config.enabled){
      v = 'Paused. Click IDs are captured but nothing is sent to Meta.'; bad = true;
    } else if (s.ctwa === 0){
      v = 'Connected and waiting for the first ad-driven lead.';
    } else {
      v = 'Every captured click ID reached Meta.';
    }
    $('verdict').className = 'verdict' + (bad ? ' bad' : '');
    show('verdict','<b>'+v+'</b>');

    // qr
    if (st === 'qr' && j.qrDataUrl){
      show('qrBox','<div class="qr"><img src="'+j.qrDataUrl+'">'
        + '<p>WhatsApp on your phone: Settings, Linked devices, Link a device.</p></div>');
      $('dConn').open = true;
    } else if (st === 'qr' && j.qr){
      show('qrBox','<div class="msg err">QR image could not be drawn. '
        + 'Raw code: <span style="word-break:break-all">'+esc(j.qr)+'</span></div>');
      $('dConn').open = true;
    } else { show('qrBox',''); }

    var lb = $('linkBtn');
    lb.disabled = (st === 'connected');
    lb.textContent = st === 'connected' ? 'Connected'
      : (j.hasSession ? 'Reconnect' : 'Connect');

    // settings
    if (!cfgTouched){
      $('datasetId').value = j.config.datasetId;
      $('pageId').value = j.config.pageId;
      $('eventName').value = j.config.eventName;
      $('testCode').value = j.config.testCode;
      $('autoReplyText').value = j.config.autoReplyText;
    }
    $('tokState').textContent = j.config.hasToken
      ? '' : 'No access token saved yet.';
    $('pauseBtn').textContent = j.config.enabled ? 'Pause' : 'Resume';
    $('debugBtn').textContent = j.config.debug
      ? 'Debug logging is on' : 'Turn on debug logging';

    var miss = [];
    if (!j.config.datasetId) miss.push('dataset');
    if (!j.config.pageId) miss.push('page');
    if (!j.config.hasToken) miss.push('token');
    $('hCfg').textContent = miss.length ? ('missing ' + miss.join(', '))
      : (j.config.enabled ? 'ready' : 'paused');

    // log
    var lg = '';
    j.logs.forEach(function(l){
      lg += '<div class="'+l.level+'"><span class="t">'
        + new Date(l.t).toLocaleTimeString() + '</span>' + esc(l.msg)
        + (l.extra ? ' <span class="t">'
          + esc(JSON.stringify(l.extra)).slice(0,180) + '</span>' : '')
        + '</div>';
    });
    show('logBox', lg || '<div>Nothing has happened yet.</div>');
    $('hLog').textContent = j.logs.length ? (j.logs.length + ' entries') : 'quiet';

    loadEvents();
  } catch(e){ /* polling stays silent */ }
}

function setNode(nid,vid,val,cls){
  $(nid).className = 'node ' + (cls || '');
  $(vid).textContent = val;
}

async function loadEvents(){
  try{
    var j = await api('/api/agents/'+CUR+'/events');
    var goal = j.optimizationTarget, now = j.deliveredLast7Days;
    $('rNow').textContent = now;
    $('rGoal').textContent = goal;
    $('rBar').style.width = Math.min(100, Math.round(now/goal*100)) + '%';
    $('rNote').textContent = now >= goal
      ? 'You can now pick this event as the conversion goal in Ads Manager, under a Sales campaign with the Messages destination.'
      : (goal - now) + ' more delivered events within 7 days before Ads Manager will let you optimise for this event.';
  } catch(e){}
}

async function agentAction(w){
  note('connMsg','');
  try{ await api('/api/agents/'+CUR+'/'+w,{ method:'POST' }); loadAgent(); }
  catch(e){ note('connMsg', e.message); }
}

function clearSession(){
  if (!confirm('Clear the session? You will have to scan the QR code again.')) return;
  agentAction('logout');
}

async function saveCfg(){
  note('cfgMsg','');
  try{
    await api('/api/agents/'+CUR+'/config',{ method:'POST', body: JSON.stringify({
      datasetId: $('datasetId').value,
      pageId: $('pageId').value,
      accessToken: $('accessToken').value,
      eventName: $('eventName').value,
      testCode: $('testCode').value,
      autoReplyText: $('autoReplyText').value })});
    $('accessToken').value = ''; cfgTouched = false;
    note('cfgMsg','Saved.', true);
    loadAgent();
  } catch(e){ note('cfgMsg', e.message); }
}

async function togglePause(){
  var on = $('pauseBtn').textContent === 'Pause';
  try{
    await api('/api/agents/'+CUR+'/config',{ method:'POST',
      body: JSON.stringify({ enabled: !on }) });
    loadAgent();
  } catch(e){ note('cfgMsg', e.message); }
}

async function toggleDebug(){
  var on = $('debugBtn').textContent.indexOf('is on') > -1;
  try{
    await api('/api/agents/'+CUR+'/config',{ method:'POST',
      body: JSON.stringify({ debug: !on }) });
    loadAgent();
  } catch(e){ note('cfgMsg', e.message); }
}

// --------------------------------------------------------------- admin

async function loadAdmin(){
  try{
    var j = await api('/api/admin/users'), r = j.ram;
    $('ramLine').textContent = r.running + ' agent(s) running';
    show('ramBox','<div class="ready" style="padding:0;border:0;margin:0">'
      + '<div class="top"><span class="lab">Memory in use</span>'
      + '<span class="cnt"><b>'+r.percent+'%</b></span></div>'
      + '<div class="track"><i style="width:'+r.percent+'%"></i></div>'
      + '<p>'+r.usedMb+' of '+r.totalMb+' MB. '
      + (r.percent >= 80
        ? 'Close to the limit. Granting more agents now risks taking the server down.'
        : 'Each connected agent uses roughly 130 MB.')
      + '</p></div>');

    var h = '';
    j.users.forEach(function(u){
      h += '<div class="item"><div><div class="nm">'+esc(u.email)+'</div>'
        + '<div class="meta">'+u.agents_used+' of '+u.agent_limit+' agents'
        + (u.role === 'admin' ? ' - admin' : '')
        + (u.status !== 'active' ? ' - ' + u.status : '') + '</div></div>'
        + '<div class="side">'
        + '<button class="ghost sm" onclick="chLimit(\\''+u.id+'\\','
        + u.agent_limit + ')">Limit</button>'
        + (u.role === 'admin' ? ''
          : '<button class="ghost sm" onclick="delUser(\\''+u.id
            +'\\')">Remove</button>')
        + '</div></div>';
    });
    show('userList', h);
  } catch(e){ note('admMsg', e.message); }
}

async function addUser(){
  note('admMsg','');
  try{
    await api('/api/admin/users',{ method:'POST', body: JSON.stringify({
      email: $('newEmail').value, agentLimit: Number($('newLimit').value) })});
    $('newEmail').value = '';
    note('admMsg','Access granted.', true);
    loadAdmin();
  } catch(e){ note('admMsg', e.message); }
}

async function chLimit(id,cur){
  var n = prompt('How many agents may this person create?', cur);
  if (n === null) return;
  try{
    await api('/api/admin/users/'+id,{ method:'PATCH',
      body: JSON.stringify({ agentLimit: Number(n) }) });
    loadAdmin();
  } catch(e){ note('admMsg', e.message); }
}

async function delUser(id){
  if (!confirm('Remove this person and every agent they own? This cannot be undone.')) return;
  try{ await api('/api/admin/users/'+id,{ method:'DELETE' }); loadAdmin(); }
  catch(e){ note('admMsg', e.message); }
}

// ---------------------------------------------------------------- boot

(async function(){
  CUR = 'boot';
  try{
    var j = await api('/api/me');
    ME = j; CUR = null;
    $('adminBtn').style.display = (j.role === 'admin') ? '' : 'none';
    enter();
  } catch(e){ CUR = null; go('login'); }
})();
</script>
</body>
</html>`;
