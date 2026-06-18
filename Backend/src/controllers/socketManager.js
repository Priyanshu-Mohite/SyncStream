import path from "node:path";
import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // Tera React ka exact URL (slash mat lagana end me)
      methods: ["GET", "POST"],
      allowedHeader: ["*"],   
      credentials: true, // Ye TRUE karna bohot zaroori hai agar tu JWT cookies use kar raha hai
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-call", (path) => {
      if (connections[path] === undefined) {
        connections[path] = [];
      }
      connections[path].push(socket.id);
      timeOnline[socket.id] = Date.now();

      // connections[path].forEach((id) => {
      //   io.to(id).emit("user-joined", socket.id);
      // });

      for (let a = 0; a < connections[path].length; a++) {
        io.to(connections[path][a]).emit(
          "user-joined",
          socket.id,
          connections[path],
        );
      }

      if (messages[path] !== undefined) {
        for (let a = 0; a < messages[path].length; a++) {
          io.to(socket.id).emit("chat-message", messages[path][a]);
        }
      }
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    // Jab koi banda message bhejta hai
    socket.on("chat-message", (roomPath, message) => {
      // 1. KYA IS ROOM KI CHAT HISTORY PEHLE SE HAI?
      if (messages[roomPath] === undefined) {
        messages[roomPath] = []; // Nahi hai toh ek khali array bana do
      }

      // 2. CHAT HISTORY ME MESSAGE SAVE KARO (Late aane walo ke liye)
      // Hum message ke sath bhejne wale ki ID bhi save kar lenge
      const messageData = {
        sender: socket.id,
        text: message,
        time: new Date().toLocaleTimeString(),
      };
      messages[roomPath].push(messageData);

      // 3. ROOM ME BAITHE SAB LOGO KO MESSAGE BHEJ DO
      // connections[roomPath] me us room ke sab logo ki list hai
      if (connections[roomPath]) {
        connections[roomPath].forEach((userId) => {
          // Server us message ko sabki taraf phek raha hai
          io.to(userId).emit("chat-message", messageData);
        });
      }
    });

    socket.on("disconnect", () => {
      // 1. connections object me dhundo ki ye socket.id kis room (path) me thi
      for (const [roomPath, users] of Object.entries(connections)) {
        const userIndex = users.indexOf(socket.id);

        // Agar user is room me mil gaya
        if (userIndex !== -1) {
          // 2. Us user ko iss room ke array se remove karo
          users.splice(userIndex, 1);

          // 3. Room me bache hue sabhi logo ko batao ki ye banda leave kar gaya
          // (Tere current code ke hisaab se manual loop, aage chalkar isko native rooms me convert karlena)
          users.forEach((userId) => {
            io.to(userId).emit("user-left", socket.id);
          });

          // 4. Memory optimization: Agar room khali ho gaya hai, toh usko object se uda do
          if (users.length === 0) {
            delete connections[roomPath];
          }

          // Ek user ek hi meeting me tha, toh aage search karne ki zarurat nahi
          break;
        }
      }
    });
  });

  return io;
};
