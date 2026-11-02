import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, ChartNoAxesCombined, FileDown, MessageCircle, RefreshCw, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadAssistantConversation } from "@/lib/assistant.functions";
import { adminCatalogQuery } from "@/lib/catalog.query";
import { generateCatalogPdf } from "@/lib/catalog-pdf";
import type { AssistantConversation } from "@/lib/assistant";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";

export function AnalyticsAssistant() {
  const load = useServerFn(loadAssistantConversation);
  const conversation = useQuery({
    queryKey: ["admin-assistant"],
    queryFn: () => load(),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  if (conversation.isPending)
    return <p className="py-12 text-muted-foreground">Carregando sua conversa…</p>;
  if (conversation.error || !conversation.data)
    return (
      <div className="py-10" role="alert">
        <p className="text-destructive">Não foi possível carregar sua conversa.</p>
        <Button variant="outline" className="mt-4" onClick={() => conversation.refetch()}>
          <RefreshCw />
          Tentar novamente
        </Button>
      </div>
    );
  return <AssistantChat key={conversation.data.id} initial={conversation.data} />;
}

function AssistantChat({ initial }: { initial: AssistantConversation }) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [stopped, setStopped] = useState(false);
  const [blocked, setBlocked] = useState(initial.blockedReason);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("Sua sessão expirou. Entre novamente.");
          return { Authorization: `Bearer ${data.session.access_token}` };
        },
        fetch: async (url, init) => {
          const response = await fetch(url, init);
          if (response.status === 402 || response.status === 403)
            setBlocked(await response.clone().text());
          return response;
        },
      }),
    [],
  );
  const { messages, sendMessage, status, error, stop, clearError } = useChat({
    id: initial.id,
    messages: initial.messages as UIMessage[],
    transport,
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (
      !busy &&
      !blocked &&
      (document.activeElement === document.body ||
        document.activeElement?.closest("[data-assistant]"))
    )
      input.current?.focus();
  }, [busy, blocked]);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const send = async (text: string) => {
    if (busy || blocked || !text.trim()) return;
    clearError();
    setStopped(false);
    setDraft("");
    input.current?.focus();
    await sendMessage({ text: text.trim() });
  };
  const catalog = useQuery(adminCatalogQuery);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const handleDownloadPdf = () => {
    if (!catalog.data || !catalog.data.length) return;
    setGeneratingPdf(true);
    try {
      generateCatalogPdf(catalog.data);
    } finally {
      setGeneratingPdf(false);
    }
  };
  const suggestions = [
    "Crie uma estratégia para aumentar o faturamento deste mês",
    "Planeje uma campanha para trazer novos clientes",
    "Analise meus preços e me ajude a calcular a margem de lucro",
    "Como posso melhorar meu catálogo digital?",
    "Quais processos da tabacaria posso automatizar?",
  ];
  return (
    <section
      data-assistant
      className="mx-auto mt-6 flex h-[min(720px,calc(100dvh-270px))] min-h-96 max-w-3xl flex-col"
    >
      <div className="flex items-center gap-3 border-b pb-4">
        <MessageCircle className="size-5 text-primary" />
        <span className="font-display font-semibold">Astra · Assistente S7VEN</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={generatingPdf || !catalog.data?.length}
            onClick={handleDownloadPdf}
            className="h-8 gap-1.5 text-xs"
            title="Exportar catálogo completo em PDF com fotos, preços e variações"
          >
            <FileDown className="size-3.5 text-primary" />
            {generatingPdf ? "Gerando PDF…" : "Gerar PDF do Catálogo"}
          </Button>
          <span className="text-xs text-muted-foreground">Minha loja</span>
        </div>
      </div>
      <Conversation className="min-h-0" aria-label="Conversa com a assistente">
        <ConversationContent className="gap-6 px-0 py-6 sm:px-2">
          {!messages.length && (
            <ConversationEmptyState>
              <ChartNoAxesCombined className="size-9 text-primary" />
              <h2 className="font-display text-xl font-semibold">Como posso ajudar a sua loja hoje?</h2>
              <p className="max-w-md text-sm text-muted-foreground">Estratégias de vendas, campanhas, preços e lucro, catálogo, projetos de sites e automações. Peça o que precisar.</p>
              <div className="mt-4 flex w-full max-w-lg flex-col gap-2">
                {suggestions.map((text) => (
                  <Button
                    key={text}
                    variant="outline"
                    disabled={!!blocked || busy}
                    className="h-auto min-h-11 justify-between whitespace-normal text-left"
                    onClick={() => send(text)}
                  >
                    {text}
                    <ArrowUp className="shrink-0" />
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          )}
          {messages.map((message, index) => (
            <Message key={message.id} from={message.role} data-message-role={message.role}>
              {message.role === "assistant" && (
                <span className="text-xs font-medium text-primary">Astra</span>
              )}
              <MessageContent
                className={
                  message.role === "user"
                    ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                    : "w-full"
                }
              >
                {message.parts.map((part, i) =>
                  part.type === "text" ? (
                    message.role === "assistant" ? (
                      <MessageResponse key={i} isAnimating={busy && index === messages.length - 1}>
                        {part.text}
                      </MessageResponse>
                    ) : (
                      <p key={i} className="whitespace-pre-wrap break-words">
                        {part.text}
                      </p>
                    )
                  ) : part.type === "reasoning" && part.text ? (
                    <Reasoning
                      key={i}
                      defaultOpen={false}
                      isStreaming={busy && index === messages.length - 1}
                    >
                      <ReasoningTrigger>
                        <span className="text-xs">Raciocínio da Astra</span>
                      </ReasoningTrigger>
                      <ReasoningContent>{part.text}</ReasoningContent>
                    </Reasoning>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}
          {busy &&
            !messages
              .at(-1)
              ?.parts.some(
                (p) => p.type === "text" && messages.at(-1)?.role === "assistant" && p.text.trim(),
              ) && (
              <div role="status">
                <Shimmer>A Astra está pensando…</Shimmer>
              </div>
            )}
        </ConversationContent>
        <ConversationScrollButton aria-label="Ir para a última resposta" />
      </Conversation>
      {(error || blocked) && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {blocked || error?.message}
        </p>
      )}
      {stopped && !busy && (
        <p role="status" className="mb-3 text-xs text-muted-foreground">
          Análise interrompida.
        </p>
      )}
      <PromptInput onSubmit={({ text }) => send(text)} className="shrink-0">
        <PromptInputTextarea
          ref={input}
          aria-label="Pergunta para a assistente"
          placeholder="Peça uma estratégia, campanha, análise de preços…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={4000}
          disabled={!!blocked}
          className="min-h-16"
        />
        <PromptInputFooter>
          <span className="text-xs text-muted-foreground">Astra · IA</span>
          <PromptInputSubmit
            status={status}
            aria-label={busy ? "Parar análise" : "Enviar pergunta"}
            title={busy ? "Parar análise" : "Enviar pergunta"}
            disabled={!!blocked || (!busy && !draft.trim())}
            className="size-9"
            onStop={() => {
              stop();
              setStopped(true);
            }}
          >
            {busy ? <Square /> : <ArrowUp />}
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
      <p className="py-2 text-center text-[11px] text-muted-foreground">
        A Astra pode errar. Confira números e informações antes de usar.
      </p>
    </section>
  );
}
