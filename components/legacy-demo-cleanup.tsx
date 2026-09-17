"use client";

import { useEffect } from "react";

export function LegacyDemoCleanup() {
  useEffect(() => {
    try {
      for (let index = localStorage.length - 1; index >= 0; index--) {
        const key = localStorage.key(index);
        if (key?.startsWith("mapid-demo-score:")) localStorage.removeItem(key);
      }
    } catch {
      // Storage may be disabled; the application no longer reads demo scores.
    }
  }, []);

  return null;
}
