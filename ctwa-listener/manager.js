// manager.js - control plane for the multi-agent CTWA listener.
// Handles login, the admin panel API, and the lifecycle of agent processes.
// Each agent runs as its own child process so one crash cannot take the
// others down with it.
// ASCII only on purpose - this file gets pasted through mobile terminals.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { fork } from "child_process";
import express from "express";
import bcrypt from "bcryptjs";
import { db, newId } from "./db.js";

const PORT = Number(process.env.PORT || 7100);
const ROOT = process.cwd();
const AGENT_SCRIPT = path.join(ROOT, "agent.js");
const MAX_LOGS = 80;
const SESSION_DAYS = 30;

// qrcode is optional. If it is missing we still hand the raw string to the
// browser and let the client render it.
let QR = null;
try {
  QR = (await import("qrcode")).default;
} catch {
  QR = null;
}

// agentId -> { proc, connState, selfJid, stats, logs, qr, qrDataUrl }
const live = new Map();

// ------------------------------------------------------------- helpers

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function rec(agentId) {
  if (!live.has(agentId)) {
    live.set(agentId, {
      proc: null,
      connState: "stopped",
      selfJid: null,
      stats: { messages: 0, ctwa: 0, delivered: 0, failed: 0 },
      logs: [],
      qr: null,
      qrDataUrl: null,
    });
  }
  return live.get(agentId);
}

function pushLog(agentId, entry) {
  const r = rec(agentId);
  r.logs.unshift(entry);
  if (r.logs.length > MAX_LOGS) r.logs.length = MAX_LOGS;
}

function authDir(agentId) {
  return path.join(ROOT, "agents", agentId, "auth");
}

function hasSession(agentId) {
  return fs.existsSync(path.join(authDir(agentId), "creds.json"));
}

function ramInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalMb: Math.round(total / 1048576),
    usedMb: Math.round(used / 1048576),
    percent: Math.round((used / total) * 100),
    running: [...live.values()].filter((r) => r.proc).length,
  };
}

// ------------------------------------------------- agent process control

function spawnAgent(agentId) {
  const r = rec(agentId);
  if (r.proc) return r.proc;

  const proc = fork(AGENT_SCRIPT, [], {
    cwd: ROOT,
    env: { ...process.env, AGENT_ID: agentId },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  r.proc = proc;
  r.connState = "starting";

  proc.on("message", async (m) => {
    if (!m || !m.type) return;
    if (m.type === "state") {
      r.connState = m.connState;
      r.selfJid = m.selfJid;
      if (m.stats) r.stats = m.stats;
      if (m.connState === "connected") {
        r.qr = null;
        r.qrDataUrl = null;
      }
    } else if (m.type === "qr") {
      r.qr = m.qr;
      if (QR) {
        try {
          r.qrDataUrl = await QR.toDataURL(m.qr);
        } catch {
          r.qrDataUrl = null;
        }
      }
    } else if (m.type === "log") {
      pushLog(agentId, {
        level: m.level,
        msg: m.msg,
        extra: m.extra,
        t: m.t,
      });
    }
  });

  proc.stdout?.on("data", (d) => process.stdout.write("[" + agentId + "] " + d));
  proc.stderr?.on("data", (d) => process.stderr.write("[" + agentId + "] " + d));

  proc.on("exit", (code) => {
    r.proc = null;
    r.connState = "stopped";
    pushLog(agentId, {
      level: "warn",
      msg: "Agent process exited (" + code + ")",
      extra: null,
      t: Date.now(),
    });
  });

  return proc;
}

function tell(agentId, msg) {
  const r = rec(agentId);
  if (!r.proc) return false;
  try {
    r.proc.send(msg);
    return true;
  } catch {
    return false;
  }
}

function stopAgent(agentId) {
  const r = rec(agentId);
  if (!r.proc) return;
  try {
    r.proc.send({ type: "stop" });
  } catch {}
  const p = r.proc;
  setTimeout(() => {
    try {
      if (!p.killed) p.kill("SIGKILL");
    } catch {}
  }, 3000);
}

function destroyAgent(agentId) {
  stopAgent(agentId);
  live.delete(agentId);
  try {
    fs.rmSync(path.join(ROOT, "agents", agentId), {
      recursive: true,
      force: true,
    });
  } catch {}
  db.prepare("DELETE FROM events WHERE agent_id = ?").run(agentId);
  db.prepare("DELETE FROM agent_config WHERE agent_id = ?").run(agentId);
  db.prepare("DELETE FROM agents WHERE id = ?").run(agentId);
}

// --------------------------------------------------------------- auth

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function makeSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_DAYS * 86400000;
  db.prepare(
    "INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)"
  ).run(token, userId, expires);
  return token;
}

function userFromReq(req) {
  const token = parseCookies(req).sid;
  if (!token) return null;
  const s = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!s) return null;
  if (s.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(s.user_id);
  if (!u || u.status !== "active") return null;
  return u;
}

function requireAuth(req, res, next) {
  const u = userFromReq(req);
  if (!u) return res.status(401).json({ error: "not authenticated" });
  req.user = u;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "admin only" });
  }
  next();
}

