#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/shared/constants.ts
var DOCUMENT_KEY_BYTES, MUK_BYTES, IV_BYTES, AUTH_TAG_BYTES, PBKDF2_ITERATIONS, PBKDF2_HASH, BLOB_VERSION;
var init_constants = __esm({
  "src/shared/constants.ts"() {
    "use strict";
    DOCUMENT_KEY_BYTES = 32;
    MUK_BYTES = 32;
    IV_BYTES = 12;
    AUTH_TAG_BYTES = 16;
    PBKDF2_ITERATIONS = 6e5;
    PBKDF2_HASH = "sha512";
    BLOB_VERSION = 1;
  }
});

// src/core/crypto.ts
var crypto_exports = {};
__export(crypto_exports, {
  base64ToBytes: () => base64ToBytes,
  bytesToBase64: () => bytesToBase64,
  decrypt: () => decrypt,
  decryptString: () => decryptString,
  deriveMUK: () => deriveMUK,
  encrypt: () => encrypt,
  encryptString: () => encryptString,
  randomBytes: () => randomBytes
});
import crypto from "crypto";
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = cipher.update(plaintext);
  const final = cipher.final();
  const authTag = cipher.getAuthTag();
  const ciphertextLen = encrypted.length + final.length;
  const result = new Uint8Array(1 + IV_BYTES + ciphertextLen + AUTH_TAG_BYTES);
  result[0] = BLOB_VERSION;
  result.set(iv, 1);
  result.set(encrypted, 1 + IV_BYTES);
  result.set(final, 1 + IV_BYTES + encrypted.length);
  result.set(authTag, 1 + IV_BYTES + ciphertextLen);
  return result;
}
function decrypt(payload, key) {
  if (payload.length < 1 + IV_BYTES + AUTH_TAG_BYTES) {
    throw new Error("Encrypted payload too short");
  }
  const version = payload[0];
  if (version !== BLOB_VERSION) {
    throw new Error(`Unsupported blob version: ${version}`);
  }
  const iv = payload.slice(1, 1 + IV_BYTES);
  const ciphertextWithTag = payload.slice(1 + IV_BYTES);
  const ciphertext = ciphertextWithTag.slice(0, -AUTH_TAG_BYTES);
  const authTag = ciphertextWithTag.slice(-AUTH_TAG_BYTES);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = decipher.update(ciphertext);
  const final = decipher.final();
  const result = new Uint8Array(decrypted.length + final.length);
  result.set(decrypted, 0);
  result.set(final, decrypted.length);
  return result;
}
function encryptString(plaintext, key) {
  return encrypt(new TextEncoder().encode(plaintext), key);
}
function decryptString(payload, key) {
  return new TextDecoder().decode(decrypt(payload, key));
}
function deriveMUK(masterPassword, secretKey, salt) {
  return new Promise((resolve, reject) => {
    const passwordBytes = new TextEncoder().encode(masterPassword);
    const combined = new Uint8Array(passwordBytes.length + secretKey.length);
    combined.set(passwordBytes, 0);
    combined.set(secretKey, passwordBytes.length);
    crypto.pbkdf2(
      combined,
      salt,
      PBKDF2_ITERATIONS,
      MUK_BYTES,
      PBKDF2_HASH,
      (err, derivedKey) => {
        combined.fill(0);
        if (err || !derivedKey) {
          reject(err ?? new Error("Key derivation failed"));
          return;
        }
        resolve(new Uint8Array(derivedKey));
      }
    );
  });
}
function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}
function base64ToBytes(base64) {
  return new Uint8Array(Buffer.from(base64, "base64"));
}
function randomBytes(size) {
  return new Uint8Array(crypto.randomBytes(size));
}
var init_crypto = __esm({
  "src/core/crypto.ts"() {
    "use strict";
    init_constants();
  }
});

// src/cli/index.ts
import { Command } from "commander";

// src/cli/commands/auth.ts
import http from "http";

// src/core/keychain.ts
import fs2 from "fs";
import path2 from "path";

// src/core/config.ts
import fs from "fs";
import path from "path";
import os from "os";
var CONVEX_URL = "https://perfect-mallard-90.convex.cloud";
var CONVEX_SITE_URL = "https://perfect-mallard-90.convex.site";
var CONFIG_DIR = path.join(os.homedir(), ".vault-cli");
var CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
var DEFAULT_DB_PATH = path.join(CONFIG_DIR, "vault.db");
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 448 });
  }
}
function getConfigDir() {
  ensureConfigDir();
  return CONFIG_DIR;
}
function getDbPath() {
  ensureConfigDir();
  return DEFAULT_DB_PATH;
}
function loadConfig() {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }
  const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
  return JSON.parse(raw);
}
function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 384
  });
}
function updateConfig(updates) {
  const config = loadConfig();
  const updated = { ...config, ...updates };
  saveConfig(updated);
  return updated;
}

// src/core/keychain.ts
function createFileBackend() {
  const secretsFile = path2.join(getConfigDir(), "secrets.json");
  function readSecrets() {
    if (!fs2.existsSync(secretsFile)) return {};
    return JSON.parse(fs2.readFileSync(secretsFile, "utf-8"));
  }
  function writeSecrets(secrets) {
    fs2.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2), {
      mode: 384
    });
  }
  return {
    async get(key) {
      return readSecrets()[key] ?? null;
    },
    async set(key, value) {
      const secrets = readSecrets();
      secrets[key] = value;
      writeSecrets(secrets);
    },
    async delete(key) {
      const secrets = readSecrets();
      delete secrets[key];
      writeSecrets(secrets);
    }
  };
}
var backend = null;
function getKeychain() {
  if (backend) return backend;
  backend = createFileBackend();
  return backend;
}

// src/core/output.ts
function shouldOutputJson(opts) {
  if (opts.json) return true;
  if (opts.pretty) return false;
  return !process.stdout.isTTY;
}
function output(data, opts = {}) {
  if (shouldOutputJson(opts)) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}
function formatDocument(doc, includeText = false) {
  const result = {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    tags: doc.tags,
    owner: doc.owner,
    dateAdded: doc.dateAdded,
    fields: doc.fields
  };
  if (doc.mentions?.length) result.mentions = doc.mentions;
  if (doc.organizations?.length) result.organizations = doc.organizations;
  if (doc.overview) result.overview = doc.overview;
  if (doc.mimeType) result.mimeType = doc.mimeType;
  if (includeText && doc.rawText) result.rawText = doc.rawText;
  result.hasFile = !!(doc.storageId || doc.encryptedStorageId);
  result.updatedAt = doc.updatedAt;
  return result;
}
function prettyDocument(doc) {
  const lines = [];
  lines.push(`  ${doc.title}`);
  lines.push(`  Type: ${doc.type}  |  Owner: ${doc.owner ?? "\u2014"}`);
  if (doc.tags.length) lines.push(`  Tags: ${doc.tags.join(", ")}`);
  if (doc.dateAdded) lines.push(`  Added: ${doc.dateAdded}`);
  if (doc.fields && Object.keys(doc.fields).length > 0) {
    for (const [key, value] of Object.entries(doc.fields)) {
      if (value) lines.push(`  ${key}: ${value}`);
    }
  }
  return lines.join("\n");
}
function prettySearchResults(results) {
  if (results.length === 0) return "  No results found.";
  return results.map((r, i) => {
    const lines = [
      `  ${i + 1}. ${r.title}`,
      `     Type: ${r.type}  |  Score: ${r.score.toFixed(3)} (${r.scoreSource})`
    ];
    if (r.snippet) lines.push(`     ${r.snippet.slice(0, 120)}...`);
    if (r.tags.length) lines.push(`     Tags: ${r.tags.join(", ")}`);
    return lines.join("\n");
  }).join("\n\n");
}

