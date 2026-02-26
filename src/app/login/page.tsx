"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [uid, setUid] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (uid.trim()) {
      router.push(`/u/${uid.trim()}`);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50 text-black font-sans">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black mb-2">Welcome Back</h2>
          <p className="text-gray-400 font-medium">Enter your ID to view your profile</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="uid" className="block text-sm font-bold uppercase tracking-wider text-gray-500 ml-1">
              User ID
            </label>
            <input
              id="uid"
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="e.g. your-unique-id"
              className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl outline-none transition-all font-medium text-lg"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
          >
            Access Profile
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">
            Don't have an ID? <br />
            <span className="font-bold text-black">Sign up in the iOS App</span>
          </p>
        </div>
      </div>
    </main>
  );
}
