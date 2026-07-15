import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import { Device } from 'mediasoup-client';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

const RemoteVideo = ({ stream }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "8px",
        border: "2px solid #ea580c",
      }}
    />
  );
};

const RemoteAudio = ({ stream }) => {
  const audioRef = useRef(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay />;
};

const MeetingRoom = () => {
  const { meetingCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // User data for future use

  // Sockets & State
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null); // Auto-scroll ke liye

  const [device, setDevice] = useState(null);
  const [sendTransport, setSendTransport] = useState(null);
  const [recvTransport, setRecvTransport] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);

  const localVideoRef = useRef(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const isWebcamStarting = useRef(false);

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ==========================================
  // SOCKET.IO CONNECTION & LIFECYCLE
  // ==========================================
  useEffect(() => {
    // 1. Initialize Socket Connection
    socketRef.current = io(SERVER_URL, {
      withCredentials: true, // Backend cors credentials match karne ke liye
    });

    // 2. Join the Specific Meeting Room

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id);

      // 1. Join Chat Room
      socketRef.current.emit("join-call", meetingCode);

      // 2. Initialize SFU (Load Device)
      joinRoomAndLoadDevice();
    });

    // 3. Listen for Incoming Chat Messages
    // Backend se aane wala messageData: { sender: socket.id, text: message, time: ... }
    socketRef.current.on("chat-message", (messageData) => {
      setMessages((prevMessages) => [...prevMessages, messageData]);
    });

    // 4. Listen for User Joined/Left (System Messages)
    socketRef.current.on("user-joined", (socketId, allUsersInRoom) => {
      console.log(`User ${socketId} joined. Total users:`, allUsersInRoom);
      // Optional: UI me system notification add kar sakte hain
    });

    socketRef.current.on("user-left", (socketId) => {
      console.log(`User ${socketId} left the room.`);
    });

    // 5. Cleanup on Unmount (Sabse important step memory leaks rokne ke liye)
    return () => {
      socketRef.current.disconnect();
    };
  }, [meetingCode]);

  // ==========================================
  // MEDIASOUP: AUTOMATION RADAR (Listen for new streams)
  // ==========================================
  useEffect(() => {
    if (!socketRef.current || !recvTransport || !device) return;

    const handleNewProducer = ({ producerId }) => {
      console.log("🚨 Room me naya media detect hua! ID:", producerId);
      consumeMedia(producerId, recvTransport, device);
    };

    const handleProducerClosed = ({ consumerId }) => {
      console.log("🔴 Backend ne bola stream close hui. Dabba hata raha hu...");
      setRemoteStreams((prev) => prev.filter((s) => s.id !== consumerId));
    };

    socketRef.current.on("new-producer", handleNewProducer);
    socketRef.current.on("producer-closed", handleProducerClosed);

    return () => {
      socketRef.current.off("new-producer", handleNewProducer);
      socketRef.current.off("producer-closed", handleProducerClosed);
    };
  }, [recvTransport, device]);

  // ==========================================
  // MEDIASOUP: AUTOMATED PIPE CREATOR
  // ==========================================
  useEffect(() => {
    if (device && !recvTransport && !sendTransport) {
      console.log("Device ready hai! Apne aap dono pipes bana raha hu...");
      createWebRtcTransport();
      createRecvTransport();
    }
  }, [device]);

  // ==========================================
  // MEDIASOUP: CORE FUNCTIONS
  // ==========================================
  const joinRoomAndLoadDevice = () => {
    socketRef.current.emit(
      "joinRoom",
      { roomId: meetingCode },
      async (response) => {
        if (response.error) return console.error(response.error);
        try {
          const newDevice = new Device();
          await newDevice.load({
            routerRtpCapabilities: response.routerRtpCapabilities,
          });
          setDevice(newDevice);
          console.log("SFU Device Loaded!");
        } catch (error) {
          console.error("Error loading device:", error);
        }
      },
    );
  };

  const createWebRtcTransport = () => {
    socketRef.current.emit(
      "createWebRtcTransport",
      { roomId: meetingCode },
      async (response) => {
        if (response.error) return console.error(response.error);

        const transport = device.createSendTransport(response.params);

        transport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              socketRef.current.emit(
                "transport-connect",
                { roomId: meetingCode, dtlsParameters, isSend: true },
                () => callback(),
              );
            } catch (error) {
              errback(error);
            }
          },
        );

        transport.on("produce", async (parameters, callback, errback) => {
          try {
            socketRef.current.emit(
              "transport-produce",
              {
                roomId: meetingCode,
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
              },
              ({ id }) => callback({ id }),
            );
          } catch (error) {
            errback(error);
          }
        });

        setSendTransport(transport);
      },
    );
  };

  const createRecvTransport = () => {
    socketRef.current.emit(
      "createRecvTransport",
      { roomId: meetingCode },
      async (response) => {
        if (response.error) return console.error(response.error);

        const transport = device.createRecvTransport(response.params);

        transport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              socketRef.current.emit(
                "transport-connect",
                { roomId: meetingCode, dtlsParameters, isSend: false },
                () => callback(),
              );
            } catch (error) {
              errback(error);
            }
          },
        );

        setRecvTransport(transport);

        // Check if others are already in the room
        socketRef.current.emit(
          "get-producers",
          { roomId: meetingCode },
          (producerIds) => {
            producerIds.forEach((id) => consumeMedia(id, transport, device));
          },
        );
      },
    );
  };

  const consumeMedia = (producerId, transport, currentDevice) => {
    socketRef.current.emit(
      "consume",
      {
        roomId: meetingCode,
        producerId,
        rtpCapabilities: currentDevice.rtpCapabilities,
      },
      async (response) => {
        if (response.error) return console.error(response.error);

        const consumer = await transport.consume({
          id: response.params.id,
          producerId: response.params.producerId,
          kind: response.params.kind,
          rtpParameters: response.params.rtpParameters,
        });

        const { track } = consumer;
        const stream = new MediaStream([track]);

        setRemoteStreams((prev) => {
          if (prev.find((s) => s.id === consumer.id)) return prev;
          return [...prev, { id: consumer.id, stream, kind: consumer.kind }];
        });

        consumer.on("producerclose", () => {
          consumer.close();
          setRemoteStreams((prev) => prev.filter((s) => s.id !== consumer.id));
        });

        consumer.on("transportclose", () => {
          consumer.close();
          setRemoteStreams((prev) => prev.filter((s) => s.id !== consumer.id));
        });

        socketRef.current.emit("consumer-resume", {
          roomId: meetingCode,
          consumerId: consumer.id,
        });
      },
    );
  };

  // ==========================================
  // CAMERA & MIC TRIGGER
  // ==========================================
  const startWebcam = async () => {
    try {
      if (isWebcamActive || isWebcamStarting.current) return;
      isWebcamStarting.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      await sendTransport.produce({ track: videoTrack });
      if (audioTrack) {
        await sendTransport.produce({ track: audioTrack });
      }

      setIsWebcamActive(true);
    } catch (error) {
      console.error("Camera access failed:", error);
      isWebcamStarting.current = false;
    }
  };

  // ==========================================
  // MESSAGE SENDER LOGIC
  // ==========================================
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Backend ko 'chat-message' event emit karo
    socketRef.current.emit("chat-message", meetingCode, newMessage);

    // Note: Hum manually setMessages update nahi kar rahe hain.
    // Backend us message ko sabko (including sender) wapas bhejega 'chat-message' event ke through.
    setNewMessage("");
  };

  const handleLeaveMeeting = () => {
    navigate("/dashboard");
  };

  // ==========================================
  // UI RENDER
  // ==========================================
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* LEFT SIDE: VIDEO GRID AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#1e293b', padding: '15px 25px', borderRadius: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Room: <span style={{ color: '#ea580c' }}>{meetingCode}</span></h2>
          <div>
            {sendTransport && (
              <button 
                onClick={startWebcam}
                disabled={isWebcamActive}
                style={{ backgroundColor: isWebcamActive ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: isWebcamActive ? 'not-allowed' : 'pointer', marginRight: '10px' }}
              >
                {isWebcamActive ? 'Camera/Mic Active 🎥' : 'Join Audio & Video'}
              </button>
            )}
            <button 
              onClick={handleLeaveMeeting}
              style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Leave Call
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: '10px', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px', overflowY: 'auto' }}>
          
          {/* Local User Video */}
          <div style={{ width: '300px', height: '200px', backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            ></video>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>You</div>
          </div>

          {/* Remote Users */}
          {remoteStreams.map((item) => (
            item.kind === "video" ? (
              <div key={item.id} style={{ width: '300px', height: '200px', backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                <RemoteVideo stream={item.stream} />
              </div>
            ) : (
              <RemoteAudio key={item.id} stream={item.stream} />
            )
          ))}

        </div>
      </div>

      {/* RIGHT SIDE: TEXT CHAT AREA (Untouched) */}
      <div style={{ width: '350px', backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #334155', fontWeight: 'bold', fontSize: '18px' }}>
          Meeting Chat
        </div>

        {/* Chat Messages Display */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {messages.map((msg, index) => {
            const isMyMessage = msg.sender === socketRef.current?.id;
            return (
              <div key={index} style={{ alignSelf: isMyMessage ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px', textAlign: isMyMessage ? 'right' : 'left' }}>
                  {isMyMessage ? 'You' : `User (${msg.sender.substring(0, 4)})`} • {msg.time}
                </div>
                <div style={{ 
                  backgroundColor: isMyMessage ? '#ea580c' : '#334155', 
                  padding: '12px 16px', 
                  borderRadius: isMyMessage ? '15px 15px 0px 15px' : '15px 15px 15px 0px',
                  wordWrap: 'break-word'
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} /> 
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid #334155', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
          />
          <button type="submit" disabled={!newMessage.trim()} style={{ padding: '0 20px', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
            Send
          </button>
        </form>

      </div>
    </div>
  );
};

export default MeetingRoom;