import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 4,
      select: false, // Security: hide password by default in queries
    },
    isVerified: {
      type: Boolean,
      default: false, // Email verification status
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export { User };