import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
  {
    // Unique code jo users ek dusre ko bhejenge join karne ke liye (e.g., "abc-defg-hij")
    meetingCode: {
      type: String,
      required: true,
      unique: true,
      index: true, // Index true rakha hai taaki joining ke time DB search fast ho
    },
    // Jis user ne meeting create ki hai (Host)
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Jo log meeting me hain ya join kar chuke hain
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Meeting abhi chal rahi hai ya khatam ho gayi
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Meeting = mongoose.model("Meeting", meetingSchema);
