import { redis, keysFor, listOf, ROUND, X_RE, WALLET_RE, TASKS, rateLimit } from "../lib/db.js";

// POST /api/submit  { x, wallet, tasks: [...], ref?, list? }   list: "main" (default) or "claim"
// A referral counts once, when the invited handle registers for the first time.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method" });
  try {
    if (!(await rateLimit(req))) return res.status(429).json({ ok: false, error: "rate_limited" });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const k = keysFor(ROUND, listOf(body.list));
    const x = String(body.x || "").trim().replace(/^@/, "");
    const wallet = String(body.wallet || "").trim();
    let ref = String(body.ref || "").trim().replace(/^@/, "");
    const tasks = Array.isArray(body.tasks) ? [...new Set(body.tasks.filter((t) => TASKS.includes(t)))] : [];

    if (!X_RE.test(x)) return res.status(400).json({ ok: false, error: "bad_x" });
    if (!WALLET_RE.test(wallet)) return res.status(400).json({ ok: false, error: "bad_wallet" });
    if (tasks.length !== TASKS.length) return res.status(400).json({ ok: false, error: "tasks_incomplete" });

    const xl = x.toLowerCase();
    const wl = wallet.toLowerCase();
    if (!X_RE.test(ref) || ref.toLowerCase() === xl) ref = "";

    // One wallet → one X account.
    const owner = await redis.get(k.wallet(wl));
    if (owner && owner !== xl) return res.status(409).json({ ok: false, error: "wallet_taken" });

    const existing = await redis.hgetall(k.user(xl));
    if (existing && existing.wallet) {
      // Returning handle may update its wallet.
      if (String(existing.wallet).toLowerCase() !== wl) {
        await redis.del(k.wallet(String(existing.wallet).toLowerCase()));
        await redis.set(k.wallet(wl), xl);
        await redis.hset(k.user(xl), { wallet, updated: new Date().toISOString() });
      }
      return res.status(200).json({ ok: true, returning: true, refs: await redis.scard(k.refs(xl)) });
    }

    const claimed = await redis.set(k.wallet(wl), xl, { nx: true });
    if (!claimed && (await redis.get(k.wallet(wl))) !== xl)
      return res.status(409).json({ ok: false, error: "wallet_taken" });

    await redis.hset(k.user(xl), {
      x,
      wallet,
      ref,
      tasks: tasks.join(","),
      ts: new Date().toISOString(),
      ua: String(req.headers["user-agent"] || "").slice(0, 160),
    });
    await redis.sadd(k.users, xl);
    if (ref) await redis.sadd(k.refs(ref.toLowerCase()), xl);

    return res.status(200).json({ ok: true, returning: false, refs: await redis.scard(k.refs(xl)) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "server" });
  }
}
