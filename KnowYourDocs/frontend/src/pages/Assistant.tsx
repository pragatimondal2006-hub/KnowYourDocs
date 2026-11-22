import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Copy,
  Trash2,
  Sparkles,
  Check,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { ChatMessage } from "../types";
import CitationCard from "../components/chat/CitationCard";
import PipelineTimeline from "../components/chat/PipelineTimeline";
import { LoadingDots } from "../components/ui/Primitives";
import AppShell from "../components/layout/AppShell";

const SUGGESTED_QUESTIONS = [
  "Summarise the key points in my documents.",
  "What are the most important details?",
  "Find important dates, deadlines or requirements.",
];

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    data: docsData,
    isLoading: documentsLoading,
    isError: documentsError,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: api.listDocuments,
  });

  const hasDocuments = (docsData?.total ?? 0) > 0;

  const chatMutation = useMutation({
    mutationFn: (question: string) => api.chat(question),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, chatMutation.isPending]);

  const sendMessage = async (question: string) => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: trimmedQuestion,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const result = await chatMutation.mutateAsync(trimmedQuestion);

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
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        content:
          error instanceof Error
            ? `I couldn't process your question. Please try again.\n\nTechnical detail: ${error.message}`
            : "I couldn't process your question. Please check your connection and try again.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const copyAnswer = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <AppShell title="AI Assistant">
      <div className="mx-auto flex h-[calc(100vh-130px)] max-w-5xl flex-col">

        {messages.length > 0 && (
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => {
                setMessages([]);
                setCopiedId(null);
              }}
              className="btn-outline px-3 py-1.5 text-xs"
            >
              <Trash2 size={14} />
              Clear conversation
            </button>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 space-y-5 overflow-y-auto pr-1"
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-oat">
                <Sparkles size={28} className="text-espresso" />
              </div>

              <h2 className="font-heading text-xl font-semibold text-coffee">
                Your documents. Your answers.
              </h2>

              <p className="mt-2 max-w-md text-sm leading-relaxed text-grey">
                Ask questions in natural language. KnowYourDocs searches your
                uploaded knowledge base and provides answers supported by
                relevant document sources.
              </p>

              {documentsLoading ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-grey">
                  <LoadingDots />
                  Checking your knowledge base...
                </div>
              ) : documentsError ? (
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-sand px-4 py-3 text-sm text-mocha">
                  <AlertCircle size={16} />
                  Unable to check your documents. Please refresh and try again.
                </div>
              ) : !hasDocuments ? (
                <div className="mt-6 max-w-sm rounded-2xl border border-border bg-ivory p-5">
                  <FileText size={25} className="mx-auto text-caramel" />

                  <h3 className="mt-3 font-semibold text-coffee">
                    Your knowledge base is empty
                  </h3>

                  <p className="mt-2 text-sm text-grey">
                    Upload PDF or other supported documents to start asking
                    questions about their contents.
                  </p>

                  <Link
                    to="/knowledge-base"
                    className="btn-primary mt-4 inline-flex"
                  >
                    Go to Knowledge Base
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="mt-6 w-full max-w-lg">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-grey">
                    Try asking
                  </p>

                  <div className="flex flex-col gap-2">
                    {SUGGESTED_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        onClick={() => sendMessage(question)}
                        disabled={chatMutation.isPending}
                        className="btn-outline justify-start px-4 py-3 text-left text-xs"
                      >
                        <Sparkles size={14} />
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
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
                          Demo mode: an AI-generated response is not
                          available. The displayed content contains
                          extracted document information instead.
                        </span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-coffee">
                      {message.content}
                    </p>

                    <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
                      <button
                        onClick={() => copyAnswer(message)}
                        className="flex items-center gap-1.5 text-xs text-grey hover:text-espresso"
                      >
                        {copiedId === message.id ? (
                          <Check size={13} />
                        ) : (
                          <Copy size={13} />
                        )}

                        {copiedId === message.id
                          ? "Copied"
                          : "Copy answer"}
                      </button>
                    </div>
                  </div>

                  {message.citations && message.citations.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">
                        Sources
                      </p>

                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {message.citations.map((citation) => (
                          <CitationCard
                            key={
                              citation.citation_ref + citation.document_id
                            }
                            citation={citation}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {message.pipelineStages && (
                    <PipelineTimeline stages={message.pipelineStages} />
                  )}
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="nexus-card flex items-center gap-3 px-4 py-3">
                <LoadingDots />
                <span className="text-sm text-grey">
                  Searching your documents...
                </span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}
          className="nexus-card mt-4 flex items-end gap-2.5 p-2.5"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder="Ask a question about your documents..."
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-coffee placeholder:text-grey/70 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!input.trim() || chatMutation.isPending}
            className="btn-primary px-3.5 py-2.5"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>

      </div>
    </AppShell>
  );
}