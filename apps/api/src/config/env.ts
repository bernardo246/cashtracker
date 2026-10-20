import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("true")
  .transform((v) => v === "true");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    APP_URL: z.url(),
    DATABASE_URL: z.string().min(1),
    JWT_PRIVATE_KEY: z
      .string()
      .min(1)
      .transform((v) => Buffer.from(v, "base64").toString("utf8")),
    JWT_KEY_ID: z.string().min(1),
    COOKIE_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_REDIRECT_URI: z.url(),
    EMAIL_PROVIDER: z.enum(["brevo", "console"]),
    BREVO_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.email().optional(),
    EMAIL_FROM_NAME: z.string().min(1).default("Cash Tracker"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    RATE_LIMIT_ENABLED: bool,
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER !== "brevo") return;
    for (const key of ["BREVO_API_KEY", "EMAIL_FROM"] as const) {
      if (!env[key]) {
        ctx.addIssue({ code: "custom", path: [key], message: "obrigatória com EMAIL_PROVIDER=brevo" });
      }
    }
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map((i) => i.path.join(".") || "(raiz)"))];
    throw new Error(`Variáveis de ambiente inválidas: ${keys.join(", ")}`);
  }
  return result.data;
}
