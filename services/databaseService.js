import mysql from "mysql2/promise";

// Cấu hình kết nối database
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "tuyendungvieclam",
  charset: "utf8mb4"
};

// Tạo connection pool
const pool = mysql.createPool(dbConfig);

// Test kết nối
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Kết nối database thành công!");
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Lỗi kết nối database:", error);
    return false;
  }
};

// Thực thi query
export const executeQuery = async (query, params = []) => {
  try {
    // Debug: Log query và params chi tiết hơn
    console.log("🔍 Executing query:", query);
    console.log("🔍 Query params:", params);
    console.log("🔍 Params types:", params.map(p => typeof p));
    console.log("🔍 Params values:", params.map(p => p === undefined ? "UNDEFINED" : p));
    
    // Kiểm tra undefined trước khi execute
    const hasUndefined = params.some(p => p === undefined);
    if (hasUndefined) {
      console.error("❌ Có undefined trong params:", params);
      throw new Error("Bind parameters must not contain undefined");
    }
    
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error("❌ Lỗi thực thi query:", error);
    console.error("❌ Query:", query);
    console.error("❌ Params:", params);
    throw error;
  }
};

// Thực thi query với transaction
export const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params = [] } of queries) {
      const [rows] = await connection.execute(query, params);
      results.push(rows);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export default pool;
