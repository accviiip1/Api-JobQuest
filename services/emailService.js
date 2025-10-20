import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Cấu hình SMTP transporter (ưu tiên ENV, fallback Gmail)
const createTransporter = async () => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 465); // ưu tiên 465 secure
  const smtpSecure = String(process.env.SMTP_SECURE || 'true') === 'true';
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'SDU-JobQuest.system@gmail.com';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || 'your-app-password';

  // Debug logging
  const debugMode = process.env.SMTP_DEBUG === 'true';
  if (debugMode) {
    console.log('🔧 SMTP DEBUG CONFIG:');
    console.log('Host:', smtpHost);
    console.log('Port:', smtpPort);
    console.log('Secure:', smtpSecure);
    console.log('User:', smtpUser);
    console.log('Pass length:', smtpPass ? smtpPass.length : 0);
    console.log('=====================================');
  }

  const baseOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { rejectUnauthorized: false },
    debug: debugMode,
    logger: debugMode
  };

  // Thử cấu hình chính trước
  let transporter = nodemailer.createTransport(baseOptions);
  try {
    await transporter.verify();
    return transporter;
  } catch (e) {
    // Fallback: thử cổng 587 (STARTTLS)
    const fallbackOptions = {
      ...baseOptions,
    port: 587,
      secure: false
    };
    transporter = nodemailer.createTransport(fallbackOptions);
    await transporter.verify();
    return transporter;
  }
};

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
    
    // Tạm thời chỉ dùng console fallback (không gửi email thật)
    console.log('📧 CONSOLE MODE: Email sending disabled, showing code in console only');
    console.log('Verification Code:', verificationCode);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Email sent successfully (console mode)');
    return { success: true, messageId: 'console-mode-' + Date.now() };
    
    // Code gửi email thật (đã comment)
    /*
    // Thử gửi email thực
    const transporter = await createTransporter();
    
    // Debug: Log transporter info
    if (process.env.SMTP_DEBUG === 'true') {
      console.log('🔧 TRANSPORTER CREATED SUCCESSFULLY');
      console.log('Transporter options:', {
        host: transporter.options.host,
        port: transporter.options.port,
        secure: transporter.options.secure
      });
    }
    
    // Xác định subject và content dựa trên type
    let subject, content;
    if (type === 'password_reset') {
      subject = 'Mã xác thực đặt lại mật khẩu - SDU-JobQuest';
      content = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Đặt lại mật khẩu - SDU-JobQuest</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; position: relative;">
                <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                </div>
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">SDU-JobQuest</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Đặt lại mật khẩu</p>
              </div>
              
              <!-- Nội dung chính -->
              <div style="padding: 30px;">
                <h2 style="color: #2d3748; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Xin chào!</h2>
                <p style="color: #4a5568; margin: 0 0 24px; font-size: 15px; line-height: 1.5;">
                  Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản SDU-JobQuest của mình.
                </p>
                
                <!-- Mã xác thực -->
                <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                  <p style="color: #718096; margin: 0 0 12px; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Mã xác thực</p>
                  <div style="background: #667eea; color: white; padding: 16px 24px; border-radius: 6px; display: inline-block;">
                    <span style="font-size: 28px; font-weight: 700; letter-spacing: 4px; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;">${verificationCode}</span>
                  </div>
                </div>
                
                <!-- Thông tin bổ sung -->
                <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <div style="display: flex; align-items: flex-start;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#e53e3e" style="margin-right: 8px; margin-top: 2px; flex-shrink: 0;">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <div>
                      <p style="color: #c53030; margin: 0 0 8px; font-size: 14px; font-weight: 600;">Thông tin quan trọng</p>
                      <ul style="color: #c53030; margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.4;">
                        <li>Mã này có hiệu lực trong <strong>15 phút</strong></li>
                        <li>Không chia sẻ mã này với bất kỳ ai</li>
                        <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                      </ul>
                    </div>
                  </div>
          </div>
          
                <!-- CTA Button -->
                <div style="text-align: center; margin: 24px 0;">
                  <a href="#" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                    Tiếp tục đặt lại mật khẩu
                  </a>
            </div>
          </div>
          
              <!-- Footer -->
              <div style="background: #f7fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0;">
                <div style="text-align: center; color: #718096; font-size: 12px; line-height: 1.4;">
                  <p style="margin: 0 0 4px;">
                    Email này được gửi tự động từ hệ thống SDU-JobQuest
                  </p>
            <p style="margin: 0;">
                    Vui lòng không trả lời email này. Nếu cần hỗ trợ, vui lòng liên hệ qua trang web.
            </p>
          </div>
        </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = 'Mã xác thực đăng ký - SDU-JobQuest';
      content = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Xác thực tài khoản - SDU-JobQuest</title>
        </head>
        <body style="margin: 0; padding: 0; background: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 30px; text-align: center; position: relative;">
                <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                  </svg>
                </div>
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">SDU-JobQuest</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Chào mừng bạn!</p>
              </div>
              
              <!-- Nội dung chính -->
              <div style="padding: 30px;">
                <h2 style="color: #2d3748; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Cảm ơn bạn đã đăng ký!</h2>
                <p style="color: #4a5568; margin: 0 0 24px; font-size: 15px; line-height: 1.5;">
                  Chào mừng bạn đến với SDU-JobQuest - nền tảng tìm kiếm việc làm hàng đầu Việt Nam!
                </p>
                
                <!-- Mã xác thực -->
                <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                  <p style="color: #718096; margin: 0 0 12px; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Mã xác thực</p>
                  <div style="background: #48bb78; color: white; padding: 16px 24px; border-radius: 6px; display: inline-block;">
                    <span style="font-size: 28px; font-weight: 700; letter-spacing: 4px; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;">${verificationCode}</span>
                  </div>
                </div>
                
                <!-- Thông tin bổ sung -->
                <div style="background: #e6fffa; border: 1px solid #b2f5ea; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <div style="display: flex; align-items: flex-start;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#319795" style="margin-right: 8px; margin-top: 2px; flex-shrink: 0;">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <div>
                      <p style="color: #234e52; margin: 0 0 8px; font-size: 14px; font-weight: 600;">Hướng dẫn tiếp theo</p>
                      <ul style="color: #234e52; margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.4;">
                        <li>Nhập mã xác thực trên để kích hoạt tài khoản</li>
                        <li>Mã này có hiệu lực trong <strong>15 phút</strong></li>
                        <li>Sau khi xác thực, bạn có thể bắt đầu tìm kiếm việc làm</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <!-- Lợi ích -->
                <div style="background: #f0fff4; border: 1px solid #c6f6d5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #22543d; margin: 0 0 16px; font-size: 16px; font-weight: 600; text-align: center;">Tại sao chọn SDU-JobQuest?</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                    <div style="text-align: center;">
                      <div style="width: 40px; height: 40px; background: #48bb78; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                        </svg>
                      </div>
                      <p style="color: #22543d; margin: 0; font-size: 11px; font-weight: 500;">Hàng nghìn việc làm</p>
                    </div>
                    <div style="text-align: center;">
                      <div style="width: 40px; height: 40px; background: #48bb78; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                          <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z"/>
                        </svg>
                      </div>
                      <p style="color: #22543d; margin: 0; font-size: 11px; font-weight: 500;">Bảo mật cao</p>
                    </div>
                    <div style="text-align: center;">
                      <div style="width: 40px; height: 40px; background: #48bb78; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                          <path d="M13 3C9.64 3 8.68 4.43 8.68 6.5C8.68 7.5 9.5 8.5 10.5 8.5C11.5 8.5 12.32 7.5 12.32 6.5C12.32 4.43 11.36 3 13 3M13 1C10.5 1 8.68 2.5 8.68 6.5C8.68 8.5 9.5 10.5 10.5 10.5C11.5 10.5 12.32 8.5 12.32 6.5C12.32 2.5 10.5 1 13 1M7 12C5.67 12 4.5 12.67 3.5 13.5C2.5 14.33 1.67 15.5 1 17C0.33 18.5 0 20 0 21.5C0 22.33 0.67 23 1.5 23C2.33 23 3 22.33 3 21.5C3 20.5 3.17 19.5 3.5 18.5C3.83 17.5 4.33 16.67 5 16C5.67 15.33 6.5 15 7.5 15C8.5 15 9.33 15.33 10 16C10.67 16.67 11.17 17.5 11.5 18.5C11.83 19.5 12 20.5 12 21.5C12 22.33 12.67 23 13.5 23C14.33 23 15 22.33 15 21.5C15 20 14.67 18.5 14 17C13.33 15.5 12.5 14.33 11.5 13.5C10.5 12.67 9.33 12 7 12Z"/>
                        </svg>
                      </div>
                      <p style="color: #22543d; margin: 0; font-size: 11px; font-weight: 500;">Tìm kiếm thông minh</p>
                    </div>
                    <div style="text-align: center;">
                      <div style="width: 40px; height: 40px; background: #48bb78; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22S22 17.52 22 12S17.52 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4S20 7.59 20 12S16.41 20 12 20M12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z"/>
                        </svg>
                      </div>
                      <p style="color: #22543d; margin: 0; font-size: 11px; font-weight: 500;">Cập nhật nhanh</p>
                    </div>
                  </div>
          </div>
          
                <!-- CTA Button -->
                <div style="text-align: center; margin: 24px 0;">
                  <a href="#" style="display: inline-block; background: #48bb78; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                    Xác thực tài khoản ngay
                  </a>
            </div>
          </div>
          
              <!-- Footer -->
              <div style="background: #f7fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0;">
                <div style="text-align: center; color: #718096; font-size: 12px; line-height: 1.4;">
                  <p style="margin: 0 0 4px;">
                    Email này được gửi tự động từ hệ thống SDU-JobQuest
                  </p>
            <p style="margin: 0;">
                    Vui lòng không trả lời email này. Nếu cần hỗ trợ, vui lòng liên hệ qua trang web.
            </p>
          </div>
        </div>
            </div>
          </div>
        </body>
        </html>
      `;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'SDU-JobQuest.system@gmail.com',
      to: email,
      subject: subject,
      html: content
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    */
    
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
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>SDU-JobQuest</title>
            </head>
            <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              <div style="min-height: 100vh; padding: 40px 20px; display: flex; align-items: center; justify-content: center;">
                <div style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
                  
                  <!-- Header với gradient -->
                  <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 40px 30px; text-align: center; position: relative;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"25\" cy=\"25\" r=\"1\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"75\" cy=\"75\" r=\"1\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"50\" cy=\"10\" r=\"0.5\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"10\" cy=\"60\" r=\"0.5\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"90\" cy=\"40\" r=\"0.5\" fill=\"white\" opacity=\"0.1\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>') repeat; opacity: 0.3;"></div>
                    <div style="position: relative; z-index: 1;">
                      <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                        </svg>
                      </div>
                      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">SDU-JobQuest</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px; font-weight: 500;">Thông báo từ hệ thống</p>
                    </div>
              </div>
              
                  <!-- Nội dung chính -->
                  <div style="padding: 40px 30px;">
                    <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); line-height: 1.6; color: #2c3e50; font-size: 16px;">
                ${content.replace(/\n/g, '<br>')}
                    </div>
              </div>
              
                  <!-- Footer -->
                  <div style="background: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e9ecef;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 15px;">
                        <a href="#" style="color: #6c757d; text-decoration: none; font-size: 14px;">Trang chủ</a>
                        <a href="#" style="color: #6c757d; text-decoration: none; font-size: 14px;">Hỗ trợ</a>
                        <a href="#" style="color: #6c757d; text-decoration: none; font-size: 14px;">Liên hệ</a>
                      </div>
                    </div>
                    <div style="text-align: center; color: #6c757d; font-size: 12px; line-height: 1.5;">
                      <p style="margin: 0 0 5px;">
                        Email này được gửi tự động từ hệ thống SDU-JobQuest
                      </p>
                <p style="margin: 0;">
                        Vui lòng không trả lời email này. Nếu cần hỗ trợ, vui lòng liên hệ qua trang web.
                </p>
              </div>
            </div>
                </div>
              </div>
            </body>
            </html>
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








