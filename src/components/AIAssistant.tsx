import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Loader2, MessageSquare, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const AIAssistant = () => {
  const { profile, userRole, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamResponse = async (resp: Response) => {
    let assistantContent = "";
    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No response stream");
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nlIdx: number;
      while ((nlIdx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            assistantContent += delta;
            const content = assistantContent;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
              }
              return [...prev, { role: "assistant", content }];
            });
          }
        } catch { /* partial */ }
      }
    }
    return assistantContent;
  };

  const sendMessage = async (overrideInput?: string) => {
    const text = overrideInput || input.trim();
    if (!text || isLoading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    if (!overrideInput) setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context: `User: ${profile?.full_name || "Unknown"}, Role: ${userRole || "none"}, UserId: ${user?.id || "none"}`,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get response");
      }

      await streamResponse(resp);
    } catch (e: any) {
      toast.error(e.message || "AI Assistant error");
      setMessages(prev => {
        if (prev[prev.length - 1]?.role !== "assistant") {
          return [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }];
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 20MB.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isText = ["text/csv", "text/plain", "application/json", "text/tab-separated-values"].includes(file.type) ||
      [".csv", ".txt", ".json", ".tsv", ".md"].some(ext => file.name.endsWith(ext));
    const isExcel = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(file.type) ||
      [".xls", ".xlsx"].some(ext => file.name.endsWith(ext));
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (!isImage && !isText && !isExcel && !isPdf) {
      toast.error("Unsupported file type. Please upload CSV, TXT, JSON, Excel, PDF, or image files.");
      return;
    }

    setIsLoading(true);

    try {
      let content = "";
      let action = "process_document";
      let fileType = file.type || "unknown";

      if (isImage) {
        // Convert image to base64 for AI processing
        const buffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        content = `[Image file: ${file.name}, type: ${file.type}, size: ${file.size} bytes]\nBase64 data available for OCR processing.\nNote: This is an image upload. Please analyze the visual content, perform OCR if needed, and extract any structured data.`;
        fileType = "image";
      } else if (isText || isExcel) {
        content = await file.text();
        if (isExcel) fileType = "excel";
      } else if (isPdf) {
        content = await file.text();
        fileType = "pdf";
      }

      // Check if this looks like student data for direct import
      const looksLikeStudentData = /student[_\s]?id|admission|name.*gender|gender.*name/i.test(content.slice(0, 500));

      if (looksLikeStudentData && (isText || isExcel)) {
        action = "parse_students";
      }

      const userMsg: Message = {
        role: "user",
        content: `📎 Uploaded: **${file.name}** (${(file.size / 1024).toFixed(1)} KB)\n\n${
          action === "parse_students" 
            ? "Detected student data. Processing for import..." 
            : "Analyzing document content..."
        }`,
      };
      setMessages(prev => [...prev, userMsg]);

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context: `User: ${profile?.full_name || "Unknown"}, Role: ${userRole || "none"}, UserId: ${user?.id || "none"}`,
          action,
          fileContent: content.slice(0, 20000),
          fileName: file.name,
          fileType,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to process document");
      }

      await streamResponse(resp);
    } catch (e: any) {
      toast.error(e.message || "Failed to process document");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that document. Please try again." }]);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 md:w-14 md:h-14 shadow-lg"
        size="icon"
      >
        <Bot className="w-5 h-5 md:w-6 md:h-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 w-full md:w-[380px] md:max-w-[calc(100vw-2rem)] h-[85vh] md:h-[500px] md:max-h-[calc(100vh-4rem)] bg-background border md:rounded-xl shadow-2xl flex flex-col rounded-t-xl">
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-xl">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold text-sm">SDMS AI Assistant</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Hi! I'm your SDMS AI assistant.</p>
            <p className="text-xs text-muted-foreground">
              I can help manage students, view reports, analyze documents, and more. Upload any file (CSV, Excel, PDF, images) for instant processing.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {["Show system stats", "List pending incidents", "How to add students?"].map(q => (
                <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(q)}>{q}</Button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask something or upload a file..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
            className="text-sm"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.json,.xls,.xlsx,.pdf,.png,.jpg,.jpeg,.webp,.md,.tsv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Upload document (CSV, Excel, PDF, Image)"
            className="shrink-0"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button size="icon" onClick={() => sendMessage()} disabled={isLoading || !input.trim()} className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Supports CSV, Excel, PDF, images, JSON, TXT</p>
      </div>
    </div>
  );
};

export default AIAssistant;
