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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        setAudioError("Audio recording not supported in this browser.");
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
            if(mediaRecorderRef.current?.stream) {
              mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }

            transcribeAndCreateEntry(audioBlob);
        };

        mediaRecorderRef.current.onerror = (event) => {
            console.error("MediaRecorder error:", event);
            setAudioError("Error during recording.");
            setIsRecording(false);
            setIsProcessingAudio(false);
            if(mediaRecorderRef.current?.stream) {
              mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };

        // Start recording with a smaller timeslice for potentially better prod behavior
        mediaRecorderRef.current.start(500); // Fire ondataavailable every 500ms
        setIsRecording(true); // Set recording state true

    } catch (err) {
        console.error("Error accessing microphone:", err);
        if (err instanceof Error) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setAudioError("Microphone permission denied.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setAudioError("No microphone found.");
            } else {
                setAudioError(`Mic error: ${err.message}`);
            }
        } else {
            setAudioError("Could not access microphone.");
        }
        setIsRecording(false);
        setIsProcessingAudio(false);
    }
  };

  const stopRecordingAndDiscard = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current.onstop = null;
      try { mediaRecorderRef.current.stop(); } catch (e) { console.warn("Error stopping MediaRecorder (discard):", e); }
      mediaRecorderRef.current = null;
      console.log("Recording stopped and discarded.");
    } else {
        console.warn("Stop recording (discard) called but not recording.");
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsProcessingAudio(false);
    setAudioError(null);
  };

  const handleSendClick = () => {
     if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
       setIsRecording(false);
       setIsProcessingAudio(true);
       try { mediaRecorderRef.current.stop(); } catch (e) { console.warn("Error stopping MediaRecorder (send):", e); }
       console.log("Send clicked, stopping recording...");
     } else {
       console.warn("Send clicked but not recording.");
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
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Search Input - Only visible when idle */} 
              <Input
                type="search"
                placeholder="Search loaded entries..."
                value={searchQuery}
                onChange={handleSearchChange}
                // Show only when idle AND on sm+ screens
                className={clsx(
                    'w-full max-w-xs',
                    !isRecording && !isProcessingAudio ? 'hidden sm:block' : 'hidden' 
                )}
              />
              
              {/* Add Voice Note Button - Only visible when idle */} 
              <Button
                  variant="outline"
                  onClick={startRecording}
                  size="sm"
                  aria-label="Add voice note"
                  title="Add voice note"
                  // Show only when idle
                  className={clsx(!isRecording && !isProcessingAudio ? 'inline-flex' : 'hidden')}
              >
                  <Mic className="mr-2 h-4 w-4" /> Add Voice Note
              </Button>
              
              {/* Add Text Note Button - Only visible when idle */} 
              <Button
                  onClick={handleAddClick}
                  disabled={false} 
                  size="sm"
                  className={clsx(
                    'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity flex-shrink-0',
                    // Show only when idle
                    !isRecording && !isProcessingAudio ? 'inline-flex' : 'hidden' 
                  )}
                  aria-label="Add text note"
                  title="Add text note"
              >
                  <FileText className="mr-2 h-4 w-4" /> Add Text Note
              </Button>

              {/* Transcribe Button - Only visible when recording */}
              <Button
                  variant="default"
                  onClick={handleSendClick}
                  size="sm"
                  aria-label="Transcribe recording"
                  title="Transcribe recording"
                  // Show only when recording
                  className={clsx(isRecording && !isProcessingAudio ? 'inline-flex' : 'hidden')}
              >
                  <Check className="mr-2 h-4 w-4" /> Transcribe
              </Button>

              {/* Stop Recording Button - Only visible when recording */} 
              <Button
                  variant="outline"
                  onClick={stopRecordingAndDiscard}
                  size="sm"
                  aria-label="Stop recording"
                  title="Stop recording"
                  // Show only when recording
                  className={clsx(isRecording && !isProcessingAudio ? 'inline-flex' : 'hidden')}
              >
                  <X className="mr-2 h-4 w-4" /> Stop Recording
              </Button>

              {/* Processing Indicator - Only visible when processing */} 
              {isProcessingAudio && (
                 <div className="flex items-center justify-center text-sm text-muted-foreground px-3"> {/* Added padding for similar width */}
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Processing...</span>
                 </div>
              )}
            </div> {/* End Right side container */}
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

                 {sortedDates.map(date => (
                  <Fragment key={date}>
                      <h2 className="sticky top-0 z-10 bg-background py-1 px-4 font-semibold text-sm text-left">
                          {format(parseISO(date), 'MMMM dd, yyyy')}
                      </h2>
                      <div className="space-y-3">
                      {groupedEntries[date].map(entry => (
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
                  </Fragment>
                  ))}

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