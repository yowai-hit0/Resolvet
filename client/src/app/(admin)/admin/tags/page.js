// app/(admin)/tags/page.js
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PrioritiesAPI } from "@/lib/api";
import { useToastStore } from "@/store/ui";

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState();
  const [editingName, setEditingName] = useState("");
  const [priorities, setPriorities] = useState([]);
  const [pName, setPName] = useState("");
  const [pEditId, setPEditId] = useState();
  const [pEditName, setPEditName] = useState("");
  const [activeTab, setActiveTab] = useState("tags");
  const showToast = useToastStore((s) => s.show);

  const load = () => {
    api.get("/tags").then((r) => {
      const payload = r.data;
      const candidates = [
        payload?.data?.tags,
        payload?.data,
        payload?.tags,
        payload,
      ];
      const list = candidates.find((v) => Array.isArray(v)) || [];
      setTags(list);
    }).catch(() => {
      showToast("Failed to load tags", "error");
    });
    
    PrioritiesAPI.list()
      .then((r) => {
        const payload = r;
        const candidates = [payload?.data?.priorities, payload?.data, payload?.priorities, payload];
        const list = candidates.find((v) => Array.isArray(v)) || [];
        setPriorities(list);
      })
      .catch(() => {
        setPriorities([]);
        showToast("Failed to load priorities", "error");
      });
  };

  useEffect(() => {
    load();
  }, []);

  const createTag = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post("/tags", { name });
      setName("");
      load();
      showToast("Tag created successfully", "success");
    } catch {
      showToast("Failed to create tag", "error");
    }
  };

  const saveTagEdit = async (tagId) => {
    if (!editingName.trim()) return;
    try {
      await api.put(`/tags/${tagId}`, { name: editingName });
      setEditingId(undefined);
      setEditingName("");
      load();
      showToast("Tag updated successfully", "success");
    } catch {
      showToast("Failed to update tag", "error");
    }
  };

  const removeTag = async (tagId) => {
    try {
      await api.delete(`/tags/${tagId}`);
      load();
      showToast("Tag deleted successfully", "success");
    } catch {
      showToast("Failed to delete tag", "error");
    }
  };

  const createPriority = async (e) => {
    e.preventDefault();
    if (!pName.trim()) return;
    try {
      await PrioritiesAPI.create({ name: pName });
      setPName("");
      load();
      showToast("Priority created successfully", "success");
    } catch {
      showToast("Failed to create priority", "error");
    }
  };

  const savePriority = async (id) => {
    if (!pEditName.trim()) return;
    try {
      await PrioritiesAPI.update(id, { name: pEditName });
      setPEditId(undefined);
      setPEditName("");
      load();
      showToast("Priority updated successfully", "success");
    } catch {
      showToast("Failed to update priority", "error");
    }
  };

  const deletePriority = async (id) => {
    try {
      await PrioritiesAPI.remove(id);
      load();
      showToast("Priority deleted successfully", "success");
    } catch {
      showToast("Failed to delete priority", "error");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Tags & Priorities</h1>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium ${activeTab === "tags" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("tags")}
        >
          Tags
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === "priorities" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("priorities")}
        >
          Priorities
        </button>
      </div>

      {/* Tags Tab */}
      {activeTab === "tags" && (
        <div className="space-y-4">
          <form onSubmit={createTag} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input flex-1"
              placeholder="New tag name"
            />
            <button className="btn btn-primary">Add Tag</button>
          </form>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Tags</h2>
            </div>
            <div className="card-body p-0">
              {Array.isArray(tags) && tags.length > 0 ? (
                tags.map((t) => (
                  <div key={t.id} className="px-6 py-4 border-b last:border-b-0 flex items-center gap-3">
                    {editingId === t.id ? (
                      <>
                        <input 
                          className="input flex-1" 
                          value={editingName} 
                          onChange={(e) => setEditingName(e.target.value)} 
                        />
                        <button 
                          className="btn btn-primary" 
                          onClick={() => saveTagEdit(t.id)}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => { setEditingId(undefined); setEditingName(""); }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{t.name}</span>
                        <button 
                          className="btn btn-ghost" 
                          onClick={() => { setEditingId(t.id); setEditingName(t.name); }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-destructive" 
                          onClick={() => removeTag(t.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  No tags created yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Priorities Tab */}
      {activeTab === "priorities" && (
        <div className="space-y-4">
          <form onSubmit={createPriority} className="flex gap-2">
            <input
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              className="input flex-1"
              placeholder="New priority name"
            />
            <button className="btn btn-primary">Add Priority</button>
          </form>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Priorities</h2>
            </div>
            <div className="card-body p-0">
              {Array.isArray(priorities) && priorities.length > 0 ? (
                priorities.map((p) => (
                  <div key={p.id} className="px-6 py-4 border-b last:border-b-0 flex items-center gap-3">
                    {pEditId === p.id ? (
                      <>
                        <input 
                          className="input flex-1" 
                          value={pEditName} 
                          onChange={(e) => setPEditName(e.target.value)} 
                        />
                        <button 
                          className="btn btn-primary" 
                          onClick={() => savePriority(p.id)}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => { setPEditId(undefined); setPEditName(""); }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{p.name}</span>
                        <button 
                          className="btn btn-ghost" 
                          onClick={() => { setPEditId(p.id); setPEditName(p.name); }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-destructive" 
                          onClick={() => deletePriority(p.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  No priorities created yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}