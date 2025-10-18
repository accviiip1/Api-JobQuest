import { db } from "../config/connect.js";
import jwt from "jsonwebtoken";
import moment from "moment";
import "express-async-errors";
import dotenv from "dotenv";
dotenv.config();

export const getAll = async (req, res) => {
  try {
    const promiseDb = db.promise();
    const page = req.query?.page || 1;
    const limit = req.query?.limit || 10;
    const sort = req.query?.sort || "new";
    const search = req.query?.search;
    const province = req.query?.province;
    const field = req.query?.field;
    const typeWork = req.query?.typeWork;
    const exp = req.query?.exp;
    const edu = req.query?.edu;
    const salary = req.query?.salary;
    const status = req.query?.status; // Thêm filter theo status

    const offset = (page - 1) * limit;

    let q = `SELECT j.*,
        p.name as province,
        c.nameCompany,
        c.avatarPic,
        f.name as nameField
       FROM jobs AS j , companies AS c , provinces as p , fields as f
       WHERE j.deletedAt is null AND j.idCompany = c.id AND j.idProvince = p.id AND j.idField = f.id `;

    let q2 = `SELECT count(*) as count FROM jobs AS j , companies AS c , provinces as p ,fields as f
       WHERE j.deletedAt is null AND j.idCompany = c.id AND j.idProvince = p.id AND j.idField = f.id `;

    if (search) {
      q += ` AND (j.nameJob like '%${search}%' or c.nameCompany like '%${search}%' or p.name like '%${search}%')`;
      q2 += ` AND (j.nameJob like '%${search}%' or c.nameCompany like '%${search}%' or p.name like '%${search}%') `;
    }

    if (province) {
      let provinceFilter = province.join("','");
      q += ` AND p.name in ('${provinceFilter}') `;
      q2 += ` AND p.name in ('${provinceFilter}') `;
    }

    if (field) {
      let fieldFilter = field.join("','");
      q += ` AND f.name in ('${fieldFilter}') `;
      q2 += ` AND f.name in ('${fieldFilter}') `;
    }

    if (typeWork) {
      let typeWorkFilter = typeWork.join("','");
      q += ` AND j.typeWork in ('${typeWorkFilter}') `;
      q2 += ` AND j.typeWork in ('${typeWorkFilter}') `;
    }

    if (exp) {
      let expFilter = exp.join("','");
      q += ` AND j.experience in ('${expFilter}') `;
      q2 += ` AND j.experience in ('${expFilter}') `;
    }

    if (edu) {
      let eduFilter = edu.join("','");
      q += ` AND j.education in ('${eduFilter}') `;
      q2 += ` AND j.education in ('${eduFilter}') `;
    }

    if (salary) {
      q += ` AND j.salaryMax >= ${salary[0]} and j.salaryMin <= ${salary[1]} `;
      q2 += ` AND j.salaryMax >= ${salary[0]} and j.salaryMin <= ${salary[1]}`;
    }

    if (status !== undefined) {
      q += ` AND j.status = ${status} `;
      q2 += ` AND j.status = ${status} `;
    }

    if (sort === "new") {
      q += ` ORDER BY j.createdAt DESC `;
    } else if (sort === "old") {
      q += `  ORDER BY j.createdAt ASC `;
    } else if (sort === "maxToMin") {
      q += ` ORDER BY j.salaryMin DESC `;
    } else if (sort === "minToMax") {
      q += ` ORDER BY j.salaryMin ASC `;
    }

    const [data] = await promiseDb.query(`${q} limit ${+limit} offset ${+offset}`);
    const [totalData] = await promiseDb.query(q2);
    const totalPage = Math.ceil(+totalData[0]?.count / limit);

    if (data && totalData && totalPage) {
      return res.status(200).json({
        data: data,
        pagination: {
          page: +page,
          limit: +limit,
          totalPage,
          total: totalData[0]?.count,
        },
      });
    } else {
      res.status(200).json(undefined);
    }
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getById = (req, res) => {
  const q = `SELECT j.* , p.name as province , c.nameCompany, c.avatarPic , f.name as nameField, deletedAt
             FROM jobs AS j , companies AS c , provinces as p , fields as f
             WHERE j.id = ? AND j.idField = f.id  AND j.idCompany = c.id AND j.idProvince = p.id`;

  db.query(q, req.params.id, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json(data[0]);
  });
};

export const getByIdCompany = async (req, res) => {
  try {
    const promiseDb = db.promise();
    const { id } = req.params;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;
    const token = req.cookies?.accessToken;

    let q = `SELECT j.id,  j.nameJob, j.salaryMax, j.salaryMin, j.typeWork, j.idCompany, j.createdAt, j.deletedAt , p.name as province , c.nameCompany, c.avatarPic
    FROM jobs AS j , companies AS c ,  provinces as p 
    WHERE j.deletedAt is null AND j.status = 1 AND c.id = ? AND j.idCompany = c.id AND j.idProvince = p.id ORDER BY j.createdAt DESC limit ? offset ?`;

    let q2 = `SELECT count(*) as count FROM jobs AS j , companies AS c , provinces as p 
    WHERE j.deletedAt is null AND j.status = 1 AND c.id = ? AND j.idCompany = c.id AND j.idProvince = p.id`;

    token &&
      jwt.verify(token, process.env.MY_SECRET, (err, companmyInfo) => {
        if (parseInt(companmyInfo.id) === parseInt(id)) {
          q = `SELECT j.id,  j.nameJob, j.salaryMax, j.salaryMin, j.typeWork, j.idCompany, j.createdAt ,j.deletedAt, j.status, p.name as province , c.nameCompany, c.avatarPic
        FROM jobs AS j , companies AS c ,  provinces as p 
        WHERE c.id = ? AND j.idCompany = c.id AND j.idProvince = p.id ORDER BY j.createdAt DESC limit ? offset ?`;
          q2 = `SELECT count(*) as count FROM jobs AS j , companies AS c , provinces as p 
        WHERE c.id = ? AND j.idCompany = c.id AND j.idProvince = p.id`;
        }
      });

    const [data] = await promiseDb.query(q, [id, +limit, +offset]);
    const [totalData] = await promiseDb.query(q2, [id]);
    const totalPage = Math.ceil(+totalData[0]?.count / limit);

    if (data && totalData && totalPage) {
      return res.status(200).json({
        data: data,
        pagination: {
          page: +page,
          limit: +limit,
          totalPage,
          total: totalData[0].count,
        },
      });
    } else {
      res.status(200).json(undefined);
    }
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getNameJob = (req, res) => {
  const { id } = req.params;

  const q = "SELECT j.id, j.nameJob as name, j.idCompany FROM jobs as j Where j.idCompany = ?";

  db.query(q, [id], (err, data) => {
    if (!data?.length) {
      return res.status(401).json("Không tồn tại !");
    } else {
      return res.json(data);
    }
  });
};

export const postJob = (req, res) => {
  const {
    idField,
    idProvince,
    nameJob,
    request,
    desc,
    other,
    salaryMin,
    salaryMax,
    sex,
    typeWork,
    education,
    experience,
  } = req.body;

  if (!idField || !idProvince || !nameJob)
    return res.status(401).json("Các trường không để rỗng !");

  if (nameJob?.length > 255) return res.status(401).json("Tên công việc không vượt quá 255 kí tự.");

  if (request?.length > 5000 || desc?.length > 5000 || other?.length > 5000)
    return res.status(401).json("Các trường không vượt quá 5000 kí tự.");

  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Chưa đăng nhập !");

  const q = "SELECT * FROM companies WHERE id = ?";

  jwt.verify(token, process.env.MY_SECRET, (err, companmyInfo) => {
    db.query(q, companmyInfo.id, (err, data) => {
      if (!data?.length) return res.status(401).json("Người dùng không hợp lệ !");

      const q =
        "INSERT INTO jobs (`idCompany`, `idField`, `idProvince` , `nameJob`, `request`, `desc`, `other`, `salaryMin`, `salaryMax`,`sex`, `typeWork` , `education`, `experience`,  `createdAt`,`status`) VALUE (?)";
      const values = [
        companmyInfo.id,
        idField,
        idProvince,
        nameJob,
        request,
        desc,
        other,
        salaryMin,
        salaryMax,
        sex,
        typeWork,
        education,
        experience,
        moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
        0
      ];

      db.query(q, [values], (err, data) => {
        if (err) return res.status(500).json(err);
        return res.status(200).json("Đăng thành công");
      });
    });
  });
};

export const getByIdField = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const promiseDb = db.promise();
    const { idField } = req.params;

    const offset = (page - 1) * limit;

    const q = `SELECT j.id, j.nameJob, j.salaryMax, j.salaryMin, j.typeWork, j.idCompany, j.createdAt , p.name as province , c.nameCompany, c.avatarPic, f.name as nameFields
       FROM jobs AS j , companies AS c , provinces as p , fields as f 
      WHERE f.id = ? AND j.deletedAt is null AND j.status = 1 AND j.idCompany = c.id AND j.idProvince = p.id AND j.idField = f.id ORDER BY j.createdAt DESC limit ? offset ?`;
    const q2 = `SELECT count(*) as count FROM jobs AS j , companies AS c , provinces as p , fields as f 
      WHERE j.deletedAt is null AND j.status = 1 AND f.id = ? AND j.idCompany = c.id AND j.idProvince = p.id AND j.idField = f.id ORDER BY j.createdAt`;

    const [data] = await promiseDb.query(q, [+idField, +limit, +offset]);
    const [totalPageData] = await promiseDb.query(q2, [+idField]);
    const totalPage = Math.ceil(+totalPageData[0]?.count / limit);

    if (data && totalPageData && totalPage) {
      return res.status(200).json({
        data: data,
        pagination: {
          page: +page,
          limit: +limit,
          totalPage,
        },
      });
    } else {
      return res.status(401).json("Không tìm thấy");
    }
  } catch (error) {
    return res.status(401).json("Lỗi");
  }
};

export const updateJob =  (req, res) => {
  const {
    idField,
    idProvince,
    nameJob,
    request,
    desc,
    other,
    salaryMin,
    salaryMax,
    sex,
    typeWork,
    education,
    experience,
    idJob,
  } = req.body;

  if (!idField || !idProvince || !nameJob)
    return res.status(401).json("Các trường không để rỗng !");

  if (nameJob?.length > 255) return res.status(401).json("Tên công việc không vượt quá 255 kí tự.");

  if (request?.length > 5000 || desc?.length > 5000 || other?.length > 5000)
    return res.status(401).json("Các trường không vượt quá 5000 kí tự.");

  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Chưa đăng nhập !");

  const q = "SELECT * FROM companies WHERE id = ?";

  jwt.verify(token, process.env.MY_SECRET, (err, companmyInfo) => {
    db.query(q, companmyInfo.id, (err, data) => {
      if (!data?.length) return res.status(401).json("Người dùng không hợp lệ !");

      const q =
        "UPDATE jobs as j SET `nameJob`=?,`idField`=?,`idProvince`=?,`desc`=?,`request`=?,`other`=?,`salaryMin`=?,`salaryMax`=?,`sex`=?,`typeWork`=?,`education`=?,`experience`=?  WHERE j.id = ? AND j.idCompany = ?";

      const values = [
        nameJob,
        idField,
        idProvince,
        desc,
        request,
        other,
        salaryMin,
        salaryMax,
        sex,
        typeWork,
        education,
        experience,
        idJob,
        companmyInfo.id,
      ];
      db.query(q, values, (err, data) => {
        if (err) return res.status(500).json(err);
        return res.status(200).json("Đăng thành công");
      });
    });
  });
};

export const hiddenJob = async (req, res) => {
  const token = req.cookies.accessToken;

  const idJob = req.query.idJob;

  if (!token) return res.status(401).json("Chưa đăng nhập !");

  jwt.verify(token, process.env.MY_SECRET, (err, companmyInfo) => {
    if (err) return res.status(403).json("Token không trùng !");

    const q = `UPDATE jobs as j SET \`deletedAt\` = '${moment(Date.now()).format(
      "YYYY-MM-DD HH:mm:ss"
    )}' WHERE j.id = ${idJob} AND j.idCompany = ${companmyInfo.id}`;

    db.query(q, (err, data) => {
      if (!err) return res.status(200).json(data);
      if (data?.affectedRows > 0) return res.json("Update");
      return res.status(403).json("Chỉ thay đổi được thông tin của mình");
    });
  });
};

export const unHiddenJob =  (req, res) => {
  const token = req.cookies.accessToken;

  const idJob = req.query.idJob;

  if (!token) return res.status(401).json("Chưa đăng nhập !");

  jwt.verify(token, process.env.MY_SECRET, (err, companmyInfo) => {
    if (err) return res.status(403).json("Token không trùng !");

    const q = `UPDATE jobs as j SET \`deletedAt\` = null WHERE j.id = ${idJob} AND j.idCompany = ${companmyInfo.id}`;

    db.query(q, (err, data) => {
      if (!err) return res.status(200).json(data);
      if (data?.affectedRows > 0) return res.json("Update");
      return res.status(403).json("Chỉ thay đổi được thông tin của mình");
    });
  });
};

export const deleteJob = (req, res) => {
  const token = req.cookies.accessToken;

  const idJob = req.query.idJob;

  if (!token) return res.status(401).json("Chưa đăng nhập !");

  const kiemTraTonTai = `SELECT * FROM job.apply_job WHERE idJob = ${idJob}`;

  db.query(kiemTraTonTai, (err, data) => {
    if (data?.length) return res.status(401).json("Bài tuyển dụng đã có ứng viên, không thể xóa !");

    jwt.verify(token, process.env.MY_SECRET, (err, companmyInfo) => {
      if (err) return res.status(403).json("Lỗi! Vui lòng đăng nhập lại !");

      const q = `DELETE FROM jobs as j WHERE j.id = ${idJob} AND j.idCompany = ${companmyInfo.id}`;

      db.query(q, (err, data) => {
        if (!err) return res.status(200).json(data);
        if (data?.affectedRows > 0) return res.json("Update");
        return res.status(403).json("Chỉ thay đổi được thông tin của mình");
      });
    });
  });
};

// Admin endpoints (yêu cầu có token nhưng không ràng buộc công ty)
export const insertJobByAdmin = (req, res) => {
  const {
    idCompany,
    idField,
    idProvince,
    nameJob,
    request,
    desc,
    other,
    salaryMin,
    salaryMax,
    sex,
    typeWork,
    education,
    experience,
    status = 0, // Mặc định là chờ duyệt
  } = req.body;

  if (!idCompany || !idField || !idProvince || !nameJob) {
    return res.status(400).json({ message: "idCompany, idField, idProvince, nameJob are required" });
  }
  if (nameJob?.length > 255) return res.status(409).json({ message: "Tên công việc không vượt quá 255 kí tự." });
  if (request?.length > 5000 || desc?.length > 5000 || other?.length > 5000)
    return res.status(409).json({ message: "Các trường không vượt quá 5000 kí tự." });
  if (status !== 0 && status !== 1 && status !== 2) {
    return res.status(400).json({ message: "Status must be 0 (chờ duyệt), 1 (thông qua), or 2 (từ chối)" });
  }

  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");

  const q =
    "INSERT INTO jobs (idCompany, idField, idProvince, nameJob, `request`, `desc`, other, salaryMin, salaryMax, sex, typeWork, education, experience, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const values = [
    idCompany,
    idField,
    idProvince,
    nameJob,
    request || "",
    desc || "",
    other || "",
    salaryMin || null,
    salaryMax || null,
    sex || "",
    typeWork || "",
    education || "",
    experience || "",
    status,
    moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
  ];

  db.query(q, values, (err, result) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json({ message: "Job added successfully", id: result.insertId });
  });
};

