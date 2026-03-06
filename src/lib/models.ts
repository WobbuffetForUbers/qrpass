export interface Link {
  label: string;
  url: string;
}

export interface CVHighlight {
  title: string;
  description: string;
  link: string;
}

export interface Role {
  jobTitle: string;
  company: string;
}

export interface Encounter {
  id: string;
  type?: 'ghost_scan' | 'handshake' | 'manual';
  scannedUserId?: string | null;
  connectionProfileId?: string | null;
  contactName?: string;
  contactInfo?: string; // Legacy/General
  contactEmail?: string;
  contactPhone?: string;
  contactOther?: string;
  reason?: string;
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
    city: string;
  };
  contextChips: string[];
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  referrer?: string;
  transcription?: string;
  loopClosureDate?: Date | null;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  createdAt: Date;
  lastEncounterAt: Date;
}

export interface QIProject {
  title: string;
  problem: string;
  intervention: string;
  metric: string;
  result: string;
}

export interface HackathonProject {
  title: string;
  problem: string;
  techStack: string[];
  outcome: string;
  link?: string;
}

export interface DesignPrefs {
  theme: 'minimal' | 'bold' | 'dark';
  accentColor: string;
  font: 'sans' | 'serif' | 'mono' | 'display';
}

export interface UserProfile {
  uid: string;
  displayName: string;
  bio: string;
  roles?: Role[];
  primaryRoleIndex?: number;
  jobTitle?: string;
  company?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  bookingUrl?: string;
  cvHighlights?: CVHighlight[];
  qiProjects?: QIProject[];
  hackathonProjects?: HackathonProject[];
  showQiProjects?: boolean;
  showCvHighlights?: boolean;
  showPublications?: boolean;
  showGitHub?: boolean;
  showHackathons?: boolean;
  githubUsername?: string;
  pubmedIds?: string[];
  doiIds?: string[];
  links: Link[];
  isPremium: boolean;
  slug?: string;
  viewCount?: number;
  designPrefs: DesignPrefs;
}

// Mock data for immediate preview
export const MOCK_USER_FREE: UserProfile = {
  uid: "free-user-123",
  displayName: "Jane Doe (Free)",
  bio: "Exploring the world of QR identities.",
  links: [
    { label: "Portfolio", url: "https://example.com" },
    { label: "Twitter", url: "https://twitter.com" }
  ],
  isPremium: false,
  designPrefs: {
    theme: 'dark', // Should be ignored by Gatekeeper
    accentColor: '#FF5733', // Should be ignored by Gatekeeper
    font: 'sans'
  }
};

export const MOCK_USER_PREMIUM: UserProfile = {
  uid: "premium-user-456",
  displayName: "John Smith (Pro)",
  bio: "Senior Architect & Tech Enthusiast.",
  links: [
    { label: "LinkedIn", url: "https://linkedin.com" },
    { label: "GitHub", url: "https://github.com" }
  ],
  isPremium: true,
  designPrefs: {
    theme: 'dark',
    accentColor: '#3B82F6', // Blue accent
    font: 'sans'
  }
};
