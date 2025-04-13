'use client';

import { useEffect, useRef, useMemo, Fragment, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useInView } from 'react-intersection-observer';
import { JournalSidebar, JournalEntry, EntryEditorDialog, StaticAnalysisColumn } from '@/components';
import { X, Loader2, Plus, Info, Mic, Send, FileText, Check, Ban } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJournalStore } from '@/stores/journalStore';
import clsx from 'clsx';
import type { Entry } from '@/types';
import debounce from 'lodash.debounce';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Helper function to format seconds into M:SS
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  // No longer pad minutes, use single digit if < 10
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Main page component for the Thoughtkeeper application.
 * 
 * --- Core Features ---
 * - Displays journal entries grouped by date with infinite scrolling.
 * - Allows adding text entries via a dialog.
 * - Provides search functionality for loaded entries.
 * - Styles date separator headers like cards and includes entry counts.
 * - Utilizes Zustand (via useJournalStore) for managing application state.
 * - Uses Tailwind CSS for styling with Shadcn UI components.
 * 
 * --- Voice Note Feature ---
 * - Implements voice note recording using Web Audio API (AudioContext, AnalyserNode).
 * - Renders a real-time scrolling waveform visualizer on Canvas (1px/frame shift).
 * - Displays a timer during recording (max 60 seconds).
 * - Handles starting, stopping (send/transcribe), and discarding recordings.
 * - Manages recording, processing (local state: isProcessingAudio), and error states.
 * - Currently SIMULATES sending audio to backend via transcribeAndCreateEntry.
 * 
 * --- Current Status & Known Issues (As of last interaction) ---
 * - Waveform visualizer speed/appearance seems satisfactory.
 * - Day headers are styled correctly.
 * - **Double "Processing..." Indicator:** A key issue is the appearance of two 
 *   "Processing..." indicators after stopping a recording to transcribe. One is likely
 *   from local `isProcessingAudio` state, the other from Zustand's `isProcessingEntry`.
 *   Previous attempts to fix this were reverted.
 * - **Backend Simulation:** Audio transcription/entry creation is simulated in 
 *   `transcribeAndCreateEntry` and doesn't hit a real API.
 * 
 * --- Likely Next Steps ---
 * 1. **Fix Double Processing Indicator:** Consolidate processing state management.
 * 2. **Implement Real API Call:** Replace simulation in `transcribeAndCreateEntry` 
 *    with `fetch` to `/api/transcribe`.
 * 3. **Refine Data Flow:** Ensure real API response correctly triggers store actions.
 * 4. **Error Handling:** Improve API error handling.
 */
