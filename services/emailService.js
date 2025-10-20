import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Cấu hình SMTP transporter (ưu tiên ENV, fallback Gmail) với pooling + cache để tăng tốc
let cachedTransporter = null;
const createTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 465); // ưu tiên 465 secure
  const smtpSecure = String(process.env.SMTP_SECURE || 'true') === 'true';
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'SDU-JobQuest.system@gmail.com';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || 'your-app-password';

  const baseOptions = {
    pool: true,
    maxConnections: Number(process.env.SMTP_POOL_MAX_CONN || 3),
    maxMessages: Number(process.env.SMTP_POOL_MAX_MSG || 100),
    rateDelta: 1000,
    rateLimit: Number(process.env.SMTP_RATE_LIMIT || 5),
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { rejectUnauthorized: false }
  };

  // Thử cấu hình chính trước
  let transporter = nodemailer.createTransport(baseOptions);
  try {
    await transporter.verify();
    cachedTransporter = transporter;
    return cachedTransporter;
  } catch (e) {
    // Fallback: thử cổng 587 (STARTTLS)
    const fallbackOptions = {
      ...baseOptions,
    port: 587,
      secure: false
    };
    transporter = nodemailer.createTransport(fallbackOptions);
    await transporter.verify();
    cachedTransporter = transporter;
    return cachedTransporter;
  }
};

// Helper: nén HTML tối giản (loại bỏ khoảng trắng dư thừa giữa thẻ)
const minifyHtml = (html) =>
  html
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

// Tạo mã xác thực ngẫu nhiên
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 số
};

// Gửi email xác thực đăng ký
export const sendVerificationEmail = async (email, verificationCode, type = 'register') => {
  try {
    console.log('📧 EMAIL VERIFICATION:');
    console.log('To:', email);
    console.log('Type:', type);
    console.log('Verification Code:', verificationCode);
    console.log('=====================================');
    
    // Thử gửi email thực
    const transporter = await createTransporter();
    
    // Xác định subject và content dựa trên type
    let subject, content;
    if (type === 'password_reset') {
      // Phiên bản "cũ" nhưng tối ưu: giữ style cơ bản, hạn chế shadow/gradient
      subject = 'Mã xác thực đặt lại mật khẩu - SDU-JobQuest';
      content = `
        <div style="font-family: Arial, sans-serif; max-width:600px;margin:0 auto;padding:20px;background:#fff;">
          <div style="padding:16px 0;border-bottom:1px solid #eee;margin-bottom:16px;">
            <h2 style="color:#0d6efd;margin:0;font-size:20px;">SDU-JobQuest - Đặt lại mật khẩu</h2>
          </div>
          <div>
            <p style="margin:0 0 8px 0;color:#2c3e50;">Xin chào,</p>
            <p style="margin:0 0 12px 0;color:#2c3e50;">Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản SDU-JobQuest của mình.</p>
            <p style="margin:0 0 8px 0;color:#2c3e50;">Mã xác thực của bạn là:</p>
            <div style="background:#f1f3f5;padding:12px;border-radius:6px;text-align:center;margin:12px 0;">
              <span style="display:inline-block;color:#0d6efd;font-size:28px;letter-spacing:6px;font-weight:700;">${verificationCode}</span>
            </div>
            <p style="margin:0 0 8px 0;color:#2c3e50;">Mã này có hiệu lực trong 15 phút.</p>
            <p style="margin:0 0 0 0;color:#495057;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          </div>
          <div style="margin-top:16px;padding:12px;background:#f8f9fa;border-radius:6px;color:#6c757d;font-size:12px;">
            Email này được gửi tự động từ hệ thống SDU-JobQuest. Vui lòng không trả lời email này.
          </div>
        </div>
      `;
    } else {
      subject = 'Mã xác thực đăng ký - SDU-JobQuest';
      content = `
        <div style="font-family: Arial, sans-serif; max-width:600px;margin:0 auto;padding:20px;background:#fff;">
          <div style="padding:16px 0;border-bottom:1px solid #eee;margin-bottom:16px;">
            <h2 style="color:#0d6efd;margin:0;font-size:20px;">SDU-JobQuest - Xác thực tài khoản</h2>
          </div>
          <div>
            <p style="margin:0 0 8px 0;color:#2c3e50;">Xin chào,</p>
            <p style="margin:0 0 12px 0;color:#2c3e50;">Cảm ơn bạn đã đăng ký tài khoản SDU-JobQuest!</p>
            <p style="margin:0 0 8px 0;color:#2c3e50;">Mã xác thực của bạn là:</p>
            <div style="background:#f1f3f5;padding:12px;border-radius:6px;text-align:center;margin:12px 0;">
              <span style="display:inline-block;color:#0d6efd;font-size:28px;letter-spacing:6px;font-weight:700;">${verificationCode}</span>
            </div>
            <p style="margin:0 0 0 0;color:#495057;">Vui lòng nhập mã này để hoàn tất đăng ký tài khoản.</p>
          </div>
          <div style="margin-top:16px;padding:12px;background:#f8f9fa;border-radius:6px;color:#6c757d;font-size:12px;">
            Email này được gửi tự động từ hệ thống SDU-JobQuest. Vui lòng không trả lời email này.
          </div>
        </div>
      `;
    }

    // Nén HTML để giảm kích thước và tăng tốc gửi
    content = minifyHtml(content);
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'SDU-JobQuest.system@gmail.com',
      to: email,
      subject: subject,
      html: content
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    console.log('📧 FALLBACK: Showing verification code in console');
    console.log('Verification Code:', verificationCode);
    return { success: false, error: error.message };
  }
};

// Gửi email reset mật khẩu
export const sendPasswordResetEmail = async (email, resetCode) => {
  try {
    // Tạm thời sử dụng console.log thay vì gửi email thực
    console.log('📧 PASSWORD RESET EMAIL:');
    console.log('To:', email);
    console.log('Reset Code:', resetCode);
    console.log('=====================================');
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Password reset email sent successfully (simulated)');
    return { success: true, messageId: 'simulated-reset-' + Date.now() };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Gửi email hàng loạt
export const sendBulkEmail = async (emails, subject, content) => {
  try {
    const transporter = await createTransporter();
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const email of emails) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER || 'SDU-JobQuest.system@gmail.com',
          to: email,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #007bff; margin: 0;">SDU-JobQuest</h2>
              </div>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${content.replace(/\n/g, '<br>')}
              </div>
              
              <div style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 8px; font-size: 12px; color: #6c757d;">
                <p style="margin: 0;">
                  Email này được gửi tự động từ hệ thống SDU-JobQuest. Vui lòng không trả lời email này.
                </p>
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        sentCount++;
        console.log(`Email sent successfully to: ${email}`);
      } catch (error) {
        failedCount++;
        errors.push({ email, error: error.message });
        console.error(`Failed to send email to ${email}:`, error);
      }
    }

    return {
      success: true,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error in sendBulkEmail:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Test kết nối email
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email connection verified successfully');
    return { success: true, message: 'Email connection OK' };
  } catch (error) {
    console.error('Email connection failed:', error);
    return { success: false, error: error.message };
  }
};








