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

async function fetchGitHubRepos(username: string) {
  try {
    const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=3`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((repo: any) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      html_url: repo.html_url
    }));
  } catch (error) {
    console.error("GitHub Fetch Error:", error);
    return [];
  }
}

async function fetchPubMedArticles(pmids: string[]) {
  if (!pmids || pmids.length === 0) return [];
  try {
    const idParam = pmids.join(",");
    const res = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idParam}&retmode=json`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data.result;
    return pmids.map(id => {
      const article = result[id];
      if (!article) return null;
      return {
        uid: id,
        title: article.title,
        authors: article.authors?.map((a: any) => a.name).join(", "),
        source: article.source,
        pubdate: article.pubdate?.split(" ")[0]
      };
    }).filter(Boolean);
  } catch (error) {
    console.error("PubMed Fetch Error:", error);
    return [];
  }
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

  // Fetch Live Data
  const [repos, articles] = await Promise.all([
    userData.githubUsername ? fetchGitHubRepos(userData.githubUsername) : Promise.resolve([]),
    userData.pubmedIds ? fetchPubMedArticles(userData.pubmedIds) : Promise.resolve([])
  ]);

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

  // CV HIGHLIGHTS PLACEHOLDERS
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
        }
      ];

  // QI PROJECTS PLACEHOLDERS
  const projects = (userData.qiProjects && userData.qiProjects.length > 0)
    ? userData.qiProjects
    : [
        {
          title: "Handover Error Mitigation",
          problem: "Communication gaps during shift changes leading to medication reconciliation errors.",
          intervention: "Standardized SBAR protocol implemented across 4 surgical wards.",
          metric: "Incidence of reconciliation errors per 1000 bed days.",
          result: "42% reduction in reported errors within first quarter."
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
      <div className="max-w-2xl w-full mt-8 sm:mt-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        {/* QR Code Section at Top */}
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

        {/* Integration Accordions */}
        <div className="w-full space-y-4 mb-12 text-left px-2">
          {articles.length > 0 && (
            <details className="group bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm transition-all duration-500" style={{ backgroundColor: isDark ? '#111' : '#FFF', borderColor: isDark ? '#222' : '#F1F1F1' }}>
              <summary className="p-6 cursor-pointer list-none flex justify-between items-center font-black uppercase tracking-widest text-[10px] opacity-50 hover:opacity-100 transition-opacity">
                Clinical Research
                <svg className="w-4 h-4 transition-transform duration-500 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-6 pb-6 space-y-6">
                {articles.map((article: any, i: number) => (
                  <a key={i} href={`https://pubmed.ncbi.nlm.nih.gov/${article.uid}`} target="_blank" rel="noopener noreferrer" className="block space-y-1 hover:opacity-70 transition-opacity">
                    <p className="font-bold text-sm leading-tight">{article.title}</p>
                    <p className="text-[10px] opacity-50 font-medium italic">{article.authors}</p>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter opacity-40">
                      <span>{article.source}</span>
                      <span>{article.pubdate}</span>
                    </div>
                  </a>
                ))}
              </div>
            </details>
          )}

          {repos.length > 0 && (
            <details className="group bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm transition-all duration-500" style={{ backgroundColor: isDark ? '#111' : '#FFF', borderColor: isDark ? '#222' : '#F1F1F1' }}>
              <summary className="p-6 cursor-pointer list-none flex justify-between items-center font-black uppercase tracking-widest text-[10px] opacity-50 hover:opacity-100 transition-opacity">
                Technical Projects
                <svg className="w-4 h-4 transition-transform duration-500 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-6 pb-6 space-y-4">
                {repos.map((repo: any, i: number) => (
                  <a key={i} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors" style={{ backgroundColor: isDark ? '#1A1A1A' : '#F9F9F9' }}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-sm">{repo.name}</p>
                      {repo.language && <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/5" style={{ color: theme.accentColor }}>{repo.language}</span>}
                    </div>
                    {repo.description && <p className="text-[11px] opacity-50 font-medium leading-snug">{repo.description}</p>}
                  </a>
                ))}
              </div>
            </details>
          )}
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
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
               Schedule Meeting
             </a>
           )}
        </div>

        {/* Clinical Integration (QI Projects) Section */}
        {userData.showQiProjects && (
          <div className="mb-16 space-y-8 text-left px-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center mb-6">Clinical Integration Portfolio</h3>
            <div className="grid grid-cols-1 gap-6">
              {projects.map((project, idx) => (
                <div 
                  key={idx}
                  className="p-8 rounded-[2.5rem] bg-white border border-gray-100 shadow-sm transition-all duration-500 overflow-hidden relative"
                  style={{ 
                      backgroundColor: isDark ? '#111' : '#FFF',
                      borderColor: isDark ? '#222' : '#F1F1F1'
                  }}
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: theme.accentColor }}></div>
                  <h4 className="font-black text-xl mb-6 tracking-tight" style={{ color: isBold ? theme.accentColor : 'inherit' }}>
                    {project.title}
                  </h4>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Problem Statement</p>
                        <p className="text-sm font-medium leading-relaxed opacity-70">{project.problem}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Intervention (PDSA)</p>
                        <p className="text-sm font-medium leading-relaxed opacity-70">{project.intervention}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderColor: isDark ? '#222' : '#F9F9F9' }}>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Process Metric</p>
                        <p className="text-xs font-bold">{project.metric}</p>
                      </div>
                      <div className="bg-green-50 px-4 py-2 rounded-full border border-green-100 flex items-center gap-2" style={{ backgroundColor: isDark ? '#062010' : '#F0FDF4', borderColor: isDark ? '#064e3b' : '#DCFCE7' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-black text-green-700 uppercase tracking-widest" style={{ color: isDark ? '#4ade80' : '#15803d' }}>{project.result}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CV Highlights Section */}
        <div className="mb-16 space-y-6 text-left px-2">
           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center mb-6">Core Achievements</h3>
           <div className="grid grid-cols-1 gap-4">
             {highlights.map((item, idx) => (
               <a 
                 key={idx}
                 href={formatUrl(item.link)}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="group p-6 rounded-[2rem] bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500"
                 style={{ 
                    backgroundColor: isDark ? '#111' : '#FFF',
                    borderColor: isDark ? '#222' : '#F1F1F1'
                 }}
               >
                 <div className="flex items-start justify-between gap-4">
                   <div className="space-y-2">
                     <h4 className="font-black text-lg leading-tight" style={{ color: isBold ? theme.accentColor : 'inherit' }}>
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
