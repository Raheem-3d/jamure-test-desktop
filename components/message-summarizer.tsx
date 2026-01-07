// Message Summarization Button Component
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MessageSummarizerProps {
  channelId?: string;
  messageIds?: string[];
  limit?: number;
}

export function MessageSummarizer({
  channelId,
  messageIds,
  limit = 50,
}: MessageSummarizerProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, messageIds, limit }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to summarize");
      }

      setSummary(data.summary);
      setOpen(true);
      toast.success("Summary generated!");
    } catch (error: any) {
      console.error("Summarize Error:", error);
      toast.error(error.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSummarize}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Summarizing...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            AI Summary
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Conversation Summary</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
            <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
              {summary}
            </div>
          </div>
          <Button onClick={() => setOpen(false)} className="mt-4">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
