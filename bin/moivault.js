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
function defaultConfigDir() {
  const legacy = path.join(os.homedir(), ".vault-cli");
  if (process.platform !== "linux" || fs.existsSync(legacy)) return legacy;
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(xdg, "moivault");
}
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 448 });
  } else if (!configDirChecked && !process.env.MOIVAULT_CONFIG_DIR) {
    try {
      if ((fs.statSync(CONFIG_DIR).mode & 63) !== 0) fs.chmodSync(CONFIG_DIR, 448);
    } catch {
    }
  }
  configDirChecked = true;
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
var CONVEX_URL, CONVEX_SITE_URL, CONFIG_DIR, CONFIG_FILE, DEFAULT_DB_PATH, configDirChecked;
var init_config = __esm({
  "src/core/config.ts"() {
    "use strict";
    CONVEX_URL = process.env.MOIVAULT_CONVEX_URL || "https://perfect-mallard-90.convex.cloud";
    CONVEX_SITE_URL = process.env.MOIVAULT_CONVEX_SITE_URL || "https://perfect-mallard-90.convex.site";
    CONFIG_DIR = process.env.MOIVAULT_CONFIG_DIR || defaultConfigDir();
    CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
    DEFAULT_DB_PATH = path.join(CONFIG_DIR, "vault.db");
    configDirChecked = false;
  }
});

// src/shared/constants.ts
var VAULT_KEY_BYTES, DOCUMENT_KEY_BYTES, MUK_BYTES, IV_BYTES, AUTH_TAG_BYTES, PBKDF2_ITERATIONS, PBKDF2_HASH, BLOB_VERSION;
var init_constants = __esm({
  "src/shared/constants.ts"() {
    "use strict";
    VAULT_KEY_BYTES = 32;
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
import crypto2 from "crypto";
function encrypt(plaintext, key) {
  const iv = crypto2.randomBytes(IV_BYTES);
  const cipher = crypto2.createCipheriv("aes-256-gcm", key, iv);
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
  const decipher = crypto2.createDecipheriv("aes-256-gcm", key, iv);
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
    crypto2.pbkdf2(
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
  return new Uint8Array(crypto2.randomBytes(size));
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
  deleteDocumentsOutsideSpaces: () => deleteDocumentsOutsideSpaces,
  getAllDocuments: () => getAllDocuments,
  getChunkCount: () => getChunkCount,
  getChunkTextsById: () => getChunkTextsById,
  getChunkedDocCount: () => getChunkedDocCount,
  getChunksByDocId: () => getChunksByDocId,
  getChunksWithEmbeddings: () => getChunksWithEmbeddings,
  getDatabase: () => getDatabase,
  getDocumentById: () => getDocumentById,
  getDocumentCount: () => getDocumentCount,
  getDocumentPathRows: () => getDocumentPathRows,
  getDocumentTypeCounts: () => getDocumentTypeCounts,
  getDocumentsByTags: () => getDocumentsByTags,
  getDocumentsByType: () => getDocumentsByType,
  getDocumentsWithEmbeddings: () => getDocumentsWithEmbeddings,
  getLocalMeta: () => getLocalMeta,
  openDatabase: () => openDatabase,
  searchDocumentsFTS: () => searchDocumentsFTS,
  setLocalMeta: () => setLocalMeta,
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
      markdownContent TEXT,
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
      keyVersion INTEGER,
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
      previewAssetStatus TEXT,
      savedBy TEXT
    );
  `);
  const existingCols = db.pragma("table_info(documents)");
  const colNames = new Set(existingCols.map((c) => c.name));
  const r2Cols = [
    // The space-key generation this row's wrapped document key belongs to.
    // NULL means 1 — written before rotation existed — never "current".
    "keyVersion INTEGER",
    "markdownContent TEXT",
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
    "previewAssetStatus TEXT",
    // Provenance for documents an agent wrote: JSON {client, connectionLabel, at}.
    "savedBy TEXT"
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

    -- Small decrypted facts that are not documents: the people registry and
    -- the space directory, so paths resolve offline.
    CREATE TABLE IF NOT EXISTS local_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
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
  let savedBy;
  if (typeof row.savedBy === "string") {
    try {
      savedBy = JSON.parse(row.savedBy);
    } catch {
    }
  }
  return {
    id: row.id,
    title: row.title,
    rawText: row.rawText,
    markdownContent: row.markdownContent,
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
    keyVersion: row.keyVersion,
    savedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncStatus: row.syncStatus ?? "synced"
  };
}
function upsertDocument(doc) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO documents
    (id, title, rawText, markdownContent, type, tags, fields, organizations, mentions, overview, embedding, encryptedDocKey, mimeType, storageId, encryptedStorageId, fileEncrypted, fileAssetProvider, fileAssetKey, fileAssetMimeType, fileAssetSize, fileAssetVersion, fileAssetStatus, previewAssetProvider, previewAssetKey, previewAssetMimeType, previewAssetSize, previewAssetVersion, previewAssetStatus, owner, originalOwner, addedBy, imageUrl, dateAdded, status, vaultId, keyVersion, savedBy, createdAt, updatedAt, syncStatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const embeddingBlob = doc.embedding ? Buffer.from(new Float64Array(doc.embedding).buffer) : null;
  stmt.run(
    doc.id,
    doc.title,
    doc.rawText ?? null,
    doc.markdownContent || null,
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
    doc.keyVersion ?? null,
    doc.savedBy ? JSON.stringify(doc.savedBy) : null,
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
function deleteDocumentsOutsideSpaces(spaceIds) {
  const database = getDatabase();
  const rows = database.prepare("SELECT id, vaultId FROM documents").all();
  const keep = new Set(spaceIds);
  let removed = 0;
  const tx = database.transaction(() => {
    for (const row of rows) {
      if (row.vaultId && keep.has(row.vaultId)) continue;
      deleteDocument(row.id);
      removed++;
    }
  });
  tx();
  return removed;
}
function getDocumentPathRows() {
  return getDatabase().prepare("SELECT id, title, type, owner, mimeType, vaultId, dateAdded FROM documents").all();
}
function getLocalMeta(key) {
  const row = getDatabase().prepare("SELECT value FROM local_meta WHERE key = ?").get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}
function setLocalMeta(key, value) {
  getDatabase().prepare("INSERT OR REPLACE INTO local_meta (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
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
import crypto from "crypto";
import { spawnSync } from "child_process";
var ALL_SECRET_KEYS = [
  // Agent connection (current)
  "connection_id",
  "credential",
  "conn_private_key",
  "conn_public_key",
  "serve_secret",
  // Legacy install (cookie + MUK)
  "session_cookie",
  "muk",
  "secret_key",
  "salt",
  "wrapped_vault_key",
  "master_password"
];
var SECURITY = "/usr/bin/security";
function serviceName() {
  const override = process.env.MOIVAULT_CONFIG_DIR;
  if (!override) return "moivault";
  const tag = crypto.createHash("sha256").update(path2.resolve(override)).digest("hex").slice(0, 8);
  return `moivault-${tag}`;
}
function assertKeyName(key) {
  if (!/^[a-z0-9_]+$/.test(key)) throw new Error(`Invalid keychain key: ${key}`);
}
function createMacBackend() {
  const service = serviceName();
  function run(args, input) {
    return spawnSync(SECURITY, args, { input, encoding: "utf-8", timeout: 1e4 });
  }
  function read(key) {
    const r = run(["find-generic-password", "-s", service, "-a", key, "-w"]);
    if (r.status === 44) return null;
    if (r.status !== 0) throw new Error(`security find-generic-password failed (${r.status})`);
    const stored = r.stdout.replace(/\n$/, "");
    return Buffer.from(stored, "base64").toString("utf-8");
  }
  return {
    async get(key) {
      assertKeyName(key);
      return read(key);
    },
    async set(key, value) {
      assertKeyName(key);
      const encoded = Buffer.from(value, "utf-8").toString("base64");
      const command = `add-generic-password -U -s "${service}" -a "${key}" -l "moivault ${key}" -w "${encoded}"
`;
      const r = run(["-i"], command);
      if (r.status !== 0) throw new Error(`security add-generic-password failed (${r.status})`);
      if (read(key) !== value) throw new Error("Keychain write did not read back");
    },
    async delete(key) {
      assertKeyName(key);
      const r = run(["delete-generic-password", "-s", service, "-a", key]);
      if (r.status !== 0 && r.status !== 44) {
        throw new Error(`security delete-generic-password failed (${r.status})`);
      }
    }
  };
}
function hasSecretTool() {
  const r = spawnSync("sh", ["-c", "command -v secret-tool"], { encoding: "utf-8" });
  return r.status === 0 && r.stdout.trim().length > 0;
}
function createSecretToolBackend() {
  const service = serviceName();
  const attrs = (key) => ["service", service, "account", key];
  return {
    async get(key) {
      assertKeyName(key);
      const r = spawnSync("secret-tool", ["lookup", ...attrs(key)], { encoding: "utf-8", timeout: 1e4 });
      if (r.status !== 0) {
        if (r.error || r.stderr && r.stderr.trim()) throw new Error("secret-tool lookup failed");
        return null;
      }
      return r.stdout.length > 0 ? r.stdout : null;
    },
    async set(key, value) {
      assertKeyName(key);
      const r = spawnSync("secret-tool", ["store", `--label=moivault ${key}`, ...attrs(key)], {
        input: value,
        encoding: "utf-8",
        timeout: 1e4
      });
      if (r.status !== 0) throw new Error("secret-tool store failed");
    },
    async delete(key) {
      assertKeyName(key);
      spawnSync("secret-tool", ["clear", ...attrs(key)], { encoding: "utf-8", timeout: 1e4 });
    }
  };
}
function secretsFilePath() {
  return path2.join(getConfigDir(), "secrets.json");
}
function readSecretsFile() {
  const file = secretsFilePath();
  if (!fs2.existsSync(file)) return {};
  try {
    return JSON.parse(fs2.readFileSync(file, "utf-8"));
  } catch {
    return {};
  }
}
function writeSecretsFile(secrets) {
  const file = secretsFilePath();
  if (Object.keys(secrets).length === 0) {
    fs2.rmSync(file, { force: true });
    return;
  }
  fs2.writeFileSync(file, JSON.stringify(secrets, null, 2), { mode: 384 });
}
function createFileBackend() {
  return {
    async get(key) {
      return readSecretsFile()[key] ?? null;
    },
    async set(key, value) {
      const secrets = readSecretsFile();
      secrets[key] = value;
      writeSecretsFile(secrets);
    },
    async delete(key) {
      const secrets = readSecretsFile();
      if (!(key in secrets)) return;
      delete secrets[key];
      writeSecretsFile(secrets);
    }
  };
}
function createLayeredBackend(primary, name) {
  const file = createFileBackend();
  let migrated = false;
  async function migrate() {
    if (migrated) return;
    migrated = true;
    const secrets = readSecretsFile();
    const keys = Object.keys(secrets);
    if (keys.length === 0) return;
    const remaining = {};
    for (const key of keys) {
      try {
        assertKeyName(key);
        await primary.set(key, secrets[key]);
        if (await primary.get(key) !== secrets[key]) throw new Error("mismatch");
      } catch {
        remaining[key] = secrets[key];
      }
    }
    writeSecretsFile(remaining);
  }
  return {
    name,
    async get(key) {
      await migrate();
      try {
        const value = await primary.get(key);
        if (value !== null) return value;
      } catch {
      }
      return file.get(key);
    },
    async set(key, value) {
      assertKeyName(key);
      await migrate();
      try {
        await primary.set(key, value);
        await file.delete(key);
      } catch {
        await file.set(key, value);
      }
    },
    async delete(key) {
      try {
        await primary.delete(key);
      } catch {
      }
      await file.delete(key);
    }
  };
}
var backend = null;
function getKeychain() {
  return resolveBackend();
}
function getKeychainBackendName() {
  return resolveBackend().name;
}
function resolveBackend() {
  if (backend) return backend;
  const forced = process.env.MOIVAULT_KEYCHAIN;
  if (forced === "file") {
    backend = { ...createFileBackend(), name: "file" };
  } else if (process.platform === "darwin" && fs2.existsSync(SECURITY)) {
    backend = createLayeredBackend(createMacBackend(), "macos-keychain");
  } else if (process.platform === "linux" && hasSecretTool()) {
    backend = createLayeredBackend(createSecretToolBackend(), "secret-service");
  } else {
    backend = { ...createFileBackend(), name: "file" };
  }
  return backend;
}
async function wipeAllSecrets() {
  const kc = resolveBackend();
  for (const key of ALL_SECRET_KEYS) {
    try {
      await kc.delete(key);
    } catch {
    }
  }
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

// src/core/keyExchange.ts
init_crypto();
import crypto3 from "crypto";
var X25519_KEY_BYTES = 32;
var ENVELOPE_VERSION = 2;
var SPKI_PREFIX = Buffer.from("302a300506032b656e032100", "hex");
var PKCS8_PREFIX = Buffer.from("302e020100300506032b656e04220420", "hex");
function publicKeyObject(raw) {
  if (raw.length !== X25519_KEY_BYTES) {
    throw new Error(`X25519 public key must be 32 bytes, got ${raw.length}`);
  }
  return crypto3.createPublicKey({
    key: Buffer.concat([SPKI_PREFIX, Buffer.from(raw)]),
    format: "der",
    type: "spki"
  });
}
function privateKeyObject(raw) {
  if (raw.length !== X25519_KEY_BYTES) {
    throw new Error(`X25519 private key must be 32 bytes, got ${raw.length}`);
  }
  return crypto3.createPrivateKey({
    key: Buffer.concat([PKCS8_PREFIX, Buffer.from(raw)]),
    format: "der",
    type: "pkcs8"
  });
}
function deriveWrappingKey(sharedSecret, ephemeralPublicKey, recipientPublicKey) {
  const hash = crypto3.createHash("sha256");
  hash.update(sharedSecret);
  hash.update(ephemeralPublicKey);
  hash.update(recipientPublicKey);
  return new Uint8Array(hash.digest());
}
function rawPublicKey(key) {
  return new Uint8Array(key.export({ format: "der", type: "spki" }).subarray(SPKI_PREFIX.length));
}
function rawPrivateKey(key) {
  return new Uint8Array(key.export({ format: "der", type: "pkcs8" }).subarray(PKCS8_PREFIX.length));
}
function generateKeyPair() {
  const kp = crypto3.generateKeyPairSync("x25519");
  return { publicKey: rawPublicKey(kp.publicKey), privateKey: rawPrivateKey(kp.privateKey) };
}
function sealToPublicKey(plaintext, recipientPublicKey) {
  const recipient = publicKeyObject(recipientPublicKey);
  const ephemeral = crypto3.generateKeyPairSync("x25519");
  const ephemeralPublicKey = rawPublicKey(ephemeral.publicKey);
  const shared = new Uint8Array(
    crypto3.diffieHellman({ privateKey: ephemeral.privateKey, publicKey: recipient })
  );
  const wrappingKey = deriveWrappingKey(shared, ephemeralPublicKey, recipientPublicKey);
  const payload = encrypt(plaintext, wrappingKey);
  shared.fill(0);
  wrappingKey.fill(0);
  const envelope = new Uint8Array(1 + X25519_KEY_BYTES + payload.length);
  envelope[0] = ENVELOPE_VERSION;
  envelope.set(ephemeralPublicKey, 1);
  envelope.set(payload, 1 + X25519_KEY_BYTES);
  return envelope;
}
function fingerprint(publicKey) {
  const hex = crypto3.createHash("sha256").update(publicKey).digest("hex").slice(0, 16).toUpperCase();
  return hex.match(/.{4}/g).join("-");
}
function openSealed(envelope, recipientPrivateKey, recipientPublicKey) {
  if (envelope.length < 1 + X25519_KEY_BYTES + 1) {
    throw new Error("Sealed envelope too short");
  }
  if (envelope[0] !== ENVELOPE_VERSION) {
    throw new Error(`Unsupported envelope version: ${envelope[0]}`);
  }
  const ephemeralPublicKey = envelope.subarray(1, 1 + X25519_KEY_BYTES);
  const payload = envelope.subarray(1 + X25519_KEY_BYTES);
  const shared = new Uint8Array(
    crypto3.diffieHellman({
      privateKey: privateKeyObject(recipientPrivateKey),
      publicKey: publicKeyObject(ephemeralPublicKey)
    })
  );
  const wrappingKey = deriveWrappingKey(shared, ephemeralPublicKey, recipientPublicKey);
  try {
    return decrypt(payload, wrappingKey);
  } finally {
    shared.fill(0);
    wrappingKey.fill(0);
  }
}

// src/core/connection.ts
import fs3 from "fs";
import os2 from "os";
import path3 from "path";
import crypto4 from "crypto";
init_config();
init_database();
init_crypto();

// src/core/client.ts
var KNOWN = {
  "claude-desktop": "Claude Desktop",
  "claude-code": "Claude Code",
  "claude-web": "Claude.ai",
  chatgpt: "ChatGPT",
  codex: "Codex",
  cursor: "Cursor",
  copilot: "Copilot",
  gemini: "Gemini",
  windsurf: "Windsurf",
  terminal: "Terminal"
};
var CLIENT_KEYS = Object.keys(KNOWN);
function parseIntendedClient(value) {
  const key = (value ?? "").trim().toLowerCase();
  if (!key || key === "any") return null;
  if (!(key in KNOWN)) {
    throw new Error(`Unknown agent "${value}". Use one of: ${CLIENT_KEYS.join(", ")} (or "any").`);
  }
  return known(key);
}
function clientDisplay(key) {
  return KNOWN[key] ?? key;
}
function slugify(name) {
  return name.normalize("NFKD").replace(new RegExp("\\p{M}", "gu"), "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
function known(key) {
  return { key, display: KNOWN[key] };
}
function normalizeClientName(name, remote = false) {
  const raw = (name ?? "").trim();
  if (!raw) return null;
  const n = raw.toLowerCase();
  if (n.includes("claude-code") || n.includes("claude code")) return known("claude-code");
  if (n.includes("claude")) {
    if (remote) return known("claude-web");
    return known("claude-desktop");
  }
  if (n.includes("codex")) return known("codex");
  if (n.includes("openai") || n.includes("chatgpt")) return known("chatgpt");
  if (n.includes("cursor")) return known("cursor");
  if (n.includes("copilot") || n.includes("vscode") || n.includes("visual studio code")) return known("copilot");
  if (n.includes("gemini")) return known("gemini");
  if (n.includes("windsurf")) return known("windsurf");
  const key = slugify(raw);
  if (!key) return null;
  return { key, display: raw };
}
function detectClientFromEnv(env = process.env) {
  const has = (prefix) => Object.keys(env).some((k) => k.startsWith(prefix));
  if (env.CLAUDECODE) return known("claude-code");
  if (has("CURSOR_")) return known("cursor");
  if (has("CODEX_")) return known("codex");
  if (env.GEMINI_CLI) return known("gemini");
  return known("terminal");
}
function resolveClient(clientInfoName, remote = false) {
  return normalizeClientName(clientInfoName, remote) ?? (remote ? { key: "remote", display: "Remote agent" } : detectClientFromEnv());
}

// src/core/connection.ts
var LEGACY_SECRET_KEYS = [
  "session_cookie",
  "muk",
  "secret_key",
  "salt",
  "wrapped_vault_key",
  "master_password"
];
var secretsCache;
async function loadConnectionSecrets() {
  if (secretsCache !== void 0) return secretsCache;
  const kc = getKeychain();
  const [connectionId, credential, priv, pub] = await Promise.all([
    kc.get("connection_id"),
    kc.get("credential"),
    kc.get("conn_private_key"),
    kc.get("conn_public_key")
  ]);
  secretsCache = connectionId && credential && priv && pub ? { connectionId, credential, keyPair: { privateKey: base64ToBytes(priv), publicKey: base64ToBytes(pub) } } : null;
  return secretsCache;
}
async function isConnectionMode() {
  return await loadConnectionSecrets() !== null;
}
function connectionModeKnown() {
  return !!secretsCache;
}
var state = null;
function setConnectionState(next) {
  state = next;
}
function getConnectionState() {
  return state;
}
function getManifest() {
  return state?.manifest ?? null;
}
function canWriteSpace(spaceId) {
  if (!spaceId || !state) return false;
  return state.grants.some((g) => g.spaceId === spaceId && g.canWrite);
}
function canDeleteSpace(spaceId) {
  if (!spaceId || !state) return false;
  return state.grants.some((g) => g.spaceId === spaceId && g.canDelete === true);
}
function intendedClient() {
  const key = loadConfig().connection?.intendedClient;
  return key ? { key, display: clientDisplay(key) } : null;
}
function adoptIntendedClient(key) {
  const config = loadConfig();
  if (!config.connection || (config.connection.intendedClient ?? null) === key) return;
  const { intendedClient: _previous, ...rest } = config.connection;
  saveConfig({ ...config, connection: key ? { ...rest, intendedClient: key } : rest });
}
function getPreset() {
  return state?.preset ?? null;
}
function getContextCard() {
  return state?.context ?? null;
}
var SENSITIVE_DOC_TYPES = /* @__PURE__ */ new Set([
  "id",
  "drivers_license",
  "birth_certificate",
  "marriage_certificate",
  "visa",
  "bank_statement",
  "salary_slip",
  "tax_id",
  "tax_return",
  "tax_form",
  "tax_notice",
  "medical",
  "prescription",
  "vaccination",
  "investment",
  "loan"
]);
function writableSpaceForNewDoc(preferred) {
  if (!state) return null;
  if (preferred && canWriteSpace(preferred)) return preferred;
  const writable = state.grants.filter((g) => g.canWrite).map((g) => g.spaceId);
  if (writable.length === 0) return null;
  const family = state.manifest?.spaces.find((s) => s.kind === "family" && writable.includes(s.spaceId));
  return family?.spaceId ?? writable[0];
}
function userPublicKey() {
  const manifest = getManifest();
  if (!manifest?.userPublicKey) {
    throw new Error("No manifest from the phone yet \u2014 run `moivault sync` once the pairing is approved");
  }
  const key = base64ToBytes(manifest.userPublicKey);
  if (key.length !== 32) throw new Error("Manifest carries a malformed user public key");
  return key;
}
function openSealedJson(sealed, keyPair) {
  const bytes = sealed instanceof Uint8Array ? sealed : new Uint8Array(sealed);
  const plain = openSealed(bytes, keyPair.privateKey, keyPair.publicKey);
  return JSON.parse(new TextDecoder().decode(plain));
}
function sealJsonToUser(obj) {
  return toArrayBuffer(sealToPublicKey(new TextEncoder().encode(JSON.stringify(obj)), userPublicKey()));
}
function sealBytesToUser(bytes) {
  return toArrayBuffer(sealToPublicKey(bytes, userPublicKey()));
}
function toArrayBuffer(bytes) {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}
var AgentHttpError = class extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "AgentHttpError";
  }
};
async function postJson(route, body) {
  let response;
  try {
    response = await fetch(`${CONVEX_SITE_URL}${route}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error(`Could not reach the vault server (${err.message}). Check your connection and try again.`);
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
  }
  return { status: response.status, data };
}
function randomBase64Url(bytes) {
  return crypto4.randomBytes(bytes).toString("base64url");
}
function sha256Hex(s) {
  return crypto4.createHash("sha256").update(s, "utf-8").digest("hex");
}
function machineLabel() {
  return os2.hostname().replace(/\.local$/, "");
}
function machinePlatform() {
  return process.platform === "linux" ? "linux" : "darwin";
}
async function claimPairing(pairToken, generateKeyPair2) {
  const keyPair = generateKeyPair2();
  const credential = randomBase64Url(32);
  const label = machineLabel();
  const localFingerprint = fingerprint(keyPair.publicKey);
  const { status, data } = await postJson("/api/agent/claim", {
    pairToken: pairToken.trim(),
    publicKey: bytesToBase64(keyPair.publicKey),
    credentialHash: sha256Hex(credential),
    label,
    hostname: os2.hostname(),
    platform: machinePlatform()
  });
  if (status === 410) {
    const code = data?.code ?? "PAIR_EXPIRED";
    throw new AgentHttpError(410, code, code === "PAIR_USED" ? "This pairing code was already used. Make a new one on your phone." : "This pairing code expired. Make a new one on your phone.");
  }
  if (status !== 200 || !data?.connectionId) {
    throw new AgentHttpError(status, data?.code ?? null, `Pairing failed (${status})${data?.code ? `: ${data.code}` : ""}`);
  }
  if (data.fingerprint && data.fingerprint !== localFingerprint) {
    throw new Error("The server reported a different key fingerprint than this machine generated. Not continuing.");
  }
  return { connectionId: data.connectionId, fingerprint: localFingerprint, credential, keyPair, label };
}
async function waitForApproval(pending2, opts = {}) {
  const interval = opts.intervalMs ?? 2e3;
  const deadline = Date.now() + (opts.timeoutMs ?? 10 * 60 * 1e3);
  for (; ; ) {
    const { status, data } = await postJson("/api/agent/token", {
      connectionId: pending2.connectionId,
      credential: pending2.credential
    });
    if (status === 200 && data?.token) return { token: data.token, expiresAt: normalizeExpiry(data.expiresAt) };
    if (status === 410) throw new AgentHttpError(410, "DENIED", "The pairing was declined on your phone.");
    if (status === 401) throw new AgentHttpError(401, data?.code ?? null, `The pairing is no longer valid (${data?.code ?? 401}).`);
    if (status !== 202) throw new AgentHttpError(status, data?.code ?? null, `Unexpected response while waiting (${status}).`);
    if (Date.now() > deadline) throw new Error("Timed out waiting for approval on your phone.");
    opts.onTick?.();
    await new Promise((r) => setTimeout(r, interval));
  }
}
async function storePairing(pending2, intendedClient2) {
  const kc = getKeychain();
  await kc.set("connection_id", pending2.connectionId);
  await kc.set("credential", pending2.credential);
  await kc.set("conn_private_key", bytesToBase64(pending2.keyPair.privateKey));
  await kc.set("conn_public_key", bytesToBase64(pending2.keyPair.publicKey));
  for (const key of LEGACY_SECRET_KEYS) {
    await kc.delete(key);
  }
  removeLocalLibrary();
  const { lastSyncTimestamp: _cursor, vaultId: _vault, ...rest } = loadConfig();
  saveConfig({
    ...rest,
    connection: {
      label: pending2.label,
      hostname: os2.hostname(),
      fingerprint: pending2.fingerprint,
      pairedAt: Date.now(),
      ...intendedClient2 ? { intendedClient: intendedClient2 } : {}
    }
  });
  secretsCache = void 0;
  cachedToken = null;
}
var cachedToken = null;
function normalizeExpiry(expiresAt) {
  const n = Number(expiresAt);
  if (!Number.isFinite(n) || n <= 0) return Date.now() + 14 * 60 * 1e3;
  return n < 1e12 ? n * 1e3 : n;
}
async function getAgentToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 6e4) return cachedToken.token;
  const secrets = await loadConnectionSecrets();
  if (!secrets) throw new Error("This machine is not paired \u2014 run `moivault auth pair <code>`");
  const { status, data } = await postJson("/api/agent/token", {
    connectionId: secrets.connectionId,
    credential: secrets.credential
  });
  if (status === 200 && data?.token) {
    cachedToken = { token: data.token, expiresAt: normalizeExpiry(data.expiresAt) };
    updateConfig({ lastSeenAt: Date.now() });
    return data.token;
  }
  if (status === 202) {
    throw new AgentHttpError(202, null, "Still waiting for approval on your phone.");
  }
  if (status === 401 && (data?.code === "REVOKED" || data?.code === "EXPIRED")) {
    return disconnectMachine();
  }
  if (status === 410) {
    return disconnectMachine("The pairing was declined on your phone.");
  }
  if (status === 401) {
    throw new AgentHttpError(401, data?.code ?? "INVALID", "This machine's credential was not accepted. Pair again with `moivault auth pair <code>`.");
  }
  throw new AgentHttpError(status, data?.code ?? null, `Agent token exchange failed (${status}).`);
}
function isRevocationError(err) {
  return agentErrorCode(err) === "AGENT_REVOKED";
}
function agentErrorCode(err) {
  const data = err?.data;
  if (data && typeof data.code === "string") return data.code;
  const msg = err instanceof Error ? err.message : String(err);
  return msg.match(/\b(AGENT_[A-Z_]+)\b/)?.[1] ?? null;
}
var DISCONNECTED_MESSAGE = "This machine was disconnected from your phone.";
function removeLocalLibrary() {
  closeDatabase();
  const dir = getConfigDir();
  const dbPath = loadConfig().dbPath ?? path3.join(dir, "vault.db");
  for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    fs3.rmSync(file, { force: true });
  }
}
async function disconnectMachine(message = DISCONNECTED_MESSAGE) {
  try {
    await wipeAllSecrets();
    removeLocalLibrary();
    const dir = getConfigDir();
    for (const file of ["config.json", "secrets.json"]) {
      fs3.rmSync(path3.join(dir, file), { force: true });
    }
    try {
      fs3.rmdirSync(dir);
    } catch {
    }
  } finally {
    secretsCache = null;
    cachedToken = null;
    state = null;
    process.stderr.write(`${message}
`);
    process.exit(1);
  }
}

