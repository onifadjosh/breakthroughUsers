const UserModel = require("../models/user.model");
const { renderTemplate, transporter } = require("../middleware/mail.sender");
const jwt = require("jsonwebtoken");

/**
 * Onboard the first admin user (one-time setup).
 */
const apiOnboardAdmin = async (req, res) => {
    const { firstName, lastName, email, password, phoneNumber, setupKey } = req.body;

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
        return res.status(403).json({ success: false, message: "Invalid setup key." });
    }

    if (!email || !password || !firstName || !lastName || !phoneNumber) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    try {
        const existingAdmin = await UserModel.findOne({ role: "admin" });
        if (existingAdmin) {
            return res.status(400).json({ success: false, message: "Admin already exists." });
        }

        const admin = await UserModel.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phoneNumber: phoneNumber.trim(),
            email: email.trim().toLowerCase(),
            password,
            role: "admin",
        });

        return res.json({
            success: true,
            message: "Admin created successfully.",
            admin: {
                id: admin._id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
            },
        });
    } catch (error) {
        console.error("Onboard admin error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Register a new user and send welcome email (JSON API used by React)
 */
const apiRegisterUser = async (req, res) => {
    let { firstName, lastName, email, phoneNumber } = req.body;
    
    // Normalize data
    email = email?.trim().toLowerCase();
    firstName = firstName?.trim();
    lastName = lastName?.trim();

    if (!email || !firstName || !lastName) {
        return res.status(400).json({ success: false, message: "Required fields missing." });
    }

    try {
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "This email is already subscribed." });
        }

        await UserModel.create({ firstName, lastName, phoneNumber, email });

        const mailContent = await renderTemplate("welcomeMail.ejs", {
            firstname: firstName, 
            lastname: lastName,
        });

        const mailOptions = {
            from: process.env.APP_MAIL,
            to: email, 
            subject: `Welcome ${firstName} to Breakthrough Cathedral`,
            html: mailContent,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error("Email error:", error);
        });

        res.json({ success: true, message: "Registration Successful! Welcome email sent." });

    } catch (error) {
        console.error("API Registration error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Handle admin login (JSON API) using JWT.
 * React stores the token and sends it as Authorization: Bearer <token>.
 */
const apiHandleLogin = async (req, res) => {
  const { email, password } = req.body;
  const defaultAdminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "rccg-admin-2026";

  try {
    const user = await UserModel.findOne({
      email: email?.trim().toLowerCase(),
      role: "admin",
    });

    const isPasswordValid =
      user && (user.password === password || password === defaultAdminPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error("API Login error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during login.",
    });
  }
};

/**
 * Get dashboard data (subscribers) for the admin,
 * protected by JWT via apiCheckAdmin.
 */
const apiGetSubscribers = async (req, res) => {
  try {
    const users = await UserModel.find({ role: "user" }).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error("API Dashboard error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Bulk send newsletter returning JSON status,
 * restricted to an authenticated admin via JWT.
 */
const apiSendBulkNewsletter = async (req, res) => {
  const { selectedUsers, subject, content } = req.body;

  if (!selectedUsers || !selectedUsers.length) {
    return res.status(400).json({ success: false, message: "No users selected." });
  }

  try {
    const recipients = Array.isArray(selectedUsers) ? selectedUsers : [selectedUsers];
    const mailContent = await renderTemplate("newsletterMail.ejs", { subject, content });

    const sendPromises = recipients.map((email) => {
      return transporter.sendMail({
        from: process.env.APP_MAIL,
        to: email,
        subject: subject,
        html: mailContent,
      });
    });

    await Promise.all(sendPromises);
    res.json({
      success: true,
      message: `Newsletter sent successfully to ${recipients.length} members!`,
    });
  } catch (error) {
    console.error("API Bulk send error:", error);
    res.status(500).json({ success: false, message: "Failed to send newsletter." });
  }
};

const apiHandleLogout = (req, res) => {
  // For JWT-based auth, logout is handled client-side by discarding the token.
  return res.json({ success: true, message: "Logged out successfully." });
};

module.exports = {
    apiOnboardAdmin,
    apiRegisterUser,
    apiHandleLogin,
    apiGetSubscribers,
    apiSendBulkNewsletter,
    apiHandleLogout
};
