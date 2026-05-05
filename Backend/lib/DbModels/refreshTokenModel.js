// Modelis nodrošina atjaunošanas tokenu saglabāšanu, pārbaudi un dzēšanu.
// Tas ļauj lietotājam palikt autorizētam vairākās ierīcēs un droši atjaunot piekļuves tokenu.
const crypto = require('crypto');
const { db } = require('../database');

const REFRESH_TOKEN_TTL_DAYS = 30;

class RefreshTokenModel {
  static tableName = 'refresh_tokens';
  static isReady = false;

  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_refresh_tokens_user_id (user_id),
        INDEX idx_refresh_tokens_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await db.executeQuery(createTableSQL);
    this.isReady = true;
    console.log('✅ Refresh tokens table created successfully');
    return true;
  }

  static async ensureTable() {
    if (!this.isReady) {
      await this.createTable();
    }
  }

  static getDefaultExpiration() {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  static async create(userId, token, expiresAt = this.getDefaultExpiration()) {
    await this.ensureTable();

    const sql = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `;

    await db.insert(sql, [userId, this.hashToken(token), expiresAt]);
    return true;
  }

  static async findValid(token) {
    await this.ensureTable();

    const sql = `
      SELECT id, user_id, token_hash, created_at, expires_at
      FROM refresh_tokens
      WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP
    `;

    return await db.selectOne(sql, [this.hashToken(token)]);
  }

  static async remove(token) {
    await this.ensureTable();

    const sql = `
      DELETE FROM refresh_tokens
      WHERE token_hash = ?
    `;

    return await db.update(sql, [this.hashToken(token)]);
  }

  static async removeAllForUser(userId) {
    await this.ensureTable();

    const sql = `
      DELETE FROM refresh_tokens
      WHERE user_id = ?
    `;

    return await db.update(sql, [userId]);
  }
}

module.exports = RefreshTokenModel;