// Every agent route goes through this, so a user can never touch an agent
// that is not theirs.
function ownedAgent(req, res, next) {
  const id = req.params.id;
  const a = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
  if (!a) return res.status(404).json({ error: "agent not found" });
  if (req.user.role !== "admin" && a.owner_user_id !== req.user.id) {
    return res.status(403).json({ error: "not your agent" });
  }
  req.agent = a;
  next();
}

// --------------------------------------------------------------- app

const app = express();
app.use(express.json({ limit: "256kb" }));

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const u = db
    .prepare("SELECT * FROM users WHERE lower(email) = ?")
    .get(email);
  if (!u) return res.status(401).json({ error: "no access for this email" });
  if (u.status !== "active") {
    return res.status(403).json({ error: "account suspended" });
  }
  // An invited user has no password yet and sets it on first login.
  if (!u.pass_hash) {
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "choose a password of at least 8 characters", firstTime: true });
    }
    db.prepare("UPDATE users SET pass_hash = ? WHERE id = ?").run(
      bcrypt.hashSync(password, 10),
      u.id
    );
  } else if (!bcrypt.compareSync(password, u.pass_hash)) {
    return res.status(401).json({ error: "wrong password" });
  }
  const token = makeSession(u.id);
  res.setHeader(
    "Set-Cookie",
    "sid=" + token + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=" + SESSION_DAYS * 86400
  );
  res.json({ ok: true, email: u.email, role: u.role });
});

app.post("/api/auth/check", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const u = db
    .prepare("SELECT id, pass_hash FROM users WHERE lower(email) = ?")
    .get(email);
  if (!u) return res.json({ known: false });
  res.json({ known: true, firstTime: !u.pass_hash });
});

app.post("/api/auth/logout", (req, res) => {
  const token = parseCookies(req).sid;
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; Max-Age=0");
  res.json({ ok: true });
});

app.get("/api/me", requireAuth, (req, res) => {
  const used = db
    .prepare("SELECT COUNT(*) c FROM agents WHERE owner_user_id = ?")
    .get(req.user.id).c;
  res.json({
    email: req.user.email,
    role: req.user.role,
    agentLimit: req.user.agent_limit,
    agentsUsed: used,
  });
});

// ------------------------------------------------------------- admin

app.get("/api/admin/users", requireAuth, requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      "SELECT id,email,role,agent_limit,status,created_at,(SELECT COUNT(*) FROM agents WHERE owner_user_id = users.id) AS agents_used FROM users ORDER BY created_at DESC"
    )
    .all();
  res.json({ users: rows, ram: ramInfo() });
});

app.post("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const limit = Number(req.body?.agentLimit || 1);
  if (!email.includes("@")) {
    return res.status(400).json({ error: "valid email required" });
  }
  const exists = db
    .prepare("SELECT id FROM users WHERE lower(email) = ?")
    .get(email);
  if (exists) return res.status(409).json({ error: "email already has access" });
  const id = newId("u");
  db.prepare(
    "INSERT INTO users (id,email,pass_hash,role,agent_limit,status,created_at) VALUES (?,?,?,?,?,?,?)"
  ).run(id, email, null, "user", limit, "active", Date.now());
  res.json({ ok: true, id, note: "user sets their own password on first login" });
});

app.patch("/api/admin/users/:id", requireAuth, requireAdmin, (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!u) return res.status(404).json({ error: "user not found" });

  if (req.body?.agentLimit !== undefined) {
    const limit = Number(req.body.agentLimit);
    db.prepare("UPDATE users SET agent_limit = ? WHERE id = ?").run(limit, u.id);
    // Lowering the limit suspends the newest agents rather than deleting
    // them, so nothing is lost if the limit goes back up.
    const owned = db
      .prepare(
        "SELECT id FROM agents WHERE owner_user_id = ? ORDER BY created_at ASC"
      )
      .all(u.id);
    owned.forEach((a, i) => {
      if (i >= limit) {
        stopAgent(a.id);
        db.prepare("UPDATE agents SET status = 'suspended' WHERE id = ?").run(a.id);
      } else if (
        db.prepare("SELECT status FROM agents WHERE id = ?").get(a.id).status ===
        "suspended"
      ) {
        db.prepare("UPDATE agents SET status = 'created' WHERE id = ?").run(a.id);
      }
    });
  }

  if (req.body?.status) {
    const status = String(req.body.status);
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, u.id);
    if (status !== "active") {
      db.prepare("SELECT id FROM agents WHERE owner_user_id = ?")
        .all(u.id)
        .forEach((a) => stopAgent(a.id));
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
    }
  }

  res.json({ ok: true });
});

