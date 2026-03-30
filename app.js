const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const initSocket = require("./socket/socket");

dotenv.config();

const app = express();
const server = http.createServer(app); // ← needed for Socket.io

// ─── Socket.io Setup ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: "*", // change to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

// Make io accessible in controllers via req.app.get("io")
app.set("io", io);
initSocket(io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/messages", require("./routes/message.routes"));
app.use("/api/groups", require("./routes/group.routes"));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ message: "Chat API is running 🚀" }));

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

// ─── DB + Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });