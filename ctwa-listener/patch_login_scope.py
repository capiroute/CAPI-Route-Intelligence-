import io

# ---------- manager.js : admin must not see other people's agents here ----
p = "manager.js"
s = io.open(p, encoding="utf-8").read(); o = s

A = """  const rows =
    req.user.role === "admin"
      ? db.prepare("SELECT * FROM agents ORDER BY created_at ASC").all()
      : db
          .prepare(
            "SELECT * FROM agents WHERE owner_user_id = ? ORDER BY created_at ASC"
          )
          .all(req.user.id);"""
N = """  // Everyone, admin included, sees only their own agents here.
  // Other people's agents belong in the admin panel.
  const rows = db
    .prepare(
      "SELECT * FROM agents WHERE owner_user_id = ? ORDER BY created_at ASC"
    )
    .all(req.user.id);"""
assert s.count(A) == 1, "MGR_AGENTS"
s = s.replace(A, N, 1)

assert s != o
io.open(p, "w", encoding="utf-8").write(s)
print("MANAGER_PATCHED")

# ---------- ui.js : tidy up the sign in screen ------------------------------
p = "ui.js"
s = io.open(p, encoding="utf-8").read(); o = s

A = "  .tabs{display:flex;gap:8px;margin:12px 0}"
N = """  .login{min-height:78vh;display:flex;flex-direction:column;
    justify-content:center}
  .login .brand{text-align:center;margin-bottom:22px}
  .login .brand h1{font-size:18px;letter-spacing:3px;margin:0 0 6px}
  .login .brand p{font-size:11px;color:var(--dim);margin:0;letter-spacing:1px}
  .login .card{padding:22px}
  .login button{width:100%;margin-top:4px}
  .login .foot{font-size:11px;color:var(--dim);margin:16px 0 0;
    text-align:center;line-height:1.6}
  .tabs{display:flex;gap:8px;margin:12px 0}"""
assert s.count(A) == 1, "UI_CSS"
s = s.replace(A, N, 1)

A = """  <div id="v-login">
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
  </div>"""
N = """  <div id="v-login" class="login">
    <div class="brand">
      <h1>CTWA LISTENER</h1>
      <p>CLICK-TO-WHATSAPP ATTRIBUTION</p>
    </div>
    <div class="card">
      <div id="loginMsg"></div>
      <label>Email</label>
      <input id="email" type="email" placeholder="you@gmail.com"
        autocomplete="username" onkeydown="if(event.key==='Enter')doLogin()">
      <label id="passLabel">Password</label>
      <input id="password" type="password" placeholder="your password"
        autocomplete="current-password"
        onkeydown="if(event.key==='Enter')doLogin()">
      <div class="row"><button onclick="doLogin()">SIGN IN</button></div>
      <p class="foot">Your admin grants access.<br>
        Your first sign in sets your password.</p>
    </div>
  </div>"""
assert s.count(A) == 1, "UI_LOGIN"
s = s.replace(A, N, 1)

# the login view is a flex column, so go() must not leave it as flex
A = """  $('v-' + view).classList.remove('hide');"""
N = """  $('v-' + view).classList.remove('hide');
  document.body.style.display = '';"""
assert s.count(A) == 1, "UI_GO"
s = s.replace(A, N, 1)

assert s != o
io.open(p, "w", encoding="utf-8").write(s)
print("UI_PATCHED")
