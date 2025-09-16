"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PrioritiesAPI } from "@/lib/api";

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState();
  const [editingName, setEditingName] = useState("");
  const [priorities, setPriorities] = useState([]);
  const [pName, setPName] = useState("");
  const [pEditId, setPEditId] = useState();
  const [pEditName, setPEditName] = useState("");

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
    });
    // priorities (public GET per requirement)
    PrioritiesAPI.list()
      .then((r) => {
        const payload = r;
        const candidates = [payload?.data?.priorities, payload?.data, payload?.priorities, payload];
        const list = candidates.find((v) => Array.isArray(v)) || [];
        setPriorities(list);
      })
      .catch(() => setPriorities([]));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/tags", { name });
    setName("");
    load();
  };

  const saveEdit = async (tagId) => {
    if (!editingName.trim()) return;
    await api.put(`/tags/${tagId}`, { name: editingName });
    setEditingId(undefined);
    setEditingName("");
    load();
  };

  const remove = async (tagId) => {
    await api.delete(`/tags/${tagId}`);
    load();
  };

  const createPriority = async (e) => {
    e.preventDefault();
    if (!pName.trim()) return;
    await PrioritiesAPI.create({ name: pName });
    setPName("");
    load();
  };

  const savePriority = async (id) => {
    if (!pEditName.trim()) return;
    await PrioritiesAPI.update(id, { name: pEditName });
    setPEditId(undefined);
    setPEditName("");
    load();
  };

  const deletePriority = async (id) => {
    await PrioritiesAPI.remove(id);
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-3 py-2 text-black"
          placeholder="New tag name"
        />
        <button className="border rounded px-3">Add</button>
      </form>
      <div className="border rounded">
        {Array.isArray(tags) && tags.map((t) => (
          <div key={t.id} className="px-3 py-2 border-t first:border-t-0 flex items-center gap-2">
            {editingId === t.id ? (
              <>
                <input className="input max-w-64" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                <button className="btn" onClick={() => saveEdit(t.id)}>Save</button>
                <button className="btn" onClick={() => { setEditingId(undefined); setEditingName(""); }}>Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1">{t.name}</span>
                <button className="btn" onClick={() => { setEditingId(t.id); setEditingName(t.name); }}>Edit</button>
                <button className="btn" onClick={() => remove(t.id)}>Delete</button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="pt-4">
        <div className="font-medium mb-2">Priorities</div>
        <form onSubmit={createPriority} className="flex gap-2 mb-2">
          <input
            value={pName}
            onChange={(e) => setPName(e.target.value)}
            className="border rounded px-3 py-2 text-black"
            placeholder="New priority name"
          />
          <button className="border rounded px-3">Add</button>
        </form>
        <div className="border rounded">
          {Array.isArray(priorities) && priorities.map((p) => (
            <div key={p.id} className="px-3 py-2 border-t first:border-t-0 flex items-center gap-2">
              {pEditId === p.id ? (
                <>
                  <input className="input max-w-64" value={pEditName} onChange={(e) => setPEditName(e.target.value)} />
                  <button className="btn" onClick={() => savePriority(p.id)}>Save</button>
                  <button className="btn" onClick={() => { setPEditId(undefined); setPEditName(""); }}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1">{p.name}</span>
                  <button className="btn" onClick={() => { setPEditId(p.id); setPEditName(p.name); }}>Edit</button>
                  <button className="btn" onClick={() => deletePriority(p.id)}>Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


