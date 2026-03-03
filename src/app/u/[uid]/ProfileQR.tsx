"use client";

import ProfileQRCode from "@/components/ProfileQRCode";

interface Props {
  uid: string;
  avatarUrl?: string;
  size?: number;
}

export default function ProfileQR({ uid, avatarUrl, size = 120 }: Props) {
  // Use the current domain dynamically
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${uid}`;
  
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Scan Profile</p>
      <div className="p-3 bg-white rounded-3xl shadow-xl">
        <ProfileQRCode 
          profileUrl={publicUrl} 
          photoUrl={avatarUrl}
          size={size}
        />
      </div>
    </div>
  );
}
