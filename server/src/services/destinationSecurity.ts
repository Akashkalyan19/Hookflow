import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "../utils/AppError.js";

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a = 0, b = 0] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51) || (a === 203 && b === 0);
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%", 1)[0] ?? "";
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("::ffff:")) return true;
  const first = Number.parseInt(normalized.split(":", 1)[0] || "0", 16);
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00 ||
    normalized.startsWith("2001:db8:") || normalized.startsWith("2002:");
}

function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  return version === 4 ? isPrivateIpv4(address) : version === 6 ? isPrivateIpv6(address) : true;
}

export async function validateDestinationUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError("Enter a valid destination URL.", 400);
  }
  if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password) {
    throw new AppError("Destination must use HTTP or HTTPS and cannot contain credentials.", 400);
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname === "metadata.google.internal") {
    throw new AppError("Local and metadata destinations are blocked.", 400);
  }
  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) throw new AppError("Private and reserved network destinations are blocked.", 400);
    return url;
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError("The destination hostname could not be resolved.", 400);
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new AppError("Destinations resolving to private or reserved networks are blocked.", 400);
  }
  return url;
}
