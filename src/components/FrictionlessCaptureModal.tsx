"use client";

import { useState, useRef, useEffect } from "react";
import { useAmbientContext } from "@/hooks/useAmbientContext";
import { saveEncounter } from "@/lib/crm";
import { auth } from "@/lib/firebase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scannedUserId?: string;
}

const DEFAULT_CHIPS = ["Hospital", "Conference", "Coffee", "Project Sync", "Follow-up"];

export default function FrictionlessCaptureModal({ isOpen, onClose, scannedUserId }: Props) {
  const { captureContext, loading: capturingContext } = useAmbientContext();
  const [context, setContext] = useState<any>(null);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      handleCaptureContext();
      setupSpeechRecognition();
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [isOpen]);

  const handleCaptureContext = async () => {
    const data = await captureContext();
    setContext(data);
  };

  const setupSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(prev => {
          // If we're ending a result, we'll append. This is a simplified real-time view.
          return currentTranscript; 
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript(""); // Clear previous for new session
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const toggleChip = (chip: string) => {
    setSelectedChips(prev => 
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsSaving(true);
    try {
      await saveEncounter(user.uid, {
        scannedUserId: scannedUserId || null,
        location: context?.location || { lat: 0, lng: 0, city: "Unknown" },
        contextChips: selectedChips,
        transcription: transcript.trim() || undefined,
      });
      onClose();
      // Reset state
      setSelectedChips([]);
      setTranscript("");
      setContext(null);
    } catch (err) {
      alert("Failed to save encounter.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
        
        {/* Header: Ambient Status */}
        <div className="bg-gray-50 p-8 border-b border-gray-100 flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Context Captured</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${capturingContext ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
              <p className="font-bold text-sm">
                {context?.location?.city || "Detecting Location..."}
              </p>
            </div>
            <p className="text-[10px] font-medium text-gray-400">
              {context?.timestamp ? new Date(context.timestamp).toLocaleTimeString() : "Syncing Time..."}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-black transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Quick Chips */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Quick Context</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                    selectedChips.includes(chip) 
                    ? 'bg-black text-white shadow-lg scale-105' 
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Input (Web Speech API) */}
          <div className="space-y-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Voice Dictation (Native)</p>
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={toggleListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isListening 
                  ? 'bg-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
                  : 'bg-black shadow-xl hover:scale-105'
                }`}
              >
                {isListening ? (
                  <div className="flex gap-1">
                    <span className="w-1 h-4 bg-white animate-pulse"></span>
                    <span className="w-1 h-6 bg-white animate-pulse delay-75"></span>
                    <span className="w-1 h-4 bg-white animate-pulse delay-150"></span>
                  </div>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                )}
              </button>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                {isListening ? "Listening... Tap to Stop" : "Tap to Dictate Notes"}
              </p>
            </div>

            {/* Real-time Transcription Area */}
            <div className="mt-4">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Spoken notes will appear here..."
                className="w-full p-6 bg-gray-50 rounded-[2rem] border-2 border-transparent focus:border-blue-100 outline-none text-xs font-medium leading-relaxed italic resize-none min-h-[100px] transition-all"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || capturingContext}
            className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:bg-gray-200"
          >
            {isSaving ? "Archiving Record..." : "Confirm & Save Encounter"}
          </button>
        </div>
      </div>
    </div>
  );
}
