import { UserProfile, DesignPrefs } from "@/lib/models";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { uid } = await params;

  // FETCH FROM FIRESTORE
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return notFound();
  }

  const userData = docSnap.data() as UserProfile;

  // THE GATEKEEPER LOGIC:
  // If not premium, force a strict minimal Grayscale theme.
  const theme: DesignPrefs = userData.isPremium 
    ? userData.designPrefs 
    : { theme: 'minimal', accentColor: '#000000' };

  const isDark = theme.theme === 'dark';
  const isBold = theme.theme === 'bold';

  return (
    <main 
      className={`min-h-screen flex flex-col items-center p-8 transition-all duration-700 font-sans`}
      style={{ 
        backgroundColor: isDark ? '#121212' : '#FFFFFF',
        color: isDark ? '#FFFFFF' : '#000000',
        // Forced grayscale filter for Free Tier
        filter: !userData.isPremium ? 'grayscale(100%)' : 'none'
      }}
    >
      <div className="max-w-md w-full mt-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Profile Identity */}
        <div className="mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4" style={{ color: theme.accentColor }}>
            {userData.displayName}
          </h1>
          <p className="text-xl font-medium opacity-60 leading-relaxed">
            {userData.bio}
          </p>
        </div>

        {/* Links Section */}
        <div className="space-y-4 w-full px-4">
          {userData.links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative block w-full p-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg`}
              style={{
                backgroundColor: isBold ? theme.accentColor : 'transparent',
                border: `3px solid ${theme.accentColor}`,
                color: isBold ? '#FFFFFF' : (isDark ? '#FFFFFF' : theme.accentColor)
              }}
            >
              {link.label}
              <span className="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </a>
          ))}
        </div>

        {/* Branding/Badge */}
        {!userData.isPremium ? (
          <div className="mt-16 pt-8 border-t border-black/10 text-sm font-semibold tracking-widest uppercase opacity-40">
            qrPass Free Tier
          </div>
        ) : (
          <div className="mt-16 flex items-center justify-center gap-2 text-sm font-bold opacity-30">
            <span style={{ color: theme.accentColor }}>◆</span>
            PRO PROFILE
          </div>
        )}
      </div>
    </main>
  );
}
