import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Cấu hình SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'SDU-JobQuest.system@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    },
    tls: {
      rejectUnauthorized: false
    }
  });
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
    const transporter = createTransporter();
    
    // Xác định subject và content dựa trên type
    let subject, content;
    if (type === 'password_reset') {
      subject = 'Mã xác thực đặt lại mật khẩu - SDU-JobQuest';
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #007bff; margin: 0;">SDU-JobQuest - Đặt lại mật khẩu</h2>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Xin chào,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản SDU-JobQuest của mình.</p>
            <p>Mã xác thực của bạn là:</p>
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h1>
            </div>
            <p>Mã này có hiệu lực trong 15 phút.</p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 8px; font-size: 12px; color: #6c757d;">
            <p style="margin: 0;">
              Email này được gửi tự động từ hệ thống SDU-JobQuest. Vui lòng không trả lời email này.
            </p>
          </div>
        </div>
      `;
    } else {
      subject = 'Mã xác thực đăng ký - SDU-JobQuest';
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #007bff; margin: 0;">SDU-JobQuest - Xác thực tài khoản</h2>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p>Xin chào,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản SDU-JobQuest!</p>
            <p>Mã xác thực của bạn là:</p>
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h1>
            </div>
            <p>Vui lòng nhập mã này để hoàn tất đăng ký tài khoản.</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 8px; font-size: 12px; color: #6c757d;">
            <p style="margin: 0;">
              Email này được gửi tự động từ hệ thống SDU-JobQuest. Vui lòng không trả lời email này.
            </p>
          </div>
        </div>
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
    const transporter = createTransporter();
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








