import { timingSafeEqual } from 'node:crypto';
/** Cloud Run dispatch requires a private service; platform IAM validates the OIDC token. */
export function workerDispatchAuthorized(
  header: string | undefined,
  env: Record<string, string | undefined> = process.env,
) {
  if (env.WORKER_AUTH_MODE === 'cloud-run') return !!env.K_SERVICE;
  const secret = env.WORKER_DISPATCH_TOKEN;
  if (!secret || secret.length < 32 || !header?.startsWith('Bearer ')) return false;
  const value = Buffer.from(header.slice(7)),
    expected = Buffer.from(secret);
  return value.length === expected.length && timingSafeEqual(value, expected);
}