app.delete("/api/admin/users/:id", requireAuth, requireAdmin, (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!u) return res.status(404).json({ error: "user not found" });
  if (u.id === req.user.id) {
    return res.status(400).json({ error: "cannot delete yourself" });
  }
  db.prepare("SELECT id FROM agents WHERE owner_user_id = ?")
    .all(u.id)
    .forEach((a) => destroyAgent(a.id));
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(u.id);
  res.json({ ok: true });
});

app.get("/api/admin/overview", requireAuth, requireAdmin, (_req, res) => {
  const agents = db
    .prepare(
      "SELECT a.*, u.email AS owner_email FROM agents a JOIN users u ON u.id = a.owner_user_id ORDER BY a.created_at DESC"
    )
    .all();
  res.json({
    ram: ramInfo(),
    agents: agents.map((a) => ({
      ...a,
      live: rec(a.id).connState,
      running: !!rec(a.id).proc,
    })),
  });
});

// -------------------------------------------------------------- agents

app.get("/api/agents", requireAuth, (req, res) => {
  const rows =
    req.user.role === "admin"
      ? db.prepare("SELECT * FROM agents ORDER BY created_at ASC").all()
      : db
          .prepare(
            "SELECT * FROM agents WHERE owner_user_id = ? ORDER BY created_at ASC"
          )
          .all(req.user.id);
  const used = db
    .prepare("SELECT COUNT(*) c FROM agents WHERE owner_user_id = ?")
    .get(req.user.id).c;
  res.json({
    agents: rows.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      waNumber: a.wa_number,
      live: rec(a.id).connState,
      running: !!rec(a.id).proc,
      hasSession: hasSession(a.id),
    })),
    limit: req.user.agent_limit,
    used,
    ram: ramInfo(),
  });
});

app.post("/api/agents", requireAuth, (req, res) => {
  const used = db
    .prepare("SELECT COUNT(*) c FROM agents WHERE owner_user_id = ?")
    .get(req.user.id).c;
  if (used >= req.user.agent_limit) {
    return res
      .status(403)
      .json({ error: "limit reached (" + used + " of " + req.user.agent_limit + ")" });
  }
  const id = newId("a");
  const name = String(req.body?.name || "Agent " + (used + 1)).slice(0, 60);
  db.prepare(
    "INSERT INTO agents (id,owner_user_id,name,status,wa_number,created_at) VALUES (?,?,?,?,?,?)"
  ).run(id, req.user.id, name, "created", null, Date.now());
  db.prepare("INSERT INTO agent_config (agent_id) VALUES (?)").run(id);
  fs.mkdirSync(authDir(id), { recursive: true });
  // No process is started here. RAM is only spent once the user scans.
  res.json({ ok: true, id, name });
});

app.delete("/api/agents/:id", requireAuth, ownedAgent, (req, res) => {
  destroyAgent(req.agent.id);
  res.json({ ok: true });
});

app.get("/api/agents/:id", requireAuth, ownedAgent, (req, res) => {
  const cfg =
    db.prepare("SELECT * FROM agent_config WHERE agent_id = ?").get(req.agent.id) ||
    {};
  const r = rec(req.agent.id);
  res.json({
    agent: {
      id: req.agent.id,
      name: req.agent.name,
      status: req.agent.status,
      waNumber: req.agent.wa_number,
    },
    connState: r.connState,
    running: !!r.proc,
    selfJid: r.selfJid,
    hasSession: hasSession(req.agent.id),
    qr: r.qr,
    qrDataUrl: r.qrDataUrl,
    stats: r.stats,
    logs: r.logs,
    config: {
      datasetId: cfg.dataset_id || "",
      pageId: cfg.page_id || "",
      hasToken: !!(cfg.access_token && cfg.access_token.length),
      eventName: cfg.event_name || "LeadSubmitted",
      testCode: cfg.test_code || "",
      autoReplyText: cfg.auto_reply_text || "Yes",
      enabled: !!cfg.enabled,
      debug: !!cfg.debug,
    },
  });
});