// src/cli/commands/auth.ts
async function storeLoginCredentials(payload) {
  const keychain = getKeychain();
  if (!payload.sessionCookie || !payload.secretKey || !payload.salt || !payload.wrappedVaultKey) {
    throw new Error("Invalid login payload \u2014 missing required fields (sessionCookie, secretKey, salt, wrappedVaultKey)");
  }
  await keychain.set("session_cookie", payload.sessionCookie);
  await keychain.set("secret_key", payload.secretKey);
  await keychain.set("salt", payload.salt);
  await keychain.set("wrapped_vault_key", payload.wrappedVaultKey);
  if (payload.masterPassword) {
    await keychain.set("master_password", payload.masterPassword);
  }
  if (payload.vaultId) {
    updateConfig({ vaultId: payload.vaultId });
  }
}
function startLoginServer() {
  return new Promise((resolve) => {
    let resolvePayload;
    const payloadPromise = new Promise((res) => {
      resolvePayload = res;
    });
    const server = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === "POST" && req.url === "/auth/callback") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok" }));
            resolvePayload(payload);
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ port, server, payloadPromise });
    });
  });
}
function registerAuthCommands(program2) {
  const auth = program2.command("auth").description("Authentication management");
  auth.command("login").description("Log in via QR code from Vault mobile app").option("--payload <json>", "Paste login payload JSON directly (skip QR)").option("--cookie <cookie>", "Session cookie string (for scripted setup)").option("--secret-key <key>", "Secret key base64").option("--salt <salt>", "Salt base64").option("--wrapped-key <key>", "Wrapped vault key base64").option("--vault-id <id>", "Vault ID").action(async (opts) => {
    const isJson = shouldOutputJson(program2.opts());
    if (opts.payload) {
      try {
        const payload = JSON.parse(opts.payload);
        await storeLoginCredentials(payload);
        if (isJson) {
          output({ status: "authenticated", method: "payload" });
        } else {
          console.log("Authenticated successfully.");
        }
        return;
      } catch (err) {
        const msg = `Invalid payload: ${err.message}`;
        if (isJson) {
          output({ error: msg });
        } else {
          console.error(msg);
        }
        process.exit(1);
      }
    }
    if (opts.cookie && opts.secretKey && opts.salt && opts.wrappedKey) {
      await storeLoginCredentials({
        sessionCookie: opts.cookie,
        secretKey: opts.secretKey,
        salt: opts.salt,
        wrappedVaultKey: opts.wrappedKey,
        vaultId: opts.vaultId
      });
      if (isJson) {
        output({ status: "authenticated", method: "flags" });
      } else {
        console.log("Authenticated successfully.");
      }
      return;
    }
    if (!process.stdin.isTTY) {
      if (isJson) {
        output({ error: "QR login requires interactive terminal. Use --payload or individual flags instead." });
      } else {
        console.error("QR login requires interactive terminal.");
        console.error("Use: vault auth login --payload '<json>' for non-interactive login.");
      }
      process.exit(1);
    }
    const { port, server, payloadPromise } = await startLoginServer();
    const callbackUrl = `http://127.0.0.1:${port}/auth/callback`;
    console.log("");
    console.log("  Open the Vault app \u2192 Settings \u2192 Link CLI");
    console.log("");
    console.log("  Callback URL (for the app to send credentials to):");
    console.log(`  ${callbackUrl}`);
    console.log("");
    console.log("  Or scan this QR code with the Vault app:");
    console.log("");
    console.log(`  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510`);
    console.log(`  \u2502  vault-cli://login?port=${port}`.padEnd(44) + "\u2502");
    console.log(`  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`);
    console.log("");
    console.log("  Waiting for login from mobile app...");
    const timeout = setTimeout(() => {
      console.error("\n  Login timed out. Try again.");
      server.close();
      process.exit(1);
    }, 5 * 60 * 1e3);
    try {
      const payload = await payloadPromise;
      clearTimeout(timeout);
      server.close();
      await storeLoginCredentials(payload);
      console.log("\n  Authenticated successfully!");
      console.log("  Run `vault unlock` to unlock your vault.");
    } catch (err) {
      clearTimeout(timeout);
      server.close();
      console.error(`
  Login failed: ${err.message}`);
      process.exit(1);
    }
  });
  auth.command("logout").description("Clear all credentials from keychain").action(async () => {
    const keychain = getKeychain();
    await keychain.delete("session_cookie");
    await keychain.delete("secret_key");
    await keychain.delete("salt");
    await keychain.delete("wrapped_vault_key");
    if (shouldOutputJson(program2.opts())) {
      output({ status: "logged_out" });
    } else {
      console.log("Logged out. All credentials cleared.");
    }
  });
  auth.command("save-password").description("Save master password for auto-unlock (stored locally)").argument("<password>", "Master password").action(async (password) => {
    const keychain = getKeychain();
    await keychain.set("master_password", password);
    if (shouldOutputJson(program2.opts())) {
      output({ status: "password_saved" });
    } else {
      console.log("Master password saved. Vault will auto-unlock on every command.");
    }
  });
  auth.command("status").description("Show authentication and vault status").action(async () => {
    const keychain = getKeychain();
    const config = loadConfig();
    const hasToken = !!await keychain.get("session_cookie");
    const hasSecretKey = !!await keychain.get("secret_key");
    const hasSalt = !!await keychain.get("salt");
    const hasWrappedKey = !!await keychain.get("wrapped_vault_key");
    const status = {
      authenticated: hasToken,
      secretKeyImported: hasSecretKey,
      vaultMetaSynced: hasSalt && hasWrappedKey,
      readyToUnlock: hasToken && hasSecretKey && hasSalt && hasWrappedKey,
      convexUrl: CONVEX_URL,
      vaultId: config.vaultId ?? null,
      lastSync: config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toISOString() : null
    };
    if (shouldOutputJson(program2.opts())) {
      output(status);
    } else {
      console.log(`  Authenticated:     ${hasToken ? "yes" : "no"}`);
      console.log(`  Secret key:        ${hasSecretKey ? "imported" : "not set"}`);
      console.log(`  Vault metadata:    ${hasSalt && hasWrappedKey ? "synced" : "not synced"}`);
      console.log(`  Ready to unlock:   ${status.readyToUnlock ? "yes" : "no"}`);
      console.log(`  Convex URL:        ${CONVEX_URL}`);
      console.log(`  Vault ID:          ${config.vaultId ?? "not set"}`);
      console.log(`  Last sync:         ${config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toISOString() : "never"}`);
    }
  });
}