export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  const {
    searchQuery,
    activeMetaTag,
    activeIntentTag,
    activeContentTags,
    loadedEntries,
    displayEntries,
    hasMoreEntries,
    isLoadingInitial,
    isLoadingMore,
    isProcessingEntry,
    errorState,
    isEditorOpen,
    editingEntry,
    highlightedTagColors,
    loadInitialEntries,
    loadMoreEntries,
    setFilters,
    deleteEntry,
    openEditorDialog,
    addEntry,
    addEntryWithTranscription,
  } = useJournalStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const mainContentScrollRef = useRef<HTMLDivElement>(null);
  const { ref: intersectionObserverRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  const debouncedSetSearchFilter = useMemo(() => 
    debounce((value: string) => {
      console.log("Debounced search triggered:", value);
      setFilters({ searchQuery: value });
    }, 300),
    [setFilters]
  );

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      debouncedSetSearchFilter.cancel();
    };
  }, [debouncedSetSearchFilter]);

  useEffect(() => {
    if (session) {
      console.log("Session detected, loading initial entries.");
      loadInitialEntries();
    }
  }, [session, loadInitialEntries]);

  useEffect(() => {
    if (inView && !isLoadingInitial && !isLoadingMore && hasMoreEntries && session) {
      loadMoreEntries();
    }
  }, [inView, isLoadingInitial, isLoadingMore, hasMoreEntries, loadMoreEntries, session]);

  // --- Effect for Recording Timer --- 
  useEffect(() => {
    if (isRecording) {
      console.log("Starting timer effect..."); // Debug log
      setRecordingTime(0); // Reset timer on start
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prevTime => {
          const newTime = prevTime + 1;
          // console.log("Timer tick:", newTime); // Debug log for ticks
          // Optional: Auto-stop logic (Add later if desired)
          // if (newTime >= 60) { ... }
          return newTime;
        });
      }, 1000);
    } else {
      console.log("Clearing timer effect..."); // Debug log
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Keep final time displayed until next recording starts
      // setRecordingTime(0); 
    }

    // Cleanup function
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]); // Ensure dependency is correct

  // --- Effect for Drawing Waveform --- 
  useEffect(() => {
    // Gradient-like color palette (blues/purples)
    const colors = [
      "#a5b4fc", // Light Indigo
      "#818cf8", // Indigo
      "#6366f1", // Darker Indigo
      "#8b5cf6", // Purple
      "#a78bfa", // Lighter Purple
      "#c084fc", // Even Lighter Purple (Violet)
      "#a78bfa", // Lighter Purple
      "#8b5cf6", // Purple
      "#6366f1", // Darker Indigo
      "#818cf8", // Indigo
    ];
    let colorIndex = 0;

    if (isRecording && analyserRef.current && canvasRef.current) {
      const analyser = analyserRef.current;
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext('2d');

      if (!canvasCtx) return;

      // Analyser setup
      analyser.fftSize = 512; // More data points for smoother average
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const barWidth = 1; // Revert to 1px width
      const barGap = 0;   // Keep gap 0
      const step = 1;     // Revert to shifting 1 pixel
      const shiftFrequency = 1; // Keep shifting every frame
      let frameCount = 0;

      const draw = () => {
        if (!isRecording || !analyserRef.current || !canvasRef.current) {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
          return;
        }

        animationFrameRef.current = requestAnimationFrame(draw);
        frameCount++;

        // --- Scrolling Logic (Conditional) --- 
        // 1. Get canvas dimensions
        const currentWidth = canvas.clientWidth;
        const currentHeight = canvas.clientHeight;
        if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
            canvas.width = currentWidth;
            canvas.height = currentHeight;
        }

        // 2. Shift existing waveform ONLY occasionally AND if width is sufficient
        if (frameCount % shiftFrequency === 0 && currentWidth > step) {
          const imageData = canvasCtx.getImageData(step, 0, currentWidth - step, currentHeight);
          canvasCtx.putImageData(imageData, 0, 0);
          // 3. Clear the newly exposed area on the right
          canvasCtx.clearRect(currentWidth - step, 0, step, currentHeight);
        }
        // --- End Scrolling Logic --- 

        // 4. Get current audio amplitude (Always)
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += Math.abs(dataArray[i] - 128);
        }
        const avgAmplitude = (sum / bufferLength) / 128.0;

        // 5. Calculate new bar height (Always) - INCREASED AGAIN
        let barHeight = avgAmplitude * currentHeight * 6.0; // Increased scaling (try 6.0)
        barHeight = Math.max(barHeight, 2);
        barHeight = Math.min(barHeight, currentHeight);

        // 6. Set fill style (Always)
        canvasCtx.fillStyle = colors[colorIndex % colors.length];
        colorIndex++;

        // 7. Draw the new bar segment on the far right edge (Always)
        // Need to clear the specific spot before drawing the new bar IF we didn't shift
        if (frameCount % shiftFrequency !== 0) {
             canvasCtx.clearRect(currentWidth - barWidth, 0, barWidth, currentHeight);
        }
        canvasCtx.fillRect(
          currentWidth - barWidth, 
          currentHeight / 2 - barHeight / 2, 
          barWidth, 
          barHeight
        );
      };

      // Clear canvas once at the start
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      draw();

    } else {
       // Cleanup if effect stops or isRecording becomes false
       if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
       }
       // Optionally clear canvas when not recording (important if last frame shouldn't persist)
       const canvas = canvasRef.current;
        if (canvas) {
          const canvasCtx = canvas.getContext('2d');
          if (canvasCtx) {
            // Ensure canvas size is updated before clearing if it changed
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
    }

    // Cleanup function for the effect
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRecording]); // Rerun effect when isRecording changes

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteEntry(id);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setLocalSearchQuery(newValue);
    debouncedSetSearchFilter(newValue);
  };

  const handleAddClick = () => {
    openEditorDialog();
  };

  const handleEditClick = (entry: Entry) => {
    openEditorDialog(entry);
  };

  const transcribeAndCreateEntry = async (audioBlob: Blob) => {
    console.log("Transcribing and creating entry for blob:", audioBlob);
    setAudioError(null);
    setIsProcessingAudio(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');

    try {
      console.log("Sending audio to /api/transcribe...");
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
        throw new Error(errorData.error || `HTTP error! ${response.status}`);
      }

      const data = await response.json();
      const transcript = data.transcript;
      console.log("Transcription received:", transcript);

      if (transcript) {
        // --- REVERTED LOGIC: Call store action to add directly --- 
        const { addEntryWithTranscription } = useJournalStore.getState(); // Get action from store
        console.log("Calling store action addEntryWithTranscription...");
        await addEntryWithTranscription(transcript); // Call action to add entry
        console.log("Store action addEntryWithTranscription completed.");
        // --- END REVERTED LOGIC --- 
      } else {
        console.warn("Transcription was empty, not creating entry."); // Updated message
        setAudioError("Transcription failed or returned empty.");
      }

    } catch (error: any) {
      console.error("Error during transcription or entry creation:", error); // Reverted error context
      setAudioError(error.message || "Failed to process audio entry.");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const startRecording = async () => {
    setAudioError(null);
    setIsProcessingAudio(false);
    setRecordingTime(0);

    // Correctly check for feature support
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
        setAudioError("Audio recording/visualization not supported.");
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // --- Setup Audio Context and Analyser --- 
        audioContextRef.current = new window.AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        // Adjust FFT size for detail vs performance (power of 2)
        analyser.fftSize = 512; 
        source.connect(analyser);
        // Do NOT connect source to destination
        analyserRef.current = analyser; // Store analyser in ref
        // --- End Audio Setup --- 

        // Pass the original stream to MediaRecorder
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };
        
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          console.log("Audio Blob created (onstop):", audioBlob);
          stream.getTracks().forEach(track => track.stop());
          audioContextRef.current?.close().catch(console.error); // Close context
          transcribeAndCreateEntry(audioBlob);
        };

        mediaRecorderRef.current.onerror = (event) => { 
          console.error("MediaRecorder error:", event);
          setAudioError("Error during recording.");
          setIsRecording(false);
          setIsProcessingAudio(false);
          stream.getTracks().forEach(track => track.stop()); 
          audioContextRef.current?.close().catch(console.error); // Close context
        };

        mediaRecorderRef.current.start(500); 
        setIsRecording(true);

    } catch (err) {
        console.error("Error accessing microphone:", err);
        audioContextRef.current?.close().catch(console.error); // Close context
        setIsRecording(false);
        setIsProcessingAudio(false);
    }
  };

  const stopRecordingAndDiscard = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current.onstop = null; 
      try { mediaRecorderRef.current.stop(); } catch (e) { console.warn("Error stopping MediaRecorder (discard):", e); }
      mediaRecorderRef.current = null;
      console.log("Recording stopped and discarded.");
    }
    audioContextRef.current?.close().catch(console.error); // Close AudioContext
    audioChunksRef.current = []; 
    setIsRecording(false);
    setIsProcessingAudio(false);
    setAudioError(null); 
  };

  const handleSendClick = () => {
     if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
       setIsRecording(false); 
       setIsProcessingAudio(true);
       try { mediaRecorderRef.current.stop(); } catch (e) { /* ... */ } 
       // Context closed in onstop
       console.log("Send clicked, stopping recording...");
     } else {
       console.warn("Send clicked but not recording.");
       audioContextRef.current?.close().catch(console.error); // Close context
       setIsRecording(false);
       setIsProcessingAudio(false); 
     }
  };

  const groupedEntries = useMemo(() => {
    return displayEntries.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      acc[date].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return acc;
    }, {} as Record<string, Entry[]>);
  }, [displayEntries]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEntries).sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime());
  }, [groupedEntries]);

  const isAnyFilterActive = useMemo(() => !!searchQuery || !!activeMetaTag || !!activeIntentTag || activeContentTags.size > 0, [
      searchQuery, activeMetaTag, activeIntentTag, activeContentTags
  ]);

  // --- Supabase Auth Listener --- 
  useEffect(() => {
    console.log("Setting up onAuthStateChange listener");
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      setSession(session); 
      setAuthChecked(true); // Mark auth as checked once listener fires
      if (event === 'SIGNED_OUT') {
        // Optionally clear store state on sign out
        // useJournalStore.getState().reset(); 
        router.push('/signin'); // Redirect to signin on sign out
      } else if (event === 'SIGNED_IN') {
        // Potentially trigger initial data load here if needed
        // loadInitialEntries(); // Moved the initial load logic below
      }
    });

    // Initial check in case the listener doesn't fire immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setAuthChecked(true); // Mark auth checked even if no session
      }
      // No need to setSession here, listener will handle it
    });

    return () => {
      console.log("Cleaning up onAuthStateChange listener");
      authListener?.subscription.unsubscribe();
    };
  }, [router]); // Add router to dependencies

  // --- Redirect if not logged in (after auth state is checked) ---
  useEffect(() => {
    if (authChecked && !session) {
      console.log("Auth checked, no session found. Redirecting to /signin");
      router.push('/signin');
    }
  }, [session, authChecked, router]);

  // --- Loading State --- 
  // Show loading indicator until auth state is confirmed and session is checked
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Main Application UI (Rendered only if session exists after auth check) ---
  // The redirect effect handles the case where session is null
  if (!session) {
    // This part should ideally not be reached due to the redirect effect,
    // but can serve as a fallback or be shown briefly during redirect.
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        {/* Or Optionally: <p>Redirecting to sign in...</p> */}
      </div>
    );
  }

  // --- Actual Logged-in UI --- 
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* ... header content ... */}
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div ref={mainContentScrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {/* ... search bar ... */} 

          {/* ... entry rendering logic ... */} 

          {/* End of list message */}
          {(!isLoadingInitial && !isLoadingMore && !hasMoreEntries) && (
            <div className="text-center text-muted-foreground text-sm py-8">
              {isAnyFilterActive 
                ? "End of loaded entries matching filters." 
                : "The void stares back... quick, add a thought!"
              }
            </div>
          )}

          <div ref={intersectionObserverRef} style={{ height: '1px' }} />
        </div>

        <StaticAnalysisColumn /> 
      </main>

      {/* Editor Dialog */}
      {isEditorOpen && (
        <EntryEditorDialog
          isOpen={isEditorOpen}
          selectedDate={format(new Date(), 'yyyy-MM-dd')}
          initialEntry={editingEntry}
        />
      )}

      {/* Logout Button */}
      {session && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => { /* ... sign out logic ... */ }}
            className="fixed bottom-4 right-4 z-50 bg-background hover:bg-muted"
            aria-label="Logout"
            title="Logout"
          >
            Logout
          </Button>
      )}
    </div>
  );
} 