import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../config/connect.js";
import checkEmail from "../middlewares/checkEmail.middleware.js";
import checkPassword from "../middlewares/checkPassword.middleware.js";
import nodemailer from "nodemailer";
import "express-async-errors";
import { OAuth2Client } from "google-auth-library";

const isProduction = process.env.NODE_ENV === "production";

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, verificationCode } = req.body;

    if (!name) return res.status(409).json("Tên không được để trống !");
    if (!email) return res.status(409).json("Email không được để trống !");
    if (!checkEmail(email)) return res.status(409).json("Email không hợp lệ.");
    if (!phone || isNaN(phone) || phone?.length > 45)
      return res.status(409).json("Số điện thoại không hợp lệ !");
    if (!verificationCode) return res.status(409).json("Mã xác thực là bắt buộc !");

    if (name?.length > 255 || email?.length > 255 || password?.length > 255)
      return res.status(409).json("Các trường không vượt quá 255 kí tự !");

    // Validation mật khẩu đã được thực hiện ở client side
    // if (!checkPassword(password))
    //   return res
    //     .status(403)
    //     .json(
    //       "Mật khẩu phải bao gồm ít nhất 6 kí tự, trong đó có chữ cái, số, chữ cái viết hoa và kí tự đặt biệt."
    //     );

    const promiseDb = db.promise();

    // Kiểm tra email đã tồn tại chưa
    const [existingUser] = await promiseDb.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json("Email đã tồn tại !");
    }

    // Kiểm tra mã xác thực
    const [verification] = await promiseDb.query(
      'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND is_used = FALSE AND expires_at > UTC_TIMESTAMP()',
      [email, verificationCode, 'register']
    );

    if (verification.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực không hợp lệ hoặc đã hết hạn"
      });
    }

    // Hash mật khẩu
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Tạo tài khoản
    await promiseDb.query(
      'INSERT INTO users (`name`, `email`, `password`, `phone`) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, phone]
    );

    // Đánh dấu mã đã sử dụng
    await promiseDb.query(
      'UPDATE verification_codes SET is_used = TRUE WHERE id = ?',
      [verification[0].id]
    );

    return res.status(200).json({
      success: true,
      message: "Đăng ký thành công"
    });

  } catch (error) {
    console.error('Error in register:', error);
    return res.status(500).json({ 
      success: false,
      message: "Lỗi máy chủ", 
      error: error.message 
    });
  }
};

export const login = (req, res) => {
  const { email, password } = req.body;
  const q = "SELECT * FROM users WHERE email=?";

  if (email && password) {
    if (!checkEmail(email)) return res.status(409).json("Email không hợp lệ.");

    db.query(q, email, (err, data) => {
      if (err) return res.status(500).json({ message: "Lỗi máy chủ", code: err?.code });
      if (data?.length === 0) return res.status(404).json("Email không tồn tại.");

      const checkPassword = bcrypt.compareSync(req.body.password, data[0].password);
      if (!checkPassword) return res.status(401).json("Sai mật khẩu");

      const secret = process.env.MY_SECRET || 'your-super-secret-jwt-key-here';
      const token = jwt.sign({ id: data[0].id }, secret, { expiresIn: "7d" });
      const { password, ...others } = data[0];

      res
        .cookie("accessToken", token, {
          httpOnly: true,
          sameSite: isProduction ? "none" : "lax",
          secure: isProduction,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        })
        .status(200)
        .json(others);
    });
  } else {
    res.status(409).json("Email và mật khẩu không được để rỗng!");
  }
};