// src/core/vault.ts
init_crypto();
init_constants();
import crypto2 from "crypto";
var currentKeys = null;
function isVaultUnlocked() {
  return currentKeys !== null;
}
function getVaultKeys() {
  if (!currentKeys) {
    throw new Error("Vault is locked \u2014 run `vault unlock` first");
  }
  return currentKeys;
}
async function unlockVault(masterPassword) {
  const keychain = getKeychain();
  const secretKeyB64 = await keychain.get("secret_key");
  if (!secretKeyB64) {
    throw new Error("Secret key not found \u2014 run `vault auth setup-key` first");
  }
  const saltB64 = await keychain.get("salt");
  if (!saltB64) {
    throw new Error("Salt not found \u2014 run `vault sync` to fetch vault metadata");
  }
  const wrappedVaultKeyB64 = await keychain.get("wrapped_vault_key");
  if (!wrappedVaultKeyB64) {
    throw new Error("Wrapped vault key not found \u2014 run `vault sync` to fetch vault metadata");
  }
  const secretKey = base64ToBytes(secretKeyB64);
  const salt = base64ToBytes(saltB64);
  const wrappedVaultKey = base64ToBytes(wrappedVaultKeyB64);
  const muk = await deriveMUK(masterPassword, secretKey, salt);
  const vaultKey = decrypt(wrappedVaultKey, muk);
  currentKeys = { muk, vaultKey };
  return currentKeys;
}
function lockVault() {
  if (currentKeys) {
    currentKeys.muk.fill(0);
    currentKeys.vaultKey.fill(0);
    currentKeys = null;
  }
}
function unwrapDocumentKey(wrappedDocKey, vaultKey) {
  return decrypt(wrappedDocKey, vaultKey);
}
function wrapDocumentKey(documentKey, vaultKey) {
  return encrypt(documentKey, vaultKey);
}
function generateDocumentKey() {
  return new Uint8Array(crypto2.randomBytes(DOCUMENT_KEY_BYTES));
}

// src/core/sync.ts
init_crypto();
import { ConvexHttpClient } from "convex/browser";

