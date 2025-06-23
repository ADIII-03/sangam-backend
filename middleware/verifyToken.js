import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const verifyToken = async (req, res, next) => {
  let token;

  // First, try to get from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If not, try from cookies
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // If token still missing
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized - no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    req.userId = decoded.userId;

    const user = await User.findById(decoded.userId).select("name email profilepic");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};


