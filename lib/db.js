import { Redis } from "@upstash/redis";

// Vercel Marketplace (Upstash) injects KV_REST_API_* ; a direct Upstash setup uses UPSTASH_REDIS_REST_*.
export const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const X_RE = /^[A-Za-z0-9_]{1,15}$/;
export const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
export const TASKS = ["follow", "like", "rt", "reply"];

// Keys
//   users                  set of lowercase X handles
//   user:<x>               hash {x, wallet, ref, tasks, ts}
//   wallet:<0x..lower>     lowercase X handle that owns the wallet
//   refs:<x>               set of lowercase handles referred by <x>
export const k = {
  users: "users",
  user: (x) => `user:${x}`,
  wallet: (w) => `wallet:${w}`,
  refs: (x) => `refs:${x}`,
};

export async function rateLimit(req, limit = 10) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  const key = `rl:${ip}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60);
  return n <= limit;
}
