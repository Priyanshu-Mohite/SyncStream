import path from "node:path";
import { Server } from "socket.io";
import mediasoup from "mediasoup";
import os from "os";
import { mediaCodecs } from "../config/mediasoupConfig.js";
import config from "../config/config.js";

// ==========================================
// 1. STATE MANAGEMENT (Chat + Mediasoup)
// ==========================================
let connections = {};
let messages = {};
let timeOnline = {};

let workers = [];
let nextWorkerIndex = 0;
const sfuRooms = new Map(); // SFU Routers aur Peers yahan store honge

// ==========================================
// 2. MEDIASOUP WORKER INITIALIZATION
// ==========================================
export const createWorkers = async () => {
  const numCores = os.cpus().length;
  console.log(
    `System has ${numCores} CPU cores. Starting Mediasoup workers...`,
  );

  for (let i = 0; i < numCores; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: "warn",
      rtcMinPort: 10000, // Make sure these ports are open if you deploy on AWS/VPS
      rtcMaxPort: 10100,
    });

    worker.on("died", () => {
      console.error(`Worker ${worker.pid} died. Exiting...`);
      process.exit(1);
    });

    workers.push(worker);
  }
  console.log(`✅ ${numCores} Mediasoup Workers started successfully!`);
};

function getNextWorker() {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}

async function createRoom() {
  const worker = getNextWorker();
  const router = await worker.createRouter({ mediaCodecs });
  return router;
}

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      // origin: "http://localhost:5173", // Tera React ka exact URL (slash mat lagana end me)
      origin: config.FRONTEND_URL,
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

    // ----------------------------------------------------
    // NEW SYSTEM: MEDIASOUP SFU LOGIC
    // ----------------------------------------------------
    socket.on("joinRoom", async ({ roomId }, callback) => {
      try {
        let room = sfuRooms.get(roomId);

        if (!room) {
          const router = await createRoom();
          room = {
            router: router,
            peers: new Map(),
          };
          sfuRooms.set(roomId, room);
        }

        room.peers.set(socket.id, {
          id: socket.id,
          sendTransport: null,
          recvTransport: null,
          producers: new Map(),
          consumers: new Map(),
        });

        socket.join(roomId);
        console.log(`SFU Peer ${socket.id} joined Room: ${roomId}`);

        callback({ routerRtpCapabilities: room.router.rtpCapabilities });
      } catch (error) {
        console.error("Room join error:", error);
        callback({ error: error.message });
      }
    });

    socket.on("createWebRtcTransport", async ({ roomId }, callback) => {
      try {
        const room = sfuRooms.get(roomId);
        if (!room) return callback({ error: "Room not found!" });

        const transport = await room.router.createWebRtcTransport({
          listenIps: [{ 
            ip: "0.0.0.0", 
            // announcedIp: "127.0.0.1" 
            announcedIp: config.PUBLIC_IP
          }],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
        });

        const peer = room.peers.get(socket.id);
        peer.sendTransport = transport;

        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });

        transport.on("dtlsstatechange", (dtlsState) => {
          if (dtlsState === "closed") transport.close();
        });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on(
      "transport-connect",
      async ({ roomId, dtlsParameters, isSend }, callback) => {
        try {
          const peer = sfuRooms.get(roomId).peers.get(socket.id);
          const transport = isSend ? peer.sendTransport : peer.recvTransport;

          if (!transport) throw new Error("Transport not found!");
          await transport.connect({ dtlsParameters });
          callback();
        } catch (error) {
          console.error("Transport connect error:", error);
        }
      },
    );

    socket.on(
      "transport-produce",
      async ({ roomId, kind, rtpParameters }, callback) => {
        try {
          const peer = sfuRooms.get(roomId).peers.get(socket.id);
          const transport = peer.sendTransport;

          if (!transport) throw new Error("Send Transport not found!");

          const producer = await transport.produce({ kind, rtpParameters });
          peer.producers.set(producer.id, producer);

          // Tell other clients in the room a new video/audio is available
          socket.to(roomId).emit("new-producer", { producerId: producer.id });

          callback({ id: producer.id });
        } catch (error) {
          console.error("Transport produce error:", error);
        }
      },
    );

    socket.on("createRecvTransport", async ({ roomId }, callback) => {
      try {
        const room = sfuRooms.get(roomId);
        if (!room) return callback({ error: "Room not found!" });

        const transport = await room.router.createWebRtcTransport({
          listenIps: [{ ip: "0.0.0.0", announcedIp: config.PUBLIC_IP }],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
        });

        const peer = room.peers.get(socket.id);
        peer.recvTransport = transport;

        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on(
      "consume",
      async ({ roomId, producerId, rtpCapabilities }, callback) => {
        try {
          const room = sfuRooms.get(roomId);
          if (!room) return callback({ error: "Room not found!" });

          const router = room.router;
          const peer = room.peers.get(socket.id);
          const recvTransport = peer.recvTransport;

          if (router.canConsume({ producerId, rtpCapabilities })) {
            const consumer = await recvTransport.consume({
              producerId,
              rtpCapabilities,
              paused: true,
            });

            peer.consumers.set(consumer.id, consumer);

            consumer.on("transportclose", () => {
              peer.consumers.delete(consumer.id);
            });
            consumer.on("producerclose", () => {
              peer.consumers.delete(consumer.id);
              socket.emit("producer-closed", { consumerId: consumer.id });
            });

            callback({
              params: {
                id: consumer.id,
                producerId: consumer.producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
              },
            });
          }
        } catch (error) {
          callback({ error: error.message });
        }
      },
    );

    socket.on("consumer-resume", async ({ roomId, consumerId }) => {
      try {
        const peer = sfuRooms.get(roomId).peers.get(socket.id);
        const consumer = peer.consumers.get(consumerId);
        if (consumer) await consumer.resume();
      } catch (error) {
        console.error("Resume error:", error);
      }
    });

    socket.on("get-producers", ({ roomId }, callback) => {
      const room = sfuRooms.get(roomId);
      if (!room) return callback([]);

      let producerIds = [];
      room.peers.forEach((peer) => {
        if (peer.id !== socket.id) {
          peer.producers.forEach((producer) => {
            producerIds.push(producer.id);
          });
        }
      });
      callback(producerIds);
    });

    socket.on("disconnect", () => {
      // 1. Chat Cleanup
      let currentRoom = null;
      for (const [path, users] of Object.entries(connections)) {
        if (users.includes(socket.id)) {
          currentRoom = path;
          break;
        }
      }
      if (currentRoom) {
        connections[currentRoom] = connections[currentRoom].filter(
          (id) => id !== socket.id,
        );
        connections[currentRoom].forEach((id) => {
          io.to(id).emit("user-left", socket.id);
        });
      }

      // 2. SFU Cleanup
      sfuRooms.forEach((room, roomId) => {
        const peer = room.peers.get(socket.id);
        if (peer) {
          peer.producers.forEach((producer) => producer.close());
          peer.consumers.forEach((consumer) => consumer.close());
          if (peer.sendTransport) peer.sendTransport.close();
          if (peer.recvTransport) peer.recvTransport.close();
          room.peers.delete(socket.id);
          console.log(`Memory cleared for Peer ${socket.id} in Room ${roomId}`);
        }
      });
    });
  });

  return io;
};
