import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Conversation, Message } from "@clarity/shared";
import {
  createConversation,
  fetchConversationMessages,
  fetchConversations,
  sendMessage
} from "../lib/api";
import { viewerUserId } from "../lib/profile";

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
        setStatus(items.length > 0 ? "Conversation list loaded." : "No conversations yet.")
      )
      .catch((error) =>
        setStatus(error instanceof Error ? error.message : "Could not load conversations.")
      );
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
        setStatus(result.reused ? "Conversation already existed." : "Conversation created.");
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
      setStatus("Message saved locally.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send message.");
    }
  }

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId]
  );
  const selectedParticipant = selectedConversation ? otherParticipant(selectedConversation) : undefined;

  return (
    <section className="page stack">
      <div className="panel split-header">
        <div className="stack-small">
          <p className="eyebrow">Conversations</p>
          <h2>Simple, readable chat with no realtime theater</h2>
          <p className="muted">
            Open a conversation from matches, send a message, and report or block from the
            same flow when something crosses a line.
          </p>
        </div>
        <span className="status-text">{status}</span>
      </div>

      <div className="chat-layout">
        <div className="panel stack-small">
          <h3>Conversation list</h3>
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
                  <span>{participant?.displayName ?? "Conversation"}</span>
                  <span className="muted">
                    {conversation.lastMessagePreview || "No messages yet"}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="muted">
              No conversations yet. Open one from a match card to start.
            </p>
          )}
        </div>

        <div className="panel stack">
          {selectedConversation ? (
            <>
              <div className="split-header">
                <div className="stack-small">
                  <h3>{selectedParticipant?.displayName ?? "Conversation"}</h3>
                  <p className="muted">
                    {selectedConversation.status === "blocked"
                      ? "This conversation is blocked."
                      : "Messages are saved locally and reload without websocket infrastructure."}
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

              {firstMessagePrompt ? (
                <div className="helper-callout">
                  <strong>First message helper:</strong> {firstMessagePrompt}
                </div>
              ) : null}

              <div className="message-list">
                {messages.map((message) => (
                  <article className="message-card" key={message.id}>
                    <div className="card-header">
                      <strong>
                        {message.senderUserId === viewerUserId
                          ? "You"
                          : selectedParticipant?.displayName ?? message.senderUserId}
                      </strong>
                      <span className="muted">{message.sentAt}</span>
                    </div>
                    <p>{message.body}</p>
                    <span className="message-meta">Moderation: {message.moderationState}</span>
                  </article>
                ))}
              </div>

              <form className="stack-small" onSubmit={handleSendMessage}>
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
                <button
                  className="button"
                  disabled={selectedConversation.status === "blocked"}
                  type="submit"
                >
                  Send message
                </button>
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
