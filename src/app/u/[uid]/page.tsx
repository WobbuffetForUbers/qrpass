import { UserProfile, DesignPrefs } from "@/lib/models";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import SaveContactButton from "./SaveContactButton";
import ProfileQR from "./ProfileQR";
import AnalyticsTracker from "./AnalyticsTracker";

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

  // PLACEHOLDER DATA FOR MEDICAL QUALITY IMPROVEMENT
  const highlights = (userData.cvHighlights && userData.cvHighlights.length > 0) 
    ? userData.cvHighlights 
    : [
        {
          title: "Sepsis Bundle Compliance Strategy",
          description: "Implemented a multi-disciplinary rapid response protocol reducing mortality by 18% over 12 months.",
          link: "https://example.com/medical-qi"
        },
        {
          title: "Lean Six Sigma: Surgical Efficiency",
          description: "Streamlined pre-operative workflows in a tertiary care center, saving 45 minutes per surgical case.",
          link: "https://example.com/lean-medical"
        },
        {
          title: "Patient Safety & EMR Integration",
          description: "Led the digital integration of automated medication reconciliation systems for high-acuity wards.",
          link: "https://example.com/emr-safety"
        }
      ];

  return (
    <main 
      className={`min-h-screen flex flex-col items-center p-6 sm:p-12 transition-all duration-1000 font-sans`}
      style={{ 
        backgroundColor: isDark ? '#0A0A0A' : '#F9F9F9',
        color: isDark ? '#F3F4F6' : '#111827',
        filter: !isPremium ? 'grayscale(100%)' : 'none'
      }}
    >
      <AnalyticsTracker uid={uid} />
      <div className="max-w-xl w-full mt-8 sm:mt-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        {/* QR Code Section at Top (Requested) */}
        <div className="mb-12">
          <ProfileQR uid={uid} />
        </div>

        {/* Profile Avatar */}
        <div 
          className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 rounded-[2.5rem] flex items-center justify-center text-4xl sm:text-5xl font-black shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: isBold ? theme.accentColor : (isDark ? '#1F2937' : '#FFFFFF'),
            color: isBold ? '#FFFFFF' : theme.accentColor,
            border: !isBold ? `4px solid ${theme.accentColor}` : 'none'
          }}
        >
          {userData.avatarUrl ? (
            <img src={userData.avatarUrl} alt={userData.displayName} className="w-full h-full object-cover" />
          ) : (
            String(userData.displayName || "?").charAt(0)
          )}
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
        <div className="mb-12 flex flex-col sm:flex-row gap-3 items-center justify-center">
           <SaveContactButton user={userData} accentColor={theme.accentColor} isBold={isBold} />
           {userData.bookingUrl && (
             <a
               href={formatUrl(userData.bookingUrl)}
               target="_blank"
               rel="noopener noreferrer"
               className="px-10 py-4 rounded-full font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2"
               style={{
                 backgroundColor: isDark ? '#FFFFFF' : '#000000',
                 color: isDark ? '#000000' : '#FFFFFF'
               }}
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
               </svg>
               Schedule Meeting
             </a>
           )}
        </div>

        {/* CV Highlights Section */}
        <div className="mb-16 space-y-6 text-left px-2">
           <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30 ml-2 mb-4 text-center">Core Achievements</h3>
           <div className="grid grid-cols-1 gap-4">
             {highlights.map((item, idx) => (
               <a 
                 key={idx}
                 href={formatUrl(item.link)}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="group p-6 rounded-[2.5rem] bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-500"
                 style={{ 
                    backgroundColor: isDark ? '#111' : '#FFF',
                    borderColor: isDark ? '#222' : '#F1F1F1'
                 }}
               >
                 <div className="flex items-start justify-between gap-4">
                   <div className="space-y-2">
                     <h4 className="font-black text-lg sm:text-xl leading-tight" style={{ color: isBold ? theme.accentColor : 'inherit' }}>
                       {item.title}
                     </h4>
                     <p className="text-sm font-medium opacity-50 leading-relaxed">
                       {item.description}
                     </p>
                   </div>
                   <div className="p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ backgroundColor: theme.accentColor + '20', color: theme.accentColor }}>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                   </div>
                 </div>
               </a>
             ))}
           </div>
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
