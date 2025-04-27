'use client';

import { useEffect, useRef, useMemo, Fragment, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useInView } from 'react-intersection-observer';
import { JournalSidebar, JournalEntry, EntryEditorDialog, StaticAnalysisColumn, AllActionsList } from '@/components';
import { X, Loader2, Plus, Info, Mic, Send, FileText, Check, Ban, Activity, ListTodo } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJournalStore } from '@/stores/journalStore';
import clsx from 'clsx';
import type { Entry, ActionItem } from '@/types';
import debounce from 'lodash.debounce';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Re-define types needed for action grouping (or import if moved to types/index.ts)
const UNTAGGED_KEY = "_untagged_";
interface UniqueActionOrigin {
  entryId: string;
  actionIndex: number;
  entryDate: string;
  metaTag: string | null;
}
interface UniqueAction {
  text: string;
  origins: UniqueActionOrigin[];
}
interface GroupedActions {
  [metaTagOrUntagged: string]: UniqueAction[];
}

// Helper function to format seconds into M:SS
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  // No longer pad minutes, use single digit if < 10
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

// Define the loading phrases array (can be placed outside the component)
const loadingPhrases = [
  "Tuning into your voice note… 🔊",
  "Listening closely to your voice like it's a podcast. 🎧",
  "Rewinding your brain dump… ⏪",
  "Pulling wisdom from your mumble matrix… 🧠",
  "Catching every whisper, sigh, and dramatic pause. 👂",
  "Removing 17 filler words — you sound great, don't worry. ✨",
  "Translating you into… also you, but in text. 💬",
  "Summoning transcription elves. They're unionized. 🧝",
  "Typing your voice out fast. Like, super fast. ✍️",
  "Making you look way more articulate. 🪄",
  "Shaping chaos into clarity… one sentence at a time. 🔍",
  "Formatting your brilliance into happy little words. 📄",
  "Capturing your stream of consciousness… in style. 🛁",
  "Almost done! Just wrapping up your inner monologue. 🎁",
  "Holding space for your thoughts — and your tangents. 🧘",
  "Compiling your brain into readable form. 📚",
  "Almost done! Your voice is becoming words. ✨",
  "Filtering background noise (and emotional baggage). 🎧",
  "Typing what your soul was trying to say… ✍️",
  "Translating voice to text, thought to form… ✍️",
  "Turning sound waves into structure… 🌊➡️📄",
  "Composing clarity from spoken flow… 🧠🪄",
  "Rendering your recording with precision… 🛠️🗣️",
  "Capturing nuance. Preserving intent. ✨",
  "Mapping sound to meaning… 🗺️📣",
  "Formatting your audio into readable space… 🧬📘",
  "Applying structure without losing style… 🧵🧠",
  "Carrying your words from voice to page… 📦📜",
  "Letting the audio settle… then translating. ⏳📋",
  "Indexing ideas by tone, not volume… 📡",
  "Creating quiet from signal… then turning it into insight. 🔇➡️💬",
  "Reading your rhythm, one word at a time… 🥁📖",
  "Processing voice as intention, not noise. 🤖🧘",
  "Giving your words the form they deserve… 🎁📝",
  "Honoring speech. Delivering substance. 🙏🧾",
  "Awaiting coherence… almost there. 🧠⌛",
  "Your recording is in good hands. Finishing touches in progress. 👐",
  "Your thoughts are being carefully transcribed… 💡",
  "Steady hands. Clear ears. Focused transformation. 🎧🧠",
  "This takes a moment — precision is the goal. 🎯",
  "Aligning format with flow… 🧭🧾",
  "Crafting signal into shape… 🛠️📊",
  "Almost ready to reflect on what you said… ⏳🔍",
  "Turning your brain dump into something slightly less unhinged 🧠🗑️",
  "Removing 87 \"like\"s and one audible sigh of despair 🙃💨",
  "Transcribing whatever the hell that was 🫠📜",
  "Auto-correcting your emotional breakdown 😅🔧",
  "Translating: [incoherent yelling] into sentences 🫃📣",
  "Rewriting your rant so you sound emotionally stable ✍️😇",
  "Converting your word vomit into spicy little sentences 🌶️🤮",
  "We're not judging, but… what even was that? 🫢💬",
  "Your voice note is now considered legally \"a cry for help\" 📞👮",
  "Running your thoughts through the \"don't sound insane\" filter 🧠🚿",
  "You took a break mid-recording to breathe heavily. Noted. 😮‍💨🫀",
  "Extracting your one good idea from the chaos ⛏️🪨",
  "You trauma dumped into a mic. We respect that 💔🎤",
  "We heard the fart. It's in the logs. 💨📁",
  "Cleaning up your \"stream of consciousness\" (more like stream of WTF) 🧽😵‍💫",
  "Whispering \"wtf is this?\" into the transcription engine 🤖🫥",
  "Finalizing your TED Talk on nothing and everything 🪩🎤"
];

