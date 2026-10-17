// Rotating store-tag token: the owner app's QR (or a real NFC tag writer) carries a token
// that changes every 5 minutes, so a copied link stops working soon after.
import { sign } from "./auth";

const SLOT_MS = 5 * 60 * 1000;
const tokenFor = (placeId: string, slot: number) => sign(`tag:${placeId}:${slot}`).slice(0, 22);

export const currentTagToken = (placeId: string) => tokenFor(placeId, Math.floor(Date.now() / SLOT_MS));
/** Accepts the current or the previous slot, so a scan right at the boundary still works. */
export function validTagToken(placeId: string, token?: string | null) {
  if (!token) return false;
  const slot = Math.floor(Date.now() / SLOT_MS);
  return token === tokenFor(placeId, slot) || token === tokenFor(placeId, slot - 1);
}
export const tagTokenTtlSec = () => Math.ceil((SLOT_MS - (Date.now() % SLOT_MS)) / 1000);
