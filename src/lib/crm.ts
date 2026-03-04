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
    const newDocRef = doc(encountersRef); 
    
    // SANITIZE: Firestore does not accept 'undefined'. Convert to null or remove.
    const sanitizedData = JSON.parse(JSON.stringify(encounterData, (key, value) => {
      return value === undefined ? null : value;
    }));
    
    await setDoc(newDocRef, {
      ...sanitizedData,
      id: newDocRef.id,
      timestamp: serverTimestamp(),
    });
    
    return newDocRef.id;
  } catch (error: any) {
    console.error("FIRESTORE CRM SAVE ERROR:", error.code, error.message);
    throw error;
  }
}
