const { db } = require('../database');

/**
 * Mājiine (Meal) model for database operations
 * Izseko lietotāja ēdienus un uzņemātus pārtikas produktus
 */
class MealModel {
    static tableName = 'meals';
    
    /**
     * Izveido ēdienus un ēdien-pārtikas saites tabulas
     */
    static async createTable() {
        // Izveido galveno \u0113dienum tabulu
        const createMealsTableSQL = `
        CREATE TABLE IF NOT EXISTS meals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
            meal_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        // Izveido saites tabulu starp \u0113dienima un p\u0101rtikas produktiem
        const createLinkTableSQL = `
        CREATE TABLE IF NOT EXISTS meal_foods (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meal_id INT NOT NULL,
            food_id INT NOT NULL,
            quantity DECIMAL(10,2) NOT NULL,
            unit ENUM('g', 'kg', 'ml', 'l') DEFAULT 'g',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
            FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
            INDEX idx_meal_id (meal_id),
            INDEX idx_food_id (food_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        try {
        await db.executeQuery(createMealsTableSQL);
        console.log('✅ Meals table created successfully');
        await db.executeQuery(createLinkTableSQL);
        console.log('✅ Meal-Foods link table created successfully');
        
        return true;
        } catch (error) {
        console.error('❌ Error creating meals tables:', error);
        throw error;
        }
    }

    /**
     * Izveido jaunu ēdienu
     */
    static async createMeal(userId, name, mealDate) {
        const date = mealDate || new Date().toISOString().split('T')[0];
        const sql = `
        INSERT INTO meals (user_id, name, meal_date)
        VALUES (?, ?, ?)`;
        
        const params = [userId, name, date];
        
        try {
            const result = await db.insert(sql, params);
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('❌ Error creating meal:', error);
            throw error;
        }
    }

    /**
     * Atrod ēdienu pēc ID ar tā pārtikas produktiem
     */
    static async findById(id) {
        const sql = `
        SELECT m.id, m.user_id, m.name, m.meal_date, m.created_at, m.updated_at
        FROM meals m
        WHERE m.id = ?
        `;
        
        try {
            const meal = await db.selectOne(sql, [id]);
            if (meal) {
                meal.foods = await this.getFoods(id);
            }
            return meal;
        } catch (error) {
            console.error('❌ Error finding meal by ID:', error);
            throw error;
        }
    }

    /**
     * Atrod visus lietotāja ēdienus tieši tajā dienā, ar uzņemātiem produktiem
     */
    static async findByUserId(userId, mealDate = null) {
        const sql = `
        SELECT m.id, m.user_id, m.name, m.meal_date, m.created_at, m.updated_at
        FROM meals m
        WHERE m.user_id = ?
        AND m.meal_date = COALESCE(?, CURDATE())
        ORDER BY m.meal_date DESC, m.created_at DESC
        `;

        try {
            const meals = await db.selectAll(sql, [userId, mealDate]);
            for (const meal of meals) {
                meal.foods = await this.getFoods(meal.id);
            }
            return meals;
        } catch (error) {
            console.error('❌ Error finding meals by user ID:', error);
            throw error;
        }
    }

    /**
     * Iegūst pārtikas produktus konkrētam ēdienum
     */
    static async getFoods(mealId) {
        const sql = `
        SELECT mf.id, mf.food_id, f.name, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g,
               mf.quantity, mf.unit
        FROM meal_foods mf
        JOIN foods f ON mf.food_id = f.id
        WHERE mf.meal_id = ?
        `;

        try {
            const foods = await db.selectAll(sql, [mealId]);
            return foods;
        } catch (error) {
            console.error('❌ Error finding foods for meal:', error);
            throw error;
        }
    }

    /**
     * Pievieno pārtikas produktu ēdienam
     */
    static async addFood(mealId, foodId, quantity, unit) {
        const sql = `
        INSERT INTO meal_foods (meal_id, food_id, quantity, unit)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + ?
        `;

        try {
            await db.insert(sql, [mealId, foodId, quantity, unit, quantity]);
            return true;
        } catch (error) {
            console.error('❌ Error adding food to meal:', error);
            throw error;
        }
    }

    /**
     * Noņem pārtikas produktu no ēdiena
     */
    static async removeFood(id) {
        const sql = `
        DELETE FROM meal_foods
        WHERE id = ?
        `;

        try {
            await db.executeQuery(sql, [id]);
            return true;
        } catch (error) {
            console.error('❌ Error removing food from meal:', error);
            throw error;
        }  
    }
}

module.exports = MealModel;
