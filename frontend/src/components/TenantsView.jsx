import React, { useState } from 'react';
import { Users, Mail, Phone, Home, DollarSign, Send, UserPlus } from 'lucide-react';

export default function TenantsView({ tenants, properties, onAddTenant, onSendReminder }) {
  const [name, setName] = useState('');
  const [selectedProp, setSelectedProp] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rent, setRent] = useState('');
  const [status, setStatus] = useState('Overdue');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reminderStatus, setReminderStatus] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !selectedProp || !phone || !email || !rent) {
      setError('All fields are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    onAddTenant({
      name,
      property: selectedProp,
      phone,
      email,
      rent_amount: parseFloat(rent),
      status
    })
      .then(() => {
        setName('');
        setPhone('');
        setEmail('');
        setRent('');
        setSelectedProp('');
      })
      .catch((err) => setError(err.message || 'Failed to register tenant.'))
      .finally(() => setSubmitting(false));
  };

  const handleReminder = (tenantName) => {
    setReminderStatus(prev => ({ ...prev, [tenantName]: 'Sending...' }));
    onSendReminder(tenantName)
      .then(() => {
        setReminderStatus(prev => ({ ...prev, [tenantName]: 'Reminder Sent!' }));
        setTimeout(() => {
          setReminderStatus(prev => ({ ...prev, [tenantName]: null }));
        }, 3000);
      })
      .catch(() => {
        setReminderStatus(prev => ({ ...prev, [tenantName]: 'Failed' }));
      });
  };

  return (
    <div className="tenants-view">
      <div className="view-header">
        <h2 className="view-title">Tenants Directory</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
        {/* Tenants Table */}
        <div className="table-card">
          <div className="table-header-row">
            <h3 className="table-title">Registered Tenants</h3>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tenant Name</th>
                  <th>Property</th>
                  <th>Contact Info</th>
                  <th>Rent</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No tenants registered.</td>
                  </tr>
                ) : (
                  tenants.map((tenant, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tenant.name}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Home style={{ width: '14px', height: '14px', color: 'var(--color-primary)' }} />
                          <span>{tenant.property}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone style={{ width: '12px', height: '12px' }} /> {tenant.phone}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail style={{ width: '12px', height: '12px' }} /> {tenant.email}
                          </span>
                        </div>
                      </td>
                      <td>₹{tenant.rent_amount.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge ${tenant.status.toLowerCase() === 'paid' ? 'paid' : 'overdue'}`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td>
                        {tenant.status === 'Overdue' ? (
                          <button
                            id={`btn-remind-${tenant.name.replace(/\s+/g, '-').toLowerCase()}`}
                            onClick={() => handleReminder(tenant.name)}
                            disabled={reminderStatus[tenant.name] === 'Sending...'}
                            className="secondary-btn"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Send style={{ width: '12px', height: '12px' }} />
                            {reminderStatus[tenant.name] || 'Remind'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Register Tenant Form Card */}
        <div className="table-card">
          <h3 className="table-title" style={{ marginBottom: '16px' }}>Register Tenant</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="tenant-name">Full Name</label>
              <input
                id="tenant-name"
                type="text"
                className="form-input"
                placeholder="e.g. Priya Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tenant-property">Assigned Property</label>
              <select
                id="tenant-property"
                className="form-input"
                style={{ background: 'hsla(224, 25%, 8%, 0.9)' }}
                value={selectedProp}
                onChange={(e) => setSelectedProp(e.target.value)}
              >
                <option value="">Select Property</option>
                {properties.map((p, idx) => (
                  <option key={idx} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tenant-phone">Phone Number</label>
              <input
                id="tenant-phone"
                type="text"
                className="form-input"
                placeholder="e.g. +919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tenant-email">Email Address</label>
              <input
                id="tenant-email"
                type="email"
                className="form-input"
                placeholder="e.g. priya@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tenant-rent">Rent Amount (₹)</label>
              <input
                id="tenant-rent"
                type="number"
                className="form-input"
                placeholder="e.g. 6000"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tenant-status">Rent Status</label>
              <select
                id="tenant-status"
                className="form-input"
                style={{ background: 'hsla(224, 25%, 8%, 0.9)' }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Overdue">Overdue</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</div>}

            <button 
              type="submit" 
              className="primary-btn" 
              id="btn-add-tenant" 
              style={{ justifyContent: 'center', width: '100%' }}
              disabled={submitting}
            >
              <UserPlus style={{ width: '16px', height: '16px' }} /> 
              {submitting ? 'Registering...' : 'Register Tenant'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
