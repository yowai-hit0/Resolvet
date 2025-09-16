"use client";

import { useEffect, useState } from "react";
import { HealthAPI } from "@/lib/api";

export function HealthGate({ children }) {
  const [ok, setOk] = useState(false);
  const [error, setError] = useState();

  useEffect(() => {
    let mounted = true;
    HealthAPI.check()
      .then(() => { if (mounted) setOk(true); })
      .catch((e) => { if (mounted) setError("Backend unavailable"); })
    return () => { mounted = false; };
  }, []);

  if (error) return <div className="min-h-screen flex items-center justify-center">{error}</div>;
  if (!ok) return <div className="min-h-screen flex items-center justify-center">Checking server health...</div>;
  return children;
}


