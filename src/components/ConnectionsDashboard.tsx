"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp, where } from "firebase/firestore";
import { ConnectionProfile, Encounter } from "@/lib/models";
import { deleteConnection, upsertConnectionProfile } from "@/lib/crm";

interface Props { uid: string; }

export default function ConnectionsDashboard({ uid }: Props) {
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [selectedConn, setSelectedConn] = useState<ConnectionProfile | null>(null);
  const [linkedEncounters, setLinkedEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ConnectionProfile>>({});

  useEffect(() => { fetchConnections(); }, [uid]);

  const convertToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
  };

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users", uid, "connections"), orderBy("lastEncounterAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          createdAt: convertToDate(d.createdAt),
          lastEncounterAt: convertToDate(d.lastEncounterAt),
        };
      }) as ConnectionProfile[];
      setConnections(data);
    } catch (error) { console.error("Error fetching connections:", error); } 
    finally { setLoading(false); }
  };

  const viewDetails = async (conn: ConnectionProfile) => {
    setSelectedConn(conn);
    setEditData({ ...conn });
    setLoadingDetails(true);
    try {
      const q = query(
        collection(db, "users", uid, "encounters"),
        where("connectionProfileId", "==", conn.id),
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: convertToDate(doc.data().timestamp)
      })) as Encounter[];
      setLinkedEncounters(data);
    } catch (error) { console.error("Error fetching linked encounters:", error); } 
    finally { setLoadingDetails(false); }
  };

  const handleSave = async () => {
    if (!selectedConn) return;
    try {
      await upsertConnectionProfile(uid, { ...editData, id: selectedConn.id });
      setSelectedConn({ ...selectedConn, ...editData });
      setIsEditing(false);
      fetchConnections();
      alert("Profile Optimized.");
    } catch (e) { alert("Save failed."); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this connection intelligence node?")) return;
    try {
      await deleteConnection(uid, id);
      setSelectedConn(null);
      fetchConnections();
    } catch (e) { alert("Delete failed."); }
  };

  if (selectedConn) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <div className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <button onClick={() => { setSelectedConn(null); setIsEditing(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-black">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-black">
              {isEditing ? (
                <input value={editData.name || ""} onChange={(e) => setEditData({...editData, name: e.target.value})} className="text-2xl font-bold border-b border-black outline-none" />
              ) : (
                <h2 className="text-2xl font-bold tracking-tight">{selectedConn.name}</h2>
              )}
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{selectedConn.jobTitle || 'Clinical/Professional Node'} @ {selectedConn.company || 'Organization'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <button onClick={handleSave} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all">Publish Intel</button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-[#1A1C1E] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all">Optimize Profile</button>
            )}
            <button onClick={() => handleDelete(selectedConn.id)} className="px-6 py-3 border border-red-100 text-red-500 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all">Decommission</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5]"><h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Interaction Timeline</h2></div>
              {loadingDetails ? (
                <div className="p-20 text-center text-[10px] font-black uppercase text-gray-300">Scanning History...</div>
              ) : linkedEncounters.length === 0 ? (
                <div className="p-20 text-center text-[10px] font-black uppercase text-gray-300">No Historical Data</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {linkedEncounters.map((enc) => (
                    <div key={enc.id} className="p-8 hover:bg-gray-50 transition-colors text-black">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{enc.timestamp.toLocaleDateString()} @ {enc.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                          <h4 className="font-bold">{enc.location?.city || "Remote Interaction"}</h4>
                        </div>
                        <div className="flex gap-2">{enc.contextChips?.map(c => <span key={c} className="px-2 py-0.5 bg-gray-100 text-[8px] font-black uppercase text-gray-400 rounded">{c}</span>)}</div>
                      </div>
                      {enc.transcription && <p className="text-sm font-medium text-gray-600 italic border-l-2 border-blue-500 pl-4">"{enc.transcription}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8 text-black">
            <section className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Identity Intelligence</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Email Identity</p>
                  {isEditing ? <input value={editData.email || ""} onChange={(e) => setEditData({...editData, email: e.target.value})} className="w-full text-sm font-bold border-b border-gray-100 outline-none" /> : <p className="text-sm font-bold">{selectedConn.email || "N/A"}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Job/Clinical Role</p>
                  {isEditing ? <input value={editData.jobTitle || ""} onChange={(e) => setEditData({...editData, jobTitle: e.target.value})} className="w-full text-sm font-bold border-b border-gray-100 outline-none" /> : <p className="text-sm font-bold">{selectedConn.jobTitle || "N/A"}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Organization</p>
                  {isEditing ? <input value={editData.company || ""} onChange={(e) => setEditData({...editData, company: e.target.value})} className="w-full text-sm font-bold border-b border-gray-100 outline-none" /> : <p className="text-sm font-bold">{selectedConn.company || "N/A"}</p>}
                </div>
              </div>
            </section>

            <section className="bg-[#1A1C1E] text-white p-8 rounded-xl shadow-lg space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Operational Notes</h2>
              {isEditing ? (
                <textarea value={editData.notes || ""} onChange={(e) => setEditData({...editData, notes: e.target.value})} className="w-full bg-transparent text-xs leading-relaxed text-gray-200 italic outline-none border-b border-white/10 min-h-[100px]" />
              ) : (
                <p className="text-xs leading-relaxed text-gray-400 italic">{selectedConn.notes || "No operational intelligence recorded."}</p>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm text-black flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight uppercase">Connection Intelligence</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Master Rolodex & Reconnect Facilitator</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{connections.length} Established Nodes</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Synchronizing Network Data...</div>
        ) : connections.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white border border-dashed border-gray-200 rounded-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">No Connection Profiles Formed</p>
            <p className="text-xs text-gray-400 mt-2">Link an activity record to establish an intelligence node.</p>
          </div>
        ) : (
          connections.map((conn) => (
            <div key={conn.id} onClick={() => viewDetails(conn)} className="bg-white border border-[#E1E3E5] p-6 rounded-xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
              <div className="space-y-4">
                <div className="space-y-1 text-black">
                  <h3 className="font-bold text-lg">{conn.name}</h3>
                  {conn.company && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{conn.jobTitle} @ {conn.company}</p>}
                </div>
                <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                  <div className="space-y-0.5 text-black">
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Last Activity</p>
                    <p className="text-[10px] font-bold text-gray-500">{conn.lastEncounterAt.toLocaleDateString()}</p>
                  </div>
                  <div className="p-2 bg-gray-50 group-hover:bg-[#1A1C1E] group-hover:text-white rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
