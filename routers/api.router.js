const express = require("express");
const router = express.Router();
const {
  apiOnboardAdmin,
  apiRegisterUser,
  apiHandleLogin,
  apiGetSubscribers,
  apiSendBulkNewsletter,
  apiHandleLogout,
} = require("../controllers/api.controller");
const { apiCheckAdmin } = require("../middleware/api.auth.middleware");

// Public endpoints used by the React app
router.post("/register", apiRegisterUser);
router.post("/admin/login", apiHandleLogin);
router.post("/admin/onboard", apiOnboardAdmin);
router.get("/admin/logout", apiHandleLogout);

// Session-protected admin endpoints (React calls these with credentials: 'include')
router.get("/admin/dashboard", apiCheckAdmin, apiGetSubscribers);
router.post("/admin/send", apiCheckAdmin, apiSendBulkNewsletter);

module.exports = router;
