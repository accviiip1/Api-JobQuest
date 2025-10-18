const mysql = require('mysql2/promise');

async function createPicturesTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'SDU-JobQuest_db'
    });

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pictures (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        file_path VARCHAR(255),
        url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Pictures table created successfully');
    await connection.end();
  } catch (error) {
    console.error('Error creating pictures table:', error);
  }
}

createPicturesTable();