export const updateJobByAdmin = (req, res) => {
  const {
    id,
    idCompany,
    idField,
    idProvince,
    nameJob,
    request,
    desc,
    other,
    salaryMin,
    salaryMax,
    sex,
    typeWork,
    education,
    experience,
    status,
  } = req.body;

  if (!id) return res.status(400).json({ message: "Missing job id" });
  if (!idCompany || !idField || !idProvince || !nameJob) {
    return res.status(400).json({ message: "idCompany, idField, idProvince, nameJob are required" });
  }
  if (nameJob?.length > 255) return res.status(409).json({ message: "Tên công việc không vượt quá 255 kí tự." });
  if (request?.length > 5000 || desc?.length > 5000 || other?.length > 5000)
    return res.status(409).json({ message: "Các trường không vượt quá 5000 kí tự." });
  if (status !== undefined && status !== 0 && status !== 1 && status !== 2) {
    return res.status(400).json({ message: "Status must be 0 (chờ duyệt), 1 (thông qua), or 2 (từ chối)" });
  }

  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");

  const q =
    "UPDATE jobs SET `idCompany`=?, `idField`=?, `idProvince`=?, `nameJob`=?, `request`=?, `desc`=?, `other`=?, `salaryMin`=?, `salaryMax`=?, `sex`=?, `typeWork`=?, `education`=?, `experience`=?, `status`=? WHERE id = ?";
  const values = [
    idCompany,
    idField,
    idProvince,
    nameJob,
    request || "",
    desc || "",
    other || "",
    salaryMin || null,
    salaryMax || null,
    sex || "",
    typeWork || "",
    education || "",
    experience || "",
    status !== undefined ? status : 0, // Giữ nguyên status hiện tại nếu không được cung cấp
    id,
  ];

  db.query(q, values, (err, data) => {
    if (err) return res.status(500).json(err);
    if (data?.affectedRows > 0) return res.status(200).json({ message: "Updated" });
    return res.status(404).json({ message: "Job not found" });
  });
};

