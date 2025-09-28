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
    
    // Validate media files (images, audio, video)
    const mediaFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.type.startsWith('audio/') || 
      file.type.startsWith('video/')
    );
    if (mediaFiles.length !== files.length) {
      alert("Only image, audio, and video files are allowed");
      return;
    }
    
    setLoading(true);
    try {
      for (const file of mediaFiles) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const formData = new FormData();
        formData.append("media", file);
        
        await api.post(`/tickets/${ticketId}/attachments/media`, formData, {
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
            <span>Upload Media</span>
            <input 
              ref={fileRef} 
              type="file" 
              accept="image/*,audio/*,video/*" 
              multiple 
              onChange={upload} 
              disabled={loading}
              className="hidden"
            />
          </label>
          <span className="text-xs text-muted-foreground">
            Images (5MB), Audio/Video (50MB)
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
            <AttachmentItem 
              key={a.id} 
              attachment={a} 
              onPreview={setPreview}
              onRemove={mode === "edit" ? () => remove(a.id) : null}
              loading={loading}
            />
          ))}
        </div>
      )}
      
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setPreview(null)}>
          <div className="max-w-3xl w-full p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button className="btn" onClick={() => setPreview(null)}>Close</button>
            </div>
            <MediaPreview url={preview} />
          </div>
        </div>
      )}
    </div>
  );
}

// Attachment item component
function AttachmentItem({ attachment, onPreview, onRemove, loading }) {
  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'unknown';
  };

  const fileType = getFileType(attachment.mime_type);

  return (
    <div className="border rounded-lg p-3 text-xs group relative">
      <button 
        className="block w-full" 
        onClick={() => onPreview(attachment.stored_filename)}
        disabled={loading}
      >
        {fileType === 'image' ? (
          <img 
            src={attachment.stored_filename} 
            alt={attachment.original_filename} 
            className="w-full h-24 object-cover rounded"
            onError={(e) => {
              e.target.src = '/placeholder-image.svg';
            }}
          />
        ) : (
          <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center">
            {fileType === 'audio' ? (
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : fileType === 'video' ? (
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
        )}
      </button>
      <div className="mt-2 truncate">{attachment.original_filename}</div>
      <div className="text-xs text-muted-foreground">
        {attachment.size ? formatFileSize(attachment.size) : 'Unknown size'}
      </div>
      
      {onRemove && (
        <button 
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove} 
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Media preview component
function MediaPreview({ url }) {
  const getFileType = (url) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension)) return 'audio';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    return 'unknown';
  };

  const fileType = getFileType(url);

  if (fileType === 'image') {
    return <img src={url} alt="Preview" className="w-full max-h-[80vh] object-contain rounded" />;
  } else if (fileType === 'video') {
    return (
      <video 
        src={url} 
        controls 
        className="w-full max-h-[80vh] rounded"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    );
  } else if (fileType === 'audio') {
    return (
      <div className="w-full max-w-md mx-auto">
        <audio 
          src={url} 
          controls 
          className="w-full"
          preload="metadata"
        >
          Your browser does not support the audio tag.
        </audio>
      </div>
    );
  } else {
    return (
      <div className="w-full max-h-[80vh] flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600">Preview not available for this file type</p>
        </div>
      </div>
    );
  }
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (typeof bytes !== 'number') return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}