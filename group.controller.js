const Group = require("../models/group.model");
const Message = require("../models/message.model");
const User = require("../models/user.model");
const { encrypt, decrypt } = require("../utils/encryption");

// ─── Create Group ────────────────────────────────────────────────────────────
exports.createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Always add the creator as a member
    const allMembers = [...new Set([...members, req.user._id.toString()])];

    const group = await Group.create({
      name,
      description,
      admin: req.user._id,
      members: allMembers,
    });

    await group.populate("members", "-password");
    await group.populate("admin", "-password");

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get My Groups ───────────────────────────────────────────────────────────
exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "-password")
      .populate("admin", "-password")
      .populate("lastMessage");

    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Group by ID ─────────────────────────────────────────────────────────
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members", "-password")
      .populate("admin", "-password");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Add Member to Group ─────────────────────────────────────────────────────
exports.addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: "User already in group" });
    }

    group.members.push(userId);
    await group.save();
    await group.populate("members", "-password");

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Remove Member from Group ────────────────────────────────────────────────
exports.removeMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    group.members = group.members.filter((m) => m.toString() !== userId);
    await group.save();

    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Send Group Message ──────────────────────────────────────────────────────
exports.sendGroupMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    let messageData = {
      sender: req.user._id,
      group: groupId,
      messageType: "text",
    };

    if (req.file) {
      const isImage = req.file.mimetype.startsWith("image/");
      messageData.messageType = isImage ? "image" : "file";
      messageData.fileUrl = `/uploads/${req.file.filename}`;
      messageData.fileName = req.file.originalname;
      messageData.content = req.file.originalname;
    } else if (content) {
      const { encryptedContent, iv } = encrypt(content);
      messageData.encryptedContent = encryptedContent;
      messageData.iv = iv;
      messageData.content = content;
    } else {
      return res.status(400).json({ message: "Content is required" });
    }

    const message = await Message.create(messageData);
    await message.populate("sender", "-password");

    // Update group last message
    group.lastMessage = message._id;
    await group.save();

    // Emit to all group members via socket
    const io = req.app.get("io");
    if (io) {
      io.to(`group_${groupId}`).emit("newGroupMessage", {
        ...message.toObject(),
        groupId,
      });
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Group Messages ──────────────────────────────────────────────────────
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const messages = await Message.find({ group: groupId, isDeleted: false })
      .populate("sender", "-password")
      .sort({ createdAt: 1 });

    const decryptedMessages = messages.map((msg) => {
      const m = msg.toObject();
      if (m.messageType === "text" && m.encryptedContent && m.iv) {
        m.content = decrypt(m.encryptedContent, m.iv);
      }
      return m;
    });

    res.json(decryptedMessages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};