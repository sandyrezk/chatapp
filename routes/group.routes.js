const router = require("express").Router();
const {
  createGroup,
  getMyGroups,
  getGroup,
  addMember,
  removeMember,
  sendGroupMessage,
  getGroupMessages,
} = require("../controllers/group.controller");
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

router.use(protect);

router.post("/", createGroup);
router.get("/", getMyGroups);
router.get("/:groupId", getGroup);
router.post("/:groupId/members", addMember);
router.delete("/:groupId/members/:userId", removeMember);
router.post("/:groupId/messages", upload.single("file"), sendGroupMessage);
router.get("/:groupId/messages", getGroupMessages);

module.exports = router;