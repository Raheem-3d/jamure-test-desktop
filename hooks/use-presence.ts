// hooks/use-presence.ts
"use client";

import { useEffect } from "react";
import type { Socket } from "socket.io-client";

type PresenceState = "online" | "away";

/**
 * Emits presence updates whenever the tab becomes visible/hidden.
 * Accepts a full Socket, a { emit }-only shape, or null/undefined.
 */
export function usePresence(socket?: Pick<Socket, "emit"> | Socket | null) {
  useEffect(() => {
    if (!socket) return;

    const send = (state: PresenceState) => {
      try {
        socket.emit("presence:update", { state, at: Date.now() });
      } catch {}
    };

    const onVis = () => send(document.visibilityState === "visible" ? "online" : "away");

    // initial
    onVis();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", () => send("away"));

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      // (no need to remove beforeunload)
    };
  }, [socket]);
}





//------------------------------------