app.post("/api/agents/:id/config", requireAuth, ownedAgent, (req, res) => {
  const b = req.body ?? {};
  const cur = db
    .prepare("SELECT * FROM agent_config WHERE agent_id = ?")
    .get(req.agent.id);
  // An empty token field means "leave it alone", never "wipe it".
  const token =
    b.accessToken !== undefined && String(b.accessToken).trim().length
      ? String(b.accessToken).trim()
      : cur.access_token;

  db.prepare(
    "UPDATE agent_config SET dataset_id=?, page_id=?, access_token=?, event_name=?, test_code=?, auto_reply_text=?, enabled=?, debug=? WHERE agent_id=?"
  ).run(
    b.datasetId !== undefined ? String(b.datasetId).trim() : cur.dataset_id,
    b.pageId !== undefined ? String(b.pageId).trim() : cur.page_id,
    token,
    b.eventName !== undefined ? String(b.eventName).trim() : cur.event_name,
    b.testCode !== undefined ? String(b.testCode).trim() : cur.test_code,
    b.autoReplyText !== undefined
      ? String(b.autoReplyText)
      : cur.auto_reply_text,
    b.enabled !== undefined ? (b.enabled ? 1 : 0) : cur.enabled,
    b.debug !== undefined ? (b.debug ? 1 : 0) : cur.debug,
    req.agent.id
  );

  tell(req.agent.id, { type: "config" });
  res.json({ ok: true });
});

app.post("/api/agents/:id/link", requireAuth, ownedAgent, (req, res) => {
  if (req.agent.status === "suspended") {
    return res.status(403).json({ error: "agent is suspended by admin" });
  }
  spawnAgent(req.agent.id);
  setTimeout(() => tell(req.agent.id, { type: "link" }), 600);
  res.json({ ok: true, ram: ramInfo() });
});

app.post("/api/agents/:id/stop", requireAuth, ownedAgent, (req, res) => {
  stopAgent(req.agent.id);
  db.prepare("UPDATE agents SET status = 'stopped' WHERE id = ?").run(
    req.agent.id
  );
  res.json({ ok: true });
});

app.post("/api/agents/:id/logout", requireAuth, ownedAgent, (req, res) => {
  if (rec(req.agent.id).proc) {
    tell(req.agent.id, { type: "logout" });
  } else {
    fs.rmSync(authDir(req.agent.id), { recursive: true, force: true });
    fs.mkdirSync(authDir(req.agent.id), { recursive: true });
    db.prepare("UPDATE agents SET status='created', wa_number=NULL WHERE id=?").run(
      req.agent.id
    );
  }
  res.json({ ok: true });
});

app.post("/api/agents/:id/send", requireAuth, ownedAgent, (req, res) => {
  const ok = tell(req.agent.id, {
    type: "send",
    to: req.body?.to,
    text: req.body?.text,
  });
  if (!ok) return res.status(409).json({ error: "agent is not running" });
  res.json({ ok: true });
});

app.post("/api/agents/:id/test", requireAuth, ownedAgent, (req, res) => {
  const ok = tell(req.agent.id, {
    type: "test",
    ctwaClid: req.body?.ctwaClid,
  });
  if (!ok) return res.status(409).json({ error: "agent is not running" });
  res.json({ ok: true });
});

app.get("/api/agents/:id/events", requireAuth, ownedAgent, (req, res) => {
  const rows = db
    .prepare(
      "SELECT ctwa_clid, ts, status FROM events WHERE agent_id = ? ORDER BY ts DESC LIMIT 100"
    )
    .all(req.agent.id);
  const week = Date.now() - 7 * 86400000;
  const last7 = db
    .prepare(
      "SELECT COUNT(*) c FROM events WHERE agent_id = ? AND ts > ? AND status = 'delivered'"
    )
    .get(req.agent.id, week).c;
  // 10 delivered events inside 7 days is what unlocks the messaging
  // conversion goal in Ads Manager.
  res.json({ events: rows, deliveredLast7Days: last7, optimizationTarget: 10 });
});

// --------------------------------------------------------------- boot

app.get("/health", (_req, res) => res.json({ ok: true, ram: ramInfo() }));

app.listen(PORT, () => {
  console.log("[manager] listening on http://0.0.0.0:" + PORT);
  console.log("[manager] qrcode module:", QR ? "available" : "missing");

  // Bring back only agents that were connected and still hold a session.
  const rows = db.prepare("SELECT * FROM agents").all();
  let restored = 0;
  for (const a of rows) {
    if (a.status === "suspended") continue;
    const owner = db.prepare("SELECT status FROM users WHERE id = ?").get(
      a.owner_user_id
    );
    if (!owner || owner.status !== "active") continue;
    if (a.status === "connected" && hasSession(a.id)) {
      spawnAgent(a.id);
      restored++;
    }
  }
  console.log("[manager] restored " + restored + " agent process(es)");
});

process.on("SIGTERM", () => {
  for (const id of live.keys()) stopAgent(id);
  setTimeout(() => process.exit(0), 1500);
});
