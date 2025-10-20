import jwt from "jsonwebtoken";
import { db } from "../config/connect.js";
import checkEmail from "../middlewares/checkEmail.middleware.js";
import checkUrl from "../middlewares/checkUrl.middleware.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import "express-async-errors";
dotenv.config();

export const getCompany = (req, res) => {
  const id = req.params.id;
  const q =
    "SELECT c.*, c.nameCompany as name, c.avatarPic as avatar, c.intro as description, c.web as website, COALESCE(p.name, 'Chưa cập nhật') as location FROM companies as c LEFT JOIN provinces as p ON c.idProvince = p.id WHERE c.id=?";
  if (id) {
    db.query(q, id, (err, data) => {
      if (!data?.length) {
        return res.status(401).json("Không tồn tại !");
      }
      return res.json(data[0]);
    });
  } else {
    return res.status(401).json("Không để rỗng !");
  }
};

export const getOwnerCompany = (req, res) => {
  const token = req.cookies?.accessToken;

  if (!token) return res.status(401).json("Not logged in!");

  const q = `SELECT c.*, c.avatarPic as avatar, c.nameCompany as name, c.intro as description, c.web as website, COALESCE(p.name, 'Chưa cập nhật') as province FROM companies as c
             LEFT JOIN provinces as p ON c.idProvince = p.id where c.id = ?`;

  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json("Token không hợp lệ!");
    
    db.query(q, userInfo.id, (err, data) => {
      if (!data?.length) {
        return res.json(null);
      } else {
        const { password, ...others } = data[0];
        return res.json(others);
      }
    });
  });
};

