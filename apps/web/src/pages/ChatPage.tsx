import { useEffect, useState, type FormEvent } from "react";
import type { Conversation, Message } from "@project-a-z/shared";
import {
  createConversation,
  fetchConversationMessages,
  fetchConversations,
  sendMessage
} from "../lib/api";
import { defaultDemoUserId, demoUsers } from "../lib/demo";

export function ChatPage() {
  const [userId, setUserId] = useState<string>(defaultDemoUserId);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [targetUserId, setTargetUserId] = useState<string>("user-jonas");
  const [status, setStatus] = useState("Loading conversations...");

  async function refreshConversations(activeUserId: string, preserveId?: string) {
    const result = await fetchConversations(activeUserId);
    setConversations(result.conversations);

    const nextConversationId =
      result.conversations.find((conversation) => conversation.id === preserveId)?.id ??
      result.conversations[0]?.id ??
      "";

    setSelectedConversationId(nextConversationId);
  }

  useEffect(() => {
    refreshConversations(userId)
      .then(() => setStatus("Conversation list loaded."))
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load conversations."));
  }, [userId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    fetchConversationMessages(selectedConversationId)
      .then((result) => setMessages(result.messages))
      .catch(() => setMessages([]));
  }, [selectedConversationId]);

  async function handleCreateConversation() {
    setStatus("Creating conversation...");

    try {
      const result = await createConversation({
        participantUserIds: [userId, targetUserId]
      });
      await refreshConversations(userId, result.conversation.id);
      setStatus(result.reused ? "Conversation already existed." : "Conversation created.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create conversation.");
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedConversationId || !newMessage.trim()) {
      return;
    }

    setStatus("Sending message...");

    try {
      await sendMessage({
        conversationId: selectedConversationId,
        senderUserId: userId,
        body: newMessage
      });
      setNewMessage("");
      await refreshConversations(userId, selectedConversationId);
      const refreshed = await fetchConversationMessages(selectedConversationId);
      setMessages(refreshed.messages);
      setStatus("Message saved locally.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send message.");
    }
  }

  return (
    <section className="page stack">
      <div className="panel">
        <p className="eyebrow">Messaging skeleton</p>
        <h2>Conversations stay simple, explicit, and moderation-ready.</h2>
        <p className="muted">{status}</p>
      </div>

      <div className="field-grid two-columns">
        <label className="field">
          <span>Signed-in demo user</span>
          <select
            className="input"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            {demoUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Start a new conversation</span>
          <div className="inline-controls">
            <select
              className="input"
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
            >
              {demoUsers
                .filter((user) => user.id !== userId)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
            </select>
            <button className="button button-secondary" onClick={handleCreateConversation} type="button">
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="chat-layout">
        <div className="panel stack-small">
          <h3>Conversations</h3>
          {conversations.map((conversation) => (
            <button
              className={
                conversation.id === selectedConversationId ? "list-button list-button-active" : "list-button"
              }
              key={conversation.id}
              onClick={() => setSelectedConversationId(conversation.id)}
              type="button"
            >
              <span>{conversation.participantUserIds.join(" + ")}</span>
              <span className="muted">{conversation.lastMessagePreview || "No messages yet"}</span>
            </button>
          ))}
        </div>

        <div className="panel stack">
          <h3>Messages</h3>
          <div className="message-list">
            {messages.map((message) => (
              <article className="message-card" key={message.id}>
                <div className="card-header">
                  <strong>{message.senderUserId}</strong>
                  <span className="muted">{message.sentAt}</span>
                </div>
                <p>{message.body}</p>
                <span className="message-meta">Moderation state: {message.moderationState}</span>
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
                placeholder="Write something direct, kind, and specific."
              />
            </label>
            <button className="button" type="submit">
              Send message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
