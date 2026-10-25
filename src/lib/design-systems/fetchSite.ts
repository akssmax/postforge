import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

/** Loopback, private, link-local, CGNAT, multicast and other non-public ranges. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]!);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(lower);
  }
  const [a, b] = address.split(".").map(Number) as [number, number];
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224 || (a === 198 && (b === 18 || b === 19))
  );
}

async function assertPublic(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http and https URLs can be imported.");
  if (url.username || url.password) throw new Error("URLs with credentials can't be imported.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard ports can be imported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^localhost$|\.local$|\.internal$/i.test(host)) throw new Error("That address isn't public.");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((entry) => entry.address);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error("That address isn't public.");
}

/**
 * Fetch a public page or stylesheet as text, re-checking the address on every
 * redirect so a public URL can't bounce the server into a private network.
 * (fetch resolves the host again; a DNS-rebinding attacker could still race
 * the check, so run imports where private services also require auth.)
 */
export async function fetchPublicText(rawUrl: string, maxBytes: number, accept = "text/html,text/css,*/*;q=0.5"): Promise<{ url: string; text: string }> {
  let url = new URL(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublic(url);
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept, "user-agent": "PostforgeBrandImport/1.0" } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without a location.");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok || !response.body) throw new Error(`The site answered ${response.status}.`);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return { url: url.toString(), text: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new Error("Too many redirects.");
}
