import { executeQuery } from '../services/databaseService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình multer cho upload ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/posts');
    console.log('Multer upload path:', uploadPath);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file ảnh!'), false);
    }
  }
});

export { upload };

// Upload ảnh cho bài viết
export const uploadPostImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file ảnh được upload'
      });
    }

    console.log('Uploaded file:', req.file);
    console.log('File saved to:', req.file.path);
    console.log('File exists:', fs.existsSync(req.file.path));

    const imageUrl = `/images/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Upload ảnh thành công',
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi upload ảnh'
    });
  }
};

// Lấy tất cả bài viết (có phân trang và filter)
export const getAllPosts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category = '', 
      status = 'published',
      search = '',
      featured = false,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filter theo status
    if (status) {
      whereConditions.push('p.status = ?');
      params.push(status);
    }

    // Filter theo category
    if (category) {
      whereConditions.push('p.category = ?');
      params.push(category);
    }

    // Filter theo featured
    if (featured === 'true') {
      whereConditions.push('p.is_featured = 1');
    }

    // Search theo title hoặc excerpt
    if (search) {
      whereConditions.push('(p.title LIKE ? OR p.excerpt LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort field
    const allowedSortFields = ['created_at', 'updated_at', 'view_count', 'title'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Query để lấy tổng số bài viết
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM posts p 
      ${whereClause}
    `;
    
    const [countResult] = await executeQuery(countQuery, params);
    const total = countResult.total;

    // Query để lấy bài viết
    const postsQuery = `
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.content,
        p.featured_image,
        p.category,
        p.tags,
        p.status,
        p.view_count,
        p.is_featured,
        p.meta_title,
        p.meta_description,
        p.created_at,
        p.updated_at,
        p.author_id
      FROM posts p
      ${whereClause}
      ORDER BY p.${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);
    const posts = await executeQuery(postsQuery, params);

    // Parse JSON tags safely
    const postsWithParsedTags = posts.map(post => {
      let parsedTags = [];
      try {
        if (post.tags && typeof post.tags === 'string') {
          parsedTags = JSON.parse(post.tags);
        } else if (Array.isArray(post.tags)) {
          parsedTags = post.tags;
        }
      } catch (e) {
        console.log('Error parsing tags for post', post.id, ':', e.message);
        parsedTags = [];
      }
      
      return {
        ...post,
        tags: parsedTags
      };
    });

    res.json({
      success: true,
      data: postsWithParsedTags,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bài viết'
    });
  }
};

// Lấy bài viết theo slug
export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT 
        p.*,
        u.name as author_name,
        u.email as author_email
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.slug = ? AND p.status = 'published'
    `;

    const [post] = await executeQuery(query, [slug]);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    // Tăng view count
    await executeQuery(
      'UPDATE posts SET view_count = view_count + 1 WHERE id = ?',
      [post.id]
    );

    // Parse JSON tags
    post.tags = post.tags ? JSON.parse(post.tags) : [];

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error getting post by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bài viết'
    });
  }
};

// Lấy bài viết theo ID (cho admin)
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.*,
        u.name as author_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `;

    const [post] = await executeQuery(query, [id]);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    // Parse JSON tags
    post.tags = post.tags ? JSON.parse(post.tags) : [];

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error getting post by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bài viết'
    });
  }
};

// Tạo bài viết mới
export const createPost = async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      featured_image,
      category = 'career-guide',
      tags = [],
      status = 'draft',
      is_featured = false,
      meta_title,
      meta_description
    } = req.body;

    // Kiểm tra slug đã tồn tại chưa
    const existingPost = await executeQuery(
      'SELECT id FROM posts WHERE slug = ?',
      [slug]
    );

    if (existingPost.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Slug đã tồn tại'
      });
    }

    const query = `
      INSERT INTO posts (
        title, slug, excerpt, content, featured_image, 
        category, tags, status, author_id, is_featured,
        meta_title, meta_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const authorId = req.userInfo?.id || 1; // Fallback to admin user
    const tagsJson = JSON.stringify(tags);

    const result = await executeQuery(query, [
      title, slug, excerpt, content, featured_image,
      category, tagsJson, status, authorId, is_featured,
      meta_title, meta_description
    ]);

    res.status(201).json({
      success: true,
      message: 'Tạo bài viết thành công',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo bài viết'
    });
  }
};

