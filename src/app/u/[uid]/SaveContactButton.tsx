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
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const objectUrl = URL.createObjectURL(blob);
        
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataURL = canvas.toDataURL("image/jpeg", 0.8);
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
      console.error("Image processing error:", e);
      return null;
    }
  };

  const downloadVCard = async () => {
    setIsGenerating(true);
    
    // Split displayName into first and last name for structured 'N' field
    const nameParts = user.displayName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    const middleNames = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

    let photoBase64 = null;
    if (user.avatarUrl) {
      photoBase64 = await imageUrlToBase64(user.avatarUrl);
    }

    // Helper to fold long lines (Required for some vCard parsers, especially iOS)
    const foldLine = (line: string) => {
      const MAX_LENGTH = 75;
      let result = "";
      for (let i = 0; i < line.length; i += MAX_LENGTH) {
        result += line.substring(i, i + MAX_LENGTH) + "\r\n ";
      }
      return result.trim();
    };

    const vCardLines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${user.displayName}`,
      `N:${lastName};${firstName};${middleNames};;`,
      user.jobTitle ? `TITLE:${user.jobTitle}` : "",
      user.company ? `ORG:${user.company}` : "",
      user.phone ? `TEL;TYPE=CELL:${user.phone}` : "",
      user.email ? `EMAIL;TYPE=INTERNET:${user.email}` : "",
      user.bio ? `NOTE:${user.bio}` : "",
      `URL:https://qrpass-nine-zeta.vercel.app/u/${user.uid}`,
    ];

    if (photoBase64) {
      // iOS expects the photo line to be formatted very specifically with Base64 encoding
      vCardLines.push(`PHOTO;TYPE=JPEG;ENCODING=b:${photoBase64.replace(/\s/g, "")}`);
    }

    vCardLines.push("END:VCARD");

    const blob = new Blob([vCardLines.join("\n")], { type: "text/vcard" });
    const url = window.URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement("a"));
    link.href = url;
    link.setAttribute("download", `${user.displayName.replace(/\s+/g, "_")}.vcf`);
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
