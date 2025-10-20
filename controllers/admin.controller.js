import { sendBulkEmail } from "../services/emailService.js";
import { db } from "../config/connect.js";
import { executeQuery } from "../services/databaseService.js";

// Lấy thống kê tổng quan
export const getStats = async (req, res) => {
  
  try {
    const promiseDb = db.promise();

    // Thống kê users
    let userStats = 0;
    try {
      const [userResult] = await promiseDb.query(
        "SELECT COUNT(*) as total FROM users"
      );
      userStats = userResult[0].total;
    } catch (error) {
      console.log("Error getting user stats:", error.message);
    }

    // Thống kê companies
    let companyStats = 0;
    try {
      const [companyResult] = await promiseDb.query(
        "SELECT COUNT(*) as total FROM companies"
      );
      companyStats = companyResult[0].total;
    } catch (error) {
      console.log("Error getting company stats:", error.message);
    }

    // Thống kê jobs active
    let jobStats = 0;
    try {
      const [jobResult] = await promiseDb.query(
        "SELECT COUNT(*) as total FROM jobs WHERE status = 1 AND deletedAt IS NULL"
      );
      jobStats = jobResult[0].total;
    } catch (error) {
      console.log("Error getting job stats:", error.message);
    }

    // Thống kê jobs đã hết hạn
    let jobExpiredStats = 0;
    try {
      const [jobExpiredResult] = await promiseDb.query(
        "SELECT COUNT(*) as total FROM jobs WHERE status = 0 AND deletedAt IS NULL"
      );
      jobExpiredStats = jobExpiredResult[0].total;
    } catch (error) {
      console.log("Error getting expired job stats:", error.message);
    }

    // Thống kê jobs sắp hết hạn (trong 7 ngày tới)
    let jobExpiringSoonStats = 0;
    try {
      const [jobExpiringResult] = await promiseDb.query(
        "SELECT COUNT(*) as total FROM jobs WHERE status = 1 AND deletedAt IS NULL AND deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)"
      );
      jobExpiringSoonStats = jobExpiringResult[0].total;
    } catch (error) {
      console.log("Error getting expiring job stats:", error.message);
    }

    // Thống kê applications
    let applicationStats = 0;
    try {
      const [applicationResult] = await promiseDb.query(
        "SELECT COUNT(*) as total FROM apply_job"
      );
      applicationStats = applicationResult[0].total;
    } catch (error) {
      console.log("Error getting application stats:", error.message);
    }

    // Thống kê saves
    let saveStats = 0;
    try {
      const [saveResult] = await promiseDb.query(
        "SELECT COUNT(*) as total FROM save_job"
      );
      saveStats = saveResult[0].total;
    } catch (error) {
      console.log("Error getting save stats:", error.message);
    }

    // Thống kê follows
    let followStats = 0;
    try {
      const [followResult] = await promiseDb.query(
        "SELECT COUNT(*) as total FROM follow_company  "
      );
      followStats = followResult[0].total;
    } catch (error) {
      console.log("Error getting follow stats:", error.message);
    }

    // Thống kê jobs theo tỉnh
    let jobsByProvinceResult = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          p.name AS label, 
          COUNT(j.id) AS value
      FROM provinces p
      LEFT JOIN jobs j 
          ON p.id = j.idProvince
        AND j.status = 1
        AND j.deletedAt IS NULL
      GROUP BY p.id, p.name
      ORDER BY value DESC
      LIMIT 10;

      `);
      jobsByProvinceResult = result;
    } catch (error) {
      console.log("Error getting jobs by province:", error.message);
      jobsByProvinceResult = [];
    }

    // Thống kê jobs theo lĩnh vực
    let jobsByFieldResult = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          f.name AS label, 
          COUNT(j.id) AS value
      FROM fields f
      LEFT JOIN jobs j 
          ON f.id = j.idField
        AND j.status = 1          -- 1 = job đang hoạt động
        AND j.deletedAt IS NULL   -- chưa bị xóa
      GROUP BY f.id, f.name
      ORDER BY value DESC
      LIMIT 10;
      `);
      jobsByFieldResult = result;
    } catch (error) {
      console.log("Error getting jobs by field:", error.message);
      jobsByFieldResult = [];
    }

    // Thống kê jobs theo tháng (6 tháng gần nhất)
    let jobsMonthlyResult = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as label,
          COUNT(*) as value
        FROM jobs 
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
        AND deletedAt IS NULL
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY label DESC
      `);
      jobsMonthlyResult = result;
    } catch (error) {
      console.log("Error getting jobs monthly:", error.message);
      jobsMonthlyResult = [];
    }

    // Thống kê users theo tháng (6 tháng gần nhất)
    let usersMonthlyResult = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as label,
          COUNT(*) as value
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY label DESC
      `);
      usersMonthlyResult = result;
    } catch (error) {
      console.log("Error getting users monthly:", error.message);
      usersMonthlyResult = [];
    }

    // Thống kê companies theo tháng (6 tháng gần nhất)
    let companiesMonthlyResult = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as label,
          COUNT(*) as value
        FROM companies 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY label DESC
      `);
      companiesMonthlyResult = result;
    } catch (error) {
      console.log("Error getting companies monthly:", error.message);
      companiesMonthlyResult = [];
    }

    // Thống kê applies theo tháng (6 tháng gần nhất)
    let appliesMonthlyResult = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as label,
          COUNT(*) as value
        FROM apply_job 
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY label DESC
      `);
      appliesMonthlyResult = result;
    } catch (error) {
      console.log("Error getting applies monthly:", error.message);
      appliesMonthlyResult = [];
    }

    // Thống kê theo ngày (7 ngày gần nhất)
    let jobsDailyResult = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m-%d') as label,
          COUNT(*) as value
        FROM jobs 
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
        AND deletedAt IS NULL
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d')
        ORDER BY label DESC
      `);
      jobsDailyResult = result;
    } catch (error) {
      console.log("Error getting jobs daily:", error.message);
      jobsDailyResult = [];
    }

    // Thống kê users theo ngày (7 ngày gần nhất)
    let usersDailyResult = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d') as label,
          COUNT(*) as value
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY label DESC
      `);
      usersDailyResult = result;
    } catch (error) {
      console.log("Error getting users daily:", error.message);
      usersDailyResult = [];
    }

    // Thống kê companies theo ngày (7 ngày gần nhất)
    let companiesDailyResult = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d') as label,
          COUNT(*) as value
        FROM companies 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY label DESC
      `);
      companiesDailyResult = result;
    } catch (error) {
      console.log("Error getting companies daily:", error.message);
      companiesDailyResult = [];
    }

    // Danh sách jobs sắp hết hạn (chi tiết)
    let expiringJobsList = [];
    try {
      const [result] = await promiseDb.query(`
        SELECT 
          j.id,
          j.nameJob,
          j.deadline,
          c.nameCompany,
          DATEDIFF(j.deadline, NOW()) as daysLeft
        FROM jobs j
        LEFT JOIN companies c ON j.idCompany = c.id
        WHERE j.status = 1 
        AND j.deletedAt IS NULL 
        AND j.deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
        ORDER BY j.deadline ASC
        LIMIT 10
      `);
      expiringJobsList = result;
    } catch (error) {
      console.log("Error getting expiring jobs list:", error.message);
      expiringJobsList = [];
    }

    // Tự động cập nhật status jobs đã hết hạn
    try {
      await promiseDb.query(
        "UPDATE jobs SET status = 0 WHERE status = 1 AND deadline < NOW() AND deletedAt IS NULL"
      );
    } catch (error) {
      console.log("Error updating expired jobs:", error.message);
    }

    res.json({
      success: true,
      totals: {
        users: userStats,
        companies: companyStats,
        jobsActive: jobStats,
        jobsExpired: jobExpiredStats,
        jobsExpiringSoon: jobExpiringSoonStats,
        applies: applicationStats,
        saves: saveStats,
        follows: followStats,
      },
      totalsPercent: (() => {
        const totalAll =
          userStats +
          companyStats +
          jobStats +
          applicationStats +
          saveStats +
          followStats;

        // Tránh chia 0
        if (totalAll === 0) {
          return {
            users: 0,
            companies: 0,
            jobsActive: 0,
            applies: 0,
            saves: 0,
            follows: 0,
          };
        }

        return {
          users: ((userStats / totalAll) * 100).toFixed(2),
          companies: ((companyStats / totalAll) * 100).toFixed(2),
          jobsActive: ((jobStats / totalAll) * 100).toFixed(2),
          applies: ((applicationStats / totalAll) * 100).toFixed(2),
          saves: ((saveStats / totalAll) * 100).toFixed(2),
          follows: ((followStats / totalAll) * 100).toFixed(2),
        };
      })(),
      jobsByProvince: jobsByProvinceResult,
      jobsByField: jobsByFieldResult,
      jobsMonthly: jobsMonthlyResult,
      usersMonthly: usersMonthlyResult,
      companiesMonthly: companiesMonthlyResult,
      appliesMonthly: appliesMonthlyResult,
      jobsDaily: jobsDailyResult,
      usersDaily: usersDailyResult,
      companiesDaily: companiesDailyResult,
      expiringJobsList: expiringJobsList,
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thống kê",
      error: error.message,
    });
  }
};

// Gửi email hàng loạt cho ứng viên
export const sendBulkEmailToApplicants = async (req, res) => {
  try {
    const { emails, subject, content } = req.body;

    // Validate input
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách email không hợp lệ",
      });
    }

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề và nội dung email là bắt buộc",
      });
    }

    // Gửi email hàng loạt
    const result = await sendBulkEmail(emails, subject, content);

    if (result.success) {
      res.json({
        success: true,
        message: `Đã gửi email thành công đến ${result.sentCount}/${emails.length} ứng viên`,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Không thể gửi email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error sending bulk email:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi gửi email",
      error: error.message,
    });
  }
};

// ==================== ADMIN QUẢN LÝ CATEGORIES (LOOKUP_DATA) ====================

// Lấy danh sách tất cả categories với phân trang
export const getAdminCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause += ' WHERE (name LIKE ? OR value LIKE ? OR label LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      if (whereClause) {
        whereClause += ' AND category = ?';
      } else {
        whereClause = ' WHERE category = ?';
      }
      params.push(category);
    }

    // Đếm tổng số records
    const countQuery = `SELECT COUNT(*) as total FROM lookup_data${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0].total;

    // Lấy dữ liệu với phân trang
    const dataQuery = `
      SELECT id, category, item_id, name, value, label, link, icon, text, created_at, updated_at
      FROM lookup_data
      ${whereClause}
      ORDER BY category ASC, item_id ASC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), offset);
    const data = await executeQuery(dataQuery, params);

    res.json({
      success: true,
      data: data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("❌ Lỗi lấy categories admin:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách categories",
      error: error.message
    });
  }
};

// Thêm category mới
export const addAdminCategory = async (req, res) => {
  try {
    const { category, item_id, name, value, label, link, icon, text } = req.body;

    if (!category || !item_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Category, item_id và name là bắt buộc"
      });
    }

    // Kiểm tra trùng lặp
    const checkQuery = `
      SELECT id FROM lookup_data 
      WHERE category = ? AND item_id = ?
    `;
    const existing = await executeQuery(checkQuery, [category, item_id]);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Item với category và item_id này đã tồn tại"
      });
    }

    const insertQuery = `
      INSERT INTO lookup_data (category, item_id, name, value, label, link, icon, text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(insertQuery, [
      category, item_id, name, value || null, label || null,
      link || null, icon || null, text || null
    ]);

    res.status(201).json({
      success: true,
      message: "Thêm category thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi thêm category:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi thêm category",
      error: error.message
    });
  }
};

