"use client";
import { useCallback, useEffect, useState } from "react";

export type Me = { email: string; nickname: string; role: "fan" | "owner"; placeId: string | null } | null;

/** The signed-in account from the server session (null when signed out, undefined while loading). */
export function useMe() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const refresh = useCallback(() => fetch("/api/auth").then((r) => r.json()).then((d) => setMe(d.user ?? null)).catch(() => setMe(null)), []);
  useEffect(() => { refresh(); }, [refresh]);
  return { me, refresh };
}

/** Error code from an API response, e.g. "login_required" -> t("err_login_required"). */
export const errKey = (code?: string) => `err_${code ?? "invalid_input"}`;