// src/core/database.ts
import Database from "better-sqlite3";
var db = null;
function openDatabase(dbPath) {
  if (db) return db;
  const resolvedPath = dbPath ?? getDbPath();
  db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT,
      rawText TEXT,
      type TEXT,
      tags TEXT,
      fields TEXT,
      organizations TEXT,
      mentions TEXT,
      overview TEXT,
      embedding BLOB,
      encryptedDocKey BLOB,
      mimeType TEXT,
      storageId TEXT,
      owner TEXT,
      originalOwner TEXT,
      addedBy TEXT,
      imageUrl TEXT,
      dateAdded TEXT,
      status TEXT DEFAULT 'ready',
      vaultId TEXT,
      createdAt INTEGER,
      updatedAt INTEGER,
      syncStatus TEXT DEFAULT 'pending',
      encryptedStorageId TEXT,
      fileEncrypted INTEGER DEFAULT 0
    );
  `);
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      title,
      rawText,
      tags,
      type,
      owner,
      originalOwner,
      mentions,
      organizations,
      fieldsText,
      tokenize='unicode61'
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS doc_chunks (
      id TEXT PRIMARY KEY,
      docId TEXT NOT NULL,
      chunkText TEXT NOT NULL,
      embedding BLOB,
      chunkIndex INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_doc_chunks_docId ON doc_chunks(docId);

    CREATE TABLE IF NOT EXISTS chat_threads (
      id TEXT PRIMARY KEY,
      title TEXT,
      contextDocId TEXT,
      createdAt INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      threadId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sourceDocIds TEXT,
      createdAt INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_threadId ON chat_messages(threadId);
  `);
  return db;
}
function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized \u2014 call openDatabase() first");
  }
  return db;
}
function flattenFieldsForSearch(fieldsJson, type) {
  if (!fieldsJson) return "";
  try {
    const fields = JSON.parse(fieldsJson);
    return Object.values(fields).filter(Boolean).join(" ");
  } catch {
    return "";
  }
}
function deserializeRow(row) {
  let embedding;
  if (row.embedding && row.embedding instanceof Buffer) {
    const f64 = new Float64Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 8);
    embedding = Array.from(f64);
  }
  let tags = [];
  if (typeof row.tags === "string") {
    try {
      tags = JSON.parse(row.tags);
    } catch {
      tags = [];
    }
  }
  let fields = {};
  if (typeof row.fields === "string") {
    try {
      fields = JSON.parse(row.fields);
    } catch {
      fields = {};
    }
  }
  let organizations;
  if (typeof row.organizations === "string") {
    try {
      organizations = JSON.parse(row.organizations);
    } catch {
    }
  }
  let mentions;
  if (typeof row.mentions === "string") {
    try {
      mentions = JSON.parse(row.mentions);
    } catch {
    }
  }
  return {
    id: row.id,
    title: row.title,
    rawText: row.rawText,
    type: row.type,
    tags,
    fields,
    organizations,
    mentions,
    overview: row.overview,
    embedding,
    encryptedDocKey: row.encryptedDocKey,
    mimeType: row.mimeType,
    storageId: row.storageId,
    encryptedStorageId: row.encryptedStorageId,
    fileEncrypted: row.fileEncrypted,
    owner: row.owner,
    originalOwner: row.originalOwner,
    addedBy: row.addedBy,
    imageUrl: row.imageUrl,
    dateAdded: row.dateAdded,
    status: row.status,
    vaultId: row.vaultId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncStatus: row.syncStatus ?? "synced"
  };
}
function upsertDocument(doc) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO documents
    (id, title, rawText, type, tags, fields, organizations, mentions, overview, embedding, encryptedDocKey, mimeType, storageId, encryptedStorageId, fileEncrypted, owner, originalOwner, addedBy, imageUrl, dateAdded, status, vaultId, createdAt, updatedAt, syncStatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const embeddingBlob = doc.embedding ? Buffer.from(new Float64Array(doc.embedding).buffer) : null;
  stmt.run(
    doc.id,
    doc.title,
    doc.rawText ?? null,
    doc.type,
    JSON.stringify(doc.tags),
    JSON.stringify(doc.fields),
    doc.organizations ? JSON.stringify(doc.organizations) : null,
    doc.mentions ? JSON.stringify(doc.mentions) : null,
    doc.overview ?? null,
    embeddingBlob,
    doc.encryptedDocKey ?? null,
    doc.mimeType ?? null,
    doc.storageId ?? null,
    doc.encryptedStorageId ?? null,
    doc.fileEncrypted ?? 0,
    doc.owner ?? null,
    doc.originalOwner ?? null,
    doc.addedBy ?? null,
    doc.imageUrl ?? null,
    doc.dateAdded ?? null,
    doc.status ?? "ready",
    doc.vaultId ?? null,
    doc.createdAt,
    doc.updatedAt,
    doc.syncStatus
  );
  try {
    const rowInfo = database.prepare("SELECT rowid FROM documents WHERE id = ?").get(doc.id);
    if (rowInfo) {
      database.prepare("DELETE FROM documents_fts WHERE rowid = ?").run(rowInfo.rowid);
      database.prepare(`
        INSERT INTO documents_fts (rowid, title, rawText, tags, type, owner, originalOwner, mentions, organizations, fieldsText)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rowInfo.rowid,
        doc.title ?? "",
        doc.rawText ?? "",
        JSON.stringify(doc.tags ?? []),
        doc.type ?? "",
        doc.owner ?? "",
        doc.originalOwner ?? "",
        doc.mentions ? JSON.stringify(doc.mentions) : "",
        doc.organizations ? JSON.stringify(doc.organizations) : "",
        flattenFieldsForSearch(JSON.stringify(doc.fields ?? {}), doc.type)
      );
    }
  } catch {
  }
}
function getDocumentById(id) {
  const database = getDatabase();
  const row = database.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  if (!row) return null;
  return deserializeRow(row);
}
function getAllDocuments() {
  const database = getDatabase();
  const rows = database.prepare("SELECT * FROM documents ORDER BY updatedAt DESC").all();
  return rows.map(deserializeRow);
}
function getDocumentsByType(type) {
  const database = getDatabase();
  const rows = database.prepare("SELECT * FROM documents WHERE type = ? ORDER BY updatedAt DESC").all(type);
  return rows.map(deserializeRow);
}
function getDocumentsByTags(tags) {
  const database = getDatabase();
  const conditions = tags.map(() => "tags LIKE ?").join(" OR ");
  const params = tags.map((t) => `%"${t}"%`);
  const rows = database.prepare(`SELECT * FROM documents WHERE ${conditions} ORDER BY updatedAt DESC`).all(...params);
  return rows.map(deserializeRow);
}
function deleteDocument(id) {
  const database = getDatabase();
  const rowInfo = database.prepare("SELECT rowid FROM documents WHERE id = ?").get(id);
  database.prepare("DELETE FROM documents WHERE id = ?").run(id);
  if (rowInfo) {
    try {
      database.prepare("DELETE FROM documents_fts WHERE rowid = ?").run(rowInfo.rowid);
    } catch {
    }
  }
  try {
    database.prepare("DELETE FROM doc_chunks WHERE docId = ?").run(id);
  } catch {
  }
}
function searchDocumentsFTS(query, limit = 50) {
  const database = getDatabase();
  const terms = query.split(/\s+/).filter(Boolean);
  const candidates = /* @__PURE__ */ new Map();
  try {
    const ftsQuery = terms.map((t) => `${t}*`).join(" ");
    const ftsRows = database.prepare(`
      SELECT d.* FROM documents_fts fts
      JOIN documents d ON d.rowid = fts.rowid
      WHERE documents_fts MATCH ?
      LIMIT ?
    `).all(ftsQuery, limit);
    for (const row of ftsRows) {
      const doc = deserializeRow(row);
      candidates.set(doc.id, doc);
    }
  } catch {
  }
  if (candidates.size < limit) {
    const likePattern = `%${terms.join("%")}%`;
    const likeRows = database.prepare(`
      SELECT * FROM documents
      WHERE title LIKE @pat COLLATE NOCASE
         OR tags LIKE @pat COLLATE NOCASE
         OR type LIKE @pat COLLATE NOCASE
         OR owner LIKE @pat COLLATE NOCASE
         OR rawText LIKE @pat COLLATE NOCASE
      LIMIT @lim
    `).all({ pat: likePattern, lim: limit });
    for (const row of likeRows) {
      const doc = deserializeRow(row);
      if (!candidates.has(doc.id)) {
        candidates.set(doc.id, doc);
      }
    }
  }
  return Array.from(candidates.values());
}
function getDocumentCount() {
  const database = getDatabase();
  const result = database.prepare("SELECT COUNT(*) as count FROM documents").get();
  return result.count;
}
function getDocumentTypeCounts() {
  const database = getDatabase();
  return database.prepare(
    "SELECT type, COUNT(*) as count FROM documents GROUP BY type ORDER BY count DESC"
  ).all();
}
function getDocumentsWithEmbeddings() {
  const database = getDatabase();
  const rows = database.prepare("SELECT id, embedding FROM documents").all();
  return rows.map((row) => {
    if (!row.embedding) return { id: row.id, embedding: null };
    const f64 = new Float64Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 8);
    return { id: row.id, embedding: Array.from(f64) };
  });
}

// src/core/convexApi.ts
import { anyApi } from "convex/server";
var api = anyApi;

// src/core/sync.ts
var client = null;
function getConvexClient() {
  if (client) return client;
  client = new ConvexHttpClient(CONVEX_URL);
  return client;
}
async function authenticateConvexClient() {
  const convex = getConvexClient();
  const keychain = getKeychain();
  const sessionCookie = await keychain.get("session_cookie");
  if (!sessionCookie) {
    throw new Error("Not authenticated \u2014 run `vault auth login` first");
  }
  const response = await fetch(`${CONVEX_SITE_URL}/api/auth/convex/token`, {
    method: "GET",
    headers: {
      cookie: sessionCookie
    }
  });
  if (!response.ok) {
    throw new Error(`Auth token exchange failed (${response.status}). Session may be expired \u2014 run \`vault auth login\` again.`);
  }
  const data = await response.json();
  if (!data.token) {
    throw new Error("No token returned from auth endpoint");
  }
  convex.setAuth(data.token);
  return convex;
}
function decryptBlob(blob, vaultKey) {
  const encryptedDocKey = new Uint8Array(blob.encryptedDocKey);
  const docKey = unwrapDocumentKey(encryptedDocKey, vaultKey);
  const encryptedData = new Uint8Array(blob.encryptedBlob);
  const decryptedData = decrypt(encryptedData, docKey);
  docKey.fill(0);
  const jsonStr = new TextDecoder().decode(decryptedData);
  const metadata = JSON.parse(jsonStr);
  return {
    id: blob.blobId,
    title: metadata.title ?? "Untitled",
    rawText: metadata.rawText,
    type: metadata.type ?? "generic",
    tags: metadata.tags ?? [],
    fields: metadata.fields ?? {},
    organizations: metadata.organizations,
    mentions: metadata.mentions,
    overview: metadata.overview,
    embedding: metadata.embedding,
    encryptedDocKey,
    mimeType: metadata.mimeType,
    storageId: metadata.storageId,
    encryptedStorageId: metadata.encryptedStorageId,
    fileEncrypted: metadata.encryptedStorageId ? 1 : 0,
    owner: metadata.owner,
    originalOwner: metadata.originalOwner,
    addedBy: blob.addedBy,
    imageUrl: metadata.imageUrl,
    dateAdded: metadata.dateAdded,
    status: "ready",
    vaultId: metadata.vaultId,
    createdAt: metadata.createdAt ?? blob.updatedAt,
    updatedAt: blob.updatedAt,
    syncStatus: "synced"
  };
}
async function syncFull(vaultKey, vaultId, onProgress) {
  const convex = await authenticateConvexClient();
  onProgress?.({ total: 0, current: 0, phase: "downloading" });
  let blobs;
  if (vaultId) {
    blobs = await convex.query(api.encryptedSync.getAllBlobsByVault, { vaultId });
  } else {
    blobs = await convex.query(api.encryptedSync.getAllBlobs, {});
  }
  const total = blobs.length;
  let count = 0;
  let skipped = 0;
  const failures = [];
  const database = getDatabase();
  const transaction = database.transaction(() => {
    for (const blob of blobs) {
      try {
        onProgress?.({ total, current: count, phase: "decrypting" });
        const doc = decryptBlob(blob, vaultKey);
        upsertDocument(doc);
        count++;
        onProgress?.({ total, current: count, phase: "saving" });
      } catch (err) {
        skipped++;
        failures.push({
          blobId: blob.blobId,
          error: err.message
        });
      }
    }
  });
  transaction();
  if (failures.length > 0) {
    const jsonFails = failures.filter((f) => f.error.includes("not valid JSON"));
    const authFails = failures.filter((f) => f.error.includes("authenticate data") || f.error.includes("Unsupported state"));
    const otherFails = failures.filter((f) => !f.error.includes("not valid JSON") && !f.error.includes("authenticate data") && !f.error.includes("Unsupported state"));
    process.stderr.write(`[sync] Skipped ${failures.length} blobs: ${jsonFails.length} non-JSON (avatars), ${authFails.length} auth failures (wrong key), ${otherFails.length} other
`);
  }
  const latestTimestamp = blobs.reduce((max, b) => Math.max(max, b.updatedAt), 0);
  if (latestTimestamp > 0) {
    updateConfig({ lastSyncTimestamp: latestTimestamp });
  }
  return count;
}
async function syncIncremental(vaultKey, vaultId, onProgress) {
  const convex = await authenticateConvexClient();
  const config = loadConfig();
  const since = config.lastSyncTimestamp ?? 0;
  onProgress?.({ total: 0, current: 0, phase: "downloading" });
  let blobs;
  if (vaultId) {
    blobs = await convex.query(api.encryptedSync.getUpdatedSinceByVault, { vaultId, since });
  } else {
    blobs = await convex.query(api.encryptedSync.getUpdatedSince, { since });
  }
  if (blobs.length === 0) {
    return { count: 0, deleted: 0 };
  }
  const total = blobs.length;
  let count = 0;
  let deleted = 0;
  const database = getDatabase();
  const transaction = database.transaction(() => {
    for (const blob of blobs) {
      if (blob.deleted) {
        deleteDocument(blob.blobId);
        deleted++;
        continue;
      }
      try {
        onProgress?.({ total, current: count, phase: "decrypting" });
        const doc = decryptBlob(blob, vaultKey);
        upsertDocument(doc);
        count++;
        onProgress?.({ total, current: count, phase: "saving" });
      } catch {
      }
    }
  });
  transaction();
  const latestTimestamp = blobs.reduce((max, b) => Math.max(max, b.updatedAt), 0);
  if (latestTimestamp > 0) {
    updateConfig({ lastSyncTimestamp: latestTimestamp });
  }
  return { count, deleted };
}
async function fetchAndStoreVaultMeta(vaultId) {
  const convex = await authenticateConvexClient();
  const keychain = getKeychain();
  let meta;
  if (vaultId) {
    meta = await convex.query(api.vaultMeta.getForVault, { vaultId });
  } else {
    meta = await convex.query(api.vaultMeta.get, {});
  }
  if (!meta) {
    throw new Error("Vault metadata not found on server");
  }
  const { bytesToBase64: bytesToBase644 } = await Promise.resolve().then(() => (init_crypto(), crypto_exports));
  await keychain.set("salt", bytesToBase644(new Uint8Array(meta.salt)));
  await keychain.set("wrapped_vault_key", bytesToBase644(new Uint8Array(meta.wrappedVaultKey)));
  if (meta.vaultId) {
    updateConfig({ vaultId: meta.vaultId });
  }
}

// src/cli/commands/unlock.ts
import { createInterface } from "readline";
async function promptPassword(message) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr
    });
    if (process.stdin.isTTY) {
      process.stderr.write(message);
      process.stdin.setRawMode(true);
      let password = "";
      process.stdin.on("data", function onData(data) {
        const char = data.toString();
        if (char === "\n" || char === "\r" || char === "") {
          process.stdin.setRawMode(false);
          process.stdin.removeListener("data", onData);
          process.stderr.write("\n");
          rl.close();
          resolve(password);
        } else if (char === "") {
          process.stdin.setRawMode(false);
          process.exit(1);
        } else if (char === "\x7F" || char === "\b") {
          password = password.slice(0, -1);
        } else {
          password += char;
        }
      });
    } else {
      rl.question(message, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}
function registerUnlockCommands(program2) {
  program2.command("unlock").description("Unlock the vault with your master password").option("--fetch-meta", "Fetch vault metadata from server before unlocking").action(async (opts) => {
    const isJson = shouldOutputJson(program2.opts());
    if (isVaultUnlocked()) {
      if (isJson) {
        output({ status: "already_unlocked" });
      } else {
        console.log("Vault is already unlocked.");
      }
      return;
    }
    if (opts.fetchMeta) {
      const config = loadConfig();
      try {
        await fetchAndStoreVaultMeta(config.vaultId);
        if (!isJson) console.log("Vault metadata fetched from server.");
      } catch (err) {
        if (!isJson) console.error("Failed to fetch vault metadata:", err.message);
        process.exit(1);
      }
    }
    let password = process.env.VAULT_MASTER_PASSWORD;
    if (!password) {
      if (!process.stdin.isTTY) {
        if (isJson) {
          output({ error: "VAULT_MASTER_PASSWORD environment variable required for non-interactive use" });
        } else {
          console.error("Set VAULT_MASTER_PASSWORD environment variable for non-interactive use.");
        }
        process.exit(1);
      }
      password = await promptPassword("Master password: ");
    }
    try {
      const startTime = Date.now();
      await unlockVault(password);
      const elapsed = Date.now() - startTime;
      openDatabase(program2.opts().db);
      if (isJson) {
        output({ status: "unlocked", derivationTimeMs: elapsed });
      } else {
        console.log(`Vault unlocked. (key derivation: ${elapsed}ms)`);
      }
    } catch (err) {
      const message = err.message;
      if (message.includes("Unsupported state") || message.includes("auth tag")) {
        if (isJson) {
          output({ error: "Wrong master password" });
        } else {
          console.error("Wrong master password.");
        }
      } else {
        if (isJson) {
          output({ error: message });
        } else {
          console.error("Failed to unlock:", message);
        }
      }
      process.exit(1);
    }
  });
  program2.command("lock").description("Lock the vault and zero keys from memory").action(() => {
    lockVault();
    if (shouldOutputJson(program2.opts())) {
      output({ status: "locked" });
    } else {
      console.log("Vault locked.");
    }
  });
}

// src/cli/commands/sync.ts
function registerSyncCommands(program2) {
  program2.command("sync").description("Sync encrypted documents from Convex to local SQLite").option("--full", "Force full sync (re-download all documents)").option("--status", "Show sync status without syncing").action(async (opts) => {
    const isJson = shouldOutputJson(program2.opts());
    if (opts.status) {
      const config2 = loadConfig();
      const docCount = isVaultUnlocked() ? getDocumentCount() : "unknown (vault locked)";
      const status = {
        lastSync: config2.lastSyncTimestamp ? new Date(config2.lastSyncTimestamp).toISOString() : null,
        localDocuments: docCount,
        vaultId: config2.vaultId ?? null
      };
      if (isJson) {
        output(status);
      } else {
        console.log(`  Last sync:         ${status.lastSync ?? "never"}`);
        console.log(`  Local documents:   ${docCount}`);
        console.log(`  Vault ID:          ${status.vaultId ?? "not set"}`);
      }
      return;
    }
    if (!isVaultUnlocked()) {
      const msg = "Vault is locked \u2014 run `vault unlock` first";
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(msg);
      }
      process.exit(1);
    }
    const { vaultKey } = getVaultKeys();
    const config = loadConfig();
    try {
      await fetchAndStoreVaultMeta(config.vaultId);
    } catch {
    }
    const startTime = Date.now();
    if (opts.full || !config.lastSyncTimestamp) {
      if (!isJson) process.stderr.write("Syncing all documents...\n");
      const count = await syncFull(vaultKey, config.vaultId, (progress) => {
        if (!isJson && process.stderr.isTTY) {
          process.stderr.write(`\r  ${progress.phase}: ${progress.current}/${progress.total}`);
        }
      });
      const elapsed = Date.now() - startTime;
      if (!isJson && process.stderr.isTTY) process.stderr.write("\n");
      if (isJson) {
        output({ status: "synced", mode: "full", documents: count, timeMs: elapsed });
      } else {
        console.log(`Synced ${count} documents. (${elapsed}ms)`);
      }
    } else {
      if (!isJson) process.stderr.write("Syncing updates...\n");
      const { count, deleted } = await syncIncremental(vaultKey, config.vaultId, (progress) => {
        if (!isJson && process.stderr.isTTY) {
          process.stderr.write(`\r  ${progress.phase}: ${progress.current}/${progress.total}`);
        }
      });
      const elapsed = Date.now() - startTime;
      if (!isJson && process.stderr.isTTY) process.stderr.write("\n");
      if (isJson) {
        output({ status: "synced", mode: "incremental", updated: count, deleted, timeMs: elapsed });
      } else {
        if (count === 0 && deleted === 0) {
          console.log("Already up to date.");
        } else {
          console.log(`Synced ${count} updated, ${deleted} deleted. (${elapsed}ms)`);
        }
      }
    }
  });
}

