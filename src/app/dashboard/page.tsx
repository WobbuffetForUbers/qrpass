"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { UserProfile, Link as ProfileLink } from "@/lib/models";
import Link from "next/link";

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const docRef = doc(db, "users", profile.uid);
      await updateDoc(docRef, {
        displayName: profile.displayName,
        bio: profile.bio,
        links: profile.links,
        designPrefs: profile.designPrefs
      });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Update Error:", error);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
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

  return (
    <main className="min-h-screen bg-gray-50 text-black p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black">Profile Editor</h1>
            <p className="text-gray-400 text-sm font-medium">Manage your public qrPass identity</p>
          </div>
          <div className="flex gap-3">
            <Link 
              href={`/u/${profile.uid}`}
              className="px-6 py-2 border-2 border-black rounded-full font-bold text-sm hover:bg-black hover:text-white transition-all"
            >
              View Public Profile
            </Link>
            <button 
              onClick={() => signOut(auth)}
              className="px-6 py-2 bg-gray-100 rounded-full font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-all text-gray-400"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Form Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Display Name</label>
                <input 
                  type="text" 
                  value={profile.displayName}
                  onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none transition-all font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Bio</label>
                <textarea 
                  value={profile.bio}
                  rows={3}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none transition-all font-semibold resize-none"
                />
              </div>
            </div>

            {/* Links Section */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-xl">Links</h2>
                <button 
                  onClick={addLink}
                  className="p-2 bg-black text-white rounded-xl hover:scale-110 transition-transform"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {profile.links.map((link, index) => (
                  <div key={index} className="flex gap-4 items-end bg-gray-50 p-4 rounded-2xl border-2 border-transparent hover:border-gray-200 transition-all">
                    <div className="flex-1 space-y-1">
                      <input 
                        placeholder="Label (e.g. LinkedIn)" 
                        value={link.label}
                        onChange={(e) => updateLink(index, 'label', e.target.value)}
                        className="w-full bg-transparent font-bold outline-none"
                      />
                      <input 
                        placeholder="URL (https://...)" 
                        value={link.url}
                        onChange={(e) => updateLink(index, 'url', e.target.value)}
                        className="w-full bg-transparent text-sm text-gray-400 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => removeLink(index)}
                      className="text-red-400 hover:text-red-600 p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl font-black text-gray-300">
                {profile.displayName.charAt(0)}
              </div>
              <h3 className="font-black text-lg truncate">{profile.displayName}</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                {profile.isPremium ? "Pro Member" : "Free Tier"}
              </p>

              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-8 py-4 bg-black text-white rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-xl space-y-4">
              <h3 className="font-black text-lg">Pro Benefits</h3>
              <p className="text-gray-400 text-sm font-medium">
                Unlock custom themes, colors, and detailed analytics.
              </p>
              {!profile.isPremium && (
                <button className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:scale-105 transition-transform">
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