// src/core/vault.ts
init_crypto();
init_constants();

// src/core/keyRing.ts
init_crypto();
init_constants();
var LEGACY_SPACE_ID = "__legacy__";
var KeyRingMiss = class extends Error {
  constructor(spaceId, version) {
    super(`No key held for space ${spaceId ?? "(none)"} version ${version ?? "(current)"}`);
    this.spaceId = spaceId;
    this.version = version;
    this.name = "KeyRingMiss";
  }
};
var KeyRing = class _KeyRing {
  spaces = /* @__PURE__ */ new Map();
  personalId = null;
  familyId = null;
  legacyMode = false;
  constructor() {
  }
  get primaryId() {
    return this.familyId ?? this.personalId;
  }
  get primaryKey() {
    const id = this.primaryId;
    return id ? this.spaces.get(id)?.key ?? null : null;
  }
  /** The primary space id as a document should record it; null for the sentinel. */
  get primaryStorageId() {
    const id = this.primaryId;
    return id === null || id === LEGACY_SPACE_ID ? null : id;
  }
  get isLegacy() {
    return this.legacyMode;
  }
  /**
   * No keys at all: a paired machine before its first authenticated call, or
   * one whose every space is Ask. Every lookup misses, which is the point.
   */
  static empty() {
    return new _KeyRing();
  }
  /** The ring before the server has been asked: one key, standing in for everything. */
  static legacy(vaultId, vaultKey) {
    const ring = new _KeyRing();
    const id = vaultId ?? LEGACY_SPACE_ID;
    ring.legacyMode = true;
    ring.personalId = id;
    ring.spaces.set(id, {
      spaceId: id,
      kind: null,
      name: null,
      role: "owner",
      isOwner: true,
      key: vaultKey,
      version: 1
    });
    return ring;
  }
  /** Build from the server's membership rows by opening each sealed envelope. */
  static fromMemberships(rows, identity) {
    const ring = new _KeyRing();
    for (const row of rows) {
      if (!row.wrappedSpaceKey) continue;
      let key;
      try {
        key = openSealed(
          new Uint8Array(row.wrappedSpaceKey),
          identity.privateKey,
          identity.publicKey
        );
      } catch {
        continue;
      }
      if (key.length !== VAULT_KEY_BYTES) continue;
      let prior;
      if (row.priorWrappedSpaceKey && row.priorKeyVersion !== null) {
        try {
          const priorKey = openSealed(
            new Uint8Array(row.priorWrappedSpaceKey),
            identity.privateKey,
            identity.publicKey
          );
          if (priorKey.length === VAULT_KEY_BYTES) {
            prior = { version: row.priorKeyVersion, key: priorKey };
          }
        } catch {
        }
      }
      ring.spaces.set(row.spaceId, {
        spaceId: row.spaceId,
        kind: row.kind,
        name: row.name,
        role: row.role,
        isOwner: row.isOwner,
        key,
        version: row.keyVersion ?? row.spaceKeyVersion ?? 1,
        prior
      });
      if (row.kind === "personal" && row.isOwner) ring.personalId = row.spaceId;
      if (row.kind === "family") ring.familyId = row.spaceId;
    }
    return ring;
  }
  has(spaceId) {
    return this.spaces.has(spaceId);
  }
  roleIn(spaceId) {
    return this.spaces.get(spaceId)?.role ?? null;
  }
  /** Every space held, personal first, then family, then the rest. */
  list() {
    const rank = (e) => e.spaceId === this.personalId ? 0 : e.spaceId === this.familyId ? 1 : 2;
    return [...this.spaces.values()].sort((a, b) => rank(a) - rank(b));
  }
  keyFor(spaceId, version) {
    const id = spaceId ?? this.primaryId;
    if (!id) throw new KeyRingMiss(spaceId ?? null, version ?? null);
    const entry = this.spaces.get(id) ?? (this.legacyMode ? this.spaces.get(this.primaryId) : void 0);
    if (!entry) throw new KeyRingMiss(id, version ?? null);
    const wanted = version ?? entry.version;
    if (wanted === entry.version) return entry.key;
    if (entry.prior && wanted === entry.prior.version) return entry.prior.key;
    throw new KeyRingMiss(id, wanted);
  }
  /**
   * An absent `keyVersion` means 1 — written before rotation existed — and
   * emphatically not "the current version".
   */
  unwrapDocKey(doc) {
    return decrypt(doc.encryptedDocKey, this.keyFor(doc.vaultId, doc.keyVersion ?? 1));
  }
  wrapDocKey(docKey, spaceId) {
    const id = spaceId ?? this.primaryId;
    if (!id) throw new KeyRingMiss(spaceId ?? null, null);
    const entry = this.spaces.get(id);
    if (!entry) throw new KeyRingMiss(id, null);
    return {
      encryptedDocKey: encrypt(docKey, entry.key),
      keyVersion: entry.version,
      spaceId: entry.spaceId === LEGACY_SPACE_ID ? null : entry.spaceId
    };
  }
  zero() {
    for (const entry of this.spaces.values()) {
      entry.key.fill(0);
      entry.prior?.key.fill(0);
    }
    this.spaces.clear();
    this.personalId = null;
    this.familyId = null;
  }
};

// src/core/vault.ts
init_config();
import crypto5 from "crypto";
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
  const secretKey = base64ToBytes(secretKeyB64);
  const salt = base64ToBytes(saltB64);
  const muk = await deriveMUK(masterPassword, secretKey, salt);
  return unlockVaultWithMUK(muk);
}
async function unlockVaultWithMUK(muk) {
  const keychain = getKeychain();
  const wrappedVaultKeyB64 = await keychain.get("wrapped_vault_key");
  if (!wrappedVaultKeyB64) {
    throw new Error("Wrapped vault key not found \u2014 run `vault sync` to fetch vault metadata");
  }
  const vaultKey = decrypt(base64ToBytes(wrappedVaultKeyB64), muk);
  currentKeys = {
    mode: "legacy",
    muk,
    vaultKey,
    identity: null,
    keyRing: KeyRing.legacy(loadConfig().vaultId ?? null, vaultKey)
  };
  return currentKeys;
}
async function unlockWithConnection() {
  const secrets = await loadConnectionSecrets();
  if (!secrets) return null;
  currentKeys = {
    mode: "connection",
    muk: new Uint8Array(0),
    vaultKey: new Uint8Array(0),
    identity: null,
    keyRing: KeyRing.empty(),
    connectionKeyPair: secrets.keyPair
  };
  return currentKeys;
}
async function autoUnlock() {
  if (isVaultUnlocked()) return true;
  if (await unlockWithConnection()) return true;
  const envPassword = process.env.VAULT_MASTER_PASSWORD;
  if (envPassword) {
    await unlockVault(envPassword);
    return true;
  }
  const keychain = getKeychain();
  const mukB64 = await keychain.get("muk");
  if (mukB64) {
    await unlockVaultWithMUK(base64ToBytes(mukB64));
    return true;
  }
  const savedPassword = await keychain.get("master_password");
  if (savedPassword) {
    await unlockVault(savedPassword);
    return true;
  }
  return false;
}
function applyKeyRing(keys, ring, identity) {
  keys.keyRing = ring;
  keys.identity = identity;
  const primary = ring.primaryKey;
  if (primary) keys.vaultKey = primary;
}
function applyConnectionRing(keys, ring) {
  keys.keyRing.zero();
  keys.keyRing = ring;
  keys.vaultKey = ring.primaryKey ?? new Uint8Array(0);
}
function isConnectionSession() {
  return currentKeys?.mode === "connection";
}
function lockVault() {
  if (currentKeys) {
    currentKeys.muk.fill(0);
    currentKeys.vaultKey.fill(0);
    currentKeys.identity?.privateKey.fill(0);
    currentKeys.connectionKeyPair?.privateKey.fill(0);
    currentKeys.keyRing.zero();
    currentKeys = null;
  }
}
function unwrapDocumentKey(wrappedDocKey, doc) {
  return getVaultKeys().keyRing.unwrapDocKey({
    vaultId: doc.vaultId,
    keyVersion: doc.keyVersion,
    encryptedDocKey: wrappedDocKey
  });
}
function wrapDocumentKey(documentKey, spaceId) {
  return getVaultKeys().keyRing.wrapDocKey(documentKey, spaceId);
}
function generateDocumentKey() {
  return new Uint8Array(crypto5.randomBytes(DOCUMENT_KEY_BYTES));
}

// src/core/sync.ts
init_crypto();
import { ConvexHttpClient } from "convex/browser";
init_database();

// src/shared/docPath.ts
var PEOPLE_REGISTRY_BLOB_ID = "__people_registry__";
var PATH_DISPLAY_PREFIX = "vault/";
function normalizePersonLookupKey(name) {
  return name.trim().toUpperCase();
}
function resolveCanonicalName(aliasMap, name) {
  const trimmed = name.trim();
  return aliasMap?.[normalizePersonLookupKey(trimmed)] || trimmed;
}
function buildAliasMap(registry) {
  const aliasMap = {};
  for (const person of registry?.people ?? []) {
    aliasMap[normalizePersonLookupKey(person.canonicalName)] = person.canonicalName;
    for (const alias of person.aliases ?? []) {
      aliasMap[normalizePersonLookupKey(alias)] = person.canonicalName;
    }
  }
  return aliasMap;
}
var SLUG_MAX = 60;
function slug(input) {
  return String(input ?? "").normalize("NFKD").replace(new RegExp("\\p{M}", "gu"), "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, SLUG_MAX).replace(/^-+|-+$/g, "");
}
var EXT_BY_MIME = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/heic": ".heic",
  "image/webp": ".webp",
  "text/markdown": ".md",
  "text/plain": ".txt"
};
function extForMime(mimeType) {
  if (!mimeType) return "";
  return EXT_BY_MIME[mimeType.trim().toLowerCase()] ?? "";
}
function spaceSegment(space) {
  if (!space) return "shared";
  if (space.kind === "personal") return "personal";
  if (space.kind === "family") return "family";
  return slug(space.name) || "shared";
}
function ownerSegment(owner, aliasMap) {
  const trimmed = (owner ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return "unfiled";
  return slug(resolveCanonicalName(aliasMap, trimmed)) || "unfiled";
}
function fileSegment(title, type) {
  return slug(title) || slug(type) || "document";
}
function computeDocPaths(docs, ctx) {
  const staged = [];
  const counts = /* @__PURE__ */ new Map();
  for (const doc of docs) {
    if (doc.id === PEOPLE_REGISTRY_BLOB_ID) continue;
    const space = doc.vaultId ? ctx.spaces[doc.vaultId] : void 0;
    const dir = `${spaceSegment(space)}/${ownerSegment(doc.owner, ctx.aliasMap)}/`;
    const file = fileSegment(doc.title, doc.type);
    const ext = extForMime(doc.mimeType);
    const key = dir + file + ext;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    staged.push({ id: doc.id, dir, file, ext });
  }
  const paths = /* @__PURE__ */ new Map();
  for (const s of staged) {
    const collides = (counts.get(s.dir + s.file + s.ext) ?? 0) > 1;
    const suffix = collides ? `-${s.id.slice(0, 6)}` : "";
    paths.set(s.id, `${s.dir}${s.file}${suffix}${s.ext}`);
  }
  return paths;
}
function displayPath(path8) {
  return PATH_DISPLAY_PREFIX + path8;
}
function normalizePathQuery(input) {
  let p = String(input ?? "").trim().replace(/\\/g, "/");
  p = p.replace(/^\/+/, "");
  if (p === "vault" || p.startsWith(PATH_DISPLAY_PREFIX)) p = p.slice("vault".length);
  return p.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

// src/core/sync.ts
init_config();

// src/core/convexApi.ts
import { anyApi } from "convex/server";
var api = anyApi;

// src/core/sync.ts
var client = null;
var keyRingRefreshed = false;
var ringToken = null;
function getConvexClient() {
  if (client) return client;
  client = guardRevocation(new ConvexHttpClient(CONVEX_URL));
  return client;
}
function guardRevocation(convex) {
  for (const method of ["query", "mutation", "action"]) {
    const original = convex[method].bind(convex);
    convex[method] = async (...args) => {
      try {
        return await original(...args);
      } catch (err) {
        if (isRevocationError(err) && await isConnectionMode()) await disconnectMachine();
        throw err;
      }
    };
  }
  return convex;
}
async function authenticateConvexClient() {
  const convex = getConvexClient();
  if (await isConnectionMode()) {
    const token = await getAgentToken();
    convex.setAuth(token);
    if (isVaultUnlocked() && (!keyRingRefreshed || token !== ringToken)) {
      await refreshKeyRing(convex, getVaultKeys());
      keyRingRefreshed = true;
      ringToken = token;
    }
    return convex;
  }
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
  if (!keyRingRefreshed) {
    keyRingRefreshed = true;
    if (isVaultUnlocked()) {
      try {
        await refreshKeyRing(convex, getVaultKeys());
      } catch {
      }
    }
  }
  return convex;
}
function decryptBlobPayload(blob, keyRing) {
  const docKey = keyRing.unwrapDocKey({
    vaultId: blob.vaultId,
    keyVersion: blob.keyVersion,
    encryptedDocKey: new Uint8Array(blob.encryptedDocKey)
  });
  try {
    return decryptPayloadWithDocKey(blob.encryptedBlob, docKey);
  } finally {
    docKey.fill(0);
  }
}
function decryptPayloadWithDocKey(encryptedBlob, docKey) {
  const bytes = encryptedBlob instanceof Uint8Array ? encryptedBlob : new Uint8Array(encryptedBlob);
  return JSON.parse(new TextDecoder().decode(decrypt(bytes, docKey)));
}
function captureRegistry(blob, metadata) {
  if (blob.blobId !== PEOPLE_REGISTRY_BLOB_ID) return;
  if (!metadata || !Array.isArray(metadata.people)) return;
  try {
    setLocalMeta("people_registry", { people: metadata.people });
  } catch {
  }
}
function payloadToDocument(blob, metadata) {
  const encryptedDocKey = new Uint8Array(blob.encryptedDocKey ?? new ArrayBuffer(0));
  return {
    id: blob.blobId,
    title: metadata.title ?? "Untitled",
    rawText: metadata.rawText,
    markdownContent: metadata.markdownContent,
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
    // The blob column, not the encrypted payload: a document that has been
    // moved between spaces carries the old id inside its own ciphertext.
    vaultId: blob.vaultId ?? metadata.vaultId,
    keyVersion: blob.keyVersion,
    savedBy: metadata.savedBy && typeof metadata.savedBy === "object" ? metadata.savedBy : void 0,
    createdAt: metadata.createdAt ?? blob.updatedAt,
    updatedAt: blob.updatedAt,
    syncStatus: "synced"
  };
}
async function upsertEncryptedBlob(convex, args) {
  const keys = getVaultKeys();
  const wrapped = keys.keyRing.wrapDocKey(args.docKey, args.spaceId);
  const blobBuffer = new ArrayBuffer(args.encryptedBlob.byteLength);
  new Uint8Array(blobBuffer).set(args.encryptedBlob);
  const keyBuffer = new ArrayBuffer(wrapped.encryptedDocKey.byteLength);
  new Uint8Array(keyBuffer).set(wrapped.encryptedDocKey);
  const common = {
    blobId: args.blobId,
    encryptedBlob: blobBuffer,
    encryptedDocKey: keyBuffer,
    blobSize: args.encryptedBlob.length,
    keyVersion: wrapped.keyVersion,
    ...args.addedBy ? { addedBy: args.addedBy } : {}
  };
  if (!wrapped.spaceId && keys.mode === "connection") {
    throw new Error("No space to write to \u2014 this connection has no write access");
  }
  const result = wrapped.spaceId ? await convex.mutation(api.encryptedSync.upsertBlobByVault, {
    vaultId: wrapped.spaceId,
    ...common
  }) : await convex.mutation(api.encryptedSync.upsertBlob, common);
  return { ...wrapped, updatedAt: result?.updatedAt };
}
async function refreshKeyRing(convex, keys) {
  if (keys.mode === "connection") return refreshConnectionRing(convex, keys);
  const meta = await convex.query(api.vaultMeta.getIdentity, {});
  if (!meta?.wrappedPrivateKey || !meta.publicKey) return false;
  let identity;
  try {
    identity = {
      privateKey: decrypt(new Uint8Array(meta.wrappedPrivateKey), keys.muk),
      publicKey: new Uint8Array(meta.publicKey)
    };
  } catch {
    return false;
  }
  keys.identity = identity;
  const rows = await convex.query(api.vaults.getMyMemberships, {});
  const ring = KeyRing.fromMemberships(rows, identity);
  if (ring.spaces.size === 0) return false;
  applyKeyRing(keys, ring, identity);
  if (ring.primaryStorageId) updateConfig({ vaultId: ring.primaryStorageId });
  saveSpaceDirectory(ring.list().map((e) => ({ spaceId: e.spaceId, kind: e.kind, name: e.name })));
  return true;
}
async function refreshConnectionRing(convex, keys) {
  const keyPair = keys.connectionKeyPair;
  if (!keyPair) return false;
  const res = await convex.query(api.agentConnections.getMyEnvelopes, {});
  let manifest = null;
  if (res.sealedManifest) {
    try {
      manifest = openSealedJson(res.sealedManifest, keyPair);
    } catch {
      manifest = null;
    }
  }
  let context = null;
  if (res.sealedContext) {
    try {
      context = openSealedJson(res.sealedContext, keyPair);
    } catch {
      context = null;
    }
  }
  setConnectionState({
    connectionId: res.connectionId,
    preset: res.preset ?? ((res.grants ?? []).length > 0 ? "full" : context ? "standard" : "private"),
    manifest,
    context,
    grants: res.grants ?? []
  });
  if (res.intendedClient !== void 0) adoptIntendedClient(res.intendedClient);
  const ring = KeyRing.fromMemberships(res.rows ?? [], keyPair);
  applyConnectionRing(keys, ring);
  const directory = /* @__PURE__ */ new Map();
  for (const space of manifest?.spaces ?? []) {
    directory.set(space.spaceId, { spaceId: space.spaceId, kind: space.kind, name: space.name });
  }
  for (const entry of ring.list()) {
    directory.set(entry.spaceId, { spaceId: entry.spaceId, kind: entry.kind, name: entry.name });
  }
  saveSpaceDirectory([...directory.values()]);
  try {
    deleteDocumentsOutsideSpaces(ring.list().map((e) => e.spaceId));
  } catch {
  }
  return true;
}
function saveSpaceDirectory(spaces) {
  try {
    setLocalMeta("spaces", spaces);
  } catch {
  }
}
function invalidateKeyRing() {
  keyRingRefreshed = false;
}
function spaceTargets(keys) {
  const keyRing = keys.keyRing;
  if (keys.mode === "connection") return keyRing.list().map((entry) => entry.spaceId);
  if (keyRing.isLegacy) return [keyRing.primaryStorageId ?? void 0];
  const ids = keyRing.list().map((entry) => entry.spaceId);
  return ids.length > 0 ? ids : [void 0];
}
var SYNC_PAGE_SIZE = 20;
async function fetchBlobs(convex, spaceId, since, onPage) {
  const blobs = [];
  let cursor = null;
  for (; ; ) {
    const paginationOpts = { numItems: SYNC_PAGE_SIZE, cursor };
    const result = spaceId ? since === null ? await convex.query(api.encryptedSync.getBlobPageByVault, {
      vaultId: spaceId,
      paginationOpts
    }) : await convex.query(api.encryptedSync.getUpdatedSincePageByVault, {
      vaultId: spaceId,
      since,
      paginationOpts
    }) : since === null ? await convex.query(api.encryptedSync.getBlobPage, { paginationOpts }) : await convex.query(api.encryptedSync.getUpdatedSincePage, {
      since,
      paginationOpts
    });
    blobs.push(...result.page);
    onPage?.(blobs.length);
    if (result.isDone) break;
    cursor = result.continueCursor;
  }
  return blobs;
}
async function syncFull(keys, onProgress) {
  const convex = await authenticateConvexClient();
  onProgress?.({ total: 0, current: 0, phase: "downloading" });
  const blobs = [];
  for (const spaceId of spaceTargets(keys)) {
    blobs.push(
      ...await fetchBlobs(
        convex,
        spaceId,
        null,
        (soFar) => onProgress?.({ total: soFar, current: soFar, phase: "downloading" })
      )
    );
  }
  const total = blobs.length;
  let count = 0;
  const failures = [];
  const database = getDatabase();
  const transaction = database.transaction(() => {
    for (const blob of blobs) {
      try {
        onProgress?.({ total, current: count, phase: "decrypting" });
        const metadata = decryptBlobPayload(blob, keys.keyRing);
        captureRegistry(blob, metadata);
        upsertDocument(payloadToDocument(blob, metadata));
        count++;
        onProgress?.({ total, current: count, phase: "saving" });
      } catch (err) {
        failures.push({ blobId: blob.blobId, error: err.message });
      }
    }
  });
  transaction();
  if (failures.length > 0) {
    const jsonFails = failures.filter((f) => f.error.includes("not valid JSON"));
    const missing = failures.filter((f) => f.error.startsWith("No key held"));
    const authFails = failures.filter((f) => f.error.includes("authenticate data") || f.error.includes("Unsupported state"));
    const otherFails = failures.length - jsonFails.length - missing.length - authFails.length;
    process.stderr.write(`[sync] Skipped ${failures.length} blobs: ${jsonFails.length} non-JSON (avatars), ${missing.length} no key held, ${authFails.length} auth failures, ${otherFails} other
`);
  }
  const latestTimestamp = blobs.reduce((max, b) => Math.max(max, b.updatedAt), 0);
  if (latestTimestamp > 0) {
    updateConfig({ lastSyncTimestamp: latestTimestamp });
  }
  if (keys.mode === "connection") markSpacesSynced(spaceTargets(keys));
  return count;
}
function getLocalMetaSafe(key) {
  try {
    return getLocalMeta(key);
  } catch {
    return null;
  }
}
function markSpacesSynced(spaceIds) {
  try {
    setLocalMeta("synced_spaces", spaceIds.filter((id) => !!id));
  } catch {
  }
}
async function syncIncremental(keys, onProgress) {
  const convex = await authenticateConvexClient();
  const config = loadConfig();
  const since = config.lastSyncTimestamp ?? 0;
  onProgress?.({ total: 0, current: 0, phase: "downloading" });
  const syncedSpaces = new Set(keys.mode === "connection" ? getLocalMetaSafe("synced_spaces") ?? [] : []);
  const blobs = [];
  const targets = spaceTargets(keys);
  for (const spaceId of targets) {
    const spaceSince = keys.mode === "connection" && spaceId && !syncedSpaces.has(spaceId) ? null : since;
    blobs.push(
      ...await fetchBlobs(
        convex,
        spaceId,
        spaceSince,
        (soFar) => onProgress?.({ total: soFar, current: soFar, phase: "downloading" })
      )
    );
  }
  if (keys.mode === "connection") markSpacesSynced(targets);
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
        const metadata = decryptBlobPayload(blob, keys.keyRing);
        captureRegistry(blob, metadata);
        upsertDocument(payloadToDocument(blob, metadata));
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
  if (await isConnectionMode()) return;
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
  if (payload.muk) {
    await keychain.set("muk", payload.muk);
  }
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
async function refreshFromServer() {
  try {
    const attempt = (async () => {
      if (await autoUnlock()) await authenticateConvexClient();
    })();
    await Promise.race([attempt, new Promise((r) => setTimeout(r, 4e3).unref())]);
  } catch {
  }
}
function registerAuthCommands(program2) {
  const auth = program2.command("auth").description("Authentication management");
  auth.command("pair").description("Connect this machine to your phone with a pairing code from the app").argument("<token>", "Pairing code from moi vault \u2192 Settings \u2192 AI agents \u2192 Connect").option("--timeout <minutes>", "How long to wait for approval", "10").option("--agent <key>", `The agent this machine is for: ${CLIENT_KEYS.join(", ")}, or any (default)`).action(async (token, opts) => {
    const isJson = shouldOutputJson(program2.opts());
    const say = (line) => {
      if (isJson) process.stderr.write(`${line}
`);
      else console.log(line);
    };
    let intended;
    try {
      intended = parseIntendedClient(opts.agent);
    } catch (err) {
      const msg = err.message;
      if (isJson) {
        output({ error: msg, code: "UNKNOWN_AGENT" });
      } else {
        console.error(`  \u2717 ${msg}`);
      }
      process.exit(1);
    }
    let pending2;
    try {
      pending2 = await claimPairing(token, generateKeyPair);
    } catch (err) {
      const msg = err.message;
      if (isJson) {
        output({ error: msg, code: err instanceof AgentHttpError ? err.code : null });
      } else {
        console.error(`  \u2717 ${msg}`);
      }
      process.exit(1);
    }
    say("");
    say(`  This machine:  ${pending2.label}`);
    if (intended) say(`  For:           ${intended.display}`);
    say(`  Fingerprint:   ${pending2.fingerprint}`);
    say("");
    say("  Keep the moi vault app open on your phone. If you copied this command,");
    say("  it connects by itself; otherwise approve there when the codes match.");
    say("");
    const timeoutMs = Math.max(1, Number(opts.timeout) || 10) * 60 * 1e3;
    let dots = 0;
    try {
      await waitForApproval(pending2, {
        timeoutMs,
        onTick: () => {
          if (!isJson && process.stdout.isTTY) {
            dots = (dots + 1) % 4;
            process.stdout.write(`\r  Waiting${".".repeat(dots)}${" ".repeat(3 - dots)}`);
          }
        }
      });
    } catch (err) {
      if (!isJson && process.stdout.isTTY) process.stdout.write("\r");
      const msg = err.message;
      if (isJson) {
        output({ error: msg, code: err instanceof AgentHttpError ? err.code : null });
      } else {
        console.error(`  \u2717 ${msg}`);
      }
      process.exit(1);
    }
    await storePairing(pending2, intended?.key);
    if (!isJson && process.stdout.isTTY) process.stdout.write("\r            \r");
    if (isJson) {
      output({ status: "paired", connectionId: pending2.connectionId, fingerprint: pending2.fingerprint, label: pending2.label, intendedClient: intended?.key ?? null });
    } else {
      console.log("  \u2713 Connected. This machine sees only what you allowed on your phone.");
      console.log("    Revoke it any time from the app: Settings \u2192 AI agents.");
      console.log("");
      console.log("  Next: moivault sync");
    }
  });
  auth.command("login").description("Log in via QR code from Vault mobile app").option("--payload <json>", "Paste login payload JSON directly (skip QR)").option("--cookie <cookie>", "Session cookie string (for scripted setup)").option("--secret-key <key>", "Secret key base64").option("--salt <salt>", "Salt base64").option("--wrapped-key <key>", "Wrapped vault key base64").option("--muk <key>", "Master unlock key base64 \u2014 unlocks without a password").option("--vault-id <id>", "Vault ID").action(async (opts) => {
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
        muk: opts.muk,
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
  auth.command("logout").description("Clear all credentials from this machine (revoke from your phone to cut access server-side)").action(async () => {
    const keychain = getKeychain();
    const wasPaired = !!await loadConnectionSecrets();
    await keychain.delete("connection_id");
    await keychain.delete("credential");
    await keychain.delete("conn_private_key");
    await keychain.delete("conn_public_key");
    await keychain.delete("serve_secret");
    if (wasPaired) {
      const { connection: _connection, ...rest } = loadConfig();
      saveConfig(rest);
    }
    await keychain.delete("session_cookie");
    await keychain.delete("secret_key");
    await keychain.delete("salt");
    await keychain.delete("wrapped_vault_key");
    await keychain.delete("muk");
    await keychain.delete("master_password");
    if (shouldOutputJson(program2.opts())) {
      output({ status: "logged_out", revokeOnPhone: wasPaired });
    } else {
      console.log("Logged out. All credentials cleared from this machine.");
      if (wasPaired) {
        console.log("The connection still shows on your phone until you revoke it there: Settings \u2192 AI agents.");
      }
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
    const connection = await loadConnectionSecrets();
    if (connection) {
      await refreshFromServer();
      const config2 = loadConfig();
      const status2 = {
        mode: "connection",
        connectionId: connection.connectionId,
        label: config2.connection?.label ?? null,
        intendedClient: config2.connection?.intendedClient ?? null,
        fingerprint: fingerprint(connection.keyPair.publicKey),
        pairedAt: config2.connection?.pairedAt ? new Date(config2.connection.pairedAt).toISOString() : null,
        lastSeenAt: config2.lastSeenAt ? new Date(config2.lastSeenAt).toISOString() : null,
        secretStore: getKeychainBackendName(),
        convexUrl: CONVEX_URL,
        lastSync: config2.lastSyncTimestamp ? new Date(config2.lastSyncTimestamp).toISOString() : null
      };
      if (shouldOutputJson(program2.opts())) {
        output(status2);
      } else {
        console.log(`  Mode:              agent connection (revocable from your phone)`);
        console.log(`  Machine:           ${status2.label ?? "unknown"}`);
        console.log(`  For:               ${status2.intendedClient ? clientDisplay(status2.intendedClient) : "any agent on this machine"}`);
        console.log(`  Fingerprint:       ${status2.fingerprint}`);
        console.log(`  Paired:            ${status2.pairedAt ?? "unknown"}`);
        console.log(`  Last token:        ${status2.lastSeenAt ?? "never"}`);
        console.log(`  Secrets stored in: ${status2.secretStore}`);
        console.log(`  Last sync:         ${status2.lastSync ?? "never"}`);
      }
      return;
    }
    const config = loadConfig();
    const hasToken = !!await keychain.get("session_cookie");
    const hasSecretKey = !!await keychain.get("secret_key");
    const hasSalt = !!await keychain.get("salt");
    const hasWrappedKey = !!await keychain.get("wrapped_vault_key");
    const hasMuk = !!await keychain.get("muk");
    const hasSavedPassword = !!await keychain.get("master_password");
    const status = {
      mode: hasToken ? "legacy" : "none",
      authenticated: hasToken,
      secretKeyImported: hasSecretKey,
      vaultMetaSynced: hasSalt && hasWrappedKey,
      readyToUnlock: hasToken && hasSecretKey && hasSalt && hasWrappedKey,
      autoUnlock: hasMuk ? "linked key" : hasSavedPassword ? "saved password" : "none",
      convexUrl: CONVEX_URL,
      vaultId: config.vaultId ?? null,
      lastSync: config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toISOString() : null,
      secretStore: getKeychainBackendName()
    };
    if (shouldOutputJson(program2.opts())) {
      output(status);
    } else {
      console.log(`  Mode:              ${hasToken ? "legacy install (not revocable \u2014 reconnect with `moivault auth pair`)" : "not connected"}`);
      console.log(`  Authenticated:     ${hasToken ? "yes" : "no"}`);
      console.log(`  Secret key:        ${hasSecretKey ? "imported" : "not set"}`);
      console.log(`  Vault metadata:    ${hasSalt && hasWrappedKey ? "synced" : "not synced"}`);
      console.log(`  Ready to unlock:   ${status.readyToUnlock ? "yes" : "no"}`);
      console.log(`  Auto-unlock:       ${status.autoUnlock}`);
      console.log(`  Convex URL:        ${CONVEX_URL}`);
      console.log(`  Vault ID:          ${config.vaultId ?? "not set"}`);
      console.log(`  Last sync:         ${config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toISOString() : "never"}`);
      console.log(`  Secrets stored in: ${status.secretStore}`);
    }
  });
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
    try {
      if (await autoUnlock()) {
        openDatabase(program2.opts().db);
        if (isJson) {
          output({ status: "unlocked", method: "linked_key" });
        } else {
          console.log("Vault unlocked.");
        }
        return;
      }
    } catch (err) {
      const message = err.message;
      if (!isJson) console.error(`Stored key did not open the vault: ${message}`);
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
    const keys = getVaultKeys();
    const config = loadConfig();
    try {
      await fetchAndStoreVaultMeta(config.vaultId);
    } catch {
    }
    const startTime = Date.now();
    if (opts.full || !config.lastSyncTimestamp) {
      if (!isJson) process.stderr.write("Syncing all documents...\n");
      const count = await syncFull(keys, (progress) => {
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
      const { count, deleted } = await syncIncremental(keys, (progress) => {
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

// src/cli/commands/spaces.ts
function registerSpacesCommand(program2) {
  program2.command("spaces").description("List the spaces this machine holds keys for").action(async () => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      const msg = "Vault is locked \u2014 run `moivault unlock` first";
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(msg);
      }
      process.exit(1);
    }
    const keys = getVaultKeys();
    if (keys.mode === "connection") {
      try {
        await authenticateConvexClient();
      } catch (err) {
        const msg = `Could not reach the server: ${err.message}`;
        if (isJson) {
          output({ error: msg });
        } else {
          console.error(msg);
        }
        process.exit(1);
      }
      const grants = new Map((getConnectionState()?.grants ?? []).map((g) => [g.spaceId, g]));
      const full = keys.keyRing.list().map((e) => ({ spaceId: e.spaceId, name: e.name, kind: e.kind, keyVersion: e.version, canWrite: grants.get(e.spaceId)?.canWrite ?? false, canDelete: grants.get(e.spaceId)?.canDelete === true }));
      const preset = getPreset();
      const cardDocs = getContextCard()?.docs.length ?? null;
      const heldIds2 = new Set(full.map((f) => f.spaceId));
      const ask = (getManifest()?.spaces ?? []).filter((s) => !heldIds2.has(s.spaceId)).map((s) => ({ spaceId: s.spaceId, name: s.name, kind: s.kind }));
      const intended = intendedClient();
      if (isJson) {
        output({ mode: "connection", preset, intendedClient: intended?.key ?? null, contextCardDocuments: cardDocs, full, ask });
        return;
      }
      const presetLine = {
        full: "Full \u2014 spaces below sync here; creates and edits go through, deletes are proposed unless allowed",
        standard: `Standard \u2014 titles, types and dates only${cardDocs !== null ? ` (${cardDocs} documents on the context card)` : ""}; contents on request`,
        private: "Private \u2014 nothing until you approve a request"
      };
      console.log(`For:    ${intended?.display ?? "any agent on this machine"}`);
      console.log(`Preset: ${presetLine[preset ?? "private"]}
`);
      console.log("Shared in full (synced to this machine):");
      if (full.length === 0) console.log("  none \u2014 this machine starts with nothing and asks as it goes");
      for (const s of full) console.log(`  ${s.name ?? s.spaceId} \u2014 ${s.kind ?? "space"}${s.canWrite ? ", can write" : ", read only"}${s.canDelete ? ", can delete" : ""}`);
      if (ask.length > 0) {
        console.log("\nAsk first (approved on your phone, per request):");
        for (const s of ask) console.log(`  ${s.name ?? s.spaceId} \u2014 ${s.kind ?? "space"}`);
      }
      return;
    }
    let serverSpaces = [];
    try {
      const convex = await authenticateConvexClient();
      serverSpaces = await convex.query(api.vaults.getMyMemberships, {});
    } catch {
    }
    const held = keys.keyRing.list().map((entry) => ({
      spaceId: entry.spaceId,
      name: entry.name,
      kind: entry.kind,
      role: entry.role,
      keyVersion: entry.version,
      hasPriorKey: !!entry.prior
    }));
    const heldIds = new Set(held.map((h) => h.spaceId));
    const unopened = serverSpaces.filter((s) => s.kind !== null && !heldIds.has(s.spaceId)).map((s) => ({ spaceId: s.spaceId, name: s.name, kind: s.kind }));
    const payload = {
      migrated: !keys.keyRing.isLegacy,
      hasIdentity: !!keys.identity,
      primarySpaceId: keys.keyRing.primaryStorageId,
      personalSpaceId: keys.keyRing.personalId,
      familySpaceId: keys.keyRing.familyId,
      spaces: held,
      unopened
    };
    if (isJson) {
      output(payload);
      return;
    }
    if (!payload.migrated) {
      console.log("Not migrated to spaces yet \u2014 using the single vault key.");
      console.log("Open the app once to migrate; this will fill in afterwards.\n");
    }
    console.log(`Identity: ${payload.hasIdentity ? "present" : "none"}`);
    for (const space of held) {
      const label = space.name ?? space.spaceId;
      const kind = space.kind ?? "legacy";
      const primary = space.spaceId === keys.keyRing.primaryId ? "  (primary)" : "";
      console.log(`  ${label} \u2014 ${kind}, ${space.role}, key v${space.keyVersion}${primary}`);
    }
    if (unopened.length > 0) {
      console.log("\nListed by the server but not openable here:");
      for (const space of unopened) {
        console.log(`  ${space.name ?? space.spaceId} (${space.kind ?? "unknown"})`);
      }
      console.log("Open the app on this account to publish a key for this machine.");
    }
  });
}

// src/cli/commands/doc.ts
init_database();
import fs5 from "fs";
import path5 from "path";
import os5 from "os";
import crypto6 from "crypto";
init_crypto();

// src/core/thumbnail.ts
import { spawn } from "child_process";
import { createRequire } from "module";
import fs4 from "fs";
import path4 from "path";
import os3 from "os";
var MAX_SIDE = 720;
var JPEG_QUALITY = 82;
function canHaveThumbnail(mimeType) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}
async function generateThumbnail(filePath, mimeType) {
  if (!canHaveThumbnail(mimeType)) {
    return { status: "skipped", reason: `no thumbnail for ${mimeType}` };
  }
  const failures = [];
  try {
    const bytes = mimeType === "application/pdf" ? await renderPdfFirstPage(filePath) : await renderImage(filePath);
    return { status: "ready", bytes, mimeType: "image/jpeg", renderer: "bundled" };
  } catch (err) {
    failures.push(`bundled renderer: ${err.message}`);
  }
  if (process.platform === "darwin") {
    try {
      const bytes = await renderWithMacTools(filePath, mimeType);
      return { status: "ready", bytes, mimeType: "image/jpeg", renderer: "macos" };
    } catch (err) {
      failures.push(`macOS tools: ${err.message}`);
    }
  }
  return { status: "skipped", reason: failures.join("; ") };
}
async function renderPdfFirstPage(filePath) {
  const { createCanvas } = await import("@napi-rs/canvas");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const assets = pdfjsAssetDir();
  const data = new Uint8Array(await fs4.promises.readFile(filePath));
  const pdf = await pdfjs.getDocument({
    data,
    disableFontFace: true,
    verbosity: 0,
    // Without these, a PDF that leans on the standard 14 fonts or on CJK
    // character maps renders with missing text.
    standardFontDataUrl: path4.join(assets, "standard_fonts") + path4.sep,
    cMapUrl: path4.join(assets, "cmaps") + path4.sep,
    cMapPacked: true
  }).promise;
  try {
    const page = await pdf.getPage(1);
    const natural = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: MAX_SIDE / Math.max(natural.width, natural.height) });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return new Uint8Array(await canvas.encode("jpeg", JPEG_QUALITY));
  } finally {
    await pdf.destroy();
  }
}
async function renderImage(filePath) {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(await fs4.promises.readFile(filePath));
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const canvas = createCanvas(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Uint8Array(await canvas.encode("jpeg", JPEG_QUALITY));
}
function pdfjsAssetDir() {
  const require2 = createRequire(import.meta.url);
  return path4.dirname(require2.resolve("pdfjs-dist/package.json"));
}
async function renderWithMacTools(filePath, mimeType) {
  const tmpDir = await fs4.promises.mkdtemp(path4.join(os3.tmpdir(), "vault-thumb-"));
  const destJpeg = path4.join(tmpDir, "thumb.jpg");
  try {
    if (mimeType === "application/pdf") {
      await runCommand("qlmanage", ["-t", "-s", String(MAX_SIDE), "-o", tmpDir, filePath]);
      const png = (await fs4.promises.readdir(tmpDir)).find((f) => f.endsWith(".png"));
      if (!png) throw new Error("qlmanage produced no image");
      await runCommand("sips", ["-s", "format", "jpeg", path4.join(tmpDir, png), "--out", destJpeg]);
    } else {
      await runCommand("sips", ["-Z", String(MAX_SIDE), "-s", "format", "jpeg", filePath, "--out", destJpeg]);
    }
    return new Uint8Array(await fs4.promises.readFile(destJpeg));
  } finally {
    await fs4.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {
    });
  }
}
function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "ignore" });
    proc.on("error", reject);
    proc.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)));
  });
}

