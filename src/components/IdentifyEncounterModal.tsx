"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { ConnectionProfile } from "@/lib/models";
import { upsertConnectionProfile, linkEncounterToProfile } from "@/lib/crm";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  encounter: any;
  onSuccess: () => void;
}

export default function IdentifyEncounterModal({ isOpen, onClose, uid, encounter, onSuccess }: Props) {
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'select' | 'new'>('select');
  const [newName, setNewName] = useState(encounter?.contactName || "");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConnections();
      setNewName(encounter?.contactName || "");
    }
  }, [isOpen, encounter]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users", uid, "connections"), orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ConnectionProfile[];
      setConnections(data);
      if (data.length === 0) setMode('new');
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExisting = async (profileId: string) => {
    setIsProcessing(true);
    try {
      await linkEncounterToProfile(uid, encounter.id, profileId);
      
      const existing = connections.find(c => c.id === profileId);
      if (existing) {
        const updates: any = { id: profileId };
        
        // Update contact details if they are missing in the profile but present in the handshake
        if (!existing.email && encounter.contactEmail) updates.email = encounter.contactEmail;
        if (!existing.phone && encounter.contactPhone) updates.phone = encounter.contactPhone;
        
        // Handle LinkedIn/Other logic
        const handshakeLinkedIn = encounter.contactOther || (encounter.contactInfo?.includes("linkedin.com") ? encounter.contactInfo : undefined);
        if (!existing.linkedIn && handshakeLinkedIn) updates.linkedIn = handshakeLinkedIn;

        // Merge notes if there's a reason or new context
        if (encounter.reason || encounter.transcription) {
          const newContext = encounter.reason ? `\n\n[Handshake Reason]: ${encounter.reason}` : "";
          const newNotes = encounter.transcription ? `\n\n[Encounter Notes]: ${encounter.transcription}` : "";
          updates.notes = (existing.notes || "") + newContext + newNotes;
        }

        await upsertConnectionProfile(uid, updates);
      }
      onSuccess();
      onClose();
    } catch (e) {
      alert("Linking failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    setIsProcessing(true);
    try {
      // Robust auto-population from handshake data
      const email = encounter.contactEmail || (encounter.contactInfo?.includes("@") ? encounter.contactInfo : undefined);
      const phone = encounter.contactPhone || undefined;
      const linkedIn = encounter.contactOther || (encounter.contactInfo?.includes("linkedin.com") ? encounter.contactInfo : undefined);
      
      let initialNotes = encounter.transcription || `Initial encounter recorded in ${encounter.location?.city || "Unknown Location"}.`;
      if (encounter.reason) {
        initialNotes += `\n\n[Reason for Connecting]: ${encounter.reason}`;
      }

      const profileId = await upsertConnectionProfile(uid, {
        name: newName,
        email: email,
        phone: phone,
        linkedIn: linkedIn,
        notes: initialNotes
      });
      
      await linkEncounterToProfile(uid, encounter.id, profileId);
      onSuccess();
      onClose();
    } catch (e) {
      alert("Creation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 text-black text-left">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Identify Intel Node</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Map interaction to professional identity</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setMode('select')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'select' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
            >
              Existing Profile
            </button>
            <button 
              onClick={() => setMode('new')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'new' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
            >
              New Profile
            </button>
          </div>

          {mode === 'select' ? (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {loading ? (
                <div className="py-10 text-center text-[10px] font-black uppercase text-gray-300 tracking-widest">Scanning Database...</div>
              ) : connections.length === 0 ? (
                <div className="py-10 text-center text-xs font-bold text-gray-400">No profiles found. Switch to "New Profile".</div>
              ) : (
                connections.map(conn => (
                  <button 
                    key={conn.id}
                    disabled={isProcessing}
                    onClick={() => handleLinkExisting(conn.id)}
                    className="w-full p-4 bg-gray-50 hover:bg-black hover:text-white rounded-2xl text-left transition-all group flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-sm">{conn.name}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-60">{conn.company || "Independent"}</p>
                    </div>
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateNew} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Establish Primary Name</label>
                <input 
                  required
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Dr. John Smith"
                  className="w-full px-5 py-3 bg-[#F8F9FA] rounded-xl outline-none font-bold text-sm border border-transparent focus:border-black/10 transition-all text-black"
                />
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Intelligence Detected</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {encounter.contactEmail && <p className="text-gray-600 truncate">📧 {encounter.contactEmail}</p>}
                  {encounter.contactPhone && <p className="text-gray-600 truncate">📞 {encounter.contactPhone}</p>}
                  {encounter.reason && <p className="text-gray-600 truncate col-span-2 italic">💬 {encounter.reason.substring(0, 40)}...</p>}
                </div>
              </div>
              <p className="text-[9px] text-gray-400 leading-relaxed italic">
                Initializing a new profile will auto-populate the email, phone, and reason fields from the handshake.
              </p>
              <button 
                disabled={isProcessing}
                className="w-full py-4 bg-[#1A1C1E] text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
              >
                {isProcessing ? "Synchronizing..." : "Initialize Identity Node"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
