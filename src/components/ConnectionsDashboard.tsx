"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp, where } from "firebase/firestore";
import { ConnectionProfile, Encounter } from "@/lib/models";
import { deleteConnection, upsertConnectionProfile, constructMailto } from "@/lib/crm";

interface Props { uid: string; }

export default function ConnectionsDashboard({ uid }: Props) {
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [allEncounters, setAllEncounters] = useState<Encounter[]>([]);
  const [selectedConn, setSelectedConn] = useState<ConnectionProfile | null>(null);
  const [linkedEncounters, setLinkedEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ConnectionProfile>>({});

  useEffect(() => { 
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchConnections(), fetchAllEncounters()]);
      setLoading(false);
    };
    init();
  }, [uid]);

  const convertToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
  };

  const fetchConnections = async () => {
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
  };

  const fetchAllEncounters = async () => {
    try {
      const q = query(collection(db, "users", uid, "encounters"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: convertToDate(doc.data().timestamp),
        loopClosureDate: doc.data().loopClosureDate ? convertToDate(doc.data().loopClosureDate) : null
      })) as Encounter[];
      setAllEncounters(data);
    } catch (e) { console.error("Error fetching all encounters:", e); }
  };

  const viewDetails = async (conn: ConnectionProfile) => {
    await fetchAllEncounters();
    setSelectedConn(conn);
    setEditData({ ...conn });
    const linked = allEncounters.filter(e => e.connectionProfileId === conn.id);
    setLinkedEncounters(linked.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  };

  const handleSave = async () => {
    if (!selectedConn) return;
    try {
      await upsertConnectionProfile(uid, { ...editData, id: selectedConn.id });
      setSelectedConn({ ...selectedConn, ...editData } as ConnectionProfile);
      setIsEditing(false);
      fetchConnections();
      alert("Profile Optimized.");
    } catch (e) { alert("Save failed."); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteConnection(uid, id);
      setSelectedConn(null);
      fetchConnections();
    } catch (e) { alert("Delete failed."); }
  };

  const handleDraftAction = (type: 'update' | 'coffee', conn: ConnectionProfile) => {
    if (!conn.email) {
      alert("No email address found for this connection. Please optimize their profile to add one.");
      return;
    }
    const latest = allEncounters.filter(e => e.connectionProfileId === conn.id)[0];
    const mailto = constructMailto(type, conn, latest);
    if (mailto) window.location.href = mailto;
  };

  const now = new Date();
  const connectionsWithStatus = connections.map(conn => {
    const encounters = allEncounters.filter(e => e.connectionProfileId === conn.id);
    const pendingEncounters = encounters.filter(e => e.loopClosureDate);
    const hasPendingLoop = pendingEncounters.length > 0;
    const earliestLoopDate = pendingEncounters.length > 0 
      ? new Date(Math.min(...pendingEncounters.map(e => e.loopClosureDate!.getTime())))
      : null;
    return { ...conn, hasPendingLoop, earliestLoopDate };
  });

  const needsAttention = connectionsWithStatus.filter(c => c.hasPendingLoop);
  const stableNodes = connectionsWithStatus.filter(c => !c.hasPendingLoop);

  const renderConnectionCard = (conn: any) => (
    <div key={conn.id} className="bg-white border border-[#E1E3E5] rounded-xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col">
      <div className={`absolute top-0 left-0 w-1 h-full transition-opacity ${conn.hasPendingLoop ? 'bg-orange-500 opacity-100' : 'bg-blue-500 opacity-20 group-hover:opacity-100'}`}></div>
      <div onClick={() => viewDetails(conn)} className="p-6 cursor-pointer space-y-4 flex-1">
        <div className="space-y-1 text-black">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg">{conn.name}</h3>
            {conn.hasPendingLoop && (
              <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${conn.earliestLoopDate < now ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-100 text-orange-700'}`}>
                {conn.earliestLoopDate < now ? 'Overdue' : 'Upcoming'}
              </span>
            )}
          </div>
          {conn.company && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{conn.jobTitle} @ {conn.company}</p>}
          {conn.hasPendingLoop && (
            <p className="text-[9px] font-bold text-orange-600 mt-1">
              Loop Deadline: {conn.earliestLoopDate.toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      
      {/* Quick Action Footer */}
      <div className="bg-[#F8F9FA] border-t border-[#E1E3E5] p-3 flex gap-2">
        <button 
          onClick={() => handleDraftAction('update', conn)}
          className="flex-1 py-2 bg-white border border-[#E1E3E5] hover:border-black rounded text-[8px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-all"
        >
          Draft Update
        </button>
        <button 
          onClick={() => handleDraftAction('coffee', conn)}
          className="flex-1 py-2 bg-white border border-[#E1E3E5] hover:border-black rounded text-[8px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-all"
        >
          Invite to Coffee
        </button>
      </div>
    </div>
  );

  if (selectedConn) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <div className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6 text-black">
            <button onClick={() => { setSelectedConn(null); setIsEditing(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
            <div>{isEditing ? <input value={editData.name || ""} onChange={(e) => setEditData({...editData, name: e.target.value})} className="text-2xl font-bold border-b border-black outline-none" /> : <h2 className="text-2xl font-bold tracking-tight">{selectedConn.name}</h2>}<p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{selectedConn.jobTitle || 'Active Contact'} @ {selectedConn.company || 'Organization'}</p></div>
          </div>
          <div className="flex gap-3">
            {isEditing ? <button onClick={handleSave} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all">Publish Intel</button> : <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-[#1A1C1E] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all">Optimize Profile</button>}
            <button onClick={() => handleDelete(selectedConn.id)} className="px-6 py-3 border border-red-100 text-red-500 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all">Decommission</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5] flex justify-between items-center">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Interaction Timeline</h2>
                <div className="flex gap-2">
                  <button onClick={() => handleDraftAction('update', selectedConn)} className="px-3 py-1 bg-[#1A1C1E] text-white rounded text-[8px] font-black uppercase tracking-widest">Update</button>
                  <button onClick={() => handleDraftAction('coffee', selectedConn)} className="px-3 py-1 bg-white border border-gray-200 text-black rounded text-[8px] font-black uppercase tracking-widest">Coffee</button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {linkedEncounters.map((enc) => (
                  <div key={enc.id} className={`p-8 hover:bg-gray-50 transition-colors text-black ${enc.loopClosureDate && enc.loopClosureDate < now ? 'bg-orange-50/20 border-l-4 border-orange-500' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{enc.timestamp.toLocaleDateString()}</p>
                          {enc.loopClosureDate && enc.loopClosureDate < now && <span className="px-2 py-0.5 bg-orange-500 text-white rounded text-[7px] font-black uppercase tracking-widest animate-pulse">Action Required</span>}
                        </div>
                        <h4 className="font-bold">{enc.location?.city || "Remote"}</h4>
                        {enc.loopClosureDate && <p className={`text-[8px] font-black uppercase tracking-tighter ${enc.loopClosureDate < now ? 'text-orange-600' : 'text-gray-400'}`}>Follow-up: {enc.loopClosureDate.toLocaleDateString()}</p>}
                      </div>
                      <div className="flex gap-2">{enc.contextChips?.map(c => <span key={c} className="px-2 py-0.5 bg-gray-100 text-[8px] font-black uppercase text-gray-400 rounded">{c}</span>)}</div>
                    </div>
                    {enc.transcription && <p className="text-sm font-medium text-gray-600 italic border-l-2 border-blue-500 pl-4">"{enc.transcription}"</p>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8 text-black">
            <section className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Identity Intelligence</h2>
              <div className="space-y-4">
                <div className="space-y-1"><p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Email Identity</p>{isEditing ? <input value={editData.email || ""} onChange={(e) => setEditData({...editData, email: e.target.value})} className="w-full text-sm font-bold border-b border-gray-100 outline-none" /> : <p className="text-sm font-bold">{selectedConn.email || "N/A"}</p>}</div>
                <div className="space-y-1"><p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Phone Identity</p>{isEditing ? <input value={editData.phone || ""} onChange={(e) => setEditData({...editData, phone: e.target.value})} className="w-full text-sm font-bold border-b border-gray-100 outline-none" /> : <p className="text-sm font-bold">{selectedConn.phone || "N/A"}</p>}</div>
                <div className="space-y-1"><p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">LinkedIn Identity</p>{isEditing ? <input value={editData.linkedIn || ""} onChange={(e) => setEditData({...editData, linkedIn: e.target.value})} className="w-full text-sm font-bold border-b border-gray-100 outline-none" /> : <a href={selectedConn.linkedIn} target="_blank" className="text-sm font-bold text-blue-600 underline">View Profile</a>}</div>
              </div>
            </section>
            <section className="bg-[#1A1C1E] text-white p-8 rounded-xl shadow-lg space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Operational Notes</h2>
              {isEditing ? <textarea value={editData.notes || ""} onChange={(e) => setEditData({...editData, notes: e.target.value})} className="w-full bg-transparent text-xs leading-relaxed text-gray-200 italic outline-none border-b border-white/10 min-h-[100px]" /> : <p className="text-xs leading-relaxed text-gray-400 italic">{selectedConn.notes || "No operational records."}</p>}
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm text-black flex justify-between items-center">
        <div><h2 className="text-xl font-bold tracking-tight uppercase">Connection Intelligence</h2><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Master Rolodex & Prioritized Pipeline</p></div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{connections.length} Nodes Synchronized</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 ml-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>Needs Attention: Loop Closure</h3>
          <div className="space-y-4">{loading ? <div className="py-10 text-center text-[10px] font-black text-gray-300">Scanning Database...</div> : needsAttention.length === 0 ? <div className="py-10 text-center border border-dashed border-gray-200 rounded-xl text-[10px] font-black text-gray-300 uppercase tracking-widest">Pipeline Clear</div> : needsAttention.map(renderConnectionCard)}</div>
        </div>
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500/20"></span>Stable Nodes: Established</h3>
          <div className="space-y-4">{loading ? <div className="py-10 text-center text-[10px] font-black text-gray-300">Scanning Database...</div> : stableNodes.length === 0 ? <div className="py-10 text-center border border-dashed border-gray-200 rounded-xl text-[10px] font-black text-gray-300 uppercase tracking-widest">No Active Nodes</div> : stableNodes.map(renderConnectionCard)}</div>
        </div>
      </div>
    </div>
  );
}