export const getAllCompany = async (req, res) => {
  try {
    console.log('Company API called with params:', req.query);
    
    // Test database connection trước
    const promiseDb = db.promise();
    console.log('Database connection established');
    
    // Test query đơn giản trước
    const testQuery = "SELECT COUNT(*) as count FROM companies";
    const [testResult] = await promiseDb.query(testQuery);
    console.log('Database test result:', testResult);
    
    if (!testResult || testResult.length === 0) {
      throw new Error('Database test failed - no companies found');
    }
    
    let page = Number(req.query?.page || 1);
    let limit = Number(req.query?.limit || 8);
    const sort = req.query?.sort || 'default';
    const search = req.query?.search;
    // Chuẩn hóa tham số filter thành mảng
    const provincesRaw = req.query?.province || [];
    const scalesRaw = req.query?.scale || [];
    const provinces = Array.isArray(provincesRaw)
      ? provincesRaw
      : (typeof provincesRaw === 'string' && provincesRaw.length ? [provincesRaw] : []);
    const scales = Array.isArray(scalesRaw)
      ? scalesRaw
      : (typeof scalesRaw === 'string' && scalesRaw.length ? [scalesRaw] : []);
    
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 8;
    const offset = (page - 1) * limit;

    // Xây dựng query với các điều kiện lọc
    let whereConditions = [];
    let queryParams = [];

    // Lọc theo tìm kiếm
    if (search && search.trim()) {
      whereConditions.push('(c.nameCompany LIKE ? OR c.nameAdmin LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    // Lọc theo tỉnh/thành phố
    if (provinces && provinces.length > 0) {
      const provincePlaceholders = provinces.map(() => '?').join(',');
      whereConditions.push(`p.name IN (${provincePlaceholders})`);
      queryParams.push(...provinces);
    }

    // Lọc theo quy mô
    if (scales && scales.length > 0) {
      const scalePlaceholders = scales.map(() => '?').join(',');
      whereConditions.push(`c.scale IN (${scalePlaceholders})`);
      queryParams.push(...scales);
    }

    // Xây dựng query cuối cùng
    let whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    let q = `SELECT c.*, COALESCE(p.name, 'Chưa cập nhật') as province,
             (SELECT j.deadline FROM jobs j WHERE j.idCompany = c.id AND j.status = 1 AND j.deletedAt IS NULL ORDER BY j.deadline ASC LIMIT 1) as deadline
             FROM companies c 
             LEFT JOIN provinces p ON c.idProvince = p.id 
             ${whereClause}
             ORDER BY c.id DESC LIMIT ? OFFSET ?`;
    
    // Thêm limit và offset vào queryParams
    queryParams.push(limit, offset);
    
    console.log('Executing main query:', q, 'with params:', queryParams);
    const [data] = await promiseDb.query(q, queryParams);
    console.log('Main query result:', data?.length, 'companies found');

    if (!data || data.length === 0) {
      console.log('No companies found in database');
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page: page,
          limit: limit,
          totalPage: 0,
          total: 0
        },
      });
    }

    // Thêm thông tin cơ bản cho mỗi company
    for (let company of data) {
      // Đặt tên mặc định nếu không có
      if (!company.name) {
        company.name = company.nameCompany || 'Công ty không tên';
      }
      
      // Province đã được lấy từ JOIN query
      // company.province = 'Chưa cập nhật'; // Đã xóa dòng này
      
      // Đặt follower_count và job_count mặc định
      company.follower_count = 0;
      company.job_count = 0;
      
      // Thử lấy số người theo dõi (không bắt lỗi để tránh crash)
      try {
        const [followData] = await promiseDb.query(
          'SELECT COUNT(*) as count FROM follow_company WHERE idCompany = ?',
          [company.id]
        );
        company.follower_count = followData[0]?.count || 0;
      } catch (followError) {
        console.log('Follow query error for company', company.id, ':', followError.message);
      }

      // Thử lấy số bài tuyển dụng
      try {
        const [jobData] = await promiseDb.query(
          'SELECT COUNT(*) as count FROM jobs WHERE idCompany = ? AND deletedAt IS NULL AND status = 1',
          [company.id]
        );
        company.job_count = jobData[0]?.count || 0;
      } catch (jobError) {
        console.log('Job query error for company', company.id, ':', jobError.message);
      }
    }

    // Đếm tổng số company với cùng điều kiện lọc
    let countQuery = `SELECT COUNT(*) as count 
                      FROM companies c 
                      LEFT JOIN provinces p ON c.idProvince = p.id 
                      ${whereClause}`;
    
    // Loại bỏ limit và offset khỏi queryParams cho count query
    let countParams = queryParams.slice(0, -2);
    
    console.log('Executing count query:', countQuery, 'with params:', countParams);
    const [countResult] = await promiseDb.query(countQuery, countParams);
    const totalCount = countResult[0]?.count || 0;
    const totalPage = Math.ceil(totalCount / limit);

    // Sắp xếp nếu cần
    if (sort === 'top') {
      data.sort((a, b) => {
        const scoreA = (a.follower_count || 0) + (a.job_count || 0);
        const scoreB = (b.follower_count || 0) + (b.job_count || 0);
        return scoreB - scoreA;
      });
      console.log('Sorted by top score');
    }

    console.log('Final data:', data?.length, 'companies with stats');

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        page: page,
        limit: limit,
        totalPage: totalPage,
        total: totalCount
      },
    });
  } catch (error) {
    console.error('Error in getAllCompany:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách công ty",
      error: error.message
    });
  }
};

