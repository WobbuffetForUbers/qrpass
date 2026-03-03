"use client";

import { QRCodeSVG } from "qrcode.react";

interface ProfileQRCodeProps {
  profileUrl: string;
  photoUrl?: string;
  size?: number;
}

export default function ProfileQRCode({ profileUrl, photoUrl, size = 256 }: ProfileQRCodeProps) {
  const imageSize = Math.floor(size * 0.2); // 20% rule for guaranteed scannability

  return (
    <QRCodeSVG
      value={profileUrl}
      size={size}
      level="H" // 30% error correction
      includeMargin={true}
      imageSettings={
        photoUrl
          ? {
              src: photoUrl,
              height: imageSize,
              width: imageSize,
              excavate: true,
            }
          : undefined
      }
    />
  );
}
