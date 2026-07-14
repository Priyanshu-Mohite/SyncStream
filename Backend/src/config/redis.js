import { createClient } from "redis";

// Default localhost URL for development
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

pubClient.on("error", (err) => console.error("Redis Pub Client Error", err));
subClient.on("error", (err) => console.error("Redis Sub Client Error", err));

export const connectRedis = async () => {
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log("✅ Redis connected successfully for Pub/Sub");
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
  }
};

export { pubClient, subClient };