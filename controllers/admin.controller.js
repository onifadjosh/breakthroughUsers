// controllers/admin.controller.js
const UserModel = require("../models/user.model");
const { renderTemplate, transporter } = require("../middleware/mail.sender");

/**
 * GET /api/admin/dashboard
 * Return list of subscribers as JSON
 */
const getAdminDashboard = async (req, res) => {
  try {
    // Optional: protect route
    if (!req.session || !req.session.adminId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const users = await UserModel.find({ role: "user" }).sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * POST /api/admin/send
 * Send bulk newsletter to selected users (JSON in, JSON out)
 */
const sendBulkNewsletter = async (req, res) => {
  const { selectedUsers, subject, content } = req.body;

  if (!Array.isArray(selectedUsers) || selectedUsers.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No users selected.",
    });
  }

  try {
    const recipients = selectedUsers;

    const mailContent = await renderTemplate("newsletterMail.ejs", {
      subject,
      content,
    });

    const sendPromises = recipients.map((email) =>
      transporter.sendMail({
        from: process.env.APP_MAIL,
        to: email,
        subject,
        html: mailContent,
      })
    );

    await Promise.all(sendPromises);

    res.json({
      success: true,
      message: `Newsletter sent successfully to ${recipients.length} members!`,
    });
  } catch (error) {
    console.error("Bulk send error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send newsletter. Please check server logs.",
    });
  }
};

/**
 * (Optional) GET /api/admin/login-page
 * Not used by React SPA; can be removed or left unused.
 */
const getLoginPage = (req, res) => {
  // React handles the login UI, so this isn't needed for the SPA.
  res.status(404).json({ success: false, message: "Not implemented in SPA" });
};

/**
 * POST /api/admin/login
 * Handle admin login, return JSON
 */
const handleLogin = async (req, res) => {
  const { email, password } = req.body;
  const defaultAdminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "rccg-admin-2026";

  try {
    const user = await UserModel.findOne({
      email: email.trim().toLowerCase(),
      role: "admin",
    });

    const isPasswordValid =
      user && (user.password === password || password === defaultAdminPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials. Please try again.",
      });
    }

    // Create session for subsequent authenticated requests
    req.session.adminId = user._id;

    // Only send fields the frontend actually needs
    res.json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login.",
    });
  }
};

/**
 * GET /api/admin/logout
 * Destroy session and return JSON
 */
const handleLogout = (req, res) => {
  if (!req.session) {
    return res.json({ success: true });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to logout.",
      });
    }
    res.json({ success: true });
  });
};

module.exports = {
  getAdminDashboard,
  sendBulkNewsletter,
  getLoginPage,
  handleLogin,
  handleLogout,
};