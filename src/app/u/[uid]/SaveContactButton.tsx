"use client";

import { useState } from "react";
import { UserProfile } from "@/lib/models";

interface Props {
  user: UserProfile;
  accentColor: string;
  isBold: boolean;
}

export default function SaveContactButton({ user, accentColor, isBold }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  const imageUrlToBase64 = async (url: string): Promise<string | null> => {
    try {
      console.log("Fetching vCard Image:", url);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Image fetch failed");
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const objectUrl = URL.createObjectURL(blob);
        
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const SIZE = 200; // Small size for vCard stability
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext("2d");
          
          let sX = 0, sY = 0, sW = img.width, sH = img.height;
          if (img.width > img.height) { sW = img.height; sX = (img.width - img.height) / 2; } 
          else { sH = img.width; sY = (img.height - img.width) / 2; }
          
          ctx?.drawImage(img, sX, sY, sW, sH, 0, 0, SIZE, SIZE);
          
          const dataURL = canvas.toDataURL("image/jpeg", 0.6); // Higher compression for mobile loading
          URL.revokeObjectURL(objectUrl);
          resolve(dataURL.split(",")[1]);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        
        img.src = objectUrl;
      });
    } catch (e) {
      console.error("VCard Image Error:", e);
      return null;
    }
  };

  const downloadVCard = async () => {
    setIsGenerating(true);
    
    // 1. ROBUST NAME PARSING
    const fullName = user.displayName.trim();
    let firstName = "";
    let lastName = "";
    let suffix = "";

    if (fullName.includes(",")) {
      const [namePart, suffixPart] = fullName.split(",").map(s => s.trim());
      suffix = suffixPart;
      const nameBits = namePart.split(/\s+/);
      firstName = nameBits[0] || "";
      lastName = nameBits.slice(1).join(" ");
    } else {
      const nameBits = fullName.split(/\s+/);
      firstName = nameBits[0] || "";
      lastName = nameBits.slice(1).join(" ");
    }

    // 2. PRIMARY ROLE
    const primaryRole = (user.roles && user.primaryRoleIndex !== undefined) 
      ? user.roles[user.primaryRoleIndex] 
      : (user.roles && user.roles.length > 0) ? user.roles[0] : { jobTitle: user.jobTitle || "", company: user.company || "" };

    // 3. IMAGE & FOLDING
    let photoBase64 = null;
    if (user.avatarUrl) {
      photoBase64 = await imageUrlToBase64(user.avatarUrl);
    }

    const foldLine = (str: string) => {
      return str.match(/.{1,72}/g)?.join("\r\n ") || str;
    };

    // 4. URL (Prefer Slug)
    const identifier = user.slug || user.uid;
    const profileUrl = `https://qrpass.hsieh.org/u/${identifier}`;

    // 5. VCARD 3.0 CONSTRUCTION (Best for Modern iOS)
    const vCardLines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${fullName}`,
      `N:${lastName};${firstName};; ;${suffix}`,
      primaryRole.jobTitle ? `TITLE:${primaryRole.jobTitle}` : "",
      primaryRole.company ? `ORG:${primaryRole.company}` : "",
      user.phone ? `TEL;TYPE=CELL,VOICE:${user.phone}` : "",
      user.email ? `EMAIL;TYPE=PREF,INTERNET:${user.email}` : "",
      user.bio ? `NOTE:${user.bio.replace(/\n/g, " ")}` : "",
      `URL;TYPE=WORK:${profileUrl}`,
    ];

    if (photoBase64) {
      // Line folding is CRITICAL for PHOTO base64 data in vCard 3.0
      vCardLines.push("PHOTO;TYPE=JPEG;ENCODING=b:" + foldLine(photoBase64));
    }

    vCardLines.push("END:VCARD");

    const blob = new Blob([vCardLines.join("\r\n")], { type: "text/vcard;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement("a"));
    link.href = url;
    link.setAttribute("download", `${fullName.replace(/[\s,]+/g, "_")}.vcf`);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setIsGenerating(false);
  };

  return (
    <button
      onClick={downloadVCard}
      disabled={isGenerating}
      className="px-10 py-4 rounded-full font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-xl disabled:opacity-50"
      style={{
        backgroundColor: accentColor,
        color: "#FFFFFF"
      }}
    >
      {isGenerating ? "Preparing..." : "Save to Contacts"}
    </button>
  );
}
