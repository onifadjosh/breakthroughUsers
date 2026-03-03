const jwt = require("jsonwebtoken");

/**
 * Middleware to check if a user has admin privileges (API version) using JWT.
 * Expects Authorization: Bearer <token> header from the React app.
 */
const apiCheckAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin role required." });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

module.exports = {
  apiCheckAdmin,
};
