import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function MobileChat({ active, onClose }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const history = useRef([]);
  const sending = useRef(false);
  const conversation = useRef(null);

  useEffect(() => {
    if (active && conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [active, messages, loading]);

  const send = async event => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending.current) return;
    sending.current = true;
    setLoading(true);
    setError('');
    setDraft('');
    setMessages(previous => [...previous, { role: 'user', text }]);
    try {
      const key = import.meta.env.VITE_GEMINI_API_KEY?.trim();
      if (!key) throw new Error('Chat is not configured yet.');
      const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const chat = model.startChat({ history: history.current, generationConfig: { temperature: 0.7, maxOutputTokens: 600 } });
      const result = await chat.sendMessage(text);
      const reply = result.response.text().trim();
      if (!reply) throw new Error('Empty response');
      history.current = [...history.current, { role: 'user', parts: [{ text }] }, { role: 'model', parts: [{ text: reply }] }];
      setMessages(previous => [...previous, { role: 'assistant', text: reply }]);
    } catch {
      setError('Could not get a reply. Your message is below so you can try again.');
      setDraft(text);
    } finally {
      sending.current = false;
      setLoading(false);
    }
  };

  return <section className="mobile-chat" hidden={!active} aria-label="AI chat">
    <header className="mobile-chat-heading"><button className="mobile-icon-button" aria-label="Back to home" onClick={onClose}><ArrowLeft size={23} /></button><div><h1>Chat</h1><p>Your AI assistant</p></div><span className="mobile-icon-tile"><MessageCircle size={24} /></span></header>
    <div ref={conversation} className="mobile-chat-conversation" role="log" aria-label="Conversation" aria-live="polite">
      {messages.length === 0 && <div className="mobile-empty"><span className="mobile-empty-icon"><MessageCircle size={32} /></span><h3>A little help, right here.</h3><p>Ask a question to get started. Your scanned documents are not attached to this chat.</p></div>}
      {messages.map((message, index) => <article key={index} className={`mobile-chat-message ${message.role}`}><span>{message.role === 'user' ? 'You' : 'Assistant'}</span><p>{message.text}</p></article>)}
      {loading && <p className="mobile-chat-thinking" role="status">Thinking…</p>}
    </div>
    {error && <p className="mobile-error" role="alert">{error}</p>}
    <form className="mobile-chat-composer" onSubmit={send}><input aria-label="Message your assistant" placeholder="Ask anything…" value={draft} disabled={loading} onChange={event => setDraft(event.target.value)} maxLength={4000} /><button type="submit" aria-label="Send message" disabled={loading || !draft.trim()}><Send size={20} /></button></form>
  </section>;
}
