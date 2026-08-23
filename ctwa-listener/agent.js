// agent.js - one CTWA listener process for a single agent.
// Launched by manager.js as a child process.
// Requires env: AGENT_ID
// Talks to the manager over process.send / process.on("message").
// ASCII only on purpose - this file gets pasted through mobile terminals.

import fs from "fs";
import path from "path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { db } from "./db.js";

const AGENT_ID = process.env.AGENT_ID;
if (!AGENT_ID) {
  console.error("AGENT_ID env var is required");
  process.exit(1);
}

const AUTH_DIR = path.join(process.cwd(), "agents", AGENT_ID, "auth");
fs.mkdirSync(AUTH_DIR, { recursive: true });

const GRAPH_VERSION = "v25.0";

let sock = null;
let generation = 0;
let starting = false;
let reconnectTimer = null;
let connState = "disconnected";
let selfJid = null;
let config = {};

const stats = { messages: 0, ctwa: 0, delivered: 0, failed: 0 };

// ---------------------------------------------------------------- utilities

function send(msg) {
  try {
    if (process.send) process.send(msg);
  } catch {}
}

function log(level, msg, extra) {
  const line = {
    type: "log",
    agentId: AGENT_ID,
    level,
    msg,
    extra: extra ?? null,
    t: Date.now(),
  };
  send(line);
  const tail = extra ? " " + JSON.stringify(extra).slice(0, 300) : "";
  console.log("[" + level + "] " + msg + tail);
}

function pushState() {
  send({
    type: "state",
    agentId: AGENT_ID,
    connState,
    selfJid,
    stats: { ...stats },
  });
}

function loadConfig() {
  const row = db
    .prepare("SELECT * FROM agent_config WHERE agent_id = ?")
    .get(AGENT_ID);
  config = row || {};
  return config;
}

function setAgentStatus(status, waNumber) {
  try {
    if (waNumber === undefined) {
      db.prepare("UPDATE agents SET status = ? WHERE id = ?").run(
        status,
        AGENT_ID
      );
    } else {
      db.prepare(
        "UPDATE agents SET status = ?, wa_number = ? WHERE id = ?"
      ).run(status, waNumber, AGENT_ID);
    }
  } catch (err) {
    log("warn", "Status write failed", { error: String(err).slice(0, 160) });
  }
}

// ------------------------------------------------------------ ctwa handling

function containersOf(msg) {
  const m = msg?.message;
  if (!m) return [];
  return [
    m.extendedTextMessage,
    m.imageMessage,
    m.videoMessage,
    m.documentMessage,
    m.audioMessage,
    m.stickerMessage,
    m.buttonsResponseMessage,
    m.listResponseMessage,
    m.templateButtonReplyMessage,
    m.viewOnceMessage?.message?.extendedTextMessage,
    m.viewOnceMessageV2?.message?.extendedTextMessage,
    m.ephemeralMessage?.message?.extendedTextMessage,
  ];
}

// ctwa_clid rides inside the protobuf contextInfo, not the visible text,
// and only ever arrives on the very first message from a given person.
function extractCtwa(msg) {
  for (const c of containersOf(msg)) {
    const ad = c?.contextInfo?.externalAdReply;
    if (ad && ad.ctwaClid) {
      return {
        ctwaClid: ad.ctwaClid,
        sourceId: ad.sourceId ?? null,
        sourceType: ad.sourceType ?? null,
        sourceUrl: ad.sourceUrl ?? null,
        title: ad.title ?? null,
        body: ad.body ?? null,
      };
    }
  }
  return null;
}

// Later messages from the same lead still carry the ad card but no clid.
function hasAdContext(msg) {
  for (const c of containersOf(msg)) {
    if (c && c.contextInfo && c.contextInfo.externalAdReply) return true;
  }
  return false;
}

// The lidMapping cache is memory only and is populated as the message
// arrives, so this only works inside the messages.upsert handler.
async function resolvePn(jid) {
  try {
    if (!jid) return null;
    if (jid.endsWith("@s.whatsapp.net")) {
      return jid.split("@")[0].split(":")[0];
    }
    if (!jid.endsWith("@lid")) return null;
    const mapper = sock?.signalRepository?.lidMapping;
    if (!mapper || !mapper.getPNForLID) return null;
    const pnJid = await mapper.getPNForLID(jid);
    if (!pnJid) return null;
    return String(pnJid).split("@")[0].split(":")[0];
  } catch {
    return null;
  }
}

// Dedupe lives in the events table now, so it survives restarts.
// Returns true if this clid is new for this agent.
function claimClid(clid) {
  try {
    db.prepare(
      "INSERT INTO events (agent_id, ctwa_clid, ts, status) VALUES (?,?,?,?)"
    ).run(AGENT_ID, clid, Date.now(), "pending");
    return true;
  } catch {
    return false;
  }
}

