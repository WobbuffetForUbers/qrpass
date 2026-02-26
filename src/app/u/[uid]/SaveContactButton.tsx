"use client";

import { UserProfile } from "@/lib/models";

interface Props {
  user: UserProfile;
  accentColor: string;
  isBold: boolean;
}

export default function SaveContactButton({ user, accentColor, isBold }: Props) {
  const downloadVCard = () => {
    const vCard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${user.displayName}`,
      user.jobTitle ? `TITLE:${user.jobTitle}` : "",
      user.company ? `ORG:${user.company}` : "",
      user.phone ? `TEL;TYPE=CELL:${user.phone}` : "",
      user.email ? `EMAIL;TYPE=INTERNET:${user.email}` : "",
      user.bio ? `NOTE:${user.bio}` : "",
      `URL:https://qrpass-nine-zeta.vercel.app/u/${user.uid}`,
      "END:VCARD"
    ].filter(Boolean).join("\n");

    const blob = new Blob([vCard], { type: "text/vcard" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${user.displayName.replace(/\s+/g, "_")}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={downloadVCard}
      className="px-10 py-4 rounded-full font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-xl"
      style={{
        backgroundColor: accentColor,
        color: "#FFFFFF"
      }}
    >
      Save to Contacts
    </button>
  );
}
