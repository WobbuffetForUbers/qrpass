import { UserProfile, DesignPrefs } from "@/lib/models";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { BASE_URL } from "@/lib/constants";
import Link from "next/link";
import SaveContactButton from "./SaveContactButton";
import ProfileQR from "./ProfileQR";
import AnalyticsTracker from "./AnalyticsTracker";
import HandshakeSystem from "./HandshakeSystem";
import ProfileQRCode from "@/components/ProfileQRCode";

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
  const { uid: identifier } = await params;

  let userData: UserProfile | null = null;

  try {
    const docRef = doc(db, "users", identifier);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      userData = docSnap.data() as UserProfile;
    } else {
      const q = query(collection(db, "users"), where("slug", "==", identifier), limit(1));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        userData = querySnap.docs[0].data() as UserProfile;
      }
    }
  } catch (error) {
    console.error("Firestore Fetch Error:", error);
    throw new Error("Failed to load profile data.");
  }

  if (!userData) return notFound();

  const actualUid = userData.uid;

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
    display: 'font-black tracking-tight'
  }[theme.font || 'sans'];

  const formatUrl = (url: string) => {
    if (!url) return "#";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  const highlights = userData.cvHighlights || [];
  const projects = userData.qiProjects || [];
  const hackathons = userData.hackathonProjects || [];
  const roles = (userData.roles && userData.roles.length > 0) ? userData.roles : [{ jobTitle: userData.jobTitle || "", company: userData.company || "" }];
  
  const primaryRole = (userData.roles && userData.primaryRoleIndex !== undefined) 
    ? userData.roles[userData.primaryRoleIndex] 
    : roles[0];

  const publicProfileUrl = userData.slug ? `${BASE_URL}/u/${userData.slug}` : `${BASE_URL}/u/${actualUid}`;

  return (
    <main 
      className={`min-h-screen flex flex-col items-center transition-all duration-1000 ${fontClass} antialiased`}
      style={{ 
        backgroundColor: isDark ? '#0A0A0A' : '#F9F9F9',
        color: isDark ? '#F3F4F6' : '#111827',
        filter: !isPremium ? 'grayscale(100%)' : 'none'
      }}
    >
      <AnalyticsTracker uid={actualUid} />

      {/* HORIZONTAL MODE OVERLAY (TRADITIONAL BUSINESS CARD) */}
      <div className="hidden landscape:flex fixed inset-0 z-[500] items-center justify-center p-6 sm:p-12 animate-in fade-in duration-500" style={{ backgroundColor: isDark ? '#000' : '#F0F0F0' }}>
        <div 
          className="w-full max-w-[800px] aspect-[1.75/1] bg-white rounded-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex relative group"
          style={{ backgroundColor: isDark ? '#111' : '#FFF' }}
        >
          {/* Subtle Aesthetic Edge */}
          <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: theme.accentColor }}></div>
          
          {/* Left Side: Professional Photo / Identity */}
          <div className="w-1/3 h-full flex flex-col items-center justify-center p-8 bg-gray-50/50" style={{ backgroundColor: isDark ? '#1A1A1A' : '#F9F9F9' }}>
            <div 
              className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 shadow-xl mb-4"
              style={{ borderColor: theme.accentColor }}
            >
              {userData.avatarUrl ? (
                <img src={userData.avatarUrl} alt={userData.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black" style={{ color: theme.accentColor }}>
                  {userData.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">qrPass Identity</p>
              <p className="text-[8px] font-mono opacity-20 uppercase tracking-tighter">Verified Node</p>
            </div>
          </div>

          {/* Right Side: Professional Details */}
          <div className="flex-1 h-full p-12 flex flex-col justify-between text-black">
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-4xl font-black tracking-tighter leading-none" style={{ color: isDark ? '#FFF' : '#000' }}>
                  {userData.displayName}
                </h2>
                <div className="flex items-center gap-3">
                  <div className="h-0.5 w-8" style={{ backgroundColor: theme.accentColor }}></div>
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-600" style={{ color: theme.accentColor }}>
                    {primaryRole.jobTitle}
                  </p>
                </div>
                <p className="text-xs font-medium opacity-40 uppercase tracking-widest pl-11">
                  {primaryRole.company}
                </p>
              </div>

              {userData.bio && (
                <p className="text-[10px] font-medium opacity-50 leading-relaxed pl-11 max-w-[320px] line-clamp-2 italic" style={{ color: isDark ? '#BBB' : '#444' }}>
                  "{userData.bio}"
                </p>
              )}

              <div className="pl-11 space-y-3">
                {userData.email && (
                  <div className="flex items-center gap-3 opacity-60">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <p className="text-[10px] font-black uppercase tracking-widest">{userData.email}</p>
                  </div>
                )}
                {userData.phone && (
                  <div className="flex items-center gap-3 opacity-60">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <p className="text-[10px] font-black uppercase tracking-widest">{userData.phone}</p>
                  </div>
                )}
                {userData.showGitHub && userData.githubUsername && (
                  <div className="flex items-center gap-3 opacity-60">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.414-4.041-1.414-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    <p className="text-[10px] font-black uppercase tracking-widest">github.com/{userData.githubUsername}</p>
                  </div>
                )}
                {userData.bookingUrl && (
                  <div className="flex items-center gap-3 opacity-60">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-[10px] font-black uppercase tracking-widest">Schedule Meeting</p>
                  </div>
                )}
                {(userData.links || []).slice(0, 1).map((link, idx) => (
                  <div key={idx} className="flex items-center gap-3 opacity-60">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.101-1.101" /></svg>
                    <p className="text-[10px] font-black uppercase tracking-widest">{link.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="space-y-1 opacity-20">
                <p className="text-[8px] font-black uppercase tracking-[0.3em]">Digital Infrastructure</p>
                <p className="text-[8px] font-mono leading-none">{publicProfileUrl.replace("https://", "")}</p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                <ProfileQRCode profileUrl={publicProfileUrl} size={80} photoUrl={undefined} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PORTRAIT MODE (Normal Content) */}
      <div className="max-w-3xl w-full mt-4 sm:mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out landscape:hidden p-4 sm:p-12">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          <div className="flex-shrink-0">
            <ProfileQR uid={actualUid} slug={userData.slug} avatarUrl={userData.avatarUrl} size={180} />
          </div>
          <div 
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-[3rem] flex items-center justify-center text-5xl sm:text-6xl font-black shadow-2xl overflow-hidden border-4 border-white bg-white"
            style={{ color: theme.accentColor, borderColor: isDark ? '#1A1A1A' : '#FFFFFF' }}
          >
            {userData.avatarUrl ? <img src={userData.avatarUrl} alt={userData.displayName} className="w-full h-full object-cover" /> : String(userData.displayName || "?").charAt(0)}
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none text-black" style={{ color: isBold ? (isDark ? '#FFF' : '#000') : theme.accentColor }}>
            {userData.displayName}
          </h1>
          <div className="flex flex-col items-center gap-1">
            {roles.filter(r => r.jobTitle || r.company).map((role, idx) => (
              <p key={idx} className="text-lg font-bold opacity-60 uppercase tracking-widest text-[10px] text-black">
                {role.jobTitle} {role.company ? `@ ${role.company}` : ''}
              </p>
            ))}
          </div>
          <p className="text-md sm:text-lg font-medium opacity-40 leading-relaxed max-w-sm mx-auto text-black">
            {userData.bio}
          </p>
        </div>

        <HandshakeSystem ownerUid={actualUid} bookingUrl={userData.bookingUrl} />

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
           <SaveContactButton user={userData} accentColor={theme.accentColor} isBold={isBold} />
           {userData.linkedinUrl && (
             <a href={formatUrl(userData.linkedinUrl)} target="_blank" rel="noopener noreferrer" className="px-6 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2" style={{ backgroundColor: '#0077B5', color: '#FFFFFF' }}>
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
               LinkedIn
             </a>
           )}
           {userData.substackUrl && (
             <a href={formatUrl(userData.substackUrl)} target="_blank" rel="noopener noreferrer" className="px-6 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2" style={{ backgroundColor: '#FF6719', color: '#FFFFFF' }}>
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.539 8.242H1.46V5.406h21.079v2.836zm0 4.881H1.46v-2.836h21.079v2.836zm0 4.881H1.46V15.17h21.079v2.834zm-21.079 1.252l10.539 5.742l10.539-5.742v1.948l-10.539 5.742l-10.539-5.742v-1.948z"/></svg>
               Substack
             </a>
           )}
           {userData.bookingUrl && (
             <a href={formatUrl(userData.bookingUrl)} target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2" style={{ backgroundColor: isDark ? '#FFFFFF' : '#000000', color: isDark ? '#000000' : '#FFFFFF' }}>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
               Schedule Meeting
             </a>
           )}
        </div>

        <div className="w-full space-y-4 text-left px-2 text-black">
          {userData.showCvHighlights && highlights.length > 0 && (
            <details className="group bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm transition-all duration-500" style={{ backgroundColor: isDark ? '#111' : '#FFF', borderColor: isDark ? '#222' : '#F1F1F1' }}>
              <summary className="p-6 cursor-pointer list-none flex justify-between items-center font-black uppercase tracking-widest text-[10px] opacity-50 hover:opacity-100 transition-opacity">
                Core Achievements
                <svg className="w-4 h-4 transition-transform duration-500 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-6 pb-6 space-y-4">
                {highlights.map((item, idx) => (
                  <a key={idx} href={formatUrl(item.link)} target="_blank" rel="noopener noreferrer" className="group block p-5 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-300" style={{ backgroundColor: isDark ? '#1A1A1A' : '#F9F9F9' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm leading-tight" style={{ color: isBold ? theme.accentColor : 'inherit' }}>{item.title}</h4>
                        <p className="text-[11px] font-medium opacity-50 leading-snug">{item.description}</p>
                      </div>
                      <div className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: theme.accentColor }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </details>
          )}

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

          {userData.showHackathons && hackathons.length > 0 && (
            <details className="group bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm transition-all duration-500" style={{ backgroundColor: isDark ? '#111' : '#FFF', borderColor: isDark ? '#222' : '#F1F1F1' }}>
              <summary className="p-6 cursor-pointer list-none flex justify-between items-center font-black uppercase tracking-widest text-[10px] opacity-50 hover:opacity-100 transition-opacity">
                Innovation Gallery
                <svg className="w-4 h-4 transition-transform duration-500 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-6 pb-6 space-y-4">
                {hackathons.map((pitch, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-gray-50/50 relative overflow-hidden text-black" style={{ backgroundColor: isDark ? '#1A1A1A' : '#F9F9F9' }}>
                    <h4 className="font-bold text-sm mb-2" style={{ color: isBold ? theme.accentColor : 'inherit' }}>{pitch.title}</h4>
                    <div className="space-y-3">
                      <p className="text-[11px] font-medium opacity-50 leading-snug">{pitch.problem}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pitch.techStack.map(tech => (
                          <span key={tech} className="px-1.5 py-0.5 rounded bg-white text-[8px] font-bold border border-gray-100" style={{ backgroundColor: isDark ? '#222' : '#FFF', color: theme.accentColor }}>{tech}</span>
                        ))}
                      </div>
                      <p className="text-[9px] font-black text-green-600 uppercase tracking-tight" style={{ color: isDark ? '#4ade80' : '#15803d' }}>{pitch.outcome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {userData.showQiProjects && projects.length > 0 && (
            <details className="group bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm transition-all duration-500" style={{ backgroundColor: isDark ? '#111' : '#FFF', borderColor: isDark ? '#222' : '#F1F1F1' }}>
              <summary className="p-6 cursor-pointer list-none flex justify-between items-center font-black uppercase tracking-widest text-[10px] opacity-50 hover:opacity-100 transition-opacity">
                Clinical Integration Portfolio
                <svg className="w-4 h-4 transition-transform duration-500 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-6 pb-6 space-y-4">
                {projects.map((project, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-gray-50/50 transition-all duration-500 overflow-hidden relative" style={{ backgroundColor: isDark ? '#1A1A1A' : '#F9F9F9' }}>
                    <h4 className="font-bold text-sm mb-3 tracking-tight" style={{ color: isBold ? theme.accentColor : 'inherit' }}>{project.title}</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1"><p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Problem</p><p className="text-[11px] font-medium leading-relaxed opacity-70">{project.problem}</p></div>
                        <div className="space-y-1"><p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Intervention</p><p className="text-[11px] font-medium leading-relaxed opacity-70">{project.intervention}</p></div>
                      </div>
                      <div className="pt-3 border-t border-gray-100/10 flex justify-between items-center gap-4">
                        <div className="space-y-1"><p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Metric</p><p className="text-[10px] font-bold">{project.metric}</p></div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                          <span className="text-[9px] font-black text-green-700 uppercase tracking-widest" style={{ color: isDark ? '#4ade80' : '#15803d' }}>{project.result}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="space-y-3 w-full px-2 text-black">
          {(userData.links || []).map((link, index) => (
            <a key={index} href={formatUrl(String(link.url || "#"))} target="_blank" rel="noopener noreferrer" className={`group relative block w-full p-5 rounded-[1.5rem] font-bold text-lg transition-all duration-500 hover:scale-[1.03] active:scale-95 shadow-lg`} style={{ backgroundColor: isBold ? theme.accentColor : (isDark ? '#1A1A1A' : '#FFFFFF'), border: !isBold ? `1px solid ${isDark ? '#333' : '#EEE'}` : 'none', color: isBold ? '#FFFFFF' : (isDark ? '#F3F4F6' : '#111827') }}>
              <div className="flex items-center justify-center gap-3">{String(link.label || "Link")}<span className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">↗</span></div>
            </a>
          ))}
        </div>

        <div className="pb-12 flex flex-col items-center gap-4 text-black">
          {!isPremium ? (
            <div className="px-6 py-2 bg-black/5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase opacity-30">qrPass Card</div>
          ) : (
            <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full shadow-inner">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accentColor }}></span>
              <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Verified Pro Card</span>
            </div>
          )}
          <Link href="/" className="text-[10px] font-bold opacity-20 hover:opacity-50 transition-opacity uppercase tracking-widest">Create your own qrPass →</Link>
        </div>
      </div>
    </main>
  );
}
