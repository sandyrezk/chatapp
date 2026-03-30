const Message = require("../models/message.model");
const User = require("../models/user.model");
const { encrypt, decrypt } = require("../utils/encryption");

// ─── Send Message (One-to-One) ───────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver is required" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    let messageData = {
      sender: senderId,
      receiver: receiverId,
      messageType: "text",
    };

    // Handle file upload
    if (req.file) {
      const isImage = req.file.mimetype.startsWith("image/");
      messageData.messageType = isImage ? "image" : "file";
      messageData.fileUrl = `/uploads/${req.file.filename}`;
      messageData.fileName = req.file.originalname;
      messageData.content = req.file.originalname;
    } else if (content) {
      // Encrypt text messages
      const { encryptedContent, iv } = encrypt(content);
      messageData.encryptedContent = encryptedContent;
      messageData.iv = iv;
      messageData.content = content; // keep plain for socket emit
    } else {
      return res.status(400).json({ message: "Message content is required" });
    }

    const message = await Message.create(messageData);
    await message.populate("sender", "-password");
    await message.populate("receiver", "-password");

    // Emit via socket (handled in socket.js)
    const io = req.app.get("io");
    if (io) {
      // Find receiver's socket and emit
      const receiverUser = await User.findById(receiverId);
      if (receiverUser?.socketId) {
        io.to(receiverUser.socketId).emit("newMessage", message);
      }
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Messages Between Two Users ─────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ],
      isDeleted: false,
    })
      .populate("sender", "-password")
      .populate("receiver", "-password")
      .sort({ createdAt: 1 });

    // Decrypt text messages
    const decryptedMessages = messages.map((msg) => {
      const m = msg.toObject();
      if (m.messageType === "text" && m.encryptedContent && m.iv) {
        m.content = decrypt(m.encryptedContent, m.iv);
      }
      return m;
    });

    // Mark as read
    await Message.updateMany(
      { sender: userId, receiver: myId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json(decryptedMessages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Delete Message ──────────────────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own messages" });
    }

    message.isDeleted = true;
    await message.save();

    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get All Conversations (list of users I chatted with) ────────────────────
exports.getConversations = async (req, res) => {
  try {
    const myId = req.user._id;

    // Get unique users I have messages with
    const messages = await Message.find({
      $or: [{ sender: myId }, { receiver: myId }],
      group: { $exists: false },
      isDeleted: false,
    }).sort({ createdAt: -1 });

    const userIds = new Set();
    messages.forEach((msg) => {
      const otherId =
        msg.sender.toString() === myId.toString()
          ? msg.receiver?.toString()
          : msg.sender?.toString();
      if (otherId) userIds.add(otherId);
    });

    const conversations = await Promise.all(
      [...userIds].map(async (userId) => {
        const user = await User.findById(userId).select("-password");
        const lastMessage = messages.find(
          (m) =>
            m.sender.toString() === userId ||
            m.receiver?.toString() === userId
        );

        let lastContent = "";
        if (lastMessage?.messageType === "text" && lastMessage.encryptedContent) {
          lastContent = decrypt(lastMessage.encryptedContent, lastMessage.iv);
        } else if (lastMessage?.messageType !== "text") {
          lastContent = lastMessage?.fileName || "📎 File";
        }

        const unreadCount = await Message.countDocuments({
          sender: userId,
          receiver: myId,
          isRead: false,
        });

        return {
          user,
          lastMessage: { ...lastMessage?.toObject(), content: lastContent },
          unreadCount,
        };
      })
    );

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};