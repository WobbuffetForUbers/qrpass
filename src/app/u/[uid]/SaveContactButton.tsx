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
      console.log("Attempting to fetch image for vCard:", url);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Fetch failed");
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const objectUrl = URL.createObjectURL(blob);
        
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const SIZE = 200;
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext("2d");
          
          // Center Square Crop for vCard
          let sX = 0, sY = 0, sW = img.width, sH = img.height;
          if (img.width > img.height) { sW = img.height; sX = (img.width - img.height) / 2; } 
          else { sH = img.width; sY = (img.height - img.width) / 2; }
          
          ctx?.drawImage(img, sX, sY, sW, sH, 0, 0, SIZE, SIZE);
          
          const dataURL = canvas.toDataURL("image/jpeg", 0.7);
          URL.revokeObjectURL(objectUrl);
          resolve(dataURL.split(",")[1]);
        };
        
        img.onerror = (e) => {
          console.error("VCard Image Load Error:", e);
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        
        img.src = objectUrl;
      });
    } catch (e) {
      console.error("VCard Image Fetch Error:", e);
      return null;
    }
  };

  const downloadVCard = async () => {
    setIsGenerating(true);
    
    // 1. SMART NAME PARSING (Handle Degrees)
    // "Michael Hsieh, B.S." -> First: Michael, Last: Hsieh, B.S.
    const nameStr = user.displayName.trim();
    const hasComma = nameStr.includes(",");
    let firstName = "";
    let lastName = "";

    if (hasComma) {
      const [baseName, degree] = nameStr.split(",").map(s => s.trim());
      const parts = baseName.split(/\s+/);
      firstName = parts[0] || "";
      lastName = (parts.slice(1).join(" ") + ", " + degree).trim();
    } else {
      const parts = nameStr.split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ");
    }

    // 2. PRIMARY ROLE SELECTION
    const primaryRole = (user.roles && user.primaryRoleIndex !== undefined) 
      ? user.roles[user.primaryRoleIndex] 
      : (user.roles && user.roles.length > 0) ? user.roles[0] : { jobTitle: user.jobTitle || "", company: user.company || "" };

    // 3. IMAGE FETCHING
    let photoBase64 = null;
    if (user.avatarUrl) {
      photoBase64 = await imageUrlToBase64(user.avatarUrl);
    }

    // 4. URL SELECTION (Prefer Slug)
    const identifier = user.slug || user.uid;
    const profileUrl = `https://qrpass.hsieh.org/u/${identifier}`;

    const vCardLines = [
      "BEGIN:VCARD",
      "VERSION:2.1",
      `FN:${user.displayName}`,
      `N:${lastName};${firstName};;;`,
      primaryRole.jobTitle ? `TITLE:${primaryRole.jobTitle}` : "",
      primaryRole.company ? `ORG:${primaryRole.company}` : "",
      user.phone ? `TEL;CELL;VOICE:${user.phone}` : "",
      user.email ? `EMAIL;PREF;INTERNET:${user.email}` : "",
      user.bio ? `NOTE:${user.bio.replace(/\n/g, " ")}` : "",
      `URL;WORK:${profileUrl}`,
    ];

    if (photoBase64) {
      vCardLines.push(`PHOTO;JPEG;ENCODING=BASE64:`);
      vCardLines.push(photoBase64);
      vCardLines.push(""); 
    }

    vCardLines.push("END:VCARD");

    const blob = new Blob([vCardLines.join("\r\n")], { type: "text/vcard;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement("a"));
    link.href = url;
    link.setAttribute("download", `${user.displayName.replace(/[\s,]+/g, "_")}.vcf`);
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