// Test endpoint đơn giản để kiểm tra database
export const testSimpleCompany = async (req, res) => {
  try {
    console.log('Test simple company endpoint called');
    const promiseDb = db.promise();
    
    // Test query đơn giản nhất
    const q = "SELECT id, nameCompany FROM companies LIMIT 5";
    console.log('Executing test query:', q);
    
    const [data] = await promiseDb.query(q);
    console.log('Test query result:', data);
    
    return res.status(200).json({
      success: true,
      message: "Test successful",
      data: data,
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Test simple company error:', error);
    return res.status(500).json({
      success: false,
      message: "Test failed",
      error: error.message
    });
  }
};

// Test endpoint để kiểm tra cấu trúc bảng companies
export const testCompanySchema = (req, res) => {
  const q = "DESCRIBE companies";
  
  db.query(q, (err, data) => {
    if (err) {
      console.error("❌ Schema error:", err);
      return res.status(500).json({ error: "Schema error", details: err.message });
    }
    

    return res.json({ 
      message: "Companies table schema", 
      schema: data
    });
  });
};

// Test endpoint để kiểm tra cấu trúc bảng jobs
export const testJobsSchema = (req, res) => {
  const q = "DESCRIBE jobs";
  
  db.query(q, (err, data) => {
    if (err) {
      console.error("❌ Jobs Schema error:", err);
      return res.status(500).json({ error: "Jobs Schema error", details: err.message });
    }
    

    return res.json({ 
      message: "Jobs table schema", 
      schema: data
    });
  });
};

export const updateCompany = (req, res) => {
  const token = req.cookies?.accessToken;

  const { nameCompany, nameAdmin, email, phone, idProvince, web, scale } = req.body;
  
  if (!token) return res.status(401).json("Not logged in!");
  if(!nameCompany)return res.status(409).json("Tên công ty không được để rổng!");
  if (!checkEmail(email)) return res.status(409).json("Email không hợp lệ !");
  if (isNaN(phone) || phone?.length > 45) return res.status(409).json("Số điện thoại không hợp lê !");
  if (web?.length > 0 && !checkUrl(web)) return res.status(409).json("Link không hợp lệ !");

  if (nameCompany?.length > 255 || nameAdmin?.length > 255 || email?.length > 255 || web?.length > 255)
    return res.status(409).json("Các trường không vượt quá 255 kí tự!");


  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json("Token không trùng !");

    const q = "SELECT * FROM companies WHERE email = ? and id != ?";

    db.query(q, [email, userInfo.id], (err, data) => {
      if (err) return res.status(200).json(err);
      if (data?.length) return res.status(409).json("Email đã tồn tại !");

      const q2 =
        "UPDATE companies SET `nameCompany`= ?,`nameAdmin`= ?,  `email`= ?, `phone`= ?, `idProvince`= ?,`web` = ?, `scale`= ? WHERE id = ? ";

      const values = [nameCompany, nameAdmin, email, phone, idProvince, web, scale, userInfo.id];

      db.query(q2, values, (err, data) => {
        if (err) return res.status(200).json(err);
        if (data?.affectedRows > 0) return res.json("Update");
        return res.status(403).json("Lỗi vui lòng thử lại !");
      });
    });
  });
};

export const updateIntroCompany = (req, res) => {
  const token = req.cookies?.accessToken;
  const intro = req.body.intro;

  if (!token) return res.status(401).json("Not logged in!");

  if(intro?.length > 5000) return res.status(401).json("Giới thiệu không vượt quá 5000 kí tự.");

  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json("Token không trùng !");
    const q = "UPDATE companies SET `intro` = ? WHERE id = ? ";

    db.query(q, [intro, userInfo.id], (err, data) => {
      if (!err) return res.status(200).json(data);
      if (data?.affectedRows > 0) return res.json("Update");
      return res.status(403).json("Chỉ thay đổi được thông tin của mình");
    });
  });
};

export const uploadImage = (req, res) => {
  const avatarPic = req.body.avatarPic;
  const q = "UPDATE companies SET avatarPic = ? WHERE id = ? ";
  
  if(avatarPic?.length > 255) return res.status(403).json("Tên hình ảnh quá dài !")

  const token = req.cookies?.accessToken;
  if (!token) return res.status(403).json("Chưa đăng nhập !");
  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    db.query(q, [avatarPic, userInfo.id], (err, data) => {
      if (!err) return res.status(200).json("Lưu ảnh thành công !");
      return res.status(401).json("Lỗi!");
    });
  });
};