// Cập nhật bài viết
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      excerpt,
      content,
      featured_image,
      category,
      tags = [],
      status,
      is_featured,
      meta_title,
      meta_description
    } = req.body;

    // Kiểm tra bài viết có tồn tại không
    const existingPost = await executeQuery(
      'SELECT id FROM posts WHERE id = ?',
      [id]
    );

    if (existingPost.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    // Kiểm tra slug đã tồn tại chưa (trừ bài viết hiện tại)
    if (slug) {
      const slugCheck = await executeQuery(
        'SELECT id FROM posts WHERE slug = ? AND id != ?',
        [slug, id]
      );

      if (slugCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Slug đã tồn tại'
        });
      }
    }

    const query = `
      UPDATE posts SET
        title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        excerpt = COALESCE(?, excerpt),
        content = COALESCE(?, content),
        featured_image = COALESCE(?, featured_image),
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        status = COALESCE(?, status),
        is_featured = COALESCE(?, is_featured),
        meta_title = COALESCE(?, meta_title),
        meta_description = COALESCE(?, meta_description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const tagsJson = tags.length > 0 ? JSON.stringify(tags) : null;

    await executeQuery(query, [
      title, slug, excerpt, content, featured_image,
      category, tagsJson, status, is_featured,
      meta_title, meta_description, id
    ]);

    res.json({
      success: true,
      message: 'Cập nhật bài viết thành công'
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật bài viết'
    });
  }
};

// Xóa bài viết
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM posts WHERE id = ?';
    const result = await executeQuery(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    res.json({
      success: true,
      message: 'Xóa bài viết thành công'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa bài viết'
    });
  }
};

// Lấy các bài viết liên quan
export const getRelatedPosts = async (req, res) => {
  try {
    const { id, category, limit = 3 } = req.query;

    // Bước 1: Lấy thông tin bài viết hiện tại để phân tích tags
    const currentPostQuery = `
      SELECT category, tags 
      FROM posts 
      WHERE id = ? AND status = 'published'
    `;
    const [currentPost] = await executeQuery(currentPostQuery, [id]);

    if (!currentPost) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Bước 2: Tìm bài viết liên quan theo tiêu chí ưu tiên
    let relatedPosts = [];

    // Tiêu chí 1: Cùng category và có tags chung
    if (currentPost.tags) {
      const currentTags = JSON.parse(currentPost.tags);
      if (currentTags.length > 0) {
        const tagsCondition = currentTags.map(() => 'JSON_CONTAINS(tags, ?)').join(' AND ');
        const tagsQuery = `
          SELECT 
            id, title, slug, excerpt, featured_image, 
            category, view_count, created_at,
            'tags_match' as match_type
          FROM posts 
          WHERE status = 'published' 
            AND id != ? 
            AND category = ?
            AND (${tagsCondition})
          ORDER BY view_count DESC, created_at DESC
          LIMIT ?
        `;
        
        const tagsParams = [id, currentPost.category, ...currentTags.map(tag => `"${tag}"`), parseInt(limit)];
        const tagsMatches = await executeQuery(tagsQuery, tagsParams);
        relatedPosts = [...relatedPosts, ...tagsMatches];
      }
    }

    // Tiêu chí 2: Cùng category nhưng khác tags (nếu chưa đủ)
    if (relatedPosts.length < limit) {
      const remainingLimit = limit - relatedPosts.length;
      const categoryQuery = `
        SELECT 
          id, title, slug, excerpt, featured_image, 
          category, view_count, created_at,
          'category_match' as match_type
        FROM posts 
        WHERE status = 'published' 
          AND id != ? 
          AND category = ?
          AND id NOT IN (${relatedPosts.map(p => p.id).join(',') || '0'})
        ORDER BY view_count DESC, created_at DESC
        LIMIT ?
      `;
      
      const categoryParams = [id, currentPost.category, remainingLimit];
      const categoryMatches = await executeQuery(categoryQuery, categoryParams);
      relatedPosts = [...relatedPosts, ...categoryMatches];
    }

    // Tiêu chí 3: Khác category nhưng có tags chung (nếu vẫn chưa đủ)
    if (relatedPosts.length < limit && currentPost.tags) {
      const currentTags = JSON.parse(currentPost.tags);
      if (currentTags.length > 0) {
        const remainingLimit = limit - relatedPosts.length;
        const tagsCondition = currentTags.map(() => 'JSON_CONTAINS(tags, ?)').join(' AND ');
        const crossCategoryQuery = `
          SELECT 
            id, title, slug, excerpt, featured_image, 
            category, view_count, created_at,
            'cross_category_tags' as match_type
          FROM posts 
          WHERE status = 'published' 
            AND id != ? 
            AND category != ?
            AND id NOT IN (${relatedPosts.map(p => p.id).join(',') || '0'})
            AND (${tagsCondition})
          ORDER BY view_count DESC, created_at DESC
          LIMIT ?
        `;
        
        const crossParams = [id, currentPost.category, ...currentTags.map(tag => `"${tag}"`), remainingLimit];
        const crossMatches = await executeQuery(crossCategoryQuery, crossParams);
        relatedPosts = [...relatedPosts, ...crossMatches];
      }
    }

    // Tiêu chí 4: Bài viết mới nhất (nếu vẫn chưa đủ)
    if (relatedPosts.length < limit) {
      const remainingLimit = limit - relatedPosts.length;
      const latestQuery = `
        SELECT 
          id, title, slug, excerpt, featured_image, 
          category, view_count, created_at,
          'latest' as match_type
        FROM posts 
        WHERE status = 'published' 
          AND id != ?
          AND id NOT IN (${relatedPosts.map(p => p.id).join(',') || '0'})
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const latestParams = [id, remainingLimit];
      const latestMatches = await executeQuery(latestQuery, latestParams);
      relatedPosts = [...relatedPosts, ...latestMatches];
    }

    // Giới hạn kết quả theo limit
    relatedPosts = relatedPosts.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: relatedPosts
    });
  } catch (error) {
    console.error('Error getting related posts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bài viết liên quan'
    });
  }
};

// Lấy thống kê bài viết (cho admin)
export const getPostStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_posts,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_posts,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_posts,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured_posts,
        SUM(view_count) as total_views,
        AVG(view_count) as avg_views
      FROM posts
    `;

    const [stats] = await executeQuery(statsQuery);

    const categoryStatsQuery = `
      SELECT 
        category,
        COUNT(*) as count
      FROM posts 
      WHERE status = 'published'
      GROUP BY category
      ORDER BY count DESC
    `;

    const categoryStats = await executeQuery(categoryStatsQuery);

    res.json({
      success: true,
      data: {
        ...stats,
        categoryStats
      }
    });
  } catch (error) {
    console.error('Error getting post stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê bài viết'
    });
  }
};
