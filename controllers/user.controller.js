import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../config/connect.js";
import checkEmail from "../middlewares/checkEmail.middleware.js";
import checkUrl from "../middlewares/checkUrl.middleware.js";
import dotenv from "dotenv";
import "express-async-errors";

dotenv.config();

export const getUser = (req, res) => {
  const id = req.params.id;

  const q = `SELECT u.id, u.name, u.email, u.phone, u.avatarPic, u.birthDay, u.intro, u.linkSocial, p.name as location, privilege FROM users as u 
    LEFT JOIN provinces as p ON u.idProvince = p.id WHERE u.id = ?`;

  if (id) {
    db.query(q, id, (err, data) => {
      if (!data?.length) {
        return res.status(401).json("Không tồn tại !");
      } else {
        return res.json(data[0]);
      }
    });
  } else {
    return res.status(401).json("Không có trường id !");
  }
};

export const getOwnerUser = (req, res) => {
  let q = `SELECT u.* , p.name as province FROM users as u
           LEFT JOIN provinces as p ON u.idProvince = p.id where u.id = ?`;

  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");

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

export const updateUser = (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");

  const { name, birthDay, sex, email, phone, idProvince, linkSocial } = req.body;
  
  // Debug log
  console.log('🔍 UpdateUser API called with data:', {
    name, birthDay, sex, email, phone, idProvince, linkSocial
  });

  if (!checkEmail(email)) return res.status(409).json("Email không hợp lệ !");

  if (linkSocial?.length > 0 && !checkUrl(linkSocial))
    return res.status(409).json("Liên kết không hợp lệ !");

  if (isNaN(phone) || phone?.length > 24) return res.status(409).json("Số điện thoại không hợp lê !");

  if(!name) return res.status(409).json("Tên không được để trống.");

  if (name?.length > 255 || email?.length > 255 || linkSocial?.length > 255)
    return res.status(409).json("Các trường không vượt quá 255 kí tự.");
  

  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json("Token không trùng !");

    const q = "SELECT * FROM users WHERE email = ? and id != ?";

    db.query(q, [email, userInfo.id], (err, data) => {
      if (err) return res.status(200).json(err);
      if (data?.length) return res.status(409).json("Email đã tồn tại !");

      const q2 =
        "UPDATE users SET `name`= ?, `email`= ?, `phone`= ?, `birthDay`= ?, `sex`= ? , `idProvince`= ?, `linkSocial` = ? WHERE id = ? ";

      const values = [
        name,
        email,
        phone,
        new Date(birthDay),
        sex,
        idProvince,
        linkSocial,
        userInfo.id,
      ];

      console.log('🔍 Executing UPDATE query with values:', values);

      db.query(q2, values, (err, data) => {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(200).json(err);
        }
        console.log('✅ Update result:', data);
        if (data?.affectedRows > 0) return res.json("Update");
        return res.status(403).json("Lỗi vui lòng thử lại !");
      });
    });
  });
};

export const updateIntroUser = (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");

  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
    if (err) return res.status(403).json("Token không trùng !");
    const q = "UPDATE users SET `intro` = ? WHERE id = ? ";

    db.query(q, [req.body.intro, userInfo.id], (err, data) => {
      if (!err) return res.status(200).json(data);
      if (data?.affectedRows > 0) return res.json("Update");
      return res.status(403).json("Chỉ thay đổi được thông tin của mình");
    });
  });
};

