import { executeQuery } from "../services/databaseService.js";

// ==================== PUBLIC CATEGORIES API ====================

// Lấy danh sách categories công khai
export const getPublicCategories = async (req, res) => {
  try {
    const { type = '', status = 1 } = req.query;

    let whereClause = 'WHERE status = ?';
    let params = [status];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    const query = `
      SELECT id, name, slug, description, type, sort_order
      FROM categories
      ${whereClause}
      ORDER BY sort_order ASC, name ASC
    `;

    const categories = await executeQuery(query, params);

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error("❌ Lỗi lấy categories public:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách categories",
      error: error.message
    });
  }
};

// Lấy category theo slug
export const getPublicCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT id, name, slug, description, type, sort_order
      FROM categories
      WHERE slug = ? AND status = 1
    `;

    const categories = await executeQuery(query, [slug]);

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại"
      });
    }

    res.json({
      success: true,
      data: categories[0]
    });

  } catch (error) {
    console.error("❌ Lỗi lấy category by slug:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy category",
      error: error.message
    });
  }
};

// ==================== PUBLIC PAGES API ====================

// Lấy danh sách pages công khai
export const getPublicPages = async (req, res) => {
  try {
    const { status = 'published', template = '' } = req.query;

    let whereClause = 'WHERE status = ?';
    let params = [status];

    if (template) {
      whereClause += ' AND template = ?';
      params.push(template);
    }

    const query = `
      SELECT id, title, slug, content, template, meta_title, meta_description, sort_order, createdAt, updatedAt
      FROM pages
      ${whereClause}
      ORDER BY sort_order ASC, title ASC
    `;

    const pages = await executeQuery(query, params);

    res.json({
      success: true,
      data: pages
    });

  } catch (error) {
    console.error("❌ Lỗi lấy pages public:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách pages",
      error: error.message
    });
  }
};

// Lấy page theo slug
export const getPublicPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT id, title, slug, content, template, meta_title, meta_description, sort_order, createdAt, updatedAt
      FROM pages
      WHERE slug = ? AND status = 'published'
    `;

    const pages = await executeQuery(query, [slug]);

    if (pages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Page không tồn tại"
      });
    }

    res.json({
      success: true,
      data: pages[0]
    });

  } catch (error) {
    console.error("❌ Lỗi lấy page by slug:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy page",
      error: error.message
    });
  }
};

// ==================== PUBLIC MEDIA API ====================

// Lấy danh sách media công khai
export const getPublicMedia = async (req, res) => {
  try {
    const { type = '', limit = 20 } = req.query;

    // Kiểm tra xem bảng pictures có tồn tại không
    let query = `
      SELECT id, filename, original_name, file_path, file_size, mime_type, alt_text, caption, created_at
      FROM pictures
      WHERE 1=1
    `;
    let params = [];

    if (type) {
      query += ' AND mime_type LIKE ?';
      params.push(`%${type}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const media = await executeQuery(query, params);

    res.json({
      success: true,
      data: media
    });

  } catch (error) {
    console.error("❌ Lỗi lấy media public:", error);
    
    // Nếu bảng pictures không tồn tại, trả về danh sách rỗng
    if (error.message.includes("doesn't exist")) {
      return res.json({
        success: true,
        data: [],
        message: "Bảng pictures chưa được tạo"
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách media",
      error: error.message
    });
  }
};

// Lấy media theo ID
export const getPublicMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT id, filename, original_name, file_path, file_size, mime_type, alt_text, caption, created_at
      FROM pictures
      WHERE id = ?
    `;

    const media = await executeQuery(query, [id]);

    if (media.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media không tồn tại"
      });
    }

    res.json({
      success: true,
      data: media[0]
    });

  } catch (error) {
    console.error("❌ Lỗi lấy media by id:", error);
    
    if (error.message.includes("doesn't exist")) {
      return res.status(404).json({
        success: false,
        message: "Bảng pictures chưa được tạo"
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy media",
      error: error.message
    });
  }
};

// ==================== PUBLIC STATS API ====================

// Lấy thống kê công khai
export const getPublicStats = async (req, res) => {
  try {
    const stats = {};

    // Thống kê categories
    try {
      const categoriesCount = await executeQuery(
        'SELECT COUNT(*) as count FROM categories WHERE status = 1'
      );
      stats.categories = categoriesCount[0].count;
    } catch (error) {
      stats.categories = 0;
    }

    // Thống kê pages
    try {
      const pagesCount = await executeQuery(
        'SELECT COUNT(*) as count FROM pages WHERE status = "published"'
      );
      stats.pages = pagesCount[0].count;
    } catch (error) {
      stats.pages = 0;
    }

    // Thống kê posts
    try {
      const postsCount = await executeQuery(
        'SELECT COUNT(*) as count FROM posts WHERE status = "published"'
      );
      stats.posts = postsCount[0].count;
    } catch (error) {
      stats.posts = 0;
    }

    // Thống kê media
    try {
      const mediaCount = await executeQuery(
        'SELECT COUNT(*) as count FROM pictures'
      );
      stats.media = mediaCount[0].count;
    } catch (error) {
      stats.media = 0;
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("❌ Lỗi lấy stats public:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thống kê",
      error: error.message
    });
  }
};
