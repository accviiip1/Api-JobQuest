import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  // Lấy token từ cookies hoặc Authorization header
  const token = req.cookies.accessToken || 
                (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
                  ? req.headers.authorization.split(' ')[1] 
                  : null);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Bạn chưa đăng nhập"
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || process.env.MY_SECRET, (err, userInfo) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Token không hợp lệ"
      });
    }

    req.userInfo = userInfo;
    next();
  });
};






