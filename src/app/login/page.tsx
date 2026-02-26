"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [method, setMethod] = useState<"google" | "email">("google");
  const router = useRouter();

  const setupProfile = async (user: any) => {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await setDoc(docRef, {
        uid: user.uid,
        displayName: user.displayName || email.split('@')[0] || "New User",
        bio: "Welcome to my qrPass!",
        links: [],
        isPremium: false,
        designPrefs: { theme: 'minimal', accentColor: '#000000' }
      });
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await setupProfile(result.user);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login Error:", error);
      alert(error.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setupProfile(result.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Auth Error:", error);
      alert(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50 text-black font-sans">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-black">qr</span>
            </div>
          </div>
          <h2 className="text-3xl font-black mb-2">
            {method === "google" ? "Secure Access" : (isRegistering ? "Create Account" : "Welcome Back")}
          </h2>
          <p className="text-gray-400 font-medium">Manage your digital identity</p>
        </div>

        <div className="space-y-6">
          {/* Method Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setMethod("google")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${method === "google" ? "bg-white shadow-sm" : "text-gray-400"}`}
            >
              Google
            </button>
            <button 
              onClick={() => setMethod("email")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${method === "email" ? "bg-white shadow-sm" : "text-gray-400"}`}
            >
              Email
            </button>
          </div>

          {method === "google" ? (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-4 flex items-center justify-center gap-3 bg-white border-2 border-gray-100 rounded-2xl font-bold text-lg hover:border-black hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
            >
              {loading ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input 
                type="email" 
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none transition-all font-semibold"
                required
              />
              <input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none transition-all font-semibold"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
              >
                {loading ? "Processing..." : (isRegistering ? "Sign Up" : "Sign In")}
              </button>
              <p className="text-center text-sm font-medium">
                {isRegistering ? "Already have an account?" : "New to qrPass?"}{" "}
                <button 
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="font-black underline"
                >
                  {isRegistering ? "Sign In" : "Create Account"}
                </button>
              </p>
            </form>
          )}
        </div>

        <div className="mt-10 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">
            Securely managed via Firebase Auth
          </p>
        </div>
      </div>
    </main>
  );
}
