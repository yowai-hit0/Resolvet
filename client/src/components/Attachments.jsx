"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

export default function Attachments({ ticketId, onUploaded, onDeleted, items }) {
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setLoading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        await api.post(`/tickets/${ticketId}/attachments/image`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      onUploaded?.();
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setLoading(false);
    }
  };

  const remove = async (attachmentId) => {
    setLoading(true);
    try {
      await api.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);
      onDeleted?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={upload} disabled={loading} />
        <span className="text-xs opacity-70">Upload images after ticket creation.</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(items || []).map((a) => (
          <div key={a.id} className="border rounded p-2 text-xs">
            <button className="block w-full" onClick={() => setPreview(a.stored_filename)}>
              <img src={a.stored_filename} alt={a.original_filename} className="w-full h-24 object-cover rounded" />
            </button>
            <div className="mt-1 truncate">{a.original_filename}</div>
            <button className="btn w-full mt-1" onClick={() => remove(a.id)} disabled={loading}>Delete</button>
          </div>
        ))}
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setPreview(null)}>
          <div className="max-w-3xl w-full p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button className="btn" onClick={() => setPreview(null)}>Close</button>
            </div>
            <img src={preview} alt="Preview" className="w-full max-h-[80vh] object-contain rounded" />
          </div>
        </div>
      )}
    </div>
  );
}


