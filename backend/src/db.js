"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.upsertOrder = upsertOrder;
// src/db.ts
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const sqlite = sqlite3_1.default.verbose();
// Mirror Python: DATABASE_URL = "sqlite:///../orders.db" by default
const dbUrl = process.env.DATABASE_URL || "sqlite:///../orders.db";
let dbPath;
const match = dbUrl.match(/^sqlite:\/\/\/(.+)$/);
if (match) {
    dbPath = match[1];
}
else if (dbUrl.startsWith("sqlite:")) {
    dbPath = dbUrl.replace(/^sqlite:/, "");
}
else {
    // Fallback: treat as plain file path
    dbPath = dbUrl;
}
// Resolve relative to backend-node/
const resolvedPath = path_1.default.resolve(__dirname, "..", dbPath);
console.log("Using SQLite DB at:", resolvedPath);
const db = new sqlite.Database(resolvedPath);
function initDb() {
    db.serialize(() => {
        db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY,
        order_id TEXT UNIQUE,
        amount REAL,
        currency TEXT,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_payload TEXT
      )
    `, (err) => {
            if (err) {
                console.error("Error creating orders table:", err);
            }
        });
        db.run(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id INTEGER PRIMARY KEY,
        event_type TEXT,
        reference TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        raw TEXT
      )
    `, (err) => {
            if (err) {
                console.error("Error creating webhook_events table:", err);
            }
        });
    });
}
function upsertOrder(orderId, amount, currency, status, lastPayloadJson) {
    return new Promise((resolve, reject) => {
        const sql = `
      INSERT INTO orders (order_id, amount, currency, status, last_payload)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        status = excluded.status,
        last_payload = excluded.last_payload
    `;
        db.run(sql, [orderId, amount, currency, status, lastPayloadJson], (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
