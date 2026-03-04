"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

interface Props {
  ownerUid: string;
}

export default function HandshakeSystem({ ownerUid }: Props) {
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [isExpanded, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasTracked = useRef(false);

  useEffect(() => {
    // Prevent double-tracking in Strict Mode or re-renders
    if (hasTracked.current) return;
    hasTracked.current = true;

    const performGhostScan = async () => {
      try {
        const encountersRef = collection(db, "users", ownerUid, "encounters");
        const docRef = await addDoc(encountersRef, {
          type: "ghost_scan",
          contactName: "Anonymous Scan",
          timestamp: serverTimestamp(),
          isDraft: true,
          location: { city: "Remote Scan" } // Fallback since we don't prompt for GPS here
        });
        setEncounterId(docRef.id);
      } catch (error) {
        console.error("Ghost Scan Error:", error);
      }
    };

    performGhostScan();
  }, [ownerUid]);

  const handleHandshake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encounterId || !name || !contact) return;

    setLoading(true);
    try {
      const docRef = doc(db, "users", ownerUid, "encounters", encounterId);
      await updateDoc(docRef, {
        type: "handshake",
        contactName: name,
        contactInfo: contact,
        isDraft: false
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Handshake Error:", error);
      alert("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full bg-green-50 border border-green-100 p-6 rounded-[2rem] text-center animate-in zoom-in-95 duration-500">
        <p className="text-green-700 font-black uppercase tracking-widest text-[10px]">Handshake Complete</p>
        <p className="text-sm font-bold text-green-900 mt-1">Thanks for connecting!</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {!isExpanded ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full py-4 px-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-bold text-sm hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Share your contact info
        </button>
      ) : (
        <form onSubmit={handleHandshake} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Two-Way Handshake</h3>
            <button type="button" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-black">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="space-y-3">
            <input 
              required
              type="text" 
              placeholder="Your Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-3 bg-gray-50 rounded-xl outline-none font-bold text-sm focus:ring-2 ring-black/5"
            />
            <input 
              required
              type="text" 
              placeholder="Email or LinkedIn URL"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full px-5 py-3 bg-gray-50 rounded-xl outline-none font-bold text-sm focus:ring-2 ring-black/5"
            />
          </div>

          <button 
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
          >
            {loading ? "Syncing..." : "Confirm Connection"}
          </button>
        </form>
      )}
    </div>
  );
}
