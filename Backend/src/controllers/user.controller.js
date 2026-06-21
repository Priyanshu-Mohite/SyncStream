import { User } from "../models/user.model.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { OTP } from "../models/otp.model.js"; // Naya model
import { generateOTP, getOtpHtml } from "../utils/otp.util.js"; // OTP utilities
import { sendEmail } from "../services/email.service.js"; // Email service

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid credentials" });
    }

    let token = crypto.randomBytes(16).toString("hex");
    user.token = token;
    await user.save();

    res.status(httpStatus.OK).json({ message: "Login successful", token });
  } catch (error) {
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
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
      "Verify Your Email - Apna Video Call",
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