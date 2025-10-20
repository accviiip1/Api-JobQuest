import { db } from './config/connect.js';

async function checkAndCreatePostsTable() {
  try {
    console.log('🔍 Checking if posts table exists...');
    
    // Check if posts table exists
    const checkTableQuery = `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'posts'
    `;
    
    const [result] = await new Promise((resolve, reject) => {
      db.query(checkTableQuery, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    if (result.count === 0) {
      console.log('📝 Creating posts table...');
      
      const createTableQuery = `
        CREATE TABLE posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE,
          excerpt TEXT,
          content LONGTEXT,
          featured_image VARCHAR(500),
          category VARCHAR(100),
          status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
          author_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          published_at TIMESTAMP NULL,
          view_count INT DEFAULT 0,
          like_count INT DEFAULT 0,
          comment_count INT DEFAULT 0,
          meta_title VARCHAR(255),
          meta_description TEXT,
          tags JSON,
          INDEX idx_status (status),
          INDEX idx_author (author_id),
          INDEX idx_created_at (created_at),
          INDEX idx_published_at (published_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      
      await new Promise((resolve, reject) => {
        db.query(createTableQuery, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      
      console.log('✅ Posts table created successfully!');
      
      // Insert some sample data
      const insertSampleQuery = `
        INSERT INTO posts (title, slug, excerpt, content, status, author_id, published_at) VALUES
        ('Welcome to our blog', 'welcome-to-our-blog', 'This is our first blog post', 'Welcome to our company blog! We are excited to share our journey with you.', 'published', 1, NOW()),
        ('Company News Update', 'company-news-update', 'Latest company news and updates', 'Here are the latest updates from our company...', 'published', 1, NOW()),
        ('Industry Insights', 'industry-insights', 'Insights into our industry', 'Let us share some insights about our industry...', 'published', 1, NOW())
      `;
      
      await new Promise((resolve, reject) => {
        db.query(insertSampleQuery, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      
      console.log('✅ Sample posts inserted successfully!');
      
    } else {
      console.log('✅ Posts table already exists!');
    }
    
    // Test the posts table
    const testQuery = `SELECT COUNT(*) as count FROM posts WHERE status = 'published'`;
    const [testResult] = await new Promise((resolve, reject) => {
      db.query(testQuery, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    console.log(`📊 Found ${testResult.count} published posts`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.end();
  }
}

checkAndCreatePostsTable();
