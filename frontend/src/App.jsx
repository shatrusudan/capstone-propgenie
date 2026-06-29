import React, { useState, useEffect, useRef } from 'react';
import { Home, Users, Hammer, MessageSquare, Building2, RefreshCw, FileText, Scale, Activity } from 'lucide-react';
import DashboardView from './components/DashboardView';
import PropertiesView from './components/PropertiesView';
import TenantsView from './components/TenantsView';
import TicketsView from './components/TicketsView';
import ChatView from './components/ChatView';
import ContractsView from './components/ContractsView';
import LegalView from './components/LegalView';
import LogsView from './components/LogsView';

const API_BASE = 'http://localhost:8000';

const DEFAULT_GREETING = "Hi! I am PropGenie, your AI property management coordinator. Ask me to find overdue tenants, log rent payments, record repair expenses, or create maintenance tickets!";

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [legalPolicies, setLegalPolicies] = useState([]);
  const [evictions, setEvictions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Multi-Session Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [sessions, setSessions] = useState([
    {
      id: 'session_' + Date.now(),
      title: 'Session 1',
      messages: [
        {
          id: 1,
          role: 'agent',
          text: DEFAULT_GREETING
        }
      ]
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState(sessions[0].id);
  const [floatingInput, setFloatingInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const floatingMessagesEndRef = useRef(null);

  // Find active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const chatMessages = activeSession ? activeSession.messages : [];

  // Fetch all data from API endpoints
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProp, resTenant, resTicket, resFin, resContracts, resLegal, resLogs] = await Promise.all([
        fetch(`${API_BASE}/api/properties`).then(r => r.json()),
        fetch(`${API_BASE}/api/tenants`).then(r => r.json()),
        fetch(`${API_BASE}/api/tickets`).then(r => r.json()),
        fetch(`${API_BASE}/api/financials`).then(r => r.json()),
        fetch(`${API_BASE}/api/contracts`).then(r => r.json()),
        fetch(`${API_BASE}/api/legal`).then(r => r.json()),
        fetch(`${API_BASE}/api/audit-logs`).then(r => r.json())
      ]);

      if (resProp.status === 'success') setProperties(resProp.properties);
      if (resTenant.status === 'success') setTenants(resTenant.tenants);
      if (resTicket.status === 'success') setTickets(resTicket.tickets);
      if (resFin.status === 'success') setFinancials(resFin);
      if (resContracts.status === 'success') setContracts(resContracts.contracts);
      if (resLegal.status === 'success') {
        setLegalPolicies(resLegal.legal_policies);
        setEvictions(resLegal.evictions);
      }
      if (resLogs.status === 'success') setAuditLogs(resLogs.audit_logs);
    } catch (err) {
      console.error("Failed to fetch data from API server:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Scroll to bottom of floating chat when messages or loading changes
  useEffect(() => {
    if (chatOpen) {
      floatingMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading, chatOpen]);

  // CRUD Operations
  const handleAddProperty = async (propData) => {
    const res = await fetch(`${API_BASE}/api/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    fetchData();
    return data;
  };

  const handleAddTenant = async (tenantData) => {
    const res = await fetch(`${API_BASE}/api/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    fetchData();
    return data;
  };

  const handleSendReminder = async (tenantName) => {
    const promptText = `Send rent reminder notification to ${tenantName}`;
    handleSendMessage(promptText);
  };

  const handleCreateTicket = async (ticketData) => {
    const res = await fetch(`${API_BASE}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    fetchData();
    return data;
  };

  const handleUpdateTicket = async (updateData) => {
    const res = await fetch(`${API_BASE}/api/tickets/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    fetchData();
    return data;
  };

  // New Contract & Eviction Handlers
  const handleCreateContract = async (ctrData) => {
    const res = await fetch(`${API_BASE}/api/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ctrData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    fetchData();
    return data;
  };

  const handleSignContract = async (contractId) => {
    const res = await fetch(`${API_BASE}/api/contracts/${contractId}/sign`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    fetchData();
    return data;
  };

  const handleRenewContract = async (contractId, renewData) => {
    const res = await fetch(`${API_BASE}/api/contracts/${contractId}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renewData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    fetchData();
    return data;
  };

  const handleTerminateContract = async (contractId, terminateData) => {
    const res = await fetch(`${API_BASE}/api/contracts/${contractId}/terminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(terminateData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    fetchData();
    return data;
  };

  const handleUpdateEvictionMilestone = async (evictionId, updateData) => {
    const res = await fetch(`${API_BASE}/api/evictions/${evictionId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    fetchData();
    return data;
  };

  const handleRunAutoReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/automation/run-reminders`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.alerts_sent) {
        if (data.alerts_sent.length === 0) {
          alert("Automation Scan Complete: No tenants are currently overdue or have expiring leases (< 30 days remaining). No alerts needed.");
        } else {
          alert(`Automation scan complete! Sent alerts:\n\n${data.alerts_sent.join('\n')}`);
        }
      } else {
        alert("Failed to run reminders.");
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error executing automation pipeline.");
    } finally {
      setLoading(false);
    }
  };

  // Agent Chat Handler
  const handleSendMessage = async (userPrompt) => {
    const targetSessionId = activeSessionId;
    
    // 1. Append user message locally to this specific session
    setSessions(prev => prev.map(s => {
      if (s.id === targetSessionId) {
        const hasOnlyDefault = s.messages.length === 1 && s.messages[0].text === DEFAULT_GREETING;
        const newTitle = hasOnlyDefault
          ? userPrompt.substring(0, 20) + (userPrompt.length > 20 ? '...' : '')
          : s.title;

        return {
          ...s,
          title: newTitle,
          messages: [...s.messages, { id: Date.now(), role: 'user', text: userPrompt }]
        };
      }
      return s;
    }));
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userPrompt, session_id: targetSessionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');

      // 2. Append agent response locally to this specific session
      setSessions(prev => prev.map(s => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: [...s.messages, { id: Date.now() + 1, role: 'agent', text: data.response }]
          };
        }
        return s;
      }));

      // Refresh DB items in the background in case agent made CRUD updates
      fetchData();
      return data.response;
    } catch (err) {
      setSessions(prev => prev.map(s => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: [...s.messages, { id: Date.now() + 2, role: 'agent', text: "Error connecting to backend agents." }]
          };
        }
        return s;
      }));
      throw err;
    } finally {
      setChatLoading(false);
    }
  };

  const handleFloatingSend = (e) => {
    e.preventDefault();
    if (!floatingInput.trim() || chatLoading) return;

    const promptText = floatingInput;
    setFloatingInput('');
    handleSendMessage(promptText);
  };

  // Multi-Session Handlers
  const handleCreateNewSession = () => {
    const newId = 'session_' + Date.now();
    const newSession = {
      id: newId,
      title: `Session ${sessions.length + 1}`,
      messages: [
        {
          id: 1,
          role: 'agent',
          text: DEFAULT_GREETING
        }
      ]
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  const handleCloseSession = (idToClose) => {
    if (sessions.length === 1) {
      handleClearActiveSession();
      return;
    }

    const remaining = sessions.filter(s => s.id !== idToClose);
    setSessions(remaining);
    if (activeSessionId === idToClose) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const handleClearActiveSession = () => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: `Session ${sessions.indexOf(s) + 1}`,
          messages: [
            {
              id: 1,
              role: 'agent',
              text: DEFAULT_GREETING
            }
          ]
        };
      }
      return s;
    }));
  };

  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardView financials={financials} tenants={tenants} properties={properties} tickets={tickets} />;
      case 'properties':
        return <PropertiesView properties={properties} onAddProperty={handleAddProperty} />;
      case 'tenants':
        return <TenantsView tenants={tenants} properties={properties} onAddTenant={handleAddTenant} onSendReminder={handleSendReminder} />;
      case 'tickets':
        return <TicketsView tickets={tickets} tenants={tenants} onCreateTicket={handleCreateTicket} onUpdateTicket={handleUpdateTicket} />;
      case 'contracts':
        return (
          <ContractsView 
            contracts={contracts} 
            tenants={tenants} 
            properties={properties} 
            onCreateContract={handleCreateContract}
            onSignContract={handleSignContract}
            onRenewContract={handleRenewContract}
            onTerminateContract={handleTerminateContract}
          />
        );
      case 'legal':
        return (
          <LegalView 
            legalPolicies={legalPolicies} 
            evictions={evictions} 
            onUpdateEvictionMilestone={handleUpdateEvictionMilestone} 
          />
        );
      case 'logs':
        return (
          <LogsView 
            auditLogs={auditLogs} 
            loading={loading} 
            onRefresh={fetchData} 
          />
        );
      case 'chat':
        return (
          <ChatView 
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onCloseSession={handleCloseSession}
            onCreateNewSession={handleCreateNewSession}
            onSendMessage={handleSendMessage} 
            loading={chatLoading} 
          />
        );
      default:
        return <DashboardView financials={financials} tenants={tenants} properties={properties} tickets={tickets} />;
    }
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo-container">
            <Building2 className="brand-logo-icon" />
            <h1 className="brand-name">PropGenie</h1>
          </div>
          <span className="brand-subtitle">AI-Powered Property Management Agent</span>
        </div>

        <nav className="nav-menu">
          <button
            id="tab-overview"
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Home className="nav-item-icon" /> Overview
          </button>
          <button
            id="tab-properties"
            className={`nav-item ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            <Home className="nav-item-icon" /> Properties
          </button>
          <button
            id="tab-tenants"
            className={`nav-item ${activeTab === 'tenants' ? 'active' : ''}`}
            onClick={() => setActiveTab('tenants')}
          >
            <Users className="nav-item-icon" /> Tenants
          </button>
          <button
            id="tab-tickets"
            className={`nav-item ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <Hammer className="nav-item-icon" /> Tickets
          </button>
          <button
            id="tab-contracts"
            className={`nav-item ${activeTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contracts')}
          >
            <FileText className="nav-item-icon" /> Leases
          </button>
          <button
            id="tab-legal"
            className={`nav-item ${activeTab === 'legal' ? 'active' : ''}`}
            onClick={() => setActiveTab('legal')}
          >
            <Scale className="nav-item-icon" /> Legal & Eviction
          </button>
          <button
            id="tab-logs"
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <Activity className="nav-item-icon" /> Activity Feed
          </button>
          <button
            id="tab-chat"
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare className="nav-item-icon" /> PropGenie AI
          </button>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            id="btn-sync" 
            className="secondary-btn" 
            onClick={fetchData} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
          >
            <RefreshCw style={{ width: '14px', height: '14px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Sync Database
          </button>

          <button 
            id="btn-run-auto-reminders" 
            className="primary-btn" 
            onClick={handleRunAutoReminders} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '4px' }}
          >
            Run Auto Reminders
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {renderView()}
      </main>

      {/* Global Floating Chatbot Widget */}
      <div className="floating-chat-container">
        {chatOpen && (
          <div className="floating-chat-window">
            <div className="floating-chat-header">
              <div className="floating-chat-title">
                <Building2 style={{ width: '18px', height: '18px', color: 'var(--color-primary)' }} />
                <span>PropGenie Agent Quick Chat</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  id="btn-floating-clear" 
                  onClick={handleClearActiveSession} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                >
                  Clear
                </button>
                <button 
                  id="btn-floating-close" 
                  className="floating-chat-close-btn" 
                  onClick={() => setChatOpen(false)}
                  style={{ fontSize: '1.1rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="floating-chat-messages">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`floating-chat-bubble ${msg.role}`}>
                  <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="floating-chat-bubble agent" style={{ color: 'var(--text-muted)' }}>
                  typing...
                </div>
              )}
              <div ref={floatingMessagesEndRef} />
            </div>

            <form onSubmit={handleFloatingSend} className="floating-chat-input-bar">
              <input
                id="floating-chat-input"
                type="text"
                className="floating-chat-text-input"
                placeholder="Ask me anything..."
                value={floatingInput}
                onChange={(e) => setFloatingInput(e.target.value)}
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                className="primary-btn" 
                id="btn-floating-send" 
                disabled={chatLoading}
                style={{ padding: '0 12px', fontSize: '0.8rem' }}
              >
                Send
              </button>
            </form>
          </div>
        )}
        
        <button 
          id="btn-floating-toggle" 
          className="floating-chat-button" 
          onClick={() => setChatOpen(!chatOpen)}
        >
          <MessageSquare style={{ width: '24px', height: '24px' }} />
        </button>
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
