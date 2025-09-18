"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

export default function Attachments({ ticketId, onUploaded, onDeleted, items, mode = "view" }) {
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Validate image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      alert("Only image files are allowed");
      return;
    }
    
    setLoading(true);
    try {
      for (const file of imageFiles) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const formData = new FormData();
        formData.append("image", file);
        
        await api.post(`/tickets/${ticketId}/attachments/image`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(prev => ({ ...prev, [file.name]: percentCompleted }));
          }
        });
        
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
      onUploaded?.();
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setLoading(false);
      setUploadProgress({});
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
    <div className="space-y-4">
      {mode === "edit" && (
        <div className="flex flex-col gap-2">
          <label className="btn btn-secondary cursor-pointer text-center">
            <span>Upload Images</span>
            <input 
              ref={fileRef} 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={upload} 
              disabled={loading}
              className="hidden"
            />
          </label>
          <span className="text-xs text-muted-foreground">
            Only image files are allowed (max 5MB each)
          </span>
          
          {/* Upload progress indicators */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-2 mt-2">
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <div 
                      className="w-6 h-6 bg-primary rounded-full"
                      style={{ 
                        clipPath: `inset(0 0 0 ${progress}%)` 
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs truncate">{filename}</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {(items || []).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(items || []).map((a) => (
            <div key={a.id} className="border rounded-lg p-3 text-xs group relative">
              <button 
                className="block w-full" 
                onClick={() => setPreview(a.stored_filename)}
                disabled={loading}
              >
                <img 
                  src={a.stored_filename} 
                  alt={a.original_filename} 
                  className="w-full h-24 object-cover rounded"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.svg';
                  }}
                />
              </button>
              <div className="mt-2 truncate">{a.original_filename}</div>
              <div className="text-xs text-muted-foreground">
                {a.size ? formatFileSize(a.size) : 'Unknown size'}
              </div>
              
              {mode === "edit" && (
                <button 
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => remove(a.id)} 
                  disabled={loading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setPreview(null)}>
          <div className="max-w-3xl w-full p-4" onClick={(e) => e.stopPropagation()}>
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

// Helper function to format file size
function formatFileSize(bytes) {
  if (typeof bytes !== 'number') return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}