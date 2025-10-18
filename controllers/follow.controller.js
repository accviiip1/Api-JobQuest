import jwt from "jsonwebtoken";
import { db } from "../config/connect.js";
import moment from "moment";
import "express-async-errors";
import { notificationStoreDB } from "../services/notificationStoreDB.js";

export const getCompanies = async (req, res) => {
  try {
    const promiseDb = db.promise();
    const idUser = req.params.idUser;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;

    const q = `SELECT nameCompany, avatarPic, scale, web, c.id, p.name as province 
              FROM follow_company AS f, companies AS c, provinces as p 
              WHERE f.idUser = ? AND f.idCompany = c.id AND c.idProvince = p.id order by f.createdAt desc limit ? offset ?`;

    const q2 = `SELECT count(*) as count FROM follow_company AS f, companies AS c 
                WHERE f.idUser = ? AND f.idCompany = c.id`;

    const [data] = await promiseDb.query(q, [idUser, +limit, +offset]);
    const [totalPageData] = await promiseDb.query(q2, idUser);
    const totalPage = Math.ceil(+totalPageData[0]?.count / limit);

    if (data) {
      return res.status(200).json({
        data: data,
        pagination: {
          page: +page,
          limit: +limit,
          totalPage,
        },
      });
    } else {
      return res.status(409).json("Rỗng !");
    }
  } catch (error) {
    return res.status(409).json("Lỗi !");
  }
};

export const getFollower = (req, res) => {
  try {
    const q = "SELECT idUser FROM follow_company as f WHERE f.idCompany = ?";

    db.query(q, [req.query.idCompany], (err, data) => {
      if (err) return res.status(500).json(err);
      return res.status(200).json(data.map((user) => user.idUser));
    });
  } catch (error) {
    return res.status(401).json(error);
  }
};

export const addFollow = (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Chưa đăng nhập !");

  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    if (err) return res.status(401).json("Token is not invalid");

    const q = "INSERT INTO follow_company (`idUser`, `idCompany`, `createdAt`) VALUES (?)";

    const values = [
      userInfo.id,
      req.query.idCompany,
      moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
    ];

    db.query(q, [values], async (err, data) => {
      if (err) return res.status(500).json(err);
      
      // Tạo thông báo cho company
      try {
        const notification = await notificationStoreDB.createNotification({
          receiverType: 'company',
          receiverId: req.query.idCompany.toString(),
          senderType: 'user',
          senderId: userInfo.id.toString(),
          message: `Có người dùng mới đã theo dõi công ty của bạn!`
        });
        
        // Emit WebSocket event
        const io = req.app.get("io");
        if (io) {
          const roomName = `company_${req.query.idCompany}`;
          io.to(roomName).emit("notification_received", notification);
          console.log(`WebSocket: Follow notification sent to room ${roomName}`);
        }
        
        console.log(`✅ Đã tạo thông báo follow cho company ${req.query.idCompany}`);
      } catch (notificationErr) {
        console.error("Lỗi khi tạo thông báo follow:", notificationErr);
      }
      
      return res.status(200).json("Thành công!");
    });
  });
};

export const removeFollow = (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Chưa đăng nhập !");

  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    if (err) return res.status(401).json("Token is not invalid");

    const q = "DELETE FROM follow_company WHERE `idUser` = ? AND `idCompany` = ?";

    db.query(q, [userInfo.id, req.query.idCompany], async (err, data) => {
      if (err) return res.status(500).json(err);
      
      // Tạo thông báo đơn giản cho company (tùy chọn)
      try {
        const notification = await notificationStoreDB.createNotification({
          receiverType: 'company',
          receiverId: req.query.idCompany.toString(),
          senderType: 'user',
          senderId: userInfo.id.toString(),
          message: `Một người dùng đã bỏ theo dõi công ty của bạn.`
        });
        
        // Emit WebSocket event
        const io = req.app.get("io");
        if (io) {
          const roomName = `company_${req.query.idCompany}`;
          io.to(roomName).emit("notification_received", notification);
          console.log(`WebSocket: Unfollow notification sent to room ${roomName}`);
        }
        
        console.log(`✅ Đã tạo thông báo unfollow cho company ${req.query.idCompany}`);
      } catch (notificationErr) {
        console.error("Lỗi khi tạo thông báo unfollow:", notificationErr);
      }
      
      return res.status(200).json("Thành công!");
    });
  });
};

// Admin CRUD for follow_company
export const getAllFollowByAdmin = async (req, res) => {
  try {
    const promiseDb = db.promise();
    const page = Number(req.query?.page || 1);
    const limit = Number(req.query?.limit || 100);
    const offset = (page - 1) * limit;

    const q = `SELECT f.*, u.email AS userEmail, c.nameCompany AS companyName
               FROM follow_company f
               LEFT JOIN users u ON f.idUser = u.id
               LEFT JOIN companies c ON f.idCompany = c.id
               ORDER BY f.createdAt DESC
               LIMIT ? OFFSET ?`;
    const q2 = `SELECT COUNT(*) as count FROM follow_company`;

    const [rows] = await promiseDb.query(q, [limit, offset]);
    const [cnt] = await promiseDb.query(q2);
    return res.status(200).json({ data: rows, pagination: { page, limit, total: cnt[0].count } });
  } catch (e) {
    return res.status(500).json(e);
  }
};

export const insertFollowByAdmin = (req, res) => {
  const { idUser, idCompany, createdAt } = req.body;
  if (!idUser || !idCompany) return res.status(400).json({ message: 'idUser, idCompany are required' });
  const q = `INSERT INTO follow_company (idUser, idCompany, createdAt) VALUES (?, ?, ?)`;
  const values = [idUser, idCompany, createdAt || moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')];
  db.query(q, values, (err, result) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json({ message: 'Follow added', id: result.insertId });
  });
};

export const updateFollowByAdmin = (req, res) => {
  const { id, idUser, idCompany, createdAt } = req.body;
  if (!id) return res.status(400).json({ message: 'Missing id' });
  const q = `UPDATE follow_company SET idUser=?, idCompany=?, createdAt=? WHERE id=?`;
  const values = [idUser, idCompany, createdAt || null, id];
  db.query(q, values, (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) return res.status(200).json({ message: 'Updated' });
    return res.status(404).json({ message: 'Follow not found' });
  });
};

export const deleteFollowByAdmin = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Missing id' });
  const q = `DELETE FROM follow_company WHERE id=?`;
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result?.affectedRows > 0) return res.status(200).json({ message: 'Deleted' });
    return res.status(404).json({ message: 'Follow not found' });
  });
};
