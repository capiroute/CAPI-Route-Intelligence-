// ui.js - dashboard for the multi-agent CTWA listener.
// Every panel is open. Nothing is hidden behind a toggle.
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
    --ink:#f4f4f5; --dim:#8b8b93; --faint:#4d4d55;
    --acc:#ffcc00; --ok:#3ddc84; --bad:#ff5c5c; --warn:#ffa726;
    --sans:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
    --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
    font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased}
  .wrap{max-width:720px;margin:0 auto;padding:18px 16px 56px}

  .hdr{display:flex;justify-content:space-between;align-items:flex-start;
    gap:12px;margin-bottom:18px}
  .hdr h1{font-size:20px;font-weight:650;letter-spacing:-.3px;margin:0}
  .hdr .sub{font-family:var(--mono);font-size:12px;color:var(--dim);
    margin-top:4px}
  .acts{display:flex;gap:8px;flex-shrink:0}

  .card{background:var(--panel);border:1px solid var(--line);
    border-radius:16px;padding:20px;margin-bottom:14px}
  .card > h2{font-size:12px;font-weight:600;letter-spacing:1.4px;
    text-transform:uppercase;color:var(--acc);margin:0 0 16px}
  .card .note{font-size:12.5px;color:var(--dim);margin:14px 0 0}

  .live{display:inline-flex;align-items:center;gap:8px;font-size:14px;
    font-weight:600}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--faint);
    flex-shrink:0}
  .dot.on{background:var(--ok);box-shadow:0 0 0 3px rgba(61,220,132,.16)}
  .dot.wait{background:var(--warn);box-shadow:0 0 0 3px rgba(255,167,38,.16)}
  .dot.off{background:var(--bad);box-shadow:0 0 0 3px rgba(255,92,92,.13)}

  .stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .stat{background:var(--sunk);border:1px solid var(--line);
    border-radius:12px;padding:15px}
  .stat .k{font-size:10.5px;letter-spacing:1px;text-transform:uppercase;
    color:var(--dim)}
  .stat .v{font-family:var(--mono);font-size:26px;font-weight:600;
    line-height:1.1;margin-top:8px}
  .stat.a .v{color:var(--acc)} .stat.g .v{color:var(--ok)}
  .stat.r .v{color:var(--bad)}

  .meter{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}
  .meter .top{display:flex;justify-content:space-between;align-items:baseline;
    margin-bottom:10px}
  .meter .lab{font-size:13.5px;font-weight:600}
  .meter .cnt{font-family:var(--mono);font-size:13px;color:var(--dim)}
  .meter .cnt b{color:var(--acc);font-size:17px}
  .track{height:6px;background:var(--sunk);border-radius:99px;overflow:hidden}
  .track i{display:block;height:100%;background:var(--acc);border-radius:99px;
    transition:width .5s ease}

  label{display:block;font-size:12.5px;color:var(--dim);margin:16px 0 6px;
    font-weight:500}
  .fields > label:first-child{margin-top:0}
  input,select{width:100%;background:var(--sunk);border:1px solid var(--line);
    color:var(--ink);border-radius:10px;padding:12px 13px;
    font-family:var(--mono);font-size:14px}
  input::placeholder{color:var(--faint);font-style:italic}
  input:focus,select:focus{outline:2px solid var(--acc);outline-offset:-1px;
    border-color:transparent}
  .hintline{font-family:var(--mono);font-size:11.5px;margin-top:6px;
    color:var(--dim)}
  .hintline.warn{color:var(--warn)}
  .hintline.ok{color:var(--ok)}

  button{background:var(--acc);color:#000;border:0;border-radius:10px;
    padding:12px 18px;font-family:var(--sans);font-size:14px;font-weight:650;
    cursor:pointer}
  button:hover{filter:brightness(1.08)}
  button.ghost{background:transparent;color:var(--ink);
    border:1px solid var(--line);font-weight:500}
  button.sm{padding:8px 13px;font-size:13px}
  button:disabled{opacity:.35;cursor:not-allowed;filter:none}
  .link{background:none;border:0;color:var(--bad);font-size:13px;padding:6px 0;
    cursor:pointer;text-decoration:underline;text-underline-offset:3px;
    font-family:var(--sans)}
  .link.mute{color:var(--dim)}
  .row{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px;align-items:center}
  .danger{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);
    display:flex;gap:20px;flex-wrap:wrap}

  .tabs{display:flex;gap:8px;margin:16px 0 0}
  .tab{flex:1;text-align:center;padding:10px;border:1px solid var(--line);
    border-radius:10px;font-size:13px;cursor:pointer;color:var(--dim);
    background:var(--sunk);font-weight:500}
  .tab.sel{border-color:var(--acc);color:var(--ink);
    background:rgba(255,204,0,.07)}

  .qr{background:#fff;padding:14px;border-radius:14px;text-align:center;
    margin-top:16px}
  .qr img{width:100%;max-width:230px;display:block;margin:0 auto}
  .qr p{color:#444;font-size:12px;margin:10px 0 0}
  .code{margin-top:16px;background:var(--sunk);border:1px solid var(--acc);
    border-radius:12px;padding:18px;text-align:center}
  .code b{font-family:var(--mono);font-size:30px;letter-spacing:5px;
    color:var(--acc);display:block}
  .code p{font-size:12px;color:var(--dim);margin:10px 0 0}

  .log{background:var(--sunk);border-radius:10px;padding:2px 12px;
    max-height:300px;overflow:auto;font-family:var(--mono);font-size:11.5px}
  .log div{padding:8px 0;border-bottom:1px solid #1a1a1e;
    word-break:break-word;color:var(--dim)}
  .log div:last-child{border:0}
  .log .t{color:var(--faint);margin-right:8px}
  .log .ok{color:var(--ok)} .log .error{color:var(--bad)}
  .log .warn{color:var(--warn)} .log .ctwa{color:var(--acc)}

  .item{display:flex;justify-content:space-between;align-items:center;gap:12px;
    padding:15px 16px;border:1px solid var(--line);border-radius:13px;
    margin-bottom:9px;background:var(--sunk)}
  .item .nm{font-weight:600;font-size:14px}
  .item .meta{font-family:var(--mono);font-size:11.5px;color:var(--dim);
    margin-top:3px}
  .item .side{display:flex;gap:7px;align-items:center;flex-shrink:0}

  .msg{padding:12px 14px;border-radius:10px;margin-bottom:14px;font-size:13px}
  .msg.err{background:rgba(255,92,92,.1);color:var(--bad);
    border:1px solid rgba(255,92,92,.25)}
  .msg.good{background:rgba(61,220,132,.1);color:var(--ok);
    border:1px solid rgba(61,220,132,.25)}
  .empty{text-align:center;padding:32px 18px;color:var(--dim);font-size:13px}
  .hide{display:none}
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
      <div id="loginMsg"></div>
      <div class="fields">
        <label>Email</label>
        <input id="email" type="email" placeholder="you@example.com">
        <label>Password</label>
        <input id="password" type="password" placeholder="at least 8 characters">
      </div>
      <div class="row"><button onclick="doLogin()">Sign in</button></div>
      <p class="note">Your admin grants access. Your first sign in sets your password.</p>
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
        <div class="live" style="margin-top:6px">
          <span class="dot" id="dot"></span><span id="connWord">Checking</span>
        </div>
      </div>
      <div class="acts"><button class="ghost sm" onclick="go('list')">Agents</button></div>
    </div>

    <div class="card">
      <h2>Activity summary</h2>
      <div class="stats">
        <div class="stat"><div class="k">Messages</div><div class="v" id="sMsg">0</div></div>
        <div class="stat a"><div class="k">Click IDs found</div><div class="v" id="sCtwa">0</div></div>
        <div class="stat g"><div class="k">Sent to Meta</div><div class="v" id="sDel">0</div></div>
        <div class="stat r"><div class="k">Failed</div><div class="v" id="sFail">0</div></div>
      </div>
      <div class="meter">
        <div class="top">
          <span class="lab">Optimisation readiness</span>
          <span class="cnt"><b id="rNow">0</b> / <span id="rGoal">10</span></span>
        </div>
        <div class="track"><i id="rBar" style="width:0%"></i></div>
        <p class="note" id="rNote"></p>
      </div>
    </div>

    <div class="card">
      <h2>WhatsApp connection</h2>
      <div class="live"><span class="dot" id="dot2"></span><span id="connWord2"></span></div>
      <div id="connMsg" style="margin-top:14px"></div>

      <div class="tabs">
        <div class="tab sel" id="tabQr" onclick="setMode('qr')">QR code</div>
        <div class="tab" id="tabPair" onclick="setMode('pairing')">Pairing code</div>
      </div>

      <div id="pairFields" class="hide">
        <label>WhatsApp number with country code</label>
        <input id="pairNumber" placeholder="923281386375">
        <div class="hintline">Digits only. No plus sign, no spaces.</div>
      </div>

      <div id="qrBox"></div>

      <div class="row">
        <button id="linkBtn" onclick="doLink()">Connect</button>
        <button class="ghost" onclick="agentAction('stop')">Stop</button>
      </div>
      <div class="danger">
        <button class="link" onclick="clearSession()">Clear session and start over</button>
      </div>
    </div>

    <div class="card">
      <h2>Meta Conversions API</h2>
      <div id="cfgMsg"></div>
      <div class="fields">
        <label>Dataset ID</label>
        <input id="datasetId" placeholder="not set">
        <label>Facebook Page ID</label>
        <input id="pageId" placeholder="not set">
        <label>Access token</label>
        <input id="accessToken" type="password" placeholder="leave blank to keep the saved one">
        <div class="hintline" id="tokState"></div>
        <label>Event name</label>
        <select id="eventName">
          <option>LeadSubmitted</option>
          <option>Purchase</option>
        </select>
        <label>Auto-reply sent to every lead</label>
        <input id="autoReplyText" placeholder="Yes">
        <label>Test event code (optional)</label>
        <input id="testCode" placeholder="leave blank for live events">
      </div>
      <div class="row">
        <button onclick="saveCfg()">Save changes</button>
        <button class="ghost" id="pauseBtn" onclick="togglePause()">Pause</button>
      </div>
      <p class="note">The dataset must be linked to this Page in Events Manager,
        otherwise Meta rejects every event.</p>
      <div class="danger">
        <button class="link mute" id="debugBtn" onclick="toggleDebug()">Debug logging</button>
        <button class="link" onclick="delSelf()">Delete this agent</button>
      </div>
    </div>

    <div class="card">
      <h2>Live log</h2>
      <div class="log" id="logBox"></div>
    </div>
  </div>

  <!-- ADMIN -->
  <div id="v-admin" class="hide">
    <div class="hdr">
      <div><h1>Admin</h1><div class="sub" id="ramLine"></div></div>
      <div class="acts"><button class="ghost sm" onclick="go('list')">Back</button></div>
    </div>

    <div class="card">
      <h2>Server capacity</h2>
      <div class="meter" style="margin:0;padding:0;border:0">
        <div class="top"><span class="lab">Memory in use</span>
          <span class="cnt"><b id="ramPct">0%</b></span></div>
        <div class="track"><i id="ramBar" style="width:0%"></i></div>
        <p class="note" id="ramNote"></p>
      </div>
    </div>

    <div class="card">
      <h2>Grant access</h2>
      <div id="admMsg"></div>
      <div class="fields">
        <label>Email</label>
        <input id="newEmail" type="email" placeholder="client@example.com">
        <label>How many agents they may create</label>
        <input id="newLimit" type="number" value="1" min="1">
      </div>
      <div class="row"><button onclick="addUser()">Grant access</button></div>
      <p class="note">They choose their own password the first time they sign in.</p>
    </div>

    <div class="card">
      <h2>People with access</h2>
      <div id="userList"></div>
    </div>
  </div>

</div>

<script>
var CUR=null, ME=null, timer=null, cfgTouched=false, MODE='qr';

function $(i){ return document.getElementById(i); }
function show(i,h){ $(i).innerHTML=h; }
function note(i,t,g){
  $(i).innerHTML = t ? '<div class="msg '+(g?'good':'err')+'">'+t+'</div>' : '';
}
function esc(s){ return String(s).replace(/[<>&"]/g,function(c){
  return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]; }); }

