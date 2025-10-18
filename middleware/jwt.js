import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Bạn chưa đăng nhập"
    });
  }

  jwt.verify(token, process.env.MY_SECRET, (err, userInfo) => {
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






