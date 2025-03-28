import "./App.css";
import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Input from "./components/Input";
import { createSupabaseClient } from "./api/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function App() {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleStoreDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log(url);

    try {
      setLoading(true);

      const convId = uuidv4();
      const docId = uuidv4();

      console.log("convId", convId);

      const supabase = createSupabaseClient();
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

      console.log("convId", convId);
      console.log("docId", docId);

      // 5. store document
      await fetch("http://localhost:8080/store-document", {
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
    } catch (error) {
      console.error("Error storing document:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="app-container">
      <h1>AI Chat with Youtube</h1>
      <form onSubmit={handleStoreDocument}>
        <Input
          type="text"
          placeholder="Enter a Youtube URL"
          value={url}
          onChange={setUrl}
        />
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? "Processing..." : "Submit"}
        </button>
      </form>
      {loading && <div className="loading-spinner">Loading...</div>}
    </div>
  );
}

export default App;
