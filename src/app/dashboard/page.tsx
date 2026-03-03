"use client";

import { useEffect, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { UserProfile, Link as ProfileLink, DesignPrefs, CVHighlight, QIProject } from "@/lib/models";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pmidString, setPmidString] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            if (data.pubmedIds) {
              setPmidString(data.pubmedIds.join(", "));
            }
          } else {
            setError("Profile not found in database.");
          }
        } else {
          router.push("/login");
        }
      } catch (err: any) {
        console.error("Dashboard Load Error:", err);
        setError(err.message || "Connection failed.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${profile.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setProfile({ ...profile, avatarUrl: url });
      await updateDoc(doc(db, "users", profile.uid), { avatarUrl: url });
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    
    const pubmedIds = pmidString.split(",").map(id => id.trim()).filter(id => id !== "");

    try {
      await updateDoc(doc(db, "users", profile.uid), {
        displayName: profile.displayName,
        bio: profile.bio,
        jobTitle: profile.jobTitle || "",
        company: profile.company || "",
        phone: profile.phone || "",
        email: profile.email || "",
        avatarUrl: profile.avatarUrl || "",
        bookingUrl: profile.bookingUrl || "",
        cvHighlights: profile.cvHighlights || [],
        qiProjects: profile.qiProjects || [],
        showQiProjects: profile.showQiProjects || false,
        githubUsername: profile.githubUsername || "",
        pubmedIds: pubmedIds,
        links: profile.links,
        designPrefs: profile.designPrefs,
        isPremium: profile.isPremium
      });
      alert("Updates Published.");
    } catch (error) {
      alert("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const togglePremium = async () => {
    if (!profile) return;
    const newStatus = !profile.isPremium;
    setProfile({ ...profile, isPremium: newStatus });
    try {
      await updateDoc(doc(db, "users", profile.uid), { isPremium: newStatus });
    } catch (e) {}
  };

  const toggleQI = async () => {
    if (!profile) return;
    const newStatus = !profile.showQiProjects;
    setProfile({ ...profile, showQiProjects: newStatus });
    try {
      await updateDoc(doc(db, "users", profile.uid), { showQiProjects: newStatus });
    } catch (e) {}
  };

  const updateDesign = (field: keyof DesignPrefs, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, designPrefs: { ...profile.designPrefs, [field]: value } });
  };

  const addCVHighlight = () => {
    if (!profile) return;
    const current = profile.cvHighlights || [];
    if (current.length >= 3) return;
    setProfile({ ...profile, cvHighlights: [...current, { title: "", description: "", link: "" }] });
  };

  const updateCVHighlight = (index: number, field: keyof CVHighlight, value: string) => {
    if (!profile || !profile.cvHighlights) return;
    const newH = [...profile.cvHighlights];
    newH[index] = { ...newH[index], [field]: value };
    setProfile({ ...profile, cvHighlights: newH });
  };

  const addQIProject = () => {
    if (!profile) return;
    const current = profile.qiProjects || [];
    if (current.length >= 3) return;
    setProfile({ ...profile, qiProjects: [...current, { title: "", problem: "", intervention: "", metric: "", result: "" }] });
  };

  const updateQIProject = (index: number, field: keyof QIProject, value: string) => {
    if (!profile || !profile.qiProjects) return;
    const newP = [...profile.qiProjects];
    newP[index] = { ...newP[index], [field]: value };
    setProfile({ ...profile, qiProjects: newP });
  };

  const removeQIProject = (index: number) => {
    if (!profile || !profile.qiProjects) return;
    const newP = profile.qiProjects.filter((_, i) => i !== index);
    setProfile({ ...profile, qiProjects: newP });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-xs">Initializing Session...</div>;
  if (!profile) return null;

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${profile.uid}`;

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E] p-4 sm:p-10 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hospital Metrics Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1C1E]">OPERATIONS DASHBOARD</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">System Active: {profile.displayName}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/u/${profile.uid}`} className="px-6 py-3 bg-[#1A1C1E] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-colors">Launch Public Card</Link>
            <button onClick={() => signOut(auth)} className="px-6 py-3 border border-[#E1E3E5] text-gray-500 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all">Terminate Session</button>
          </div>
        </header>

        {/* Analytics Widget Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Profile Engagements</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tighter text-[#1A1C1E]">{profile.viewCount || 0}</span>
              <span className="text-green-500 font-bold text-xs uppercase tracking-widest">+ Live</span>
            </div>
          </div>
          <div className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Membership Status</p>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${profile.isPremium ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {profile.isPremium ? 'Level: PRO' : 'Level: BASIC'}
              </span>
            </div>
          </div>
          <div className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">VCard Distribution</p>
            <span className="text-3xl font-bold tracking-tight text-[#1A1C1E]">ENABLED</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Core Identity Section */}
            <section className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5]">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Identity & Credentials</h2>
              </div>
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-8">
                  <div className="relative w-28 h-28 bg-[#F1F3F5] rounded-xl overflow-hidden border-2 border-white shadow-md">
                    {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-200">{profile.displayName.charAt(0)}</div>}
                  </div>
                  <div className="space-y-4">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="block text-[10px] font-black uppercase tracking-widest file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#1A1C1E] file:text-white hover:file:bg-black cursor-pointer" />
                    <p className="text-[10px] text-gray-400 font-medium">Supported: JPG, PNG (Max 5MB)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</label>
                    <input type="text" value={profile.displayName} onChange={(e) => setProfile({...profile, displayName: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none focus:border-[#1A1C1E]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Clinical/Job Title</label>
                    <input type="text" value={profile.jobTitle || ""} onChange={(e) => setProfile({...profile, jobTitle: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none focus:border-[#1A1C1E]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Organization</label>
                    <input type="text" value={profile.company || ""} onChange={(e) => setProfile({...profile, company: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none focus:border-[#1A1C1E]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</label>
                    <input type="tel" value={profile.phone || ""} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none focus:border-[#1A1C1E]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</label>
                    <input type="email" value={profile.email || ""} onChange={(e) => setProfile({...profile, email: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none focus:border-[#1A1C1E]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Scheduling Link (e.g. Calendly)</label>
                    <input type="text" value={profile.bookingUrl || ""} onChange={(e) => setProfile({...profile, bookingUrl: e.target.value})} placeholder="https://calendly.com/yourname" className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none focus:border-[#1A1C1E]" />
                  </div>
                </div>
              </div>
            </section>

            {/* Live Data Integrations */}
            <section className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5]">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Live API Integrations</h2>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">GitHub Username</label>
                    <input 
                      type="text" 
                      value={profile.githubUsername || ""} 
                      onChange={(e) => setProfile({...profile, githubUsername: e.target.value})} 
                      placeholder="e.g. octocat" 
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none focus:border-[#1A1C1E]" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">PubMed IDs (Comma separated)</label>
                    <input 
                      type="text" 
                      value={pmidString} 
                      onChange={(e) => setPmidString(e.target.value)} 
                      placeholder="e.g. 34567890, 12345678" 
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none focus:border-[#1A1C1E]" 
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Clinical Integration (QI Projects) Section */}
            <section className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Clinical Integration: QI Portfolio (A3/PDSA)</h2>
                  <div className="flex items-center gap-2">
                    <div 
                      onClick={toggleQI}
                      className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors duration-200 ${profile.showQiProjects ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${profile.showQiProjects ? 'left-[1.15rem]' : 'left-0.5'}`}></div>
                    </div>
                    <span className="text-[8px] font-black uppercase text-gray-400">{profile.showQiProjects ? 'Public' : 'Hidden'}</span>
                  </div>
                </div>
                {(profile.qiProjects || []).length < 3 && (
                  <button onClick={addQIProject} className="text-[10px] font-black text-blue-600 uppercase tracking-widest">+ New A3 Record</button>
                )}
              </div>
              <div className="p-8 space-y-8">
                {(profile.qiProjects || []).map((p, i) => (
                  <div key={i} className="p-6 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg space-y-4 relative group">
                    <button onClick={() => removeQIProject(i)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <input placeholder="Project Title (e.g. Reduction in Handover Errors)" value={p.title} onChange={(e) => updateQIProject(i, 'title', e.target.value)} className="w-full bg-transparent font-bold text-lg outline-none" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">The Problem</label>
                        <textarea placeholder="Root cause / gap analysis..." value={p.problem} onChange={(e) => updateQIProject(i, 'problem', e.target.value)} className="w-full bg-white border border-[#E1E3E5] p-3 rounded text-sm outline-none resize-none" rows={2} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">Intervention (PDSA)</label>
                        <textarea placeholder="Change implemented..." value={p.intervention} onChange={(e) => updateQIProject(i, 'intervention', e.target.value)} className="w-full bg-white border border-[#E1E3E5] p-3 rounded text-sm outline-none resize-none" rows={2} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">Process Metric</label>
                        <input placeholder="How was it measured?" value={p.metric} onChange={(e) => updateQIProject(i, 'metric', e.target.value)} className="w-full bg-white border border-[#E1E3E5] p-3 rounded text-sm outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">The Result</label>
                        <input placeholder="Outcome achieved..." value={p.result} onChange={(e) => updateQIProject(i, 'result', e.target.value)} className="w-full bg-white border border-[#E1E3E5] p-3 rounded text-sm outline-none font-bold text-green-600" />
                      </div>
                    </div>
                  </div>
                ))}
                {(profile.qiProjects || []).length === 0 && (
                  <div className="text-center py-12 text-gray-300 font-bold uppercase tracking-widest text-[10px]">No clinical records indexed</div>
                )}
              </div>
            </section>

            {/* Achievements Section */}
            <section className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5] flex justify-between items-center">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Core Achievements & CV Highlights</h2>
                <button onClick={addCVHighlight} className="text-[10px] font-black text-blue-600 uppercase tracking-widest">+ Add Record</button>
              </div>
              <div className="p-8 space-y-6">
                {(profile.cvHighlights || []).map((h, i) => (
                  <div key={i} className="p-6 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg space-y-4">
                    <input placeholder="Title of Achievement" value={h.title} onChange={(e) => updateCVHighlight(i, 'title', e.target.value)} className="w-full bg-transparent font-bold text-lg outline-none" />
                    <textarea placeholder="Brief description..." value={h.description} onChange={(e) => updateCVHighlight(i, 'description', e.target.value)} className="w-full bg-transparent text-sm text-gray-500 outline-none resize-none" rows={2} />
                    <input placeholder="Evidence Link (URL)" value={h.link} onChange={(e) => updateCVHighlight(i, 'link', e.target.value)} className="w-full bg-transparent text-xs text-blue-500 font-bold outline-none" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            {/* QR Systems Sidebar */}
            <section className="bg-[#1A1C1E] text-white p-10 rounded-xl shadow-lg flex flex-col items-center text-center space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Distribution QR</p>
              <div className="p-4 bg-white rounded-lg shadow-2xl">
                <QRCodeCanvas value={publicUrl} size={180} level="H" includeMargin={true} />
              </div>
              <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl">{saving ? 'Syncing...' : 'COMMIT ALL UPDATES'}</button>
            </section>

            {/* Design System Sidebar */}
            <section className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Visual Interface</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black tracking-widest uppercase text-gray-400">Style Profile</label>
                  <select disabled={!profile.isPremium} value={profile.designPrefs.theme} onChange={(e) => updateDesign('theme', e.target.value)} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-[10px] uppercase appearance-none">
                    <option value="minimal">Minimalist</option><option value="bold">High Contrast</option><option value="dark">Midnight</option>
                  </select>
                </div>
                <button onClick={togglePremium} className="w-full py-3 bg-gray-100 text-gray-500 rounded-lg font-black text-[10px] uppercase tracking-widest">
                  {profile.isPremium ? 'PRO LICENCE ACTIVE' : 'UPGRADE SYSTEM'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
