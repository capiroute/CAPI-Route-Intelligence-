import io, os, shutil, sys

# Restore the original dashboard, then add only the pairing code option.
if not os.path.exists("ui.js.old"):
    sys.exit("ui.js.old not found - cannot restore")
shutil.copy("ui.js.old", "ui.js")
print("RESTORED_OLD_UI")

p = "ui.js"
s = io.open(p, encoding="utf-8").read()
o = s

# 1. styles for the two tabs
A = "  .hide{display:none}"
N = """  .tabs{display:flex;gap:8px;margin:12px 0}
  .tab{flex:1;text-align:center;padding:10px;border:1px solid var(--line);
    border-radius:10px;font-size:11px;letter-spacing:1px;cursor:pointer;
    color:var(--dim);background:#1a1a1a}
  .tab.sel{border-color:var(--acc);color:var(--acc)}
  .pcode{margin-top:12px;background:#1a1a1a;border:1px solid var(--acc);
    border-radius:12px;padding:18px;text-align:center}
  .pcode b{font-family:inherit;font-size:28px;letter-spacing:5px;
    color:var(--acc);display:block}
  .pcode span{font-size:10px;color:var(--dim);display:block;margin-top:10px}
  .hide{display:none}"""
assert s.count(A) == 1, "CSS"
s = s.replace(A, N, 1)

# 2. tabs and number field above the QR box
A = '      <div id="qrBox"></div>'
N = """      <div class="tabs">
        <div class="tab sel" id="tabQr" onclick="setMode('qr')">QR CODE</div>
        <div class="tab" id="tabPair" onclick="setMode('pairing')">PAIRING CODE</div>
      </div>
      <div id="pairFields" class="hide">
        <label>Number with country code</label>
        <input id="pairNumber" placeholder="923281386375">
      </div>
      <div id="qrBox"></div>"""
assert s.count(A) == 1, "TABS"
s = s.replace(A, N, 1)

# 3. link button routes through doLink so the mode can be sent
A = "<button id=\"linkBtn\" onclick=\"agentAction('link')\">LINK / CONNECT</button>"
N = "<button id=\"linkBtn\" onclick=\"doLink()\">LINK / CONNECT</button>"
assert s.count(A) == 1, "BTN"
s = s.replace(A, N, 1)

# 4. mode state
A = "var CUR = null;      // current agent id"
N = "var CUR = null;      // current agent id\nvar MODE = 'qr';"
assert s.count(A) == 1, "VAR"
s = s.replace(A, N, 1)

# 5. show the pairing code when the agent reports one
A = """    if (j.qrDataUrl && j.connState === 'qr'){"""
N = """    if (j.pairingCode){
      show('qrBox','<div class="pcode"><b>' + j.pairingCode + '</b>'
        + '<span>WhatsApp on the phone: Linked devices, '
        + 'Link with phone number</span></div>');
    } else if (j.qrDataUrl && j.connState === 'qr'){"""
assert s.count(A) == 1, "PAIRSHOW"
s = s.replace(A, N, 1)

# 6. setMode and doLink
A = "async function agentAction(what){"
N = """function setMode(m){
  MODE = m;
  $('tabQr').className = 'tab' + (m === 'qr' ? ' sel' : '');
  $('tabPair').className = 'tab' + (m === 'pairing' ? ' sel' : '');
  $('pairFields').className = (m === 'pairing') ? '' : 'hide';
}

function doLink(){
  note('cfgMsg','');
  var body = { mode: MODE };
  if (MODE === 'pairing'){
    var n = ($('pairNumber').value || '').replace(/[^0-9]/g,'');
    if (n.length < 8){
      note('cfgMsg','Enter the full number with country code.');
      return;
    }
    body.number = n;
  }
  api('/api/agents/' + CUR + '/link', { method:'POST',
    body: JSON.stringify(body) })
    .then(loadAgent)
    .catch(function(e){ note('cfgMsg', e.message); });
}

async function agentAction(what){"""
assert s.count(A) == 1, "FUNCS"
s = s.replace(A, N, 1)

assert s != o
io.open(p, "w", encoding="utf-8").write(s)
print("PAIRING_ADDED")
