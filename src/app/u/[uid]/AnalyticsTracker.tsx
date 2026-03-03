"use client";

import { useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";

interface Props {
  uid: string;
}

export default function AnalyticsTracker({ uid }: Props) {
  useEffect(() => {
    // Basic debounce/double-count prevention for the same session
    const storageKey = `viewed_${uid}`;
    const alreadyViewed = sessionStorage.getItem(storageKey);

    if (!alreadyViewed) {
      const trackView = async () => {
        try {
          const docRef = doc(db, "users", uid);
          await updateDoc(docRef, {
            viewCount: increment(1)
          });
          sessionStorage.setItem(storageKey, "true");
        } catch (error) {
          console.error("Analytics Error:", error);
        }
      };

      trackView();
    }
  }, [uid]);

  return null; // Silent component
}