/**
 * Main page component for the VibeKeep application.
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
    updateEntryTags,
  } = useJournalStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  const [currentLoadingPhraseIndex, setCurrentLoadingPhraseIndex] = useState<number>(-1);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const loadingPhraseIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const [activeMainTab, setActiveMainTab] = useState<'stream' | 'actions'>('stream');

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

  // --- *** ADDED: Supabase Realtime Listener for Entries *** ---
  useEffect(() => {
    // Ensure session exists before subscribing
    if (!session) return;

    console.log('Setting up Supabase Realtime subscription for entries...');
    const channel = supabase
      .channel('journal-entries-channel') // Unique channel name
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Listen only for UPDATES
          schema: 'public',
          table: 'entries',
          // Optionally filter by user_id if needed, though RLS should handle security
          // filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Realtime UPDATE received:', payload);
          // Extract the updated entry data
          const updatedEntry = payload.new as Entry;
          if (updatedEntry && updatedEntry.id) {
            console.log(`Realtime: Calling updateEntryTags for id: ${updatedEntry.id}`);
            // Update the store with the changed entry
            useJournalStore.getState().updateEntryTags(updatedEntry.id, updatedEntry);
          } else {
            console.warn('Realtime: Received UPDATE payload without new data or id', payload);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to entries updates!');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Realtime subscription error: ${status}`, err);
          // Optionally add logic to attempt resubscription
        }
      });

    // Cleanup function to remove the channel subscription when the component unmounts
    return () => {
      console.log('Cleaning up Supabase Realtime subscription...');
      if (channel) {
        supabase.removeChannel(channel).catch(console.error);
      }
    };
  }, [session]); // Re-run the effect if the session changes
  // --- END Realtime Listener ---

  // --- Effect for Cycling Loading Phrases ---
  useEffect(() => {
    if (isProcessingAudio) {
      // Start the interval
      const initialIndex = Math.floor(Math.random() * loadingPhrases.length);
      setCurrentLoadingPhraseIndex(initialIndex); // Set initial phrase

      loadingPhraseIntervalRef.current = setInterval(() => {
        setCurrentLoadingPhraseIndex(prevIndex => {
          let nextIndex;
          do {
            nextIndex = Math.floor(Math.random() * loadingPhrases.length);
          } while (loadingPhrases.length > 1 && nextIndex === prevIndex); // Ensure different index if possible
          return nextIndex;
        });
      }, 1750); // Cycle every 1.75 seconds (changed from 1500)

    } else {
      // Clear interval and reset index when not processing
      if (loadingPhraseIntervalRef.current) {
        clearInterval(loadingPhraseIntervalRef.current);
        loadingPhraseIntervalRef.current = null;
      }
      setCurrentLoadingPhraseIndex(-1); // Reset index
    }

    // Cleanup function
    return () => {
      if (loadingPhraseIntervalRef.current) {
        clearInterval(loadingPhraseIntervalRef.current);
        loadingPhraseIntervalRef.current = null;
      }
    };
  }, [isProcessingAudio]); // Dependency: run when processing state changes

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
      console.log("Full API response data from /api/transcribe:", data);

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

  // --- START: Action Grouping and Tab Logic (Moved from AllActionsList) --- 
  const groupedAndSortedActions = useMemo(() => {
    const actionMap = new Map<string, UniqueActionOrigin[]>();
    loadedEntries.forEach((entry) => {
      if (entry.extracted_actions) {
        entry.extracted_actions.forEach((action, index) => {
          if (!action.completed && action.task) {
            const normalizedText = action.task.trim().toLowerCase();
            const origin: UniqueActionOrigin = {
              entryId: entry.id,
              actionIndex: index,
              entryDate: entry.date,
              metaTag: entry.meta_tag || null,
            };
            const existingOrigins = actionMap.get(normalizedText);
            if (existingOrigins) {
              existingOrigins.push(origin);
            } else {
              actionMap.set(normalizedText, [origin]);
            }
          }
        });
      }
    });

    const grouped: GroupedActions = {};
    actionMap.forEach((origins, normalizedText) => {
      const displayText = loadedEntries
        .find(e => e.id === origins[0].entryId)
        ?.extracted_actions?.[origins[0].actionIndex]?.task ?? normalizedText;
      const uniqueAction: UniqueAction = { text: displayText, origins: origins };
      const groupKey = origins[0].metaTag || UNTAGGED_KEY;
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(uniqueAction);
    });

    Object.keys(grouped).forEach(groupKey => {
      grouped[groupKey].sort((a, b) => {
        const mostRecentA = a.origins.reduce((latest, o) => (o.entryDate > latest ? o.entryDate : latest), '1970-01-01');
        const mostRecentB = b.origins.reduce((latest, o) => (o.entryDate > latest ? o.entryDate : latest), '1970-01-01');
        return parseISO(mostRecentB).getTime() - parseISO(mostRecentA).getTime();
      });
    });
    return grouped;
  }, [loadedEntries]);

  // Calculate sorted tab keys based on action count
  const sortedActionTabKeys = useMemo(() => {
    return Object.entries(groupedAndSortedActions)
      // Sort by number of actions descending
      .sort(([, actionsA], [, actionsB]) => actionsB.length - actionsA.length)
      // Return just the keys (meta tags / untagged)
      .map(([key]) => key);
  }, [groupedAndSortedActions]);

  // State for the active *sub* tab within actions
  const [activeActionSubTab, setActiveActionSubTab] = useState<string>(UNTAGGED_KEY); 
  const [initialActionTabSet, setInitialActionTabSet] = useState<boolean>(false); // Flag for initial setting
  
  // Effect to set initial sub-tab to the one with most actions when available
  useEffect(() => {
      // Only set the initial tab ONCE when keys become available
      if (!initialActionTabSet && sortedActionTabKeys.length > 0) {
          console.log("Setting initial action sub-tab:", sortedActionTabKeys[0]);
          setActiveActionSubTab(sortedActionTabKeys[0]);
          setInitialActionTabSet(true); // Mark as set
      }
      // Do NOT reset the tab if the keys change later due to completing actions
      
      // If keys become empty later (e.g., all actions completed), 
      // we might want to reset to UNTAGGED_KEY, but let's handle that if needed.
      // For now, just keep the current tab even if its list becomes empty.

  }, [sortedActionTabKeys, initialActionTabSet]); // Add flag to dependency array
  // --- END: Action Grouping and Tab Logic --- 

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
    // Outermost container: Row layout
    <div className="flex flex-row min-h-screen bg-background">
      
      {/* --- START Left Column (Header + Tabbed Content) --- */}
      <div className="flex flex-col flex-1 overflow-hidden border-r">
        {/* Header moved INSIDE the left column */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Remove 'container' and 'mx-auto', restore slightly larger padding */}
          <div className="flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
            {/* Left Side: Logo & Status */}
            <div className="flex items-center flex-shrink-0">
              <img
                src="https://s3.ca-central-1.amazonaws.com/logojoy/logos/218272791/noBgBlack.png?865367"
                alt="Thought Keeper Logo"
                className="h-8 w-auto"
              />
              <div className="flex items-center gap-2">
                {/* Only show initial loading here */}
                {isLoadingInitial && (
                  <div className="flex items-center justify-start text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Spacer to push elements apart (or recording UI) */}
            {isRecording && !isProcessingAudio ? (
              // If recording, show canvas (already has flex-grow)
              <div className="flex-grow mx-2 sm:mx-4">
                <canvas
                  ref={canvasRef}
                  height="30"
                  className="w-full h-[30px] bg-muted/50 rounded-sm"
                ></canvas>
              </div>
            ) : (
              // Otherwise, add a spacer div that grows
              <div className="flex-grow"></div>
            )}

            {/* Right Side: Controls */}
            <div className="flex items-center flex-wrap gap-2 flex-shrink-0 justify-end">
              {/* Container for Search and Add buttons - Using items-center for vertical alignment */}
              <div className="flex items-center gap-2"> {/* Changed items-baseline to items-center */} 
                {/* Search Bar (hidden during recording) */}
                {!isRecording && !isProcessingAudio && (
                  <Input
                    type="search"
                    placeholder="Search entries..." 
                    value={localSearchQuery} 
                    onChange={handleSearchChange} 
                    className={clsx(
                        'w-full max-w-xs h-9', // Explicit height added (h-9 matches Button sm size)
                        'hidden sm:block' 
                    )}
                  />
                )}
                {/* Add Buttons (hidden during recording) */}
                {!isRecording && !isProcessingAudio && (
                  <>
                    <Button
                      onClick={startRecording}
                      size="sm" // h-9 by default
                      aria-label="Add voice note"
                      title="Add voice note"
                      className={clsx(
                        'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 transition-opacity',
                        'inline-flex items-center'
                      )}
                    >
                      <Mic className="h-4 w-4" />
                      <span className="hidden sm:inline sm:ml-2">Add Voice Note</span>
                    </Button>
                    <Button
                      onClick={handleAddClick}
                      disabled={false}
                      size="sm" // h-9 by default
                      className={clsx(
                        'bg-gradient-to-r from-teal-400 to-cyan-600 text-white hover:opacity-90 transition-opacity',
                        'inline-flex items-center'
                      )}
                      aria-label="Add text note"
                      title="Add text note"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline sm:ml-2">Add Text Note</span>
                    </Button>
                  </>
                )}
              </div>

              {/* Recording Controls (shown during recording) */}
              {isRecording && !isProcessingAudio && (
                 <>
                    {/* Timer */}
                    <span 
                      className={clsx(
                        "text-sm font-mono flex-shrink-0 whitespace-nowrap",
                        recordingTime >= 60 ? "text-red-600" : "text-muted-foreground" 
                      )}
                    >
                      {formatTime(recordingTime)} / 1:00
                    </span>
                    {/* Transcribe Button */}
                    <Button
                      variant="default" 
                      onClick={handleSendClick}
                      size="sm"
                      className={clsx('inline-flex')} 
                      aria-label="Transcribe recording"
                      title="Transcribe recording"
                    >
                      <Check className="h-4 w-4 sm:mr-2" /> 
                      <span className="hidden sm:inline">Transcribe</span>
                    </Button>
                    {/* Stop Button */}
                    <Button
                      variant="outline" 
                      onClick={stopRecordingAndDiscard}
                      size="sm"
                      className={clsx('inline-flex')} 
                      aria-label="Stop recording"
                      title="Stop recording"
                    >
                      <X className="h-4 w-4 sm:mr-2" /> 
                      <span className="hidden sm:inline">Stop Recording</span>
                    </Button>
                 </>
              )}

              {/* *** UPDATED: Processing Audio Indicator (Right Side) *** */}
              {isProcessingAudio && !errorState && (
                <div className="flex items-center justify-end text-sm text-muted-foreground">
                  {/* Display the current loading phrase FIRST */}
                  <span>
                    {currentLoadingPhraseIndex !== -1 
                      ? loadingPhrases[currentLoadingPhraseIndex]
                      : 'Processing audio...'} {/* Fallback text */}
                  </span>
                  {/* Spinner SECOND, add margin-left */}
                  <Loader2 className="h-5 w-5 animate-spin ml-2" /> 
                </div>
              )}
            </div>
          </div>
        </header>

        {/* --- TABS START HERE --- */}
        <Tabs defaultValue="stream" value={activeMainTab} onValueChange={(value) => setActiveMainTab(value as 'stream' | 'actions')} className="flex flex-col flex-1 overflow-hidden">
          {/* Main Tab List - Apply new styles */} 
          <div className="px-4 md:px-6 lg:px-8 py-2 border-b">
            {/* Left-align, give list a background, rounded corners */} 
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              {/* Default state: transparent bg, muted text. Active state: primary bg+text */} 
              <TabsTrigger 
                value="stream" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                <Activity className="w-4 h-4 mr-2" />
                The Stream
              </TabsTrigger>
              <TabsTrigger 
                value="actions" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                <ListTodo className="w-4 h-4 mr-2" />
                The List
              </TabsTrigger>
            </TabsList>
          </div>

          {/* --- STREAM TAB CONTENT --- */}
          <TabsContent value="stream" className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-4 mt-0 data-[state=inactive]:hidden"> {/* Added mt-0 and inactive hidden */} 
            {/* Scrollable Content Area for Entries */}
            <div ref={mainContentScrollRef} > {/* Removed classNames, now handled by TabsContent */}
              {/* --- START Main Content Rendering (Moved inside Tab) --- */}
              {/* Filter Active Indicator */}
              {isAnyFilterActive && (
                <div className="flex flex-col gap-1 flex-shrink-0 p-2 rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-800/60 dark:bg-yellow-900/20">
                   <div className="flex items-center gap-1 text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                        <Info className="h-3 w-3" />
                        <span>Filtering applied only to {loadedEntries.length} loaded entries.</span>
                    </div>
                    <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-sm font-medium mr-1">Active:</span>
                        {/* Meta Tag Filter */} 
                        {activeMetaTag && (() => {
                            const lowerTag = activeMetaTag.toLowerCase();
                            const colorInfo = highlightedTagColors[lowerTag];
                            const activeClasses = colorInfo ? colorInfo.base : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
                            const hoverClasses = colorInfo ? colorInfo.hover : 'hover:bg-purple-200 dark:hover:bg-purple-800/70';
                            return (
                            <Badge variant="secondary" className={clsx("cursor-pointer", activeClasses, hoverClasses)} onClick={() => setFilters({ activeMetaTag: null })}>
                                {activeMetaTag.toUpperCase()}
                                <X className="ml-1 h-3 w-3" />
                            </Badge>
                            );
                        })()}
                        {/* Intent Tag Filter */}
                        {activeIntentTag && (() => {
                            const lowerTag = activeIntentTag.toLowerCase();
                            const colorInfo = highlightedTagColors[lowerTag];
                            const activeClasses = colorInfo ? colorInfo.base : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
                            const hoverClasses = colorInfo ? colorInfo.hover : 'hover:bg-green-200 dark:hover:bg-green-800/70';
                            return (
                            <Badge variant="secondary" className={clsx("cursor-pointer", activeClasses, hoverClasses)} onClick={() => setFilters({ activeIntentTag: null })}>
                                {activeIntentTag}
                                <X className="ml-1 h-3 w-3" />
                            </Badge>
                            );
                        })()}
                        {/* Content Tags Filter */}
                        {Array.from(activeContentTags).map(tag => {
                            const lowerTag = tag.toLowerCase();
                            const colorInfo = highlightedTagColors[lowerTag];
                            const activeClasses = colorInfo ? colorInfo.base : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
                            const hoverClasses = colorInfo ? colorInfo.hover : 'hover:bg-blue-200 dark:hover:bg-blue-800/70';
                            return (
                            <Badge key={tag} variant="secondary" className={clsx("cursor-pointer", activeClasses, hoverClasses)} onClick={() => {
                                const newTags = new Set(activeContentTags);
                                newTags.delete(tag);
                                setFilters({ activeContentTags: newTags });
                            }}>
                                {tag}
                                <X className="ml-1 h-3 w-3" />
                            </Badge>
                            );
                        })}
                        {/* Clear All Filters Button */}
                         {(!!activeMetaTag || !!activeIntentTag || activeContentTags.size > 0) && (
                            <Button variant="ghost" size="sm" className="h-5 px-1 text-muted-foreground hover:text-foreground" onClick={() => setFilters({ activeMetaTag: null, activeIntentTag: null, activeContentTags: new Set(), searchQuery: '' })}>
                                Clear All
                            </Button>
                        )}
                    </div>
                </div>
              )}

              {/* Initial Loading Indicator */}
              {isLoadingInitial && (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Entry Rendering Logic */}
              {!isLoadingInitial && (
                <>
                  {/* No Entries Matching Filter Message */}
                  {displayEntries.length === 0 && loadedEntries.length > 0 && isAnyFilterActive && (
                    <p className="pt-4 text-center text-gray-500">No loaded entries found matching filters.</p>
                  )}
                  
                  {/* Grouped Entries Loop */}
                  {Object.entries(groupedEntries).map(([date, dayEntries]) => {
                    const entryCount = dayEntries.length;
                    const containsHighlighted = highlightedEntryId !== null && dayEntries.some(entry => entry.id === highlightedEntryId);
                    
                    return (
                      <div key={date} className="mb-4"> 
                        {/* Date Header */}
                        <div className={clsx(
                            "sticky top-0 z-10 mb-2 p-2 border rounded-md bg-muted",
                            "text-sm font-medium text-muted-foreground",
                            containsHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        )}> 
                          {format(parseISO(date), 'MMMM do, yyyy')} 
                          <span className="ml-2 font-normal">({entryCount} {entryCount === 1 ? 'entry' : 'entries'})</span>
                        </div>
                        
                        {/* Entries for the Day */}
                        <div className="space-y-2"> 
                          {/* Add safety check: Ensure dayEntries is an array before mapping */}
                          {Array.isArray(dayEntries) && dayEntries.map((entry) => (
                            <JournalEntry
                                key={entry.id}
                                entry={entry}
                                highlightedTagColors={highlightedTagColors}
                                setFilters={setFilters}
                                onDeleteEntry={handleDeleteEntry}
                                onEditClick={handleEditClick}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Loading More Indicator */}
                  {isLoadingMore && (
                    <div className="flex justify-center items-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </>
              )}
              {/* --- END Main Content Rendering --- */}
              
              {/* End of list message */}
              {(!isLoadingInitial && !isLoadingMore && !hasMoreEntries) && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {isAnyFilterActive 
                    ? "End of loaded entries matching filters." 
                    : "The void stares back... quick, add a thought!"
                  }
                </div>
              )}

              {/* Intersection observer target */}
              <div ref={intersectionObserverRef} style={{ height: '1px' }} />
            </div>
          </TabsContent>
          {/* --- END STREAM TAB CONTENT --- */}

          {/* --- ACTIONS TAB CONTENT (Now with Sub-Tabs) --- */}
          <TabsContent value="actions" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden"> {/* Ensure flex-col */} 
            {/* Nested Tabs for Action Grouping */} 
            <Tabs 
              value={activeActionSubTab}
              onValueChange={setActiveActionSubTab}
              defaultValue={sortedActionTabKeys.length > 0 ? sortedActionTabKeys[0] : UNTAGGED_KEY}
              className="flex flex-col flex-1 overflow-hidden pt-2" // Removed horizontal padding, handled below
            >
              {/* Sub-Tab List Container (Added for border and padding) */} 
              <div className="px-4 md:px-6 lg:px-8 border-b"> {/* Moved padding here, added border */} 
                <TabsList className="bg-transparent p-0 h-auto justify-start overflow-x-auto w-full">
                  {sortedActionTabKeys.map(tagKey => (
                    <TabsTrigger 
                      key={tagKey} 
                      value={tagKey} 
                      className="flex-shrink-0 whitespace-nowrap rounded-none px-3 py-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground"
                    >
                      {tagKey === UNTAGGED_KEY ? 'Untagged' : tagKey}
                      <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5">
                         {groupedAndSortedActions[tagKey]?.length || 0}
                      </Badge>
                    </TabsTrigger>
                  ))}
                  {/* Show message if no actions at all */}
                  {sortedActionTabKeys.length === 0 && (
                      <span className="text-sm text-muted-foreground p-2">No pending actions found.</span>
                  )}
                </TabsList>
              </div>

              {/* Sub-Tab Content Wrapper */} 
              <TabsContent 
                value={activeActionSubTab}
                className="flex-1 overflow-y-auto py-4 px-4 md:px-6 lg:px-8 mt-0" // Added padding here
              >
                 <AllActionsList 
                    actionsToDisplay={groupedAndSortedActions[activeActionSubTab] || []} 
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
          {/* --- END ACTIONS TAB CONTENT --- */}

        </Tabs>
        {/* --- TABS END HERE --- */}

      </div>
      {/* --- END Left Column --- */}

      {/* --- START Right Column (Static Analysis) --- */}
      <StaticAnalysisColumn /> 
      {/* --- END Right Column --- */} 

      {/* Editor Dialog (Portal?) - Position might need review */} 
      {isEditorOpen && (
        <EntryEditorDialog
          isOpen={isEditorOpen}
          selectedDate={format(new Date(), 'yyyy-MM-dd')}
          initialEntry={editingEntry}
        />
      )}

      {/* Logout Button (Fixed Position - Restored) */}
      {session && (
          <Button 
            variant="outline" 
            size="sm" 
            // Restore the full onClick handler with diagnostics
            onClick={async () => {
              console.log("(Restored) Logout button clicked. Refreshing session...");
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.warn("Error refreshing session before sign out:", refreshError);
              }

              console.log("Checking session...");
              const { data: currentSessionData, error: sessionError } = await supabase.auth.getSession();
              
              if (sessionError) {
                console.error("Error getting session after refresh:", sessionError);
                return; 
              }
              
              if (!currentSessionData.session) {
                console.warn("No active session found by Supabase after refresh.");
                return;
              }

              console.log("Active session confirmed. Attempting sign out...");
              const { error: signOutError } = await supabase.auth.signOut();
              
              if (signOutError) {
                console.error("Error signing out:", signOutError);
              } else {
                console.log("Sign out successful. Auth listener should handle redirect.");
              }
            }} 
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