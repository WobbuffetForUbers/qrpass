export interface Link {
  label: string;
  url: string;
}

export interface DesignPrefs {
  theme: 'minimal' | 'bold' | 'dark';
  accentColor: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  bio: string;
  links: Link[];
  isPremium: boolean;
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
    accentColor: '#FF5733' // Should be ignored by Gatekeeper
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
    accentColor: '#3B82F6' // Blue accent
  }
};