// Cập nhật category
export const updateAdminCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, item_id, name, value, label, link, icon, text } = req.body;

    // Kiểm tra tồn tại
    const checkQuery = `SELECT id FROM lookup_data WHERE id = ?`;
    const existing = await executeQuery(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại"
      });
    }

    const updateQuery = `
      UPDATE lookup_data 
      SET category = ?, item_id = ?, name = ?, value = ?, label = ?, 
          link = ?, icon = ?, text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      category, item_id, name, value || null, label || null,
      link || null, icon || null, text || null, id
    ]);

    res.json({
      success: true,
      message: "Cập nhật category thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi cập nhật category:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật category",
      error: error.message
    });
  }
};

// Xóa category
export const deleteAdminCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = `SELECT id FROM lookup_data WHERE id = ?`;
    const existing = await executeQuery(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại"
      });
    }

    const deleteQuery = `DELETE FROM lookup_data WHERE id = ?`;
    await executeQuery(deleteQuery, [id]);

    res.json({
      success: true,
      message: "Xóa category thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi xóa category:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa category",
      error: error.message
    });
  }
};

// ==================== ADMIN QUẢN LÝ MEDIA (PICTURES) ====================

// Lấy danh sách media với phân trang
export const getAdminMedia = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = ' WHERE (originalName LIKE ? OR filename LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Đếm tổng số records
    const countQuery = `SELECT COUNT(*) as total FROM pictures${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0].total;

    // Lấy dữ liệu với phân trang
    const dataQuery = `
      SELECT id, originalName, filename, filePath, fileSize, mimeType, uploadedBy, createdAt
      FROM pictures
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), offset);
    const data = await executeQuery(dataQuery, params);

    res.json({
      success: true,
      data: data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("❌ Lỗi lấy media admin:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách media",
      error: error.message
    });
  }
};

// Xóa media
export const deleteAdminMedia = async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin file trước khi xóa
    const getFileQuery = `SELECT filePath FROM pictures WHERE id = ?`;
    const [fileResult] = await executeQuery(getFileQuery, [id]);

    if (fileResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File không tồn tại"
      });
    }

    // Xóa record trong database
    const deleteQuery = `DELETE FROM pictures WHERE id = ?`;
    await executeQuery(deleteQuery, [id]);

    // TODO: Xóa file vật lý từ server (có thể implement sau)
    // const filePath = fileResult[0].filePath;
    // fs.unlinkSync(path.join(__dirname, '..', filePath));

    res.json({
      success: true,
      message: "Xóa media thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi xóa media:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa media",
      error: error.message
    });
  }
};

// ==================== ADMIN QUẢN LÝ PAGES (POSTS) ====================

// Lấy danh sách posts với phân trang
export const getAdminPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', category = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause += ' WHERE (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      if (whereClause) {
        whereClause += ' AND status = ?';
      } else {
        whereClause = ' WHERE status = ?';
      }
      params.push(status);
    }

    if (category) {
      if (whereClause) {
        whereClause += ' AND category = ?';
      } else {
        whereClause = ' WHERE category = ?';
      }
      params.push(category);
    }

    // Đếm tổng số records
    const countQuery = `SELECT COUNT(*) as total FROM posts${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0].total;

    // Lấy dữ liệu với phân trang
    const dataQuery = `
      SELECT id, title, slug, excerpt, content, featured_image, category, tags, 
             status, view_count, is_featured, meta_title, meta_description, 
             author_id, created_at, updated_at
      FROM posts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), offset);
    const data = await executeQuery(dataQuery, params);

    // Parse JSON tags safely
    const postsWithParsedTags = data.map(post => {
      let parsedTags = [];
      try {
        if (post.tags && typeof post.tags === 'string') {
          parsedTags = JSON.parse(post.tags);
        } else if (Array.isArray(post.tags)) {
          parsedTags = post.tags;
        }
      } catch (e) {
        parsedTags = [];
      }
      return { ...post, tags: parsedTags };
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
    console.error("❌ Lỗi lấy posts admin:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách posts",
      error: error.message
    });
  }
};

// Thêm post mới
export const addAdminPost = async (req, res) => {
  try {
    const {
      title, slug, excerpt, content, featured_image, category, tags,
      status = 'draft', is_featured = false, meta_title, meta_description, author_id
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title và content là bắt buộc"
      });
    }

    // Convert tags array to JSON string
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : tags || '[]';

    const insertQuery = `
      INSERT INTO posts (title, slug, excerpt, content, featured_image, category, tags,
                        status, is_featured, meta_title, meta_description, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(insertQuery, [
      title, slug || null, excerpt || null, content, featured_image || null,
      category || null, tagsJson, status, is_featured, meta_title || null,
      meta_description || null, author_id || null
    ]);

    res.status(201).json({
      success: true,
      message: "Thêm post thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi thêm post:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi thêm post",
      error: error.message
    });
  }
};

