import { useState } from "react";
import { useTranslation } from "react-i18next";
import { requestGeneralAnswer, type ChatMessage } from "../data/api";
import { languageOptions } from "../data/languages";

const GlobalAskWidget = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ask me anything. I can help with study topics, concepts, coding, and general questions."
    }
  ]);

  const languageLabel =
    languageOptions.find((option) => option.code === i18n.language)?.label || "English";

  const sendMessage = async () => {
    const question = input.trim();
    if (!question) return;

    const userMessage: ChatMessage = { role: "user", content: question };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const result = await requestGeneralAnswer({
        language: languageLabel,
        question,
        history: messages
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer || "I could not generate an answer right now."
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "The general AI assistant is temporarily unavailable."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open ? (
        <div className="global-ai-panel">
          <div className="global-ai-header">
            <div>
              <h3>Ask Anything AI</h3>
              <p>Open-ended help for any question.</p>
            </div>
            <button className="ghost-btn" onClick={() => setOpen(false)} aria-label="Close AI panel">
              Close
            </button>
          </div>

          <div className="chat-box">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
                <div className="chat-bubble">{message.content}</div>
              </div>
            ))}
          </div>

          <div className="global-ai-inputs">
            <textarea
              className="input"
              value={input}
              placeholder="Type any question here..."
              rows={3}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="btn btn-primary" onClick={sendMessage} disabled={loading}>
              {loading ? "Thinking..." : "Ask AI"}
            </button>
          </div>
        </div>
      ) : null}

      {!open ? (
        <button className="global-ai-launcher btn btn-primary" onClick={() => setOpen(true)}>
          Ask AI
        </button>
      ) : null}
    </>
  );
};

export default GlobalAskWidget;
