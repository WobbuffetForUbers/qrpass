"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { Encounter } from "@/lib/models";
import { updateEncounter, deleteEncounter } from "@/lib/crm";
import FrictionlessCaptureModal from "./FrictionlessCaptureModal";
import IdentifyEncounterModal from "./IdentifyEncounterModal";

interface Props { uid: string; }

export default function EncountersDashboard({ uid }: Props) {
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIdentifyModalOpen, setIsIdentifyModalOpen] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => { fetchEncounters(); }, [uid]);

  const convertToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
  };

  const fetchEncounters = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users", uid, "encounters"), orderBy("timestamp", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: convertToDate(doc.data().timestamp),
        loopClosureDate: doc.data().loopClosureDate ? convertToDate(doc.data().loopClosureDate) : null
      }));
      setEncounters(data);
    } catch (error) { console.error("Error fetching encounters:", error); } 
    finally { setLoading(false); }
  };

  const startEdit = (encounter: any) => {
    setEditingId(encounter.id);
    const formattedDate = encounter.loopClosureDate ? encounter.loopClosureDate.toISOString().split('T')[0] : "";
    setEditData({ ...encounter, loopClosureDate: formattedDate });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      const finalData = {
        ...editData,
        loopClosureDate: editData.loopClosureDate ? new Date(editData.loopClosureDate) : null
      };
      await updateEncounter(uid, editingId, finalData);
      setEditingId(null);
      fetchEncounters();
    } catch (e) { alert("Update failed."); }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Confirm removal of this activity record?")) return;
    try {
      await deleteEncounter(uid, id);
      fetchEncounters();
    } catch (e) { alert("Delete failed."); }
  };

  const openIdentify = (encounter: any) => {
    setSelectedEncounter(encounter);
    setIsIdentifyModalOpen(true);
  };

  const getStatusBadge = (encounter: any) => {
    switch (encounter.type) {
      case 'handshake': return <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded text-[8px] font-black uppercase tracking-widest">Handshake</span>;
      case 'ghost_scan': return <span className="px-2 py-0.5 bg-gray-50 text-gray-400 border border-gray-100 rounded text-[8px] font-black uppercase tracking-widest">Silent Scan</span>;
      default: return <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[8px] font-black uppercase tracking-widest">Manual Log</span>;
    }
  };

  const now = new Date();
  const needsFollowUp = encounters.filter(e => e.loopClosureDate && e.loopClosureDate < now);
  const okEncounters = encounters.filter(e => !e.loopClosureDate || e.loopClosureDate >= now);

  const renderEncounterCard = (encounter: any) => (
    <div key={encounter.id} className={`p-8 hover:bg-gray-50 transition-colors group ${encounter.loopClosureDate && encounter.loopClosureDate < now ? 'border-l-4 border-orange-500 bg-orange-50/30' : ''}`}>
      {editingId === encounter.id ? (
        <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black text-left">
            <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-400">Full Name</label><input value={editData.contactName || ""} onChange={(e) => setEditData({...editData, contactName: e.target.value})} className="w-full px-4 py-2 bg-white border border-gray-200 rounded font-bold text-sm" /></div>
            <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-400">Email</label><input value={editData.contactEmail || ""} onChange={(e) => setEditData({...editData, contactEmail: e.target.value})} className="w-full px-4 py-2 bg-white border border-gray-200 rounded font-bold text-sm" /></div>
            <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-400">Phone</label><input value={editData.contactPhone || ""} onChange={(e) => setEditData({...editData, contactPhone: e.target.value})} className="w-full px-4 py-2 bg-white border border-gray-200 rounded font-bold text-sm" /></div>
            <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-400">LinkedIn/Other</label><input value={editData.contactOther || ""} onChange={(e) => setEditData({...editData, contactOther: e.target.value})} className="w-full px-4 py-2 bg-white border border-gray-200 rounded font-bold text-sm" /></div>
          </div>
          <div className="space-y-1 text-black text-left">
            <label className="text-[8px] font-black uppercase text-gray-400">Reason for Connecting</label>
            <textarea value={editData.reason || ""} onChange={(e) => setEditData({...editData, reason: e.target.value})} className="w-full px-4 py-2 bg-white border border-gray-200 rounded text-sm min-h-[60px] resize-none" />
          </div>
          <div className="space-y-1 text-black text-left">
            <label className="text-[8px] font-black uppercase text-gray-400">Follow-up Reminder</label>
            <input type="date" value={editData.loopClosureDate || ""} onChange={(e) => setEditData({...editData, loopClosureDate: e.target.value})} className="w-full px-4 py-2 bg-white border border-gray-200 rounded text-sm font-bold" />
          </div>
          <div className="space-y-1 text-black text-left">
            <label className="text-[8px] font-black uppercase text-gray-400">General Notes</label>
            <textarea value={editData.transcription || ""} onChange={(e) => setEditData({...editData, transcription: e.target.value})} placeholder="Notes/Transcription" className="w-full px-4 py-2 bg-white border border-gray-200 rounded text-sm min-h-[80px] resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleUpdate} className="px-4 py-2 bg-black text-white rounded text-[10px] font-black uppercase tracking-widest">Save Changes</button>
            <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-100 text-gray-400 rounded text-[10px] font-black uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-black text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{encounter.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                {getStatusBadge(encounter)}
                {encounter.connectionProfileId && <span className="px-2 py-0.5 bg-blue-900 text-white rounded text-[8px] font-black uppercase tracking-widest">Linked to Intel</span>}
                {encounter.loopClosureDate && encounter.loopClosureDate < now && <span className="px-2 py-0.5 bg-orange-500 text-white rounded text-[8px] font-black uppercase tracking-widest animate-pulse">ACTION REQUIRED</span>}
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#1A1C1E]">{encounter.contactName || (encounter.location?.city || "Anonymous Scan")}</h3>
                {encounter.type === 'ghost_scan' && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[7px] font-black uppercase">{encounter.os}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[7px] font-black uppercase">{encounter.browser}</span>
                    {encounter.referrer && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-400 rounded text-[7px] font-black uppercase tracking-tighter">via {encounter.referrer}</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {encounter.contactEmail && <p className="text-[10px] font-bold text-blue-600 lowercase">{encounter.contactEmail}</p>}
                {encounter.contactPhone && <p className="text-[10px] font-bold text-gray-500">{encounter.contactPhone}</p>}
                {encounter.contactOther && <p className="text-[10px] font-bold text-gray-400">{encounter.contactOther}</p>}
              </div>
              {encounter.reason && <p className="text-xs font-medium text-gray-600 mt-2 border-l-2 border-gray-100 pl-3 py-1 bg-gray-50/50 rounded-r-lg">Reason: {encounter.reason}</p>}
              {encounter.loopClosureDate && (
                <p className={`text-[9px] font-black uppercase tracking-tighter ${encounter.loopClosureDate < now ? 'text-orange-600' : 'text-gray-400'}`}>
                  Loop Closure: {encounter.loopClosureDate.toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {encounter.contextChips?.map((chip: string) => <span key={chip} className="px-3 py-1 bg-gray-100 text-[9px] font-black uppercase tracking-tighter text-gray-500 rounded-md">{chip}</span>)}
              </div>
              <div className="flex items-center gap-2">
                {!encounter.connectionProfileId && (
                  <button onClick={() => openIdentify(encounter)} className="px-3 py-1 bg-white border border-[#E1E3E5] hover:border-black rounded text-[9px] font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100">Identify & Profile</button>
                )}
                <button onClick={() => startEdit(encounter)} className="p-2 text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                <button onClick={() => handleDeleteRecord(encounter.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            </div>
          </div>
          {encounter.transcription && <div className="p-4 bg-[#F8F9FA] rounded-lg border-l-4 border-blue-500"><p className="text-sm font-medium text-gray-600 italic leading-relaxed">"{encounter.transcription}"</p></div>}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm text-black">
        <div className="text-left">
          <h2 className="text-xl font-bold tracking-tight uppercase">Relationship Manager</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Archives & Interaction Intelligence</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg">+ Log New Encounter</button>
      </div>

      {loading ? (
        <div className="p-20 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 bg-white border border-[#E1E3E5] rounded-xl shadow-sm">Retrieving Records...</div>
      ) : encounters.length === 0 ? (
        <div className="p-20 text-center space-y-4 bg-white border border-[#E1E3E5] rounded-xl shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">No Encounters Logged</p>
          <button onClick={() => setIsModalOpen(true)} className="text-xs font-bold text-blue-600 underline tracking-tight uppercase">Start Log</button>
        </div>
      ) : (
        <div className="space-y-10">
          {needsFollowUp.length > 0 && (
            <div className="bg-white border border-orange-100 rounded-xl overflow-hidden shadow-md">
              <div className="bg-orange-50 px-8 py-4 border-b border-orange-100 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700 font-sans">Attention Required: Close the Loop</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {needsFollowUp.map(renderEncounterCard)}
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5] text-left">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Activity Ledger</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {okEncounters.map(renderEncounterCard)}
            </div>
          </div>
        </div>
      )}
      
      <FrictionlessCaptureModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchEncounters(); }} />
      <IdentifyEncounterModal 
        isOpen={isIdentifyModalOpen} 
        onClose={() => setIsIdentifyModalOpen(false)} 
        uid={uid} 
        encounter={selectedEncounter} 
        onSuccess={fetchEncounters} 
      />
    </div>
  );
}
