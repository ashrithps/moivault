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

// src/core/config.ts
import fs from "fs";
import path from "path";
import os from "os";
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
var CONVEX_URL, CONVEX_SITE_URL, CONFIG_DIR, CONFIG_FILE, DEFAULT_DB_PATH;
var init_config = __esm({
  "src/core/config.ts"() {
    "use strict";
    CONVEX_URL = "https://perfect-mallard-90.convex.cloud";
    CONVEX_SITE_URL = "https://perfect-mallard-90.convex.site";
    CONFIG_DIR = path.join(os.homedir(), ".vault-cli");
    CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
    DEFAULT_DB_PATH = path.join(CONFIG_DIR, "vault.db");
  }
});

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

// src/core/database.ts
var database_exports = {};
__export(database_exports, {
  closeDatabase: () => closeDatabase,
  deleteChunksByDocId: () => deleteChunksByDocId,
  deleteDocument: () => deleteDocument,
  getAllDocuments: () => getAllDocuments,
  getChunkCount: () => getChunkCount,
  getChunkTextsById: () => getChunkTextsById,
  getChunkedDocCount: () => getChunkedDocCount,
  getChunksByDocId: () => getChunksByDocId,
  getChunksWithEmbeddings: () => getChunksWithEmbeddings,
  getDatabase: () => getDatabase,
  getDocumentById: () => getDocumentById,
  getDocumentCount: () => getDocumentCount,
  getDocumentTypeCounts: () => getDocumentTypeCounts,
  getDocumentsByTags: () => getDocumentsByTags,
  getDocumentsByType: () => getDocumentsByType,
  getDocumentsWithEmbeddings: () => getDocumentsWithEmbeddings,
  openDatabase: () => openDatabase,
  searchDocumentsFTS: () => searchDocumentsFTS,
  updateDocumentField: () => updateDocumentField,
  upsertChunks: () => upsertChunks,
  upsertDocument: () => upsertDocument,
  upsertDocuments: () => upsertDocuments
});
import Database from "better-sqlite3";
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
      fileEncrypted INTEGER DEFAULT 0,
      fileAssetProvider TEXT,
      fileAssetKey TEXT,
      fileAssetMimeType TEXT,
      fileAssetSize INTEGER,
      fileAssetVersion INTEGER,
      fileAssetStatus TEXT,
      previewAssetProvider TEXT,
      previewAssetKey TEXT,
      previewAssetMimeType TEXT,
      previewAssetSize INTEGER,
      previewAssetVersion INTEGER,
      previewAssetStatus TEXT
    );
  `);
  const existingCols = db.pragma("table_info(documents)");
  const colNames = new Set(existingCols.map((c) => c.name));
  const r2Cols = [
    "fileAssetProvider TEXT",
    "fileAssetKey TEXT",
    "fileAssetMimeType TEXT",
    "fileAssetSize INTEGER",
    "fileAssetVersion INTEGER",
    "fileAssetStatus TEXT",
    "previewAssetProvider TEXT",
    "previewAssetKey TEXT",
    "previewAssetMimeType TEXT",
    "previewAssetSize INTEGER",
    "previewAssetVersion INTEGER",
    "previewAssetStatus TEXT"
  ];
  for (const col of r2Cols) {
    const name = col.split(" ")[0];
    if (!colNames.has(name)) {
      db.exec(`ALTER TABLE documents ADD COLUMN ${col}`);
    }
  }
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
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
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
    fileAssetProvider: row.fileAssetProvider,
    fileAssetKey: row.fileAssetKey,
    fileAssetMimeType: row.fileAssetMimeType,
    fileAssetSize: row.fileAssetSize,
    fileAssetVersion: row.fileAssetVersion,
    fileAssetStatus: row.fileAssetStatus,
    previewAssetProvider: row.previewAssetProvider,
    previewAssetKey: row.previewAssetKey,
    previewAssetMimeType: row.previewAssetMimeType,
    previewAssetSize: row.previewAssetSize,
    previewAssetVersion: row.previewAssetVersion,
    previewAssetStatus: row.previewAssetStatus,
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
    (id, title, rawText, type, tags, fields, organizations, mentions, overview, embedding, encryptedDocKey, mimeType, storageId, encryptedStorageId, fileEncrypted, fileAssetProvider, fileAssetKey, fileAssetMimeType, fileAssetSize, fileAssetVersion, fileAssetStatus, previewAssetProvider, previewAssetKey, previewAssetMimeType, previewAssetSize, previewAssetVersion, previewAssetStatus, owner, originalOwner, addedBy, imageUrl, dateAdded, status, vaultId, createdAt, updatedAt, syncStatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    doc.fileAssetProvider ?? null,
    doc.fileAssetKey ?? null,
    doc.fileAssetMimeType ?? null,
    doc.fileAssetSize ?? null,
    doc.fileAssetVersion ?? null,
    doc.fileAssetStatus ?? null,
    doc.previewAssetProvider ?? null,
    doc.previewAssetKey ?? null,
    doc.previewAssetMimeType ?? null,
    doc.previewAssetSize ?? null,
    doc.previewAssetVersion ?? null,
    doc.previewAssetStatus ?? null,
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
function upsertDocuments(docs) {
  const database = getDatabase();
  const transaction = database.transaction(() => {
    for (const doc of docs) {
      upsertDocument(doc);
    }
  });
  transaction();
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
function updateDocumentField(id, key, value) {
  const doc = getDocumentById(id);
  if (!doc) throw new Error(`Document not found: ${id}`);
  if (key === "title" || key === "rawText" || key === "type" || key === "owner" || key === "originalOwner" || key === "mimeType" || key === "dateAdded") {
    const database2 = getDatabase();
    database2.prepare(`UPDATE documents SET ${key} = ?, updatedAt = ? WHERE id = ?`).run(value, Date.now(), id);
  } else if (key === "tags") {
    const database2 = getDatabase();
    const tags = Array.isArray(value) ? value : value.split(",").map((t) => t.trim());
    database2.prepare("UPDATE documents SET tags = ?, updatedAt = ? WHERE id = ?").run(JSON.stringify(tags), Date.now(), id);
  } else {
    const fields = { ...doc.fields, [key]: value };
    const database2 = getDatabase();
    database2.prepare("UPDATE documents SET fields = ?, updatedAt = ? WHERE id = ?").run(JSON.stringify(fields), Date.now(), id);
  }
  const database = getDatabase();
  const updatedDoc = getDocumentById(id);
  if (updatedDoc) {
    const rowInfo = database.prepare("SELECT rowid FROM documents WHERE id = ?").get(id);
    if (rowInfo) {
      try {
        database.prepare("DELETE FROM documents_fts WHERE rowid = ?").run(rowInfo.rowid);
        database.prepare(`
          INSERT INTO documents_fts (rowid, title, rawText, tags, type, owner, originalOwner, mentions, organizations, fieldsText)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          rowInfo.rowid,
          updatedDoc.title ?? "",
          updatedDoc.rawText ?? "",
          JSON.stringify(updatedDoc.tags ?? []),
          updatedDoc.type ?? "",
          updatedDoc.owner ?? "",
          updatedDoc.originalOwner ?? "",
          updatedDoc.mentions ? JSON.stringify(updatedDoc.mentions) : "",
          updatedDoc.organizations ? JSON.stringify(updatedDoc.organizations) : "",
          Object.values(updatedDoc.fields).filter(Boolean).join(" ")
        );
      } catch {
      }
    }
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
function upsertChunks(chunks) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO doc_chunks (id, docId, chunkText, embedding, chunkIndex)
    VALUES (?, ?, ?, ?, ?)
  `);
  const transaction = database.transaction(() => {
    for (const chunk of chunks) {
      const embBlob = chunk.embedding ? Buffer.from(new Float64Array(chunk.embedding).buffer) : null;
      stmt.run(chunk.id, chunk.docId, chunk.chunkText, embBlob, chunk.chunkIndex);
    }
  });
  transaction();
}
function deleteChunksByDocId(docId) {
  const database = getDatabase();
  database.prepare("DELETE FROM doc_chunks WHERE docId = ?").run(docId);
}
function getChunksByDocId(docId) {
  const database = getDatabase();
  const rows = database.prepare("SELECT * FROM doc_chunks WHERE docId = ? ORDER BY chunkIndex ASC").all(docId);
  return rows.map(deserializeChunkRow);
}
function getChunkTextsById(ids) {
  const database = getDatabase();
  const map = /* @__PURE__ */ new Map();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(",");
  const rows = database.prepare(`SELECT id, chunkText FROM doc_chunks WHERE id IN (${placeholders})`).all(...ids);
  for (const row of rows) map.set(row.id, row.chunkText);
  return map;
}
function getChunkCount() {
  const database = getDatabase();
  return database.prepare("SELECT COUNT(*) as c FROM doc_chunks").get().c;
}
function getChunkedDocCount() {
  const database = getDatabase();
  return database.prepare("SELECT COUNT(DISTINCT docId) as c FROM doc_chunks").get().c;
}
function getChunksWithEmbeddings() {
  const database = getDatabase();
  const rows = database.prepare("SELECT id, docId, embedding FROM doc_chunks WHERE embedding IS NOT NULL AND length(embedding) > 100").all();
  return rows.map((row) => {
    const f64 = new Float64Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 8);
    return { id: row.id, docId: row.docId, embedding: Array.from(f64) };
  });
}
function deserializeChunkRow(row) {
  let embedding;
  if (row.embedding && row.embedding instanceof Buffer && row.embedding.length > 0) {
    const f64 = new Float64Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 8);
    embedding = Array.from(f64);
  }
  return {
    id: row.id,
    docId: row.docId,
    chunkText: row.chunkText,
    embedding,
    chunkIndex: row.chunkIndex
  };
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
var db;
var init_database = __esm({
  "src/core/database.ts"() {
    "use strict";
    init_config();
    db = null;
  }
});

// src/cli/index.ts
import { Command } from "commander";

// src/cli/commands/auth.ts
import http from "http";

// src/core/keychain.ts
init_config();
import fs2 from "fs";
import path2 from "path";
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

// src/cli/commands/auth.ts
init_config();

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
  result.hasFile = !!(doc.fileAssetKey || doc.storageId || doc.encryptedStorageId);
  result.updatedAt = doc.updatedAt;
  return result;
}
function shortId(id) {
  return id.slice(0, 8);
}
function prettyDocument(doc) {
  const lines = [];
  lines.push(`  \x1B[1m${doc.title}\x1B[0m`);
  lines.push(`  \x1B[2mID: ${shortId(doc.id)}\x1B[0m  \x1B[36m${doc.type}\x1B[0m  Owner: ${doc.owner ?? "\u2014"}`);
  if (doc.tags.length) lines.push(`  Tags: \x1B[33m${doc.tags.join(", ")}\x1B[0m`);
  if (doc.dateAdded) lines.push(`  Added: ${new Date(doc.dateAdded).toLocaleDateString()}`);
  const hasFile = !!(doc.fileAssetKey || doc.storageId || doc.encryptedStorageId);
  lines.push(`  File: ${hasFile ? "\x1B[32m\u2713\x1B[0m" : "\x1B[2m\u2014\x1B[0m"}`);
  if (doc.fields && Object.keys(doc.fields).length > 0) {
    for (const [key, value] of Object.entries(doc.fields)) {
      if (value != null && value !== "") lines.push(`  \x1B[2m${key}:\x1B[0m ${value}`);
    }
  }
  return lines.join("\n");
}
function prettyDocList(docs) {
  if (docs.length === 0) return "  No documents found.";
  return docs.map((doc, i) => {
    const hasFile = !!(doc.fileAssetKey || doc.storageId || doc.encryptedStorageId);
    const file = hasFile ? "\x1B[32m\u25CF\x1B[0m" : "\x1B[2m\u25CB\x1B[0m";
    const date = doc.dateAdded ? new Date(doc.dateAdded).toLocaleDateString() : "";
    return `  ${file} \x1B[2m${shortId(doc.id)}\x1B[0m  \x1B[1m${doc.title}\x1B[0m
    \x1B[36m${doc.type}\x1B[0m  ${doc.owner ?? ""}  ${date}  \x1B[33m${doc.tags.slice(0, 3).join(", ")}\x1B[0m`;
  }).join("\n\n");
}
function prettySearchResults(results) {
  if (results.length === 0) return "  No results found.";
  return results.map((r, i) => {
    const lines = [
      `  ${i + 1}. \x1B[1m${r.title}\x1B[0m  \x1B[2m${shortId(r.id)}\x1B[0m`,
      `     \x1B[36m${r.type}\x1B[0m  Score: ${r.score.toFixed(3)} (${r.scoreSource})`
    ];
    if (r.snippet) lines.push(`     \x1B[2m${r.snippet.slice(0, 120)}...\x1B[0m`);
    if (r.tags.length) lines.push(`     Tags: \x1B[33m${r.tags.join(", ")}\x1B[0m`);
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
init_database();
init_config();

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
    // R2 asset refs come from top-level blob columns (not encrypted payload)
    fileAssetProvider: blob.fileAssetProvider,
    fileAssetKey: blob.fileAssetKey,
    fileAssetMimeType: blob.fileAssetMimeType,
    fileAssetSize: blob.fileAssetSize,
    fileAssetVersion: blob.fileAssetVersion,
    fileAssetStatus: blob.fileAssetStatus,
    previewAssetProvider: blob.previewAssetProvider,
    previewAssetKey: blob.previewAssetKey,
    previewAssetMimeType: blob.previewAssetMimeType,
    previewAssetSize: blob.previewAssetSize,
    previewAssetVersion: blob.previewAssetVersion,
    previewAssetStatus: blob.previewAssetStatus,
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
init_database();
init_config();
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
init_config();
init_database();
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
init_database();
import fs3 from "fs";
import path3 from "path";
import os2 from "os";
import crypto3 from "crypto";
init_crypto();
init_database();
init_config();
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
      console.log(prettyDocList(docs));
      if (docs.length > 0) console.log(`
  \x1B[2m${docs.length} document(s)\x1B[0m`);
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
  doc.command("edit").description("Edit a document field (syncs to server)").argument("<id>", "Document ID").argument("<field>", "Field to edit (title, tags, type, owner, or any custom field)").argument("<value>", "New value (for tags: comma-separated)").action(async (id, field, value) => {
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
    try {
      updateDocumentField(id, field, field === "tags" ? value.split(",").map((t) => t.trim()) : value);
      const updatedDoc = getDocumentById(id);
      const { vaultKey } = getVaultKeys();
      let docKey;
      if (updatedDoc.encryptedDocKey) {
        docKey = unwrapDocumentKey(updatedDoc.encryptedDocKey, vaultKey);
      } else {
        docKey = generateDocumentKey();
      }
      const config = loadConfig();
      const docContent = JSON.stringify({
        title: updatedDoc.title,
        rawText: updatedDoc.rawText,
        type: updatedDoc.type,
        tags: updatedDoc.tags,
        fields: updatedDoc.fields,
        organizations: updatedDoc.organizations,
        mentions: updatedDoc.mentions,
        owner: updatedDoc.owner,
        embedding: updatedDoc.embedding ? Array.from(updatedDoc.embedding) : null,
        mimeType: updatedDoc.mimeType,
        encryptedStorageId: updatedDoc.encryptedStorageId,
        storageId: updatedDoc.encryptedStorageId ? void 0 : updatedDoc.storageId,
        dateAdded: updatedDoc.dateAdded
      });
      const encryptedBlob = encrypt(new TextEncoder().encode(docContent), docKey);
      const wrappedDocKey = wrapDocumentKey(docKey, vaultKey);
      const blobBuffer = new ArrayBuffer(encryptedBlob.byteLength);
      new Uint8Array(blobBuffer).set(encryptedBlob);
      const keyBuffer = new ArrayBuffer(wrappedDocKey.byteLength);
      new Uint8Array(keyBuffer).set(new Uint8Array(wrappedDocKey));
      const convex = await authenticateConvexClient();
      const vaultId = config.vaultId;
      if (vaultId) {
        await convex.mutation(api.encryptedSync.upsertBlobByVault, {
          vaultId,
          blobId: id,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length
        });
      } else {
        await convex.mutation(api.encryptedSync.upsertBlob, {
          blobId: id,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length
        });
      }
      upsertDocument({ ...updatedDoc, encryptedDocKey: wrappedDocKey, syncStatus: "synced" });
      docKey.fill(0);
      if (isJson) {
        output({ status: "updated", id, field, value });
      } else {
        console.log(`Updated ${field} \u2192 ${value}`);
      }
    } catch (err) {
      const msg = err.message;
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(`Edit failed: ${msg}`);
      }
      process.exit(1);
    }
  });
  doc.command("delete").description("Delete a document from vault (local + server)").argument("<id>", "Document ID").option("--force", "Skip confirmation").action(async (id, opts) => {
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
    if (!opts.force && !isJson && process.stdin.isTTY) {
      const readline = await import("readline");
      const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
      const answer = await new Promise((resolve) => {
        rl.question(`  Delete "${document.title}"? (y/N) `, resolve);
      });
      rl.close();
      if (answer.toLowerCase() !== "y") {
        console.log("  Cancelled.");
        return;
      }
    }
    try {
      const convex = await authenticateConvexClient();
      await convex.mutation(api.encryptedSync.deleteBlob, { blobId: id });
      deleteDocument(id);
      if (isJson) {
        output({ status: "deleted", id, title: document.title });
      } else {
        console.log(`Deleted: ${document.title}`);
      }
    } catch (err) {
      const msg = err.message;
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(`Delete failed: ${msg}`);
      }
      process.exit(1);
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
    const hasR2 = !!document.fileAssetKey;
    const storageId = document.encryptedStorageId || document.storageId;
    if (!hasR2 && !storageId) {
      if (isJson) {
        output({ error: "No file attached to this document", id });
      } else {
        console.error("No file attached to this document.");
      }
      process.exit(1);
    }
    try {
      const convex = await authenticateConvexClient();
      const config = loadConfig();
      let rawBytes;
      if (hasR2) {
        if (!isJson) process.stderr.write("Downloading from R2...\n");
        const downloadInfo = await convex.action(api.r2Assets.requestFileDownloadUrl, {
          blobId: document.id,
          vaultId: config.vaultId
        });
        const response = await fetch(downloadInfo.url);
        if (!response.ok) throw new Error(`R2 download failed: ${response.status}`);
        rawBytes = new Uint8Array(await response.arrayBuffer());
      } else {
        if (!isJson) process.stderr.write("Downloading...\n");
        const fileUrl = await convex.query(api.storage.getUrl, { storageId });
        if (!fileUrl) {
          if (isJson) {
            output({ error: "File not found on server" });
          } else {
            console.error("File not found on server.");
          }
          process.exit(1);
        }
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);
        rawBytes = new Uint8Array(await response.arrayBuffer());
      }
      let fileBytes;
      if ((hasR2 || document.encryptedStorageId) && document.encryptedDocKey) {
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
  doc.command("upload").description("Upload one or more documents to the vault").argument("<files...>", "Path(s) to file(s) \u2014 PDF, image, etc.").action(async (filePaths, _opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    const results = [];
    for (const filePath of filePaths) {
      const resolvedPath = path3.resolve(filePath);
      if (!fs3.existsSync(resolvedPath)) {
        if (isJson) {
          results.push({ error: "File not found", path: resolvedPath });
          continue;
        } else {
          console.error(`File not found: ${resolvedPath}`);
          continue;
        }
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
        try {
          await convex.mutation(api.storage.deleteFile, { storageId: persistedStorageId });
        } catch {
        }
        const wrappedDocKey = wrapDocumentKey(docKey, vaultKey);
        const now = Date.now();
        const config = loadConfig();
        const vaultId = config.vaultId;
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
          encryptedDocKey: wrappedDocKey,
          dateAdded: (/* @__PURE__ */ new Date()).toISOString(),
          status: "ready",
          createdAt: now,
          updatedAt: now,
          syncStatus: "synced"
        };
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
          dateAdded: localDoc.dateAdded
        });
        const encryptedBlob = encrypt(new TextEncoder().encode(docContent), docKey);
        const blobBuffer = new ArrayBuffer(encryptedBlob.byteLength);
        new Uint8Array(blobBuffer).set(encryptedBlob);
        const keyBuffer = new ArrayBuffer(wrappedDocKey.byteLength);
        new Uint8Array(keyBuffer).set(new Uint8Array(wrappedDocKey));
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
        if (!isJson) process.stderr.write("Uploading encrypted file to R2...\n");
        const fileUploadInfo = await convex.action(api.r2Assets.requestFileUploadUrl, {
          blobId: docId,
          vaultId: vaultId ?? void 0,
          mimeType: "application/octet-stream",
          size: encryptedFileBytes.length
        });
        const r2Resp = await fetch(fileUploadInfo.url, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: encryptedFileBytes
        });
        if (!r2Resp.ok) throw new Error(`R2 upload failed: ${r2Resp.status}`);
        await convex.mutation(api.r2Assets.patchFileAssetRef, {
          blobId: docId,
          vaultId: vaultId ?? void 0,
          provider: "r2",
          key: fileUploadInfo.key,
          mimeType,
          size: encryptedFileBytes.length,
          version: 1,
          status: "ready"
        });
        localDoc.fileAssetProvider = "r2";
        localDoc.fileAssetKey = fileUploadInfo.key;
        localDoc.fileAssetMimeType = mimeType;
        localDoc.fileAssetSize = encryptedFileBytes.length;
        localDoc.fileAssetVersion = 1;
        localDoc.fileAssetStatus = "ready";
        upsertDocument(localDoc);
        docKey.fill(0);
        const result = {
          status: "uploaded",
          id: docId,
          title: localDoc.title,
          type: localDoc.type,
          tags: localDoc.tags,
          owner: localDoc.owner,
          hasEmbedding: !!(extracted.embedding && extracted.embedding.length > 0)
        };
        if (isJson) {
          if (filePaths.length === 1) output(result);
          else results.push(result);
        } else {
          console.log(`\x1B[32m\u2713\x1B[0m \x1B[1m${localDoc.title}\x1B[0m`);
          console.log(`  ID: ${docId.slice(0, 8)}  Type: ${localDoc.type}  Owner: ${localDoc.owner}`);
          console.log(`  Tags: ${localDoc.tags.join(", ")}`);
          if (filePaths.length > 1) console.log("");
        }
      } catch (err) {
        const msg = err.message;
        if (isJson) {
          results.push({ error: msg, file: filePath });
        } else {
          console.error(`Upload failed (${path3.basename(filePath)}): ${msg}`);
        }
      }
    }
    if (isJson && filePaths.length > 1) {
      output(results);
    }
  });
}

// src/cli/commands/search.ts
init_database();

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
var chunkIndex = null;
function buildChunkVectorIndex(chunks) {
  const valid = chunks.filter((c) => c.embedding && c.embedding.length === DIMS);
  const count = valid.length;
  if (count === 0) {
    chunkIndex = null;
    return;
  }
  const chunkIds = [];
  const docIds = [];
  const vectors = new Float32Array(count * DIMS);
  const norms = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const chunk = valid[i];
    chunkIds.push(chunk.id);
    docIds.push(chunk.docId);
    const emb = chunk.embedding;
    let normSq = 0;
    for (let j = 0; j < DIMS; j++) {
      const val = emb[j];
      vectors[i * DIMS + j] = val;
      normSq += val * val;
    }
    norms[i] = Math.sqrt(normSq);
  }
  chunkIndex = { chunkIds, docIds, vectors, norms, count };
}
function searchChunkVectors(queryEmbedding, topK = 20) {
  if (!chunkIndex || queryEmbedding.length !== DIMS) return [];
  let queryNormSq = 0;
  for (let j = 0; j < DIMS; j++) {
    queryNormSq += queryEmbedding[j] * queryEmbedding[j];
  }
  const queryNorm = Math.sqrt(queryNormSq);
  if (queryNorm === 0) return [];
  const scores = [];
  for (let i = 0; i < chunkIndex.count; i++) {
    const docNorm = chunkIndex.norms[i];
    if (docNorm === 0) continue;
    let dot = 0;
    const offset = i * DIMS;
    for (let j = 0; j < DIMS; j++) {
      dot += queryEmbedding[j] * chunkIndex.vectors[offset + j];
    }
    const score = dot / (queryNorm * docNorm);
    scores.push({ id: chunkIndex.chunkIds[i], docId: chunkIndex.docIds[i], score });
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
init_database();
init_config();
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

// src/cli/commands/usage.ts
init_database();
function registerUsageCommand(program2) {
  program2.command("usage").description("Show API usage, plan details, and vault statistics").action(async () => {
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
    try {
      const convex = await authenticateConvexClient();
      let subscription = null;
      try {
        subscription = await convex.query(api.subscriptions.getMyUsage, {});
      } catch {
      }
      const docCount = getDocumentCount();
      const typeCounts = getDocumentTypeCounts();
      const result = {
        localDocuments: docCount,
        documentTypes: typeCounts.length
      };
      if (subscription) {
        result.plan = subscription.planLabel ?? subscription.plan ?? "free";
        result.scansUsed = subscription.scansUsed ?? null;
        result.scansLimit = subscription.scansLimit ?? null;
        result.tokensUsed = subscription.tokensUsed ?? null;
        result.tokensLimit = subscription.tokensLimit ?? null;
      }
      if (isJson) {
        output(result);
      } else {
        console.log(`  Documents:   ${docCount}`);
        console.log(`  Types:       ${typeCounts.length}`);
        if (subscription) {
          console.log(`  Plan:        ${result.plan}`);
          if (result.scansUsed != null) console.log(`  Scans:       ${result.scansUsed}/${result.scansLimit ?? "\u221E"}`);
          if (result.tokensUsed != null) console.log(`  Tokens:      ${result.tokensUsed}/${result.tokensLimit ?? "\u221E"}`);
        }
      }
    } catch (err) {
      const msg = err.message;
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(`Usage check failed: ${msg}`);
      }
      process.exit(1);
    }
  });
}

// src/cli/commands/people.ts
init_database();
init_crypto();
init_config();
init_constants();
import crypto4 from "crypto";
var REGISTRY_BLOB_ID = "__people_registry__";
async function fetchRegistry(vaultKey) {
  const convex = await authenticateConvexClient();
  const config = loadConfig();
  let blob;
  try {
    if (config.vaultId) {
      blob = await convex.query(api.encryptedSync.getBlobById, { blobId: REGISTRY_BLOB_ID, vaultId: config.vaultId });
    }
  } catch {
  }
  if (!blob) {
    try {
      blob = await convex.query(api.encryptedSync.getBlobById, { blobId: REGISTRY_BLOB_ID });
    } catch {
    }
  }
  if (!blob) return { people: [] };
  try {
    const encDocKey = new Uint8Array(blob.encryptedDocKey);
    const docKey = unwrapDocumentKey(encDocKey, vaultKey);
    const decrypted = decryptString(new Uint8Array(blob.encryptedBlob), docKey);
    docKey.fill(0);
    return JSON.parse(decrypted);
  } catch {
    return { people: [] };
  }
}
async function syncRegistry(registry, vaultKey) {
  const convex = await authenticateConvexClient();
  const config = loadConfig();
  const docKey = new Uint8Array(crypto4.randomBytes(DOCUMENT_KEY_BYTES));
  const encryptedBlob = encryptString(JSON.stringify(registry), docKey);
  const encryptedDocKey = encrypt(docKey, vaultKey);
  docKey.fill(0);
  const blobBuffer = new ArrayBuffer(encryptedBlob.byteLength);
  new Uint8Array(blobBuffer).set(encryptedBlob);
  const keyBuffer = new ArrayBuffer(encryptedDocKey.byteLength);
  new Uint8Array(keyBuffer).set(encryptedDocKey);
  if (config.vaultId) {
    await convex.mutation(api.encryptedSync.upsertBlobByVault, {
      vaultId: config.vaultId,
      blobId: REGISTRY_BLOB_ID,
      encryptedBlob: blobBuffer,
      encryptedDocKey: keyBuffer,
      blobSize: encryptedBlob.length
    });
  } else {
    await convex.mutation(api.encryptedSync.upsertBlob, {
      blobId: REGISTRY_BLOB_ID,
      encryptedBlob: blobBuffer,
      encryptedDocKey: keyBuffer,
      blobSize: encryptedBlob.length
    });
  }
}
function registerPeopleCommands(program2) {
  const people = program2.command("people").description("People management & merge");
  people.command("list").description("List all people with document counts").action(() => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      if (isJson) {
        output({ error: "Vault is locked" });
      } else {
        console.error("Vault is locked");
      }
      process.exit(1);
    }
    const db2 = getDatabase();
    const owners = db2.prepare(`
        SELECT owner, COUNT(*) as count
        FROM documents
        WHERE owner IS NOT NULL AND owner != 'Unknown' AND id != '__people_registry__'
        GROUP BY owner
        ORDER BY count DESC
      `).all();
    if (isJson) {
      output(owners);
    } else {
      for (const { owner, count } of owners) {
        console.log(`  ${owner.padEnd(40)} ${count} docs`);
      }
      console.log(`
  ${owners.length} people`);
    }
  });
  people.command("docs").description("List documents for a person").argument("<name>", "Person name (partial match)").action((name) => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      if (isJson) {
        output({ error: "Vault is locked" });
      } else {
        console.error("Vault is locked");
      }
      process.exit(1);
    }
    const db2 = getDatabase();
    const docs = db2.prepare(`
        SELECT id, title, type, owner, dateAdded
        FROM documents
        WHERE owner LIKE @pat COLLATE NOCASE AND id != '__people_registry__'
        ORDER BY updatedAt DESC
      `).all({ pat: `%${name}%` });
    if (isJson) {
      output(docs);
    } else {
      if (docs.length === 0) {
        console.log(`  No documents found for "${name}"`);
        return;
      }
      for (const doc of docs) {
        console.log(`  ${doc.title}`);
        console.log(`    Type: ${doc.type}  |  Owner: ${doc.owner}`);
      }
      console.log(`
  ${docs.length} document(s)`);
    }
  });
  people.command("aliases").description("Show the people registry with aliases").action(async () => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      if (isJson) {
        output({ error: "Vault is locked" });
      } else {
        console.error("Vault is locked");
      }
      process.exit(1);
    }
    const { vaultKey } = getVaultKeys();
    const registry = await fetchRegistry(vaultKey);
    if (isJson) {
      output(registry.people.map((p) => ({
        id: p.id,
        name: p.canonicalName,
        aliases: p.aliases
      })));
    } else {
      if (registry.people.length === 0) {
        console.log("  No people in registry.");
        return;
      }
      for (const person of registry.people) {
        console.log(`  ${person.canonicalName}`);
        if (person.aliases.length > 0) {
          console.log(`    Aliases: ${person.aliases.join(", ")}`);
        }
      }
    }
  });
  people.command("merge").description("Merge a name as an alias of another person").argument("<alias>", "Name to merge (will become an alias)").argument("<canonical>", "Canonical name (the primary name)").action(async (alias, canonical) => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      if (isJson) {
        output({ error: "Vault is locked" });
      } else {
        console.error("Vault is locked");
      }
      process.exit(1);
    }
    const { vaultKey } = getVaultKeys();
    const registry = await fetchRegistry(vaultKey);
    let person = registry.people.find(
      (p) => p.canonicalName.toUpperCase() === canonical.toUpperCase()
    );
    if (!person) {
      person = {
        id: `person_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        canonicalName: canonical,
        aliases: []
      };
      registry.people.push(person);
    }
    const normalizedAlias = alias.trim();
    if (!person.aliases.some((a) => a.toUpperCase() === normalizedAlias.toUpperCase()) && person.canonicalName.toUpperCase() !== normalizedAlias.toUpperCase()) {
      person.aliases.push(normalizedAlias);
    }
    await syncRegistry(registry, vaultKey);
    if (isJson) {
      output({ status: "merged", canonical: person.canonicalName, alias: normalizedAlias, totalAliases: person.aliases.length });
    } else {
      console.log(`  Merged: "${normalizedAlias}" \u2192 "${person.canonicalName}"`);
      console.log(`  Aliases: ${person.aliases.join(", ")}`);
    }
  });
  people.command("rename").description("Change the owner name on all docs matching a name").argument("<from>", "Current owner name").argument("<to>", "New owner name").action(async (from, to) => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      if (isJson) {
        output({ error: "Vault is locked" });
      } else {
        console.error("Vault is locked");
      }
      process.exit(1);
    }
    const db2 = getDatabase();
    const result = db2.prepare("UPDATE documents SET owner = @to, updatedAt = @now WHERE owner = @from COLLATE NOCASE").run({ to, from, now: Date.now() });
    if (isJson) {
      output({ status: "renamed", from, to, docsUpdated: result.changes });
    } else {
      console.log(`  Renamed "${from}" \u2192 "${to}" on ${result.changes} document(s)`);
      if (result.changes > 0) {
        console.log("  Note: Run `moivault sync --full` to see changes on phone after next re-push.");
      }
    }
  });
}

// src/cli/commands/chunk.ts
init_database();

// src/shared/chunking.ts
var CHUNK_SIZE = 2e3;
var CHUNK_OVERLAP = 400;
function splitIntoChunks(rawText, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (!rawText || rawText.trim().length === 0) return [];
  if (rawText.length <= chunkSize) return [rawText.trim()];
  const chunks = [];
  const paragraphs = rawText.split(/\n\n+/);
  let currentChunk = "";
  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= chunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + "\n\n" + para;
      } else {
        const sentences = para.match(/[^.!?]+[.!?]+\s*/g) || [para];
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length <= chunkSize) {
            currentChunk += sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
              const overlapText = currentChunk.slice(-overlap);
              currentChunk = overlapText + sentence;
            } else {
              chunks.push(sentence.trim().slice(0, chunkSize));
              currentChunk = "";
            }
          }
        }
      }
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}
function buildStructuredChunk(type, fields, title) {
  const displayName = type.replace(/_/g, " ");
  const parts = [`This is a ${displayName}: "${title}".`];
  for (const [key, value] of Object.entries(fields)) {
    if (value != null && value !== "" && value !== "Unknown" && value !== "N/A") {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      parts.push(`${label}: ${String(value)}.`);
    }
  }
  return parts.join(" ");
}
function chunkDocument(docId, title, type, fields, rawText) {
  const chunks = [];
  const structuredText = buildStructuredChunk(type, fields, title);
  chunks.push({
    id: `chunk_${docId}_0`,
    docId,
    chunkText: structuredText,
    chunkIndex: 0
  });
  if (rawText) {
    const prefix = `[${title} - ${type.replace(/_/g, " ")}] `;
    const rawChunks = splitIntoChunks(rawText);
    for (let i = 0; i < rawChunks.length; i++) {
      chunks.push({
        id: `chunk_${docId}_${i + 1}`,
        docId,
        chunkText: prefix + rawChunks[i],
        chunkIndex: i + 1
      });
    }
  }
  return chunks;
}

// src/cli/commands/chunk.ts
function registerChunkCommands(program2) {
  const chunk = program2.command("chunk").description("Manage chunk index for RAG context retrieval");
  chunk.command("status").description("Show chunk index status").action(() => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      if (isJson) {
        output({ error: "Vault is locked" });
      } else {
        console.error("Vault is locked");
      }
      process.exit(1);
    }
    const totalDocs = getDocumentCount();
    const chunkedDocs = getChunkedDocCount();
    const totalChunks = getChunkCount();
    if (isJson) {
      output({ totalDocs, chunkedDocs, unchunkedDocs: totalDocs - chunkedDocs, totalChunks });
    } else {
      console.log(`  Total documents:   ${totalDocs}`);
      console.log(`  Chunked:           ${chunkedDocs}`);
      console.log(`  Unchunked:         ${totalDocs - chunkedDocs}`);
      console.log(`  Total chunks:      ${totalChunks}`);
    }
  });
  chunk.command("build").description("Chunk all documents and generate embeddings").option("--force", "Re-chunk all documents (including already chunked)").option("--doc <id>", "Chunk a single document").option("--batch-size <n>", "Texts per embedding batch", "10").action(async (opts) => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      if (isJson) {
        output({ error: "Vault is locked" });
      } else {
        console.error("Vault is locked");
      }
      process.exit(1);
    }
    const batchSize = parseInt(opts.batchSize);
    let docs = getAllDocuments().filter((d) => d.id !== "__people_registry__" && d.rawText);
    if (opts.doc) {
      docs = docs.filter((d) => d.id === opts.doc);
      if (docs.length === 0) {
        if (isJson) {
          output({ error: "Document not found or has no text" });
        } else {
          console.error("Document not found or has no text.");
        }
        process.exit(1);
      }
    }
    if (!opts.force && !opts.doc) {
      const chunkedDocIds = /* @__PURE__ */ new Set();
      const allDocs = getAllDocuments();
      const chunkedCount = getChunkedDocCount();
      if (chunkedCount > 0) {
        const db2 = (await Promise.resolve().then(() => (init_database(), database_exports))).getDatabase();
        const rows = db2.prepare("SELECT DISTINCT docId FROM doc_chunks").all();
        for (const row of rows) chunkedDocIds.add(row.docId);
      }
      docs = docs.filter((d) => !chunkedDocIds.has(d.id));
    }
    if (docs.length === 0) {
      if (isJson) {
        output({ status: "up_to_date", chunked: 0 });
      } else {
        console.log("All documents already chunked.");
      }
      return;
    }
    if (!isJson) process.stderr.write(`Chunking ${docs.length} documents...
`);
    let convex;
    try {
      convex = await authenticateConvexClient();
    } catch (err) {
      if (!isJson) process.stderr.write(`[warning] No Convex auth \u2014 chunks will be stored without embeddings
`);
    }
    let totalChunks = 0;
    let docsProcessed = 0;
    for (const doc of docs) {
      if (opts.force || opts.doc) {
        deleteChunksByDocId(doc.id);
      }
      const chunks = chunkDocument(doc.id, doc.title, doc.type, doc.fields, doc.rawText);
      if (convex) {
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          try {
            const embeddings = await convex.action(api.search.embedChunks, {
              texts: batch.map((c) => c.chunkText)
            });
            for (let j = 0; j < batch.length; j++) {
              if (embeddings[j] && embeddings[j].length > 0) {
                batch[j].embedding = embeddings[j];
              }
            }
          } catch {
          }
        }
      }
      upsertChunks(chunks);
      totalChunks += chunks.length;
      docsProcessed++;
      if (!isJson && process.stderr.isTTY) {
        process.stderr.write(`\r  ${docsProcessed}/${docs.length} docs, ${totalChunks} chunks`);
      }
    }
    if (!isJson && process.stderr.isTTY) process.stderr.write("\n");
    if (isJson) {
      output({ status: "built", docsChunked: docsProcessed, totalChunks });
    } else {
      console.log(`Chunked ${docsProcessed} docs into ${totalChunks} chunks.`);
    }
  });
}

// src/cli/commands/context.ts
init_database();
init_database();
function registerContextCommand(program2) {
  program2.command("context").description("Retrieve relevant document context for a query (for agent RAG)").argument("<query>", "Natural language query").option("--limit <n>", "Max documents to return", "5").option("--chunks <n>", "Max chunks per document", "4").option("--include-fields", "Include structured fields in output").option("--type <type>", "Filter by document type").option("--max-tokens <n>", "Approximate token budget (chars/4)").action(async (query, opts) => {
    if (!isVaultUnlocked()) {
      console.log(JSON.stringify({ error: "Vault is locked" }));
      process.exit(1);
    }
    const startTime = Date.now();
    const limit = parseInt(opts.limit);
    const maxChunksPerDoc = parseInt(opts.chunks);
    const maxTokens = opts.maxTokens ? parseInt(opts.maxTokens) : void 0;
    const contextDocs = [];
    const seenDocIds = /* @__PURE__ */ new Set();
    const hasChunks = getChunkCount() > 0;
    let chunksSearched = 0;
    if (hasChunks) {
      const chunksWithEmbeddings = getChunksWithEmbeddings();
      chunksSearched = chunksWithEmbeddings.length;
      buildChunkVectorIndex(chunksWithEmbeddings);
      try {
        const convex = await authenticateConvexClient();
        const queryEmbedding = await convex.action(api.search.embedQuery, { query });
        const chunkResults = searchChunkVectors(queryEmbedding, maxChunksPerDoc * limit);
        const chunksByDoc = /* @__PURE__ */ new Map();
        for (const cr of chunkResults) {
          if (!chunksByDoc.has(cr.docId)) chunksByDoc.set(cr.docId, []);
          chunksByDoc.get(cr.docId).push({ id: cr.id, score: cr.score });
        }
        for (const [docId, docChunks] of chunksByDoc) {
          if (seenDocIds.has(docId)) continue;
          if (opts.type) {
            const doc2 = getDocumentById(docId);
            if (doc2 && doc2.type !== opts.type) continue;
          }
          const doc = getDocumentById(docId);
          if (!doc) continue;
          const chunkIds = docChunks.slice(0, maxChunksPerDoc).map((c) => c.id);
          const chunkTexts = getChunkTextsById(chunkIds);
          const chunks = chunkIds.map((id) => chunkTexts.get(id) || "").filter(Boolean);
          const maxScore = Math.max(...docChunks.map((c) => c.score));
          const ctxDoc = {
            docId,
            title: doc.title,
            type: doc.type,
            owner: doc.owner,
            score: maxScore,
            scoreSource: "vector",
            chunks
          };
          if (opts.includeFields) ctxDoc.fields = doc.fields;
          seenDocIds.add(docId);
          contextDocs.push(ctxDoc);
          if (contextDocs.length >= limit) break;
        }
      } catch {
      }
    }
    const ftsResults = searchDocumentsFTS(query, limit);
    for (const doc of ftsResults) {
      if (seenDocIds.has(doc.id)) {
        const existing = contextDocs.find((c) => c.docId === doc.id);
        if (existing) existing.scoreSource = "hybrid";
        continue;
      }
      if (opts.type && doc.type !== opts.type) continue;
      let chunks;
      if (hasChunks) {
        const docChunks = getChunksByDocId(doc.id);
        chunks = docChunks.slice(0, maxChunksPerDoc).map((c) => c.chunkText);
      } else {
        chunks = doc.rawText ? [doc.rawText.slice(0, 4e3)] : [];
      }
      const ctxDoc = {
        docId: doc.id,
        title: doc.title,
        type: doc.type,
        owner: doc.owner,
        score: 1,
        scoreSource: "fts",
        chunks
      };
      if (opts.includeFields) ctxDoc.fields = doc.fields;
      seenDocIds.add(doc.id);
      contextDocs.push(ctxDoc);
      if (contextDocs.length >= limit) break;
    }
    if (!hasChunks && contextDocs.length < limit) {
      try {
        const docsWithEmb = getDocumentsWithEmbeddings();
        buildVectorIndex(docsWithEmb);
        const convex = await authenticateConvexClient();
        const queryEmbedding = await convex.action(api.search.embedQuery, { query });
        const vectorResults = searchVectors(queryEmbedding, limit);
        for (const vr of vectorResults) {
          if (seenDocIds.has(vr.id) || vr.score < 0.3) continue;
          const doc = getDocumentById(vr.id);
          if (!doc) continue;
          if (opts.type && doc.type !== opts.type) continue;
          const ctxDoc = {
            docId: doc.id,
            title: doc.title,
            type: doc.type,
            owner: doc.owner,
            score: vr.score,
            scoreSource: "vector",
            chunks: doc.rawText ? [doc.rawText.slice(0, 4e3)] : []
          };
          if (opts.includeFields) ctxDoc.fields = doc.fields;
          seenDocIds.add(doc.id);
          contextDocs.push(ctxDoc);
          if (contextDocs.length >= limit) break;
        }
      } catch {
      }
    }
    contextDocs.sort((a, b) => b.score - a.score);
    let finalDocs = contextDocs.slice(0, limit);
    if (maxTokens) {
      const charBudget = maxTokens * 4;
      let totalChars = 0;
      finalDocs = finalDocs.filter((doc) => {
        const docChars = doc.chunks.reduce((sum, c) => sum + c.length, 0);
        if (totalChars + docChars > charBudget) return false;
        totalChars += docChars;
        return true;
      });
    }
    const people = [...new Set(finalDocs.map((d) => d.owner).filter(Boolean))];
    const result = {
      query,
      context: finalDocs,
      people,
      stats: {
        docsSearched: getAllDocuments().length,
        chunksSearched,
        retrievalTimeMs: Date.now() - startTime,
        hasChunkIndex: hasChunks
      }
    };
    console.log(JSON.stringify(result, null, 2));
  });
}

// src/mcp/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
init_database();
init_config();
init_database();
init_crypto();
var hasSyncedThisSession = false;
async function ensureUnlocked() {
  if (isVaultUnlocked()) return;
  let password = process.env.VAULT_MASTER_PASSWORD;
  if (!password) {
    const keychain = getKeychain();
    password = await keychain.get("master_password") ?? void 0;
  }
  if (!password) throw new Error("Vault is locked \u2014 set VAULT_MASTER_PASSWORD or run moivault auth save-password");
  await unlockVault(password);
  openDatabase();
}
async function ensureSynced() {
  await ensureUnlocked();
  if (hasSyncedThisSession) return;
  try {
    const { vaultKey } = getVaultKeys();
    const config = loadConfig();
    await syncIncremental(vaultKey, config.vaultId);
    hasSyncedThisSession = true;
  } catch {
    hasSyncedThisSession = true;
  }
}
async function startMcpServer() {
  const server = new McpServer({
    name: "moivault",
    version: "0.2.0"
  });
  server.tool(
    "vault_search",
    "Search documents in the vault using full-text and/or semantic vector search",
    {
      query: z.string().describe("Search query"),
      mode: z.enum(["hybrid", "fts", "vector"]).default("hybrid").describe("Search mode"),
      type: z.string().optional().describe("Filter by document type"),
      limit: z.number().default(10).describe("Max results")
    },
    async ({ query, mode, type, limit }) => {
      await ensureSynced();
      const results = [];
      const seenIds = /* @__PURE__ */ new Set();
      if (mode === "fts" || mode === "hybrid") {
        for (const doc of searchDocumentsFTS(query, limit)) {
          if (type && doc.type !== type) continue;
          seenIds.add(doc.id);
          results.push({ id: doc.id, title: doc.title, type: doc.type, owner: doc.owner, score: 1, source: "fts", snippet: doc.rawText?.slice(0, 200) });
        }
      }
      if (mode === "vector" || mode === "hybrid") {
        try {
          const docsWithEmb = getDocumentsWithEmbeddings();
          buildVectorIndex(docsWithEmb);
          const convex = await authenticateConvexClient();
          const queryEmb = await convex.action(api.search.embedQuery, { query });
          for (const vr of searchVectors(queryEmb, limit)) {
            if (vr.score < 0.3) continue;
            if (seenIds.has(vr.id)) {
              const e = results.find((r) => r.id === vr.id);
              if (e) {
                e.score = vr.score;
                e.source = "hybrid";
              }
              continue;
            }
            const doc = getDocumentById(vr.id);
            if (!doc || type && doc.type !== type) continue;
            results.push({ id: doc.id, title: doc.title, type: doc.type, owner: doc.owner, score: vr.score, source: "vector", snippet: doc.rawText?.slice(0, 200) });
          }
        } catch {
        }
      }
      results.sort((a, b) => b.score - a.score);
      return { content: [{ type: "text", text: JSON.stringify(results.slice(0, limit), null, 2) }] };
    }
  );
  server.tool(
    "vault_context",
    "Retrieve relevant document context for RAG. Returns chunks of text from matching documents.",
    {
      query: z.string().describe("Natural language query"),
      limit: z.number().default(5).describe("Max documents"),
      maxChunksPerDoc: z.number().default(4).describe("Max chunks per document"),
      includeFields: z.boolean().default(false).describe("Include structured fields")
    },
    async ({ query, limit, maxChunksPerDoc, includeFields }) => {
      await ensureSynced();
      const contextDocs = [];
      const seenIds = /* @__PURE__ */ new Set();
      const hasChunks = getChunkCount() > 0;
      if (hasChunks) {
        const chunksWithEmb = getChunksWithEmbeddings();
        buildChunkVectorIndex(chunksWithEmb);
        try {
          const convex = await authenticateConvexClient();
          const queryEmb = await convex.action(api.search.embedQuery, { query });
          const chunkResults = searchChunkVectors(queryEmb, maxChunksPerDoc * limit);
          const chunksByDoc = /* @__PURE__ */ new Map();
          for (const cr of chunkResults) {
            if (!chunksByDoc.has(cr.docId)) chunksByDoc.set(cr.docId, []);
            chunksByDoc.get(cr.docId).push({ id: cr.id, score: cr.score });
          }
          for (const [docId, docChunks] of chunksByDoc) {
            if (seenIds.has(docId)) continue;
            const doc = getDocumentById(docId);
            if (!doc) continue;
            const chunkIds = docChunks.slice(0, maxChunksPerDoc).map((c) => c.id);
            const chunkTexts = getChunkTextsById(chunkIds);
            const chunks = chunkIds.map((id) => chunkTexts.get(id) || "").filter(Boolean);
            const ctx = { docId, title: doc.title, type: doc.type, owner: doc.owner, score: Math.max(...docChunks.map((c) => c.score)), chunks };
            if (includeFields) ctx.fields = doc.fields;
            seenIds.add(docId);
            contextDocs.push(ctx);
            if (contextDocs.length >= limit) break;
          }
        } catch {
        }
      }
      for (const doc of searchDocumentsFTS(query, limit)) {
        if (seenIds.has(doc.id)) continue;
        const chunks = hasChunks ? getChunksByDocId(doc.id).slice(0, maxChunksPerDoc).map((c) => c.chunkText) : [doc.rawText?.slice(0, 4e3) || ""];
        const ctx = { docId: doc.id, title: doc.title, type: doc.type, owner: doc.owner, score: 1, chunks };
        if (includeFields) ctx.fields = doc.fields;
        seenIds.add(doc.id);
        contextDocs.push(ctx);
        if (contextDocs.length >= limit) break;
      }
      contextDocs.sort((a, b) => b.score - a.score);
      const people = [...new Set(contextDocs.map((d) => d.owner).filter(Boolean))];
      return { content: [{ type: "text", text: JSON.stringify({ query, context: contextDocs.slice(0, limit), people }, null, 2) }] };
    }
  );
  server.tool(
    "vault_doc_get",
    "Get full metadata for a document by ID",
    { id: z.string().describe("Document ID") },
    async ({ id }) => {
      await ensureSynced();
      const doc = getDocumentById(id);
      if (!doc) return { content: [{ type: "text", text: JSON.stringify({ error: "Document not found" }) }] };
      const result = { id: doc.id, title: doc.title, type: doc.type, tags: doc.tags, owner: doc.owner, dateAdded: doc.dateAdded, fields: doc.fields, mimeType: doc.mimeType, hasFile: !!(doc.fileAssetKey || doc.storageId || doc.encryptedStorageId) };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
  server.tool(
    "vault_doc_text",
    "Get the raw OCR/extracted text of a document",
    { id: z.string().describe("Document ID") },
    async ({ id }) => {
      await ensureSynced();
      const doc = getDocumentById(id);
      if (!doc) return { content: [{ type: "text", text: "Document not found" }] };
      return { content: [{ type: "text", text: doc.rawText || "(no text)" }] };
    }
  );
  server.tool(
    "vault_doc_fields",
    "Get structured extracted fields for a document",
    { id: z.string().describe("Document ID") },
    async ({ id }) => {
      await ensureSynced();
      const doc = getDocumentById(id);
      if (!doc) return { content: [{ type: "text", text: JSON.stringify({ error: "Document not found" }) }] };
      return { content: [{ type: "text", text: JSON.stringify({ id: doc.id, title: doc.title, type: doc.type, fields: doc.fields }, null, 2) }] };
    }
  );
  server.tool(
    "vault_doc_list",
    "List documents in the vault, optionally filtered by type",
    {
      type: z.string().optional().describe("Filter by document type"),
      limit: z.number().default(50).describe("Max results")
    },
    async ({ type, limit }) => {
      await ensureSynced();
      let docs = type ? getDocumentsByType(type) : getAllDocuments();
      docs = docs.filter((d) => d.id !== "__people_registry__").slice(0, limit);
      const result = docs.map((d) => ({ id: d.id, title: d.title, type: d.type, owner: d.owner, dateAdded: d.dateAdded }));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
  server.tool(
    "vault_doc_types",
    "List all document types with counts",
    {},
    async () => {
      await ensureSynced();
      const types = getDocumentTypeCounts();
      return { content: [{ type: "text", text: JSON.stringify(types, null, 2) }] };
    }
  );
  server.tool(
    "vault_doc_edit",
    "Edit a document field (title, tags, type, owner, or custom field). Syncs to server.",
    {
      id: z.string().describe("Document ID"),
      field: z.string().describe("Field to edit"),
      value: z.string().describe("New value (for tags: comma-separated)")
    },
    async ({ id, field, value }) => {
      await ensureUnlocked();
      const doc = getDocumentById(id);
      if (!doc) return { content: [{ type: "text", text: JSON.stringify({ error: "Document not found" }) }] };
      updateDocumentField(id, field, field === "tags" ? value.split(",").map((t) => t.trim()) : value);
      const updatedDoc = getDocumentById(id);
      const { vaultKey } = getVaultKeys();
      let docKey;
      if (updatedDoc.encryptedDocKey) {
        docKey = unwrapDocumentKey(updatedDoc.encryptedDocKey, vaultKey);
      } else {
        docKey = generateDocumentKey();
      }
      const config = loadConfig();
      const encryptedBlob = encrypt(new TextEncoder().encode(JSON.stringify({
        title: updatedDoc.title,
        rawText: updatedDoc.rawText,
        type: updatedDoc.type,
        tags: updatedDoc.tags,
        fields: updatedDoc.fields,
        organizations: updatedDoc.organizations,
        mentions: updatedDoc.mentions,
        owner: updatedDoc.owner,
        embedding: updatedDoc.embedding ? Array.from(updatedDoc.embedding) : null,
        mimeType: updatedDoc.mimeType,
        encryptedStorageId: updatedDoc.encryptedStorageId,
        storageId: updatedDoc.encryptedStorageId ? void 0 : updatedDoc.storageId,
        dateAdded: updatedDoc.dateAdded
      })), docKey);
      const wrappedDocKey = wrapDocumentKey(docKey, vaultKey);
      const blobBuf = new ArrayBuffer(encryptedBlob.byteLength);
      new Uint8Array(blobBuf).set(encryptedBlob);
      const keyBuf = new ArrayBuffer(wrappedDocKey.byteLength);
      new Uint8Array(keyBuf).set(new Uint8Array(wrappedDocKey));
      const convex = await authenticateConvexClient();
      if (config.vaultId) {
        await convex.mutation(api.encryptedSync.upsertBlobByVault, { vaultId: config.vaultId, blobId: id, encryptedBlob: blobBuf, encryptedDocKey: keyBuf, blobSize: encryptedBlob.length });
      } else {
        await convex.mutation(api.encryptedSync.upsertBlob, { blobId: id, encryptedBlob: blobBuf, encryptedDocKey: keyBuf, blobSize: encryptedBlob.length });
      }
      upsertDocument({ ...updatedDoc, encryptedDocKey: wrappedDocKey, syncStatus: "synced" });
      docKey.fill(0);
      return { content: [{ type: "text", text: JSON.stringify({ status: "updated", id, field, value }) }] };
    }
  );
  server.tool(
    "vault_doc_delete",
    "Delete a document from the vault (local + server)",
    { id: z.string().describe("Document ID") },
    async ({ id }) => {
      await ensureUnlocked();
      const doc = getDocumentById(id);
      if (!doc) return { content: [{ type: "text", text: JSON.stringify({ error: "Document not found" }) }] };
      const convex = await authenticateConvexClient();
      await convex.mutation(api.encryptedSync.deleteBlob, { blobId: id });
      deleteDocument(id);
      return { content: [{ type: "text", text: JSON.stringify({ status: "deleted", id, title: doc.title }) }] };
    }
  );
  server.tool(
    "vault_doc_download",
    "Download the original document file (PDF, image) to ~/Downloads/ and return the file path",
    {
      id: z.string().describe("Document ID"),
      outputPath: z.string().optional().describe("Custom output path (default: ~/Downloads/<title>.<ext>)")
    },
    async ({ id, outputPath }) => {
      await ensureSynced();
      const doc = getDocumentById(id);
      if (!doc) return { content: [{ type: "text", text: JSON.stringify({ error: "Document not found" }) }] };
      const hasR2 = !!doc.fileAssetKey;
      const storageId = doc.encryptedStorageId || doc.storageId;
      if (!hasR2 && !storageId) return { content: [{ type: "text", text: JSON.stringify({ error: "No file attached to this document" }) }] };
      const convex = await authenticateConvexClient();
      const config = loadConfig();
      let rawBytes;
      if (hasR2) {
        const downloadInfo = await convex.action(api.r2Assets.requestFileDownloadUrl, { blobId: doc.id, vaultId: config.vaultId });
        const response = await fetch(downloadInfo.url);
        if (!response.ok) return { content: [{ type: "text", text: JSON.stringify({ error: `R2 download failed: ${response.status}` }) }] };
        rawBytes = new Uint8Array(await response.arrayBuffer());
      } else {
        const fileUrl = await convex.query(api.storage.getUrl, { storageId });
        if (!fileUrl) return { content: [{ type: "text", text: JSON.stringify({ error: "File not found on server" }) }] };
        const response = await fetch(fileUrl);
        if (!response.ok) return { content: [{ type: "text", text: JSON.stringify({ error: `Download failed: ${response.status}` }) }] };
        rawBytes = new Uint8Array(await response.arrayBuffer());
      }
      let fileBytes;
      if ((hasR2 || doc.encryptedStorageId) && doc.encryptedDocKey) {
        const { vaultKey } = getVaultKeys();
        const docKey = unwrapDocumentKey(doc.encryptedDocKey, vaultKey);
        fileBytes = decrypt(rawBytes, docKey);
        docKey.fill(0);
      } else {
        fileBytes = rawBytes;
      }
      const { default: fs4 } = await import("fs");
      const { default: path4 } = await import("path");
      const { default: os3 } = await import("os");
      const ext = doc.mimeType ? { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[doc.mimeType] ?? "bin" : "bin";
      const safeName = (doc.title || "document").replace(/[/\\:*?"<>|]/g, "_");
      const finalPath = outputPath || path4.join(os3.homedir(), "Downloads", `${safeName}.${ext}`);
      const dir = path4.dirname(finalPath);
      if (!fs4.existsSync(dir)) fs4.mkdirSync(dir, { recursive: true });
      fs4.writeFileSync(finalPath, fileBytes);
      return { content: [{ type: "text", text: JSON.stringify({ status: "downloaded", path: finalPath, size: fileBytes.length, title: doc.title }) }] };
    }
  );
  server.tool(
    "vault_sync",
    "Sync documents from the server",
    { full: z.boolean().default(false).describe("Force full sync") },
    async ({ full }) => {
      await ensureUnlocked();
      const { vaultKey } = getVaultKeys();
      const config = loadConfig();
      if (full || !config.lastSyncTimestamp) {
        const count = await syncFull(vaultKey, config.vaultId);
        return { content: [{ type: "text", text: JSON.stringify({ status: "synced", mode: "full", documents: count }) }] };
      } else {
        const { count, deleted } = await syncIncremental(vaultKey, config.vaultId);
        return { content: [{ type: "text", text: JSON.stringify({ status: "synced", mode: "incremental", updated: count, deleted }) }] };
      }
    }
  );
  server.tool(
    "vault_stats",
    "Get vault statistics",
    {},
    async () => {
      await ensureSynced();
      const config = loadConfig();
      return { content: [{ type: "text", text: JSON.stringify({
        totalDocuments: getDocumentCount(),
        documentTypes: getDocumentTypeCounts(),
        lastSync: config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toISOString() : null
      }, null, 2) }] };
    }
  );
  server.tool(
    "vault_doc_upload",
    "Upload a local file (PDF, image) to the vault. Extracts text/fields via Gemini, encrypts, and syncs.",
    { filePath: z.string().describe("Absolute path to the file") },
    async ({ filePath }) => {
      await ensureUnlocked();
      const { default: fs4 } = await import("fs");
      const { default: path4 } = await import("path");
      const crypto5 = await import("crypto");
      if (!fs4.existsSync(filePath)) return { content: [{ type: "text", text: JSON.stringify({ error: "File not found" }) }] };
      const fileBuffer = fs4.readFileSync(filePath);
      const fileBytes = new Uint8Array(fileBuffer);
      const fileName = path4.basename(filePath);
      const ext = path4.extname(filePath).toLowerCase().slice(1);
      const mimeType = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" }[ext] ?? "application/octet-stream";
      const hash = crypto5.createHash("sha256").update(fileBytes).digest("hex");
      const docId = hash;
      const convex = await authenticateConvexClient();
      const uploadUrl = await convex.mutation(api.storage.generateUploadUrl, {});
      const uploadResp = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": mimeType }, body: fileBytes });
      const { storageId } = await uploadResp.json();
      const extracted = await convex.action(api.proxy.processFile, { storageId, mimeType, fileName });
      const persistedStorageId = extracted.storageId || storageId;
      if (!extracted.embedding || !Array.isArray(extracted.embedding) || extracted.embedding.length === 0) {
        try {
          const combinedText = [extracted.title || fileName, extracted.type, ...extracted.tags || [], JSON.stringify(extracted.fields || {})].join(" ");
          extracted.embedding = await convex.action(api.search.embedQuery, { query: combinedText });
        } catch {
        }
      }
      const { vaultKey } = getVaultKeys();
      const docKey = generateDocumentKey();
      const encFileBytes = encrypt(fileBytes, docKey);
      try {
        await convex.mutation(api.storage.deleteFile, { storageId: persistedStorageId });
      } catch {
      }
      const wrappedDocKey = wrapDocumentKey(docKey, vaultKey);
      const now = Date.now();
      const config = loadConfig();
      const vaultId = config.vaultId;
      const localDoc = { id: docId, title: extracted.title || fileName, rawText: extracted.rawText || "", type: extracted.type || "generic", tags: extracted.tags || [], fields: extracted.fields || {}, organizations: extracted.organizations || [], mentions: extracted.mentions || [], embedding: extracted.embedding || void 0, owner: extracted.owner || "Unknown", mimeType, encryptedDocKey: wrappedDocKey, dateAdded: (/* @__PURE__ */ new Date()).toISOString(), status: "ready", createdAt: now, updatedAt: now, syncStatus: "synced" };
      const docContent = JSON.stringify({ title: localDoc.title, rawText: localDoc.rawText, type: localDoc.type, tags: localDoc.tags, fields: localDoc.fields, organizations: localDoc.organizations, mentions: localDoc.mentions, owner: localDoc.owner, embedding: extracted.embedding || null, mimeType, fileName, fileHash: hash, dateAdded: localDoc.dateAdded });
      const encBlob = encrypt(new TextEncoder().encode(docContent), docKey);
      const blobBuf = new ArrayBuffer(encBlob.byteLength);
      new Uint8Array(blobBuf).set(encBlob);
      const keyBuf = new ArrayBuffer(wrappedDocKey.byteLength);
      new Uint8Array(keyBuf).set(new Uint8Array(wrappedDocKey));
      if (vaultId) {
        await convex.mutation(api.encryptedSync.upsertBlobByVault, { vaultId, blobId: docId, encryptedBlob: blobBuf, encryptedDocKey: keyBuf, blobSize: encBlob.length });
      } else {
        await convex.mutation(api.encryptedSync.upsertBlob, { blobId: docId, encryptedBlob: blobBuf, encryptedDocKey: keyBuf, blobSize: encBlob.length });
      }
      const fileUploadInfo = await convex.action(api.r2Assets.requestFileUploadUrl, { blobId: docId, vaultId: vaultId ?? void 0, mimeType: "application/octet-stream", size: encFileBytes.length });
      const r2Resp = await fetch(fileUploadInfo.url, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: encFileBytes });
      if (!r2Resp.ok) throw new Error(`R2 upload failed: ${r2Resp.status}`);
      await convex.mutation(api.r2Assets.patchFileAssetRef, { blobId: docId, vaultId: vaultId ?? void 0, provider: "r2", key: fileUploadInfo.key, mimeType, size: encFileBytes.length, version: 1, status: "ready" });
      localDoc.fileAssetProvider = "r2";
      localDoc.fileAssetKey = fileUploadInfo.key;
      localDoc.fileAssetMimeType = mimeType;
      localDoc.fileAssetSize = encFileBytes.length;
      localDoc.fileAssetVersion = 1;
      localDoc.fileAssetStatus = "ready";
      upsertDocument(localDoc);
      docKey.fill(0);
      return { content: [{ type: "text", text: JSON.stringify({ status: "uploaded", id: docId, title: localDoc.title, type: localDoc.type, tags: localDoc.tags }) }] };
    }
  );
  server.tool(
    "vault_people_list",
    "List all people in the vault with their document counts",
    {},
    async () => {
      await ensureSynced();
      const db2 = (await Promise.resolve().then(() => (init_database(), database_exports))).getDatabase();
      const owners = db2.prepare("SELECT owner, COUNT(*) as count FROM documents WHERE owner IS NOT NULL AND owner != 'Unknown' AND id != '__people_registry__' GROUP BY owner ORDER BY count DESC").all();
      return { content: [{ type: "text", text: JSON.stringify(owners, null, 2) }] };
    }
  );
  server.tool(
    "vault_people_docs",
    "List documents belonging to a specific person",
    { name: z.string().describe("Person name (partial match)") },
    async ({ name }) => {
      await ensureSynced();
      const db2 = (await Promise.resolve().then(() => (init_database(), database_exports))).getDatabase();
      const docs = db2.prepare("SELECT id, title, type, owner, dateAdded FROM documents WHERE owner LIKE @pat COLLATE NOCASE AND id != '__people_registry__' ORDER BY updatedAt DESC").all({ pat: `%${name}%` });
      return { content: [{ type: "text", text: JSON.stringify(docs, null, 2) }] };
    }
  );
  server.tool(
    "vault_chunk_status",
    "Show the chunk index status for RAG context retrieval",
    {},
    async () => {
      await ensureSynced();
      return { content: [{ type: "text", text: JSON.stringify({
        totalDocs: getDocumentCount(),
        chunkedDocs: (await Promise.resolve().then(() => (init_database(), database_exports))).getChunkedDocCount(),
        totalChunks: getChunkCount()
      }, null, 2) }] };
    }
  );
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// src/cli/index.ts
init_database();
var program = new Command();
program.name("moivault").description("CLI for Vault \u2014 encrypted document management for agents and humans").version("0.1.0").option("--json", "Force JSON output").option("--pretty", "Force human-readable output").option("--db <path>", "Custom SQLite database path").option("--vault-id <id>", "Target specific vault").option("--verbose", "Enable debug logging").hook("preAction", async (thisCommand, actionCommand) => {
  const commandName = actionCommand.name();
  const parentName = actionCommand.parent?.name();
  const skipAutoUnlock = parentName === "auth" || commandName === "unlock" || commandName === "lock";
  if (skipAutoUnlock) return;
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
registerUsageCommand(program);
registerPeopleCommands(program);
registerChunkCommands(program);
registerContextCommand(program);
program.command("mcp").description("Start MCP server (stdio transport) for Claude Desktop, Cursor, etc.").action(async () => {
  await startMcpServer();
});
program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
//# sourceMappingURL=index.js.map