"use client";

import { useEffect, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { UserProfile, Link as ProfileLink, DesignPrefs } from "@/lib/models";
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
    console.log("Starting upload for:", file.name);
    
    try {
      const storageRef = ref(storage, `avatars/${profile.uid}`);
      console.log("Storage Ref created:", storageRef.fullPath);
      
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload successful, snapshot:", snapshot);
      
      const url = await getDownloadURL(storageRef);
      console.log("Download URL obtained:", url);
      
      setProfile({ ...profile, avatarUrl: url });
      
      // Auto-save the avatar URL to Firestore
      const docRef = doc(db, "users", profile.uid);
      await updateDoc(docRef, { avatarUrl: url });
      console.log("Firestore updated with new avatar URL");
      
    } catch (err: any) {
      console.error("Full Upload Error Object:", err);
      let message = "Failed to upload image.";
      if (err.code === 'storage/unauthorized') {
        message = "Permission denied. Please check your Firebase Storage Rules.";
      } else if (err.code === 'storage/canceled') {
        message = "Upload canceled.";
      } else if (err.code === 'storage/unknown') {
        message = "Unknown error. Check if Firebase Storage is enabled in the console.";
      }
      alert(`${message} (Error: ${err.code || 'unknown'})`);
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

  const addLink = () => {
    if (!profile) return;
    setProfile({
      ...profile,
      links: [...profile.links, { label: "", url: "" }]
    });
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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">Loading Editor...</div>;
  
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
      <h2 className="text-2xl font-black text-red-600">Dashboard Error</h2>
      <p className="text-gray-500 max-w-sm">{error}</p>
      <button 
        onClick={() => router.push("/login")}
        className="px-8 py-3 bg-black text-white rounded-2xl font-bold"
      >
        Back to Login
      </button>
    </div>
  );

  if (!profile) return null;

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${profile.uid}`;

  return (
    <main className="min-h-screen bg-gray-50 text-black p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black">Profile Editor</h1>
            <p className="text-gray-400 text-sm font-medium">Manage your virtual business card</p>
          </div>
          <div className="flex gap-3">
            <Link 
              href={`/u/${profile.uid}`}
              className="px-6 py-2 border-2 border-black rounded-full font-bold text-sm hover:bg-black hover:text-white transition-all"
            >
              View Public Card
            </Link>
            <button 
              onClick={() => signOut(auth)}
              className="px-6 py-2 bg-gray-100 rounded-full font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-all text-gray-400"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <h2 className="font-black text-xl text-gray-400 uppercase tracking-widest text-[10px]">Contact Information</h2>
              
              {/* Photo Upload Area */}
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-3xl">
                <div className="relative w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden flex-shrink-0">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-400">
                      {profile.displayName.charAt(0)}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block">
                    <span className="sr-only">Choose profile photo</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                    />
                  </label>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.displayName}
                    onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl outline-none transition-all font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Job Title</label>
                  <input 
                    type="text" 
                    value={profile.jobTitle || ""}
                    onChange={(e) => setProfile({...profile, jobTitle: e.target.value})}
                    placeholder="CEO / Founder"
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl outline-none transition-all font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Company</label>
                  <input 
                    type="text" 
                    value={profile.company || ""}
                    onChange={(e) => setProfile({...profile, company: e.target.value})}
                    placeholder="Company Name"
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl outline-none transition-all font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    placeholder="+1 234 567 890"
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={profile.email || ""}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  placeholder="name@example.com"
                  className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl outline-none transition-all font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Short Bio</label>
                <textarea 
                  value={profile.bio}
                  rows={2}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl outline-none transition-all font-semibold resize-none"
                />
              </div>
            </div>

            {/* Links Section */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-xl text-gray-400 uppercase tracking-widest text-[10px]">Social & Web Links</h2>
                <button onClick={addLink} className="p-2 bg-black text-white rounded-xl hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {profile.links.map((link, index) => (
                  <div key={index} className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                    <input 
                      placeholder="Label" 
                      value={link.label}
                      onChange={(e) => updateLink(index, 'label', e.target.value)}
                      className="flex-1 bg-transparent font-bold outline-none text-sm"
                    />
                    <input 
                      placeholder="URL" 
                      value={link.url}
                      onChange={(e) => updateLink(index, 'url', e.target.value)}
                      className="flex-[2] bg-transparent text-xs text-gray-400 outline-none"
                    />
                    <button onClick={() => removeLink(index)} className="text-red-400 hover:text-red-600 p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Design & Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-4">
              <h2 className="font-black text-xl text-gray-400 uppercase tracking-widest text-[10px]">Your Card QR Code</h2>
              <div className="p-4 bg-white rounded-3xl shadow-xl border border-gray-50">
                <QRCodeCanvas value={publicUrl} size={150} level="H" includeMargin={true} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 max-w-[180px] leading-relaxed uppercase tracking-tighter">
                Show this to anyone to instantly share your digital card.
              </p>
            </div>

            <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6 transition-all ${!profile.isPremium ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-black text-xl text-gray-400 uppercase tracking-widest text-[10px]">Visual Theme (Pro)</h2>
                {!profile.isPremium && <span className="px-3 py-1 bg-black text-white text-[8px] font-black rounded-full uppercase tracking-widest">Locked</span>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Style</label>
                  <select 
                    disabled={!profile.isPremium}
                    value={profile.designPrefs.theme}
                    onChange={(e) => updateDesign('theme', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none font-bold text-xs appearance-none cursor-pointer"
                  >
                    <option value="minimal">Minimalist</option>
                    <option value="bold">Bold Impact</option>
                    <option value="dark">Deep Dark</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Accent</label>
                  <div className="flex gap-2">
                    <input 
                      disabled={!profile.isPremium}
                      type="color" 
                      value={profile.designPrefs.accentColor}
                      onChange={(e) => updateDesign('accentColor', e.target.value)}
                      className="w-10 h-10 rounded-lg border-none p-0 cursor-pointer"
                    />
                    <input 
                      disabled={!profile.isPremium}
                      type="text" 
                      value={profile.designPrefs.accentColor}
                      onChange={(e) => updateDesign('accentColor', e.target.value)}
                      className="flex-1 px-4 py-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-2xl space-y-6">
              <button onClick={togglePremium} className={`w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 ${profile.isPremium ? 'bg-gray-800 text-gray-500' : 'bg-white text-black'}`}>
                {profile.isPremium ? "Deactivate Pro" : "Try Pro Features"}
              </button>
              <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-bold text-sm transition-all disabled:opacity-50">
                {saving ? "Saving..." : "Save Card Details"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
