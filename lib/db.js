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
// Within a round, the /claim page keeps its own list under "…claim:".
// Bump ROUND here (and CONFIG.round in index.html) to start over.
export const ROUND = 2;

// Keys
//   users              set of lowercase handles
//   user:<x>           hash {x, wallet, ref, tasks, ts, ua}
//   wallet:<0x..>      lowercase handle that owns the wallet
//   refs:<x>           set of lowercase handles that joined through <x>'s link
//   rl:<ip>            per-minute rate-limit counter
const BASE = process.env.KEY_PREFIX || "liqi:";
export const LISTS = ["main", "claim"]; // "/" and "/claim" collect separately
export function listOf(v) {
  return String(v || "").toLowerCase() === "claim" ? "claim" : "main";
}
export function keysFor(round, list = "main") {
  let P = Number(round) === 1 ? BASE : `${BASE}r${Number(round)}:`;
  if (listOf(list) === "claim") P += "claim:";
  return {
    users: `${P}users`,
    user: (x) => `${P}user:${x}`,
    wallet: (w) => `${P}wallet:${w}`,
    refs: (x) => `${P}refs:${x}`,
    seq: `${P}seq`, // running count of registrations, gives each one its place in line
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

// Place in line = real registration order on a list. Hands out the next number,
// starting after everyone already on the list.
export async function nextPos(k) {
  if (!(await redis.exists(k.seq))) await redis.set(k.seq, await redis.scard(k.users), { nx: true });
  return redis.incr(k.seq);
}

// Anyone registered before numbering existed gets the next number the first time
// they come back, i.e. they join the end of the line.
export async function ensurePos(k, xl, current) {
  const have = Number(current) || 0;
  if (have > 0) return have;
  const pos = await nextPos(k);
  const won = await redis.hsetnx(k.user(xl), "pos", pos);
  return won ? pos : Number(await redis.hget(k.user(xl), "pos")) || pos;
}