async function api(p,o){
  o=o||{}; o.headers=Object.assign({'Content-Type':'application/json'},o.headers||{});
  var r=await fetch(p,o), j={};
  try{ j=await r.json(); }catch(e){}
  if(r.status===401 && CUR!=='boot') go('login');
  if(!r.ok) throw new Error(j.error||('Request failed ('+r.status+')'));
  return j;
}

function go(v){
  ['login','list','agent','admin'].forEach(function(x){
    $('v-'+x).classList.add('hide'); });
  $('v-'+v).classList.remove('hide');
  window.scrollTo(0,0);
  if(timer){ clearInterval(timer); timer=null; }
  if(v==='list') loadList();
  if(v==='admin') loadAdmin();
  if(v==='agent'){ loadAgent(); timer=setInterval(loadAgent,3000); }
}

async function enter(){
  try{
    var j=await api('/api/agents');
    if(j.agents.length===1){ openAgent(j.agents[0].id,j.agents[0].name); return; }
  }catch(e){}
  go('list');
}

async function doLogin(){
  note('loginMsg','');
  try{
    var j=await api('/api/auth/login',{method:'POST',body:JSON.stringify({
      email:$('email').value, password:$('password').value })});
    ME=j; $('adminBtn').style.display=(j.role==='admin')?'':'none';
    enter();
  }catch(e){ note('loginMsg',e.message); }
}