export const deleteJobByAdmin = (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Missing job id" });

  const kiemTraTonTai = `SELECT id FROM apply_job WHERE idJob = ?`;
  db.query(kiemTraTonTai, [id], (err, data) => {
    if (err) return res.status(500).json(err);
    if (data?.length) return res.status(409).json({ message: "Bài tuyển dụng đã có ứng viên, không thể xóa !" });

    const q = "DELETE FROM jobs WHERE id = ?";
    db.query(q, [id], (errDel, result) => {
      if (errDel) return res.status(500).json(errDel);
      if (result?.affectedRows > 0) return res.status(200).json({ message: "Deleted" });
      return res.status(404).json({ message: "Job not found" });
    });
  });
};

// Duyệt job (chuyển status từ 0 sang 1)
export const approveJobByAdmin = (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Missing job id" });

  const q = "UPDATE jobs SET status = 1 WHERE id = ? AND status = 0";
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) {
      return res.status(200).json({ message: "Job approved successfully" });
    }
    return res.status(404).json({ message: "Job not found or already processed" });
  });
};

// Từ chối job (chuyển status từ 0 sang 2)
export const rejectJobByAdmin = (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Missing job id" });

  const q = "UPDATE jobs SET status = 2 WHERE id = ? AND status = 0";
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) {
      return res.status(200).json({ message: "Job rejected successfully" });
    }
    return res.status(404).json({ message: "Job not found or already processed" });
  });
};

