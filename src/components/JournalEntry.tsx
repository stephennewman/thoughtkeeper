import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from 'date-fns';
import { Pencil, Save, X, Trash2 } from 'lucide-react';

interface JournalEntryProps {
  selectedDate: string;
  content: string;
  onSave: (content: string) => void;
  entries: Array<{
    id: string;
    date: string;
    content: string;
    summary?: string;
    tags?: string[];
  }>;
  onUpdateEntry: (id: string, content: string) => void;
  onDeleteEntry: (id: string) => void;
}

export function JournalEntry({
  selectedDate,
  content,
  onSave,
  entries,
  onUpdateEntry,
  onDeleteEntry,
}: JournalEntryProps) {
  const [editContent, setEditContent] = React.useState(content);
  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
  const [editEntryContent, setEditEntryContent] = React.useState('');
  const selectedEntries = entries.filter(entry => entry.date === selectedDate);

  const handleSave = () => {
    if (!editContent.trim()) return;
    onSave(editContent);
    setEditContent('');
  };

  const handleStartEdit = (entry: typeof selectedEntries[0]) => {
    setEditingEntryId(entry.id);
    setEditEntryContent(entry.content);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditEntryContent('');
  };

  const handleSaveEdit = (entryId: string) => {
    if (!editEntryContent.trim()) return;
    onUpdateEntry(entryId, editEntryContent);
    setEditingEntryId(null);
    setEditEntryContent('');
  };

  const handleDelete = (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      onDeleteEntry(entryId);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full p-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">
          {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
        </h2>
        <p className="text-gray-500">{selectedEntries.length} entries for this date</p>
      </div>

      <div className="flex flex-col gap-4">
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Write your journal entry here..."
          className="min-h-[200px] p-4"
        />
        <Button onClick={handleSave} className="w-fit" disabled={!editContent.trim()}>
          Save Entry
        </Button>
      </div>

      <div className="space-y-4">
        {selectedEntries.map((entry) => (
          <div key={entry.id} className="border rounded-lg p-4 mt-4">
            {editingEntryId === entry.id ? (
              <div className="space-y-4">
                <Textarea
                  value={editEntryContent}
                  onChange={(e) => setEditEntryContent(e.target.value)}
                  className="min-h-[200px] p-4"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSaveEdit(entry.id)}
                    className="flex items-center gap-2"
                    disabled={!editEntryContent.trim()}
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-end gap-2 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(entry)}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
                <p className="whitespace-pre-wrap">{entry.content}</p>
                {entry.summary && (
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    <p className="text-sm text-gray-600">{entry.summary}</p>
                  </div>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {entry.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 