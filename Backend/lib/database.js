const mysql = require('mysql2/promise');

/**
 * Database Service for MySQL Database operations
 * Handles connection management, queries, and transactions
 */
class DatabaseService {
  constructor() {
    this.pool = null;
    this.isPoolInitialized = false;
  }

  /**
   * Initialize connection pool
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

      // Only add SSL if explicitly enabled
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
   * Execute a query with parameters
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
   * Test database connection
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
   * Get first row from query
   */
  async selectOne(sql, params = []) {
    const result = await this.executeQuery(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Get all rows from query
   */
  async selectAll(sql, params = []) {
    const result = await this.executeQuery(sql, params);
    return result.rows;
  }

  /**
   * Insert data and return insertId
   */
  async insert(sql, params = []) {
    const result = await this.executeQuery(sql, params);
    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows
    };
  }

  /**
   * Update/Delete and return affected rows count
   */
  async update(sql, params = []) {
    const result = await this.executeQuery(sql, params);
    return result.affectedRows;
  }

  /**
   * Execute transaction with multiple queries
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

// Create singleton instance
const dbService = new DatabaseService();

module.exports = {
  DatabaseService,
  db: dbService
};