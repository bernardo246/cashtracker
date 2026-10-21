/** Contador em memória por chave, janela fixa. `hit` devolve null (permitido) ou segundos até liberar. */
export function createWindowLimiter(opts: { max: number; windowMs: number; maxKeys?: number }) {
  const maxKeys = opts.maxKeys ?? 10_000;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    hit(key: string, nowMs = Date.now()): number | null {
      if (buckets.size >= maxKeys) {
        for (const [k, b] of buckets) if (b.resetAt <= nowMs) buckets.delete(k);
        if (buckets.size >= maxKeys) buckets.delete(buckets.keys().next().value!); // descarta a mais antiga
      }
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= nowMs) {
        bucket = { count: 0, resetAt: nowMs + opts.windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      return bucket.count > opts.max ? Math.max(1, Math.ceil((bucket.resetAt - nowMs) / 1000)) : null;
    },
  };
}
