import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Foreign key referencing User
      ref: "User",
      required: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String, // Browser/Device details
    },
    revoked: {
      type: Boolean,
      default: false, // If true, this session is killed/logged out
    },
  },
  { timestamps: true },
);

const Session = mongoose.model("Session", sessionSchema);

export { Session };
