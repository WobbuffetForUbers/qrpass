"use client";

import ProfileQRCode from "@/components/ProfileQRCode";

interface Props {
  uid: string;
  avatarUrl?: string;
}

export default function ProfileQR({ uid, avatarUrl }: Props) {
  // Use the current domain dynamically
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${uid}`;
  
  return (
    <div className="mb-16 flex flex-col items-center gap-4">
      <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Scan to share profile</p>
      <div className="p-3 bg-white rounded-3xl shadow-xl">
        <ProfileQRCode 
          profileUrl={publicUrl} 
          photoUrl={avatarUrl}
          size={120}
        />
      </div>
    </div>
  );
}
