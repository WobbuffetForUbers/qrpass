import { UserProfile, DesignPrefs } from "@/lib/models";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { uid } = await params;

  let userData: UserProfile | null = null;

  try {
    // FETCH FROM FIRESTORE
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return notFound();
    }

    userData = docSnap.data() as UserProfile;
  } catch (error) {
    console.error("Firestore Fetch Error:", error);
    throw new Error("Failed to load profile data from database. Check Firebase configuration.");
  }

  if (!userData) return notFound();

  // THE GATEKEEPER LOGIC:
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
      <div className="max-w-xl w-full mt-16 sm:mt-24 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        {/* Profile Avatar Placeholder */}
        <div 
          className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-8 rounded-[2.5rem] flex items-center justify-center text-4xl sm:text-5xl font-black shadow-2xl transition-transform hover:scale-110 duration-500"
          style={{ 
            backgroundColor: isBold ? theme.accentColor : (isDark ? '#1F2937' : '#FFFFFF'),
            color: isBold ? '#FFFFFF' : theme.accentColor,
            border: !isBold ? `4px solid ${theme.accentColor}` : 'none'
          }}
        >
          {String(userData.displayName || "?").charAt(0)}
        </div>

        {/* Profile Identity */}
        <div className="mb-12 space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none" style={{ color: isBold ? (isDark ? '#FFF' : '#000') : theme.accentColor }}>
            {String(userData.displayName || "Anonymous")}
          </h1>
          <p className="text-lg sm:text-xl font-medium opacity-50 leading-relaxed max-w-md mx-auto">
            {String(userData.bio || "No bio yet.")}
          </p>
        </div>

        {/* Links Section */}
        <div className="space-y-4 w-full px-2">
          {(userData.links || []).map((link, index) => (
            <a
              key={index}
              href={formatUrl(String(link.url || "#"))}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative block w-full p-6 rounded-[2rem] font-bold text-lg sm:text-xl transition-all duration-500 hover:scale-[1.03] active:scale-95 shadow-xl`}
              style={{
                backgroundColor: isBold ? theme.accentColor : (isDark ? '#1A1A1A' : '#FFFFFF'),
                border: !isBold ? `2px solid ${isDark ? '#333' : '#EEE'}` : 'none',
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
        <div className="mt-20 flex flex-col items-center gap-4">
          {!isPremium ? (
            <div className="px-6 py-2 bg-black/5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase opacity-30">
              qrPass Free Tier
            </div>
          ) : (
            <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full shadow-inner">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accentColor }}></span>
              <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Verified Pro</span>
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
