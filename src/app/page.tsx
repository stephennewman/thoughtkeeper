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
import { clsx } from 'clsx';
import type { Entry } from '@/types';

// Helper function to format seconds into M:SS
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  // No longer pad minutes, use single digit if < 10
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function Home() {
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
  } = useJournalStore();

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

  useEffect(() => {
    loadInitialEntries();
  }, [loadInitialEntries]);

  useEffect(() => {
    if (inView && !isLoadingInitial && !isLoadingMore && hasMoreEntries) {
      loadMoreEntries();
    }
  }, [inView, isLoadingInitial, isLoadingMore, hasMoreEntries, loadMoreEntries]);

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

        // 2. Shift existing waveform ONLY occasionally
        if (frameCount % shiftFrequency === 0) {
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
    setFilters({ searchQuery: event.target.value });
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

    let transcription = '';

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
      transcription = data.transcription;
      console.log("Transcription received:", transcription);

      if (transcription) {
        const { addEntryWithTranscription } = useJournalStore.getState();
        console.log("Calling store action addEntryWithTranscription...");
        await addEntryWithTranscription(transcription);
        console.log("Store action addEntryWithTranscription completed.");
      } else {
        console.warn("Transcription was empty, not creating entry.");
      }

    } catch (error: any) {
      console.error("Error during transcription or entry creation:", error);
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

  const isAnyFilterActive = !!searchQuery || !!activeMetaTag || !!activeIntentTag || activeContentTags.size > 0;

  return (
    <div className="flex flex-col h-screen">
      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-hidden p-4 gap-2">
          <div className="flex justify-between items-center flex-shrink-0 gap-4 border-b pb-2 h-12">
            <div className="flex items-center flex-shrink-0">
              <img 
                src="https://s3.ca-central-1.amazonaws.com/logojoy/logos/217739981/noBgColor.png?388025.2999999523"
                alt="ThoughtKeeper Logo" 
                className="h-8 w-auto mr-4"
              />
              <div className="flex items-center gap-2">
                {errorState && (
                  <p className="text-red-600 text-sm">Error: {errorState}</p>
                )}
                {(isLoadingInitial || isProcessingEntry || isProcessingAudio) && !errorState && (
                  <div className="flex items-center justify-start">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    {(isProcessingEntry || isProcessingAudio) && 
                      <span className="text-sm text-muted-foreground ml-2">
                        {isProcessingAudio ? 'Processing audio...' : 'Processing entry...'}
                      </span>}
                  </div>
                )}
              </div>
            </div>

            {isRecording && !isProcessingAudio && (
              <div className="flex-grow mx-4">
                <canvas 
                  ref={canvasRef}
                  height="30" 
                  className="w-full h-[30px] bg-muted/50 rounded-sm"
                ></canvas>
              </div>
            )}

            <div className="flex items-center gap-2 flex-shrink-0">
              {!isRecording && !isProcessingAudio && (
                <Input
                  type="search"
                  placeholder="Search loaded entries..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className={clsx(
                      'w-full max-w-xs',
                      'hidden sm:block'
                  )}
                />
              )}
              
              <div className="flex items-center justify-end gap-2">
                {!isRecording && !isProcessingAudio && (
                  <>
                    <Button
                      variant="outline"
                      onClick={startRecording}
                      size="sm"
                      aria-label="Add voice note"
                      title="Add voice note"
                      className={clsx('inline-flex')}
                    >
                      <Mic className="mr-2 h-4 w-4" /> Add Voice Note
                    </Button>
                    <Button
                      onClick={handleAddClick}
                      disabled={false} 
                      size="sm"
                      className={clsx(
                        'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity flex-shrink-0',
                        'inline-flex'
                      )}
                      aria-label="Add text note"
                      title="Add text note"
                    >
                      <FileText className="mr-2 h-4 w-4" /> Add Text Note
                    </Button>
                  </>
                )}

                {isRecording && !isProcessingAudio && (
                  <>
                    <span 
                      className={clsx(
                        "text-sm font-mono flex-shrink-0 whitespace-nowrap",
                        recordingTime >= 60 ? "text-red-600" : "text-muted-foreground" 
                      )}
                    >
                      {formatTime(recordingTime)} / 1:00
                    </span>
                    <Button
                      variant="default"
                      onClick={handleSendClick}
                      size="sm"
                      className={clsx('inline-flex')}
                      aria-label="Transcribe recording"
                      title="Transcribe recording"
                    >
                      <Check className="mr-2 h-4 w-4" /> Transcribe
                    </Button>
                    <Button
                      variant="outline"
                      onClick={stopRecordingAndDiscard}
                      size="sm"
                      className={clsx('inline-flex')}
                      aria-label="Stop recording"
                      title="Stop recording"
                    >
                      <X className="mr-2 h-4 w-4" /> Stop Recording
                    </Button>
                  </>
                )}

                {isProcessingAudio && (
                   <div className="flex items-center justify-center text-sm text-muted-foreground px-3">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Processing...</span>
                   </div>
                )}
              </div>
            </div>
          </div>

          {audioError && (
              <div className="flex justify-end">
                <p className="text-red-600 text-sm mt-1">{audioError}</p>
              </div>
          )}

          {isAnyFilterActive && (
              <div className="flex flex-col gap-1 flex-shrink-0 p-2 rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-800/60 dark:bg-yellow-900/20">
                 <div className="flex items-center gap-1 text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                      <Info className="h-3 w-3" />
                      <span>Filtering applied only to {loadedEntries.length} loaded entries.</span>
                  </div>
                  <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-sm font-medium mr-1">Active:</span>
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
                       {(!!activeMetaTag || !!activeIntentTag || activeContentTags.size > 0) && (
                          <Button variant="ghost" size="sm" className="h-5 px-1 text-muted-foreground hover:text-foreground" onClick={() => setFilters({ activeMetaTag: null, activeIntentTag: null, activeContentTags: new Set(), searchQuery: '' })}>
                              Clear All
                          </Button>
                      )}
                  </div>
              </div>
          )}

          <div ref={mainContentScrollRef} className="flex-grow overflow-y-auto pr-2 space-y-4">
            {isLoadingInitial && (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoadingInitial && !errorState && (
              <>
                {displayEntries.length === 0 && loadedEntries.length > 0 && isAnyFilterActive && (
                  <p className="pt-4 text-center text-gray-500">No loaded entries found matching filters.</p>
                )}
                {displayEntries.length === 0 && loadedEntries.length === 0 && (
                   <p className="pt-4 text-center text-gray-500">No entries yet. Click 'Add Entry' to start!</p>
                )}

                {/* Group entries by date */} 
                {Object.entries(groupedEntries).map(([date, dayEntries]) => {
                  const entryCount = dayEntries.length;
                  // Determine if this date group contains the highlighted entry
                  const containsHighlighted = highlightedEntryId !== null && dayEntries.some(entry => entry.id === highlightedEntryId);
                  
                  return (
                    <div key={date} className="mb-4"> 
                      {/* --- Day Header Bar --- */}
                      <div className={clsx(
                          "sticky top-0 z-10 mb-2 p-2 border rounded-md bg-muted", // Apply card-like styles
                          "text-sm font-medium text-muted-foreground",
                          // Add highlight styles if this group contains the highlighted entry
                          containsHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                      )}> 
                        {format(parseISO(date), 'MMMM do, yyyy')} 
                        <span className="ml-2 font-normal">({entryCount} {entryCount === 1 ? 'entry' : 'entries'})</span> {/* Add entry count */}
                      </div>
                      
                      {/* Entries for this date */} 
                      <div className="space-y-2"> 
                        {dayEntries.map((entry) => (
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

                {isLoadingMore && (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!hasMoreEntries && displayEntries.length > 0 && (
                  <p className="pt-4 pb-4 text-center text-sm text-gray-500">
                    {isAnyFilterActive ? "End of loaded entries matching filters." : "End of journal."}
                  </p>
                )}

                <div ref={intersectionObserverRef} style={{ height: '1px' }} />
              </>
            )}
          </div>
        </div>

        <StaticAnalysisColumn />
      </main>
      {isEditorOpen && (
          <EntryEditorDialog
            isOpen={isEditorOpen}
            selectedDate={format(new Date(), 'yyyy-MM-dd')}
            initialEntry={editingEntry}
          />
      )}
    </div>
  );
} 