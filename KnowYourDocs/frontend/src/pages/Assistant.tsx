import { useRef, useState, useEffect } from "react";
import { Send, Copy, Trash2, Sparkles, Check, AlertCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { ChatMessage } from "../types";
import CitationCard from "../components/chat/CitationCard";
import PipelineTimeline from "../components/chat/PipelineTimeline";
import { LoadingDots, EmptyState } from "../components/ui/Primitives";
import AppShell from "../components/layout/AppShell";

const SUGGESTED_QUESTIONS = [
  "What is the maternity leave policy?",
  "How many remote work days are employees allowed?",
  "What changed between the 2025 and 2026 handbooks?",
];

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: docsData } = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });
  const hasDocuments = (docsData?.total ?? 0) > 0;

  const chatMutation = useMutation({
    mutationFn: (question: string) => api.chat(question),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || chatMutation.isPending) return;
    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const result = await chatMutation.mutateAsync(question);
      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: result.answer,
        citations: result.citations,
        generationMode: result.generation_mode,
        pipelineStages: result.pipeline_stages,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: "Something went wrong while processing your question. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const copyAnswer = (message: ChatMessage) => {
    navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <AppShell title="AI Assistant">
      <div className="mx-auto flex h-[calc(100vh-130px)] max-w-5xl flex-col">
        {messages.length > 0 && (
          <div className="mb-3 flex justify-end">
            <button onClick={() => setMessages([])} className="btn-outline text-xs px-3 py-1.5">
              <Trash2 size={14} /> Clear conversation
            </button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-oat">
                <Sparkles size={26} className="text-espresso" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-coffee">Ask about your documents</h2>
              <p className="mt-1.5 max-w-sm text-sm text-grey">
                {hasDocuments
                  ? "Ask a natural-language question and NEXUS AI will answer with real citations from your knowledge base."
                  : "Your knowledge base is empty. Upload documents first so NEXUS AI has something to search."}
              </p>
              {hasDocuments && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)} className="btn-outline text-xs px-3 py-1.5">
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              {message.role === "user" ? (
                <div className="max-w-xl rounded-2xl rounded-tr-sm bg-espresso px-4 py-3 text-sm text-ivory">
                  {message.content}
                </div>
              ) : (
                <div className="w-full max-w-3xl space-y-3">
                  <div className="nexus-card p-4">
                    {message.generationMode === "demo_extractive" && (
                      <div className="mb-3 flex items-start gap-2 rounded-lg bg-sand px-3 py-2 text-xs text-mocha">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>
                          Demo mode: no ANTHROPIC_API_KEY is configured, so excerpts are shown directly instead of an
                          LLM-generated answer.
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-coffee">{message.content}</p>
                    <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
                      <button
                        onClick={() => copyAnswer(message)}
                        className="flex items-center gap-1.5 text-xs text-grey hover:text-espresso"
                      >
                        {copiedId === message.id ? <Check size={13} /> : <Copy size={13} />}
                        {copiedId === message.id ? "Copied" : "Copy answer"}
                      </button>
                    </div>
                  </div>

                  {message.citations && message.citations.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Sources</p>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {message.citations.map((c) => (
                          <CitationCard key={c.citation_ref + c.document_id} citation={c} />
                        ))}
                      </div>
                    </div>
                  )}

                  {message.pipelineStages && <PipelineTimeline stages={message.pipelineStages} />}
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="nexus-card flex items-center gap-3 px-4 py-3">
                <LoadingDots />
                <span className="text-sm text-grey">Searching your documents…</span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="mt-4 flex items-end gap-2.5 nexus-card p-2.5"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder="Ask a question about your documents…"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-coffee placeholder:text-grey/70 focus:outline-none"
          />
          <button type="submit" disabled={!input.trim() || chatMutation.isPending} className="btn-primary px-3.5 py-2.5">
            <Send size={16} />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