// Lấy danh sách jobs theo status
export const getJobsByStatus = async (req, res) => {
  try {
    const { status } = req.query;
    const page = req.query?.page || 1;
    const limit = req.query?.limit || 10;
    const offset = (page - 1) * limit;

    if (status === undefined) {
      return res.status(400).json({ message: "Status parameter is required" });
    }

    const promiseDb = db.promise();

    let q = `SELECT j.*,
          p.name as province,
          c.nameCompany,
          c.avatarPic,
          f.name as nameField
         FROM jobs AS j 
         LEFT JOIN companies AS c ON j.idCompany = c.id 
         LEFT JOIN provinces as p ON j.idProvince = p.id 
         LEFT JOIN fields as f ON j.idField = f.id
         WHERE j.deletedAt IS NULL AND j.status = ?`;

    let q2 = `SELECT count(*) as count FROM jobs AS j 
         WHERE j.deletedAt IS NULL AND j.status = ?`;

    q += ` ORDER BY j.createdAt DESC LIMIT ? OFFSET ?`;

    const [countResult] = await promiseDb.query(q2, [status]);
    const total = countResult[0].count;
    
    const [data] = await promiseDb.query(q, [status, parseInt(limit), parseInt(offset)]);
    
    return res.status(200).json({
      data: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error in getJobsByStatus:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
