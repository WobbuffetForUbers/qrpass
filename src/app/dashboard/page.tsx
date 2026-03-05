"use client";

import { useEffect, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { UserProfile, Link as ProfileLink, DesignPrefs, CVHighlight, QIProject, HackathonProject } from "@/lib/models";
import Link from "next/link";
import ProfileQRCode from "@/components/ProfileQRCode";
import EncountersDashboard from "@/components/EncountersDashboard";
import ConnectionsDashboard from "@/components/ConnectionsDashboard";

const COLOR_PRESETS = [
  { name: 'Medical Blue', color: '#0052CC' },
  { name: 'Deep Teal', color: '#006B75' },
  { name: 'Midnight', color: '#1A1C1E' },
  { name: 'Slate', color: '#4A5568' },
  { name: 'Crimson', color: '#9B2C2C' },
  { name: 'Forest', color: '#276749' },
];

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pmidString, setPmidString] = useState("");
  const [doiString, setDoiString] = useState("");
  const [activeTab, setActiveTab] = useState<'editor' | 'encounters' | 'connections'>('editor');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (!data.designPrefs.font) data.designPrefs.font = 'sans';
            setProfile(data);
            if (data.pubmedIds) setPmidString(data.pubmedIds.join(", "));
            if (data.doiIds) setDoiString(data.doiIds.join(", "));
          } else {
            setError("Profile not found.");
          }
        } else {
          router.push("/login");
        }
      } catch (err: any) {
        setError("Connection failed.");
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
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      const croppedBlob = await new Promise<Blob>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 400; canvas.height = 400;
          const ctx = canvas.getContext("2d");
          let sX = 0, sY = 0, sW = img.width, sH = img.height;
          if (img.width > img.height) { sW = img.height; sX = (img.width - img.height) / 2; } 
          else { sH = img.width; sY = (img.height - img.width) / 2; }
          ctx?.drawImage(img, sX, sY, sW, sH, 0, 0, 400, 400);
          canvas.toBlob((b) => b ? resolve(b) : reject(), "image/jpeg", 0.9);
        };
        img.src = objectUrl;
      });
      const storageRef = ref(storage, `avatars/${profile.uid}`);
      await uploadBytes(storageRef, croppedBlob);
      const url = await getDownloadURL(storageRef);
      setProfile({ ...profile, avatarUrl: url });
      await updateDoc(doc(db, "users", profile.uid), { avatarUrl: url });
    } catch (err) { alert("Upload failed."); } 
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const pubmedIds = pmidString.split(",").map(id => id.trim()).filter(id => id !== "");
    const doiIds = doiString.split(",").map(id => id.trim()).filter(id => id !== "");
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        ...profile,
        pubmedIds,
        doiIds
      });
      alert("System Updated.");
    } catch (error) { alert("Save failed."); } 
    finally { setSaving(false); }
  };

  const toggleField = async (field: keyof UserProfile) => {
    if (!profile) return;
    const newStatus = !profile[field];
    setProfile({ ...profile, [field]: newStatus });
    await updateDoc(doc(db, "users", profile.uid), { [field]: newStatus });
  };

  const togglePremium = async () => {
    if (!profile) return;
    const newStatus = !profile.isPremium;
    setProfile({ ...profile, isPremium: newStatus });
    await updateDoc(doc(db, "users", profile.uid), { isPremium: newStatus });
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

  const removeCVHighlight = (index: number) => {
    if (!profile || !profile.cvHighlights) return;
    setProfile({ ...profile, cvHighlights: profile.cvHighlights.filter((_, i) => i !== index) });
  };

  const addHackathon = () => {
    if (!profile) return;
    const current = profile.hackathonProjects || [];
    if (current.length >= 3) return;
    setProfile({ ...profile, hackathonProjects: [...current, { title: "", problem: "", techStack: [], outcome: "" }] });
  };

  const updateHackathon = (index: number, field: keyof HackathonProject, value: any) => {
    if (!profile || !profile.hackathonProjects) return;
    const newH = [...profile.hackathonProjects];
    newH[index] = { ...newH[index], [field]: value };
    setProfile({ ...profile, hackathonProjects: newH });
  };

  const removeHackathon = (index: number) => {
    if (!profile || !profile.hackathonProjects) return;
    setProfile({ ...profile, hackathonProjects: profile.hackathonProjects.filter((_, i) => i !== index) });
  };

  const addTechChip = (hIndex: number) => {
    const tech = prompt("Enter Technology (e.g. Python, SQL):");
    if (tech && profile?.hackathonProjects) {
      const newStack = [...profile.hackathonProjects[hIndex].techStack, tech];
      updateHackathon(hIndex, 'techStack', newStack);
    }
  };

  const removeTechChip = (hIndex: number, tIndex: number) => {
    if (profile?.hackathonProjects) {
      const newStack = profile.hackathonProjects[hIndex].techStack.filter((_, i) => i !== tIndex);
      updateHackathon(hIndex, 'techStack', newStack);
    }
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
    setProfile({ ...profile, qiProjects: profile.qiProjects.filter((_, i) => i !== index) });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-xs bg-white text-black">Initializing...</div>;
  if (!profile) return null;

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${profile.uid}`;

  const renderToggle = (field: keyof UserProfile) => (
    <div className="flex items-center gap-2">
      <div onClick={() => toggleField(field)} className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors ${profile[field] ? 'bg-green-500' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${profile[field] ? 'left-[0.9rem]' : 'left-0.5'}`}></div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E] p-4 sm:p-10 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1C1E]">OPERATIONS DASHBOARD</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">UID: {profile.uid}</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/u/${profile.uid}`} className="px-6 py-3 bg-[#1A1C1E] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-colors">Launch Public Card</Link>
            <button onClick={() => signOut(auth)} className="px-6 py-3 border border-[#E1E3E5] text-gray-500 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all">Terminate Session</button>
          </div>
        </header>

        <div className="flex bg-white border border-[#E1E3E5] p-1 rounded-xl w-full max-w-xl mx-auto sm:mx-0">
          <button onClick={() => setActiveTab('editor')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${activeTab === 'editor' ? 'bg-[#1A1C1E] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Editor</button>
          <button onClick={() => setActiveTab('encounters')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${activeTab === 'encounters' ? 'bg-[#1A1C1E] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Activity Ledger</button>
          <button onClick={() => setActiveTab('connections')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${activeTab === 'connections' ? 'bg-[#1A1C1E] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Intel Rolodex</button>
        </div>

        {activeTab === 'editor' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8 text-black text-left">
                {/* Identity */}
                <section className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5] font-black uppercase text-[10px] tracking-widest text-gray-500">Identity & Credentials</div>
                  <div className="p-8 space-y-8">
                    <div className="flex items-center gap-8">
                      <div className="relative w-28 h-28 bg-[#F1F3F5] rounded-xl overflow-hidden border-2 border-white shadow-md">
                        {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-200">{profile.displayName.charAt(0)}</div>}
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="block text-[10px] font-black uppercase file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#1A1C1E] file:text-white cursor-pointer" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Full Name</label><input type="text" value={profile.displayName} onChange={(e) => setProfile({...profile, displayName: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Job Title</label><input type="text" value={profile.jobTitle || ""} onChange={(e) => setProfile({...profile, jobTitle: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Organization</label><input type="text" value={profile.company || ""} onChange={(e) => setProfile({...profile, company: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Phone</label><input type="tel" value={profile.phone || ""} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none" /></div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Short Bio</label>
                      <textarea 
                        value={profile.bio} 
                        rows={3} 
                        onChange={(e) => setProfile({...profile, bio: e.target.value})} 
                        className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none resize-none"
                        placeholder="Tell the world who you are..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Email Address</label><input type="email" value={profile.email || ""} onChange={(e) => setProfile({...profile, email: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Scheduling Link</label><input type="text" value={profile.bookingUrl || ""} onChange={(e) => setProfile({...profile, bookingUrl: e.target.value})} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-sm focus:outline-none" /></div>
                    </div>
                  </div>
                </section>

                {/* Innovation Gallery */}
                <section className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5] flex justify-between items-center">
                    <div className="flex items-center gap-4"><h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Innovation Gallery</h2>{renderToggle('showHackathons')}</div>
                    {(profile.hackathonProjects || []).length < 3 && <button onClick={addHackathon} className="text-[10px] font-black text-blue-600 uppercase tracking-widest">+ New Pitch</button>}
                  </div>
                  <div className="p-8 space-y-8">
                    {(profile.hackathonProjects || []).map((h, i) => (
                      <div key={i} className="p-6 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg space-y-4 relative group">
                        <button onClick={() => removeHackathon(i)} className="absolute top-4 right-4 text-red-400 hover:text-red-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <input placeholder="Project/Pitch Title" value={h.title} onChange={(e) => updateHackathon(i, 'title', e.target.value)} className="w-full bg-transparent font-bold text-lg outline-none" />
                        <textarea placeholder="Problem Statement" value={h.problem} onChange={(e) => updateHackathon(i, 'problem', e.target.value)} className="w-full bg-white border border-[#E1E3E5] p-3 rounded text-sm resize-none" rows={2} />
                        <div className="space-y-2">
                          <div className="flex justify-between items-center"><label className="text-[9px] font-black uppercase text-gray-400">Tech Stack</label><button onClick={() => addTechChip(i)} className="text-[9px] font-black text-blue-600">+ Add</button></div>
                          <div className="flex flex-wrap gap-2">
                            {h.techStack.map((tech, tIdx) => (
                              <span key={tIdx} className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold">
                                {tech}
                                <button onClick={() => removeTechChip(i, tIdx)} className="text-red-400 hover:text-red-600 ml-1">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <textarea placeholder="Outcome" value={h.outcome} onChange={(e) => updateHackathon(i, 'outcome', e.target.value)} className="w-full bg-white border border-[#E1E3E5] p-3 rounded text-sm resize-none font-bold text-green-700" rows={2} />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Core Achievements */}
                <section className="bg-white border border-[#E1E3E5] rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-[#F1F3F5] px-8 py-4 border-b border-[#E1E3E5] flex justify-between items-center">
                    <div className="flex items-center gap-4"><h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Core Achievements</h2>{renderToggle('showCvHighlights')}</div>
                    {(profile.cvHighlights || []).length < 3 && <button onClick={addCVHighlight} className="text-[10px] font-black text-blue-600 uppercase tracking-widest">+ Add Record</button>}
                  </div>
                  <div className="p-8 space-y-6">
                    {(profile.cvHighlights || []).map((h, i) => (
                      <div key={i} className="p-6 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg space-y-4 relative group">
                        <button onClick={() => removeCVHighlight(i)} className="absolute top-4 right-4 text-red-400 hover:text-red-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <input placeholder="Achievement Title" value={h.title} onChange={(e) => updateCVHighlight(i, 'title', e.target.value)} className="w-full bg-transparent font-bold text-lg outline-none" />
                        <textarea placeholder="Description" value={h.description} onChange={(e) => updateCVHighlight(i, 'description', e.target.value)} className="w-full bg-transparent text-sm text-gray-500 outline-none resize-none" rows={2} />
                        <input placeholder="Evidence Link" value={h.link} onChange={(e) => updateCVHighlight(i, 'link', e.target.value)} className="w-full bg-transparent text-xs text-blue-500 font-bold outline-none" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <div className="space-y-8 text-black">
                <section className="bg-[#1A1C1E] text-white p-10 rounded-xl shadow-lg flex flex-col items-center text-center space-y-6">
                  <ProfileQRCode profileUrl={publicUrl} photoUrl={profile.avatarUrl} size={180} />
                  <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl">{saving ? 'Syncing...' : 'COMMIT ALL UPDATES'}</button>
                </section>

                <section className="bg-white border border-[#E1E3E5] p-8 rounded-xl shadow-sm space-y-8 text-left">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Visual Interface</h2>
                  
                  {/* Color Presets */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Color Palette</label>
                    <div className="grid grid-cols-3 gap-2">
                      {COLOR_PRESETS.map(p => (
                        <button key={p.name} onClick={() => updateDesign('accentColor', p.color)} className={`w-full h-8 rounded-lg border-2 transition-all ${profile.designPrefs.accentColor === p.color ? 'border-black scale-105' : 'border-transparent'}`} style={{ backgroundColor: p.color }} title={p.name} />
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input type="color" value={profile.designPrefs.accentColor} onChange={(e) => updateDesign('accentColor', e.target.value)} className="w-8 h-8 rounded-md border-none cursor-pointer" />
                      <input type="text" value={profile.designPrefs.accentColor} onChange={(e) => updateDesign('accentColor', e.target.value)} className="flex-1 bg-gray-50 px-3 py-1 rounded text-[10px] font-mono border border-gray-100" />
                    </div>
                  </div>

                  {/* Font Selection */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Typography</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['sans', 'serif', 'mono', 'display'].map(f => (
                        <button key={f} onClick={() => updateDesign('font', f as any)} className={`py-2 rounded-lg border-2 text-[10px] font-bold capitalize transition-all ${profile.designPrefs.font === f ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-200'}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-gray-50">
                    <select disabled={!profile.isPremium} value={profile.designPrefs.theme} onChange={(e) => updateDesign('theme', e.target.value)} className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E1E3E5] rounded-lg font-bold text-[10px] uppercase appearance-none">
                      <option value="minimal">Minimalist</option><option value="bold">High Contrast</option><option value="dark">Midnight</option>
                    </select>
                    <button onClick={togglePremium} className="w-full py-3 bg-gray-100 text-gray-500 rounded-lg font-black text-[10px] uppercase tracking-widest">{profile.isPremium ? 'PRO LICENCE ACTIVE' : 'UPGRADE SYSTEM'}</button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'encounters' && <EncountersDashboard uid={profile.uid} />}
        {activeTab === 'connections' && <ConnectionsDashboard uid={profile.uid} />}
      </div>
    </main>
  );
}