async function doLogout(){
  try{ await api('/api/auth/logout',{method:'POST'}); }catch(e){}
  location.reload();
}

async function loadList(){
  try{
    var j=await api('/api/agents');
    $('quota').textContent=j.used+' of '+j.limit+' agents used';
    $('addBtn').disabled=(j.used>=j.limit);
    $('addBtn').textContent=(j.used>=j.limit)?'Limit reached':'Add agent';
    show('ramWarn',(j.ram && j.ram.percent>=80)
      ? '<div class="msg err">Server memory is at '+j.ram.percent
        +'%. Connecting another agent may take the server down.</div>':'');
    if(!j.agents.length){
      show('agentList','<div class="empty">No agents yet. Add one to connect a WhatsApp number.</div>');
      return;
    }
    var h='';
    j.agents.forEach(function(a){
      var d=a.live==='connected'?'on':(a.live==='qr'||a.live==='pairing'?'wait':'off');
      var w=a.live==='connected'?'Live':(a.live==='qr'||a.live==='pairing'?'Linking':'Offline');
      h+='<div class="item"><div><div class="nm">'+esc(a.name)+'</div>'
        +'<div class="meta">'+(a.waNumber?'+'+a.waNumber:'no number linked')
        +'</div></div><div class="side">'
        +'<span class="live"><span class="dot '+d+'"></span>'+w+'</span>'
        +'<button class="ghost sm" onclick="openAgent(\\''+a.id+'\\',\\''
        +esc(a.name).replace(/'/g,'')+'\\')">Open</button></div></div>';
    });
    show('agentList',h);
  }catch(e){ note('listMsg',e.message); }
}

async function createAgent(){
  note('listMsg','');
  try{ await api('/api/agents',{method:'POST',body:'{}'}); loadList(); }
  catch(e){ note('listMsg',e.message); }
}

function openAgent(id,name){
  CUR=id; cfgTouched=false; $('agentName').textContent=name; go('agent');
}

async function delSelf(){
  if(!confirm('Delete this agent? Its WhatsApp session is removed and must be linked again.')) return;
  try{ await api('/api/agents/'+CUR,{method:'DELETE'}); CUR=null; go('list'); }
  catch(e){ note('cfgMsg',e.message); }
}

function setMode(m){
  MODE=m;
  $('tabQr').className='tab'+(m==='qr'?' sel':'');
  $('tabPair').className='tab'+(m==='pairing'?' sel':'');
  $('pairFields').className=(m==='pairing')?'':'hide';
}

function doLink(){
  note('connMsg','');
  var body={mode:MODE};
  if(MODE==='pairing'){
    var n=($('pairNumber').value||'').replace(/[^0-9]/g,'');
    if(n.length<8){ note('connMsg','Enter the full number including the country code.'); return; }
    body.number=n;
  }
  api('/api/agents/'+CUR+'/link',{method:'POST',body:JSON.stringify(body)})
    .then(loadAgent).catch(function(e){ note('connMsg',e.message); });
}

document.addEventListener('input',function(e){
  var t=e.target;
  if(t && ['datasetId','pageId','accessToken','testCode','autoReplyText'].indexOf(t.id)>-1)
    cfgTouched=true;
});

async function loadAgent(){
  if(!CUR) return;
  try{
    var j=await api('/api/agents/'+CUR), st=j.connState;
    var d=st==='connected'?'on':(st==='qr'||st==='pairing'?'wait':'off');
    var w=st==='connected'?'Live and listening'
      :st==='qr'?'Waiting for the QR to be scanned'
      :st==='pairing'?'Waiting for the code to be entered'
      :st==='reconnecting'?'Reconnecting'
      :st==='logged_out'?'Signed out on the phone'
      :st==='starting'?'Starting'
      :'Not connected';
    $('dot').className='dot '+d; $('connWord').textContent=w;
    $('dot2').className='dot '+d;
    $('connWord2').textContent=j.agent.waNumber?('+'+j.agent.waNumber+' - '+w):w;

    var s=j.stats;
    $('sMsg').textContent=s.messages; $('sCtwa').textContent=s.ctwa;
    $('sDel').textContent=s.delivered; $('sFail').textContent=s.failed;

    if(j.pairingCode){
      show('qrBox','<div class="code"><b>'+esc(j.pairingCode)+'</b>'
        +'<p>On the phone: WhatsApp, Linked devices, Link with phone number.</p></div>');
    } else if(st==='qr' && j.qrDataUrl){
      show('qrBox','<div class="qr"><img src="'+j.qrDataUrl+'">'
        +'<p>WhatsApp on your phone: Settings, Linked devices, Link a device.</p></div>');
    } else { show('qrBox',''); }

    var lb=$('linkBtn');
    lb.disabled=(st==='connected');
    lb.textContent=st==='connected'?'Connected':(j.hasSession?'Reconnect':'Connect');

    if(!cfgTouched){
      $('datasetId').value=j.config.datasetId;
      $('pageId').value=j.config.pageId;
      $('eventName').value=j.config.eventName;
      $('testCode').value=j.config.testCode;
      $('autoReplyText').value=j.config.autoReplyText;
    }
    var ts=$('tokState');
    ts.textContent=j.config.hasToken?'A token is saved.':'No token saved yet.';
    ts.className='hintline '+(j.config.hasToken?'ok':'warn');
    $('pauseBtn').textContent=j.config.enabled?'Pause':'Resume';
    $('debugBtn').textContent=j.config.debug?'Debug logging is on':'Turn on debug logging';

    var lg='';
    j.logs.forEach(function(l){
      lg+='<div class="'+l.level+'"><span class="t">'
        +new Date(l.t).toLocaleTimeString()+'</span>'+esc(l.msg)
        +(l.extra?' <span class="t">'+esc(JSON.stringify(l.extra)).slice(0,180)+'</span>':'')
        +'</div>';
    });
    show('logBox',lg||'<div>Nothing has happened yet.</div>');

    loadEvents();
  }catch(e){}
}

async function loadEvents(){
  try{
    var j=await api('/api/agents/'+CUR+'/events');
    var g=j.optimizationTarget, n=j.deliveredLast7Days;
    $('rNow').textContent=n; $('rGoal').textContent=g;
    $('rBar').style.width=Math.min(100,Math.round(n/g*100))+'%';
    $('rNote').textContent = n>=g
      ? 'You can now choose this event as the conversion goal in Ads Manager, under a Sales campaign with the Messages destination.'
      : (g-n)+' more delivered events within 7 days before Ads Manager offers this event as a conversion goal.';
  }catch(e){}
}

async function agentAction(w){
  note('connMsg','');
  try{ await api('/api/agents/'+CUR+'/'+w,{method:'POST'}); loadAgent(); }
  catch(e){ note('connMsg',e.message); }
}

function clearSession(){
  if(!confirm('Clear the session? The number will have to be linked again.')) return;
  agentAction('logout');
}

async function saveCfg(){
  note('cfgMsg','');
  try{
    await api('/api/agents/'+CUR+'/config',{method:'POST',body:JSON.stringify({
      datasetId:$('datasetId').value, pageId:$('pageId').value,
      accessToken:$('accessToken').value, eventName:$('eventName').value,
      testCode:$('testCode').value, autoReplyText:$('autoReplyText').value })});
    $('accessToken').value=''; cfgTouched=false;
    note('cfgMsg','Saved.',true); loadAgent();
  }catch(e){ note('cfgMsg',e.message); }
}

async function togglePause(){
  var on=$('pauseBtn').textContent==='Pause';
  try{
    await api('/api/agents/'+CUR+'/config',{method:'POST',
      body:JSON.stringify({enabled:!on})});
    loadAgent();
  }catch(e){ note('cfgMsg',e.message); }
}

async function toggleDebug(){
  var on=$('debugBtn').textContent.indexOf('is on')>-1;
  try{
    await api('/api/agents/'+CUR+'/config',{method:'POST',
      body:JSON.stringify({debug:!on})});
    loadAgent();
  }catch(e){ note('cfgMsg',e.message); }
}

async function loadAdmin(){
  try{
    var j=await api('/api/admin/users'), r=j.ram;
    $('ramLine').textContent=r.running+' agent(s) running';
    $('ramPct').textContent=r.percent+'%';
    $('ramBar').style.width=r.percent+'%';
    $('ramNote').textContent=r.usedMb+' of '+r.totalMb+' MB used. '
      +(r.percent>=80
        ? 'Close to the limit. Granting more agents now risks taking the server down.'
        : 'Each connected agent uses roughly 130 MB.');
    var h='';
    j.users.forEach(function(u){
      h+='<div class="item"><div><div class="nm">'+esc(u.email)+'</div>'
        +'<div class="meta">'+u.agents_used+' of '+u.agent_limit+' agents'
        +(u.role==='admin'?' - admin':'')
        +(u.status!=='active'?' - '+u.status:'')+'</div></div><div class="side">'
        +'<button class="ghost sm" onclick="chLimit(\\''+u.id+'\\','+u.agent_limit+')">Limit</button>'
        +(u.role==='admin'?''
          :'<button class="ghost sm" onclick="delUser(\\''+u.id+'\\')">Remove</button>')
        +'</div></div>';
    });
    show('userList',h);
  }catch(e){ note('admMsg',e.message); }
}

async function addUser(){
  note('admMsg','');
  try{
    await api('/api/admin/users',{method:'POST',body:JSON.stringify({
      email:$('newEmail').value, agentLimit:Number($('newLimit').value) })});
    $('newEmail').value='';
    note('admMsg','Access granted.',true); loadAdmin();
  }catch(e){ note('admMsg',e.message); }
}

async function chLimit(id,cur){
  var n=prompt('How many agents may this person create?',cur);
  if(n===null) return;
  try{
    await api('/api/admin/users/'+id,{method:'PATCH',
      body:JSON.stringify({agentLimit:Number(n)})});
    loadAdmin();
  }catch(e){ note('admMsg',e.message); }
}

async function delUser(id){
  if(!confirm('Remove this person and every agent they own? This cannot be undone.')) return;
  try{ await api('/api/admin/users/'+id,{method:'DELETE'}); loadAdmin(); }
  catch(e){ note('admMsg',e.message); }
}

(async function(){
  CUR='boot';
  try{
    var j=await api('/api/me');
    ME=j; CUR=null;
    $('adminBtn').style.display=(j.role==='admin')?'':'none';
    enter();
  }catch(e){ CUR=null; go('login'); }
})();
</script>
</body>
</html>`;
