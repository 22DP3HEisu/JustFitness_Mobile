const mysql = require('mysql2/promise');

/**
 * MySQL datubāzes darbību serviss.
 * Nodrošina savienojumu pārvaldību, vaicājumu izpildi un transakcijas.
 */
class DatabaseService {
  constructor() {
    this.pool = null;
    this.isPoolInitialized = false;
  }

  /**
   * Inicializē datubāzes savienojumu pūlu.
   */
  async initializePool() {
    if (this.isPoolInitialized) {
      return this.pool;
    }

    try {
      const poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_POOL_MAX) || 10,
        queueLimit: 0,
        timezone: 'Z',
        charset: 'utf8mb4'
      };

      // SSL konfigurācija tiek pievienota tikai tad, ja tā ir skaidri ieslēgta.
      if (process.env.DB_SSL === 'true') {
        poolConfig.ssl = {
          rejectUnauthorized: false
        };
      }

      this.pool = mysql.createPool(poolConfig);
      this.isPoolInitialized = true;
      
      console.log('✅ MySQL Database connection pool created successfully');
      console.log(`📊 Pool config: Max connections=${poolConfig.connectionLimit}`);
      
      return this.pool;
    } catch (error) {
      console.error('❌ Error creating MySQL Database pool:', error);
      this.isPoolInitialized = false;
      throw error;
    }
  }

  /**
   * Izpilda vaicājumu ar parametriem.
   */
  async executeQuery(sql, params = []) {
    if (!this.isPoolInitialized) {
      await this.initializePool();
    }

    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      
      return {
        rows,
        fields,
        affectedRows: rows.affectedRows || 0,
        insertId: rows.insertId || null
      };
    } catch (error) {
      console.error('❌ Database query error:', error);
      console.error('📝 SQL:', sql);
      console.error('🔧 Params:', params);
      throw error;
    }
  }

  /**
   * Pārbauda datubāzes savienojumu.
   */
  async testConnection() {
    try {
      const result = await this.executeQuery('SELECT 1 as test_value');
      console.log('✅ Database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Iegūst pirmo vaicājuma rezultāta rindu.
   */
  async selectOne(sql, params = []) {
    const result = await this.executeQuery(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Iegūst visas vaicājuma rezultāta rindas.
   */
  async selectAll(sql, params = []) {
    const result = await this.executeQuery(sql, params);
    return result.rows;
  }

  /**
   * Ievieto datus un atgriež ievietotā ieraksta identifikatoru.
   */
  async insert(sql, params = []) {
    const result = await this.executeQuery(sql, params);
    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows
    };
  }

  /**
   * Atjaunina vai dzēš datus un atgriež ietekmēto rindu skaitu.
   */
  async update(sql, params = []) {
    const result = await this.executeQuery(sql, params);
    return result.affectedRows;
  }

  /**
   * Izpilda transakciju ar vairākiem vaicājumiem.
   */
  async transaction(queries) {
    if (!this.isPoolInitialized) {
      await this.initializePool();
    }

    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      const results = [];
      for (const { sql, params = [] } of queries) {
        const [rows] = await connection.execute(sql, params);
        results.push({
          rows,
          affectedRows: rows.affectedRows || 0,
          insertId: rows.insertId || null
        });
      }

      await connection.commit();
      console.log(`✅ Transaction completed (${queries.length} queries)`);
      return results;
    } catch (error) {
      if (connection) {
        await connection.rollback();
        console.log('↩️ Transaction rolled back');
      }
      console.error('❌ Transaction failed:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

// Tiek izveidota viena koplietojama servisa instance.
const dbService = new DatabaseService();

module.exports = {
  DatabaseService,
  db: dbService
};