// Cập nhật post
export const updateAdminPost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, slug, excerpt, content, featured_image, category, tags,
      status, is_featured, meta_title, meta_description
    } = req.body;

    // Kiểm tra tồn tại
    const checkQuery = `SELECT id FROM posts WHERE id = ?`;
    const existing = await executeQuery(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Post không tồn tại"
      });
    }

    // Convert tags array to JSON string
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : tags;

    const updateQuery = `
      UPDATE posts 
      SET title = ?, slug = ?, excerpt = ?, content = ?, featured_image = ?, 
          category = ?, tags = ?, status = ?, is_featured = ?, 
          meta_title = ?, meta_description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      title, slug || null, excerpt || null, content, featured_image || null,
      category || null, tagsJson, status, is_featured, meta_title || null,
      meta_description || null, id
    ]);

    res.json({
      success: true,
      message: "Cập nhật post thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi cập nhật post:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật post",
      error: error.message
    });
  }
};

// Xóa post
export const deleteAdminPost = async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = `SELECT id FROM posts WHERE id = ?`;
    const existing = await executeQuery(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Post không tồn tại"
      });
    }

    const deleteQuery = `DELETE FROM posts WHERE id = ?`;
    await executeQuery(deleteQuery, [id]);

    res.json({
      success: true,
      message: "Xóa post thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi xóa post:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa post",
      error: error.message
    });
  }
};

// ==================== ADMIN QUẢN LÝ CATEGORIES TABLE ====================

// Lấy danh sách categories với phân trang
export const getAdminCategoriesTable = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', type = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause += ' WHERE (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type) {
      if (whereClause) {
        whereClause += ' AND type = ?';
      } else {
        whereClause = ' WHERE type = ?';
      }
      params.push(type);
    }

    // Đếm tổng số records
    const countQuery = `SELECT COUNT(*) as total FROM categories${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0].total;

    // Lấy dữ liệu với phân trang
    const dataQuery = `
      SELECT id, name, slug, description, type, status, sort_order, createdAt, updatedAt
      FROM categories
      ${whereClause}
      ORDER BY sort_order ASC, createdAt DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), offset);
    const data = await executeQuery(dataQuery, params);

    res.json({
      success: true,
      data: data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("❌ Lỗi lấy categories table:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách categories",
      error: error.message
    });
  }
};

// Thêm category mới
export const addAdminCategoryTable = async (req, res) => {
  try {
    const { name, slug, description, type = 'post', status = 1, sort_order = 0 } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Tên và slug là bắt buộc"
      });
    }

    // Kiểm tra slug đã tồn tại chưa
    const existingCategory = await executeQuery(
      'SELECT id FROM categories WHERE slug = ?',
      [slug]
    );

    if (existingCategory.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Slug đã tồn tại"
      });
    }

    // Thêm category mới
    const result = await executeQuery(
      `INSERT INTO categories (name, slug, description, type, status, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, slug, description, type, status, sort_order]
    );

    res.json({
      success: true,
      message: "Thêm category thành công",
      data: { id: result.insertId }
    });

  } catch (error) {
    console.error("❌ Lỗi thêm category:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi thêm category",
      error: error.message
    });
  }
};

