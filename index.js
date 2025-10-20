import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
const swaggerFile = JSON.parse(readFileSync("./swagger-output.json", "utf8"));
import "express-async-errors";
import fs from "fs";
import { createServer } from "http";
import { Server } from "socket.io";

import { db } from "./config/connect.js";
import authUserRouter from "./routes/authUser.routes.js";
import authCompanyRouter from "./routes/authCompany.routes.js";
import userRouter from "./routes/user.routes.js";
import companyRouter from "./routes/company.routes.js";
import jobRouter from "./routes/job.routes.js";
import fieldsRouter from "./routes/fields.routes.js";
import provinesRouter from "./routes/provinces.routes.js";
import followRouter from "./routes/follow.routes.js";
import saveRouter from "./routes/save.routes.js";
// import adminIndexRouter from "./routes/index.admin.routes.js";
import applyRouter from "./routes/apply.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import messageRouter from "./routes/message.routes.js";
import lookupDataRouter from "./routes/lookupData.routes.js";
import picturesRouter from "./routes/pictures.routes.js";
import postsRouter from "./routes/posts.routes.js";
import adminRouter from "./routes/admin.routes.js";
import verificationRouter from "./routes/verification.routes.js";
import checkEmail from "./middlewares/checkEmail.middleware.js";
import checkImage from "./middlewares/checkImage.middleware.js";
import checkFile from "./middlewares/chechFile.middleware.js";

dotenv.config(); // ✅ Load biến môi trường ngay đầu

// Silence noisy logs in production
if (process.env.NODE_ENV === 'production') {
  const noop = () => {};
  console.debug = noop;
  console.log = noop;
}

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173", // Vite dev server (client-admin)
  "http://localhost:5174", // optional secondary Vite port
  process.env.URL_REACT,
  process.env.URL_ADMIN, // optional admin URL from env
]

// ✅ Đặt CORS trước tất cả route & middleware khác
app.use(
  cors({
    origin: (origin, callback) => {
      console.log('CORS Origin:', origin);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.log('CORS Error: Origin not allowed:', origin);
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200
  })
)

// Handle preflight requests
app.options('*', cors())
// Static file - Đặt trước CORS để tránh xung đột
app.use("/cv", express.static(path.join(__dirname, "/fileCv")));

// Custom middleware cho /images để debug
app.use("/images", (req, res, next) => {
  // Kiểm tra file trong thư mục images trước
  let filePath = path.join(__dirname, "/images", req.path);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
    return;
  }
  
  // Nếu không có trong images, kiểm tra uploads/posts
  filePath = path.join(__dirname, "uploads/posts", req.path);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

app.options("*", cors()); // Cho phép preflight

// Middleware parse
app.use(cookieParser());
app.use(express.json());

// Debug static file serving
if (process.env.NODE_ENV !== 'production') {
  console.log('Static file serving configured:');
  console.log('Images:', path.join(__dirname, "/images"));
  console.log('CV:', path.join(__dirname, "/fileCv"));
  console.log('Uploads:', path.join(__dirname, "uploads"));
  console.log('Uploads exists:', fs.existsSync(path.join(__dirname, "uploads")));
  console.log('Uploads/posts exists:', fs.existsSync(path.join(__dirname, "uploads/posts")));
}

// Multer upload image
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "images"),
    filename: (req, file, cb) => cb(null, Date.now() + file.originalname),
  }),
});
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!checkImage(req.file)) return res.status(404).json("Ảnh không hợp lệ!");
  res.status(200).json(req.file.filename);
});

// Multer upload file
const uploadFile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, "fileCv");
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true }); // Tạo folder nếu chưa có
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + file.originalname);
    },
  }),
});

app.post("/api/uploadFile", uploadFile.single("file"), (req, res) => {
  if (!checkFile(req.file)) return res.status(404).json("Tệp quá lớn!");
  res.status(200).json(req.file.filename);
});

