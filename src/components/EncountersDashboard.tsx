"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { Encounter } from "@/lib/models";
import { updateEncounter } from "@/lib/crm";
import FrictionlessCaptureModal from "./FrictionlessCaptureModal";

interface Props { uid: string; }

export default function EncountersDashboard({ uid }: Props) {
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => { fetchEncounters(); }, [uid]);

  const fetchEncounters = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users", uid, "encounters"), orderBy("timestamp", "desc"), limit(30));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: (doc.data().timestamp as Timestamp)?.toDate() || new Date()
      }));
      setEncounters(data);
    } catch (error) { console.error("Error fetching encounters:", error); } 
    finally { setLoading(false); }
  };

  const startEdit = (encounter: any) => {
    setEditingId(encounter.id);
    setEditData({ ...encounter });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await updateEncounter(uid, editingId, editData);
      setEditingId(null);
      fetchEncounters();
    } catch (e) { alert("Update failed."); }
  };

  const getStatusBadge = (encounter: any) => {
    switch (encounter.type) {
      case 'handshake': return <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded text-[8px] font-black uppercase tracking-widest">Handshake</span>;
      case 'ghost_scan': return <span className="px-2 py-0.5 bg-gray-50 text-gray-400 border border-gray-100 rounded text-[8px] font-black uppercase tracking-widest">Silent Scan</span>;
      default: return <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[8px] font-black uppercase tracking-widest">Manual Log</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm text-black">
        <div>
          <h2 className="text-xl font-bold tracking-tight uppercase">Relationship Manager</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Archives & Interaction Intelligence</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg">+ Log New Encounter</button>
      </div>

      <div className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm text-black">
        <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5]"><h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Activity Ledger</h2></div>
        
        {loading ? (
          <div className="p-20 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Retrieving Records...</div>
        ) : encounters.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">No Encounters Logged</p>
            <button onClick={() => setIsModalOpen(true)} className="text-xs font-bold text-blue-600 underline tracking-tight uppercase">Start Log</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {encounters.map((encounter) => (
              <div key={encounter.id} className="p-8 hover:bg-gray-50 transition-colors group">
                {editingId === encounter.id ? (
                  <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input value={editData.contactName || ""} onChange={(e) => setEditData({...editData, contactName: e.target.value})} placeholder="Contact Name" className="w-full px-4 py-2 bg-white border border-gray-200 rounded font-bold text-sm" />
                      <input value={editData.contactInfo || ""} onChange={(e) => setEditData({...editData, contactInfo: e.target.value})} placeholder="Email/LinkedIn" className="w-full px-4 py-2 bg-white border border-gray-200 rounded font-bold text-sm" />
                    </div>
                    <textarea value={editData.transcription || ""} onChange={(e) => setEditData({...editData, transcription: e.target.value})} placeholder="Notes/Transcription" className="w-full px-4 py-2 bg-white border border-gray-200 rounded text-sm min-h-[80px] resize-none" />
                    <div className="flex gap-2">
                      <button onClick={handleUpdate} className="px-4 py-2 bg-black text-white rounded text-[10px] font-black uppercase tracking-widest">Save Changes</button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-100 text-gray-400 rounded text-[10px] font-black uppercase tracking-widest">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{encounter.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          {getStatusBadge(encounter)}
                        </div>
                        <h3 className="text-lg font-bold text-[#1A1C1E]">{encounter.contactName || (encounter.location?.city || "Anonymous Scan")}</h3>
                        {encounter.contactInfo && <p className="text-xs font-bold text-blue-600 lowercase tracking-tight">{encounter.contactInfo}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-wrap gap-2">
                          {encounter.contextChips?.map((chip: string) => <span key={chip} className="px-3 py-1 bg-gray-100 text-[9px] font-black uppercase tracking-tighter text-gray-500 rounded-md">{chip}</span>)}
                        </div>
                        <button onClick={() => startEdit(encounter)} className="p-2 text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      </div>
                    </div>
                    {encounter.transcription && <div className="p-4 bg-[#F8F9FA] rounded-lg border-l-4 border-blue-500"><p className="text-sm font-medium text-gray-600 italic leading-relaxed">"{encounter.transcription}"</p></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <FrictionlessCaptureModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchEncounters(); }} />
    </div>
  );
}
