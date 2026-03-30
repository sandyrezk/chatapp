const router = require("express").Router();
const {
  register,
  login,
  getMe,
  updateAvatar,
  getAllUsers,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/users", protect, getAllUsers);
router.put("/avatar", protect, upload.single("avatar"), updateAvatar);

module.exports = router;