export const logout = (req, res) => {
  res
    .clearCookie("accessToken", {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    })
    .status(200)
    .json("Đăng xuất thành công");
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!checkEmail(email)) return res.status(403).json("Email không hợp lệ !");

    const promiseDb = db.promise();

    // Kiểm tra email có tồn tại không
    const [existingUser] = await promiseDb.query(
      'SELECT id, name FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại trong hệ thống"
      });
    }

    // Import email service
    const { generateVerificationCode, sendVerificationEmail } = await import('../services/emailService.js');
    const moment = (await import('moment')).default;

    // Tạo mã reset
    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Lưu mã vào database
    console.log('Saving verification code:', { email, resetCode, type: 'reset_password', expiresAt });
    await promiseDb.query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE))',
      [email, resetCode, 'reset_password']
    );
    console.log('✅ Verification code saved');

    // Gửi email
    const emailResult = await sendVerificationEmail(email, resetCode, 'password_reset');
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Không thể gửi email reset mật khẩu",
        error: emailResult.error
      });
    }

    res.status(200).json({
      success: true,
      message: "Mã reset mật khẩu đã được gửi đến email của bạn",
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
      error: error.message
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, mã xác thực và mật khẩu mới là bắt buộc"
      });
    }

    if (!checkPassword(newPassword)) {
      return res.status(403).json(
        "Mật khẩu phải bao gồm ít nhất 6 kí tự, trong đó có chữ cái, số, chữ cái viết hoa và kí tự đặt biệt."
      );
    }

    if (newPassword?.length > 255) return res.status(409).json("Các trường không vượt quá 255 kí tự !");

    const promiseDb = db.promise();

    // Kiểm tra mã xác thực
    console.log('Checking verification code:', { email, code, type: 'reset_password' });
    const [verification] = await promiseDb.query(
      'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND LOWER(type) = ? AND is_used = FALSE AND expires_at > UTC_TIMESTAMP()',
      [email, code, 'reset_password']
    );
    console.log('Verification result:', verification);

    if (verification.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực không hợp lệ hoặc đã hết hạn"
      });
    }

    // Hash mật khẩu mới
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    // Cập nhật mật khẩu
    await promiseDb.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    // Đánh dấu mã đã sử dụng
    await promiseDb.query(
      'UPDATE verification_codes SET is_used = TRUE WHERE id = ?',
      [verification[0].id]
    );

    res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công"
    });

  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
      error: error.message
    });
  }
};

export const changePassword = (req, res) => {
  const { passwordOld, password } = req.body;
  const userId = req.params.id;

  if (!passwordOld || !password) {
    return res.status(400).json("Mật khẩu cũ và mật khẩu mới là bắt buộc!");
  }

  if (!checkPassword(password)) {
    return res.status(403).json(
      "Mật khẩu phải bao gồm ít nhất 6 kí tự, trong đó có chữ cái, số, chữ cái viết hoa và kí tự đặt biệt."
    );
  }

  const q = "SELECT password FROM users WHERE id = ?";
  db.query(q, [userId], (err, data) => {
    if (err) return res.status(500).json({ message: "Lỗi máy chủ", code: err?.code });
    if (data?.length === 0) return res.status(404).json("Người dùng không tồn tại.");

    const checkOldPassword = bcrypt.compareSync(passwordOld, data[0].password);
    if (!checkOldPassword) return res.status(401).json("Mật khẩu cũ không đúng.");

    const salt = bcrypt.genSaltSync(10);
    const hashedNewPassword = bcrypt.hashSync(password, salt);

    const updateQ = "UPDATE users SET password = ? WHERE id = ?";
    db.query(updateQ, [hashedNewPassword, userId], (err, data) => {
      if (err) return res.status(500).json({ message: "Lỗi máy chủ", code: err?.code });
      return res.status(200).json("Đổi mật khẩu thành công!");
    });
  });
};

export const loginWithGoogle = async (req, res) => {
  try {
    const { token } = req.body;
    const googleClientId = process.env.GOOGLE_CLIENT_ID || '731129733070-dqcrn4aba7t7fciqatqufdbtn407p7ff.apps.googleusercontent.com';
    const client = new OAuth2Client(googleClientId);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    const promiseDb = db.promise();

    // Kiểm tra xem user đã tồn tại chưa
    const [existingUser] = await promiseDb.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    let user;
    if (existingUser.length > 0) {
      user = existingUser[0];
    } else {
      // Tạo user mới
      const [result] = await promiseDb.query(
        'INSERT INTO users (name, email, avatarPic) VALUES (?, ?, ?)',
        [name, email, picture]
      );
      user = { id: result.insertId, name, email, avatarPic: picture };
    }

    // Tạo JWT token
    const secret = process.env.MY_SECRET || 'your-super-secret-jwt-key-here';
    
    const jwtToken = jwt.sign({ id: user.id }, secret, { expiresIn: "7d" });

    res
      .cookie("accessToken", jwtToken, {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      })
      .status(200)
      .json({
        success: true,
        message: "Đăng nhập thành công",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarPic: user.avatarPic
        }
      });

  } catch (error) {
    console.error('Error in loginWithGoogle:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi đăng nhập Google",
      error: error.message
    });
  }
};