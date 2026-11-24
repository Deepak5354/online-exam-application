import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { HttpError } from "../lib/errors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard for state-changing requests.
 *
 * Browsers always send an Origin header on cross-site POST/PATCH/DELETE, so a
 * request is accepted only when the Origin is this app. The comparison is done
 * on the host (not the scheme) because TLS is usually terminated by a proxy or
 * a dev tunnel in front of Express, which makes `req.protocol` unreliable.
 *
 * Requests with no Origin (curl, server-to-server) are not browser CSRF and pass.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();

  const host = req.get("host") ?? "";
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = "";
  }
  let appHost = "";
  try {
    appHost = new URL(config.appUrl).host;
  } catch {
    appHost = "";
  }

  const allowedHosts = new Set([host, appHost]);
  if (!config.isProd) allowedHosts.add("localhost:3000").add("127.0.0.1:3000");

  if (originHost && allowedHosts.has(originHost)) return next();
  throw new HttpError(403, "Forbidden: cross-site request blocked");
}