function markEvent(clid, status, resp) {
  try {
    db.prepare(
      "UPDATE events SET status = ?, meta_resp = ? WHERE agent_id = ? AND ctwa_clid = ?"
    ).run(status, resp ? String(resp).slice(0, 500) : null, AGENT_ID, clid);
  } catch {}
}

// ------------------------------------------------------------------- capi

async function sendConversion(clid) {
  loadConfig();
  const dataset = (config.dataset_id || "").trim();
  const pageId = (config.page_id || "").trim();
  const token = (config.access_token || "").trim();
  const eventName = (config.event_name || "LeadSubmitted").trim();
  const testCode = (config.test_code || "").trim();

  if (!dataset || !pageId || !token) {
    stats.failed++;
    markEvent(clid, "failed", "missing dataset/page/token");
    log("error", "CAPI skipped - dataset, page id or token missing");
    pushState();
    return;
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_id: "ctwa_" + clid.slice(0, 24),
        event_time: Math.floor(Date.now() / 1000),
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        user_data: { page_id: pageId, ctwa_clid: clid },
      },
    ],
  };
  if (testCode) payload.test_event_code = testCode;

  const url =
    "https://graph.facebook.com/" +
    GRAPH_VERSION +
    "/" +
    dataset +
    "/events?access_token=" +
    encodeURIComponent(token);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body && typeof body.received === "number") {
      stats.delivered++;
      markEvent(clid, "delivered", JSON.stringify(body));
      log("ok", eventName + " delivered to Meta", { received: body.received });
    } else {
      stats.failed++;
      // Meta's generic message is useless - the real reason is in the details.
      const err = body?.error || {};
      markEvent(clid, "failed", JSON.stringify(body));
      log("error", "CAPI rejected the event", {
        message: err.message ?? null,
        details: err.error_data?.details ?? null,
        user_msg: err.error_user_msg ?? null,
        subcode: err.error_subcode ?? null,
      });
    }
  } catch (err) {
    stats.failed++;
    markEvent(clid, "failed", String(err).slice(0, 300));
    log("error", "CAPI request failed", { error: String(err).slice(0, 200) });
  }
  pushState();
}

// ------------------------------------------------------------- auto reply

// The auto-reply is what makes the chat visible on the phone, so it must
// never be skipped. If the phone number cannot be resolved we fall back to
// the raw LID, which does work for sending.
async function autoReply(target, fallback) {
  const text = String(config.auto_reply_text || "Yes");
  if (!text.trim()) return;
  const tries = [target];
  if (fallback && fallback !== target) tries.push(fallback);
  for (const to of tries) {
    try {
      const r = await sock.sendMessage(to, { text });
      log("ok", "Auto-reply sent", { to, id: r?.key?.id ?? null });
      return;
    } catch (err) {
      log("warn", "Auto-reply failed", {
        to,
        error: String(err).slice(0, 160),
      });
    }
  }
}

// --------------------------------------------------------------- socket

function teardown() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    try {
      sock.ev.removeAllListeners();
    } catch {}
    try {
      sock.ws?.close();
    } catch {}
    try {
      sock.end(undefined);
    } catch {}
  }
  sock = null;
}

