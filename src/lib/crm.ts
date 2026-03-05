import { db } from "./firebase";
import { collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { Encounter, ConnectionProfile } from "./models";

/**
 * Saves a new encounter to the user's private CRM subcollection.
 */
export async function saveEncounter(uid: string, encounterData: Omit<Encounter, "id" | "timestamp">) {
  try {
    const encountersRef = collection(db, "users", uid, "encounters");
    const newDocRef = doc(encountersRef); 
    const sanitizedData = JSON.parse(JSON.stringify(encounterData, (key, value) => value === undefined ? null : value));
    
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

/**
 * Updates an existing encounter.
 */
export async function updateEncounter(uid: string, encounterId: string, data: Partial<Encounter>) {
  try {
    const docRef = doc(db, "users", uid, "encounters", encounterId);
    const { id, timestamp, ...updateData } = data as any;
    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating encounter:", error);
    throw error;
  }
}

/**
 * Creates or updates a master Connection Profile.
 */
export async function upsertConnectionProfile(uid: string, profileData: Partial<ConnectionProfile>) {
  try {
    const connectionsRef = collection(db, "users", uid, "connections");
    const docRef = profileData.id ? doc(db, "users", uid, "connections", profileData.id) : doc(connectionsRef);
    
    const finalData = {
      ...profileData,
      id: docRef.id,
      lastEncounterAt: serverTimestamp(),
      createdAt: profileData.id ? undefined : serverTimestamp()
    };

    // Remove undefined fields for Firestore
    const cleanData = JSON.parse(JSON.stringify(finalData));
    await setDoc(docRef, cleanData, { merge: true });
    
    return docRef.id;
  } catch (error) {
    console.error("Error upserting connection profile:", error);
    throw error;
  }
}

/**
 * Links an encounter to a specific Connection Profile.
 */
export async function linkEncounterToProfile(uid: string, encounterId: string, profileId: string) {
  try {
    const encounterRef = doc(db, "users", uid, "encounters", encounterId);
    await updateDoc(encounterRef, { connectionProfileId: profileId });
    return true;
  } catch (error) {
    console.error("Error linking encounter:", error);
    throw error;
  }
}

/**
 * Deletes an encounter from the user's private CRM.
 */
export async function deleteEncounter(uid: string, encounterId: string) {
  try {
    const docRef = doc(db, "users", uid, "encounters", encounterId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting encounter:", error);
    throw error;
  }
}

/**
 * Deletes a master connection profile.
 */
export async function deleteConnection(uid: string, profileId: string) {
  try {
    const docRef = doc(db, "users", uid, "connections", profileId);
    // Note: This doesn't un-link encounters automatically in this simple version
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting connection:", error);
    throw error;
  }
}

/**
 * Constructs a mailto URI for follow-up actions.
 */
export function constructMailto(type: 'update' | 'coffee', profile: ConnectionProfile, latestEncounter?: Encounter) {
  if (!profile.email) return null;

  const subject = type === 'update' ? "Checking in!" : "Catch up over coffee?";
  let body = `Hi ${profile.name},%0D%0A%0D%0A`;

  if (type === 'update') {
    const transcriptionSnippet = latestEncounter?.transcription ? `We spoke previously about: ${latestEncounter.transcription}.%0D%0A%0D%0A` : "";
    body += `${transcriptionSnippet}I wanted to follow up and...`;
  } else {
    body += `I'd love to grab a quick coffee/Zoom to hear what you are working on lately.%0D%0A%0D%0AIf you have 15 minutes to spare in the coming weeks, feel free to grab a time on my calendar. No pressure at all if your schedule is too packed right now!`;
  }

  return `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${body}`;
}
