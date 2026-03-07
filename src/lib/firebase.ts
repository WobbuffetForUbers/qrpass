import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache 
} from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDU9_wAnqF7ya5IG48pD4-KBqvISux3DjA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "qrpass-4f170.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "qrpass-4f170",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "qrpass-4f170.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "885772853221",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:885772853221:web:82476983831c509380190c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});

const auth = getAuth(app);

// Explicitly set persistence to LOCAL for reliable PWA sessions
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence);
}

const storage = getStorage(app);

export { db, auth, storage };
