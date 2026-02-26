"use client";

import { QRCodeCanvas } from "qrcode.react";

interface Props {
  uid: string;
}

export default function ProfileQR({ uid }: Props) {
  // Use the permanent production domain to avoid Vercel's preview authentication
  const publicUrl = `https://qrpass-nine-zeta.vercel.app/u/${uid}`;
  
  return (
    <div className="mb-16 flex flex-col items-center gap-4">
      <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Scan to share profile</p>
      <div className="p-3 bg-white rounded-3xl shadow-xl">
        <QRCodeCanvas 
          value={publicUrl} 
          size={120} 
          level="M" 
          includeMargin={true} 
        />
      </div>
    </div>
  );
}
