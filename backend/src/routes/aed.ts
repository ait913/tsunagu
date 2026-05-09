import { Hono } from "hono";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { findNearbyAeds } from "../services/geo.js";
import type { AppBindings } from "../types.js";
import { parseWithSchema } from "../validation.js";

const router = new Hono<AppBindings>();

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusM: z.coerce.number().int().positive().max(50_000).default(400),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

router.get("/nearby", requireAuth, async (c) => {
  const query = parseWithSchema(querySchema, c.req.query());
  const aeds = await findNearbyAeds(query.lat, query.lng, query.radiusM, query.limit);
  return c.json({
    aeds,
    attribution: "AED N@VI / CC BY 3.0",
  });
});

export default router;
