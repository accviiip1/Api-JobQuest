import { db } from "../config/connect.js";
import checkEmail from "../middlewares/checkEmail.middleware.js";
import { generateVerificationCode, sendVerificationEmail } from "../services/emailService.js";
import moment from "moment";

// Gửi mã xác thực đăng ký
export const sendRegisterCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email là bắt buộc"
      });
    }

    if (!checkEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ"
      });
    }

    const promiseDb = db.promise();

    // Kiểm tra email đã tồn tại chưa
    const [existingUser] = await promiseDb.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email đã tồn tại trong hệ thống"
      });
    }

    // Tạo mã xác thực
    const verificationCode = generateVerificationCode();
    const expiresAt = moment().add(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');

    // Lưu mã vào database
    console.log('Saving verification code:', { email, verificationCode, type: 'register', expiresAt });
    await promiseDb.query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, verificationCode, 'register', expiresAt]
    );
    console.log('✅ Verification code saved');

    // Gửi email
    const emailResult = await sendVerificationEmail(email, verificationCode, 'register');
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Không thể gửi email xác thực",
        error: emailResult.error
      });
    }

    res.status(200).json({
      success: true,
      message: "Mã xác thực đã được gửi đến email của bạn",
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error('Error in sendRegisterCode:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
      error: error.message
    });
  }
};

// Gửi mã xác thực đăng ký công ty
export const sendCompanyRegisterCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email là bắt buộc"
      });
    }

    if (!checkEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ"
      });
    }

    const promiseDb = db.promise();

    // Kiểm tra email đã tồn tại chưa
    const [existingCompany] = await promiseDb.query(
      'SELECT * FROM companies WHERE email = ?',
      [email]
    );

    if (existingCompany.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email đã tồn tại trong hệ thống"
      });
    }

    // Tạo mã xác thực
    const verificationCode = generateVerificationCode();
    const expiresAt = moment().add(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');

    // Lưu mã vào database
    console.log('Saving verification code:', { email, verificationCode, type: 'register', expiresAt });
    await promiseDb.query(
      'INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, verificationCode, 'register', expiresAt]
    );
    console.log('✅ Verification code saved');

    // Gửi email
    const emailResult = await sendVerificationEmail(email, verificationCode, 'register');
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Không thể gửi email xác thực",
        error: emailResult.error
      });
    }

    res.status(200).json({
      success: true,
      message: "Mã xác thực đã được gửi đến email của bạn",
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error('Error in sendCompanyRegisterCode:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống",
      error: error.message
    });
  }
};