// src/cli/commands/doc.ts
import fs3 from "fs";
import path3 from "path";
import os2 from "os";
import crypto3 from "crypto";
init_crypto();
function requireUnlocked(isJson) {
  if (!isVaultUnlocked()) {
    const msg = "Vault is locked \u2014 run `vault unlock` first";
    if (isJson) {
      output({ error: msg });
    } else {
      console.error(msg);
    }
    process.exit(1);
  }
}
function registerDocCommands(program2) {
  const doc = program2.command("doc").description("Document operations");
  doc.command("list").description("List all documents").option("--type <type>", "Filter by document type").option("--tags <tags>", "Filter by tags (comma-separated)").option("--limit <n>", "Limit results", "50").option("--offset <n>", "Skip first N results", "0").action((opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    let docs;
    if (opts.type) {
      docs = getDocumentsByType(opts.type);
    } else if (opts.tags) {
      docs = getDocumentsByTags(opts.tags.split(",").map((t) => t.trim()));
    } else {
      docs = getAllDocuments();
    }
    const offset = parseInt(opts.offset);
    const limit = parseInt(opts.limit);
    docs = docs.slice(offset, offset + limit);
    if (isJson) {
      output(docs.map((d) => formatDocument(d)));
    } else {
      if (docs.length === 0) {
        console.log("  No documents found.");
        return;
      }
      for (const doc2 of docs) {
        console.log(prettyDocument(doc2));
        console.log("");
      }
      console.log(`  ${docs.length} document(s)`);
    }
  });
  doc.command("get").description("Get full document metadata by ID").argument("<id>", "Document ID").option("--include-text", "Include raw extracted text").action((id, opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    const document = getDocumentById(id);
    if (!document) {
      if (isJson) {
        output({ error: "Document not found", id });
      } else {
        console.error(`Document not found: ${id}`);
      }
      process.exit(1);
    }
    if (isJson) {
      output(formatDocument(document, opts.includeText));
    } else {
      console.log(prettyDocument(document));
      if (opts.includeText && document.rawText) {
        console.log("\n  --- Raw Text ---");
        console.log(`  ${document.rawText}`);
      }
    }
  });
  doc.command("text").description("Get raw extracted text for a document").argument("<id>", "Document ID").action((id) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    const document = getDocumentById(id);
    if (!document) {
      if (isJson) {
        output({ error: "Document not found", id });
      } else {
        console.error(`Document not found: ${id}`);
      }
      process.exit(1);
    }
    if (isJson) {
      output({ id: document.id, title: document.title, rawText: document.rawText ?? "" });
    } else {
      console.log(document.rawText ?? "(no text extracted)");
    }
  });
  doc.command("fields").description("Get structured fields for a document").argument("<id>", "Document ID").action((id) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    const document = getDocumentById(id);
    if (!document) {
      if (isJson) {
        output({ error: "Document not found", id });
      } else {
        console.error(`Document not found: ${id}`);
      }
      process.exit(1);
    }
    if (isJson) {
      output({ id: document.id, title: document.title, type: document.type, fields: document.fields });
    } else {
      console.log(`  ${document.title} (${document.type})`);
      console.log("");
      for (const [key, value] of Object.entries(document.fields)) {
        if (value != null) console.log(`  ${key}: ${value}`);
      }
    }
  });
  doc.command("types").description("List document types with counts").action(() => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    const typeCounts = getDocumentTypeCounts();
    const total = getDocumentCount();
    if (isJson) {
      output({ types: typeCounts, total });
    } else {
      for (const { type, count } of typeCounts) {
        console.log(`  ${type.padEnd(25)} ${count}`);
      }
      console.log(`  ${"".padEnd(25)} \u2500\u2500`);
      console.log(`  ${"total".padEnd(25)} ${total}`);
    }
  });
  doc.command("download").description("Download the original document file").argument("<id>", "Document ID").option("--output <path>", "Output file path (default: ~/Downloads/<title>.<ext>)").action(async (id, opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    const document = getDocumentById(id);
    if (!document) {
      if (isJson) {
        output({ error: "Document not found", id });
      } else {
        console.error(`Document not found: ${id}`);
      }
      process.exit(1);
    }
    const storageId = document.encryptedStorageId || document.storageId;
    if (!storageId) {
      if (isJson) {
        output({ error: "No file attached to this document", id });
      } else {
        console.error("No file attached to this document.");
      }
      process.exit(1);
    }
    try {
      const convex = await authenticateConvexClient();
      const fileUrl = await convex.query(api.storage.getUrl, { storageId });
      if (!fileUrl) {
        if (isJson) {
          output({ error: "File not found on server" });
        } else {
          console.error("File not found on server.");
        }
        process.exit(1);
      }
      if (!isJson) process.stderr.write("Downloading...\n");
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const rawBytes = new Uint8Array(await response.arrayBuffer());
      let fileBytes;
      if (document.encryptedStorageId && document.encryptedDocKey) {
        if (!isJson) process.stderr.write("Decrypting...\n");
        const { vaultKey } = getVaultKeys();
        const docKey = unwrapDocumentKey(document.encryptedDocKey, vaultKey);
        fileBytes = decrypt(rawBytes, docKey);
        docKey.fill(0);
      } else {
        fileBytes = rawBytes;
      }
      const ext = document.mimeType ? { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[document.mimeType] ?? "bin" : "bin";
      const safeName = (document.title || "document").replace(/[/\\:*?"<>|]/g, "_");
      const outputPath = opts.output || path3.join(os2.homedir(), "Downloads", `${safeName}.${ext}`);
      const dir = path3.dirname(outputPath);
      if (!fs3.existsSync(dir)) fs3.mkdirSync(dir, { recursive: true });
      fs3.writeFileSync(outputPath, fileBytes);
      if (isJson) {
        output({ status: "downloaded", path: outputPath, size: fileBytes.length });
      } else {
        console.log(`Downloaded to: ${outputPath} (${(fileBytes.length / 1024).toFixed(1)} KB)`);
      }
    } catch (err) {
      const msg = err.message;
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(`Download failed: ${msg}`);
      }
      process.exit(1);
    }
  });
  doc.command("upload").description("Upload a document to the vault").argument("<file>", "Path to file (PDF, image, etc.)").action(async (filePath, _opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    const resolvedPath = path3.resolve(filePath);
    if (!fs3.existsSync(resolvedPath)) {
      if (isJson) {
        output({ error: "File not found", path: resolvedPath });
      } else {
        console.error(`File not found: ${resolvedPath}`);
      }
      process.exit(1);
    }
    const fileName = path3.basename(resolvedPath);
    const ext = path3.extname(resolvedPath).toLowerCase().slice(1);
    const mimeType = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic"
    }[ext] ?? "application/octet-stream";
    try {
      const fileBuffer = fs3.readFileSync(resolvedPath);
      const fileBytes = new Uint8Array(fileBuffer);
      const hash = crypto3.createHash("sha256").update(fileBytes).digest("hex");
      const docId = hash;
      if (!isJson) process.stderr.write("Uploading to server...\n");
      const convex = await authenticateConvexClient();
      const uploadUrl = await convex.mutation(api.storage.generateUploadUrl, {});
      const uploadResp = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: fileBytes
      });
      const { storageId } = await uploadResp.json();
      if (!isJson) process.stderr.write("Analyzing with Gemini...\n");
      const extracted = await convex.action(api.proxy.processFile, {
        storageId,
        mimeType,
        fileName
      });
      const persistedStorageId = extracted.storageId || storageId;
      if (!extracted.embedding || !Array.isArray(extracted.embedding) || extracted.embedding.length === 0) {
        try {
          const combinedText = [
            extracted.title || fileName,
            extracted.type,
            ...extracted.tags || [],
            ...extracted.mentions || [],
            JSON.stringify(extracted.fields || {})
          ].join(" ");
          const embedding = await convex.action(api.search.embedQuery, { query: combinedText });
          if (embedding && embedding.length > 0) {
            extracted.embedding = embedding;
          }
        } catch {
        }
      }
      if (!isJson) process.stderr.write("Encrypting...\n");
      const { vaultKey } = getVaultKeys();
      const docKey = generateDocumentKey();
      const encryptedFileBytes = encrypt(fileBytes, docKey);
      const encUploadUrl = await convex.mutation(api.storage.generateUploadUrl, {});
      const encResp = await fetch(encUploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: encryptedFileBytes
      });
      const { storageId: encryptedStorageId } = await encResp.json();
      try {
        await convex.mutation(api.storage.deleteFile, { storageId: persistedStorageId });
      } catch {
      }
      const wrappedDocKey = wrapDocumentKey(docKey, vaultKey);
      const now = Date.now();
      const localDoc = {
        id: docId,
        title: extracted.title || fileName,
        rawText: extracted.rawText || "",
        type: extracted.type || "generic",
        tags: extracted.tags || [],
        fields: extracted.fields || {},
        organizations: extracted.organizations || [],
        mentions: extracted.mentions || [],
        embedding: extracted.embedding || void 0,
        owner: extracted.owner || "Unknown",
        mimeType,
        encryptedStorageId,
        encryptedDocKey: wrappedDocKey,
        dateAdded: (/* @__PURE__ */ new Date()).toISOString(),
        status: "ready",
        createdAt: now,
        updatedAt: now,
        syncStatus: "synced"
      };
      upsertDocument(localDoc);
      const config = loadConfig();
      const docContent = JSON.stringify({
        title: localDoc.title,
        rawText: localDoc.rawText,
        type: localDoc.type,
        tags: localDoc.tags,
        fields: localDoc.fields,
        organizations: localDoc.organizations,
        mentions: localDoc.mentions,
        owner: localDoc.owner,
        embedding: extracted.embedding || null,
        mimeType,
        fileName,
        fileHash: hash,
        encryptedStorageId,
        dateAdded: localDoc.dateAdded
      });
      const encryptedBlob = encrypt(new TextEncoder().encode(docContent), docKey);
      const blobBuffer = new ArrayBuffer(encryptedBlob.byteLength);
      new Uint8Array(blobBuffer).set(encryptedBlob);
      const keyBuffer = new ArrayBuffer(wrappedDocKey.byteLength);
      new Uint8Array(keyBuffer).set(new Uint8Array(wrappedDocKey));
      const vaultId = config.vaultId;
      if (vaultId) {
        await convex.mutation(api.encryptedSync.upsertBlobByVault, {
          vaultId,
          blobId: docId,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length
        });
      } else {
        await convex.mutation(api.encryptedSync.upsertBlob, {
          blobId: docId,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length
        });
      }
      docKey.fill(0);
      if (isJson) {
        output({
          status: "uploaded",
          id: docId,
          title: localDoc.title,
          type: localDoc.type,
          tags: localDoc.tags,
          owner: localDoc.owner,
          hasEmbedding: !!(extracted.embedding && extracted.embedding.length > 0)
        });
      } else {
        console.log(`Uploaded: ${localDoc.title}`);
        console.log(`  ID:    ${docId}`);
        console.log(`  Type:  ${localDoc.type}`);
        console.log(`  Tags:  ${localDoc.tags.join(", ")}`);
        console.log(`  Owner: ${localDoc.owner}`);
      }
    } catch (err) {
      const msg = err.message;
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(`Upload failed: ${msg}`);
      }
      process.exit(1);
    }
  });
}