// Cập nhật category
export const updateAdminCategoryTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, type, status, sort_order } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Tên và slug là bắt buộc"
      });
    }

    // Kiểm tra slug đã tồn tại chưa (trừ category hiện tại)
    const existingCategory = await executeQuery(
      'SELECT id FROM categories WHERE slug = ? AND id != ?',
      [slug, id]
    );

    if (existingCategory.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Slug đã tồn tại"
      });
    }

    // Cập nhật category
    await executeQuery(
      `UPDATE categories 
       SET name = ?, slug = ?, description = ?, type = ?, status = ?, sort_order = ?
       WHERE id = ?`,
      [name, slug, description, type, status, sort_order, id]
    );

    res.json({
      success: true,
      message: "Cập nhật category thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi cập nhật category:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật category",
      error: error.message
    });
  }
};

// Xóa category
export const deleteAdminCategoryTable = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra category có tồn tại không
    const category = await executeQuery(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );

    if (category.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại"
      });
    }

    // Xóa category (soft delete)
    await executeQuery(
      'UPDATE categories SET deletedAt = NOW() WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: "Xóa category thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi xóa category:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa category",
      error: error.message
    });
  }
};

// ==================== ADMIN QUẢN LÝ PAGES TABLE ====================

// Lấy danh sách pages với phân trang
export const getAdminPages = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause += ' WHERE (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      if (whereClause) {
        whereClause += ' AND status = ?';
      } else {
        whereClause = ' WHERE status = ?';
      }
      params.push(status);
    }

    // Đếm tổng số records
    const countQuery = `SELECT COUNT(*) as total FROM pages${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0].total;

    // Lấy dữ liệu với phân trang
    const dataQuery = `
      SELECT id, title, slug, content, template, status, meta_title, meta_description, sort_order, createdAt, updatedAt
      FROM pages
      ${whereClause}
      ORDER BY sort_order ASC, createdAt DESC
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), offset);
    const data = await executeQuery(dataQuery, params);

    res.json({
      success: true,
      data: data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("❌ Lỗi lấy pages:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách pages",
      error: error.message
    });
  }
};

