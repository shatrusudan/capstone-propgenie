import React from 'react';
import { ShieldCheck, Calendar, Wrench, DollarSign, Mail, FileText, Scale, RefreshCw } from 'lucide-react';

export default function LogsView({ auditLogs, loading, onRefresh }) {
  const getLogIcon = (action) => {
    const act = action.toUpperCase();
    if (act.includes('TICKET')) return <Wrench style={{ color: 'var(--color-primary)' }} />;
    if (act.includes('EXPENSE') || act.includes('RENT') || act.includes('PAYMENT')) return <DollarSign style={{ color: 'var(--color-primary)' }} />;
    if (act.includes('REMINDER') || act.includes('WHATSAPP') || act.includes('EMAIL')) return <Mail style={{ color: 'var(--color-primary)' }} />;
    if (act.includes('LEASE') || act.includes('CONTRACT')) return <FileText style={{ color: 'var(--color-primary)' }} />;
    if (act.includes('EVICTION') || act.includes('LEGAL') || act.includes('COURT')) return <Scale style={{ color: 'var(--color-primary)' }} />;
    return <ShieldCheck style={{ color: 'var(--color-primary)' }} />;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    try {
      const dt = new Date(ts);
      return dt.toLocaleString();
    } catch (e) {
      return ts;
    }
  };

  return (
    <div className="logs-view">
      <div className="view-header">
        <h2 className="view-title">PropGenie Activity Feed</h2>
        <button 
          id="btn-refresh-logs" 
          className="secondary-btn" 
          onClick={onRefresh}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw style={{ width: '14px', height: '14px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Feed
        </button>
      </div>

      <div className="card">
        <h3 className="section-title">Recent System & Agent Operations</h3>
        
        {auditLogs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No activities logged yet. Trigger some actions or chat with the agent to populate the feed!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {auditLogs.map((log, index) => (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  alignItems: 'flex-start',
                  padding: '16px', 
                  background: 'hsla(0, 0%, 100%, 0.02)', 
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px'
                }}
              >
                <div 
                  className="metric-icon-box"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: 'var(--color-primary-glow)',
                    flexShrink: 0
                  }}
                >
                  {getLogIcon(log.action)}
                </div>
                
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="badge warning" style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                      {log.action}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {log.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