// src/shared/vectorSearch.ts
var DIMS = 3072;
var index = null;
function buildVectorIndex(docs) {
  const docsWithEmbeddings = docs.filter(
    (d) => d.embedding && d.embedding.length === DIMS
  );
  const count = docsWithEmbeddings.length;
  if (count === 0) {
    index = null;
    return;
  }
  const ids = [];
  const vectors = new Float32Array(count * DIMS);
  const norms = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const doc = docsWithEmbeddings[i];
    ids.push(doc.id);
    const emb = doc.embedding;
    let normSq = 0;
    for (let j = 0; j < DIMS; j++) {
      const val = emb[j];
      vectors[i * DIMS + j] = val;
      normSq += val * val;
    }
    norms[i] = Math.sqrt(normSq);
  }
  index = { ids, vectors, norms, count };
}
function searchVectors(queryEmbedding, topK = 10) {
  if (!index || queryEmbedding.length !== DIMS) return [];
  let queryNormSq = 0;
  for (let j = 0; j < DIMS; j++) {
    queryNormSq += queryEmbedding[j] * queryEmbedding[j];
  }
  const queryNorm = Math.sqrt(queryNormSq);
  if (queryNorm === 0) return [];
  const scores = [];
  for (let i = 0; i < index.count; i++) {
    const docNorm = index.norms[i];
    if (docNorm === 0) continue;
    let dot = 0;
    const offset = i * DIMS;
    for (let j = 0; j < DIMS; j++) {
      dot += queryEmbedding[j] * index.vectors[offset + j];
    }
    const score = dot / (queryNorm * docNorm);
    scores.push({ id: index.ids[i], score });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}

// src/cli/commands/search.ts
var vectorIndexBuilt = false;
function registerSearchCommands(program2) {
  program2.command("search").description("Search documents (hybrid FTS + vector)").argument("<query>", "Search query (use quotes for multi-word)").option("--mode <mode>", "Search mode: fts, vector, hybrid", "hybrid").option("--type <type>", "Filter by document type").option("--tags <tags>", "Filter by tags (comma-separated)").option("--limit <n>", "Max results", "10").option("--threshold <score>", "Min similarity score for vector results", "0.3").action(async (query, opts) => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      const msg = "Vault is locked \u2014 run `vault unlock` first";
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(msg);
      }
      process.exit(1);
    }
    const limit = parseInt(opts.limit);
    const threshold = parseFloat(opts.threshold);
    const startTime = Date.now();
    const results = [];
    const seenIds = /* @__PURE__ */ new Set();
    if (opts.mode === "fts" || opts.mode === "hybrid") {
      const ftsResults = searchDocumentsFTS(query, limit);
      for (const doc of ftsResults) {
        if (seenIds.has(doc.id)) continue;
        if (opts.type && doc.type !== opts.type) continue;
        if (opts.tags) {
          const filterTags = opts.tags.split(",").map((t) => t.trim().toLowerCase());
          if (!filterTags.some((t) => doc.tags.map((tag) => tag.toLowerCase()).includes(t))) continue;
        }
        seenIds.add(doc.id);
        results.push({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          score: 1,
          scoreSource: "fts",
          snippet: doc.rawText?.slice(0, 200),
          tags: doc.tags,
          owner: doc.owner,
          dateAdded: doc.dateAdded
        });
      }
    }
    if (opts.mode === "vector" || opts.mode === "hybrid") {
      if (!vectorIndexBuilt) {
        const docsWithEmbeddings = getDocumentsWithEmbeddings();
        buildVectorIndex(docsWithEmbeddings);
        vectorIndexBuilt = true;
      }
      try {
        const convex = await authenticateConvexClient();
        const queryEmbedding = await convex.action(api.search.embedQuery, { query });
        const vectorResults = searchVectors(queryEmbedding, limit);
        for (const vr of vectorResults) {
          if (vr.score < threshold) continue;
          if (seenIds.has(vr.id)) {
            const existing = results.find((r) => r.id === vr.id);
            if (existing) {
              existing.score = vr.score;
              existing.scoreSource = "hybrid";
            }
            continue;
          }
          const doc = getDocumentById(vr.id);
          if (!doc) continue;
          if (opts.type && doc.type !== opts.type) continue;
          if (opts.tags) {
            const filterTags = opts.tags.split(",").map((t) => t.trim().toLowerCase());
            if (!filterTags.some((t) => doc.tags.map((tag) => tag.toLowerCase()).includes(t))) continue;
          }
          seenIds.add(vr.id);
          results.push({
            id: doc.id,
            title: doc.title,
            type: doc.type,
            score: vr.score,
            scoreSource: "vector",
            snippet: doc.rawText?.slice(0, 200),
            tags: doc.tags,
            owner: doc.owner,
            dateAdded: doc.dateAdded
          });
        }
        results.sort((a, b) => b.score - a.score);
      } catch (err) {
        if (!isJson) {
          process.stderr.write(`[vector search unavailable: ${err.message}]
`);
        }
      }
    }
    const searchTimeMs = Date.now() - startTime;
    const limitedResults = results.slice(0, limit);
    if (isJson) {
      output({
        query,
        mode: opts.mode,
        results: limitedResults,
        totalResults: limitedResults.length,
        searchTimeMs
      });
    } else {
      console.log(prettySearchResults(limitedResults));
      console.log(`
  ${limitedResults.length} result(s) in ${searchTimeMs}ms`);
    }
  });
}

