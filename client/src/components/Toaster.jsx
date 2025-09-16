"use client";

import { useToastStore } from "@/store/ui";

export default function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`card shadow-lg min-w-64 ${t.type === "error" ? "border-red-500" : t.type === "success" ? "border-green-500" : ""}`}>
          <div className="card-body flex items-center gap-3">
            <div className="text-sm">{t.message}</div>
            <button className="btn ml-auto" onClick={() => dismiss(t.id)}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}


