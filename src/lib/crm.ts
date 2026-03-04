import { db } from "./firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Encounter } from "./models";

/**
 * Saves a new encounter to the user's private CRM subcollection.
 * Path: users/{uid}/encounters/{encounterId}
 */
export async function saveEncounter(uid: string, encounterData: Omit<Encounter, "id" | "timestamp">) {
  try {
    const encountersRef = collection(db, "users", uid, "encounters");
    const newDocRef = doc(encountersRef); // Auto-generate ID
    
    await setDoc(newDocRef, {
      ...encounterData,
      id: newDocRef.id,
      timestamp: serverTimestamp(), // Use server time for consistency
    });
    
    return newDocRef.id;
  } catch (error) {
    console.error("Error saving encounter:", error);
    throw error;
  }
}
