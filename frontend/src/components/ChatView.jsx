import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, Plus } from 'lucide-react';

export default function ChatView({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onCloseSession, 
  onCreateNewSession, 
  onSendMessage, 
  loading 
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    onSendMessage(userText);
  };

  return (
    <div className="chat-view">
      <div className="view-header">
        <h2 className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          PropGenie Assistant <Sparkles style={{ color: 'var(--color-primary)', width: '24px', height: '24px' }} />
        </h2>
      </div>

      <div className="chat-split-container">
        {/* Left Sessions Sidebar */}
        <div className="chat-sessions-sidebar">
          <div className="chat-sessions-header">
            <button 
              id="btn-sidebar-new-session" 
              className="primary-btn" 
              onClick={onCreateNewSession}
              style={{ padding: '8px 12px', fontSize: '0.85rem', width: '100%', justifyContent: 'center' }}
            >
              <Plus style={{ width: '14px', height: '14px' }} /> New Session
            </button>
          </div>
          
          <div className="chat-sessions-list">
            {sessions.map((sess) => (
              <div 
                key={sess.id}
                className={`chat-session-item ${sess.id === activeSessionId ? 'active' : ''}`}
                onClick={() => onSelectSession(sess.id)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                  {sess.title}
                </span>
                <button
                  id={`btn-close-session-${sess.id}`}
                  className="chat-session-close-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // prevent selecting the session when closing it
                    onCloseSession(sess.id);
                  }}
                  title="Close Session"
                >
                  <X style={{ width: '12px', height: '12px' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Main Chat Window */}
        <div className="chat-main-window">
          <div className="chat-messages" style={{ flexGrow: 1, padding: '24px', overflowY: 'auto' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-bubble ${msg.role}`} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div 
                  className="metric-icon-box" 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%',
                    background: msg.role === 'user' ? 'hsla(0, 0%, 100%, 0.15)' : 'var(--color-primary-glow)',
                    color: msg.role === 'user' ? 'white' : 'var(--color-primary)',
                    flexShrink: 0
                  }}
                >
                  {msg.role === 'user' ? <User style={{ width: '16px', height: '16px' }} /> : <Bot style={{ width: '16px', height: '16px' }} />}
                </div>
                <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble agent" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div 
                  className="metric-icon-box" 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%',
                    background: 'var(--color-primary-glow)',
                    color: 'var(--color-primary)',
                    flexShrink: 0
                  }}
                >
                  <Bot style={{ width: '16px', height: '16px' }} />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span className="dot" style={{ width: '8px', height: '8px', background: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                  <span className="dot" style={{ width: '8px', height: '8px', background: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both 0.2s' }}></span>
                  <span className="dot" style={{ width: '8px', height: '8px', background: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both 0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="chat-input-bar">
            <input
              id="chat-input"
              type="text"
              className="chat-text-input"
              placeholder="Type your command... (e.g. 'Log Rs 4,500 plumbing expense for Flat 3B')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="primary-btn" id="btn-send-chat" disabled={loading} style={{ padding: '0 20px' }}>
              <Send style={{ width: '16px', height: '16px' }} /> Send
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}