// src/core/preview.ts
init_crypto();
init_database();
async function attachPreview(convex, args) {
  const { docId, vaultId, docKey, localDoc, filePath, mimeType } = args;
  if (!canHaveThumbnail(mimeType)) return "none";
  const thumb = await generateThumbnail(filePath, mimeType);
  if (thumb.status === "skipped") return `skipped: ${thumb.reason}`;
  try {
    const encryptedThumbBytes = encrypt(thumb.bytes, docKey);
    const previewUploadInfo = await convex.action(api.r2Assets.requestPreviewUploadUrl, {
      blobId: docId,
      vaultId,
      mimeType: "application/octet-stream",
      size: encryptedThumbBytes.length
    });
    const previewResp = await fetch(previewUploadInfo.url, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: encryptedThumbBytes
    });
    if (!previewResp.ok) throw new Error(`R2 preview upload failed: ${previewResp.status}`);
    await convex.mutation(api.r2Assets.patchPreviewAssetRef, {
      blobId: docId,
      vaultId,
      provider: "r2",
      key: previewUploadInfo.key,
      mimeType: thumb.mimeType,
      size: encryptedThumbBytes.length,
      version: 1,
      status: "ready"
    });
    localDoc.previewAssetProvider = "r2";
    localDoc.previewAssetKey = previewUploadInfo.key;
    localDoc.previewAssetMimeType = thumb.mimeType;
    localDoc.previewAssetSize = encryptedThumbBytes.length;
    localDoc.previewAssetVersion = 1;
    localDoc.previewAssetStatus = "ready";
    upsertDocument(localDoc);
    return "ready";
  } catch (err) {
    return `skipped: ${err.message}`;
  }
}

// src/cli/commands/doc.ts
init_database();
init_config();

// src/core/writes.ts
init_crypto();
import os4 from "os";
init_config();
function buildDocPayload(doc, extras = {}) {
  return {
    title: doc.title,
    rawText: doc.rawText,
    markdownContent: doc.markdownContent,
    type: doc.type,
    tags: doc.tags,
    fields: doc.fields,
    organizations: doc.organizations,
    mentions: doc.mentions,
    owner: doc.owner,
    embedding: doc.embedding ? Array.from(doc.embedding) : null,
    mimeType: doc.mimeType,
    encryptedStorageId: doc.encryptedStorageId,
    storageId: doc.encryptedStorageId ? void 0 : doc.storageId,
    dateAdded: doc.dateAdded,
    savedBy: doc.savedBy,
    ...extras
  };
}
function savedByNow(client2) {
  return {
    client: client2.key,
    connectionLabel: loadConfig().connection?.label ?? os4.hostname().replace(/\.local$/, ""),
    at: Date.now()
  };
}
function writeGoesDirect(spaceId, isNew) {
  const keys = getVaultKeys();
  if (keys.mode !== "connection") return true;
  return isNew ? writableSpaceForNewDoc(spaceId) !== null : canWriteSpace(spaceId);
}
function spaceForNewDoc() {
  const keys = getVaultKeys();
  if (keys.mode !== "connection") return void 0;
  return writableSpaceForNewDoc() ?? void 0;
}
async function commitDocWrite(w) {
  const keys = getVaultKeys();
  const encryptedBlob = encrypt(new TextEncoder().encode(JSON.stringify(w.payload)), w.docKey);
  if (keys.mode !== "connection") {
    const wrapped = await upsertEncryptedBlob(w.convex, {
      blobId: w.blobId,
      docKey: w.docKey,
      encryptedBlob,
      spaceId: w.spaceId
    });
    return { status: "written", ...wrapped };
  }
  const target = w.isNew ? writableSpaceForNewDoc(w.spaceId) : canWriteSpace(w.spaceId) ? w.spaceId : null;
  if (target) {
    try {
      const wrapped = await upsertEncryptedBlob(w.convex, {
        blobId: w.blobId,
        docKey: w.docKey,
        encryptedBlob,
        spaceId: target
      });
      return { status: "written", ...wrapped };
    } catch (err) {
      if (agentErrorCode(err) !== "AGENT_NOT_GRANTED") throw err;
    }
  }
  const dropPayload = {
    ...w.payload,
    id: w.blobId,
    ...w.isNew && w.dropFile ? { dropFile: w.dropFile } : {}
  };
  const dropBlob = encrypt(new TextEncoder().encode(JSON.stringify(dropPayload)), w.docKey);
  const result = await w.convex.mutation(api.agentDrops.create, {
    client: w.client.key,
    kind: w.isNew ? "create" : "edit",
    ...w.isNew ? {} : { targetBlobId: w.blobId, ...w.spaceId ? { targetVaultId: w.spaceId } : {} },
    encryptedBlob: toArrayBuffer(dropBlob),
    // Named to the server too, so it can delete the staged ciphertext itself
    // when the drop is denied or expires, even if this process is gone by then.
    ...w.isNew && w.dropFile ? { stagedStorageId: w.dropFile.storageId } : {},
    sealedDocKey: sealBytesToUser(w.docKey),
    sealedReason: sealJsonToUser({
      reason: w.reason ?? w.summary,
      client: w.client.key,
      tool: w.tool,
      summary: w.summary
    })
  });
  return { status: "pending_approval", requestId: result.requestId, dropId: result.dropId };
}
async function commitDelete(args) {
  const keys = getVaultKeys();
  const { doc } = args;
  if (keys.mode !== "connection" || canDeleteSpace(doc.vaultId)) {
    await args.convex.mutation(api.encryptedSync.deleteBlob, {
      blobId: doc.id,
      ...doc.vaultId ? { vaultId: doc.vaultId } : {}
    });
    return { status: "deleted" };
  }
  const summary = `Delete "${doc.title}"`;
  const result = await args.convex.mutation(api.agentDrops.create, {
    client: args.client.key,
    kind: "delete",
    targetBlobId: doc.id,
    ...doc.vaultId ? { targetVaultId: doc.vaultId } : {},
    sealedReason: sealJsonToUser({ reason: args.reason ?? summary, client: args.client.key, tool: args.tool, summary })
  });
  return { status: "pending_approval", requestId: result.requestId, dropId: result.dropId };
}
var PENDING_APPROVAL_MESSAGE = "Proposed on the user's phone. Nothing is saved until they approve it \u2014 check with vault_request_status.";

