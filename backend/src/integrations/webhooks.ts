import { createHmac } from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
export function signWebhook(secret: string, timestamp: string, body: string) { return `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`; }
export function isPrivateAddress(address: string) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 10 ||            // 10.0.0.0/8
      a === 127 ||           // 127.0.0.0/8 loopback
      a === 0 ||             // 0.0.0.0/8
      a === 100 && b >= 64 && b <= 127 || // 100.64.0.0/10 CGNAT
      a === 169 && b === 254 || // 169.254.0.0/16 link-local (cloud metadata)
      a === 172 && b >= 16 && b <= 31 || // 172.16.0.0/12
      a === 192 && b === 168 || // 192.168.0.0/16
      a === 198 && (b === 18 || b === 19) || // 198.18.0.0/15 benchmark
      a >= 224                // multicast + reserved
    );
  }
  return net.isIPv6(address) && (
    address === '::1' ||
    address.startsWith('fc') || address.startsWith('fd') || // fc00::/7 ULA
    address.startsWith('fe8') || address.startsWith('fe9') ||
    address.startsWith('fea') || address.startsWith('feb') || // fe80::/10 link-local
    address.startsWith('::ffff:')
  );
}
export async function assertSafeWebhookUrl(raw: string, production = true) { const parsed = new URL(raw); if (production && parsed.protocol !== 'https:') throw new Error('webhook URL must use HTTPS'); if (!['http:','https:'].includes(parsed.protocol)) throw new Error('unsupported webhook URL protocol'); const addresses = await dns.lookup(parsed.hostname, { all: true }); if (addresses.some(x => isPrivateAddress(x.address))) throw new Error('webhook destination is not publicly routable'); return parsed; }