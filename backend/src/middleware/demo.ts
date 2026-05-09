import type { MiddlewareHandler } from "hono";

import type { AppBindings } from "../types.js";

export const demoMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  c.set("demoMode", c.req.query("demo") === "true");
  await next();
};
