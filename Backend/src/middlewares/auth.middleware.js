import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import config from "../config/config.js";

export const authenticateUser = (req, res, next) => {
  try {
    // 1. Client se incoming token nikalna (Headers se)
    const authHeader = req.headers.authorization;

    // 2. Check karna ki header exist karta hai aur "Bearer " se shuru hota hai
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Access Denied. No token provided or invalid format.",
      });
    }

    // 3. "Bearer <token>" string me se sirf actual <token> extract karna
    const token = authHeader.split(" ")[1];

    // 4. Token ko cryptographically verify karna apni Secret Key se
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // 5. Agar token valid hai, toh decoded payload (jisme user ki ID hai) ko req object me daal do
    req.user = decoded;

    // 6. Request ko aage next() function/controller ke paas bhej do
    next();
  } catch (error) {
    // Agar token expire ho gaya hai ya galat hai, toh jwt.verify() error throw karta hai
    return res.status(httpStatus.UNAUTHORIZED).json({
      message: "Invalid or expired token.",
    });
  }
};
