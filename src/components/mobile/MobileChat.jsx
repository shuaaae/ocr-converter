/**
 * MobileChat - Intelligent AI Chat Assistant for Owlens
 * 
 * Features:
 * - Retrieves and searches through scanned documents stored in localStorage
 * - Provides intelligent responses about user's scanning history
 * - Answers questions about specific document fields and data
 * - Supports both English and Filipino languages
 * - Includes drag-to-close help modal
 * 
 * The AI can:
 * - List all scanned documents
 * - Search for specific documents by content or type
 * - Retrieve data from user's scans
 * - Provide summaries and insights
 * 
 * Example queries:
 * - "Show me my recent scans"
 * - "Find documents with [name/id/field]"
 * - "How many documents have I scanned?"
 * - "What documents did I scan today?"
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, HelpCircle, Send, X } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function MobileChat({ active, onClose, language = 'english' }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const history = useRef([]);
  const sending = useRef(false);
  const conversation = useRef(null);

  // System instruction based on language
  const systemInstruction = language === 'filipino' 
    ? `Ikaw ay isang matulungin at magalang na assistant para sa Owlens - isang document scanning app. 
       Kaya mong tumulong sa mga user na:
       - Maghanap ng scanned documents
       - Mag-retrieve ng impormasyon mula sa kanilang scanned data
       - Sumagot ng mga tanong tungkol sa kanilang scanning history
       - Magbigay ng summary ng kanilang mga dokumento
       
       Gawing simple at malinaw ang iyong mga sagot. Kung walang naka-save na dokumento, mag-suggest na mag-scan muna sila.`
    : `You are a helpful and intelligent assistant for Owlens - a document scanning application.
       You help users by:
       - Searching through their scanned documents
       - Retrieving specific information from their saved scans
       - Answering questions about their scanning history
       - Providing summaries and insights about their documents
       
       When users ask about their documents, search through the available scans and provide relevant information.
       If no documents are found, suggest they scan some documents first.
       Keep your answers clear, concise, and helpful.`;

  // Get scanned documents from localStorage
  const getScannedDocuments = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('ocrScans') || '[]');
      return Array.isArray(saved) ? saved.filter(scan => scan && scan.data && Number.isFinite(scan.timestamp)) : [];
    } catch {
      return [];
    }
  };

  // Search documents based on query
  const searchDocuments = (query) => {
    const scans = getScannedDocuments();
    const lowerQuery = query.toLowerCase();
    
    return scans.filter(scan => {
      // Search in document type
      if (scan.documentType?.toLowerCase().includes(lowerQuery)) return true;
      
      // Search in document data (all fields)
      const dataStr = JSON.stringify(scan.data).toLowerCase();
      if (dataStr.includes(lowerQuery)) return true;
      
      return false;
    });
  };

  // Create context about user's documents
  const getDocumentContext = () => {
    const scans = getScannedDocuments();
    if (scans.length === 0) return 'No documents have been scanned yet.';
    
    const summary = scans.map((scan, index) => {
      const date = new Date(scan.timestamp).toLocaleDateString();
      const type = scan.documentType || 'Document';
      const fields = Object.keys(scan.data || {}).join(', ');
      return `${index + 1}. ${type} (scanned on ${date}) - Fields: ${fields}`;
    }).join('\n');
    
    return `User has ${scans.length} scanned document(s):\n${summary}`;
  };

  useEffect(() => {
    if (active && conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [active, messages, loading]);

  const handleDragStart = (e) => {
    const touch = e.touches?.[0] || e;
    setDragStart(touch.clientY);
  };

  const handleDragMove = (e) => {
    if (dragStart === null) return;
    const touch = e.touches?.[0] || e;
    const offset = Math.max(0, touch.clientY - dragStart);
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (dragOffset > 100) {
      setShowHelp(false);
    }
    setDragStart(null);
    setDragOffset(0);
  };

  const closeHelp = () => {
    setShowHelp(false);
    setDragStart(null);
    setDragOffset(0);
  };

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
      
      // Analyze if user is asking about their documents
      const documentKeywords = ['scan', 'document', 'show', 'find', 'search', 'recent', 'history', 'data', 'retrieve', 'get', 'list', 'my'];
      const isDocumentQuery = documentKeywords.some(keyword => text.toLowerCase().includes(keyword));
      
      let contextMessage = '';
      let documentResults = [];
      
      if (isDocumentQuery) {
        // Get document context
        const scans = getScannedDocuments();
        
        if (scans.length > 0) {
          // Search for specific documents if query seems specific
          documentResults = searchDocuments(text);
          
          if (documentResults.length > 0 && documentResults.length < scans.length) {
            // Found specific matches
            contextMessage = `\n\nRelevant documents found (${documentResults.length}):\n` + 
              documentResults.map((scan, i) => {
                const date = new Date(scan.timestamp).toLocaleDateString();
                const type = scan.documentType || 'Document';
                const preview = JSON.stringify(scan.data).slice(0, 200);
                return `${i + 1}. ${type} (${date}): ${preview}...`;
              }).join('\n');
          } else {
            // Show all documents
            contextMessage = `\n\n${getDocumentContext()}`;
          }
        } else {
          contextMessage = '\n\nThe user has no scanned documents yet. Suggest they use the Scan feature to add documents.';
        }
      }
      
      const enhancedText = text + contextMessage;
      
      const model = new GoogleGenerativeAI(key).getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: systemInstruction
      });
      
      const chat = model.startChat({ 
        history: history.current, 
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 } 
      });
      
      const result = await chat.sendMessage(enhancedText);
      const reply = result.response.text().trim();
      
      if (!reply) throw new Error('Empty response');
      
      // Update history with original text (not enhanced)
      history.current = [
        ...history.current, 
        { role: 'user', parts: [{ text }] }, 
        { role: 'model', parts: [{ text: reply }] }
      ];
      
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
    <header className="mobile-chat-heading">
      <button className="mobile-icon-button" aria-label="Back to home" onClick={onClose}><ArrowLeft size={23} /></button>
      <div style={{ flex: 1, textAlign: 'center' }}><h1>Chat</h1><p>Your AI assistant</p></div>
      <button className="mobile-icon-button" aria-label="Help" onClick={() => setShowHelp(true)}><HelpCircle size={24} /></button>
    </header>

    {/* Help Modal */}
    {showHelp && <div className="mobile-help-overlay" onClick={closeHelp}>
      <div 
        className="mobile-help-sheet" 
        onClick={e => e.stopPropagation()}
        style={{ transform: `translateY(${dragOffset}px)`, transition: dragStart !== null ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div 
          className="mobile-help-handle-area"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div className="mobile-help-handle"></div>
        </div>
        <header className="mobile-help-sheet-header">
          <div>
            <h2>Help <span className="mobile-help-beta">BETA</span></h2>
            <p>Type naturally. Owlens can answer questions about your scanned documents, help you retrieve data, and track your scanning history.</p>
          </div>
          <button className="mobile-help-close" aria-label="Close help" onClick={closeHelp}>
            <X size={22} />
          </button>
        </header>
        
        <div className="mobile-help-sheet-content">
          <div className="mobile-help-section">
            <h3>What chat can do</h3>
            
            <div className="mobile-help-item">
              <strong>Track scanned data</strong>
              <p>Owlens can keep track of all your scanned documents, extracted information, and help you organize them efficiently.</p>
            </div>

            <div className="mobile-help-item">
              <strong>Search and retrieve documents</strong>
              <p>Find specific information from your scanned documents using natural language. Ask about any document you've scanned before.</p>
            </div>

            <div className="mobile-help-item">
              <strong>Review scanning history</strong>
              <p>Access your scan history with detailed information, so you can review extracted data and check the details anytime.</p>
            </div>

            <div className="mobile-help-item">
              <strong>Ask document questions</strong>
              <p>You can ask about specific fields, search for documents by content, or get summaries of your scanned data collection.</p>
            </div>
          </div>

          <button className="mobile-help-cancel" onClick={closeHelp}>Cancel</button>
        </div>
      </div>
    </div>}

    <div ref={conversation} className="mobile-chat-conversation" role="log" aria-label="Conversation" aria-live="polite">
      {messages.length === 0 && <div className="mobile-empty mobile-chat-empty">
        <img src="/owlchat.png" alt="Chat owl assistant" className="mobile-mascot-chat" />
        <h3>A little help, right here.</h3>
      </div>}
      {messages.map((message, index) => <article key={index} className={`mobile-chat-message ${message.role}`}>
        {message.role === 'assistant' && <img src="/owlchat.png" alt="Owl" className="mobile-chat-avatar" />}
        <div>
          <span>{message.role === 'user' ? 'You' : 'Owl'}</span>
          <p>{message.text}</p>
        </div>
      </article>)}
      {loading && <p className="mobile-chat-thinking" role="status">Thinking…</p>}
    </div>
    {error && <p className="mobile-error" role="alert">{error}</p>}
    <form className="mobile-chat-composer" onSubmit={send}>
      <input aria-label="Message your assistant" placeholder="Ask anything…" value={draft} disabled={loading} onChange={event => setDraft(event.target.value)} maxLength={4000} />
      <button type="submit" aria-label="Send message" disabled={loading || !draft.trim()}><Send size={20} /></button>
    </form>
  </section>;
}
