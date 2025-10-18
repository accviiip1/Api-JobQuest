import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../config/connect.js";
import checkEmail from "../middlewares/checkEmail.middleware.js";
import checkPassword from "../middlewares/checkPassword.middleware.js";
import "express-async-errors";
import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Đăng ký
export const register = async (req, res) => {
  try {
    const { nameAdmin, nameCompany, email, password, phone, idProvince, scale, verificationCode } = req.body;

    if (!email) return res.status(409).json("Email không được để rỗng !");
    if (!nameCompany) return res.status(409).json("Tên công ty không được để rỗng !");
    if (!nameAdmin) return res.status(409).json("Tên người đại diện không được để rỗng !");
    if (!checkEmail(email)) return res.status(409).json("Email không hợp lệ.");
    if (!phone || isNaN(phone) || phone?.length > 45) return res.status(409).json("Số điện thoại không hợp lệ !");
    if (!verificationCode) return res.status(409).json("Mã xác thực là bắt buộc !");
    
    if (nameCompany?.length > 255 || nameAdmin?.length > 255 || email?.length > 255 || password?.length > 255)
      return res.status(409).json("Các trường không vượt quá 255 kí tự !");

    // Validation mật khẩu đã được thực hiện ở client side
    // if (!checkPassword(password)) return res.status(403).json("Mật khẩu phải bao gồm ít nhất 6 kí tự, trong đó có chữ cái, số, chữ cái viết hoa và kí tự đặt biệt.");

    const promiseDb = db.promise();

    // Kiểm tra email đã tồn tại chưa
    const [existingCompany] = await promiseDb.query(
      'SELECT * FROM companies WHERE email = ?',
      [email]
    );

    if (existingCompany.length > 0) {
      return res.status(409).json("Email đã tồn tại !");
    }

    // Kiểm tra mã xác thực
    const [verification] = await promiseDb.query(
      'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND is_used = FALSE AND expires_at > NOW()',
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

    // Tạo tài khoản công ty
    await promiseDb.query(
      'INSERT INTO companies (`nameAdmin`, `nameCompany`, `email`, `password`, `phone`, `idProvince`, `scale`) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nameAdmin, nameCompany, email, hashedPassword, phone, idProvince, scale]
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
    console.error('Error in company register:', error);
    return res.status(500).json({ 
      success: false,
      message: "Lỗi máy chủ", 
      error: error.message 
    });
  }
};

// Đăng nhập
export const login = (req, res) => {
  const { email, password } = req.body;
  const q = "SELECT * FROM companies WHERE email=?";

  if (email && password) {
    if (!checkEmail(email)) return res.status(409).json("Email không hợp lệ.");

    db.query(q, email, (err, data) => {
      if (err) return res.status(500).json({ message: "Lỗi máy chủ", code: err?.code });
      if (data?.length === 0) return res.status(404).json("Email không tồn tại.");

      const checkPassword = bcrypt.compareSync(req.body.password, data[0].password);
      if (!checkPassword) return res.status(401).json("Sai mật khẩu");

      const secret = process.env.MY_SECRET;
      if (!secret) return res.status(500).json("Lỗi cấu hình máy chủ: thiếu MY_SECRET");
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
    const [existingCompany] = await promiseDb.query(
      'SELECT id, nameCompany FROM companies WHERE email = ?',
      [email]
    );

    if (existingCompany.length === 0) {
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
    const expiresAt = moment().add(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');

    // Lưu mã vào database
    await promiseDb.query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, resetCode, 'reset_password', expiresAt]
    );

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
    console.error('Error in company forgotPassword:', error);
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
      'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND LOWER(type) = ? AND is_used = FALSE AND expires_at > NOW()',
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
      'UPDATE companies SET password = ? WHERE email = ?',
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
    console.error('Error in company resetPassword:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
      error: error.message
    });
  }
};

export const changePassword = (req, res) => {
  const { passwordOld, password } = req.body;
  const companyId = req.params.id;

  if (!passwordOld || !password) {
    return res.status(400).json("Mật khẩu cũ và mật khẩu mới là bắt buộc!");
  }

  if (!checkPassword(password)) {
    return res.status(403).json(
      "Mật khẩu phải bao gồm ít nhất 6 kí tự, trong đó có chữ cái, số, chữ cái viết hoa và kí tự đặt biệt."
    );
  }

  const q = "SELECT password FROM companies WHERE id = ?";
  db.query(q, [companyId], (err, data) => {
    if (err) return res.status(500).json({ message: "Lỗi máy chủ", code: err?.code });
    if (data?.length === 0) return res.status(404).json("Công ty không tồn tại.");

    const checkOldPassword = bcrypt.compareSync(passwordOld, data[0].password);
    if (!checkOldPassword) return res.status(401).json("Mật khẩu cũ không đúng.");

    const salt = bcrypt.genSaltSync(10);
    const hashedNewPassword = bcrypt.hashSync(password, salt);

    const updateQ = "UPDATE companies SET password = ? WHERE id = ?";
    db.query(updateQ, [hashedNewPassword, companyId], (err, data) => {
      if (err) return res.status(500).json({ message: "Lỗi máy chủ", code: err?.code });
      return res.status(200).json("Đổi mật khẩu thành công!");
    });
  });
};