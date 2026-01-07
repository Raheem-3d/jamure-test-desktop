// AI Chat Component - Advanced AI Assistant Interface
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Send, Loader2, Sparkles, Lightbulb, Info, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SAMPLE_QUERIES = [
  "What tasks are overdue?",
  "Who is most overloaded on my team?",
  "Generate a project status report",
  "What are the blockers for this sprint?",
  "Suggest priorities for next week",
];

const EMPLOYEE_QUERIES = [
  "What are my current tasks?",
  "What tasks are assigned to me?",
  "What are my overdue tasks?",
  "Show my task progress",
  "What should I prioritize today?",
];

export default function AIAssistant() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const userRole = (session?.user as any)?.role;
  const isEmployee = userRole === 'EMPLOYEE';
  const canViewOrgData = ['ORG_ADMIN', 'ORG_MEMBER', 'MANAGER', 'SUPER_ADMIN'].includes(userRole);
  const queries = isEmployee ? EMPLOYEE_QUERIES : SAMPLE_QUERIES;
 const router = useRouter();


  const handleSubmit = async (query?: string) => {
    const userQuery = query || input.trim();
    if (!userQuery) return;
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      toast.error(error.message || "Failed to get AI response");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">

   
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">

    <Button
      variant="outline"
      size="sm"
      className="h-10 w-10 p-0 mx-2 bg-blue-800/30 hover:bg-blue-800/40 border-0"
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>

            <Bot className="h-6 w-6" />
            AI Project Assistant
            <Sparkles className="h-5 w-5 ml-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Role Info Banner */}
          {userRole && (
            <div className={`rounded-lg p-3 flex items-start gap-2 text-sm ${isEmployee
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                : 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
              }`}>
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Access Level: {userRole.replace('_', ' ')}</strong>
                <p className="text-xs mt-1 opacity-90">
                  {isEmployee
                    ? 'You can view your own tasks and assignments.'
                    : 'You have access to organization-wide data and team insights.'}
                </p>
              </div>
            </div>
          )}

          {/* Sample Queries */}
          {/* {messages.length === 0 && ( */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Lightbulb className="h-4 w-4" />
              <span>Try asking:</span>
            </div>
            <div className="grid gap-2">
              {queries.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => handleSubmit(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
          {/* )} */}

          {/* Chat Messages */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    }`}
                >
                  <div className="flex items-start gap-2">
                    {msg.role === "assistant" && (
                      <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>

                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your project..."
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={loading}
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 h-auto px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 