// src/cli/commands/stats.ts
function registerStatsCommand(program2) {
  program2.command("stats").description("Show vault statistics").action(() => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      const msg = "Vault is locked \u2014 run `vault unlock` first";
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(msg);
      }
      process.exit(1);
    }
    const config = loadConfig();
    const docCount = getDocumentCount();
    const typeCounts = getDocumentTypeCounts();
    const stats = {
      totalDocuments: docCount,
      documentTypes: typeCounts,
      lastSync: config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toISOString() : null,
      vaultId: config.vaultId ?? null
    };
    if (isJson) {
      output(stats);
    } else {
      console.log(`  Total documents:   ${docCount}`);
      console.log(`  Document types:    ${typeCounts.length}`);
      console.log(`  Last sync:         ${stats.lastSync ?? "never"}`);
      console.log(`  Vault ID:          ${stats.vaultId ?? "not set"}`);
      if (typeCounts.length > 0) {
        console.log("\n  Top types:");
        for (const { type, count } of typeCounts.slice(0, 10)) {
          console.log(`    ${type.padEnd(25)} ${count}`);
        }
      }
    }
  });
}

// src/cli/index.ts
var program = new Command();
program.name("moivault").description("CLI for Vault \u2014 encrypted document management for agents and humans").version("0.1.0").option("--json", "Force JSON output").option("--pretty", "Force human-readable output").option("--db <path>", "Custom SQLite database path").option("--vault-id <id>", "Target specific vault").option("--verbose", "Enable debug logging").hook("preAction", async (thisCommand, actionCommand) => {
  const commandName = actionCommand.name();
  const skipAutoUnlock = ["auth", "login", "logout", "setup-key", "status", "unlock", "lock"];
  if (skipAutoUnlock.includes(commandName)) return;
  if (!isVaultUnlocked()) {
    let password = process.env.VAULT_MASTER_PASSWORD;
    if (!password) {
      const keychain = getKeychain();
      password = await keychain.get("master_password") ?? void 0;
    }
    if (password) {
      try {
        await unlockVault(password);
        openDatabase(thisCommand.opts().db);
      } catch (err) {
        console.error(`Auto-unlock failed: ${err.message}`);
        process.exit(1);
      }
    }
  }
  if (isVaultUnlocked()) {
    try {
      openDatabase(thisCommand.opts().db);
    } catch {
    }
  }
});
registerAuthCommands(program);
registerUnlockCommands(program);
registerSyncCommands(program);
registerDocCommands(program);
registerSearchCommands(program);
registerStatsCommand(program);
program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
//# sourceMappingURL=index.js.map