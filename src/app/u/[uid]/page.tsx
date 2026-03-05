import { UserProfile, DesignPrefs } from "@/lib/models";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import SaveContactButton from "./SaveContactButton";
import ProfileQR from "./ProfileQR";
import AnalyticsTracker from "./AnalyticsTracker";
import HandshakeSystem from "./HandshakeSystem";

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
        pubdate: article.pubdate?.split(" ")[0],
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}`
      };
    }).filter(Boolean);
  } catch (error) {
    console.error("PubMed Fetch Error:", error);
    return [];
  }
}

async function fetchDOIArticles(dois: string[]) {
  if (!dois || dois.length === 0) return [];
  try {
    const fetchPromises = dois.map(async (doi) => {
      const res = await fetch(`https://api.crossref.org/works/${doi}`, {
        next: { revalidate: 3600 }
      });
      if (!res.ok) return null;
      const json = await res.json();
      const item = json.message;
      return {
        uid: doi,
        title: item.title?.[0] || "Unknown Title",
        authors: item.author?.map((a: any) => `${a.given} ${a.family}`).join(", ") || "Unknown Authors",
        source: item['container-title']?.[0] || "DOI Indexed",
        pubdate: item.created?.['date-parts']?.[0]?.[0] || "N/A",
        url: `https://doi.org/${doi}`
      };
    });
    const results = await Promise.all(fetchPromises);
    return results.filter(Boolean);
  } catch (error) {
    console.error("DOI Fetch Error:", error);
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

  // Fetch Live Data only if toggled on
  const fetchPromises = [];
  if (userData.showGitHub && userData.githubUsername) {
    fetchPromises.push(fetchGitHubRepos(userData.githubUsername));
  } else {
    fetchPromises.push(Promise.resolve([]));
  }

  if (userData.showPublications) {
    const pmids = userData.pubmedIds || [];
    const dois = userData.doiIds || [];
    fetchPromises.push(Promise.all([
      pmids.length > 0 ? fetchPubMedArticles(pmids) : Promise.resolve([]),
      dois.length > 0 ? fetchDOIArticles(dois) : Promise.resolve([])
    ]));
  } else {
    fetchPromises.push(Promise.resolve([[], []]));
  }

  const [repos, pubData] = await Promise.all(fetchPromises);
  const allArticles = [...pubData[0], ...pubData[1]];

  const isPremium = userData.isPremium === true;
  const theme: DesignPrefs = isPremium && userData.designPrefs
    ? userData.designPrefs 
    : { theme: 'minimal', accentColor: '#000000', font: 'sans' };

  const isDark = theme.theme === 'dark';
  const isBold = theme.theme === 'bold';

  const fontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
    display: 'font-black tracking-tight' // Custom display style
  }[theme.font || 'sans'];

  const formatUrl = (url: string) => {
    if (!url) return "#";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  const highlights = userData.cvHighlights || [];
  const projects = userData.qiProjects || [];
  const hackathons = userData.hackathonProjects || [];
  const roles = (userData.roles && userData.roles.length > 0) ? userData.roles : [{ jobTitle: userData.jobTitle || "", company: userData.company || "" }];

  return (
    <main 
      className={`min-h-screen flex flex-col items-center p-4 sm:p-12 transition-all duration-1000 ${fontClass} antialiased`}
      style={{ 
        backgroundColor: isDark ? '#0A0A0A' : '#F9F9F9',
        color: isDark ? '#F3F4F6' : '#111827',
        filter: !isPremium ? 'grayscale(100%)' : 'none'
      }}
    >
      <AnalyticsTracker uid={uid} />
      
      <div className="max-w-3xl w-full mt-4 sm:mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        
        {/* Unified Identity Header (QR & Photo) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-black">
          <div className="flex-shrink-0">
            <ProfileQR uid={uid} avatarUrl={userData.avatarUrl} size={180} />
          </div>
          <div 
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-[3rem] flex items-center justify-center text-5xl sm:text-6xl font-black shadow-2xl overflow-hidden border-4 border-white bg-white"
            style={{ 
              color: theme.accentColor,
              borderColor: isDark ? '#1A1A1A' : '#FFFFFF'
            }}
          >
            {userData.avatarUrl ? (
              <img src={userData.avatarUrl} alt={userData.displayName} className="w-full h-full object-cover" />
            ) : (
              String(userData.displayName || "?").charAt(0)
            )}
          </div>
        </div>

        {/* Profile Identity Text */}
        <div className="text-center space-y-2 text-black">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none" style={{ color: isBold ? (isDark ? '#FFF' : '#000') : theme.accentColor }}>
            {String(userData.displayName || "Anonymous")}
          </h1>
          <div className="flex flex-col items-center gap-1">
            {roles.filter(r => r.jobTitle || r.company).map((role, idx) => (
              <p key={idx} className="text-lg font-bold opacity-60 uppercase tracking-widest text-[10px]">
                {role.jobTitle} {role.company ? `@ ${role.company}` : ''}
              </p>
            ))}
          </div>
          <p className="text-md sm:text-lg font-medium opacity-40 leading-relaxed max-w-sm mx-auto">
            {String(userData.bio || "")}
          </p>
        </div>

        <HandshakeSystem ownerUid={uid} />

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
           <SaveContactButton user={userData} accentColor={theme.accentColor} isBold={isBold} />
           {userData.bookingUrl && (
             <a
               href={formatUrl(userData.bookingUrl)}
               target="_blank"
               rel="noopener noreferrer"
               className="px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2"
               style={{
                 backgroundColor: isDark ? '#FFFFFF' : '#000000',
                 color: isDark ? '#000000' : '#FFFFFF'
               }}
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
               Schedule Meeting
             </a>
           )}
        </div>

        {/* Core Achievements Section */}
        {userData.showCvHighlights && highlights.length > 0 && (
          <div className="space-y-6 text-left px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center">Core Achievements</h3>
            <div className="grid grid-cols-1 gap-4">
              {highlights.map((item, idx) => (
                <a 
                  key={idx}
                  href={formatUrl(item.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-6 rounded-[2.5rem] bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500"
                  style={{ 
                      backgroundColor: isDark ? '#111' : '#FFF',
                      borderColor: isDark ? '#222' : '#F1F1F1'
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h4 className="font-black text-lg leading-tight text-black" style={{ color: isBold ? theme.accentColor : 'inherit' }}>
                        {item.title}
                      </h4>
                      <p className="text-sm font-medium opacity-50 leading-relaxed text-black">
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
        )}

        {/* Innovation Gallery (Hackathons) */}
        {userData.showHackathons && hackathons.length > 0 && (
          <div className="space-y-6 text-left px-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center text-black">Innovation Gallery</h3>
            <div className="grid grid-cols-1 gap-6">
              {hackathons.map((pitch, idx) => (
                <div 
                  key={idx}
                  className="p-8 rounded-[2.5rem] bg-white border border-gray-100 shadow-sm relative overflow-hidden"
                  style={{ 
                      backgroundColor: isDark ? '#111' : '#FFF',
                      borderColor: isDark ? '#222' : '#F1F1F1'
                  }}
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: theme.accentColor }}></div>
                  <h4 className="font-black text-xl mb-4 text-black" style={{ color: isBold ? theme.accentColor : 'inherit' }}>{pitch.title}</h4>
                  <div className="space-y-4 text-black">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Problem Space</p>
                      <p className="text-xs font-medium opacity-70 leading-relaxed">{pitch.problem}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Tech Stack</p>
                      <div className="flex flex-wrap gap-2">
                        {pitch.techStack.map(tech => (
                          <span key={tech} className="px-2 py-1 rounded-md bg-gray-50 text-[9px] font-bold border border-gray-100" style={{ backgroundColor: isDark ? '#1A1A1A' : '#F9F9F9', color: theme.accentColor }}>{tech}</span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-50" style={{ borderColor: isDark ? '#222' : '#F9F9F9' }}>
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Outcome</p>
                      <p className="text-xs font-bold text-green-600 uppercase tracking-tight" style={{ color: isDark ? '#4ade80' : '#15803d' }}>{pitch.outcome}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integration Accordions */}
        <div className="w-full space-y-4 text-left px-2 text-black">
          {userData.showPublications && allArticles.length > 0 && (
            <details className="group bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm transition-all duration-500" style={{ backgroundColor: isDark ? '#111' : '#FFF', borderColor: isDark ? '#222' : '#F1F1F1' }}>
              <summary className="p-6 cursor-pointer list-none flex justify-between items-center font-black uppercase tracking-widest text-[10px] opacity-50 hover:opacity-100 transition-opacity">
                Clinical Research
                <svg className="w-4 h-4 transition-transform duration-500 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-6 pb-6 space-y-6">
                {allArticles.map((article: any, i: number) => (
                  <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className="block space-y-1 hover:opacity-70 transition-opacity">
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

          {userData.showGitHub && repos.length > 0 && (
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

        {/* Clinical Integration Portfolio */}
        {userData.showQiProjects && projects.length > 0 && (
          <div className="space-y-8 text-left px-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center text-black">Clinical Integration Portfolio</h3>
            <div className="grid grid-cols-1 gap-6 text-black">
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

        <div className="space-y-3 w-full px-2 text-black">
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

        <div className="pb-12 flex flex-col items-center gap-4 text-black">
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
