/**
 * Database initializer cho SQLite3
 * Tạo các bảng: weather, exchange, messages, logs
 */

import sqlite3 from "sqlite3";
import { config } from "./config.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync, mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Xử lý đường dẫn database: resolve relative path từ thư mục backend
// Loại bỏ ./ ở đầu, và nếu path chứa "backend/", chỉ lấy tên file cuối cùng
// Ví dụ: "./database.sqlite" -> "D:\IoT\final-iot-thing\backend\database.sqlite"
// Ví dụ: "./backend/database.sqlite" -> "D:\IoT\final-iot-thing\backend\database.sqlite"
let cleanPath = config.database.path.replace(/^\.\//, "");
// Nếu path chứa "backend/", chỉ lấy phần sau "backend/"
if (cleanPath.includes("backend/") || cleanPath.includes("backend\\")) {
  cleanPath = cleanPath.split(/[/\\]/).pop(); // Lấy tên file cuối cùng
}
const dbPath = resolve(__dirname, cleanPath);

// Đảm bảo thư mục chứa database tồn tại
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  try {
    mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Đã tạo thư mục: ${dbDir}`);
  } catch (err) {
    console.error(`❌ Không thể tạo thư mục ${dbDir}:`, err.message);
  }
}

console.log(`🔍 Database path: ${dbPath}`);
console.log(`🔍 Database directory: ${dbDir}`);

/**
 * Tạo và mở kết nối database
 */
export function initDatabase() {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Đang mở database tại: ${dbPath}`);
    console.log(`🔍 __dirname: ${__dirname}`);
    console.log(`🔍 config.database.path: ${config.database.path}`);

    // Mở database với mode CREATE nếu chưa tồn tại
    const db = new sqlite3.Database(
      dbPath,
      sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE,
      (err) => {
        if (err) {
          console.error("❌ Lỗi kết nối database:", err.message);
          console.error("❌ Error code:", err.code);
          console.error("❌ Error errno:", err.errno);
          console.error("❌ Full error:", err);
          reject(err);
          return;
        }
        console.log("✅ Đã kết nối SQLite database:", dbPath);
        createTables(db)
          .then(() => resolve(db))
          .catch(reject);
      }
    );
  });
}

/**
 * Tạo các bảng trong database
 */
function createTables(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Bảng lưu lịch sử thời tiết
      db.run(
        `
        CREATE TABLE IF NOT EXISTS weather (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          temperature REAL,
          humidity REAL,
          pressure REAL,
          description TEXT,
          wind_speed REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) {
            console.error("❌ Lỗi tạo bảng weather:", err);
            reject(err);
          } else {
            console.log("✅ Đã tạo bảng weather");
          }
        }
      );

      // Bảng lưu lịch sử tỉ giá
      db.run(
        `
        CREATE TABLE IF NOT EXISTS exchange (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          base_currency TEXT NOT NULL,
          target_currency TEXT NOT NULL,
          rate REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) {
            console.error("❌ Lỗi tạo bảng exchange:", err);
            reject(err);
          } else {
            console.log("✅ Đã tạo bảng exchange");
          }
        }
      );

      // Bảng lưu lịch sử messages gửi qua LED
      db.run(
        `
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message TEXT NOT NULL,
          mode TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) {
            console.error("❌ Lỗi tạo bảng messages:", err);
            reject(err);
          } else {
            console.log("✅ Đã tạo bảng messages");
          }
        }
      );

      // Bảng lưu log MQTT
      db.run(
        `
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic TEXT NOT NULL,
          message TEXT,
          direction TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) {
            console.error("❌ Lỗi tạo bảng logs:", err);
            reject(err);
          } else {
            console.log("✅ Đã tạo bảng logs");
            resolve();
          }
        }
      );
    });
  });
}

/**
 * Helper function để query database
 */
export function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Helper function để run database (INSERT, UPDATE, DELETE)
 */
export function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}
