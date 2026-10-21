import { byCategoryQuery, monthlyQuery } from "@cash/shared";
import type { FastifyInstance } from "fastify";
import type { Env } from "../../config/env.js";
import { authedRateLimit } from "../../http/rate-limits.js";
import type { ReportService } from "./reports.service.js";

type Deps = { env: Env; reports: ReportService };

export function reportRoutes(app: FastifyInstance, { env, reports }: Deps, done: () => void): void {
  // authenticate antes do rate limit (preHandler): a chave usa req.userId
  const opts = { preHandler: [app.authenticate], config: authedRateLimit(env) };

  app.get("/reports/by-category", opts, async (req) =>
    reports.byCategory(req.userId, byCategoryQuery.parse(req.query)),
  );

  app.get("/reports/monthly", opts, async (req) =>
    reports.monthly(req.userId, monthlyQuery.parse(req.query).months),
  );

  done();
}
