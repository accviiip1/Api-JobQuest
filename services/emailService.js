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

  const baseOptions = {
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
    
    // Thử gửi email thực
    const transporter = await createTransporter();
    
    // Xác định subject và content dựa trên type
    let subject, content;
    if (type === 'password_reset') {
      subject = '🔒 Mã xác thực đặt lại mật khẩu - SDU-JobQuest';
      content = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Đặt lại mật khẩu SDU-JobQuest</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header với gradient -->
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="background-color: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 36px; color: white;">🔐</span>
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                SDU-JobQuest
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                Bảo mật tài khoản của bạn
              </p>
            </div>

            <!-- Nội dung chính -->
            <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin: 0 0 10px; font-size: 24px; font-weight: 600;">
                  Yêu cầu đặt lại mật khẩu 🔒
                </h2>
                <p style="color: #7f8c8d; margin: 0; font-size: 16px; line-height: 1.5;">
                  Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản SDU-JobQuest của bạn.
                </p>
              </div>

              <!-- Mã xác thực -->
              <div style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; box-shadow: 0 8px 25px rgba(255, 154, 158, 0.3);">
                <p style="color: #2c3e50; margin: 0 0 15px; font-size: 16px; font-weight: 500;">
                  Mã xác thực đặt lại mật khẩu
                </p>
                <div style="background-color: rgba(255, 255, 255, 0.8); padding: 20px; border-radius: 8px; border: 2px dashed #ff6b6b;">
                  <h1 style="color: #e74c3c; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${verificationCode}
                  </h1>
                </div>
                <p style="color: #2c3e50; margin: 15px 0 0; font-size: 14px; font-weight: 500;">
                  ⏰ Mã có hiệu lực trong 15 phút
                </p>
              </div>

              <!-- Hướng dẫn -->
              <div style="background-color: #fff3cd; padding: 25px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 30px 0;">
                <h3 style="color: #856404; margin: 0 0 15px; font-size: 18px; font-weight: 600;">
                  ⚠️ Hướng dẫn đặt lại mật khẩu:
                </h3>
                <ol style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li style="margin-bottom: 8px;">Sao chép mã xác thực ở trên</li>
                  <li style="margin-bottom: 8px;">Quay lại trang đặt lại mật khẩu</li>
                  <li style="margin-bottom: 8px;">Nhập mã xác thực và mật khẩu mới</li>
                  <li style="margin-bottom: 0;">Nhấn "Đặt lại mật khẩu" để hoàn tất</li>
                </ol>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4); transition: all 0.3s ease;">
                  🔒 Đặt lại mật khẩu ngay
                </a>
          </div>
          
              <!-- Cảnh báo bảo mật -->
              <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #f5c6cb;">
                <h4 style="color: #721c24; margin: 0 0 10px; font-size: 16px; font-weight: 600;">
                  🚨 Cảnh báo bảo mật:
                </h4>
                <ul style="color: #721c24; margin: 0; padding-left: 20px; line-height: 1.5; font-size: 14px;">
                  <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                  <li>Không chia sẻ mã xác thực với bất kỳ ai</li>
                  <li>Mã chỉ có hiệu lực trong 15 phút</li>
                  <li>Nếu nghi ngờ tài khoản bị xâm nhập, hãy liên hệ hỗ trợ ngay</li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #2c3e50; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <div style="margin-bottom: 20px;">
                <h3 style="color: white; margin: 0 0 10px; font-size: 20px; font-weight: 600;">
                  SDU-JobQuest
                </h3>
                <p style="color: #bdc3c7; margin: 0; font-size: 14px;">
                  Bảo vệ tài khoản của bạn là ưu tiên hàng đầu
                </p>
          </div>
          
              <div style="border-top: 1px solid #34495e; padding-top: 20px;">
                <p style="color: #95a5a6; margin: 0 0 10px; font-size: 12px;">
                  📧 Email này được gửi tự động từ hệ thống SDU-JobQuest
                </p>
                <p style="color: #95a5a6; margin: 0; font-size: 12px;">
                  Vui lòng không trả lời email này. Nếu có thắc mắc, liên hệ qua website.
            </p>
          </div>
        </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = '🔐 Mã xác thực đăng ký - SDU-JobQuest';
      content = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Xác thực tài khoản SDU-JobQuest</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header với gradient -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="background-color: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 36px; color: white;">🎯</span>
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                SDU-JobQuest
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                Nền tảng tìm kiếm việc làm hàng đầu
              </p>
            </div>

            <!-- Nội dung chính -->
            <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin: 0 0 10px; font-size: 24px; font-weight: 600;">
                  Chào mừng bạn đến với SDU-JobQuest! 🎉
                </h2>
                <p style="color: #7f8c8d; margin: 0; font-size: 16px; line-height: 1.5;">
                  Cảm ơn bạn đã đăng ký tài khoản. Để hoàn tất quá trình đăng ký, vui lòng xác thực email của bạn.
                </p>
              </div>

              <!-- Mã xác thực -->
              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; box-shadow: 0 8px 25px rgba(240, 147, 251, 0.3);">
                <p style="color: white; margin: 0 0 15px; font-size: 16px; font-weight: 500;">
                  Mã xác thực của bạn
                </p>
                <div style="background-color: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; border: 2px dashed rgba(255, 255, 255, 0.5);">
                  <h1 style="color: white; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    ${verificationCode}
                  </h1>
                </div>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 15px 0 0; font-size: 14px;">
                  ⏰ Mã có hiệu lực trong 15 phút
                </p>
              </div>

              <!-- Hướng dẫn -->
              <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea; margin: 30px 0;">
                <h3 style="color: #2c3e50; margin: 0 0 15px; font-size: 18px; font-weight: 600;">
                  📋 Hướng dẫn sử dụng:
                </h3>
                <ol style="color: #5a6c7d; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li style="margin-bottom: 8px;">Sao chép mã xác thực ở trên</li>
                  <li style="margin-bottom: 8px;">Quay lại trang đăng ký</li>
                  <li style="margin-bottom: 8px;">Dán mã vào ô "Mã xác thực"</li>
                  <li style="margin-bottom: 0;">Nhấn "Xác thực" để hoàn tất</li>
                </ol>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                  🚀 Hoàn tất đăng ký ngay
                </a>
          </div>
          
              <!-- Thông tin bổ sung -->
              <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #bee5eb;">
                <h4 style="color: #0c5460; margin: 0 0 10px; font-size: 16px; font-weight: 600;">
                  💡 Lưu ý quan trọng:
                </h4>
                <ul style="color: #0c5460; margin: 0; padding-left: 20px; line-height: 1.5; font-size: 14px;">
                  <li>Không chia sẻ mã xác thực với bất kỳ ai</li>
                  <li>Mã chỉ có hiệu lực trong 15 phút</li>
                  <li>Nếu không nhận được email, vui lòng kiểm tra thư mục spam</li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #2c3e50; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <div style="margin-bottom: 20px;">
                <h3 style="color: white; margin: 0 0 10px; font-size: 20px; font-weight: 600;">
                  SDU-JobQuest
                </h3>
                <p style="color: #bdc3c7; margin: 0; font-size: 14px;">
                  Nền tảng tìm kiếm việc làm uy tín và hiệu quả
                </p>
          </div>
          
              <div style="border-top: 1px solid #34495e; padding-top: 20px;">
                <p style="color: #95a5a6; margin: 0 0 10px; font-size: 12px;">
                  📧 Email này được gửi tự động từ hệ thống SDU-JobQuest
                </p>
                <p style="color: #95a5a6; margin: 0; font-size: 12px;">
                  Vui lòng không trả lời email này. Nếu có thắc mắc, liên hệ qua website.
            </p>
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
            <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <div style="background-color: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 28px; color: white;">📢</span>
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                    SDU-JobQuest
                  </h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 14px;">
                    Thông báo quan trọng
                  </p>
              </div>
              
                <!-- Nội dung -->
                <div style="padding: 30px;">
                  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); line-height: 1.6; color: #2c3e50;">
                ${content.replace(/\n/g, '<br>')}
                  </div>
              </div>
              
                <!-- Footer -->
                <div style="background-color: #2c3e50; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                  <p style="color: #95a5a6; margin: 0; font-size: 12px;">
                    📧 Email này được gửi tự động từ hệ thống SDU-JobQuest. Vui lòng không trả lời email này.
                </p>
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