// src/cli/commands/doc.ts
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
async function requireDirectWrite(isJson, spaceId, isNew) {
  if (!isConnectionSession()) return;
  await authenticateConvexClient();
  if (writeGoesDirect(spaceId, isNew)) return;
  const msg = "This machine cannot write there without your approval. Allow writes for that space in the app (Settings \u2192 AI agents), or let your agent propose it through the moivault MCP tools.";
  if (isJson) {
    output({ error: msg, code: "NEEDS_APPROVAL" });
  } else {
    console.error(msg);
  }
  process.exit(1);
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
    await requireDirectWrite(isJson, document.vaultId, false);
    try {
      const dbField = field === "content" ? "markdownContent" : field;
      updateDocumentField(id, dbField, dbField === "tags" ? value.split(",").map((t) => t.trim()) : value);
      const updatedDoc = getDocumentById(id);
      const { vaultKey } = getVaultKeys();
      let docKey;
      if (updatedDoc.encryptedDocKey) {
        docKey = unwrapDocumentKey(updatedDoc.encryptedDocKey, updatedDoc);
      } else {
        docKey = generateDocumentKey();
      }
      const config = loadConfig();
      const docContent = JSON.stringify({
        title: updatedDoc.title,
        rawText: updatedDoc.rawText,
        markdownContent: updatedDoc.markdownContent,
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
        dateAdded: updatedDoc.dateAdded,
        savedBy: updatedDoc.savedBy
      });
      const encryptedBlob = encrypt(new TextEncoder().encode(docContent), docKey);
      const wrapped = wrapDocumentKey(docKey, updatedDoc.vaultId);
      const wrappedDocKey = wrapped.encryptedDocKey;
      const blobBuffer = new ArrayBuffer(encryptedBlob.byteLength);
      new Uint8Array(blobBuffer).set(encryptedBlob);
      const keyBuffer = new ArrayBuffer(wrappedDocKey.byteLength);
      new Uint8Array(keyBuffer).set(new Uint8Array(wrappedDocKey));
      const convex = await authenticateConvexClient();
      const vaultId = wrapped.spaceId ?? void 0;
      if (wrapped.spaceId) {
        await convex.mutation(api.encryptedSync.upsertBlobByVault, {
          vaultId: wrapped.spaceId,
          blobId: id,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length,
          keyVersion: wrapped.keyVersion
        });
      } else {
        await convex.mutation(api.encryptedSync.upsertBlob, {
          blobId: id,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length,
          keyVersion: wrapped.keyVersion
        });
      }
      upsertDocument({ ...updatedDoc, encryptedDocKey: wrappedDocKey, keyVersion: wrapped.keyVersion, syncStatus: "synced" });
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
      const outcome = await commitDelete({ convex, doc: document, client: detectClientFromEnv(), tool: "cli:doc delete" });
      if (outcome.status === "pending_approval") {
        if (isJson) {
          output({ status: "pending_approval", requestId: outcome.requestId, id, message: PENDING_APPROVAL_MESSAGE });
        } else {
          console.log(`Asked on your phone to delete "${document.title}". Nothing is deleted until you approve.`);
        }
        return;
      }
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
        const docKey = unwrapDocumentKey(document.encryptedDocKey, document);
        fileBytes = decrypt(rawBytes, docKey);
        docKey.fill(0);
      } else {
        fileBytes = rawBytes;
      }
      const ext = document.mimeType ? { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[document.mimeType] ?? "bin" : "bin";
      const safeName = (document.title || "document").replace(/[/\\:*?"<>|]/g, "_");
      const outputPath = opts.output || path5.join(os5.homedir(), "Downloads", `${safeName}.${ext}`);
      const dir = path5.dirname(outputPath);
      if (!fs5.existsSync(dir)) fs5.mkdirSync(dir, { recursive: true });
      fs5.writeFileSync(outputPath, fileBytes);
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
  doc.command("preview").description("Make the thumbnail the phone shows for a document that has none (or --force to redo it)").argument("[ids...]", "Document ID(s)").option("--missing", "Every document that has a file but no thumbnail").option("--force", "Regenerate even if a thumbnail already exists").action(async (ids, opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    let targets;
    if (opts.missing) {
      targets = getAllDocuments().filter(
        (d) => !!d.fileAssetKey && !d.previewAssetKey && !!d.mimeType && canHaveThumbnail(d.mimeType)
      );
    } else {
      targets = [];
      for (const id of ids) {
        const found = getDocumentById(id);
        if (!found) {
          if (isJson) {
            output({ error: "Document not found", id });
          } else {
            console.error(`Document not found: ${id}`);
          }
          process.exit(1);
        }
        targets.push(found);
      }
    }
    if (targets.length === 0) {
      const msg = opts.missing ? "Every document with a file already has a thumbnail." : "Give a document ID, or --missing.";
      if (isJson) {
        output({ status: "nothing_to_do", message: msg, results: [] });
      } else {
        console.log(msg);
      }
      return;
    }
    const convex = await authenticateConvexClient();
    const config = loadConfig();
    const results = [];
    for (const document of targets) {
      const report = (preview) => {
        results.push({ id: document.id, title: document.title, preview });
        if (!isJson) console.log(`${preview === "ready" ? "\x1B[32m\u2713\x1B[0m" : "\u2013"} ${document.title}: ${preview}`);
      };
      if (document.previewAssetKey && !opts.force) {
        report("already has one");
        continue;
      }
      if (!document.fileAssetKey || !document.encryptedDocKey) {
        report("skipped: no file stored for this document");
        continue;
      }
      if (!document.mimeType || !canHaveThumbnail(document.mimeType)) {
        report("none");
        continue;
      }
      if (isConnectionSession() && !writeGoesDirect(document.vaultId, false)) {
        report("skipped: this machine cannot write to that space without approval");
        continue;
      }
      const spaceId = document.vaultId ?? config.vaultId ?? void 0;
      const ext = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" }[document.mimeType] ?? "bin";
      const tmpDir = fs5.mkdtempSync(path5.join(os5.tmpdir(), "vault-preview-"));
      const tmpFile = path5.join(tmpDir, `file.${ext}`);
      let docKey = null;
      try {
        const downloadInfo = await convex.action(api.r2Assets.requestFileDownloadUrl, {
          blobId: document.id,
          vaultId: spaceId
        });
        const response = await fetch(downloadInfo.url);
        if (!response.ok) throw new Error(`download failed: ${response.status}`);
        docKey = unwrapDocumentKey(document.encryptedDocKey, document);
        const fileBytes = decrypt(new Uint8Array(await response.arrayBuffer()), docKey);
        fs5.writeFileSync(tmpFile, fileBytes);
        report(await attachPreview(convex, {
          docId: document.id,
          vaultId: spaceId,
          docKey,
          localDoc: document,
          filePath: tmpFile,
          mimeType: document.mimeType
        }));
      } catch (err) {
        report(`skipped: ${err.message}`);
      } finally {
        docKey?.fill(0);
        fs5.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
    if (isJson) output({ status: "done", results });
  });
  doc.command("create").description("Create a text/markdown document in the vault").requiredOption("--title <title>", "Document title").option("--content <content>", "Inline markdown content").option("--file <path>", "Read content from .txt/.md file").option("--type <type>", "Force document type (default: auto-classify)").option("--tags <tags>", "Comma-separated tags").action(async (opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    await requireDirectWrite(isJson, void 0, true);
    try {
      let content;
      if (opts.content) {
        content = opts.content;
      } else if (opts.file) {
        const filePath = path5.resolve(opts.file);
        if (!fs5.existsSync(filePath)) {
          const msg = `File not found: ${filePath}`;
          if (isJson) {
            output({ error: msg });
          } else {
            console.error(msg);
          }
          process.exit(1);
        }
        content = fs5.readFileSync(filePath, "utf-8");
      } else if (!process.stdin.isTTY) {
        const chunks = [];
        for await (const chunk of process.stdin) chunks.push(chunk);
        content = Buffer.concat(chunks).toString("utf-8");
      } else {
        const msg = "No content provided \u2014 use --content, --file, or pipe via stdin";
        if (isJson) {
          output({ error: msg });
        } else {
          console.error(msg);
        }
        process.exit(1);
      }
      const contentBytes = new TextEncoder().encode(content);
      if (contentBytes.byteLength > 200 * 1024) {
        const msg = "Content exceeds 200KB limit";
        if (isJson) {
          output({ error: msg });
        } else {
          console.error(msg);
        }
        process.exit(1);
      }
      const hash = crypto6.createHash("sha256").update(contentBytes).digest("hex");
      const docId = hash;
      const existingDoc = getDocumentById(docId);
      if (existingDoc) {
        if (isJson) {
          output({ status: "duplicate", id: docId, title: existingDoc.title });
        } else {
          console.log(`Document already exists: ${existingDoc.title} (${docId.slice(0, 8)})`);
        }
        return;
      }
      const convex = await authenticateConvexClient();
      if (!isJson) process.stderr.write("Analyzing with Gemini...\n");
      const extracted = await convex.action(api.proxy.processText, {
        textContent: content,
        fileName: opts.title
      });
      if (opts.type) extracted.type = opts.type;
      if (opts.tags) {
        const extraTags = opts.tags.split(",").map((t) => t.trim()).filter(Boolean);
        extracted.tags = [.../* @__PURE__ */ new Set([...extracted.tags || [], ...extraTags])];
      }
      if (!isJson) process.stderr.write("Encrypting...\n");
      const { vaultKey } = getVaultKeys();
      const docKey = generateDocumentKey();
      const wrapped = wrapDocumentKey(docKey, spaceForNewDoc());
      const wrappedDocKey = wrapped.encryptedDocKey;
      const now = Date.now();
      const config = loadConfig();
      const vaultId = wrapped.spaceId ?? void 0;
      const localDoc = {
        id: docId,
        title: opts.title,
        rawText: extracted.rawText || content,
        markdownContent: content,
        type: extracted.type || "note",
        tags: extracted.tags || [],
        fields: extracted.fields || {},
        organizations: extracted.organizations || [],
        mentions: extracted.mentions || [],
        embedding: extracted.embedding || void 0,
        owner: extracted.owner || "Unknown",
        mimeType: "text/markdown",
        encryptedDocKey: wrappedDocKey,
        vaultId: wrapped.spaceId ?? void 0,
        keyVersion: wrapped.keyVersion,
        dateAdded: (/* @__PURE__ */ new Date()).toISOString(),
        status: "ready",
        savedBy: savedByNow(detectClientFromEnv()),
        createdAt: now,
        updatedAt: now,
        syncStatus: "synced"
      };
      const docContent = JSON.stringify({
        title: localDoc.title,
        rawText: localDoc.rawText,
        markdownContent: content,
        type: localDoc.type,
        tags: localDoc.tags,
        fields: localDoc.fields,
        organizations: localDoc.organizations,
        mentions: localDoc.mentions,
        owner: localDoc.owner,
        embedding: extracted.embedding || null,
        mimeType: "text/markdown",
        dateAdded: localDoc.dateAdded,
        savedBy: localDoc.savedBy
      });
      const encryptedBlob = encrypt(new TextEncoder().encode(docContent), docKey);
      const blobBuffer = new ArrayBuffer(encryptedBlob.byteLength);
      new Uint8Array(blobBuffer).set(encryptedBlob);
      const keyBuffer = new ArrayBuffer(wrappedDocKey.byteLength);
      new Uint8Array(keyBuffer).set(new Uint8Array(wrappedDocKey));
      if (wrapped.spaceId) {
        await convex.mutation(api.encryptedSync.upsertBlobByVault, {
          vaultId: wrapped.spaceId,
          blobId: docId,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length,
          keyVersion: wrapped.keyVersion
        });
      } else {
        await convex.mutation(api.encryptedSync.upsertBlob, {
          blobId: docId,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length,
          keyVersion: wrapped.keyVersion
        });
      }
      upsertDocument(localDoc);
      docKey.fill(0);
      const result = {
        status: "created",
        id: docId,
        title: localDoc.title,
        type: localDoc.type,
        tags: localDoc.tags,
        owner: localDoc.owner,
        hasEmbedding: !!(extracted.embedding && extracted.embedding.length > 0)
      };
      if (isJson) {
        output(result);
      } else {
        console.log(`\x1B[32m\u2713\x1B[0m \x1B[1m${localDoc.title}\x1B[0m`);
        console.log(`  ID: ${docId.slice(0, 8)}  Type: ${localDoc.type}  Owner: ${localDoc.owner}`);
        console.log(`  Tags: ${localDoc.tags.join(", ")}`);
      }
    } catch (err) {
      const msg = err.message;
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(`Create failed: ${msg}`);
      }
      process.exit(1);
    }
  });
  doc.command("update-content").description("Replace markdown content of a document").argument("<id>", "Document ID").option("--content <content>", "New inline markdown content").option("--file <path>", "Read new content from file").action(async (id, opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    let content;
    try {
      if (opts.content) {
        content = opts.content;
      } else if (opts.file) {
        const filePath = path5.resolve(opts.file);
        if (!fs5.existsSync(filePath)) {
          const msg = `File not found: ${filePath}`;
          if (isJson) {
            output({ error: msg });
          } else {
            console.error(msg);
          }
          process.exit(1);
        }
        content = fs5.readFileSync(filePath, "utf-8");
      } else if (!process.stdin.isTTY) {
        const chunks = [];
        for await (const chunk of process.stdin) chunks.push(chunk);
        content = Buffer.concat(chunks).toString("utf-8");
      } else {
        const msg = "No content provided \u2014 use --content, --file, or pipe via stdin";
        if (isJson) {
          output({ error: msg });
        } else {
          console.error(msg);
        }
        process.exit(1);
      }
      const contentBytes = new TextEncoder().encode(content);
      if (contentBytes.byteLength > 200 * 1024) {
        const msg = "Content exceeds 200KB limit";
        if (isJson) {
          output({ error: msg });
        } else {
          console.error(msg);
        }
        process.exit(1);
      }
      const localDoc = getDocumentById(id);
      if (!localDoc) {
        if (isJson) {
          output({ error: "Document not found", id });
        } else {
          console.error(`Document not found: ${id}`);
        }
        process.exit(1);
      }
      await requireDirectWrite(isJson, localDoc.vaultId, false);
      const convex = await authenticateConvexClient();
      if (!isJson) process.stderr.write("Analyzing with Gemini...\n");
      const extracted = await convex.action(api.proxy.processText, {
        textContent: content,
        fileName: localDoc.title
      });
      const now = Date.now();
      const updatedDoc = {
        ...localDoc,
        markdownContent: content,
        rawText: extracted.rawText || content,
        embedding: extracted.embedding || localDoc.embedding,
        updatedAt: now,
        syncStatus: "synced"
      };
      const { vaultKey } = getVaultKeys();
      let docKey;
      if (localDoc.encryptedDocKey) {
        docKey = unwrapDocumentKey(localDoc.encryptedDocKey, localDoc);
      } else {
        docKey = generateDocumentKey();
      }
      const docContent = JSON.stringify({
        title: updatedDoc.title,
        rawText: updatedDoc.rawText,
        markdownContent: content,
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
        dateAdded: updatedDoc.dateAdded,
        savedBy: updatedDoc.savedBy
      });
      const encryptedBlob = encrypt(new TextEncoder().encode(docContent), docKey);
      const wrapped = wrapDocumentKey(docKey, updatedDoc.vaultId);
      const wrappedDocKey = wrapped.encryptedDocKey;
      const blobBuffer = new ArrayBuffer(encryptedBlob.byteLength);
      new Uint8Array(blobBuffer).set(encryptedBlob);
      const keyBuffer = new ArrayBuffer(wrappedDocKey.byteLength);
      new Uint8Array(keyBuffer).set(new Uint8Array(wrappedDocKey));
      const config = loadConfig();
      const vaultId = wrapped.spaceId ?? void 0;
      if (wrapped.spaceId) {
        await convex.mutation(api.encryptedSync.upsertBlobByVault, {
          vaultId: wrapped.spaceId,
          blobId: id,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length,
          keyVersion: wrapped.keyVersion
        });
      } else {
        await convex.mutation(api.encryptedSync.upsertBlob, {
          blobId: id,
          encryptedBlob: blobBuffer,
          encryptedDocKey: keyBuffer,
          blobSize: encryptedBlob.length,
          keyVersion: wrapped.keyVersion
        });
      }
      upsertDocument({ ...updatedDoc, encryptedDocKey: wrappedDocKey, keyVersion: wrapped.keyVersion });
      docKey.fill(0);
      if (isJson) {
        output({ status: "updated", id, title: localDoc.title });
      } else {
        console.log(`\x1B[32m\u2713\x1B[0m Content updated: \x1B[1m${localDoc.title}\x1B[0m`);
      }
    } catch (err) {
      const msg = err.message;
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(`Update failed: ${msg}`);
      }
      process.exit(1);
    }
  });
  doc.command("upload").description("Upload one or more documents to the vault").argument("<files...>", "Path(s) to file(s) \u2014 PDF, image, etc.").action(async (filePaths, _opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked(isJson);
    await requireDirectWrite(isJson, void 0, true);
    const results = [];
    for (const filePath of filePaths) {
      const resolvedPath = path5.resolve(filePath);
      if (!fs5.existsSync(resolvedPath)) {
        if (isJson) {
          results.push({ error: "File not found", path: resolvedPath });
          continue;
        } else {
          console.error(`File not found: ${resolvedPath}`);
          continue;
        }
      }
      const fileName = path5.basename(resolvedPath);
      const ext = path5.extname(resolvedPath).toLowerCase().slice(1);
      const mimeType = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        heic: "image/heic",
        txt: "text/plain",
        md: "text/markdown"
      }[ext] ?? "application/octet-stream";
      const isTextFile = mimeType === "text/plain" || mimeType === "text/markdown" || ext === "md" || ext === "txt";
      try {
        const fileBuffer = fs5.readFileSync(resolvedPath);
        const fileBytes = new Uint8Array(fileBuffer);
        if (isTextFile) {
          const content = fileBuffer.toString("utf-8");
          const contentEncoded = new TextEncoder().encode(content);
          if (contentEncoded.byteLength > 200 * 1024) throw new Error("Content exceeds 200KB limit");
          const hash2 = crypto6.createHash("sha256").update(contentEncoded).digest("hex");
          const docId2 = hash2;
          const existingDoc = getDocumentById(docId2);
          if (existingDoc) {
            const dupResult = { status: "duplicate", id: docId2, title: existingDoc.title };
            if (isJson) {
              if (filePaths.length === 1) {
                output(dupResult);
              } else {
                results.push(dupResult);
              }
            } else {
              console.log(`Duplicate: ${existingDoc.title} (${docId2.slice(0, 8)})`);
            }
            continue;
          }
          if (!isJson) process.stderr.write("Analyzing with Gemini...\n");
          const convex2 = await authenticateConvexClient();
          const extracted2 = await convex2.action(api.proxy.processText, { textContent: content, fileName });
          if (!isJson) process.stderr.write("Encrypting...\n");
          const { vaultKey: vaultKey2 } = getVaultKeys();
          const docKey2 = generateDocumentKey();
          const wrapped2 = wrapDocumentKey(docKey2, spaceForNewDoc());
          const wrappedDocKey2 = wrapped2.encryptedDocKey;
          const now2 = Date.now();
          const config2 = loadConfig();
          const vaultId2 = wrapped2.spaceId ?? void 0;
          const localDoc2 = {
            id: docId2,
            title: extracted2.title || path5.basename(fileName, path5.extname(fileName)),
            rawText: extracted2.rawText || content,
            markdownContent: content,
            type: extracted2.type || "note",
            tags: extracted2.tags || [],
            fields: extracted2.fields || {},
            organizations: extracted2.organizations || [],
            mentions: extracted2.mentions || [],
            embedding: extracted2.embedding || void 0,
            owner: extracted2.owner || "Unknown",
            mimeType,
            encryptedDocKey: wrappedDocKey2,
            vaultId: wrapped2.spaceId ?? void 0,
            keyVersion: wrapped2.keyVersion,
            dateAdded: (/* @__PURE__ */ new Date()).toISOString(),
            status: "ready",
            savedBy: savedByNow(detectClientFromEnv()),
            createdAt: now2,
            updatedAt: now2,
            syncStatus: "synced"
          };
          const docContent2 = JSON.stringify({
            title: localDoc2.title,
            rawText: localDoc2.rawText,
            markdownContent: content,
            type: localDoc2.type,
            tags: localDoc2.tags,
            fields: localDoc2.fields,
            organizations: localDoc2.organizations,
            mentions: localDoc2.mentions,
            owner: localDoc2.owner,
            embedding: extracted2.embedding || null,
            mimeType,
            fileName,
            fileHash: hash2,
            dateAdded: localDoc2.dateAdded,
            savedBy: localDoc2.savedBy
          });
          const encryptedBlob2 = encrypt(new TextEncoder().encode(docContent2), docKey2);
          const blobBuffer2 = new ArrayBuffer(encryptedBlob2.byteLength);
          new Uint8Array(blobBuffer2).set(encryptedBlob2);
          const keyBuffer2 = new ArrayBuffer(wrappedDocKey2.byteLength);
          new Uint8Array(keyBuffer2).set(new Uint8Array(wrappedDocKey2));
          if (vaultId2) {
            await convex2.mutation(api.encryptedSync.upsertBlobByVault, { vaultId: vaultId2, blobId: docId2, encryptedBlob: blobBuffer2, encryptedDocKey: keyBuffer2, blobSize: encryptedBlob2.length, keyVersion: wrapped2.keyVersion });
          } else {
            await convex2.mutation(api.encryptedSync.upsertBlob, { blobId: docId2, encryptedBlob: blobBuffer2, encryptedDocKey: keyBuffer2, blobSize: encryptedBlob2.length, keyVersion: wrapped2.keyVersion });
          }
          upsertDocument(localDoc2);
          docKey2.fill(0);
          const textResult = { status: "created", id: docId2, title: localDoc2.title, type: localDoc2.type, tags: localDoc2.tags, owner: localDoc2.owner };
          if (isJson) {
            if (filePaths.length === 1) {
              output(textResult);
            } else {
              results.push(textResult);
            }
          } else {
            console.log(`\x1B[32m\u2713\x1B[0m \x1B[1m${localDoc2.title}\x1B[0m`);
            console.log(`  ID: ${docId2.slice(0, 8)}  Type: ${localDoc2.type}  Owner: ${localDoc2.owner}`);
            if (filePaths.length > 1) console.log("");
          }
          continue;
        }
        const hash = crypto6.createHash("sha256").update(fileBytes).digest("hex");
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
        const wrapped = wrapDocumentKey(docKey, spaceForNewDoc());
        const wrappedDocKey = wrapped.encryptedDocKey;
        const now = Date.now();
        const config = loadConfig();
        const vaultId = wrapped.spaceId ?? void 0;
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
          vaultId: wrapped.spaceId ?? void 0,
          keyVersion: wrapped.keyVersion,
          dateAdded: (/* @__PURE__ */ new Date()).toISOString(),
          status: "ready",
          savedBy: savedByNow(detectClientFromEnv()),
          createdAt: now,
          updatedAt: now,
          syncStatus: "synced"
        };
        const docContent = JSON.stringify({
          title: localDoc.title,
          rawText: localDoc.rawText,
          markdownContent: localDoc.markdownContent,
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
          dateAdded: localDoc.dateAdded,
          savedBy: localDoc.savedBy
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
            blobSize: encryptedBlob.length,
            keyVersion: wrapped.keyVersion
          });
        } else {
          await convex.mutation(api.encryptedSync.upsertBlob, {
            blobId: docId,
            encryptedBlob: blobBuffer,
            encryptedDocKey: keyBuffer,
            blobSize: encryptedBlob.length,
            keyVersion: wrapped.keyVersion
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
        if (!isJson && canHaveThumbnail(mimeType)) process.stderr.write("Generating preview thumbnail...\n");
        const preview = await attachPreview(convex, {
          docId,
          vaultId: vaultId ?? void 0,
          docKey,
          localDoc,
          filePath: resolvedPath,
          mimeType
        });
        if (!isJson && preview.startsWith("skipped")) {
          process.stderr.write(`Preview ${preview}
`);
        }
        docKey.fill(0);
        const result = {
          status: "uploaded",
          id: docId,
          title: localDoc.title,
          type: localDoc.type,
          tags: localDoc.tags,
          owner: localDoc.owner,
          hasEmbedding: !!(extracted.embedding && extracted.embedding.length > 0),
          preview
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
          console.error(`Upload failed (${path5.basename(filePath)}): ${msg}`);
        }
      }
    }
    if (isJson && filePaths.length > 1) {
      output(results);
    } else if (isJson && results.length > 0) {
      output(results[0]);
    }
    if (results.some((r) => typeof r === "object" && r !== null && "error" in r)) {
      process.exitCode = 1;
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
import crypto7 from "crypto";
var REGISTRY_BLOB_ID = "__people_registry__";
async function fetchRegistry() {
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
    const docKey = unwrapDocumentKey(encDocKey, blob);
    const decrypted = decryptString(new Uint8Array(blob.encryptedBlob), docKey);
    docKey.fill(0);
    return JSON.parse(decrypted);
  } catch {
    return { people: [] };
  }
}
async function syncRegistry(registry) {
  const convex = await authenticateConvexClient();
  const docKey = new Uint8Array(crypto7.randomBytes(DOCUMENT_KEY_BYTES));
  const encryptedBlob = encryptString(JSON.stringify(registry), docKey);
  await upsertEncryptedBlob(convex, {
    blobId: REGISTRY_BLOB_ID,
    docKey,
    encryptedBlob
  });
  docKey.fill(0);
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
    const registry = await fetchRegistry();
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
    const registry = await fetchRegistry();
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
    await syncRegistry(registry);
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

// src/cli/commands/lifestyle.ts
init_database();
function requireUnlocked2(isJson) {
  if (!isVaultUnlocked()) {
    const msg = "Vault is locked \u2014 run `moivault unlock` first";
    if (isJson) {
      output({ error: msg });
    } else {
      console.error(msg);
    }
    process.exit(1);
  }
}
function asString(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return String(v);
}
function asArray(v) {
  if (Array.isArray(v)) return v.map(asString).filter(Boolean);
  if (typeof v === "string" && v) return [v];
  return [];
}
function buildMapsUrl(p) {
  const explicit = asString(p?.mapsUrl).trim();
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit;
  const name = asString(p?.placeName ?? p?.name).trim();
  const address = asString(p?.address).trim();
  const area = asString(p?.area).trim();
  const city = asString(p?.city).trim();
  const country = asString(p?.country).trim();
  const parts = address ? [name, address].filter(Boolean) : [name, area, city, country].filter(Boolean);
  const query = parts.join(", ");
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
function formatLocality(area, city, country) {
  const norm = (s) => s.toLowerCase().replace(/[,\.]/g, "").trim();
  if (area && city) {
    if (norm(area) === norm(city)) return city;
    if (norm(area).includes(norm(city)) || norm(city).includes(norm(area))) return city;
    return `${area} \xB7 ${city}`;
  }
  return area || city || country;
}
function buildPlaceRows(docs) {
  const rows = [];
  for (const doc of docs) {
    const f = doc.fields ?? {};
    const sourceUrl = asString(f.sourceUrl) || asString(f.url);
    const recommendedBy = asString(f.recommendedBy);
    const collect = (p, fallbackTitle) => {
      const placeName = asString(p.placeName ?? p.name) || fallbackTitle;
      const area = asString(p.area);
      const city = asString(p.city) || asString(f.city);
      const country = asString(p.country) || asString(f.country);
      const status = asString(p.visitStatus).toLowerCase() || asString(f.visitStatus).toLowerCase();
      const visited = status === "visited";
      return {
        docId: doc.id,
        docTitle: doc.title,
        placeName,
        placeType: asString(p.placeType),
        cuisineType: asString(p.cuisineType),
        area,
        city,
        country,
        locality: formatLocality(area, city, country),
        priceRange: asString(p.priceRange),
        signatureItems: asArray(p.signatureItems),
        recommendedBy: asString(p.recommendedBy) || recommendedBy,
        visitStatus: visited ? "visited" : "planned",
        visited,
        userRating: Number(p.userRating || f.userRating || 0),
        userVisitDate: asString(p.userVisitDate || f.userVisitDate),
        sourceUrl,
        mapsUrl: buildMapsUrl(p) || buildMapsUrl(f)
      };
    };
    const placesArr = Array.isArray(f.places) ? f.places : [];
    if (placesArr.length > 0) {
      for (const p of placesArr) {
        rows.push(collect(p, doc.title));
      }
    } else {
      rows.push(collect(f, doc.title));
    }
  }
  return rows;
}
function matchesText(haystack, needle) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}
function queryPlaces(opts) {
  const docs = getDocumentsByType("place");
  let rows = buildPlaceRows(docs);
  if (opts.filter === "wishlist") rows = rows.filter((r) => !r.visited);
  if (opts.filter === "visited") rows = rows.filter((r) => r.visited);
  if (opts.area) rows = rows.filter((r) => matchesText(r.area, opts.area));
  if (opts.city) rows = rows.filter((r) => matchesText(r.city, opts.city));
  if (opts.cuisine) rows = rows.filter((r) => matchesText(r.cuisineType, opts.cuisine));
  if (opts.type) rows = rows.filter((r) => matchesText(r.placeType, opts.type));
  if (opts.limit && opts.limit > 0) rows = rows.slice(0, opts.limit);
  return rows;
}
function renderPlacesTable(rows) {
  if (rows.length === 0) return "No places found.";
  const header = "| Place | Area | Cuisine | Status | \u2B50 | Maps |\n|---|---|---|---|---|---|";
  const lines = rows.map((r) => {
    const status = r.visited ? "\u2713 Visited" : "Wishlist";
    const stars = r.userRating > 0 ? "\u2605".repeat(r.userRating) : "\u2014";
    const maps = r.mapsUrl ? `[Open](${r.mapsUrl})` : "\u2014";
    const cuisine = [r.cuisineType, r.priceRange].filter(Boolean).join(" \xB7 ");
    return `| ${r.placeName} | ${r.locality || "\u2014"} | ${cuisine || "\u2014"} | ${status} | ${stars} | ${maps} |`;
  });
  return [header, ...lines].join("\n");
}
function buildWishlistRows(docs) {
  return docs.map((doc) => {
    const f = doc.fields ?? {};
    const status = asString(f.purchaseStatus).toLowerCase();
    const isOwned = /^(owned|purchased|bought)/.test(status);
    const isResearching = /^research/.test(status);
    const productUrl = asString(f.productUrl);
    const sourceUrl = asString(f.sourceUrl) || asString(f.url);
    return {
      docId: doc.id,
      productName: asString(f.productName) || doc.title,
      brand: asString(f.brand),
      model: asString(f.model),
      category: asString(f.category),
      price: asString(f.price),
      currency: asString(f.currency),
      status: isOwned ? "owned" : isResearching ? "researching" : "wishlist",
      rating: Number(f.rating || 0),
      recommendedBy: asString(f.recommendedBy),
      productUrl,
      sourceUrl
    };
  });
}
function queryWishlist(opts) {
  const docs = getDocumentsByType("product_research");
  let rows = buildWishlistRows(docs);
  if (opts.filter && opts.filter !== "all") rows = rows.filter((r) => r.status === opts.filter);
  if (opts.brand) rows = rows.filter((r) => matchesText(r.brand, opts.brand));
  if (opts.category) rows = rows.filter((r) => matchesText(r.category, opts.category));
  if (opts.limit && opts.limit > 0) rows = rows.slice(0, opts.limit);
  return rows;
}
function renderWishlistTable(rows) {
  if (rows.length === 0) return "No products found.";
  const header = "| Product | Brand | Price | Status | \u2B50 | Link |\n|---|---|---|---|---|---|";
  const lines = rows.map((r) => {
    const price = r.price ? r.currency && !r.price.includes(r.currency) ? `${r.currency} ${r.price}` : r.price : "\u2014";
    const stars = r.rating > 0 ? "\u2605".repeat(Math.round(r.rating)) : "\u2014";
    const linkUrl = r.productUrl || r.sourceUrl;
    const linkLabel = r.productUrl ? "Buy" : r.sourceUrl ? "Source" : "";
    const link = linkUrl ? `[${linkLabel}](${linkUrl})` : "\u2014";
    const status = r.status === "owned" ? "\u2713 Owned" : r.status === "researching" ? "Researching" : "Wishlist";
    return `| ${r.productName} | ${r.brand || "\u2014"} | ${price} | ${status} | ${stars} | ${link} |`;
  });
  return [header, ...lines].join("\n");
}
function buildRecipeRows(docs) {
  return docs.map((doc) => {
    const f = doc.fields ?? {};
    const sourceUrl = asString(f.sourceUrl) || asString(f.url);
    const totalTime = Number(f.totalTime) || (Number(f.prepTime) || 0) + (Number(f.cookTime) || 0);
    return {
      docId: doc.id,
      dishName: asString(f.dishName) || doc.title,
      cuisine: asString(f.cuisine),
      course: asString(f.course),
      totalTime,
      prepTime: Number(f.prepTime) || 0,
      cookTime: Number(f.cookTime) || 0,
      servings: Number(f.servings) || 0,
      difficulty: asString(f.difficulty),
      calories: Number(f.calories) || 0,
      proteinGrams: Number(f.proteinGrams) || 0,
      dietaryTags: asArray(f.dietaryTags),
      keyIngredients: asArray(f.keyIngredients),
      recommendedBy: asString(f.recommendedBy),
      sourceUrl
    };
  });
}
function queryRecipes(opts) {
  const docs = getDocumentsByType("recipe");
  let rows = buildRecipeRows(docs);
  if (opts.cuisine) rows = rows.filter((r) => matchesText(r.cuisine, opts.cuisine));
  if (opts.course) rows = rows.filter((r) => matchesText(r.course, opts.course));
  if (opts.dietary) {
    rows = rows.filter((r) => r.dietaryTags.some((t) => matchesText(t, opts.dietary)));
  }
  if (opts.maxMinutes && opts.maxMinutes > 0) {
    rows = rows.filter((r) => r.totalTime > 0 && r.totalTime <= opts.maxMinutes);
  }
  if (opts.limit && opts.limit > 0) rows = rows.slice(0, opts.limit);
  return rows;
}
function buildAppRows(docs) {
  return docs.map((doc) => {
    const f = doc.fields ?? {};
    const status = asString(f.downloadStatus).toLowerCase();
    const isInstalled = /^(installed|using|owned)/.test(status);
    return {
      docId: doc.id,
      appName: asString(f.appName) || doc.title,
      developer: asString(f.developer),
      category: asString(f.category),
      platforms: asArray(f.platforms),
      price: asString(f.price),
      rating: Number(f.rating || 0),
      status: isInstalled ? "installed" : "wishlist",
      verdict: asString(f.verdict),
      appStoreUrl: asString(f.appStoreUrl),
      playStoreUrl: asString(f.playStoreUrl),
      websiteUrl: asString(f.websiteUrl),
      recommendedBy: asString(f.recommendedBy),
      sourceUrl: asString(f.sourceUrl) || asString(f.url)
    };
  });
}
function queryApps(opts) {
  const docs = getDocumentsByType("app");
  let rows = buildAppRows(docs);
  if (opts.filter && opts.filter !== "all") rows = rows.filter((r) => r.status === opts.filter);
  if (opts.platform) {
    rows = rows.filter((r) => r.platforms.some((p) => matchesText(p, opts.platform)));
  }
  if (opts.category) rows = rows.filter((r) => matchesText(r.category, opts.category));
  if (opts.limit && opts.limit > 0) rows = rows.slice(0, opts.limit);
  return rows;
}
function renderAppsTable(rows) {
  if (rows.length === 0) return "No apps found.";
  const header = "| App | Developer | Platforms | Price | Status | Link |\n|---|---|---|---|---|---|";
  const lines = rows.map((r) => {
    const stars = r.rating > 0 ? "\u2605".repeat(Math.round(r.rating)) : "\u2014";
    const linkUrl = r.appStoreUrl || r.playStoreUrl || r.websiteUrl;
    const linkLabel = r.appStoreUrl ? "App Store" : r.playStoreUrl ? "Play Store" : r.websiteUrl ? "Website" : "";
    const link = linkUrl ? `[${linkLabel}](${linkUrl})` : "\u2014";
    const platforms = r.platforms.length > 0 ? r.platforms.join(", ") : "\u2014";
    const status = r.status === "installed" ? "\u2713 Installed" : "Wishlist";
    return `| ${r.appName} | ${r.developer || "\u2014"} | ${platforms} | ${r.price || "\u2014"} | ${status} ${stars !== "\u2014" ? stars : ""} | ${link} |`;
  });
  return [header, ...lines].join("\n");
}
function buildLifeHackRows(docs) {
  return docs.map((doc) => {
    const f = doc.fields ?? {};
    const steps = Array.isArray(f.steps) ? f.steps.map(asString).filter(Boolean) : [];
    return {
      docId: doc.id,
      title: asString(f.title) || doc.title,
      category: asString(f.category),
      summary: asString(f.summary),
      difficulty: asString(f.difficulty),
      timeNeeded: asString(f.timeNeeded),
      savings: asString(f.savings),
      stepCount: steps.length,
      requiredItems: asArray(f.requiredItems),
      recommendedBy: asString(f.recommendedBy),
      sourceUrl: asString(f.sourceUrl) || asString(f.url)
    };
  });
}
function queryLifeHacks(opts) {
  const docs = getDocumentsByType("life_hack");
  let rows = buildLifeHackRows(docs);
  if (opts.category) rows = rows.filter((r) => matchesText(r.category, opts.category));
  if (opts.difficulty) rows = rows.filter((r) => matchesText(r.difficulty, opts.difficulty));
  if (opts.limit && opts.limit > 0) rows = rows.slice(0, opts.limit);
  return rows;
}
function renderLifeHacksTable(rows) {
  if (rows.length === 0) return "No life hacks found.";
  const showSavings = rows.some((r) => r.savings);
  const sCol = showSavings ? " | Savings" : "";
  const sSep = showSavings ? " | ---" : "";
  const header = `| Tip | Category | Steps | Time${sCol} | Source |
| --- | --- | --- | ---${sSep} | --- |`;
  const lines = rows.map((r) => {
    const saved = showSavings ? ` | ${r.savings || "\u2014"}` : "";
    const link = r.sourceUrl ? `[link](${r.sourceUrl})` : "\u2014";
    return `| ${r.title} | ${r.category || "\u2014"} | ${r.stepCount > 0 ? r.stepCount : "\u2014"} | ${r.timeNeeded || "\u2014"}${saved} | ${link} |`;
  });
  return [header, ...lines].join("\n");
}
function renderRecipesTable(rows) {
  if (rows.length === 0) return "No recipes found.";
  const showProtein = rows.some((r) => r.proteinGrams > 0);
  const fmtTime = (m) => m > 0 ? m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m` : "\u2014";
  const protCol = showProtein ? " | Protein" : "";
  const protSep = showProtein ? " | ---" : "";
  const header = `| Dish | Cuisine \xB7 Course | Time | Serves${protCol} | Source |
| --- | --- | --- | ---${protSep} | --- |`;
  const lines = rows.map((r) => {
    const cc = [r.cuisine, r.course].filter(Boolean).join(" \xB7 ") || "\u2014";
    const time = fmtTime(r.totalTime);
    const serves = r.servings > 0 ? String(r.servings) : "\u2014";
    const protein = showProtein ? ` | ${r.proteinGrams > 0 ? `${r.proteinGrams}g` : "\u2014"}` : "";
    const link = r.sourceUrl ? `[link](${r.sourceUrl})` : "\u2014";
    return `| ${r.dishName} | ${cc} | ${time} | ${serves}${protein} | ${link} |`;
  });
  return [header, ...lines].join("\n");
}
function registerLifestyleCommands(program2) {
  program2.command("places").description("List saved places (visited + wishlist) with map links").option("--filter <which>", "wishlist | visited | all", "all").option("--area <area>", "Filter by neighborhood/locality (substring)").option("--city <city>", "Filter by city (substring)").option("--cuisine <cuisine>", "Filter by cuisine (substring)").option("--type <type>", "Filter by place type (Restaurant/Cafe/Bar/etc.)").option("--limit <n>", "Max rows", "50").action((opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked2(isJson);
    const rows = queryPlaces({
      filter: opts.filter,
      area: opts.area,
      city: opts.city,
      cuisine: opts.cuisine,
      type: opts.type,
      limit: parseInt(opts.limit)
    });
    if (isJson) {
      output({ count: rows.length, places: rows });
    } else {
      console.log(renderPlacesTable(rows));
      console.log(`
  \x1B[2m${rows.length} place(s)\x1B[0m`);
    }
  });
  program2.command("wishlist").description("List products on the wishlist (or owned/researching)").option("--filter <which>", "wishlist | owned | researching | all", "wishlist").option("--brand <brand>", "Filter by brand (substring)").option("--category <category>", "Filter by category (substring)").option("--limit <n>", "Max rows", "50").action((opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked2(isJson);
    const rows = queryWishlist({
      filter: opts.filter,
      brand: opts.brand,
      category: opts.category,
      limit: parseInt(opts.limit)
    });
    if (isJson) {
      output({ count: rows.length, items: rows });
    } else {
      console.log(renderWishlistTable(rows));
      console.log(`
  \x1B[2m${rows.length} item(s)\x1B[0m`);
    }
  });
  program2.command("apps").description("List saved apps (wishlist + installed) with download links").option("--filter <which>", "wishlist | installed | all", "all").option("--platform <platform>", "Filter by platform (iOS / Android / macOS / Windows / Web)").option("--category <category>", "Filter by category (substring)").option("--limit <n>", "Max rows", "50").action((opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked2(isJson);
    const rows = queryApps({
      filter: opts.filter,
      platform: opts.platform,
      category: opts.category,
      limit: parseInt(opts.limit)
    });
    if (isJson) {
      output({ count: rows.length, apps: rows });
    } else {
      console.log(renderAppsTable(rows));
      console.log(`
  \x1B[2m${rows.length} app(s)\x1B[0m`);
    }
  });
  program2.command("hacks").description("List saved life hacks / tips with steps and time").option("--category <category>", "Filter by category (Kitchen/Home/Money/etc.)").option("--difficulty <level>", "Easy | Medium | Hard").option("--limit <n>", "Max rows", "50").action((opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked2(isJson);
    const rows = queryLifeHacks({
      category: opts.category,
      difficulty: opts.difficulty,
      limit: parseInt(opts.limit)
    });
    if (isJson) {
      output({ count: rows.length, hacks: rows });
    } else {
      console.log(renderLifeHacksTable(rows));
      console.log(`
  \x1B[2m${rows.length} hack(s)\x1B[0m`);
    }
  });
  program2.command("recipes").description("List saved recipes with prep/cook/serves at a glance").option("--cuisine <cuisine>", "Filter by cuisine (substring)").option("--course <course>", "Filter by course (breakfast, dinner, dessert, etc.)").option("--dietary <tag>", "Filter by dietary tag (high-protein, vegan, keto, etc.)").option("--max-minutes <n>", "Only recipes with totalTime <= n minutes").option("--limit <n>", "Max rows", "50").action((opts) => {
    const isJson = shouldOutputJson(program2.opts());
    requireUnlocked2(isJson);
    const rows = queryRecipes({
      cuisine: opts.cuisine,
      course: opts.course,
      dietary: opts.dietary,
      maxMinutes: opts.maxMinutes ? parseInt(opts.maxMinutes) : void 0,
      limit: parseInt(opts.limit)
    });
    if (isJson) {
      output({ count: rows.length, recipes: rows });
    } else {
      console.log(renderRecipesTable(rows));
      console.log(`
  \x1B[2m${rows.length} recipe(s)\x1B[0m`);
    }
  });
}

// src/core/docPaths.ts
init_database();
function loadAliasMap() {
  return buildAliasMap(getLocalMeta("people_registry"));
}
function loadSpaceDirectory() {
  const spaces = getLocalMeta("spaces") ?? [];
  const out = {};
  for (const s of spaces) out[s.spaceId] = { kind: s.kind, name: s.name };
  return out;
}
function buildPathIndex() {
  const rows = getDocumentPathRows().filter((r) => r.id !== PEOPLE_REGISTRY_BLOB_ID);
  const byId = computeDocPaths(rows, { spaces: loadSpaceDirectory(), aliasMap: loadAliasMap() });
  const byPath = /* @__PURE__ */ new Map();
  for (const [id, p] of byId) byPath.set(p, id);
  return { byId, byPath, rows };
}
function resolvePath(index2, path8) {
  return index2.byPath.get(normalizePathQuery(path8)) ?? null;
}

// src/cli/commands/ls.ts
function registerLsCommand(program2) {
  program2.command("ls").description("List the vault as folders: vault/<space>/<person>/<file>").argument("[path]", "Folder or file, e.g. vault/family/priya", "vault/").action((pathArg) => {
    const isJson = shouldOutputJson(program2.opts());
    if (!isVaultUnlocked()) {
      const msg = "Vault is locked \u2014 connect this machine with `moivault auth pair <code>`";
      if (isJson) {
        output({ error: msg });
      } else {
        console.error(msg);
      }
      process.exit(1);
    }
    const index2 = buildPathIndex();
    const query = normalizePathQuery(pathArg);
    const fileId = index2.byPath.get(query);
    if (fileId) {
      const row = index2.rows.find((r) => r.id === fileId);
      if (isJson) output({ kind: "file", path: displayPath(query), id: fileId, title: row.title, type: row.type });
      else console.log(`${displayPath(query)}  ${row.title ?? ""}  [${fileId}]`);
      return;
    }
    const prefix = query ? `${query}/` : "";
    const dirs = /* @__PURE__ */ new Map();
    const files = [];
    for (const [id, p] of index2.byId) {
      if (!p.startsWith(prefix)) continue;
      const rest = p.slice(prefix.length);
      const slash = rest.indexOf("/");
      if (slash === -1) files.push({ name: rest, id, title: index2.rows.find((r) => r.id === id)?.title ?? null });
      else dirs.set(rest.slice(0, slash), (dirs.get(rest.slice(0, slash)) ?? 0) + 1);
    }
    if (dirs.size === 0 && files.length === 0 && query) {
      if (isJson) {
        output({ error: "No such path", path: displayPath(query) });
      } else {
        console.error(`No such path: ${displayPath(query)}`);
      }
      process.exit(1);
    }
    const entries = [
      ...[...dirs.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name: `${name}/`, kind: "dir", count })),
      ...files.sort((a, b) => a.name.localeCompare(b.name)).map((f) => ({ ...f, kind: "file" }))
    ];
    if (isJson) {
      output({ path: displayPath(prefix), entries });
      return;
    }
    console.log(displayPath(prefix));
    for (const e of entries) {
      if (e.kind === "dir") console.log(`  ${e.name}  (${e.count})`);
      else console.log(`  ${e.name}  [${e.id}]`);
    }
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

// src/core/auditDetail.ts
import path6 from "path";
var SAFE_STRING_ARGS = /* @__PURE__ */ new Set([
  "query",
  "path",
  "id",
  "docId",
  "blobId",
  "requestId",
  "spaceId",
  "type",
  "mode",
  "kind",
  "filter",
  "name",
  "hint",
  "field",
  "title",
  "area",
  "city",
  "cuisine",
  "placeType",
  "brand",
  "category",
  "course",
  "dietary",
  "platform",
  "difficulty"
]);
var SAFE_LIST_ARGS = /* @__PURE__ */ new Set(["blobIds", "ids"]);
var MAX_DETAIL_BYTES = 2048;
var MAX_ERROR_CHARS = 200;
function clip(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}\u2026` : s;
}
function redactArgs(raw, stringLimit = 200, listLimit = 50) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const args = {};
  const omitted = [];
  for (const [key, value] of Object.entries(raw)) {
    if (value === void 0 || value === null) continue;
    if (typeof value === "number" || typeof value === "boolean") {
      args[key] = value;
    } else if (typeof value === "string" && SAFE_STRING_ARGS.has(key)) {
      args[key] = clip(value, stringLimit);
    } else if (Array.isArray(value) && SAFE_LIST_ARGS.has(key)) {
      args[key] = value.filter((v) => typeof v === "string").slice(0, listLimit).map((v) => clip(v, 64));
    } else if (typeof value === "string" && key === "filePath") {
      args.fileName = clip(path6.basename(value), stringLimit);
    } else {
      omitted.push(key);
    }
  }
  if (omitted.length > 0) args.omitted = omitted.sort();
  return args;
}
function buildAuditDetail(rawArgs, extra = {}) {
  const tail = {};
  if (typeof extra.resultCount === "number") tail.resultCount = extra.resultCount;
  if (extra.error) tail.error = clip(extra.error, MAX_ERROR_CHARS);
  for (const [s, l] of [[200, 50], [64, 10], [24, 3]]) {
    const detail = { args: redactArgs(rawArgs, s, l), ...tail };
    if (Buffer.byteLength(JSON.stringify(detail)) <= MAX_DETAIL_BYTES) return detail;
  }
  const keys = rawArgs && typeof rawArgs === "object" ? Object.keys(rawArgs).slice(0, 20) : [];
  return { args: { truncated: true, keys }, ...tail };
}
function sealAuditDetail(detail) {
  if (!getManifest()?.userPublicKey) return void 0;
  try {
    return sealJsonToUser(detail);
  } catch {
    return void 0;
  }
}

// src/core/activity.ts
var REPORT_TIMEOUT_MS = 2e3;
async function reportActivity(report) {
  const convex = await authenticateConvexClient();
  const sealedDetail = sealAuditDetail(buildAuditDetail(report.args, { resultCount: report.resultCount, error: report.error }));
  await convex.mutation(api.agentActivity.record, {
    client: report.client,
    tool: report.tool.slice(0, 64),
    docIds: report.docIds.slice(0, 200),
    result: report.error ? "error" : "ok",
    ...report.sensitive ? { sensitive: true } : {},
    ...sealedDetail ? { sealedDetail } : {}
  });
}
async function recordCliActivity(tool, docIds, extra = {}) {
  if (!connectionModeKnown()) return;
  try {
    const report = reportActivity({ client: detectClientFromEnv().key, tool, docIds, ...extra });
    await Promise.race([report, new Promise((r) => setTimeout(r, REPORT_TIMEOUT_MS).unref())]);
  } catch {
  }
}
var CommandExit = class extends Error {
  constructor(code) {
    super(`exit ${code}`);
    this.code = code;
    this.name = "CommandExit";
  }
};
var lastPrintedError = null;
function lastCommandError() {
  return lastPrintedError;
}
function interceptCommandFailure() {
  const realExit = process.exit;
  const realError = console.error;
  const realLog = console.log;
  console.error = (...a) => {
    if (typeof a[0] === "string") lastPrintedError = a[0];
    realError(...a);
  };
  console.log = (...a) => {
    if (typeof a[0] === "string" && a[0].startsWith("{") && a[0].includes('"error"')) {
      try {
        const e = JSON.parse(a[0]).error;
        if (typeof e === "string") lastPrintedError = e;
      } catch {
      }
    }
    realLog(...a);
  };
  process.exit = ((code) => {
    const n = Number(code ?? 0);
    if (n === 0) return realExit(0);
    throw new CommandExit(n);
  });
  return () => {
    process.exit = realExit;
    console.error = realError;
    console.log = realLog;
  };
}

// src/core/browse.ts
function usesContextCard() {
  return isConnectionSession() && getPreset() !== "full" && getContextCard() !== null;
}
function getBrowseIndex() {
  const local = buildPathIndex();
  const rows = local.rows.map((r) => ({ ...r, source: "local" }));
  const byId = new Map(local.byId);
  const byPath = new Map(local.byPath);
  const card = usesContextCard() ? getContextCard() : null;
  for (const d of card?.docs ?? []) {
    if (byId.has(d.blobId)) continue;
    const p = normalizePathQuery(d.path);
    if (!p || byPath.has(p)) continue;
    byId.set(d.blobId, p);
    byPath.set(p, d.blobId);
    rows.push({
      id: d.blobId,
      title: d.title,
      type: d.type,
      owner: d.owner,
      mimeType: null,
      vaultId: d.vaultId,
      dateAdded: null,
      expiresAt: d.expiresAt ?? null,
      date: d.date ?? null,
      source: "context"
    });
  }
  return { byId, byPath, rows, rowById: new Map(rows.map((r) => [r.id, r])), fromContext: !!card };
}
function searchContextCard(query, limit) {
  const index2 = getBrowseIndex();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return index2.rows.filter((r) => r.source === "context").map((r) => {
    const hay = `${r.title ?? ""} ${(r.type ?? "").replace(/_/g, " ")} ${r.owner ?? ""}`.toLowerCase();
    return { r, hits: terms.filter((t) => hay.includes(t)).length };
  }).filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, limit).map((x) => x.r);
}
function askFor(blobId) {
  return `Listed on the context card only. Ask for the full document with vault_request({ reason, blobIds: ["${blobId}"] }).`;
}

// src/core/granted.ts
var GRANTED_TTL_MS = 60 * 60 * 1e3;
var cache = /* @__PURE__ */ new Map();
function clientCache(client2) {
  let c = cache.get(client2);
  if (!c) {
    c = /* @__PURE__ */ new Map();
    cache.set(client2, c);
  }
  return c;
}
function connectionKeyPair() {
  const kp = getVaultKeys().connectionKeyPair;
  if (!kp) throw new Error("Granted documents need a paired machine \u2014 run `moivault auth pair <code>`");
  return kp;
}
async function fetchGrantedDocs(convex, client2, blobIds, requestId) {
  if (blobIds.length === 0) return [];
  const kp = connectionKeyPair();
  const out = [];
  for (let i = 0; i < blobIds.length; i += 50) {
    const rows = await convex.mutation(api.agentRequests.fetchGranted, {
      blobIds: blobIds.slice(i, i + 50),
      client: client2,
      ...requestId ? { requestId } : {}
    });
    for (const row of rows) {
      const sealedDocKey = new Uint8Array(row.sealedDocKey);
      const docKey = openSealed(sealedDocKey, kp.privateKey, kp.publicKey);
      let metadata;
      try {
        metadata = decryptPayloadWithDocKey(row.encryptedBlob, docKey);
      } finally {
        docKey.fill(0);
      }
      const doc = payloadToDocument(
        {
          _id: row.blobId,
          blobId: row.blobId,
          vaultId: row.vaultId,
          keyVersion: row.keyVersion ?? void 0,
          encryptedBlob: row.encryptedBlob,
          encryptedDocKey: new ArrayBuffer(0),
          updatedAt: Date.now(),
          fileAssetProvider: row.fileRef ? "r2" : void 0,
          fileAssetMimeType: row.fileRef?.mimeType ?? void 0,
          fileAssetSize: row.fileRef?.size ?? void 0,
          fileAssetStatus: row.fileRef?.status ?? void 0
        },
        metadata
      );
      clientCache(client2).set(row.blobId, { doc, sealedDocKey, fetchedAt: Date.now() });
      out.push(doc);
    }
  }
  return out;
}
function getGrantedDoc(client2, blobId) {
  const entry = cache.get(client2)?.get(blobId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > GRANTED_TTL_MS) {
    cache.get(client2).delete(blobId);
    return null;
  }
  return entry.doc;
}
function openGrantedDocKey(client2, blobId) {
  const entry = cache.get(client2)?.get(blobId);
  if (!entry) return null;
  const kp = connectionKeyPair();
  return openSealed(entry.sealedDocKey, kp.privateKey, kp.publicKey);
}
function listGrantedDocs(client2) {
  const c = cache.get(client2);
  if (!c) return [];
  const now = Date.now();
  return [...c.values()].filter((e) => now - e.fetchedAt <= GRANTED_TTL_MS).map((e) => e.doc);
}

// src/mcp/server.ts
var MCP_SERVER_VERSION = "0.3.3";
var stagedDropFiles = /* @__PURE__ */ new Map();
var hasSyncedThisSession = false;
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function fallbackTextExtraction(content, forcedType) {
  return {
    rawText: content,
    type: forcedType || "note",
    tags: [],
    fields: {
      processing: "AI extraction unavailable; archived with original text content."
    },
    organizations: [],
    mentions: [],
    owner: "Unknown"
  };
}
async function ensureUnlocked() {
  if (isVaultUnlocked()) return;
  if (!await autoUnlock()) {
    throw new Error(
      "Vault is locked \u2014 connect this machine from the app (Settings \u2192 AI agents), or set VAULT_MASTER_PASSWORD"
    );
  }
  openDatabase();
}
async function ensureSynced() {
  await ensureUnlocked();
  if (hasSyncedThisSession) return;
  try {
    await syncIncremental(getVaultKeys());
    hasSyncedThisSession = true;
  } catch {
    hasSyncedThisSession = true;
  }
}
async function ensureConnectionState() {
  await ensureUnlocked();
  if (isConnectionSession() && !getConnectionState()) await authenticateConvexClient();
}
function json(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}
function notFound(ref) {
  if (usesContextCard()) {
    const index2 = getBrowseIndex();
    const id = ref.id ?? (ref.path ? index2.byPath.get(normalizePathQuery(ref.path)) : void 0);
    const row = id ? index2.rowById.get(id) : void 0;
    if (row && row.source === "context") {
      return json({ status: "not_shared", id: row.id, path: displayPath(index2.byId.get(row.id)), title: row.title, type: row.type, owner: row.owner, message: askFor(row.id) });
    }
  }
  if (getPreset() === "private") return json({ error: "Document not found", ...ref, hint: PRIVATE_HINT });
  return json({ error: "Document not found", ...ref });
}
function pendingResult(outcome, extra = {}) {
  return json({ status: "pending_approval", requestId: outcome.requestId, message: PENDING_APPROVAL_MESSAGE, ...extra });
}
var NOTHING_SHARED_HINT = "Nothing on this machine matches \u2014 and on a paired machine only the spaces the user shared are here. If what you need is private, ask with vault_request (a clear reason, a narrow hint).";
var PRIVATE_HINT = `This agent is set to Private: it sees nothing until the user approves a request. Ask with vault_request \u2014 say what you're doing for them and what you need, with a short hint (e.g. "passport").`;
var STANDARD_HINT = "This agent is set to Standard: it can see titles, types, owners and dates (the context card), not contents. Nothing on the card matches either. Ask with vault_request and a clear reason if you think it exists.";
function emptyHint() {
  const preset = getPreset();
  if (preset === "private") return PRIVATE_HINT;
  if (preset === "standard") return STANDARD_HINT;
  return NOTHING_SHARED_HINT;
}
var DOC_ID_KEYS = /* @__PURE__ */ new Set(["id", "docId", "blobId"]);
function collectDocIds(value, out = /* @__PURE__ */ new Set(), depth = 0) {
  if (depth > 4 || out.size >= 200 || value === null || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const v of value) collectDocIds(v, out, depth + 1);
    return out;
  }
  for (const [k, v] of Object.entries(value)) {
    if (DOC_ID_KEYS.has(k) && typeof v === "string" && v && v !== PEOPLE_REGISTRY_BLOB_ID) out.add(v);
    else if (typeof v === "object") collectDocIds(v, out, depth + 1);
  }
  return out;
}
function docIdsFromResult(result) {
  const text = result?.content?.[0]?.text;
  if (typeof text !== "string" || !/^[\[{]/.test(text.trimStart())) return [];
  try {
    return [...collectDocIds(JSON.parse(text))].slice(0, 200);
  } catch {
    return [];
  }
}
function resultCountOf(result) {
  const text = result?.content?.[0]?.text;
  if (typeof text !== "string" || !/^[\[{]/.test(text.trimStart())) return void 0;
  try {
    const value = JSON.parse(text);
    if (Array.isArray(value)) return value.length;
    for (const k of ["results", "entries", "documents", "docs", "items"]) {
      if (Array.isArray(value?.[k])) return value[k].length;
    }
  } catch {
  }
  return void 0;
}
function resultErrorOf(result) {
  const r = result;
  const text = r?.content?.[0]?.text ?? "";
  if (r?.isError) return text || "error";
  if (!/^\{/.test(text.trimStart()) || !text.includes('"error"')) return void 0;
  try {
    const e = JSON.parse(text).error;
    return typeof e === "string" ? e : void 0;
  } catch {
    return void 0;
  }
}
function recordActivity(client2, tool, docIds, extra = {}) {
  if (!connectionModeKnown()) return;
  reportActivity({ client: client2.key, tool, docIds, ...extra }).catch(() => {
  });
}
var CONTENT_TOOLS = /* @__PURE__ */ new Set([
  "vault_doc_get",
  "vault_doc_text",
  "vault_doc_fields",
  "vault_doc_download",
  "vault_search",
  "vault_context",
  "vault_request_status"
]);
function docIdsFromArgs(args) {
  const a = args ?? {};
  const out = [];
  for (const v of [a.id, a.docId]) if (typeof v === "string" && v) out.push(v);
  if (out.length === 0 && typeof a.path === "string" && a.path) {
    try {
      const id = resolvePath(buildPathIndex(), a.path);
      if (id) out.push(id);
    } catch {
    }
  }
  return out;
}
function isSensitiveRead(tool, docIds, client2) {
  if (!CONTENT_TOOLS.has(tool)) return false;
  for (const id of docIds) {
    let type;
    try {
      type = getDocumentById(id)?.type;
    } catch {
    }
    type ??= getGrantedDoc(client2.key, id)?.type;
    if (type && SENSITIVE_DOC_TYPES.has(type)) return true;
  }
  return false;
}
var docRefShape = {
  id: z.string().optional().describe("Document ID"),
  path: z.string().optional().describe("Document path, e.g. vault/family/priya/passport.pdf (from vault_ls / search results)")
};
function resolveDocRef(ref, index2) {
  if (ref.id) return ref.id;
  if (ref.path) return resolvePath(index2 ?? buildPathIndex(), ref.path);
  return null;
}
function withPath(rows, index2) {
  return rows.map((r) => {
    const p = index2.byId.get(r.id);
    return { ...r, path: p ? displayPath(p) : null };
  });
}
var DATE_FIELDS = {
  id: ["expiryDate"],
  visa: ["expiryDate"],
  drivers_license: ["expiryDate"],
  insurance: ["expiryDate"],
  warranty: ["expiryDate"],
  vehicle: ["expiryDate"],
  gift_card: ["expiryDate"],
  membership: ["expiryDate"],
  subscription: ["nextBillingDate"],
  utility_bill: ["dueDate"],
  invoice: ["dueDate"],
  flight: ["departureTime"],
  boarding_pass: ["departureTime"],
  hotel_booking: ["checkIn"],
  event_ticket: ["date"],
  travel_itinerary: ["startDate"]
};
function upcomingDate(type, fields) {
  for (const field of DATE_FIELDS[type] ?? ["expiryDate"]) {
    let raw = fields[field];
    if (Array.isArray(raw)) raw = raw[raw.length - 1];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const ts = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime() : new Date(raw).getTime();
    if (!Number.isNaN(ts)) return { field, date: raw, ts };
  }
  return null;
}
function createMcpServer(options = {}) {
  const server = new McpServer({
    name: "moivault",
    version: MCP_SERVER_VERSION
  });
  const clientOf = () => resolveClient(server.server.getClientVersion()?.name, !!options.remote);
  const register = server.tool.bind(server);
  server.tool = (...args) => {
    const name = String(args[0]);
    const handler = args[args.length - 1];
    args[args.length - 1] = async (...callArgs) => {
      const argIds = docIdsFromArgs(callArgs[0]);
      const args2 = callArgs.length > 1 ? callArgs[0] : void 0;
      try {
        const result = await handler(...callArgs);
        const client2 = clientOf();
        const docIds = [.../* @__PURE__ */ new Set([...argIds, ...docIdsFromResult(result)])].slice(0, 200);
        const error = resultErrorOf(result);
        const read = !error && !/"status": "not_shared"|"error":/.test(result?.content?.[0]?.text ?? "");
        recordActivity(client2, name, docIds, {
          sensitive: read && isSensitiveRead(name, docIds, client2),
          args: args2,
          resultCount: error ? void 0 : resultCountOf(result),
          error
        });
        return result;
      } catch (err) {
        recordActivity(clientOf(), name, argIds, { args: args2, error: errorMessage(err) });
        throw err;
      }
    };
    return register(...args);
  };
  server.tool(
    "vault_search",
    "Search documents in the vault using full-text and/or semantic vector search. Results include a path.",
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
          if (doc.id === PEOPLE_REGISTRY_BLOB_ID) continue;
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
            if (!doc || doc.id === PEOPLE_REGISTRY_BLOB_ID || type && doc.type !== type) continue;
            results.push({ id: doc.id, title: doc.title, type: doc.type, owner: doc.owner, score: vr.score, source: "vector", snippet: doc.rawText?.slice(0, 200) });
          }
        } catch {
        }
      }
      results.sort((a, b) => b.score - a.score);
      const top = withPath(results.slice(0, limit), buildPathIndex());
      if (usesContextCard() && top.length < limit) {
        const index2 = getBrowseIndex();
        const seen = new Set(top.map((r) => r.id));
        for (const row of searchContextCard(query, limit)) {
          if (seen.has(row.id) || type && row.type !== type) continue;
          top.push({ id: row.id, title: row.title, type: row.type, owner: row.owner, path: displayPath(index2.byId.get(row.id)), source: "context", ...row.expiresAt ? { expiresAt: row.expiresAt } : {}, next: askFor(row.id) });
          if (top.length >= limit) break;
        }
      }
      if (top.length === 0 && isConnectionSession()) return json({ results: [], hint: emptyHint() });
      return json(top);
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
      const seenIds = /* @__PURE__ */ new Set([PEOPLE_REGISTRY_BLOB_ID]);
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
      const index2 = buildPathIndex();
      for (const d of contextDocs) {
        const p = index2.byId.get(d.docId);
        d.path = p ? displayPath(p) : null;
      }
      const people = [...new Set(contextDocs.map((d) => d.owner).filter(Boolean))];
      const result = { query, context: contextDocs.slice(0, limit), people };
      if (contextDocs.length === 0 && isConnectionSession()) result.hint = emptyHint();
      return json(result);
    }
  );
  function findDoc(ref) {
    const id = resolveDocRef(ref);
    if (!id) return null;
    return getDocumentById(id) ?? getGrantedDoc(clientOf().key, id);
  }
  server.tool(
    "vault_doc_get",
    "Get full metadata for a document by ID or path",
    docRefShape,
    async (ref) => {
      await ensureSynced();
      const doc = findDoc(ref);
      if (!doc) return notFound(ref);
      const p = buildPathIndex().byId.get(doc.id);
      const result = { id: doc.id, path: p ? displayPath(p) : null, title: doc.title, type: doc.type, tags: doc.tags, owner: doc.owner, dateAdded: doc.dateAdded, fields: doc.fields, mimeType: doc.mimeType, markdownContent: doc.markdownContent, hasFile: !!(doc.fileAssetKey || doc.fileAssetProvider || doc.storageId || doc.encryptedStorageId), savedBy: doc.savedBy ?? null };
      return json(result);
    }
  );
  server.tool(
    "vault_doc_text",
    "Get the raw OCR/extracted text of a document (by ID or path)",
    docRefShape,
    async (ref) => {
      await ensureSynced();
      const doc = findDoc(ref);
      if (!doc) return notFound(ref);
      return { content: [{ type: "text", text: doc.rawText || "(no text)" }] };
    }
  );
  server.tool(
    "vault_doc_fields",
    "Get structured extracted fields for a document (by ID or path)",
    docRefShape,
    async (ref) => {
      await ensureSynced();
      const doc = findDoc(ref);
      if (!doc) return notFound(ref);
      return json({ id: doc.id, title: doc.title, type: doc.type, fields: doc.fields });
    }
  );
  server.tool(
    "vault_doc_list",
    "List documents in the vault, optionally filtered by type. Results include a path.",
    {
      type: z.string().optional().describe("Filter by document type"),
      limit: z.number().default(50).describe("Max results")
    },
    async ({ type, limit }) => {
      await ensureSynced();
      let docs = type ? getDocumentsByType(type) : getAllDocuments();
      docs = docs.filter((d) => d.id !== PEOPLE_REGISTRY_BLOB_ID).slice(0, limit);
      const result = withPath(docs.map((d) => ({ id: d.id, title: d.title, type: d.type, owner: d.owner, dateAdded: d.dateAdded })), buildPathIndex());
      if (result.length === 0 && isConnectionSession()) return json({ results: [], hint: emptyHint() });
      return json(result);
    }
  );
  server.tool(
    "vault_doc_types",
    "List all document types with counts",
    {},
    async () => {
      await ensureSynced();
      return json(getDocumentTypeCounts());
    }
  );
  server.tool(
    "vault_doc_edit",
    "Edit a document field (title, tags, type, owner, or custom field). Writes directly where this agent may write; otherwise proposes the edit on the user's phone and returns pending_approval.",
    {
      ...docRefShape,
      field: z.string().describe("Field to edit"),
      value: z.string().describe("New value (for tags: comma-separated)"),
      reason: z.string().optional().describe("Why, in a sentence \u2014 shown to the user if approval is needed")
    },
    async ({ id: rawId, path: path8, field, value, reason }) => {
      await ensureConnectionState();
      const id = resolveDocRef({ id: rawId, path: path8 });
      const doc = id ? getDocumentById(id) : null;
      if (!id || !doc) return notFound({ id: rawId, path: path8 });
      const direct = writeGoesDirect(doc.vaultId, false);
      const parsed = field === "tags" ? value.split(",").map((t) => t.trim()) : value;
      let updatedDoc;
      if (direct) {
        updateDocumentField(id, field, parsed);
        updatedDoc = getDocumentById(id);
      } else {
        updatedDoc = ["title", "type", "owner", "tags", "rawText", "mimeType", "dateAdded", "originalOwner"].includes(field) ? { ...doc, [field]: parsed } : { ...doc, fields: { ...doc.fields, [field]: parsed } };
      }
      const docKey = updatedDoc.encryptedDocKey && updatedDoc.encryptedDocKey.length > 0 ? unwrapDocumentKey(updatedDoc.encryptedDocKey, updatedDoc) : generateDocumentKey();
      try {
        const convex = await authenticateConvexClient();
        const outcome = await commitDocWrite({
          convex,
          blobId: id,
          docKey,
          payload: buildDocPayload(updatedDoc),
          spaceId: updatedDoc.vaultId,
          isNew: false,
          client: clientOf(),
          tool: "vault_doc_edit",
          summary: `Edit ${field} of "${doc.title}"`,
          reason
        });
        if (outcome.status === "pending_approval") return pendingResult(outcome, { id, field, value });
        upsertDocument({ ...updatedDoc, encryptedDocKey: outcome.encryptedDocKey, keyVersion: outcome.keyVersion, syncStatus: "synced" });
        return json({ status: "updated", id, field, value });
      } finally {
        docKey.fill(0);
      }
    }
  );
  server.tool(
    "vault_doc_delete",
    "Delete a document (local + server). Deletes directly where this agent may write; otherwise asks the user on their phone and returns pending_approval.",
    {
      ...docRefShape,
      reason: z.string().optional().describe("Why, in a sentence \u2014 shown to the user if approval is needed")
    },
    async ({ id: rawId, path: path8, reason }) => {
      await ensureConnectionState();
      const id = resolveDocRef({ id: rawId, path: path8 });
      const doc = id ? getDocumentById(id) : null;
      if (!id || !doc) return notFound({ id: rawId, path: path8 });
      const convex = await authenticateConvexClient();
      const outcome = await commitDelete({ convex, doc, client: clientOf(), tool: "vault_doc_delete", reason });
      if (outcome.status === "pending_approval") return pendingResult(outcome, { id, title: doc.title });
      deleteDocument(id);
      return json({ status: "deleted", id, title: doc.title });
    }
  );
  server.tool(
    "vault_doc_download",
    "Download the original document file (PDF, image) to ~/Downloads/ and return the file path",
    {
      ...docRefShape,
      outputPath: z.string().optional().describe("Custom output path (default: ~/Downloads/<title>.<ext>)")
    },
    async ({ id: rawId, path: docPath, outputPath }) => {
      await ensureSynced();
      const client2 = clientOf();
      const id = resolveDocRef({ id: rawId, path: docPath });
      const local = id ? getDocumentById(id) : null;
      const granted = !local && id ? getGrantedDoc(client2.key, id) : null;
      const doc = local ?? granted;
      if (!id || !doc) return notFound({ id: rawId, path: docPath });
      const hasR2 = !!(doc.fileAssetKey || granted && doc.fileAssetProvider);
      const storageId = doc.encryptedStorageId || doc.storageId;
      if (!hasR2 && !storageId) return json({ error: "No file attached to this document" });
      const convex = await authenticateConvexClient();
      const config = loadConfig();
      let rawBytes;
      if (granted) {
        const info = await convex.action(api.agentRequests.requestGrantedFileUrl, { blobId: id, client: client2.key });
        const response = await fetch(info.url);
        if (!response.ok) return json({ error: `R2 download failed: ${response.status}` });
        rawBytes = new Uint8Array(await response.arrayBuffer());
      } else if (hasR2) {
        const downloadInfo = await convex.action(api.r2Assets.requestFileDownloadUrl, { blobId: doc.id, vaultId: doc.vaultId ?? config.vaultId });
        const response = await fetch(downloadInfo.url);
        if (!response.ok) return json({ error: `R2 download failed: ${response.status}` });
        rawBytes = new Uint8Array(await response.arrayBuffer());
      } else {
        const fileUrl = await convex.query(api.storage.getUrl, { storageId });
        if (!fileUrl) return json({ error: "File not found on server" });
        const response = await fetch(fileUrl);
        if (!response.ok) return json({ error: `Download failed: ${response.status}` });
        rawBytes = new Uint8Array(await response.arrayBuffer());
      }
      let fileBytes;
      if (granted) {
        const docKey = openGrantedDocKey(client2.key, id);
        if (!docKey) return json({ error: "The grant for this document is no longer held \u2014 ask again with vault_request" });
        fileBytes = decrypt(rawBytes, docKey);
        docKey.fill(0);
      } else if ((hasR2 || doc.encryptedStorageId) && doc.encryptedDocKey) {
        const docKey = unwrapDocumentKey(doc.encryptedDocKey, doc);
        fileBytes = decrypt(rawBytes, docKey);
        docKey.fill(0);
      } else {
        fileBytes = rawBytes;
      }
      const { default: fs7 } = await import("fs");
      const { default: path8 } = await import("path");
      const { default: os7 } = await import("os");
      const mime = doc.mimeType ?? doc.fileAssetMimeType;
      const ext = mime ? { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mime] ?? "bin" : "bin";
      const safeName = (doc.title || "document").replace(/[/\\:*?"<>|]/g, "_");
      const finalPath = outputPath || path8.join(os7.homedir(), "Downloads", `${safeName}.${ext}`);
      const dir = path8.dirname(finalPath);
      if (!fs7.existsSync(dir)) fs7.mkdirSync(dir, { recursive: true });
      fs7.writeFileSync(finalPath, fileBytes);
      return json({ status: "downloaded", id, path: finalPath, size: fileBytes.length, title: doc.title });
    }
  );
  server.tool(
    "vault_sync",
    "Sync documents from the server",
    { full: z.boolean().default(false).describe("Force full sync") },
    async ({ full }) => {
      await ensureUnlocked();
      const keys = getVaultKeys();
      const config = loadConfig();
      if (full || !config.lastSyncTimestamp) {
        const count = await syncFull(keys);
        return json({ status: "synced", mode: "full", documents: count });
      } else {
        const { count, deleted } = await syncIncremental(keys);
        return json({ status: "synced", mode: "incremental", updated: count, deleted });
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
      return json({
        totalDocuments: getDocumentCount(),
        documentTypes: getDocumentTypeCounts(),
        lastSync: config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toISOString() : null
      });
    }
  );
  server.tool(
    "vault_doc_upload",
    "Upload a local file (PDF, image) to the vault. Extracts text/fields via Gemini, encrypts, and syncs. Where this agent may not write, the upload is proposed on the user's phone and the result is pending_approval.",
    { filePath: z.string().describe("Absolute path to the file") },
    async ({ filePath }) => {
      await ensureConnectionState();
      const { default: fs7 } = await import("fs");
      const { default: path8 } = await import("path");
      const crypto10 = await import("crypto");
      if (!fs7.existsSync(filePath)) return json({ error: "File not found" });
      const direct = writeGoesDirect(void 0, true);
      const fileBuffer = fs7.readFileSync(filePath);
      const fileBytes = new Uint8Array(fileBuffer);
      const fileName = path8.basename(filePath);
      const ext = path8.extname(filePath).toLowerCase().slice(1);
      const mimeType = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" }[ext] ?? "application/octet-stream";
      const hash = crypto10.createHash("sha256").update(fileBytes).digest("hex");
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
      const docKey = generateDocumentKey();
      const encFileBytes = encrypt(fileBytes, docKey);
      try {
        await convex.mutation(api.storage.deleteFile, { storageId: persistedStorageId });
      } catch {
      }
      const now = Date.now();
      const localDoc = { id: docId, title: extracted.title || fileName, rawText: extracted.rawText || "", type: extracted.type || "generic", tags: extracted.tags || [], fields: extracted.fields || {}, organizations: extracted.organizations || [], mentions: extracted.mentions || [], embedding: extracted.embedding || void 0, owner: extracted.owner || "Unknown", mimeType, dateAdded: (/* @__PURE__ */ new Date()).toISOString(), status: "ready", savedBy: savedByNow(clientOf()), createdAt: now, updatedAt: now, syncStatus: "synced" };
      const payload = buildDocPayload(localDoc, { embedding: extracted.embedding || null, fileName, fileHash: hash });
      if (!direct) {
        const stageUrl = await convex.mutation(api.storage.generateUploadUrl, {});
        const stageResp = await fetch(stageUrl, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: encFileBytes });
        if (!stageResp.ok) {
          docKey.fill(0);
          throw new Error(`Staging upload failed: ${stageResp.status}`);
        }
        const { storageId: stagedId } = await stageResp.json();
        const dropFile = { storageId: stagedId, mimeType, size: fileBytes.length, fileName };
        try {
          const proposed = await commitDocWrite({
            convex,
            blobId: docId,
            docKey,
            isNew: true,
            client: clientOf(),
            tool: "vault_doc_upload",
            payload,
            dropFile,
            summary: `Upload "${localDoc.title}"`
          });
          if (proposed.status === "pending_approval") {
            stagedDropFiles.set(proposed.requestId, stagedId);
            return pendingResult(proposed, { id: docId, title: localDoc.title, type: localDoc.type });
          }
          try {
            await convex.mutation(api.storage.deleteFile, { storageId: stagedId });
          } catch {
          }
          return json({ status: "created_without_file", id: docId, message: "Saved the document, but the file was staged for a proposal that turned out not to be needed. Upload again to attach it." });
        } catch (err) {
          try {
            await convex.mutation(api.storage.deleteFile, { storageId: stagedId });
          } catch {
          }
          throw err;
        } finally {
          docKey.fill(0);
        }
      }
      const outcome = await commitDocWrite({
        convex,
        blobId: docId,
        docKey,
        isNew: true,
        client: clientOf(),
        tool: "vault_doc_upload",
        payload,
        summary: `Upload "${localDoc.title}"`
      });
      if (outcome.status !== "written") {
        docKey.fill(0);
        return pendingResult(outcome);
      }
      localDoc.encryptedDocKey = outcome.encryptedDocKey;
      localDoc.keyVersion = outcome.keyVersion;
      localDoc.vaultId = outcome.spaceId ?? void 0;
      const vaultId = outcome.spaceId ?? void 0;
      const fileUploadInfo = await convex.action(api.r2Assets.requestFileUploadUrl, { blobId: docId, vaultId, mimeType: "application/octet-stream", size: encFileBytes.length });
      const r2Resp = await fetch(fileUploadInfo.url, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: encFileBytes });
      if (!r2Resp.ok) throw new Error(`R2 upload failed: ${r2Resp.status}`);
      await convex.mutation(api.r2Assets.patchFileAssetRef, { blobId: docId, vaultId, provider: "r2", key: fileUploadInfo.key, mimeType, size: encFileBytes.length, version: 1, status: "ready" });
      localDoc.fileAssetProvider = "r2";
      localDoc.fileAssetKey = fileUploadInfo.key;
      localDoc.fileAssetMimeType = mimeType;
      localDoc.fileAssetSize = encFileBytes.length;
      localDoc.fileAssetVersion = 1;
      localDoc.fileAssetStatus = "ready";
      upsertDocument(localDoc);
      const preview = await attachPreview(convex, { docId, vaultId, docKey, localDoc, filePath, mimeType });
      docKey.fill(0);
      return json({ status: "uploaded", id: docId, title: localDoc.title, type: localDoc.type, tags: localDoc.tags, preview });
    }
  );
  async function createTextDoc(args) {
    await ensureConnectionState();
    const crypto10 = await import("crypto");
    const contentBytes = new TextEncoder().encode(args.content);
    if (contentBytes.byteLength > 200 * 1024) return json({ error: "Content exceeds 200KB limit" });
    const docId = crypto10.createHash("sha256").update(contentBytes).digest("hex");
    const existingDoc = getDocumentById(docId);
    if (existingDoc) return json({ status: "duplicate", id: docId, title: existingDoc.title });
    const convex = await authenticateConvexClient();
    let extracted;
    if (args.extract) {
      extracted = await convex.action(api.proxy.processText, { textContent: args.content, fileName: args.title }).catch((error) => {
        console.warn(`[moivault] processText failed for "${args.title}"; storing text document without AI extraction: ${errorMessage(error)}`);
        return fallbackTextExtraction(args.content, args.type);
      });
    } else {
      extracted = { rawText: args.content, type: args.type || "note", tags: [], fields: {}, organizations: [], mentions: [], owner: "Unknown" };
      try {
        extracted.embedding = await convex.action(api.search.embedQuery, { query: `${args.title}
${args.content}` });
      } catch {
      }
    }
    if (args.type) extracted.type = args.type;
    if (args.tags) {
      const extraTags = args.tags.split(",").map((t) => t.trim()).filter(Boolean);
      extracted.tags = [.../* @__PURE__ */ new Set([...extracted.tags || [], ...extraTags])];
    }
    const client2 = clientOf();
    const now = Date.now();
    const localDoc = {
      id: docId,
      title: args.title,
      rawText: extracted.rawText || args.content,
      markdownContent: args.content,
      type: extracted.type || "note",
      tags: extracted.tags || [],
      fields: { ...extracted.fields || {}, ...args.extraFields ?? {} },
      organizations: extracted.organizations || [],
      mentions: extracted.mentions || [],
      embedding: extracted.embedding || void 0,
      owner: extracted.owner || "Unknown",
      mimeType: "text/markdown",
      dateAdded: (/* @__PURE__ */ new Date()).toISOString(),
      status: "ready",
      savedBy: savedByNow(client2),
      createdAt: now,
      updatedAt: now,
      syncStatus: "synced"
    };
    const docKey = generateDocumentKey();
    try {
      const outcome = await commitDocWrite({
        convex,
        blobId: docId,
        docKey,
        isNew: true,
        client: client2,
        tool: args.tool,
        payload: buildDocPayload(localDoc, { embedding: extracted.embedding || null }),
        summary: `Save ${localDoc.type} "${localDoc.title}"`,
        reason: args.reason
      });
      if (outcome.status === "pending_approval") return pendingResult(outcome, { title: localDoc.title, type: localDoc.type });
      upsertDocument({ ...localDoc, encryptedDocKey: outcome.encryptedDocKey, keyVersion: outcome.keyVersion, vaultId: outcome.spaceId ?? void 0 });
      return json({ status: "created", id: docId, title: localDoc.title, type: localDoc.type, tags: localDoc.tags, owner: localDoc.owner });
    } finally {
      docKey.fill(0);
    }
  }
  server.tool(
    "vault_doc_create",
    "Create a text/markdown document in the vault. Extracts metadata via Gemini, encrypts, and syncs. Where this agent may not write, the document is proposed on the user's phone and the result is pending_approval.",
    {
      title: z.string().describe("Document title"),
      content: z.string().describe("Markdown/text content"),
      type: z.string().optional().describe("Force document type (default: auto-classify)"),
      tags: z.string().optional().describe("Comma-separated tags to add"),
      reason: z.string().optional().describe("Why you are saving this, in a sentence \u2014 shown to the user if approval is needed")
    },
    async ({ title, content, type, tags, reason }) => createTextDoc({ title, content, type, tags, reason, tool: "vault_doc_create", extract: true })
  );
  server.tool(
    "vault_remember",
    "Save a short fact about the user as a note (e.g. 'Prefers aisle seats'). Stored encrypted, marked as saved by this agent. May need the user's approval.",
    {
      fact: z.string().describe("The fact, in one or two sentences"),
      reason: z.string().optional().describe("Why it is worth keeping \u2014 shown to the user if approval is needed")
    },
    async ({ fact, reason }) => {
      const firstLine = fact.trim().split("\n")[0];
      const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}\u2026` : firstLine;
      return createTextDoc({
        title,
        content: fact.trim(),
        type: "note",
        reason,
        tool: "vault_remember",
        extract: false,
        extraFields: { createdBy: clientOf().display }
      });
    }
  );
  server.tool(
    "vault_doc_update_content",
    "Replace the markdown content of an existing document. Re-processes rawText and embedding via Gemini. May be proposed for approval instead of written.",
    {
      docId: z.string().optional().describe("Document ID"),
      path: z.string().optional().describe("Document path, as an alternative to docId"),
      content: z.string().describe("New markdown/text content"),
      reason: z.string().optional().describe("Why, in a sentence \u2014 shown to the user if approval is needed")
    },
    async ({ docId: rawId, path: path8, content, reason }) => {
      await ensureConnectionState();
      const contentBytes = new TextEncoder().encode(content);
      if (contentBytes.byteLength > 200 * 1024) return json({ error: "Content exceeds 200KB limit" });
      const docId = resolveDocRef({ id: rawId, path: path8 });
      const localDoc = docId ? getDocumentById(docId) : null;
      if (!docId || !localDoc) return notFound({ id: rawId, path: path8 });
      const convex = await authenticateConvexClient();
      const extracted = await convex.action(api.proxy.processText, { textContent: content, fileName: localDoc.title });
      const docKey = localDoc.encryptedDocKey && localDoc.encryptedDocKey.length > 0 ? unwrapDocumentKey(localDoc.encryptedDocKey, localDoc) : generateDocumentKey();
      const updatedDoc = {
        ...localDoc,
        markdownContent: content,
        rawText: extracted.rawText || content,
        embedding: extracted.embedding || localDoc.embedding,
        updatedAt: Date.now(),
        syncStatus: "synced"
      };
      try {
        const outcome = await commitDocWrite({
          convex,
          blobId: docId,
          docKey,
          payload: buildDocPayload(updatedDoc),
          spaceId: updatedDoc.vaultId,
          isNew: false,
          client: clientOf(),
          tool: "vault_doc_update_content",
          summary: `Replace the content of "${localDoc.title}"`,
          reason
        });
        if (outcome.status === "pending_approval") return pendingResult(outcome, { id: docId, title: localDoc.title });
        upsertDocument({ ...updatedDoc, encryptedDocKey: outcome.encryptedDocKey, keyVersion: outcome.keyVersion });
        return json({ status: "updated", id: docId, title: localDoc.title });
      } finally {
        docKey.fill(0);
      }
    }
  );
  server.tool(
    "vault_people_list",
    "List all people in the vault with their document counts",
    {},
    async () => {
      await ensureSynced();
      const owners = getDatabase().prepare("SELECT owner, COUNT(*) as count FROM documents WHERE owner IS NOT NULL AND owner != 'Unknown' AND id != '__people_registry__' GROUP BY owner ORDER BY count DESC").all();
      return json(owners);
    }
  );
  server.tool(
    "vault_people_docs",
    "List documents belonging to a specific person",
    { name: z.string().describe("Person name (partial match)") },
    async ({ name }) => {
      await ensureSynced();
      const docs = getDatabase().prepare("SELECT id, title, type, owner, dateAdded FROM documents WHERE owner LIKE @pat COLLATE NOCASE AND id != '__people_registry__' ORDER BY updatedAt DESC").all({ pat: `%${name}%` });
      return json(withPath(docs, buildPathIndex()));
    }
  );
  server.tool(
    "vault_chunk_status",
    "Show the chunk index status for RAG context retrieval",
    {},
    async () => {
      await ensureSynced();
      return json({
        totalDocs: getDocumentCount(),
        chunkedDocs: getChunkedDocCount(),
        totalChunks: getChunkCount()
      });
    }
  );
  server.tool(
    "vault_ls",
    "List a folder of the vault like a filesystem: vault/<space>/<person>/<file>. Start at 'vault/'. On a file path, returns that file's summary.",
    { path: z.string().default("vault/").describe("Folder or file path, e.g. vault/ or vault/family/priya") },
    async ({ path: path8 }) => {
      await ensureSynced();
      const index2 = getBrowseIndex();
      const query = normalizePathQuery(path8);
      const fileId = index2.byPath.get(query);
      if (fileId) {
        const row = index2.rowById.get(fileId);
        return json({
          kind: "file",
          path: displayPath(query),
          id: fileId,
          title: row.title,
          type: row.type,
          owner: row.owner,
          ...row.dateAdded ? { dateAdded: row.dateAdded } : {},
          ...row.expiresAt ? { expiresAt: row.expiresAt } : {},
          ...row.source === "context" ? { readable: false, next: askFor(fileId) } : { readable: true }
        });
      }
      const prefix = query ? `${query}/` : "";
      const dirs = /* @__PURE__ */ new Map();
      const files = [];
      for (const [id, p] of index2.byId) {
        if (!p.startsWith(prefix)) continue;
        const rest = p.slice(prefix.length);
        const slash = rest.indexOf("/");
        if (slash === -1) {
          const row = index2.rowById.get(id);
          files.push({ name: rest, id, title: row?.title ?? null, type: row?.type ?? null, ...row?.source === "context" ? { readable: false } : {} });
        } else {
          const dir = rest.slice(0, slash);
          dirs.set(dir, (dirs.get(dir) ?? 0) + 1);
        }
      }
      if (dirs.size === 0 && files.length === 0) {
        if (query) return json({ error: "No such path", path: displayPath(query) });
        return json({ path: "vault/", entries: [], hint: isConnectionSession() ? emptyHint() : "The vault is empty \u2014 try vault_sync." });
      }
      const entries = [
        ...[...dirs.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name: `${name}/`, kind: "dir", count })),
        ...files.sort((a, b) => a.name.localeCompare(b.name)).map((f) => ({ ...f, kind: "file" }))
      ];
      return json({
        path: displayPath(query ? `${query}/` : ""),
        entries,
        ...index2.fromContext ? { note: "Entries marked readable: false are listed on the context card only \u2014 ask for them with vault_request({ reason, blobIds })." } : {}
      });
    }
  );
  server.tool(
    "vault_tree",
    "Show the vault as a tree (spaces \u2192 people \u2192 files), to a given depth. depth 2 shows folders only; 3 includes files.",
    {
      depth: z.number().int().min(1).max(3).default(2).describe("1 = spaces, 2 = people, 3 = files"),
      path: z.string().optional().describe("Start below this folder instead of the root")
    },
    async ({ depth, path: path8 }) => {
      await ensureSynced();
      const index2 = getBrowseIndex();
      const root = normalizePathQuery(path8);
      const prefix = root ? `${root}/` : "";
      const tree = { children: /* @__PURE__ */ new Map(), count: 0 };
      for (const [id, p] of index2.byId) {
        if (!p.startsWith(prefix)) continue;
        const parts = p.slice(prefix.length).split("/");
        let node = tree;
        node.count++;
        parts.forEach((part, i) => {
          const isFile = i === parts.length - 1;
          const key = isFile ? part : `${part}/`;
          if (!node.children.has(key)) node.children.set(key, { children: /* @__PURE__ */ new Map(), count: 0 });
          node = node.children.get(key);
          node.count++;
          if (isFile) node.id = id;
        });
      }
      const lines = [displayPath(prefix)];
      const MAX_LINES = 500;
      const walk = (node, level, indent) => {
        if (level > depth) return;
        const keys = [...node.children.keys()].sort((a, b) => a.endsWith("/") === b.endsWith("/") ? a.localeCompare(b) : a.endsWith("/") ? -1 : 1);
        for (const key of keys) {
          if (lines.length >= MAX_LINES) return;
          const child = node.children.get(key);
          if (key.endsWith("/")) {
            lines.push(`${indent}${key} (${child.count})`);
            walk(child, level + 1, `${indent}  `);
          } else {
            const listedOnly = index2.rowById.get(child.id)?.source === "context";
            lines.push(`${indent}${key}  [${child.id}]${listedOnly ? " (ask)" : ""}`);
          }
        }
      };
      walk(tree, 1, "  ");
      if (lines.length >= MAX_LINES) lines.push("  \u2026 (truncated \u2014 use a deeper path or vault_ls)");
      return json({
        totalDocs: tree.count,
        tree: lines.join("\n"),
        ...index2.fromContext ? { note: "(ask) = listed on the context card only; request it with vault_request({ reason, blobIds })." } : {},
        ...tree.count === 0 && isConnectionSession() ? { hint: emptyHint() } : {}
      });
    }
  );
  server.tool(
    "vault_profile",
    "A quick profile of what this agent can see: the people, document counts by type, and upcoming expiries/deadlines in the next 90 days.",
    {},
    async () => {
      await ensureSynced();
      const card = usesContextCard() ? getContextCard() : null;
      if (card) {
        const now2 = Date.now();
        const horizon2 = now2 + 90 * 24 * 60 * 60 * 1e3;
        const upcoming2 = card.docs.map((d) => {
          const raw = d.expiresAt ?? d.date;
          const ts = raw == null ? NaN : typeof raw === "number" ? raw : upcomingDate("_", { expiryDate: String(raw) })?.ts ?? NaN;
          return { d, raw, ts };
        }).filter((x) => Number.isFinite(x.ts) && x.ts >= now2 && x.ts <= horizon2).sort((a, b) => a.ts - b.ts).slice(0, 30).map(({ d, raw, ts }) => ({ id: d.blobId, title: d.title, type: d.type, owner: d.owner, [d.expiresAt != null ? "expiresAt" : "date"]: raw, daysLeft: Math.ceil((ts - now2) / 864e5) }));
        return json({
          totalDocuments: card.docs.length,
          people: card.people.map((p) => ({ name: p.name, count: p.docCount })),
          byType: Object.entries(card.counts).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count })),
          upcoming: upcoming2,
          cardGeneratedAt: new Date(card.generatedAt).toISOString(),
          scope: "From the context card (titles, types, owners, dates). For a document's contents, ask with vault_request({ reason, blobIds })."
        });
      }
      if (getPreset() === "private") {
        return json({ totalDocuments: getDocumentCount(), people: [], byType: getDocumentTypeCounts().filter((t) => t.type), upcoming: [], hint: PRIVATE_HINT });
      }
      const aliasMap = loadAliasMap();
      const rows = getDatabase().prepare("SELECT id, title, type, owner, fields FROM documents WHERE id != '__people_registry__'").all();
      const people = /* @__PURE__ */ new Map();
      const upcoming = [];
      const now = Date.now();
      const horizon = now + 90 * 24 * 60 * 60 * 1e3;
      for (const row of rows) {
        if (ownerSegment(row.owner) !== "unfiled") {
          const name = resolveCanonicalName(aliasMap, row.owner);
          people.set(name, (people.get(name) ?? 0) + 1);
        }
        let fields = {};
        try {
          fields = row.fields ? JSON.parse(row.fields) : {};
        } catch {
        }
        const d = upcomingDate(row.type, fields);
        if (d && d.ts >= now && d.ts <= horizon) {
          upcoming.push({ id: row.id, title: row.title, type: row.type, owner: row.owner, field: d.field, date: d.date, daysLeft: Math.ceil((d.ts - now) / 864e5) });
        }
      }
      upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
      const result = {
        totalDocuments: rows.length,
        people: [...people.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
        byType: getDocumentTypeCounts().filter((t) => t.type),
        upcoming: upcoming.slice(0, 30)
      };
      if (isConnectionSession()) {
        result.scope = "Only spaces shared with this agent in full. Private documents are not counted; ask with vault_request.";
      }
      return json(result);
    }
  );
  server.tool(
    "vault_permissions",
    "What this agent can see right now: spaces shared in full (and whether it may write there), spaces that need asking, and documents granted 'always'.",
    {},
    async () => {
      await ensureConnectionState();
      if (!isConnectionSession()) {
        return json({ mode: "legacy", note: "This machine was linked with the older method and can read every space. Reconnect from the app (Settings \u2192 AI agents) to make it revocable and scoped." });
      }
      const client2 = clientOf();
      invalidateKeyRing();
      const convex = await authenticateConvexClient();
      const state2 = getConnectionState();
      const manifest = getManifest();
      const canWrite = new Map((state2?.grants ?? []).map((g) => [g.spaceId, g.canWrite]));
      const canDelete = new Map((state2?.grants ?? []).map((g) => [g.spaceId, g.canDelete === true]));
      let alwaysDocs = [];
      try {
        alwaysDocs = await convex.query(api.agentRequests.listMyDocGrants, { client: client2.key });
      } catch {
      }
      const granted = new Map(listGrantedDocs(client2.key).map((d) => [d.id, d]));
      const secrets = await loadConnectionSecrets();
      const intended = intendedClient();
      const preset = getPreset() ?? "private";
      const presetWords = {
        full: "Full \u2014 you can read every space the user shared, and create or edit documents directly. Deleting a document is proposed to the user unless they allowed deletes. Opening a sensitive document (IDs, medical, tax, bank\u2026) sends them a notice.",
        standard: "Standard \u2014 you can see what exists (titles, types, owners, dates) but not contents. Ask for specific documents with vault_request({ reason, blobIds }). Every write is proposed to the user for approval.",
        private: "Private \u2014 you see nothing until the user approves a request. Ask with vault_request and a clear reason. Every write is proposed to the user for approval."
      };
      return json({
        mode: "connection",
        preset,
        whatThisMeans: presetWords[preset] ?? presetWords.private,
        contextCard: getContextCard() ? { documents: getContextCard().docs.length, generatedAt: new Date(getContextCard().generatedAt).toISOString() } : null,
        agent: client2.display,
        client: client2.key,
        intendedAgent: intended ? { client: intended.key, display: intended.display } : null,
        // The user's own shell is never out of place (the server exempts it too).
        ...intended && intended.key !== client2.key && client2.key !== "terminal" ? { mismatch: `This connection was set up for ${intended.display}. You can keep working, but the user's phone notes that ${client2.display} used it and may ask them to allow or block you.` } : {},
        machine: loadConfig().connection?.label ?? null,
        connectionId: secrets?.connectionId ?? null,
        fullSpaces: (manifest?.spaces ?? []).filter((s) => s.mode === "full").map((s) => ({ spaceId: s.spaceId, name: s.name, kind: s.kind, canWrite: canWrite.get(s.spaceId) ?? false, canDelete: canDelete.get(s.spaceId) ?? false })),
        askSpaces: (manifest?.spaces ?? []).filter((s) => s.mode !== "full").map((s) => ({ spaceId: s.spaceId, name: s.name, kind: s.kind })),
        alwaysDocuments: alwaysDocs.map((d) => ({ id: d.blobId, spaceId: d.vaultId, title: granted.get(d.blobId)?.title ?? null })),
        heldThisSession: [...granted.values()].map((d) => ({ id: d.id, title: d.title, type: d.type })),
        ...manifest ? {} : { note: "No manifest from the phone yet \u2014 the pairing may still be settling." }
      });
    }
  );
  server.tool(
    "vault_request",
    "Ask the user, on their phone, for access to private documents (kind 'read') or to a whole space (kind 'space'). Returns immediately with a requestId; then wait with vault_request_status. Ask for the narrowest thing you need and say why. If you saw the document listed (vault_ls, vault_search), pass its id in blobIds.",
    {
      reason: z.string().min(3).describe("Why you need it, in the user's terms \u2014 shown on their phone. E.g. 'To fill the visa form you asked for, I need your passport number and expiry.'"),
      hint: z.string().optional().describe("What to look for, e.g. 'passport'. The phone suggests matching documents from this."),
      kind: z.enum(["read", "space"]).default("read").describe("'read' = specific documents; 'space' = full access to one space"),
      spaceId: z.string().optional().describe("For kind 'space': which space (see vault_permissions askSpaces)"),
      blobIds: z.array(z.string()).max(50).optional().describe("Exact documents you saw listed (ids from vault_ls / vault_search / the context card). The phone preselects exactly these.")
    },
    async ({ reason, hint, kind, spaceId, blobIds }) => {
      await ensureConnectionState();
      if (!isConnectionSession()) {
        return json({ error: "not_paired", message: "Requests need a paired machine. This one was linked with the older method and already reads every space." });
      }
      if (kind === "space" && !spaceId) return json({ error: "spaceId is required for kind 'space' \u2014 see vault_permissions" });
      const client2 = clientOf();
      const convex = await authenticateConvexClient();
      const sealedReason = sealJsonToUser({
        reason,
        ...hint ? { hint } : {},
        client: client2.key,
        tool: "vault_request",
        ...kind === "read" && blobIds && blobIds.length > 0 ? { blobIds } : {}
      });
      const { requestId } = await convex.mutation(api.agentRequests.create, {
        kind,
        client: client2.key,
        sealedReason,
        ...kind === "space" ? { spaceId } : {}
      });
      return json({ requestId, status: "pending", message: "Asked on the user's phone. Wait for their answer with vault_request_status (it can wait up to 60 seconds per call)." });
    }
  );
  server.tool(
    "vault_request_status",
    "Wait for the user's answer to a vault_request or a proposed write. When documents were approved, returns their text and fields (held in memory only, never saved on this machine).",
    {
      requestId: z.string().describe("From vault_request, or from a write that returned pending_approval"),
      waitSeconds: z.number().min(0).max(60).default(30).describe("How long to wait for an answer, up to 60")
    },
    async ({ requestId, waitSeconds }) => {
      await ensureConnectionState();
      const client2 = clientOf();
      const convex = await authenticateConvexClient();
      const deadline = Date.now() + Math.min(60, Math.max(0, waitSeconds)) * 1e3;
      let status;
      for (; ; ) {
        status = await convex.query(api.agentRequests.status, { requestId });
        if (status.status !== "pending" || Date.now() >= deadline) break;
        await new Promise((r) => setTimeout(r, Math.min(2e3, Math.max(0, deadline - Date.now()))));
      }
      if (status.status === "pending") {
        return json({ requestId, status: "pending", message: "Still waiting on the user. Call vault_request_status again, or carry on and check later." });
      }
      const staged = stagedDropFiles.get(requestId);
      if (staged && (status.status === "denied" || status.status === "expired")) {
        try {
          await convex.mutation(api.storage.deleteFile, { storageId: staged });
        } catch {
        }
        stagedDropFiles.delete(requestId);
      } else if (staged && status.status === "approved") {
        stagedDropFiles.delete(requestId);
      }
      if (status.status === "denied") {
        return json({ requestId, status: "denied", message: "The user declined. Don't ask again for the same thing unless they bring it up." });
      }
      if (status.status === "expired") {
        return json({ requestId, status: "expired", message: "The request expired unanswered. Ask again only if it still matters, with a clearer reason." });
      }
      const result = { requestId, status: "approved", scope: status.scope, ...status.kind ? { kind: status.kind } : {} };
      if (status.kind === "write") {
        try {
          await syncIncremental(getVaultKeys());
        } catch {
        }
        result.message = "Approved. The user's phone saved the change.";
        return json(result);
      }
      if (status.kind === "space" || status.scope === "space" || !status.kind && status.spaceId && status.grantedDocs.length === 0) {
        invalidateKeyRing();
        await authenticateConvexClient();
        try {
          await syncIncremental(getVaultKeys());
        } catch {
        }
        result.message = "Space access granted. Its documents are synced \u2014 use vault_search / vault_ls as usual.";
        return json(result);
      }
      if (status.grantedDocs.length > 0) {
        const docs = await fetchGrantedDocs(convex, client2.key, status.grantedDocs.map((d) => d.blobId), requestId);
        const MAX_TEXT = 2e4;
        result.documents = docs.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          owner: d.owner,
          fields: d.fields,
          text: (d.markdownContent || d.rawText || "").slice(0, MAX_TEXT),
          truncated: (d.markdownContent || d.rawText || "").length > MAX_TEXT,
          hasFile: !!d.fileAssetProvider
        }));
        result.message = status.scope === "always" ? "Approved for good: these documents stay readable by you (fetch them again by id with vault_doc_get)." : "Approved once. Use what you need now; the grant lapses in about 15 minutes, and nothing was saved on this machine.";
        return json(result);
      }
      if (status.kind === "read") {
        result.message = "Approved, but no documents were attached \u2014 ask again more specifically if you still need them.";
        return json(result);
      }
      try {
        await syncIncremental(getVaultKeys());
      } catch {
      }
      result.message = "Approved. For a proposed write, the user's phone has saved it. For a read request, no documents were attached \u2014 ask again more specifically if you still need them.";
      return json(result);
    }
  );
  server.tool(
    "vault_places",
    "List saved places (restaurants/cafes/bars/attractions). Each row is a single venue with a Google Maps URL and visit/wishlist status; multi-place reels are flattened. Use for 'places to visit', 'where should we eat', 'have we been to <X>'.",
    {
      filter: z.enum(["wishlist", "visited", "all"]).default("all").describe("wishlist (not yet visited) | visited | all"),
      area: z.string().optional().describe("Filter by neighborhood/locality (substring)"),
      city: z.string().optional().describe("Filter by city (substring)"),
      cuisine: z.string().optional().describe("Filter by cuisine (substring)"),
      placeType: z.string().optional().describe("Filter by place type (Restaurant/Cafe/Bar/Hotel/etc.)"),
      limit: z.number().default(50).describe("Max rows")
    },
    async ({ filter, area, city, cuisine, placeType, limit }) => {
      await ensureSynced();
      const rows = queryPlaces({ filter, area, city, cuisine, type: placeType, limit });
      return json({ count: rows.length, places: rows });
    }
  );
  server.tool(
    "vault_wishlist",
    "List products the user has saved. Defaults to wishlist (things they want to buy); flip filter to 'owned' for things they already have or 'researching' for items still being compared. Use for 'my wishlist', 'do I already have <X>', 'what was that thing I wanted'.",
    {
      filter: z.enum(["wishlist", "owned", "researching", "all"]).default("wishlist").describe("Status filter"),
      brand: z.string().optional().describe("Filter by brand (substring)"),
      category: z.string().optional().describe("Filter by category (substring)"),
      limit: z.number().default(50).describe("Max rows")
    },
    async ({ filter, brand, category, limit }) => {
      await ensureSynced();
      const rows = queryWishlist({ filter, brand, category, limit });
      return json({ count: rows.length, items: rows });
    }
  );
  server.tool(
    "vault_recipes",
    "List saved recipes with dish name, cuisine, course, total time, servings, calories, protein, dietary tags, and source URL. Use for 'what should I cook', 'high-protein meals', 'quick dinner ideas'.",
    {
      cuisine: z.string().optional().describe("Filter by cuisine (substring)"),
      course: z.string().optional().describe("Filter by course (breakfast/lunch/dinner/snack/dessert/drink)"),
      dietary: z.string().optional().describe("Filter by dietary tag (high-protein/vegan/keto/etc.)"),
      maxMinutes: z.number().optional().describe("Only recipes with totalTime <= maxMinutes"),
      limit: z.number().default(50).describe("Max rows")
    },
    async ({ cuisine, course, dietary, maxMinutes, limit }) => {
      await ensureSynced();
      const rows = queryRecipes({ cuisine, course, dietary, maxMinutes, limit });
      return json({ count: rows.length, recipes: rows });
    }
  );
  server.tool(
    "vault_apps",
    "List software apps the user has saved (wishlist + already-installed). Each row has the app name, developer, platforms, price, status, and a download link (App Store, Play Store, or website). Use for 'apps I want to try', 'what was that app', 'apps I use'.",
    {
      filter: z.enum(["wishlist", "installed", "all"]).default("all").describe("Status filter"),
      platform: z.string().optional().describe("Filter by platform (iOS/Android/macOS/Windows/Web)"),
      category: z.string().optional().describe("Filter by category (Productivity/Health/Finance/etc.)"),
      limit: z.number().default(50).describe("Max rows")
    },
    async ({ filter, platform, category, limit }) => {
      await ensureSynced();
      const rows = queryApps({ filter, platform, category, limit });
      return json({ count: rows.length, apps: rows });
    }
  );
  server.tool(
    "vault_hacks",
    "List life hacks / tips / tricks the user has saved (kitchen, home, productivity, money, travel, etc.). Each row has title, category, steps, time, savings, and a source URL. Use for 'any tips for X', 'how do I X', 'that hack about Y'.",
    {
      category: z.string().optional().describe("Filter by category (Kitchen/Home/Money/Productivity/Travel/etc.)"),
      difficulty: z.string().optional().describe("Easy / Medium / Hard"),
      limit: z.number().default(50).describe("Max rows")
    },
    async ({ category, difficulty, limit }) => {
      await ensureSynced();
      const rows = queryLifeHacks({ category, difficulty, limit });
      return json({ count: rows.length, hacks: rows });
    }
  );
  return server;
}
async function startMcpServer() {
  await loadConnectionSecrets();
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// src/mcp/rest.ts
import http2 from "http";
import { spawn as spawn2 } from "child_process";
import fs6 from "fs";
import os6 from "os";
import path7 from "path";
import crypto8 from "crypto";
var DEFAULT_PORT = 8797;
var DEFAULT_PUBLIC_URL = "https://moivaultmcp.wiloop.io";
var DEFAULT_DOWNLOAD_TTL_SECONDS = 15 * 60;
var MAX_BODY_BYTES = 1024 * 1024;
var MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
var mcp = null;
var mcpReady = false;
var mcpInitPromise = null;
var stdoutBuf = "";
var nextId = 1;
var pending = /* @__PURE__ */ new Map();
var downloadTokens = /* @__PURE__ */ new Map();
function inferContentType(filePath) {
  const ext = path7.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".heic") return "image/heic";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}
function extensionForMime(mimeType) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "text/markdown") return "md";
  if (mimeType === "text/plain") return "txt";
  return "bin";
}
function safeFilename(name) {
  return (name || "document").replace(/[/\\:*?"<>|\r\n]/g, "_");
}
function headerFilename(name, filePath) {
  const ext = path7.extname(filePath);
  const base = safeFilename(name).replace(/[^\x20-\x7E]/g, "_").trim() || "document";
  return `${base}${ext}`;
}
function json2(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
function getPublicBase(req) {
  if (process.env.MOIVAULT_PUBLIC_URL) return process.env.MOIVAULT_PUBLIC_URL.replace(/\/$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (host) {
    const proto = req.headers["x-forwarded-proto"] || "https";
    return `${proto}://${Array.isArray(host) ? host[0] : host}`.replace(/\/$/, "");
  }
  return DEFAULT_PUBLIC_URL;
}
function authOk(req, key) {
  return (req.headers.authorization || "") === `Bearer ${key}`;
}
function parseBool(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return void 0;
}
function parseIntParam(value, fallback) {
  if (value === void 0 || value === null || value === "") return fallback;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}
async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.byteLength;
    if (total > MAX_BODY_BYTES) throw Object.assign(new Error("request body too large"), { statusCode: 413 });
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}
async function readJsonBody(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw Object.assign(new Error("invalid JSON body"), { statusCode: 400 });
  }
}
function startMcp() {
  const bin = process.env.MOIVAULT_BIN;
  const command = bin || process.execPath;
  const args = bin ? ["mcp"] : [process.argv[1], "mcp"];
  console.log(`[moivault-rest] spawning MCP child: ${command} ${args.join(" ")}`);
  mcp = spawn2(command, args, {
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"]
  });
  mcp.stderr.on("data", (buf) => process.stderr.write(`[mcp] ${buf}`));
  mcp.stdout.on("data", (chunk) => {
    stdoutBuf += chunk.toString("utf8");
    let nl;
    while ((nl = stdoutBuf.indexOf("\n")) !== -1) {
      const line = stdoutBuf.slice(0, nl).trimEnd();
      stdoutBuf = stdoutBuf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        console.warn("[mcp] non-JSON stdout:", line);
        continue;
      }
      if (typeof msg.id === "number" && pending.has(msg.id)) {
        const call = pending.get(msg.id);
        pending.delete(msg.id);
        clearTimeout(call.timeout);
        if (msg.error) call.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else call.resolve(msg.result);
      }
    }
  });
  mcp.on("exit", (code) => {
    console.error(`[moivault-rest] MCP child exited ${code}; restarting in 2s`);
    mcpReady = false;
    mcpInitPromise = null;
    for (const [, call] of pending) {
      clearTimeout(call.timeout);
      call.reject(new Error("MCP child exited"));
    }
    pending.clear();
    setTimeout(startMcp, 2e3);
  });
  mcpInitPromise = initializeMcp();
}
async function initializeMcp() {
  const initId = nextId++;
  const frame = {
    jsonrpc: "2.0",
    id: initId,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "moivault-rest", version: "1.0.0" }
    }
  };
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(initId);
      reject(new Error("MCP initialize timeout"));
    }, 6e4);
    pending.set(initId, { resolve, reject, timeout });
    mcp.stdin.write(`${JSON.stringify(frame)}
`);
  });
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n");
  mcpReady = true;
  console.log("[moivault-rest] MCP initialized");
}
async function callTool(name, args = {}, timeoutMs = 12e4) {
  if (!mcp) startMcp();
  if (!mcpReady) await mcpInitPromise;
  const id = nextId++;
  const frame = { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } };
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`tool ${name} timeout`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timeout });
    mcp.stdin.write(`${JSON.stringify(frame)}
`);
  });
  return unwrapMcp(result);
}
function unwrapMcp(result) {
  const content = result?.content;
  if (!Array.isArray(content) || content.length === 0) return null;
  const first = content[0];
  if (first?.type !== "text" || typeof first.text !== "string") return content;
  try {
    return JSON.parse(first.text);
  } catch {
    return first.text;
  }
}
async function downloadDocument(id) {
  const meta = await callTool("vault_doc_get", { id });
  if (meta?.error) throw Object.assign(new Error(meta.error), { statusCode: 404 });
  const ext = extensionForMime(meta?.mimeType);
  const tmpDir = fs6.mkdtempSync(path7.join(os6.tmpdir(), "moivault-rest-"));
  const outputPath = path7.join(tmpDir, `${safeFilename(id)}.${ext}`);
  const result = await callTool("vault_doc_download", { id, outputPath }, 18e4);
  if (result?.error) throw Object.assign(new Error(result.error), { statusCode: 404 });
  if (!result?.path) throw new Error("download did not return a path");
  const stat = fs6.statSync(result.path);
  return {
    path: result.path,
    title: result.title || meta?.title || id,
    size: result.size || stat.size,
    contentType: meta?.mimeType || inferContentType(result.path),
    expiresAt: Date.now() + DEFAULT_DOWNLOAD_TTL_SECONDS * 1e3
  };
}
function issueDownloadToken(file, ttlSeconds) {
  const token = crypto8.randomBytes(32).toString("base64url");
  const ttl = Math.max(60, Math.min(ttlSeconds || DEFAULT_DOWNLOAD_TTL_SECONDS, 3600));
  downloadTokens.set(token, { ...file, expiresAt: Date.now() + ttl * 1e3 });
  return token;
}
function cleanupDownloads() {
  const now = Date.now();
  for (const [token, entry] of downloadTokens) {
    if (entry.expiresAt > now) continue;
    downloadTokens.delete(token);
    try {
      fs6.unlinkSync(entry.path);
    } catch {
    }
    try {
      fs6.rmdirSync(path7.dirname(entry.path));
    } catch {
    }
  }
}
async function uploadFromUrl(sourceUrl) {
  const parsed = new URL(sourceUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw Object.assign(new Error("sourceUrl must be http or https"), { statusCode: 400 });
  }
  const response = await fetch(sourceUrl);
  if (!response.ok) throw Object.assign(new Error(`sourceUrl fetch failed: ${response.status}`), { statusCode: 400 });
  const length = Number(response.headers.get("content-length") || "0");
  if (length > MAX_UPLOAD_BYTES) throw Object.assign(new Error("sourceUrl file too large"), { statusCode: 413 });
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) throw Object.assign(new Error("sourceUrl file too large"), { statusCode: 413 });
  const pathname = decodeURIComponent(parsed.pathname);
  const basename = safeFilename(path7.basename(pathname) || "upload.bin");
  const tmpDir = fs6.mkdtempSync(path7.join(os6.tmpdir(), "moivault-upload-"));
  const filePath = path7.join(tmpDir, basename.includes(".") ? basename : `${basename}.bin`);
  fs6.writeFileSync(filePath, Buffer.from(arrayBuffer));
  return filePath;
}
function routeParams(pathname, prefix, suffix = "") {
  if (!pathname.startsWith(prefix)) return null;
  if (suffix && !pathname.endsWith(suffix)) return null;
  const raw = pathname.slice(prefix.length, suffix ? -suffix.length : void 0);
  if (!raw || raw.includes("/")) return null;
  return decodeURIComponent(raw);
}
async function handleDownloadToken(req, res, token) {
  cleanupDownloads();
  const entry = downloadTokens.get(token);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) downloadTokens.delete(token);
    return json2(res, 404, { error: "download link expired or not found" });
  }
  const disposition = new URL(req.url || "/", "http://x").searchParams.get("disposition") === "inline" ? "inline" : "attachment";
  const body = fs6.readFileSync(entry.path);
  res.writeHead(200, {
    "content-type": entry.contentType,
    "content-length": body.byteLength,
    "content-disposition": `${disposition}; filename="${headerFilename(entry.title, entry.path)}"`,
    "cache-control": "private, max-age=300"
  });
  res.end(body);
}
async function handle(req, res, key) {
  cleanupDownloads();
  const url = new URL(req.url || "/", "http://x");
  const pathname = url.pathname;
  const q = Object.fromEntries(url.searchParams);
  if (req.method === "GET" && pathname === "/health") return json2(res, 200, { ok: true, mcpReady });
  if (req.method === "GET" && pathname === "/openapi.json") return json2(res, 200, openApiSpec(getPublicBase(req)));
  if (req.method === "GET" && pathname.startsWith("/downloads/")) {
    return handleDownloadToken(req, res, decodeURIComponent(pathname.slice("/downloads/".length)));
  }
  if (!authOk(req, key)) {
    res.writeHead(401, { "www-authenticate": "Bearer", "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }
  const body = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "") ? await readJsonBody(req) : {};
  if (req.method === "GET" && pathname === "/search") {
    if (!q.query) return json2(res, 400, { error: "query is required" });
    return json2(res, 200, await callTool("vault_search", {
      query: q.query,
      mode: q.mode || "hybrid",
      type: q.type || void 0,
      limit: parseIntParam(q.limit, 10)
    }));
  }
  if ((req.method === "GET" || req.method === "POST") && pathname === "/context") {
    const source = req.method === "GET" ? q : body;
    if (!source.query) return json2(res, 400, { error: "query is required" });
    return json2(res, 200, await callTool("vault_context", {
      query: source.query,
      limit: parseIntParam(source.limit, 5),
      maxChunksPerDoc: parseIntParam(source.maxChunksPerDoc, 4),
      includeFields: parseBool(source.includeFields) ?? false
    }));
  }
  if (req.method === "GET" && pathname === "/documents") {
    return json2(res, 200, await callTool("vault_doc_list", { type: q.type || void 0, limit: parseIntParam(q.limit, 50) }));
  }
  if (req.method === "POST" && pathname === "/documents") {
    if (!body.title || !body.content) return json2(res, 400, { error: "title and content are required" });
    return json2(res, 200, await callTool("vault_doc_create", {
      title: body.title,
      content: body.content,
      type: body.type,
      tags: Array.isArray(body.tags) ? body.tags.join(",") : body.tags
    }, 18e4));
  }
  if (req.method === "POST" && pathname === "/documents/upload-url") {
    if (!body.sourceUrl || typeof body.sourceUrl !== "string") return json2(res, 400, { error: "sourceUrl is required" });
    const filePath = await uploadFromUrl(body.sourceUrl);
    try {
      return json2(res, 200, await callTool("vault_doc_upload", { filePath }, 3e5));
    } finally {
      try {
        fs6.unlinkSync(filePath);
      } catch {
      }
      try {
        fs6.rmdirSync(path7.dirname(filePath));
      } catch {
      }
    }
  }
  if (req.method === "GET" && pathname === "/documents/types") {
    const types = await callTool("vault_doc_types");
    const rows = Array.isArray(types) ? types : types?.types;
    const total = Array.isArray(rows) ? rows.reduce((sum, row) => sum + (Number(row?.count) || 0), 0) : void 0;
    return json2(res, 200, Array.isArray(rows) ? { types: rows, total } : types);
  }
  const docId = routeParams(pathname, "/documents/");
  if (docId && req.method === "GET") return json2(res, 200, await callTool("vault_doc_get", { id: docId }));
  const docTextId = routeParams(pathname, "/documents/", "/text");
  if (docTextId && req.method === "GET") {
    const fullText = String(await callTool("vault_doc_text", { id: docTextId }));
    const maxChars = parseIntParam(q.maxChars);
    const text = maxChars && maxChars > 0 ? fullText.slice(0, maxChars) : fullText;
    return json2(res, 200, { id: docTextId, text, length: fullText.length, truncated: text.length < fullText.length });
  }
  const docFieldsId = routeParams(pathname, "/documents/", "/fields");
  if (docFieldsId && req.method === "GET") return json2(res, 200, await callTool("vault_doc_fields", { id: docFieldsId }));
  const docFileId = routeParams(pathname, "/documents/", "/file");
  if (docFileId && req.method === "GET") {
    const file = await downloadDocument(docFileId);
    try {
      const bodyBytes = fs6.readFileSync(file.path);
      res.writeHead(200, {
        "content-type": file.contentType,
        "content-length": bodyBytes.byteLength,
        "content-disposition": `attachment; filename="${headerFilename(file.title, file.path)}"`
      });
      res.end(bodyBytes);
      return;
    } finally {
      try {
        fs6.unlinkSync(file.path);
      } catch {
      }
      try {
        fs6.rmdirSync(path7.dirname(file.path));
      } catch {
      }
    }
  }
  const docDownloadUrlId = routeParams(pathname, "/documents/", "/download-url");
  if (docDownloadUrlId && req.method === "POST") {
    const file = await downloadDocument(docDownloadUrlId);
    const token = issueDownloadToken(file, parseIntParam(body.ttlSeconds, DEFAULT_DOWNLOAD_TTL_SECONDS));
    return json2(res, 200, {
      url: `${getPublicBase(req)}/downloads/${encodeURIComponent(token)}`,
      expiresAt: new Date(downloadTokens.get(token).expiresAt).toISOString(),
      title: file.title,
      size: file.size,
      contentType: file.contentType
    });
  }
  if (docId && req.method === "PATCH") {
    if (!body.field || body.value === void 0) return json2(res, 400, { error: "field and value are required" });
    return json2(res, 200, await callTool("vault_doc_edit", { id: docId, field: body.field, value: String(body.value) }, 18e4));
  }
  const docContentId = routeParams(pathname, "/documents/", "/content");
  if (docContentId && req.method === "PUT") {
    if (typeof body.content !== "string") return json2(res, 400, { error: "content is required" });
    return json2(res, 200, await callTool("vault_doc_update_content", { docId: docContentId, content: body.content }, 18e4));
  }
  if (docId && req.method === "DELETE") return json2(res, 200, await callTool("vault_doc_delete", { id: docId }, 18e4));
  if (req.method === "POST" && pathname === "/sync") return json2(res, 200, await callTool("vault_sync", { full: parseBool(body.full) ?? false }, 3e5));
  if (req.method === "GET" && pathname === "/stats") return json2(res, 200, await callTool("vault_stats"));
  if (req.method === "GET" && pathname === "/chunks/status") return json2(res, 200, await callTool("vault_chunk_status"));
  if (req.method === "GET" && pathname === "/people") return json2(res, 200, await callTool("vault_people_list"));
  const personName = routeParams(pathname, "/people/", "/documents");
  if (personName && req.method === "GET") return json2(res, 200, await callTool("vault_people_docs", { name: personName }));
  if (req.method === "GET" && pathname === "/places") return json2(res, 200, await callTool("vault_places", {
    filter: q.filter || "all",
    area: q.area || void 0,
    city: q.city || void 0,
    cuisine: q.cuisine || void 0,
    placeType: q.placeType || void 0,
    limit: parseIntParam(q.limit, 50)
  }));
  if (req.method === "GET" && pathname === "/wishlist") return json2(res, 200, await callTool("vault_wishlist", {
    filter: q.filter || "wishlist",
    brand: q.brand || void 0,
    category: q.category || void 0,
    limit: parseIntParam(q.limit, 50)
  }));
  if (req.method === "GET" && pathname === "/recipes") return json2(res, 200, await callTool("vault_recipes", {
    cuisine: q.cuisine || void 0,
    course: q.course || void 0,
    dietary: q.dietary || void 0,
    maxMinutes: parseIntParam(q.maxMinutes),
    limit: parseIntParam(q.limit, 50)
  }));
  if (req.method === "GET" && pathname === "/apps") return json2(res, 200, await callTool("vault_apps", {
    filter: q.filter || "all",
    platform: q.platform || void 0,
    category: q.category || void 0,
    limit: parseIntParam(q.limit, 50)
  }));
  if (req.method === "GET" && pathname === "/hacks") return json2(res, 200, await callTool("vault_hacks", {
    category: q.category || void 0,
    difficulty: q.difficulty || void 0,
    limit: parseIntParam(q.limit, 50)
  }));
  if (req.method === "POST" && pathname.startsWith("/tools/")) {
    const name = decodeURIComponent(pathname.slice("/tools/".length));
    return json2(res, 200, await callTool(name, body));
  }
  json2(res, 404, { error: "not found", method: req.method, path: pathname });
}
function openApiSpec(publicUrl) {
  const jsonResponse = {
    "200": {
      description: "OK",
      content: { "application/json": { schema: {} } }
    }
  };
  const documentTextResponse = {
    "200": {
      description: "OK",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              text: { type: "string" },
              length: { type: "integer" },
              truncated: { type: "boolean" }
            }
          }
        }
      }
    }
  };
  const queryParam = (name, schema = { type: "string" }, description) => ({
    name,
    in: "query",
    required: false,
    description,
    schema
  });
  const pathParam = (name, description) => ({
    name,
    in: "path",
    required: true,
    description,
    schema: { type: "string" }
  });
  return {
    openapi: "3.1.0",
    info: {
      title: "moivault Document Vault API",
      description: "REST API over the encrypted moivault CLI/MCP server for Custom GPT Actions. Read endpoints automatically run moivault's incremental sync before returning data. Use /context for natural-language RAG over vector-indexed chunks, /search with mode=hybrid for normal lookup, and /search with mode=vector when semantic matching matters. After finding a document, fetch metadata, text, fields, or create a short-lived download link for original files.",
      version: "1.0.0"
    },
    servers: [{ url: publicUrl, description: "Production" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
      schemas: {
        Error: { type: "object", properties: { error: { type: "string" } } },
        CreateDocument: {
          type: "object",
          required: ["title", "content"],
          properties: {
            title: { type: "string" },
            content: { type: "string", description: "Markdown or plain text content, max 200KB." },
            type: { type: "string" },
            tags: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] }
          }
        },
        UploadFromUrl: { type: "object", required: ["sourceUrl"], properties: { sourceUrl: { type: "string", format: "uri" } } },
        EditField: { type: "object", required: ["field", "value"], properties: { field: { type: "string" }, value: { type: "string" } } },
        UpdateContent: { type: "object", required: ["content"], properties: { content: { type: "string" } } },
        DownloadUrlRequest: { type: "object", properties: { ttlSeconds: { type: "integer", minimum: 60, maximum: 3600 } } },
        DownloadUrlResponse: {
          type: "object",
          properties: {
            url: { type: "string", format: "uri" },
            expiresAt: { type: "string", format: "date-time" },
            title: { type: "string" },
            size: { type: "integer" },
            contentType: { type: "string" }
          }
        }
      }
    },
    paths: {
      "/health": { get: { operationId: "health", summary: "Health check.", security: [], responses: jsonResponse } },
      "/openapi.json": { get: { operationId: "openapi", summary: "OpenAPI schema.", security: [], responses: jsonResponse } },
      "/search": {
        get: {
          operationId: "searchVault",
          summary: "Search documents using hybrid, FTS, or vector search.",
          parameters: [
            { name: "query", in: "query", required: true, schema: { type: "string" } },
            queryParam("mode", { type: "string", enum: ["hybrid", "fts", "vector"], default: "hybrid" }, "hybrid combines keyword and vector results; vector is semantic only; fts is exact keyword search."),
            queryParam("type", { type: "string" }, "Optional document type filter. Discover available values with listDocumentTypes."),
            queryParam("limit", { type: "integer", default: 10 })
          ],
          responses: jsonResponse
        }
      },
      "/context": {
        get: {
          operationId: "getVaultContext",
          summary: "Retrieve vector-search RAG context chunks for a natural-language question. Prefer this before answering broad questions about the vault.",
          parameters: [
            { name: "query", in: "query", required: true, schema: { type: "string" } },
            queryParam("limit", { type: "integer", default: 5 }),
            queryParam("maxChunksPerDoc", { type: "integer", default: 4 }),
            queryParam("includeFields", { type: "boolean", default: false })
          ],
          responses: jsonResponse
        },
        post: {
          operationId: "postVaultContext",
          summary: "Retrieve vector-search RAG context chunks with a JSON body. Prefer this for longer questions.",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["query"], properties: { query: { type: "string" }, limit: { type: "integer" }, maxChunksPerDoc: { type: "integer" }, includeFields: { type: "boolean" } } } } } },
          responses: jsonResponse
        }
      },
      "/documents": {
        get: {
          operationId: "listDocuments",
          summary: "List documents, optionally filtered by type.",
          parameters: [queryParam("type"), queryParam("limit", { type: "integer", default: 50 })],
          responses: jsonResponse
        },
        post: {
          operationId: "createTextDocument",
          summary: "Create a text or markdown document in the vault.",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateDocument" } } } },
          responses: jsonResponse
        }
      },
      "/documents/upload-url": {
        post: {
          operationId: "uploadDocumentFromUrl",
          summary: "Fetch a public file URL server-side and upload it into the vault.",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UploadFromUrl" } } } },
          responses: jsonResponse
        }
      },
      "/documents/types": { get: { operationId: "listDocumentTypes", summary: "List document types with counts. Call this when choosing filters or explaining what the vault contains.", responses: jsonResponse } },
      "/documents/{id}": {
        get: { operationId: "getDocument", summary: "Get document metadata and structured fields.", parameters: [pathParam("id", "Document id.")], responses: jsonResponse },
        patch: { operationId: "editDocumentField", summary: "Edit one document field.", parameters: [pathParam("id")], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/EditField" } } } }, responses: jsonResponse },
        delete: { operationId: "deleteDocument", summary: "Delete a document from the vault. Only call after explicit user confirmation.", parameters: [pathParam("id")], responses: jsonResponse }
      },
      "/documents/{id}/text": {
        get: {
          operationId: "getDocumentText",
          summary: "Get OCR/extracted text as JSON. Use maxChars to keep large documents manageable.",
          parameters: [pathParam("id"), queryParam("maxChars", { type: "integer" }, "Optional character limit for the returned text.")],
          responses: documentTextResponse
        }
      },
      "/documents/{id}/fields": { get: { operationId: "getDocumentFields", summary: "Get structured extracted fields.", parameters: [pathParam("id")], responses: jsonResponse } },
      "/documents/{id}/file": {
        get: {
          operationId: "downloadDocumentFile",
          summary: "Download the original document file directly. Use download-url if the client cannot consume binary action responses.",
          parameters: [pathParam("id")],
          responses: { "200": { description: "Original document file.", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } } }
        }
      },
      "/documents/{id}/download-url": {
        post: {
          operationId: "createDocumentDownloadUrl",
          summary: "Create a short-lived unauthenticated link for the original file.",
          parameters: [pathParam("id")],
          requestBody: { required: false, content: { "application/json": { schema: { $ref: "#/components/schemas/DownloadUrlRequest" } } } },
          responses: { "200": { description: "Download link.", content: { "application/json": { schema: { $ref: "#/components/schemas/DownloadUrlResponse" } } } } }
        }
      },
      "/documents/{id}/content": {
        put: {
          operationId: "replaceDocumentContent",
          summary: "Replace markdown/text content and reprocess the document.",
          parameters: [pathParam("id")],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateContent" } } } },
          responses: jsonResponse
        }
      },
      "/sync": {
        post: {
          operationId: "syncVault",
          summary: "Sync from the backend.",
          requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { full: { type: "boolean", default: false } } } } } },
          responses: jsonResponse
        }
      },
      "/stats": { get: { operationId: "getStats", summary: "Vault statistics.", responses: jsonResponse } },
      "/chunks/status": { get: { operationId: "getChunkStatus", summary: "Chunk index status.", responses: jsonResponse } },
      "/people": { get: { operationId: "listPeople", summary: "List people with document counts.", responses: jsonResponse } },
      "/people/{name}/documents": { get: { operationId: "listPersonDocuments", summary: "List documents for a person.", parameters: [pathParam("name")], responses: jsonResponse } },
      "/places": {
        get: {
          operationId: "listPlaces",
          summary: "List saved places with Maps URLs.",
          parameters: [queryParam("filter", { type: "string", enum: ["wishlist", "visited", "all"], default: "all" }), queryParam("area"), queryParam("city"), queryParam("cuisine"), queryParam("placeType"), queryParam("limit", { type: "integer", default: 50 })],
          responses: jsonResponse
        }
      },
      "/wishlist": {
        get: {
          operationId: "listWishlist",
          summary: "List saved product research and wishlist items.",
          parameters: [queryParam("filter", { type: "string", enum: ["wishlist", "owned", "researching", "all"], default: "wishlist" }), queryParam("brand"), queryParam("category"), queryParam("limit", { type: "integer", default: 50 })],
          responses: jsonResponse
        }
      },
      "/recipes": {
        get: {
          operationId: "listRecipes",
          summary: "List saved recipes.",
          parameters: [queryParam("cuisine"), queryParam("course"), queryParam("dietary"), queryParam("maxMinutes", { type: "integer" }), queryParam("limit", { type: "integer", default: 50 })],
          responses: jsonResponse
        }
      },
      "/apps": {
        get: {
          operationId: "listApps",
          summary: "List saved apps.",
          parameters: [queryParam("filter", { type: "string", enum: ["wishlist", "installed", "all"], default: "all" }), queryParam("platform"), queryParam("category"), queryParam("limit", { type: "integer", default: 50 })],
          responses: jsonResponse
        }
      },
      "/hacks": {
        get: {
          operationId: "listLifeHacks",
          summary: "List saved life hacks and tips.",
          parameters: [queryParam("category"), queryParam("difficulty"), queryParam("limit", { type: "integer", default: 50 })],
          responses: jsonResponse
        }
      }
    }
  };
}
async function startRestServer() {
  const key = process.env.MOIVAULT_API_KEY;
  if (!key || key.length < 32) {
    console.error("[moivault-rest] MOIVAULT_API_KEY env var missing or shorter than 32 characters.");
    process.exit(1);
  }
  const port = Number.parseInt(process.env.MOIVAULT_REST_PORT || String(DEFAULT_PORT), 10);
  startMcp();
  const server = http2.createServer((req, res) => {
    const startedAt = Date.now();
    const reqPath = new URL(req.url || "/", "http://x").pathname;
    res.on("finish", () => {
      console.log(`[moivault-rest] ${req.method} ${reqPath} ${res.statusCode} ${Date.now() - startedAt}ms`);
    });
    handle(req, res, key).catch((err) => {
      const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
      console.error("[moivault-rest] request failed:", err);
      json2(res, status, { error: err?.message || String(err) });
    });
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`[moivault-rest] listening on 127.0.0.1:${port}`);
  });
}

