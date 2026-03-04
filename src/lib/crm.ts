import { db } from "./firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Encounter } from "./models";

/**
 * Saves a new encounter to the user's private CRM subcollection.
 * Path: users/{uid}/encounters/{encounterId}
 */
export async function saveEncounter(uid: string, encounterData: Omit<Encounter, "id" | "timestamp">) {
  try {
    const path = `users/${uid}/encounters`;
    console.log("Attempting to save encounter to:", path, encounterData);
    
    const encountersRef = collection(db, "users", uid, "encounters");
    const newDocRef = doc(encountersRef); // Auto-generate ID
    
    await setDoc(newDocRef, {
      ...encounterData,
      id: newDocRef.id,
      timestamp: serverTimestamp(),
    });
    
    console.log("Encounter saved successfully with ID:", newDocRef.id);
    return newDocRef.id;
  } catch (error: any) {
    console.error("FIRESTORE CRM SAVE ERROR:", error.code, error.message);
    throw error;
  }
}