// Admin: Insert / Update / Delete companies
export const insertCompany = (req, res) => {
  const {
    nameCompany,
    nameAdmin,
    email,
    password,
    avatarPic,
    phone,
    idProvince,
    intro,
    scale,
    web,
  } = req.body;

  if (!nameCompany || !nameAdmin || !email || !password) {
    return res.status(400).json({ message: "nameCompany, nameAdmin, email, password are required" });
  }
  if (!checkEmail(email)) return res.status(409).json({ message: "Email không hợp lệ !" });
  if (web?.length > 0 && !checkUrl(web)) return res.status(409).json({ message: "Link không hợp lệ !" });
  if (phone && (isNaN(phone) || phone?.length > 45)) return res.status(409).json({ message: "Số điện thoại không hợp lê !" });
  if (
    nameCompany?.length > 255 ||
    nameAdmin?.length > 255 ||
    email?.length > 255 ||
    (web?.length || 0) > 255 ||
    (scale?.length || 0) > 100
  )
    return res.status(409).json({ message: "Các trường vượt quá độ dài cho phép!" });

  const qCheck = "SELECT id FROM companies WHERE email = ?";
  db.query(qCheck, [email], (err, dup) => {
    if (err) return res.status(500).json(err);
    if (dup?.length) return res.status(409).json({ message: "Email đã tồn tại !" });

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const q = `INSERT INTO companies
      (nameCompany, nameAdmin, email, password, avatarPic, phone, idProvince, intro, scale, web)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      nameCompany,
      nameAdmin,
      email,
      hashedPassword,
      avatarPic || "",
      phone || "",
      idProvince || null,
      intro || "",
      scale || "",
      web || "",
    ];

    db.query(q, values, (err2, result) => {
      if (err2) {
        // Xử lý lỗi trùng lặp email
        if (err2.code === 'ER_DUP_ENTRY' && err2.sqlMessage.includes('email_UNIQUE')) {
          return res.status(409).json("Email đã tồn tại trong hệ thống!");
        }
        // Xử lý lỗi idProvince không được null
        if (err2.code === 'ER_BAD_NULL_ERROR' && err2.sqlMessage.includes('idProvince')) {
          return res.status(400).json("Tỉnh/thành phố không được để trống!");
        }
        return res.status(500).json({ message: "Lỗi máy chủ", code: err2?.code });
      }
      return res.status(200).json({ message: "Company added successfully", id: result.insertId });
    });
  });
};

export const updateCompanyByAdmin = (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");

  const {
    id,
    nameCompany,
    nameAdmin,
    email,
    password,
    avatarPic,
    phone,
    idProvince,
    intro,
    scale,
    web,
  } = req.body;

  if (!id) return res.status(400).json("Missing company id");
  if (!checkEmail(email)) return res.status(409).json("Email không hợp lệ !");
  if (web?.length > 0 && !checkUrl(web)) return res.status(409).json("Link không hợp lệ !");
  if (phone && (isNaN(phone) || phone?.length > 45)) return res.status(409).json("Số điện thoại không hợp lê !");

  jwt.verify(token, process.env.MY_SECRET, (err) => {
    if (err) return res.status(403).json("Token không trùng !");

    const qDup = "SELECT id FROM companies WHERE email = ? AND id != ?";
    db.query(qDup, [email, id], (errDup, dup) => {
      if (errDup) return res.status(500).json(errDup);
      if (dup?.length) return res.status(409).json("Email đã tồn tại !");

      const setFragments = [
        "`nameCompany` = ?",
        "`nameAdmin` = ?",
        "`email` = ?",
        "`avatarPic` = ?",
        "`phone` = ?",
        "`idProvince` = ?",
        "`intro` = ?",
        "`scale` = ?",
        "`web` = ?",
      ];
      const values = [
        nameCompany,
        nameAdmin,
        email,
        avatarPic || "",
        phone || "",
        idProvince || null,
        intro || "",
        scale || "",
        web || "",
      ];

      if (typeof password === "string" && password.trim().length > 0) {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        setFragments.push("`password` = ?");
        values.push(hashedPassword);
      }

      const q = `UPDATE companies SET ${setFragments.join(", ")} WHERE id = ?`;
      values.push(id);

      db.query(q, values, (errUpdate, data) => {
        if (errUpdate) return res.status(500).json(errUpdate);
        if (data?.affectedRows > 0) return res.status(200).json({ message: "Updated" });
        return res.status(404).json({ message: "Company not found" });
      });
    });
  });
};

export const deleteCompanyByAdmin = (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");
  const { id } = req.params;
  if (!id) return res.status(400).json("Missing company id");

  jwt.verify(token, process.env.MY_SECRET, (err) => {
    if (err) return res.status(403).json("Token không trùng !");
    const q = "DELETE FROM companies WHERE id = ?";
    db.query(q, [id], (errDel, data) => {
      if (errDel) return res.status(500).json(errDel);
      if (data?.affectedRows > 0) return res.status(200).json({ message: "Deleted" });
      return res.status(404).json({ message: "Company not found" });
    });
  });
};
