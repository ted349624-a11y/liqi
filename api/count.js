import { redis, k } from "../lib/db.js";

// GET /api/count → { count }
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=15, s-maxage=15");
  try {
    const count = await redis.scard(k.users);
    return res.status(200).json({ count });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ count: null });
  }
}
