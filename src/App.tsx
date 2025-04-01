import "./App.css";
import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Input from "./components/Input";
import { supabase } from "./api/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const queryDocuement = async (
  query: string,
  conversationId: string,
  documentIds: string[]
) => {
  return await fetch(
    `http://${import.meta.env.VITE_API_IP}:8080/query-document`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        documentIds,
        conversationId,
      }),
    }
  );
};

function App() {
  const [url, setUrl] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const handleSendPrompt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userMessage: Message = { content: prompt, role: "user" };
    setMessages((prev) => [...prev, userMessage]);

    const assistantMessage: Message = { content: "", role: "assistant" };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const promptString = prompt.trim();
      setPrompt("");
      const res = await queryDocuement(
        promptString,
        conversationId,
        documentIds
      );

      const reader = res.body?.getReader();

      if (!reader) {
        console.error("Reader is not available");
        return;
      }

      const decoder = new TextDecoder();

      let done = false;
      let fullResponse = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.content) {
                fullResponse += data.content;
                setMessages((prev) => {
                  const updatedMessages = [...prev];
                  const lastMessage =
                    updatedMessages[updatedMessages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content = fullResponse;
                  }
                  return updatedMessages;
                });
              }
            } catch (error) {
              console.log("Error parsing line:", line);
            }
          }
        }
      }

      await supabase.from("conversation_messages").insert([
        {
          conversation_id: conversationId,
          role: "assistant",
          content: fullResponse,
        },
      ]);
    } catch (error) {
      console.log("Error sending prompt:", error);
    }
  };

  const handleStoreDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);

      const convId = uuidv4();
      const docId = uuidv4();

      // 2. Generate convesation
      await supabase.from("conversations").insert([
        {
          id: convId,
        },
      ]);

      // 3. generate document
      await supabase.from("documents").insert([
        {
          id: docId,
        },
      ]);

      // 4. link document to conversation
      await supabase.from("conversation_documents").insert([
        {
          conversation_id: convId,
          document_id: docId,
        },
      ]);

      // 5. store document
      await fetch(`http://${import.meta.env.VITE_API_IP}:8080/store-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          documentId: docId,
        }),
      });
      // 6. store message

      setConversationId(convId);
      setDocumentIds([docId]);
    } catch (error) {
      console.error("Error storing document:", error);
    } finally {
      setLoading(false);
    }
  };

  if (conversationId) {
    return (
      <div className="conversation-container">
        <h1>Chat with Youtube</h1>
        <p>URL: {url}</p>
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <strong>{message.role === "user" ? "You" : "Assistant"}:</strong>
              <div className="message-content">{message.content || "..."}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendPrompt} className="prompt-form">
          <Input
            type="text"
            placeholder="Ask question about the video"
            value={prompt}
            onChange={setPrompt}
          />
          <button
            type="submit"
            disabled={isStreaming || !prompt.trim()}
            className="submit-button"
          >
            {isStreaming ? "Processing..." : "Send"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1>AI Chat with YouTube</h1>
      <form onSubmit={handleStoreDocument}>
        <input
          type="text"
          placeholder="Drop a YouTube URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Submit"}
        </button>
      </form>
      {loading && <div className="loading-spinner">Loading...</div>}
    </div>
  );
}

export default App;
