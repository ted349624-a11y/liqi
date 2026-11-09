import { Redis } from "@upstash/redis";

// Vercel Marketplace (Upstash) injects <PREFIX>_REST_API_URL / _TOKEN (default prefix KV);
// a direct Upstash setup uses UPSTASH_REDIS_REST_URL / _TOKEN. Any prefix works.
function findEnv(suffix) {
  const names = Object.keys(process.env).filter((n) => n.endsWith(suffix) && !n.includes("READ_ONLY"));
  names.sort((a, b) => (a.startsWith("KV_") ? -1 : b.startsWith("KV_") ? 1 : 0));
  return names.length ? process.env[names[0]] : undefined;
}
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || findEnv("_REST_API_URL"),
  token: process.env.UPSTASH_REDIS_REST_TOKEN || findEnv("_REST_API_TOKEN"),
});

export const X_RE = /^[A-Za-z0-9_]{1,15}$/;
export const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
export const TASKS = ["follow", "like", "rt", "reply"];

// Keys
//   (all keys start with KEY_PREFIX, default "liqi:")
//   users                  set of lowercase X handles
//   user:<x>               hash {x, wallet, ref, tasks, ts}
//   wallet:<0x..lower>     lowercase X handle that owns the wallet
//   refs:<x>               set of lowercase handles referred by <x>
// Every key is prefixed so this can share a Redis database with other projects.
const P = process.env.KEY_PREFIX || "liqi:";
export const k = {
  users: `${P}users`,
  user: (x) => `${P}user:${x}`,
  wallet: (w) => `${P}wallet:${w}`,
  refs: (x) => `${P}refs:${x}`,
  rl: (ip) => `${P}rl:${ip}`,
};

export async function rateLimit(req, limit = 10) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  const key = k.rl(ip);
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60);
  return n <= limit;
}
