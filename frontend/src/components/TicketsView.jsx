import React, { useState } from 'react';
import { Shield, Hammer, User, Plus, Check } from 'lucide-react';

export default function TicketsView({ tickets, tenants, onCreateTicket, onUpdateTicket }) {
  const [tenantName, setTenantName] = useState('');
  const [issue, setIssue] = useState('');
  const [error, setError] = useState('');

  const [assigningId, setAssigningId] = useState(null);
  const [vendorName, setVendorName] = useState('');
  const [ticketStatus, setTicketStatus] = useState('In Progress');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tenantName || !issue) {
      setError('All fields are required.');
      return;
    }
    setError('');
    onCreateTicket({ tenant_name: tenantName, issue })
      .then(() => {
        setTenantName('');
        setIssue('');
      })
      .catch((err) => setError(err.message || 'Failed to raise ticket.'));
  };

  const handleUpdateSubmit = (e, ticketId) => {
    e.preventDefault();
    if (!vendorName) return;
    onUpdateTicket({ ticket_id: ticketId, status: ticketStatus, vendor: vendorName })
      .then(() => {
        setAssigningId(null);
        setVendorName('');
      });
  };

  return (
    <div className="tickets-view">
      <div className="view-header">
        <h2 className="view-title">Maintenance Tickets</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
        {/* Tickets log */}
        <div className="table-card">
          <h3 className="table-title" style={{ marginBottom: '16px' }}>Tickets Log</h3>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Property</th>
                  <th>Tenant</th>
                  <th>Issue Details</th>
                  <th>Status</th>
                  <th>Vendor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No maintenance tickets reported.</td>
                  </tr>
                ) : (
                  tickets.map((tkt) => (
                    <tr key={tkt.id}>
                      <td style={{ fontWeight: 600 }}>{tkt.id}</td>
                      <td>{tkt.property}</td>
                      <td>{tkt.tenant_name}</td>
                      <td>{tkt.issue}</td>
                      <td>
                        <span className={`badge ${tkt.status === 'Open' ? 'open' : tkt.status === 'Closed' ? 'closed' : 'paid'}`}>
                          {tkt.status}
                        </span>
                      </td>
                      <td>{tkt.vendor}</td>
                      <td>
                        {tkt.status !== 'Closed' ? (
                          assigningId === tkt.id ? (
                            <form onSubmit={(e) => handleUpdateSubmit(e, tkt.id)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '0.8rem', width: '120px' }}
                                placeholder="Vendor name"
                                value={vendorName}
                                onChange={(e) => setVendorName(e.target.value)}
                              />
                              <select
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'hsla(224, 25%, 8%, 0.9)' }}
                                value={ticketStatus}
                                onChange={(e) => setTicketStatus(e.target.value)}
                              >
                                <option value="In Progress">In Progress</option>
                                <option value="Closed">Closed</option>
                              </select>
                              <button type="submit" id={`btn-save-tkt-${tkt.id}`} className="primary-btn" style={{ padding: '6px' }}>
                                <Check style={{ width: '12px', height: '12px' }} />
                              </button>
                            </form>
                          ) : (
                            <button
                              id={`btn-assign-${tkt.id}`}
                              className="secondary-btn"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => {
                                setAssigningId(tkt.id);
                                setVendorName(tkt.vendor !== 'Unassigned' ? tkt.vendor : '');
                                setTicketStatus(tkt.status);
                              }}
                            >
                              Assign / Update
                            </button>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Raise Ticket Form */}
        <div className="table-card">
          <h3 className="table-title" style={{ marginBottom: '16px' }}>Raise Ticket</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="ticket-tenant">Tenant Name</label>
              <select
                id="ticket-tenant"
                className="form-input"
                style={{ background: 'hsla(224, 25%, 8%, 0.9)' }}
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
              >
                <option value="">Select Tenant</option>
                {tenants.map((t, idx) => (
                  <option key={idx} value={t.name}>{t.name} ({t.property})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ticket-issue">Issue Description</label>
              <textarea
                id="ticket-issue"
                className="form-input"
                style={{ minHeight: '80px', fontFamily: 'inherit' }}
                placeholder="e.g. Broken faucet, toilet leaking..."
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </div>

            {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</div>}

            <button type="submit" className="primary-btn" id="btn-add-ticket" style={{ justifyContent: 'center', width: '100%' }}>
              <Plus style={{ width: '16px', height: '16px' }} /> Raise Issue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
