import { sendBulkEmail } from "../services/emailService.js";
import { db } from "../config/connect.js";

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

    res.json({
      success: true,
      totals: {
        users: userStats,
        companies: companyStats,
        jobsActive: jobStats,
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