export const uploadImage = (req, res) => {
  const avatarPic = req.body.avatarPic;
  const q = "UPDATE users SET avatarPic = ? WHERE id = ? ";

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

//admin ------------------------------------------------------------------------------------------------------
export const getAllUser = (req, res) => {
  const q = "SELECT * FROM users";

  db.query(q, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json(data);
  });
};
export const insertUser = (req, res) => {
  const {
    name,
    email,
    password,
    idProvince,
    phone,
    avatarPic,
    birthDay,
    intro,
    linkSocial,
    sex,
    privilege,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, password are required" });
  }

  const q = `
    INSERT INTO users
    (name, email, password, idProvince, phone, avatarPic, birthDay, intro, linkSocial, sex, privilege)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const values = [
    name,
    email,
    hashedPassword,
    idProvince || null,
    phone || "",
    avatarPic || "",
    birthDay ? new Date(birthDay) : null,
    intro || "",
    linkSocial || "",
    sex || "",
    privilege || "user",
  ];

  db.query(q, values, (err, result) => {
    if (err) {
      // Xử lý lỗi trùng lặp email
      if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.includes('email_UNIQUE')) {
        return res.status(409).json("Email đã tồn tại trong hệ thống!");
      }
      // Xử lý lỗi idProvince không được null
      if (err.code === 'ER_BAD_NULL_ERROR' && err.sqlMessage.includes('idProvince')) {
        return res.status(400).json("Tỉnh/thành phố không được để trống!");
      }
      return res.status(500).json({ message: "Lỗi máy chủ", code: err?.code });
    }
    return res.status(200).json({ message: "User added successfully", id: result.insertId });
  });
};


export const updateUserByAdmin = (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");

  const { id, name, birthDay, sex, email, phone, idProvince, linkSocial, privilege, password, avatarPic, intro } = req.body;

  if (!id) return res.status(400).json("Missing user id");

  if (!checkEmail(email)) return res.status(409).json("Email không hợp lệ !");

  if (linkSocial?.length > 0 && !checkUrl(linkSocial))
    return res.status(409).json("Liên kết không hợp lệ !");

  if (isNaN(phone) || phone?.length > 24) return res.status(409).json("Số điện thoại không hợp lê !");
  if (avatarPic && avatarPic.length > 255) return res.status(403).json("Tên hình ảnh quá dài !");
  if (intro && intro.length > 5000) return res.status(403).json("Giới thiệu không vượt quá 5000 kí tự.");

  if(!name) return res.status(409).json("Tên không được để trống.");

  if (name?.length > 255 || email?.length > 255 || linkSocial?.length > 255)
    return res.status(409).json("Các trường không vượt quá 255 kí tự.");
  

  jwt.verify(token, process.env.MY_SECRET, (err) => {
    if (err) return res.status(403).json("Token không trùng !");

    const q = "SELECT * FROM users WHERE email = ? and id != ?";

    db.query(q, [email, id], (err, data) => {
      if (err) return res.status(200).json(err);
      if (data?.length) return res.status(409).json("Email đã tồn tại !");

      const normalizedBirthDay = birthDay ? new Date(birthDay) : null;
      const setFragments = [
        "`name` = ?",
        "`email` = ?",
        "`phone` = ?",
        "`birthDay` = ?",
        "`sex` = ?",
        "`idProvince` = ?",
        "`linkSocial` = ?",
        "`privilege` = ?",
      ];
      const values = [
        name,
        email,
        phone,
        normalizedBirthDay,
        sex,
        idProvince || null,
        linkSocial || "",
        privilege || "user",
      ];

      // Optional fields managed by admin
      setFragments.push("`avatarPic` = ?");
      values.push(avatarPic || "");
      setFragments.push("`intro` = ?");
      values.push(intro || "");

      if (typeof password === 'string' && password.trim().length > 0) {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        setFragments.push("`password` = ?");
        values.push(hashedPassword);
      }

      const q2 = `UPDATE users SET ${setFragments.join(", ")} WHERE id = ?`;
      values.push(id);

      db.query(q2, values, (err, data) => {
        if (err) return res.status(200).json(err);
        if (data?.affectedRows > 0) return res.json("Update");
        return res.status(403).json("Lỗi vui lòng thử lại !");
      });
    });
  });
};

export const deleteUserByAdmin = (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json("Not logged in!");

  const { id } = req.params;
  if (!id) return res.status(400).json("Missing user id");

  jwt.verify(token, process.env.MY_SECRET, (err) => {
    if (err) return res.status(403).json("Token không trùng !");

    const q = "DELETE FROM users WHERE id = ?";
    db.query(q, [id], (err, data) => {
      if (err) return res.status(500).json(err);
      if (data?.affectedRows > 0) return res.status(200).json({ message: "Deleted" });
      return res.status(404).json({ message: "User not found" });
    });
  });
};