// Thêm page mới
export const addAdminPage = async (req, res) => {
  try {
    const { 
      title, 
      slug, 
      content, 
      template = 'default', 
      status = 'draft', 
      meta_title, 
      meta_description, 
      sort_order = 0 
    } = req.body;

    if (!title || !slug || !content) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề, slug và nội dung là bắt buộc"
      });
    }

    // Kiểm tra slug đã tồn tại chưa
    const existingPage = await executeQuery(
      'SELECT id FROM pages WHERE slug = ?',
      [slug]
    );

    if (existingPage.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Slug đã tồn tại"
      });
    }

    // Thêm page mới
    const result = await executeQuery(
      `INSERT INTO pages (title, slug, content, template, status, meta_title, meta_description, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, content, template, status, meta_title, meta_description, sort_order]
    );

    res.json({
      success: true,
      message: "Thêm page thành công",
      data: { id: result.insertId }
    });

  } catch (error) {
    console.error("❌ Lỗi thêm page:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi thêm page",
      error: error.message
    });
  }
};

// Cập nhật page
export const updateAdminPage = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      slug, 
      content, 
      template, 
      status, 
      meta_title, 
      meta_description, 
      sort_order 
    } = req.body;

    if (!title || !slug || !content) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề, slug và nội dung là bắt buộc"
      });
    }

    // Kiểm tra slug đã tồn tại chưa (trừ page hiện tại)
    const existingPage = await executeQuery(
      'SELECT id FROM pages WHERE slug = ? AND id != ?',
      [slug, id]
    );

    if (existingPage.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Slug đã tồn tại"
      });
    }

    // Cập nhật page
    await executeQuery(
      `UPDATE pages 
       SET title = ?, slug = ?, content = ?, template = ?, status = ?, 
           meta_title = ?, meta_description = ?, sort_order = ?
       WHERE id = ?`,
      [title, slug, content, template, status, meta_title, meta_description, sort_order, id]
    );

    res.json({
      success: true,
      message: "Cập nhật page thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi cập nhật page:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật page",
      error: error.message
    });
  }
};

// Xóa page
export const deleteAdminPage = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra page có tồn tại không
    const page = await executeQuery(
      'SELECT id FROM pages WHERE id = ?',
      [id]
    );

    if (page.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Page không tồn tại"
      });
    }

    // Xóa page (soft delete)
    await executeQuery(
      'UPDATE pages SET deletedAt = NOW() WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: "Xóa page thành công"
    });

  } catch (error) {
    console.error("❌ Lỗi xóa page:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa page",
      error: error.message
    });
  }
};
