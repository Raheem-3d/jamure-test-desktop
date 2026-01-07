"use client";
import { useEffect } from "react";

export default function SWRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => 
          console.log("✅")
      )
        .catch((e) => console.error("❌ SW registration failed", e));
    }
  }, []);
  return null;
}