async function startSocket() {
  if (starting) return;
  starting = true;
  generation++;
  const myGen = generation;
  const isCurrent = () => myGen === generation;

  try {
    teardown();
    loadConfig();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      browser: ["CTWA Listener", "Chrome", "1.0.0"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (u) => {
      if (!isCurrent()) return;
      const { connection, lastDisconnect, qr } = u;

      if (qr) {
        connState = "qr";
        // Raw QR string - the manager turns it into an image.
        send({ type: "qr", agentId: AGENT_ID, qr });
        log("info", "QR ready - scan it from the dashboard");
        pushState();
      }

      if (connection === "open") {
        connState = "connected";
        selfJid = sock.user?.id ?? null;
        const num = selfJid ? selfJid.split("@")[0].split(":")[0] : null;
        setAgentStatus("connected", num);
        log("ok", "Connected as " + selfJid);
        pushState();
      }

      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;

        // 440 means another socket replaced this one. Reconnecting here
        // causes an endless fight between the two, so we stop instead.
        if (code === DisconnectReason.connectionReplaced || code === 440) {
          connState = "replaced";
          setAgentStatus("stopped");
          log("warn", "Connection replaced (440) - stopping");
          teardown();
          pushState();
          return;
        }

        if (code === DisconnectReason.loggedOut || code === 401) {
          connState = "logged_out";
          setAgentStatus("created", null);
          log("warn", "Logged out - session must be cleared and re-scanned");
          teardown();
          pushState();
          return;
        }

        connState = "reconnecting";
        log("warn", "Connection closed (" + code + ") - reconnecting in 5s");
        pushState();
        teardown();
        reconnectTimer = setTimeout(() => {
          starting = false;
          startSocket().catch((e) =>
            log("error", "Reconnect failed", {
              error: String(e).slice(0, 200),
            })
          );
        }, 5000);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (!isCurrent()) return;
      if (type !== "notify") return;

      for (const msg of messages) {
        if (msg.key?.fromMe) continue;
        const jid = msg.key?.remoteJid ?? "";
        if (jid.endsWith("@g.us") || jid === "status@broadcast") continue;

        stats.messages++;

        const ad = extractCtwa(msg);
        const isAd = hasAdContext(msg);
        if (!ad && !isAd) {
          if (config.debug) {
            log("info", "Non-ad message", {
              types: Object.keys(msg.message ?? {}).join(","),
            });
          }
          pushState();
          continue;
        }

        // Must happen now - the LID cache is only warm at this moment.
        const pn = await resolvePn(jid);
        const target = pn ? pn + "@s.whatsapp.net" : jid;

        if (!ad) {
          log("warn", "Ad message with no click id from " + (pn ? "+" + pn : jid));
          await autoReply(target, jid);
          pushState();
          continue;
        }

        if (!claimClid(ad.ctwaClid)) {
          log("warn", "Duplicate click id - skipping");
          pushState();
          continue;
        }

        stats.ctwa++;
        log("ctwa", "CTWA message from " + (pn ? "+" + pn : jid), {
          ctwaClid: ad.ctwaClid.slice(0, 28) + "...",
          sourceId: ad.sourceId,
          sourceType: ad.sourceType,
          title: ad.title,
        });

        if (config.enabled) {
          await sendConversion(ad.ctwaClid);
        } else {
          markEvent(ad.ctwaClid, "paused", null);
          log("warn", "Agent is paused - event not sent");
        }

        await autoReply(target, jid);
        pushState();
      }
    });

    starting = false;
  } catch (err) {
    starting = false;
    connState = "error";
    log("error", "Socket start failed", { error: String(err).slice(0, 200) });
    pushState();
  }
}

async function clearSession() {
  generation++;
  if (sock) {
    try {
      await sock.logout();
    } catch {}
  }
  teardown();
  starting = false;
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  connState = "disconnected";
  selfJid = null;
  setAgentStatus("created", null);
  log("warn", "Session cleared");
  pushState();
}

// ------------------------------------------------------------------- ipc

process.on("message", async (m) => {
  try {
    if (!m || !m.type) return;

    if (m.type === "link") {
      await startSocket();
    } else if (m.type === "logout") {
      await clearSession();
    } else if (m.type === "config") {
      loadConfig();
      log("info", "Configuration reloaded");
    } else if (m.type === "send") {
      const to = String(m.to || "").trim();
      const text = String(m.text || "").trim();
      if (!to || !text) return;
      const jid = to.includes("@") ? to : to + "@s.whatsapp.net";
      const r = await sock.sendMessage(jid, { text });
      log("ok", "Manual send", { jid, id: r?.key?.id ?? null });
    } else if (m.type === "resolve") {
      const lid = String(m.lid || "").trim();
      const jid = lid.includes("@") ? lid : lid + "@lid";
      const pn = await resolvePn(jid);
      send({ type: "resolved", agentId: AGENT_ID, lid: jid, pn, rid: m.rid });
    } else if (m.type === "test") {
      const clid = String(m.ctwaClid || "").trim();
      if (!clid) return;
      claimClid(clid);
      log("info", "Manual test event");
      await sendConversion(clid);
    } else if (m.type === "state") {
      pushState();
    } else if (m.type === "stop") {
      teardown();
      connState = "stopped";
      setAgentStatus("stopped");
      pushState();
      process.exit(0);
    }
  } catch (err) {
    log("error", "Command failed", { error: String(err).slice(0, 200) });
  }
});

process.on("uncaughtException", (err) => {
  log("error", "Uncaught", { error: String(err).slice(0, 300) });
});
process.on("unhandledRejection", (err) => {
  log("error", "Unhandled rejection", { error: String(err).slice(0, 300) });
});

loadConfig();
log("info", "Agent process started for " + AGENT_ID);
pushState();

// Only auto-connect when a session already exists. A freshly created agent
// stays idle until the user scans, so it costs no RAM.
if (fs.existsSync(path.join(AUTH_DIR, "creds.json"))) {
  log("info", "Existing session found - reconnecting");
  startSocket().catch((e) =>
    log("error", "Auto-start failed", { error: String(e).slice(0, 200) })
  );
} else {
  log("info", "No session yet - waiting for QR scan");
}
