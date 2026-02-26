import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white text-black font-sans">
      <div className="max-w-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center shadow-2xl">
            <span className="text-white text-4xl font-black">qr</span>
          </div>
        </div>
        
        <h1 className="text-6xl font-black tracking-tighter">
          qrPass
        </h1>
        
        <p className="text-xl text-gray-500 font-medium leading-relaxed px-4">
          Your professional identity, compressed into a single scan. 
          Beautiful, fast, and always on your home screen.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link 
            href="/login" 
            className="px-10 py-4 bg-black text-white rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg"
          >
            Get Started
          </Link>
          <Link 
            href="/u/me" 
            className="px-10 py-4 border-2 border-black rounded-full font-bold text-lg hover:bg-black hover:text-white transition-all"
          >
            View Demo
          </Link>
        </div>

        <div className="pt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          <div className="space-y-2">
            <h3 className="font-bold text-lg">Instant Sharing</h3>
            <p className="text-gray-500 text-sm">Scan to share contact info, CV, or socials instantly.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg">iOS Widget</h3>
            <p className="text-gray-500 text-sm">Keep your QR code on your home screen for quick access.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg">Pro Design</h3>
            <p className="text-gray-500 text-sm">Customize colors and themes to match your brand.</p>
          </div>
        </div>
      </div>

      <footer className="mt-24 text-gray-400 text-xs font-bold tracking-widest uppercase">
        Built for the Modern Professional
      </footer>
    </main>
  );
}
