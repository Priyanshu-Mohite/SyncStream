import { Meeting } from "../models/meeting.model.js";
import httpStatus from "http-status";
import { v4 as uuidv4 } from "uuid"; 

export const createMeeting = async (req, res) => {
  try {
    const hostId = req.user.userId;

    const meetingCode = uuidv4().substring(0, 13);

    const newMeeting = new Meeting({
      meetingCode,
      hostId,
      participants: [hostId], 
    });

    await newMeeting.save();

    res.status(httpStatus.CREATED).json({
      message: "Meeting created successfully",
      meetingCode,
    });
  } catch (error) {
    console.error("Create Meeting Error: ", error);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

export const joinMeeting = async (req, res) => {
  try {
    const { meetingCode } = req.body;
    const userId = req.user.userId;

    if (!meetingCode) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "Meeting code is required" });
    }

    // Direct Database Execution (Disk I/O)
    const meeting = await Meeting.findOne({ meetingCode });

    if (!meeting) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Meeting not found" });
    }

    if (!meeting.isActive) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "This meeting has already ended" });
    }

    // Pointer-safe comparison. Mongoose handles ObjectId matching in the document array.
    if (!meeting.participants.includes(userId)) {
      meeting.participants.push(userId);
      await meeting.save();
    }

    res.status(httpStatus.OK).json({
      message: "Joined meeting successfully",
      meetingCode: meeting.meetingCode,
    });
  } catch (error) {
    console.error("Join Meeting Error: ", error);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};