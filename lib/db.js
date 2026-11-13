import { Redis } from "@upstash/redis";

// Vercel Marketplace (Upstash) injects <PREFIX>_REST_API_URL / _TOKEN (default prefix KV);
// a direct Upstash setup uses UPSTASH_REDIS_REST_URL / _TOKEN. Either works.
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
export const TASKS = ["follow", "like", "repost", "reply", "notify"];

// Rounds: each round has its own key namespace, so starting a new round resets
// the list and the counter for everyone while the earlier rounds stay intact.
//   round 1  → "liqi:…"       (the original list)
//   round N  → "liqi:rN:…"
// Bump ROUND here (and CONFIG.round in index.html) to start over.
export const ROUND = 2;

// Keys
//   users              set of lowercase handles
//   user:<x>           hash {x, wallet, ref, tasks, ts, ua}
//   wallet:<0x..>      lowercase handle that owns the wallet
//   refs:<x>           set of lowercase handles that joined through <x>'s link
//   rl:<ip>            per-minute rate-limit counter
const BASE = process.env.KEY_PREFIX || "liqi:";
export function keysFor(round) {
  const P = Number(round) === 1 ? BASE : `${BASE}r${Number(round)}:`;
  return {
    users: `${P}users`,
    user: (x) => `${P}user:${x}`,
    wallet: (w) => `${P}wallet:${w}`,
    refs: (x) => `${P}refs:${x}`,
    rl: (ip) => `${P}rl:${ip}`,
  };
}
export const k = keysFor(ROUND);

export function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
}

export async function rateLimit(req, limit = 10) {
  const key = k.rl(clientIp(req));
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60);
  return n <= limit;
}