// src/mcp/serve.ts
import http3 from "http";
import crypto9 from "crypto";
import { spawn as spawn3, spawnSync as spawnSync2 } from "child_process";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
var DEFAULT_SERVE_PORT = 8798;
var MAX_BODY_BYTES2 = 4 * 1024 * 1024;
async function getServeSecret(rotate = false) {
  const kc = getKeychain();
  let secret = rotate ? null : await kc.get("serve_secret");
  if (!secret) {
    secret = crypto9.randomBytes(24).toString("base64url");
    await kc.set("serve_secret", secret);
  }
  return secret;
}
function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto9.timingSafeEqual(ab, bb);
}
function readBody2(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES2) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve(void 0);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}
function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
function log(line) {
  process.stderr.write(`[moivault serve] ${line}
`);
}
async function startServe(opts = {}) {
  const port = opts.port ?? DEFAULT_SERVE_PORT;
  const secret = await getServeSecret(!!opts.rotate);
  await loadConnectionSecrets();
  const transports = /* @__PURE__ */ new Map();
  const httpServer = http3.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const auth = req.headers.authorization ?? "";
      const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      const pathSecret = url.pathname.startsWith("/mcp/") ? url.pathname.slice("/mcp/".length).replace(/\/+$/, "") : "";
      const onMcpPath = url.pathname === "/mcp" || url.pathname.startsWith("/mcp/");
      if (!onMcpPath) {
        if (url.pathname === "/" || url.pathname === "/health") return sendJson(res, 200, { ok: true, name: "moivault" });
        return sendJson(res, 404, { error: "not_found" });
      }
      const authorized = pathSecret && safeEqual(pathSecret, secret) || bearer && safeEqual(bearer, secret);
      if (!authorized) return sendJson(res, 401, { error: "unauthorized" });
      const sessionId = req.headers["mcp-session-id"];
      const existing = typeof sessionId === "string" ? transports.get(sessionId) : void 0;
      if (req.method === "POST") {
        const body = await readBody2(req);
        if (existing) return existing.handleRequest(req, res, body);
        if (!sessionId && isInitializeRequest(body)) {
          const mcp2 = createMcpServer({ remote: true });
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto9.randomUUID(),
            onsessioninitialized: (id) => {
              transports.set(id, transport);
            }
          });
          transport.onclose = () => {
            if (transport.sessionId) transports.delete(transport.sessionId);
          };
          mcp2.server.oninitialized = () => {
            const info = mcp2.server.getClientVersion();
            const client2 = resolveClient(info?.name, true);
            log(`session ${transport.sessionId?.slice(0, 8)} \u2014 ${client2.display} (${info?.name ?? "no clientInfo"} ${info?.version ?? ""})`.trim());
          };
          await mcp2.connect(transport);
          return transport.handleRequest(req, res, body);
        }
        return sendJson(res, 400, { jsonrpc: "2.0", error: { code: -32e3, message: "No valid session. Send initialize first." }, id: null });
      }
      if (req.method === "GET" || req.method === "DELETE") {
        if (!existing) return sendJson(res, 400, { error: "Unknown or missing mcp-session-id" });
        return existing.handleRequest(req, res);
      }
      res.writeHead(405, { allow: "GET, POST, DELETE" });
      res.end();
    } catch (err) {
      if (!res.headersSent) sendJson(res, 400, { error: err.message });
    }
  });
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, "127.0.0.1", () => resolve());
  });
  const actualPort = httpServer.address().port;
  const localUrl = `http://127.0.0.1:${actualPort}/mcp/${secret}`;
  let tunnel = null;
  let publicUrl = null;
  if (opts.tunnel !== false && hasCloudflared()) {
    const started = await startTunnel(actualPort);
    tunnel = started.child;
    publicUrl = started.url ? `${started.url}/mcp/${secret}` : null;
  }
  const close = async () => {
    tunnel?.kill("SIGTERM");
    for (const t of transports.values()) await t.close().catch(() => {
    });
    await new Promise((resolve) => httpServer.close(() => resolve()));
  };
  if (!opts.quiet) printInstructions({ localUrl, publicUrl, tunnelWanted: opts.tunnel !== false });
  return { port: actualPort, secret, localUrl, publicUrl, close };
}
function hasCloudflared() {
  const r = spawnSync2("sh", ["-c", "command -v cloudflared"], { encoding: "utf-8" });
  return r.status === 0 && r.stdout.trim().length > 0;
}
function startTunnel(port) {
  return new Promise((resolve) => {
    const child = spawn3("cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${port}`], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let settled = false;
    const finish = (url) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ child, url });
    };
    const scan = (chunk) => {
      const m = chunk.toString("utf-8").match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m) finish(m[0]);
    };
    child.stdout?.on("data", scan);
    child.stderr?.on("data", scan);
    child.on("exit", () => finish(null));
    const timer = setTimeout(() => finish(null), 3e4);
  });
}
function printInstructions(args) {
  const out = (line = "") => console.log(line);
  out();
  out("  moivault is serving MCP over HTTP. Decryption stays on this machine.");
  out();
  out(`  Local:   ${args.localUrl}`);
  if (args.publicUrl) {
    out(`  Public:  ${args.publicUrl}`);
    out();
    out("  Claude.ai:  Settings \u2192 Connectors \u2192 Add custom connector \u2192 paste the Public URL.");
    out("  ChatGPT:    Settings \u2192 Connectors (enable Developer mode under Advanced) \u2192 Create \u2192 paste the Public URL.");
    out();
    out("  The URL is the key \u2014 anyone holding it can use this connector while this runs.");
    out("  `moivault serve --rotate` issues a new one; the agent sees only what your phone granted.");
  } else if (args.tunnelWanted) {
    out();
    out("  No public URL: cloudflared was not found (or did not start).");
    out("  Install it (macOS: `brew install cloudflared`) and run this again to use Claude.ai or ChatGPT.");
  }
  out();
  out("  Ctrl-C to stop.");
  out();
}

