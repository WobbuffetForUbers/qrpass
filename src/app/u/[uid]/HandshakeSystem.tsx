"use client";

import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface Props {
  ownerUid: string;
  bookingUrl?: string;
}

export default function HandshakeSystem({ ownerUid, bookingUrl }: Props) {
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [isExpanded, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [other, setOther] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasTracked = useRef(false);

  const parseUserAgent = () => {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";
    let deviceType = "Desktop";

    if (/mobi/i.test(ua)) deviceType = "Mobile";
    if (/tablet/i.test(ua)) deviceType = "Tablet";

    if (/chrome|crios/i.test(ua)) browser = "Chrome";
    else if (/firefox|iceweasel/i.test(ua)) browser = "Firefox";
    else if (/safari/i.test(ua)) browser = "Safari";
    else if (/edge/i.test(ua)) browser = "Edge";

    if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
    else if (/android/i.test(ua)) os = "Android";
    else if (/windows/i.test(ua)) os = "Windows";
    else if (/mac/i.test(ua)) os = "macOS";
    else if (/linux/i.test(ua)) os = "Linux";

    return { browser, os, deviceType };
  };

  useEffect(() => {
    // Only track if we haven't tracked yet this session
    if (hasTracked.current) return;

    // We need to wait for auth state to determine if current user is owner
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // SUPPRESS GHOST SCAN IF VIEWER IS THE OWNER
      if (currentUser && currentUser.uid === ownerUid) {
        console.log("Suppressing Ghost Scan: Viewer is the owner.");
        hasTracked.current = true;
        return;
      }

      if (hasTracked.current) return;
      hasTracked.current = true;

      const performGhostScan = async () => {
        try {
          const { browser, os, deviceType } = parseUserAgent();
          const referrer = document.referrer ? new URL(document.referrer).hostname : "Direct Link";
          
          const encountersRef = collection(db, "users", ownerUid, "encounters");
          const docRef = await addDoc(encountersRef, {
            type: "ghost_scan",
            contactName: "Anonymous Scan",
            timestamp: serverTimestamp(),
            isDraft: true,
            scannedUserId: null,
            location: { city: "Remote Scan" },
            browser,
            os,
            deviceType,
            referrer,
            userAgent: navigator.userAgent
          });
          setEncounterId(docRef.id);
        } catch (error: any) {
          console.error("GHOST SCAN ERROR:", error.code, error.message);
        }
      };

      performGhostScan();
    });

    return () => unsubscribe();
  }, [ownerUid]);

  const handleHandshake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encounterId) {
      // If no encounterId exists (e.g. owner trying to test the form), create a temporary handshake
      const encountersRef = collection(db, "users", ownerUid, "encounters");
      const tempDoc = await addDoc(encountersRef, {
        type: "handshake",
        contactName: name,
        contactEmail: email,
        contactPhone: phone,
        contactOther: other,
        reason: reason,
        timestamp: serverTimestamp(),
        isDraft: false,
        location: { city: "Owner Test" }
      });
      setSubmitted(true);
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, "users", ownerUid, "encounters", encounterId);
      await updateDoc(docRef, {
        type: "handshake",
        contactName: name,
        contactEmail: email,
        contactPhone: phone,
        contactOther: other,
        reason: reason,
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
      <div className="w-full bg-white border border-[#E1E3E5] p-10 rounded-[3rem] text-center animate-in zoom-in-95 duration-500 shadow-xl space-y-6">
        <div className="space-y-2">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-[#1A1C1E] font-black uppercase tracking-widest text-sm">Handshake Complete</p>
          <p className="text-gray-500 font-medium">Your contact intelligence has been synchronized.</p>
        </div>

        {bookingUrl && (
          <div className="pt-6 border-t border-gray-50 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Next Operation</p>
            <h4 className="font-bold text-lg text-black">Ready for a deep dive?</h4>
            <a 
              href={bookingUrl.startsWith("http") ? bookingUrl : `https://${bookingUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-[#1A1C1E] text-white rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
            >
              Schedule a Chat →
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {!isExpanded ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full py-5 px-8 bg-white border border-[#E1E3E5] rounded-[2.5rem] text-black font-black text-sm uppercase tracking-widest hover:border-black transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
          Share your contact info
        </button>
      ) : (
        <form onSubmit={handleHandshake} className="bg-white border border-[#E1E3E5] p-10 rounded-[3rem] shadow-2xl space-y-6 animate-in slide-in-from-top-4 duration-500 text-left">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Contact Exchange</h3>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Secure Handshake Protocol</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-black transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Full Name</label>
              <input required type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-3 bg-[#F8F9FA] rounded-xl outline-none font-bold text-sm text-black border border-transparent focus:border-black/10 transition-all" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Email</label>
                <input type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3 bg-[#F8F9FA] rounded-xl outline-none font-bold text-sm text-black border border-transparent focus:border-black/10 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Phone</label>
                <input type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-5 py-3 bg-[#F8F9FA] rounded-xl outline-none font-bold text-sm text-black border border-transparent focus:border-black/10 transition-all" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-1">LinkedIn or Other</label>
              <input type="text" placeholder="linkedin.com/in/johndoe" value={other} onChange={(e) => setOther(e.target.value)} className="w-full px-5 py-3 bg-[#F8F9FA] rounded-xl outline-none font-bold text-sm text-black border border-transparent focus:border-black/10 transition-all" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Reason for Connecting</label>
              <textarea placeholder="I'd love to discuss your latest research..." value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-5 py-3 bg-[#F8F9FA] rounded-xl outline-none font-medium text-sm text-black border border-transparent focus:border-black/10 transition-all resize-none" rows={3} />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full py-5 bg-[#1A1C1E] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black hover:scale-[1.01] active:scale-95 transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? "Establishing Connection..." : "Confirm Secure Handshake"}
          </button>
        </form>
      )}
    </div>
  );
}
