"use client";
import { useEffect, useState } from "react";

/** Whether the server is in HeyYumi sandbox mode (no real owner pushes). */
export function useSandbox() {
  const [sandbox, setSandbox] = useState(true);
  useEffect(() => { fetch("/api/config").then((r) => r.json()).then((d) => setSandbox(Boolean(d.sandbox))).catch(() => {}); }, []);
  return sandbox;
}
