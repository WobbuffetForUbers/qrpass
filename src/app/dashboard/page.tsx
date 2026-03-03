"use client";

import { useEffect, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { UserProfile, Link as ProfileLink, DesignPrefs, CVHighlight } from "@/lib/models";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setError("Profile not found in database. Please try logging in again.");
          }
        } else {
          router.push("/login");
        }
      } catch (err: any) {
        console.error("Dashboard Load Error:", err);
        setError(err.message || "Failed to connect to the database.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Max 5MB.");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${profile.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setProfile({ ...profile, avatarUrl: url });
      const docRef = doc(db, "users", profile.uid);
      await updateDoc(docRef, { avatarUrl: url });
    } catch (err: any) {
      console.error("Upload Error:", err);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const docRef = doc(db, "users", profile.uid);
      await updateDoc(docRef, {
        displayName: profile.displayName,
        bio: profile.bio,
        jobTitle: profile.jobTitle || "",
        company: profile.company || "",
        phone: profile.phone || "",
        email: profile.email || "",
        avatarUrl: profile.avatarUrl || "",
        bookingUrl: profile.bookingUrl || "",
        cvHighlights: profile.cvHighlights || [],
        links: profile.links,
        designPrefs: profile.designPrefs,
        isPremium: profile.isPremium
      });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Update Error:", error);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const togglePremium = async () => {
    if (!profile) return;
    const newStatus = !profile.isPremium;
    setProfile({ ...profile, isPremium: newStatus });
    try {
      const docRef = doc(db, "users", profile.uid);
      await updateDoc(docRef, { isPremium: newStatus });
    } catch (e) {
      console.error("Premium Update Error:", e);
    }
  };

  const updateDesign = (field: keyof DesignPrefs, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      designPrefs: { ...profile.designPrefs, [field]: value }
    });
  };

  const addCVHighlight = () => {
    if (!profile) return;
    const currentHighlights = profile.cvHighlights || [];
    if (currentHighlights.length >= 3) {
      alert("Maximum 3 highlights allowed.");
      return;
    }
    setProfile({
      ...profile,
      cvHighlights: [...currentHighlights, { title: "", description: "", link: "" }]
    });
  };

  const updateCVHighlight = (index: number, field: keyof CVHighlight, value: string) => {
    if (!profile || !profile.cvHighlights) return;
    const newHighlights = [...profile.cvHighlights];
    newHighlights[index] = { ...newHighlights[index], [field]: value };
    setProfile({ ...profile, cvHighlights: newHighlights });
  };

  const removeCVHighlight = (index: number) => {
    if (!profile || !profile.cvHighlights) return;
    const newHighlights = profile.cvHighlights.filter((_, i) => i !== index);
    setProfile({ ...profile, cvHighlights: newHighlights });
  };

  const addLink = () => {
    if (!profile) return;
    setProfile({ ...profile, links: [...profile.links, { label: "", url: "" }] });
  };

  const updateLink = (index: number, field: keyof ProfileLink, value: string) => {
    if (!profile) return;
    const newLinks = [...profile.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setProfile({ ...profile, links: newLinks });
  };

  const removeLink = (index: number) => {
    if (!profile) return;
    const newLinks = profile.links.filter((_, i) => i !== index);
    setProfile({ ...profile, links: newLinks });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-black bg-white">Loading Editor...</div>;
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white text-black font-sans">
      <h2 className="text-2xl font-black text-red-600 uppercase tracking-tighter">Dashboard Error</h2>
      <p className="text-gray-500 max-w-sm font-medium">{error}</p>
      <button onClick={() => router.push("/login")} className="px-10 py-4 bg-black text-white rounded-full font-black uppercase tracking-widest text-xs">Back to Login</button>
    </div>
  );
  if (!profile) return null;

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${profile.uid}`;

  return (
    <main className="min-h-screen bg-gray-50 text-black p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Editor</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Digital Identity Dashboard</p>
          </div>
          <div className="flex gap-4">
            <Link href={`/u/${profile.uid}`} className="px-8 py-3 border-2 border-black rounded-full font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all">View Public Card</Link>
            <button onClick={() => signOut(auth)} className="px-8 py-3 bg-gray-100 rounded-full font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all">Sign Out</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Info */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Profile & Contact</h2>
              
              <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[2rem]">
                <div className="relative w-24 h-24 bg-gray-200 rounded-[2rem] overflow-hidden flex-shrink-0 shadow-inner">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-300">{profile.displayName.charAt(0)}</div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="sr-only">Choose photo</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer uppercase tracking-widest" />
                  </label>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Square photos look best (max 5mb)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Name</label>
                  <input type="text" value={profile.displayName} onChange={(e) => setProfile({...profile, displayName: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold focus:ring-2 ring-black/5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Job Title</label>
                  <input type="text" value={profile.jobTitle || ""} onChange={(e) => setProfile({...profile, jobTitle: e.target.value})} placeholder="e.g. Quality Improvement Specialist" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold focus:ring-2 ring-black/5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Company</label>
                  <input type="text" value={profile.company || ""} onChange={(e) => setProfile({...profile, company: e.target.value})} placeholder="e.g. Mayo Clinic" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold focus:ring-2 ring-black/5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Phone</label>
                  <input type="tel" value={profile.phone || ""} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold focus:ring-2 ring-black/5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email</label>
                  <input type="email" value={profile.email || ""} onChange={(e) => setProfile({...profile, email: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold focus:ring-2 ring-black/5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Scheduling Link (e.g. Calendly)</label>
                  <input type="text" value={profile.bookingUrl || ""} onChange={(e) => setProfile({...profile, bookingUrl: e.target.value})} placeholder="https://calendly.com/yourname" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold focus:ring-2 ring-black/5" />
                </div>
              </div>
            </div>

            {/* CV Highlights Section */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">CV Highlights (Max 3)</h2>
                {(profile.cvHighlights || []).length < 3 && (
                  <button onClick={addCVHighlight} className="p-3 bg-black text-white rounded-[1rem] hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {(profile.cvHighlights || []).map((highlight, index) => (
                  <div key={index} className="p-6 bg-gray-50 rounded-[2rem] border border-transparent hover:border-gray-200 transition-all space-y-4 relative group">
                    <button onClick={() => removeCVHighlight(index)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="grid grid-cols-1 gap-4">
                      <input placeholder="Highlight Title (e.g. Sepsis Protocol Optimization)" value={highlight.title} onChange={(e) => updateCVHighlight(index, 'title', e.target.value)} className="w-full bg-transparent font-black text-lg outline-none placeholder:text-gray-300" />
                      <textarea placeholder="Description of your achievement..." value={highlight.description} rows={2} onChange={(e) => updateCVHighlight(index, 'description', e.target.value)} className="w-full bg-transparent font-medium text-sm text-gray-500 outline-none resize-none placeholder:text-gray-300" />
                      <div className="flex items-center gap-2 text-blue-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <input placeholder="Resource Link (Publication, Project URL)" value={highlight.link} onChange={(e) => updateCVHighlight(index, 'link', e.target.value)} className="flex-1 bg-transparent text-xs font-bold outline-none placeholder:text-blue-200" />
                      </div>
                    </div>
                  </div>
                ))}
                {(profile.cvHighlights || []).length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[2rem] text-gray-300 font-bold uppercase tracking-widest text-[10px]">No highlights added yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* QR Card */}
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Identity QR</h2>
              <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl border border-gray-50">
                <QRCodeCanvas value={publicUrl} size={160} level="H" includeMargin={true} />
              </div>
              <p className="text-[10px] font-black text-gray-400 max-w-[160px] leading-tight uppercase tracking-tighter">Your public card is always one scan away</p>
            </div>

            {/* Design Controls */}
            <div className={`bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6 transition-all ${!profile.isPremium ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Design System</h2>
                {!profile.isPremium && <span className="px-3 py-1 bg-black text-white text-[8px] font-black rounded-full uppercase tracking-widest">Locked</span>}
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Theme Style</label>
                  <select value={profile.designPrefs.theme} onChange={(e) => updateDesign('theme', e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs appearance-none cursor-pointer">
                    <option value="minimal">Minimal</option><option value="bold">High Contrast</option><option value="dark">Midnight</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Accent Color</label>
                  <div className="flex gap-3">
                    <input type="color" value={profile.designPrefs.accentColor} onChange={(e) => updateDesign('accentColor', e.target.value)} className="w-14 h-14 rounded-2xl border-none p-0 cursor-pointer overflow-hidden shadow-sm" />
                    <input type="text" value={profile.designPrefs.accentColor} onChange={(e) => updateDesign('accentColor', e.target.value)} className="flex-1 px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* Save & Actions */}
            <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl space-y-6">
              <button onClick={handleSave} disabled={saving} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50">{saving ? "Saving Changes..." : "Publish Updates"}</button>
              <button onClick={togglePremium} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${profile.isPremium ? 'bg-gray-800 text-gray-500' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {profile.isPremium ? "Member: PRO" : "Upgrade to Pro"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
