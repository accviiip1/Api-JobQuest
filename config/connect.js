import dotenv from 'dotenv'
dotenv.config()
import mysql from 'mysql2'

export const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'tuyendungvieclam',
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 15000),
  ssl: String(process.env.DB_SSL || 'false') === 'true' ? { rejectUnauthorized: false } : undefined,
  charset: 'utf8mb4'
})

// Helper: convert db.query -> Promise
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err)
      else resolve(results)
    })
  })
}
