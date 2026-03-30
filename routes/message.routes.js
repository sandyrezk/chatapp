const router = require("express").Router();
const {
  sendMessage,
  getMessages,
  deleteMessage,
  getConversations,
} = require("../controllers/message.controller");
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// All routes are protected
router.use(protect);

router.get("/conversations", getConversations);
router.get("/:userId", getMessages);
router.post("/send", upload.single("file"), sendMessage);
router.delete("/:messageId", deleteMessage);

module.exports = router;