// Socket.IO setup
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join user to their personal room
  socket.on("join", (userData) => {
    const { userType, userId } = userData;
    const roomName = `${userType}_${userId}`;
    socket.join(roomName);
    console.log(`User ${userType}_${userId} joined room: ${roomName}`);
  });

  // Handle new message
  socket.on("new_message", (messageData) => {
    const { receiverType, receiverId } = messageData;
    const roomName = `${receiverType}_${receiverId}`;
    
    // Emit to receiver's room
    socket.to(roomName).emit("message_received", messageData);
    console.log(`Message sent to room: ${roomName}`);
  });

  // Handle new notification
  socket.on("new_notification", (notificationData) => {
    const { receiverType, receiverId } = notificationData;
    const roomName = `${receiverType}_${receiverId}`;
    
    // Emit to receiver's room
    socket.to(roomName).emit("notification_received", notificationData);
    console.log(`Notification sent to room: ${roomName}`);
  });

  // Handle notification read
  socket.on("notification_read", (data) => {
    const { userType, userId } = data;
    const roomName = `${userType}_${userId}`;
    
    // Emit to user's room
    socket.to(roomName).emit("notification_read", data);
    console.log(`Notification read event sent to room: ${roomName}`);
  });

  // Handle typing
  socket.on("typing", (data) => {
    const { receiverType, receiverId } = data;
    const roomName = `${receiverType}_${receiverId}`;
    socket.to(roomName).emit("user_typing", data);
  });

  // Handle stop typing
  socket.on("stop_typing", (data) => {
    const { receiverType, receiverId } = data;
    const roomName = `${receiverType}_${receiverId}`;
    socket.to(roomName).emit("user_stop_typing", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
// Make io available to routes
app.set("io", io);

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

// Routes
app.use("/api/authUser", authUserRouter);
app.use("/api/authCompany", authCompanyRouter);
app.use("/api/verification", verificationRouter);
app.use("/api/user", userRouter);
app.use("/api/company", companyRouter);
app.use("/api/job", jobRouter);
app.use("/api/fields", fieldsRouter);
app.use("/api/provinces", provinesRouter);
app.use("/api/follow", followRouter);
app.use("/api/save", saveRouter);
// app.use("/api/admin", adminIndexRouter);
app.use("/api/apply", applyRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/message", messageRouter);
app.use("/api/lookup-data", lookupDataRouter);
app.use("/api/pictures", picturesRouter);
app.use("/api/posts", postsRouter);
app.use("/api/admin", adminRouter);


// Test
app.get("/", (req, res) => res.send("Hello this is api SDU-JobQuest"));

// Firebase test route
app.get("/api/test-firebase", async (req, res) => {
  try {
    const { testFirebaseConnection, testServiceAccount } = await import("./test-firebase.js");
    
    console.log("Testing Firebase connection...");
    
    // Test service account
    const serviceAccountOk = testServiceAccount();
    if (!serviceAccountOk) {
      return res.status(500).json({
        success: false,
        message: "Service account configuration error"
      });
    }
    
    // Test Firebase connection
    const firebaseOk = await testFirebaseConnection();
    if (!firebaseOk) {
      return res.status(500).json({
        success: false,
        message: "Firebase connection error"
      });
    }
    
    res.json({
      success: true,
      message: "Firebase connection test passed"
    });
    
  } catch (error) {
    console.error("Firebase test route error:", error);
    res.status(500).json({
      success: false,
      message: "Firebase test failed",
      error: error.message
    });
  }
});

// MySQL test
app.get("/api/mysql", (req, res) => {
  db.connect(err => {
    if (err) return res.status(403).json("Error connecting SQL");
    db.query("SHOW DATABASES;", (err, result) => {
      if (err) throw err;
      res.send(result);
    });
  });
});

db.connect(err => {
  if (err) console.log("Error connecting SQL " + err.stack);
  else console.log("[Connect Mysql success]");
});

// Ping DB
setInterval(() => {
  db.query("SELECT 1", err => {
    if (err) console.error("Error pinging the database:", err.message);
    else console.log("Database pinged successfully");
  });
}, 3600000);

// Start server
const PORT = process.env.PORT || 8800;
server.listen(PORT, () => {
  console.log(`[Server running with port ${PORT}]`);
  console.log(`[WebSocket server ready]`);
});
