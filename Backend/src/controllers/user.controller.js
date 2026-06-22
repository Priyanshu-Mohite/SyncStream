import { User } from "../models/user.model.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { OTP } from "../models/otp.model.js"; // Naya model
import { generateOTP, getOtpHtml } from "../utils/otp.util.js"; // OTP utilities
import { sendEmail } from "../services/email.service.js"; // Email service
import jwt from "jsonwebtoken";
import { Session } from "../models/session.model.js";
import config from "../config/config.js"; // JWT secret ke liye

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Email and password are required" });
    }
    
    // 1. Find user and check password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid credentials" });
    }

    // 2. Check if Email is Verified (SABSE IMPORTANT)
    if (!user.isVerified) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Email not verified. Please verify your email first." });
    }

    // 3. Generate JWT Tokens
    const accessToken = jwt.sign(
      { userId: user._id }, 
      config.JWT_SECRET, 
      { expiresIn: "15m" } // Access token 15 minute me marr jayega
    );

    const refreshToken = jwt.sign(
      { userId: user._id }, 
      config.JWT_SECRET, 
      { expiresIn: "7d" } // Refresh token 7 din chalega
    );

    // 4. Hash the Refresh Token before saving to DB
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // 5. Create a Session in Database
    const session = new Session({
      userId: user._id,
      refreshTokenHash,
      ip: req.ip, // User ka IP address (optional but good for security)
      userAgent: req.headers["user-agent"], // User ka browser/device
    });
    await session.save();

    // 6. Set Refresh Token in HTTP-Only Cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Frontend JS (XSS) is cookie ko read nahi kar payegi
      secure: process.env.NODE_ENV === "production", // Production (HTTPS) me hi cookie bhejo
      sameSite: "strict", // CSRF attacks se bachne ke liye
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // 7. Send Access Token and User Info to Frontend
    res.status(httpStatus.OK).json({ 
      message: "Login successful", 
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Login Error: ", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res
          .status(httpStatus.FOUND)
          .json({
            message: "User already exists and is verified. Please login.",
          });
      }
      // Agar user exist karta hai par verified nahi hai, toh hum purana record update kar denge
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create or Update User in Database
    if (existingUser && !existingUser.isVerified) {
      existingUser.password = hashedPassword;
      existingUser.name = name;
      await existingUser.save();
    } else {
      const newUser = new User({ name, email, password: hashedPassword });
      await newUser.save();
    }

    // 4. Generate Plain Text OTP
    const plainOtp = generateOTP();

    // 5. Cryptographically Hash OTP before saving to DB
    // We hash the OTP so that even in case of a database breach, the plain OTP is not exposed.
    const otpHash = crypto.createHash("sha256").update(plainOtp).digest("hex");

    // 6. Clear existing OTPs for this email to prevent conflicts, then save new one
    await OTP.deleteMany({ email });
    const newOtp = new OTP({ email, otpHash });
    await newOtp.save();

    // 7. Send the Email
    const html = getOtpHtml(plainOtp);
    await sendEmail(
      email,
      "Verify Your Email - SyncStream",
      "Your OTP Code",
      html,
    );

    // 8. Send Response to Client
    res
      .status(httpStatus.CREATED)
      .json({
        message: "Registration initiated. Please check your email for the OTP.",
      });
  } catch (error) {
    console.error("Registration Error: ", error);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Email and OTP are required" });
    }

    // 1. Incoming plain OTP ko same algorithm se hash karo
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // 2. Database me check karo ki is email ka ye exact OTP Hash exist karta hai ya nahi
    const validOtp = await OTP.findOne({ email, otpHash });

    if (!validOtp) {
      // Agar 5 minute ho gaye honge toh TTL index isko DB se uda chuka hoga
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid or expired OTP" });
    }

    // 3. Agar OTP valid hai, toh User document ko update karo
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
    }

    user.isVerified = true;
    await user.save();

    // 4. Verification successful hone ke baad OTP ko DB se hamesha ke liye delete kardo
    await OTP.deleteMany({ email });

    res.status(httpStatus.OK).json({ message: "Email verified successfully. You can now login." });

  } catch (error) {
    console.error("Verification Error: ", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    // 1. Incoming Cookie se Refresh Token nikalna
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "No refresh token found in cookies" });
    }

    // 2. Incoming token ko hash karo taaki Database wale hash se match kar sakein
    const refreshTokenHash = crypto.createHash("sha256").update(incomingRefreshToken).digest("hex");

    // 3. Database me Session dhoondho jo revoked (dead) na ho
    const session = await Session.findOne({ refreshTokenHash, revoked: false });
    if (!session) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or revoked refresh token session" });
    }

    // 4. Token ko cryptographically verify karo
    let decoded;
    try {
      decoded = jwt.verify(incomingRefreshToken, config.JWT_SECRET);
    } catch (err) {
      // Agar token sach me expire ho chuka hai, toh DB me session ko dead (revoked) kar do
      session.revoked = true;
      await session.save();
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Refresh token has expired" });
    }

    // 5. Generate NEW Access Token (15 mins)
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      config.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // 6. Generate NEW Refresh Token (7 days) - TOKEN ROTATION for extra security
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId },
      config.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    // 7. Update the session in DB with the new Hash
    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();

    // 8. Set the new Refresh Token in the HTTP-Only cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 9. Send the new Access Token to the client
    res.status(httpStatus.OK).json({
      message: "Tokens refreshed successfully",
      accessToken: newAccessToken
    });

  } catch (error) {
    console.error("Refresh Token Error: ", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    // 1. Incoming Cookie se Refresh Token nikalna
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      // Agar cookie pehle se nahi hai, toh matlab already logged out hai
      return res.status(httpStatus.OK).json({ message: "Already logged out" });
    }

    // 2. Token ka hash banao taaki DB me search kar sakein
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // 3. Database me us session ko find karo aur 'revoked' ko true set kar do
    await Session.findOneAndUpdate(
      { refreshTokenHash, revoked: false },
      { revoked: true }
    );

    // 4. Browser se HTTP-Only Cookie ko clear kar do
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // 5. Send Success Response
    res.status(httpStatus.OK).json({ message: "Logged out successfully" });

  } catch (error) {
    console.error("Logout Error: ", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const logoutAllDevices = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "No refresh token found" });
    }

    // 1. Token ko verify karke User ID nikalna
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    } catch (err) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired token" });
    }

    const userId = decoded.userId;

    // 2. Us User ke saare active sessions ko ek saath revoke kar do
    await Session.updateMany(
      { userId, revoked: false }, // Condition: Is user ke saare zinda sessions
      { revoked: true }           // Action: Sabko dead mark kar do
    );

    // 3. Current device ki cookie bhi uda do
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(httpStatus.OK).json({ message: "Logged out from all devices successfully" });

  } catch (error) {
    console.error("Logout All Error: ", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};