// src/cli/index.ts
init_database();
var REPORTED_READS = {
  "doc get": "id",
  "doc text": "id",
  "doc fields": "id",
  "doc download": "id",
  "doc list": "none",
  "search": "none",
  "context": "none",
  "people docs": "none",
  "ls": "none"
};
var POSITIONAL_ARG = {
  "doc get": "id",
  "doc text": "id",
  "doc fields": "id",
  "doc download": "id",
  "search": "query",
  "context": "query",
  "people docs": "name",
  "ls": "path"
};
function commandKey(actionCommand) {
  const parent = actionCommand.parent?.name();
  return parent && parent !== "moivault" ? `${parent} ${actionCommand.name()}` : actionCommand.name();
}
function commandArgs(key, actionCommand) {
  const args = {};
  for (const [k, v] of Object.entries(actionCommand.opts())) {
    args[k] = typeof v === "string" && /^\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  }
  const name = POSITIONAL_ARG[key];
  if (name && typeof actionCommand.args[0] === "string") args[name] = actionCommand.args[0];
  return args;
}
var reporting = null;
var program = new Command();
program.name("moivault").description("CLI for Vault \u2014 encrypted document management for agents and humans").version("0.3.3").option("--json", "Force JSON output").option("--pretty", "Force human-readable output").option("--db <path>", "Custom SQLite database path").option("--vault-id <id>", "Target specific vault").option("--verbose", "Enable debug logging").hook("preAction", async (thisCommand, actionCommand) => {
  const commandName = actionCommand.name();
  const parentName = actionCommand.parent?.name();
  const skipAutoUnlock = parentName === "auth" || commandName === "unlock" || commandName === "lock";
  if (skipAutoUnlock) return;
  if (!isVaultUnlocked()) {
    try {
      if (await autoUnlock()) {
        openDatabase(thisCommand.opts().db);
      }
    } catch (err) {
      console.error(`Auto-unlock failed: ${err.message}`);
      process.exit(1);
    }
  }
  if (isVaultUnlocked()) {
    try {
      openDatabase(thisCommand.opts().db);
    } catch {
    }
  }
  const key = commandKey(actionCommand);
  const mode = REPORTED_READS[key];
  if (mode) {
    const docIds = mode === "id" && typeof actionCommand.args[0] === "string" ? [actionCommand.args[0]] : [];
    reporting = { key, docIds, args: commandArgs(key, actionCommand), restore: interceptCommandFailure() };
  }
});
program.hook("postAction", async () => {
  if (!reporting) return;
  const { key, docIds, args, restore } = reporting;
  restore();
  reporting = null;
  let sensitive = false;
  try {
    sensitive = docIds.some((id) => SENSITIVE_DOC_TYPES.has(getDocumentById(id)?.type ?? ""));
  } catch {
  }
  await recordCliActivity(`cli:${key}`, docIds, { sensitive, args });
});
registerAuthCommands(program);
registerUnlockCommands(program);
registerSyncCommands(program);
registerSpacesCommand(program);
registerDocCommands(program);
registerSearchCommands(program);
registerStatsCommand(program);
registerUsageCommand(program);
registerPeopleCommands(program);
registerChunkCommands(program);
registerContextCommand(program);
registerLifestyleCommands(program);
registerLsCommand(program);
program.command("mcp").description("Start MCP server (stdio transport) for Claude Desktop, Cursor, etc.").action(async () => {
  await startMcpServer();
});
program.command("serve").description("Serve MCP over HTTP for Claude.ai / ChatGPT connectors (tunnels via cloudflared when installed)").option("--port <port>", "Local port", String(DEFAULT_SERVE_PORT)).option("--rotate", "Issue a new connector secret (the old URL stops working)").option("--no-tunnel", "Local only; don't start a cloudflared tunnel").action(async (opts) => {
  const running = await startServe({ port: Number(opts.port), rotate: !!opts.rotate, tunnel: opts.tunnel });
  const stop = async () => {
    await running.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
});
program.command("rest").description("Start REST/OpenAPI server for Custom GPT Actions").action(async () => {
  await startRestServer();
});
program.parseAsync(process.argv).catch(async (err) => {
  const failed = reporting;
  failed?.restore();
  reporting = null;
  const code = err instanceof CommandExit ? err.code : 1;
  if (!(err instanceof CommandExit)) console.error(err.message);
  if (failed) {
    const error = err instanceof CommandExit ? lastCommandError() ?? `exited with ${code}` : err.message;
    await recordCliActivity(`cli:${failed.key}`, failed.docIds, { args: failed.args, error });
  }
  process.exit(code);
});
//# sourceMappingURL=index.js.map