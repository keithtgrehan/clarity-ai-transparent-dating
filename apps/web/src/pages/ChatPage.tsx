import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Conversation, MatchCandidate, Message } from "@clarity/shared";
import {
  createConversation,
  fetchConversationMessages,
  fetchMatchCandidates,
  fetchConversations,
  sendMessage
} from "../lib/api";
import { humanizeEnum, viewerUserId } from "../lib/profile";

function otherParticipant(conversation: Conversation) {
  return conversation.participants.find((participant) => participant.userId !== viewerUserId);
}

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [status, setStatus] = useState("Loading conversations...");
  const [firstMessagePrompt, setFirstMessagePrompt] = useState<string | undefined>();
  const [handledCandidateId, setHandledCandidateId] = useState("");
  const [candidateLookup, setCandidateLookup] = useState<Record<string, MatchCandidate>>({});
  const navigate = useNavigate();

  const candidateId = searchParams.get("candidate") ?? "";

  async function refreshConversations(preserveId?: string) {
    const result = await fetchConversations(viewerUserId);
    setConversations(result.conversations);

    const nextId =
      result.conversations.find((conversation) => conversation.id === preserveId)?.id ??
      result.conversations[0]?.id ??
      "";

    setSelectedConversationId(nextId);
    return result.conversations;
  }

  useEffect(() => {
    refreshConversations()
      .then((items) =>
        setStatus(items.length > 0 ? "Choose a conversation to continue." : "No conversations yet.")
      )
      .catch((error) =>
        setStatus(error instanceof Error ? error.message : "Could not load conversations.")
      );
  }, []);

  useEffect(() => {
    fetchMatchCandidates(viewerUserId)
      .then((result) =>
        setCandidateLookup(
          Object.fromEntries(
            result.candidates.map((candidate) => [candidate.candidateUserId, candidate])
          )
        )
      )
      .catch(() => {
        setCandidateLookup({});
      });
  }, []);

  useEffect(() => {
    if (!candidateId || candidateId === handledCandidateId) {
      return;
    }

    setHandledCandidateId(candidateId);
    setStatus("Opening conversation...");

    createConversation({
      participantUserIds: [viewerUserId, candidateId]
    })
      .then(async (result) => {
        await refreshConversations(result.conversation.id);
        setStatus(result.reused ? "Conversation already existed." : "Conversation ready.");
      })
      .catch((error) =>
        setStatus(error instanceof Error ? error.message : "Could not open conversation.")
      );
  }, [candidateId, handledCandidateId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setFirstMessagePrompt(undefined);
      return;
    }

    fetchConversationMessages(selectedConversationId)
      .then((result) => {
        setMessages(result.messages);
        setFirstMessagePrompt(result.firstMessagePrompt);
      })
      .catch(() => {
        setMessages([]);
        setFirstMessagePrompt(undefined);
      });
  }, [selectedConversationId]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedConversationId || !newMessage.trim()) {
      return;
    }

    setStatus("Sending message...");

    try {
      await sendMessage({
        conversationId: selectedConversationId,
        senderUserId: viewerUserId,
        body: newMessage
      });
      setNewMessage("");
      await refreshConversations(selectedConversationId);
      const refreshed = await fetchConversationMessages(selectedConversationId);
      setMessages(refreshed.messages);
      setFirstMessagePrompt(refreshed.firstMessagePrompt);
      setStatus("Message sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send message.");
    }
  }

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId]
  );
  const selectedParticipant = selectedConversation ? otherParticipant(selectedConversation) : undefined;
  const selectedCandidate = selectedParticipant
    ? candidateLookup[selectedParticipant.userId]
    : undefined;

  return (
    <section className="page stack">
      <header className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Conversations</p>
          <h2>Low-pressure conversations with enough context to feel grounded</h2>
          <p className="lead">
            Start from a match, keep the message readable, and use the same space to pause,
            report, or block if the conversation stops feeling safe.
          </p>
        </div>
        <div className="page-header-meta">
          <span className="info-pill">{conversations.length} conversations</span>
          <span className="status-text">{status}</span>
        </div>
      </header>

      <div className="chat-layout">
        <div className="panel stack-small">
          <div className="stack-small">
            <h3>Conversation list</h3>
            <p className="field-hint">
              One list, one thread, one clear safety exit.
            </p>
          </div>
          {conversations.length > 0 ? (
            conversations.map((conversation) => {
              const participant = otherParticipant(conversation);

              return (
                <button
                  className={
                    conversation.id === selectedConversationId
                      ? "list-button list-button-active"
                      : "list-button"
                  }
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  type="button"
                >
                  <span className="list-button-label">{participant?.displayName ?? "Conversation"}</span>
                  <span className="list-button-meta">
                    {conversation.lastMessagePreview || "No messages yet"}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="muted">
              No conversations yet. Start with a match that feels easy to message.
            </p>
          )}
        </div>

        <div className="panel chat-thread">
          {selectedConversation ? (
            <>
              <div className="split-header">
                <div className="stack-small">
                  <h3>{selectedParticipant?.displayName ?? "Conversation"}</h3>
                  <p className="muted">
                    {selectedConversation.status === "blocked"
                      ? "This conversation is currently blocked."
                      : "Keep it direct, kind, and easy to answer."}
                  </p>
                </div>

                {selectedParticipant ? (
                  <button
                    className="button button-danger"
                    onClick={() =>
                      navigate(
                        `/safety?target=${selectedParticipant.userId}&conversation=${selectedConversation.id}`
                      )
                    }
                    type="button"
                  >
                    Report user
                  </button>
                ) : null}
              </div>

              <div className="section-card section-card-muted conversation-context">
                <p className="eyebrow">Profile context</p>
                {selectedCandidate ? (
                  <>
                    <p className="muted">{selectedCandidate.profile.summary}</p>
                    <div className="pill-row">
                      <span className="info-pill">
                        {humanizeEnum(selectedCandidate.profile.identity)}
                      </span>
                      <span className="info-pill">
                        {humanizeEnum(selectedCandidate.profile.relationshipIntent)}
                      </span>
                      <span className="info-pill">
                        {humanizeEnum(selectedCandidate.profile.communicationStyle)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="muted">
                    Structured match context is not available for this thread yet, but you can
                    still continue the conversation normally.
                  </p>
                )}

                {firstMessagePrompt ? (
                  <div className="helper-callout">
                    <strong>First message helper:</strong> {firstMessagePrompt}
                  </div>
                ) : null}
              </div>

              {selectedConversation.status === "blocked" ? (
                <div className="section-card danger-panel stack-small">
                  <p className="eyebrow">Conversation state</p>
                  <p className="muted">
                    This thread is blocked. Messages stay visible for context, but sending is turned off.
                  </p>
                </div>
              ) : null}

              <div className="message-list">
                {messages.map((message) => (
                  <article
                    className={
                      message.senderUserId === viewerUserId
                        ? "message-card message-card-self"
                        : "message-card"
                    }
                    key={message.id}
                  >
                    <div className="card-header">
                      <strong>
                        {message.senderUserId === viewerUserId
                          ? "You"
                          : selectedParticipant?.displayName ?? message.senderUserId}
                      </strong>
                      <span className="muted">{message.sentAt}</span>
                    </div>
                    <p>{message.body}</p>
                    {message.moderationState !== "clear" ? (
                      <span className="message-meta">Held for safety review</span>
                    ) : null}
                  </article>
                ))}
              </div>

              <form className="composer-panel" onSubmit={handleSendMessage}>
                <label className="field">
                  <span>New message</span>
                  <textarea
                    className="textarea"
                    rows={4}
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    placeholder="Write something clear, specific, and low-pressure."
                  />
                </label>
                <div className="action-row action-row-spread">
                  <span className="field-hint">
                    Keep the opener specific, readable, and easy to respond to.
                  </span>
                  <button
                    className="button"
                    disabled={selectedConversation.status === "blocked"}
                    type="submit"
                  >
                    Send message
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="empty-panel">
              <h3>No conversation selected</h3>
              <p className="muted">
                Open a match card to start a conversation, or select an existing thread from
                the left column.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
