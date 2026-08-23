import io

# ---------- agent.js ----------
p = "agent.js"
s = io.open(p, encoding="utf-8").read(); o = s

A = "async function startSocket() {\n  if (starting) return;"
N = "async function startSocket(usePairing, pairNumber) {\n  if (starting) return;"
assert s.count(A) == 1, "AG1"; s = s.replace(A, N, 1)

A = '    sock.ev.on("creds.update", saveCreds);'
N = '''    sock.ev.on("creds.update", saveCreds);

    // Pairing code is an alternative to the QR. It only works before the
    // account is registered, and the number must include the country code.
    if (usePairing && pairNumber && !sock.authState.creds.registered) {
      const digits = String(pairNumber).replace(/[^0-9]/g, "");
      if (digits.length < 8) {
        log("error", "Pairing needs the full number with country code");
      } else {
        setTimeout(async () => {
          try {
            const code = await sock.requestPairingCode(digits);
            connState = "pairing";
            send({ type: "pairing", agentId: AGENT_ID, code: String(code) });
            log("info", "Pairing code ready: " + code);
            pushState();
          } catch (err) {
            log("error", "Pairing code failed", {
              error: String(err).slice(0, 200),
            });
          }
        }, 2500);
      }
    }'''
assert s.count(A) == 1, "AG2"; s = s.replace(A, N, 1)

A = '''    if (m.type === "link") {
      await startSocket();'''
N = '''    if (m.type === "link") {
      await startSocket(m.mode === "pairing", m.number);'''
assert s.count(A) == 1, "AG3"; s = s.replace(A, N, 1)

assert s != o
io.open(p, "w", encoding="utf-8").write(s)
print("AGENT_PATCHED")

# ---------- manager.js ----------
p = "manager.js"
s = io.open(p, encoding="utf-8").read(); o = s

A = """      qr: null,
      qrDataUrl: null,
    });"""
N = """      qr: null,
      qrDataUrl: null,
      pairingCode: null,
    });"""
assert s.count(A) == 1, "MG1"; s = s.replace(A, N, 1)

A = """      if (m.connState === "connected") {
        r.qr = null;
        r.qrDataUrl = null;
      }"""
N = """      if (m.connState === "connected") {
        r.qr = null;
        r.qrDataUrl = null;
        r.pairingCode = null;
      }"""
assert s.count(A) == 1, "MG2"; s = s.replace(A, N, 1)

A = """    } else if (m.type === "log") {
      pushLog(agentId, {"""
N = """    } else if (m.type === "pairing") {
      r.pairingCode = m.code;
      r.qr = null;
      r.qrDataUrl = null;
    } else if (m.type === "log") {
      pushLog(agentId, {"""
assert s.count(A) == 1, "MG3"; s = s.replace(A, N, 1)

A = """    qr: r.qr,
    qrDataUrl: r.qrDataUrl,"""
N = """    qr: r.qr,
    qrDataUrl: r.qrDataUrl,
    pairingCode: r.pairingCode,"""
assert s.count(A) == 1, "MG4"; s = s.replace(A, N, 1)

A = """  spawnAgent(req.agent.id);
  setTimeout(() => tell(req.agent.id, { type: "link" }), 600);"""
N = """  const mode = String(req.body?.mode || "qr");
  const number = String(req.body?.number || "");
  rec(req.agent.id).pairingCode = null;
  spawnAgent(req.agent.id);
  setTimeout(
    () => tell(req.agent.id, { type: "link", mode, number }),
    600
  );"""
assert s.count(A) == 1, "MG5"; s = s.replace(A, N, 1)

assert s != o
io.open(p, "w", encoding="utf-8").write(s)
print("MANAGER_PATCHED")
