import { UserProfile, DesignPrefs } from "@/lib/models";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import SaveContactButton from "./SaveContactButton";
import ProfileQR from "./ProfileQR";

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { uid } = await params;

  let userData: UserProfile | null = null;

  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return notFound();
    }

    userData = docSnap.data() as UserProfile;
  } catch (error) {
    console.error("Firestore Fetch Error:", error);
    throw new Error("Failed to load profile data.");
  }

  if (!userData) return notFound();

  const isPremium = userData.isPremium === true;
  const theme: DesignPrefs = isPremium && userData.designPrefs
    ? userData.designPrefs 
    : { theme: 'minimal', accentColor: '#000000' };

  const isDark = theme.theme === 'dark';
  const isBold = theme.theme === 'bold';

  const formatUrl = (url: string) => {
    if (!url) return "#";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  return (
    <main 
      className={`min-h-screen flex flex-col items-center p-6 sm:p-12 transition-all duration-1000 font-sans`}
      style={{ 
        backgroundColor: isDark ? '#0A0A0A' : '#F9F9F9',
        color: isDark ? '#F3F4F6' : '#111827',
        filter: !isPremium ? 'grayscale(100%)' : 'none'
      }}
    >
      <div className="max-w-xl w-full mt-8 sm:mt-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        {/* QR Code Section at Top (Requested) */}
        <div className="mb-12">
          <ProfileQR uid={userData.uid} />
        </div>

        {/* Profile Avatar */}
        <div 
          className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 rounded-[2.5rem] flex items-center justify-center text-4xl sm:text-5xl font-black shadow-2xl"
          style={{ 
            backgroundColor: isBold ? theme.accentColor : (isDark ? '#1F2937' : '#FFFFFF'),
            color: isBold ? '#FFFFFF' : theme.accentColor,
            border: !isBold ? `4px solid ${theme.accentColor}` : 'none'
          }}
        >
          {String(userData.displayName || "?").charAt(0)}
        </div>

        {/* Profile Identity */}
        <div className="mb-8 space-y-2">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none" style={{ color: isBold ? (isDark ? '#FFF' : '#000') : theme.accentColor }}>
            {String(userData.displayName || "Anonymous")}
          </h1>
          {(userData.jobTitle || userData.company) && (
            <p className="text-lg font-bold opacity-60">
              {userData.jobTitle} {userData.company ? `@ ${userData.company}` : ''}
            </p>
          )}
          <p className="text-md sm:text-lg font-medium opacity-40 leading-relaxed max-w-sm mx-auto">
            {String(userData.bio || "")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-12 flex flex-col gap-3 items-center">
           <SaveContactButton user={userData} accentColor={theme.accentColor} isBold={isBold} />
        </div>

        {/* Links Section */}
        <div className="space-y-3 w-full px-2 mb-16">
          {(userData.links || []).map((link, index) => (
            <a
              key={index}
              href={formatUrl(String(link.url || "#"))}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative block w-full p-5 rounded-[1.5rem] font-bold text-lg transition-all duration-500 hover:scale-[1.03] active:scale-95 shadow-lg`}
              style={{
                backgroundColor: isBold ? theme.accentColor : (isDark ? '#1A1A1A' : '#FFFFFF'),
                border: !isBold ? `1px solid ${isDark ? '#333' : '#EEE'}` : 'none',
                color: isBold ? '#FFFFFF' : (isDark ? '#F3F4F6' : '#111827')
              }}
            >
              <div className="flex items-center justify-center gap-3">
                {String(link.label || "Link")}
                <span className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                  ↗
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Branding/Badge */}
        <div className="pb-12 flex flex-col items-center gap-4">
          {!isPremium ? (
            <div className="px-6 py-2 bg-black/5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase opacity-30">
              qrPass Card
            </div>
          ) : (
            <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full shadow-inner">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accentColor }}></span>
              <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Verified Pro Card</span>
            </div>
          )}
          
          <Link href="/" className="text-[10px] font-bold opacity-20 hover:opacity-50 transition-opacity uppercase tracking-widest">
            Create your own qrPass →
          </Link>
        </div>
      </div>
    </main>
  );
}
