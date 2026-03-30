const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Message = require("../models/message.model");
const { encrypt, decrypt } = require("../utils/encryption");

const initSocket = (io) => {
  // ─── Auth Middleware for Socket ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id;
    console.log(`✅ User connected: ${socket.user.name} [${socket.id}]`);

    // ─── Update Online Status ─────────────────────────────────────────────────
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date(),
    });

    // Broadcast online status to all users
    socket.broadcast.emit("userOnline", { userId, isOnline: true });

    // ─── Join Group Rooms ─────────────────────────────────────────────────────
    socket.on("joinGroups", (groupIds) => {
      groupIds.forEach((groupId) => {
        socket.join(`group_${groupId}`);
        console.log(`📢 ${socket.user.name} joined group room: ${groupId}`);
      });
    });

    // ─── Real-time One-to-One Message ─────────────────────────────────────────
    socket.on("sendMessage", async (data) => {
      try {
        const { receiverId, content } = data;

        const { encryptedContent, iv } = encrypt(content);

        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          encryptedContent,
          iv,
          content,
          messageType: "text",
        });

        await message.populate("sender", "-password");
        await message.populate("receiver", "-password");

        const messageObj = message.toObject();
        messageObj.content = content; // send decrypted to frontend

        // Send to receiver
        const receiverUser = await User.findById(receiverId);
        if (receiverUser?.socketId) {
          io.to(receiverUser.socketId).emit("newMessage", messageObj);
        }

        // Send back to sender to confirm
        socket.emit("messageSent", messageObj);
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ─── Real-time Group Message ──────────────────────────────────────────────
    socket.on("sendGroupMessage", async (data) => {
      try {
        const { groupId, content } = data;

        const { encryptedContent, iv } = encrypt(content);

        const message = await Message.create({
          sender: userId,
          group: groupId,
          encryptedContent,
          iv,
          content,
          messageType: "text",
        });

        await message.populate("sender", "-password");

        const messageObj = { ...message.toObject(), content, groupId };

        // Send to all members in the group room
        io.to(`group_${groupId}`).emit("newGroupMessage", messageObj);
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ─── Typing Indicators ────────────────────────────────────────────────────
    socket.on("typing", async ({ receiverId, groupId }) => {
      if (receiverId) {
        const receiver = await User.findById(receiverId);
        if (receiver?.socketId) {
          io.to(receiver.socketId).emit("typing", {
            userId,
            name: socket.user.name,
          });
        }
      }
      if (groupId) {
        socket.to(`group_${groupId}`).emit("typing", {
          userId,
          name: socket.user.name,
          groupId,
        });
      }
    });

    socket.on("stopTyping", async ({ receiverId, groupId }) => {
      if (receiverId) {
        const receiver = await User.findById(receiverId);
        if (receiver?.socketId) {
          io.to(receiver.socketId).emit("stopTyping", { userId });
        }
      }
      if (groupId) {
        socket.to(`group_${groupId}`).emit("stopTyping", { userId, groupId });
      }
    });

    // ─── Mark Messages as Read ────────────────────────────────────────────────
    socket.on("markRead", async ({ senderId }) => {
      await Message.updateMany(
        { sender: senderId, receiver: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      const senderUser = await User.findById(senderId);
      if (senderUser?.socketId) {
        io.to(senderUser.socketId).emit("messagesRead", { by: userId });
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`❌ User disconnected: ${socket.user.name}`);
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        socketId: "",
        lastSeen: new Date(),
      });
      socket.broadcast.emit("userOffline", {
        userId,
        lastSeen: new Date(),
      });
    });
  });
};

module.exports = initSocket;