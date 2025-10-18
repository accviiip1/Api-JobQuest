import jwt from "jsonwebtoken";
import { db } from "../config/connect.js";
import moment from "moment";
import "express-async-errors";
import { notificationStoreDB } from "../services/notificationStoreDB.js";

export const getJobSave = async (req, res) => {
  try {
    const promiseDb = db.promise();
    const idUser = req.query.idUser;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const offset = (page - 1) * limit;

    const q = `SELECT j.id,  j.nameJob, j.salaryMax, j.salaryMin, j.typeWork, j.idCompany, j.createdAt , p.name as province , c.nameCompany, c.avatarPic, f.name as nameFields 
               FROM save_job as s , jobs as j , companies AS c ,  provinces as p , fields as f 
               WHERE s.idUser = ? AND s.idJob = j.id AND  j.idCompany = c.id AND j.idProvince = p.id AND j.idField = f.id order by s.createdAt desc limit ? offset ?`;

    const q2 = `SELECT count(*) as count 
                FROM save_job as s , jobs as j , companies AS c , provinces as p , fields as f 
                WHERE s.idUser = ? AND s.idJob = j.id AND  j.idCompany = c.id AND j.idProvince = p.id AND j.idField = f.id`;

    const [data] = await promiseDb.query(q, [idUser, +limit, +offset]);
    const [total] = await promiseDb.query(q2, idUser);
    const totalPage = Math.ceil(+total[0]?.count / limit);

    if (data && total && limit && page) {
      return res.status(200).json({
        data: data,
        pagination: {
          page: +page,
          limit: +limit,
          totalPage,
          total: total[0]?.count,
        },
      });
    } else {
      return res.status(409).json("Rỗng !");
    }
  } catch (error) {
    return res.status(409).json("Lỗi !");
  }
};

export const getUser = (req, res) => {
  try {
    const q = "SELECT idUser FROM save_job as s WHERE s.idJob = ?";

    db.query(q, [req.query.idJob], (err, data) => {
      if (err) return res.status(500).json(err);
      return res.status(200).json(data.map((user) => user.idUser));
    });
  } catch (error) {
    return res.status(401).json(error);
  }
};

export const addSave = (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Chưa đăng nhập !");

  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    if (err) return res.status(401).json("Token is not invalid");

    const q =
      "INSERT INTO save_job (`idUser`, `idJob`, `createdAt`) VALUES (?)";

    const values = [
      userInfo.id,
      req.query.idJob,
      moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
    ];

    db.query(q, [values], async (err, data) => {
      if (err) return res.status(500).json(err);
      
      // Tạo thông báo cho company về việc user follow job
      try {
        // Lấy thông tin job để biết company nào
        const jobQuery = "SELECT idCompany, nameJob FROM jobs WHERE id = ?";
        db.query(jobQuery, [req.query.idJob], async (jobErr, jobData) => {
          if (!jobErr && jobData.length > 0) {
            const job = jobData[0];
            
            const notification = await notificationStoreDB.createNotification({
              receiverType: 'company',
              receiverId: job.idCompany.toString(),
              senderType: 'user',
              senderId: userInfo.id.toString(),
              message: `Có người dùng đã theo dõi công việc "${job.nameJob}" của bạn!`
            });
            
            // Emit WebSocket event
            const io = req.app.get("io");
            if (io) {
              const roomName = `company_${job.idCompany}`;
              io.to(roomName).emit("notification_received", notification);
              console.log(`WebSocket: Save job notification sent to room ${roomName}`);
            }
            
            console.log(`✅ Đã tạo thông báo save job cho company ${job.idCompany}`);
          }
        });
      } catch (notificationErr) {
        console.error("Lỗi khi tạo thông báo save job:", notificationErr);
      }
      
      return res.status(200).json("Thành công!");
    });
  });
};

export const removeSave = (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Chưa đăng nhập !");

  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    if (err) return res.status(401).json("Token is not invalid");

    const q = "DELETE FROM save_job WHERE `idUser` = ? AND `idJob` = ?";

    db.query(q, [userInfo.id, req.query.idJob], async (err, data) => {
      if (err) return res.status(500).json(err);
      
      // Tạo thông báo đơn giản cho company về việc user bỏ follow job
      try {
        // Lấy thông tin job để biết company nào
        const jobQuery = "SELECT idCompany, nameJob FROM jobs WHERE id = ?";
        db.query(jobQuery, [req.query.idJob], async (jobErr, jobData) => {
          if (!jobErr && jobData.length > 0) {
            const job = jobData[0];
            
            const notification = await notificationStoreDB.createNotification({
              receiverType: 'company',
              receiverId: job.idCompany.toString(),
              senderType: 'user',
              senderId: userInfo.id.toString(),
              message: `Một người dùng đã bỏ theo dõi công việc "${job.nameJob}" của bạn.`
            });
            
            // Emit WebSocket event
            const io = req.app.get("io");
            if (io) {
              const roomName = `company_${job.idCompany}`;
              io.to(roomName).emit("notification_received", notification);
              console.log(`WebSocket: Unsave job notification sent to room ${roomName}`);
            }
            
            console.log(`✅ Đã tạo thông báo unsave job cho company ${job.idCompany}`);
          }
        });
      } catch (notificationErr) {
        console.error("Lỗi khi tạo thông báo unsave job:", notificationErr);
      }
      
      return res.status(200).json("Thành công!");
    });
  });
};

// Admin CRUD for save_job
export const getAllSaveByAdmin = async (req, res) => {
  try {
    const promiseDb = db.promise();
    const page = Number(req.query?.page || 1);
    const limit = Number(req.query?.limit || 100);
    const offset = (page - 1) * limit;

    const q = `SELECT s.*, u.email AS userEmail, j.nameJob AS jobName
               FROM save_job s
               LEFT JOIN users u ON s.idUser = u.id
               LEFT JOIN jobs j ON s.idJob = j.id
               ORDER BY s.createdAt DESC
               LIMIT ? OFFSET ?`;
    const q2 = `SELECT COUNT(*) as count FROM save_job`;

    const [rows] = await promiseDb.query(q, [limit, offset]);
    const [cnt] = await promiseDb.query(q2);
    return res.status(200).json({ data: rows, pagination: { page, limit, total: cnt[0].count } });
  } catch (e) {
    return res.status(500).json(e);
  }
};

export const insertSaveByAdmin = (req, res) => {
  const { idUser, idJob, createdAt } = req.body;
  if (!idUser || !idJob) return res.status(400).json({ message: 'idUser, idJob are required' });
  const q = `INSERT INTO save_job (idUser, idJob, createdAt) VALUES (?, ?, ?)`;
  const values = [idUser, idJob, createdAt || moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')];
  db.query(q, values, (err, result) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json({ message: 'Saved', id: result.insertId });
  });
};

export const updateSaveByAdmin = (req, res) => {
  const { id, idUser, idJob, createdAt } = req.body;
  if (!id) return res.status(400).json({ message: 'Missing id' });
  const q = `UPDATE save_job SET idUser=?, idJob=?, createdAt=? WHERE id=?`;
  const values = [idUser, idJob, createdAt || null, id];
  db.query(q, values, (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) return res.status(200).json({ message: 'Updated' });
    return res.status(404).json({ message: 'Save not found' });
  });
};

export const deleteSaveByAdmin = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Missing id' });
  const q = `DELETE FROM save_job WHERE id=?`;
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) return res.status(200).json({ message: 'Deleted' });
    return res.status(404).json({ message: 'Save not found' });
  });
};
