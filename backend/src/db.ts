// src/db.ts
import sqlite3 from "sqlite3";
import path from "path";

const sqlite = sqlite3.verbose();

// Mirror Python: DATABASE_URL = "sqlite:///../orders.db" by default
const dbUrl = process.env.DATABASE_URL || "sqlite:///../orders.db";

let dbPath: string;
const match = dbUrl.match(/^sqlite:\/\/\/(.+)$/);

if (match) {
  dbPath = match[1];
} else if (dbUrl.startsWith("sqlite:")) {
  dbPath = dbUrl.replace(/^sqlite:/, "");
} else {
  // Fallback: treat as plain file path
  dbPath = dbUrl;
}

// Resolve relative to backend-node/
const resolvedPath = path.resolve(__dirname, "..", dbPath);
console.log("Using SQLite DB at:", resolvedPath);

const db = new sqlite.Database(resolvedPath);

export function initDb(): void {
  db.serialize(() => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY,
        order_id TEXT UNIQUE,
        amount REAL,
        currency TEXT,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_payload TEXT
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating orders table:", err);
        }
      }
    );

    db.run(
      `
      CREATE TABLE IF NOT EXISTS webhook_events (
        id INTEGER PRIMARY KEY,
        event_type TEXT,
        reference TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        raw TEXT
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating webhook_events table:", err);
        }
      }
    );
  });
}

export function upsertOrder(
  orderId: string,
  amount: number,
  currency: string,
  status: string,
  lastPayloadJson: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO orders (order_id, amount, currency, status, last_payload)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        status = excluded.status,
        last_payload = excluded.last_payload
    `;

    db.run(
      sql,
      [orderId, amount, currency, status, lastPayloadJson],
      (err: Error | null) => {
        if (err) {
          return reject(err);
        }
        resolve();
      }
    );
  });
}
