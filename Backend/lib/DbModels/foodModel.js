const { db } = require('../database');

class FoodModel {

    static async createTable() {
        const createFoodsTableSQL = `
        CREATE TABLE IF NOT EXISTS foods (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            calories_per_100g DECIMAL(10,2) NOT NULL,
            protein_per_100g DECIMAL(10,2) NOT NULL,
            carbs_per_100g DECIMAL(10,2) NOT NULL,
            fat_per_100g DECIMAL(10,2) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        try {
            await db.executeQuery(createFoodsTableSQL);
            console.log('✅ Foods table created successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Error creating foods tables:', error);
            throw error;
        }
    }

    static async createFood(userId, name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g) {
        const sql = `
        INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
        VALUES (?, ?, ?, ?, ?)`;
        
        const params = [name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g];
        
        try {
            const result = await db.insert(sql, params);
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('❌ Error creating food:', error);
            throw error;
        }
    }

    static async findAll() {
        const sql = `
            SELECT id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
            FROM foods
            ORDER BY name ASC
        `;

        try {
            return await db.selectAll(sql);
        } catch (error) {
            console.error('❌ Error finding all foods:', error);
            throw error;
        }
    }

    static async findById(id) {
        const sql = `
        SELECT f.id, f.name, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g
        FROM foods f
        WHERE f.id = ?
        `;
        
        try {
            const food = await db.selectOne(sql, [id]);
            return food;
        } catch (error) {
            console.error('❌ Error finding food by ID:', error);
            throw error;
        }
    }

    // Atrod visas lietotāja ēdienreizes tieši tajā dienā, kā arī katrai ēdienreizei pievieno tās pārtikas produktus
    static async findByUserId(userId) {
        const sql = `
        SELECT f.id, f.name, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g
        FROM foods f
        WHERE f.id = ?
        `;

        try {
            const foods = await db.selectAll(sql, [userId]);
            return foods;
        } catch (error) {
            console.error('❌ Error finding foods by user ID:', error);
            throw error;
        }
    }

}

module.exports = FoodModel;
