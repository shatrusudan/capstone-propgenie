import React, { useState } from 'react';
import { FileText, FileSignature, CheckCircle, AlertTriangle, Play, Calendar, Trash2 } from 'lucide-react';

export default function ContractsView({ 
  contracts, 
  tenants, 
  properties, 
  onCreateContract, 
  onSignContract, 
  onRenewContract, 
  onTerminateContract 
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rentAmount, setRentAmount] = useState('');

  // Renewal state
  const [renewingId, setRenewingId] = useState(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [renewRent, setRenewRent] = useState('');

  // Termination state
  const [terminatingId, setTerminatingId] = useState(null);
  const [terminationDate, setTerminationDate] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!tenantName || !propertyName || !startDate || !endDate || !rentAmount) {
      setFormError('All fields are required.');
      return;
    }

    try {
      await onCreateContract({
        tenant_name: tenantName,
        property_name: propertyName,
        start_date: startDate,
        end_date: endDate,
        rent_amount: parseFloat(rentAmount)
      });
      setFormSuccess('Draft lease contract created successfully!');
      setTenantName('');
      setPropertyName('');
      setStartDate('');
      setEndDate('');
      setRentAmount('');
      setShowCreateForm(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create contract.');
    }
  };

  const handleSign = async (id) => {
    try {
      await onSignContract(id);
    } catch (err) {
      alert('Sign failed: ' + err.message);
    }
  };

  const handleRenewSubmit = async (e, id) => {
    e.preventDefault();
    if (!newEndDate || !renewRent) return;
    try {
      await onRenewContract(id, {
        new_end_date: newEndDate,
        rent_amount: parseFloat(renewRent)
      });
      setRenewingId(null);
      setNewEndDate('');
      setRenewRent('');
    } catch (err) {
      alert('Renew failed: ' + err.message);
    }
  };

  const handleTerminateSubmit = async (e, id) => {
    e.preventDefault();
    if (!terminationDate) return;
    try {
      await onTerminateContract(id, {
        termination_date: terminationDate
      });
      setTerminatingId(null);
      setTerminationDate('');
    } catch (err) {
      alert('Termination failed: ' + err.message);
    }
  };

  const getDaysLeftBadge = (ctr) => {
    if (ctr.status === 'Terminated' || ctr.status === 'Expired') return null;
    const days = ctr.days_left;
    if (days === null || days === undefined) return null;
    
    if (days <= 0) {
      return <span className="badge overdue">Expired</span>;
    } else if (days <= 30) {
      return <span className="badge overdue" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle style={{ width: '12px', height: '12px' }} /> {days} days left</span>;
    } else if (days <= 90) {
      return <span className="badge warning">{days} days left</span>;
    }
    return <span className="badge success">{days} days left</span>;
  };

  return (
    <div className="contracts-view">
      <div className="view-header">
        <h2 className="view-title">Contract & Lease Management</h2>
        <button 
          id="btn-add-contract-toggle" 
          className="primary-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'View Contracts' : 'Create Draft Lease'}
        </button>
      </div>

      {formError && <div className="alert alert-danger" style={{ marginBottom: '20px' }}>{formError}</div>}
      {formSuccess && <div className="alert alert-success" style={{ marginBottom: '20px' }}>{formSuccess}</div>}

      {showCreateForm ? (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3 className="section-title">New Lease Contract (Draft)</h3>
          <form onSubmit={handleCreate} className="crud-form">
            <div className="form-group">
              <label>Select Tenant</label>
              <select 
                id="select-ctr-tenant"
                value={tenantName} 
                onChange={(e) => setTenantName(e.target.value)}
              >
                <option value="">-- Choose Tenant --</option>
                {tenants.map(t => (
                  <option key={t.name} value={t.name}>{t.name} (Renting: {t.property})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select Property</label>
              <select 
                id="select-ctr-property"
                value={propertyName} 
                onChange={(e) => setPropertyName(e.target.value)}
              >
                <option value="">-- Choose Property --</option>
                {properties.map(p => (
                  <option key={p.name} value={p.name}>{p.name} - {p.address}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Start Date</label>
              <input 
                id="input-ctr-start-date"
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input 
                id="input-ctr-end-date"
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label>Monthly Rent (INR)</label>
              <input 
                id="input-ctr-rent"
                type="number" 
                placeholder="4500" 
                value={rentAmount} 
                onChange={(e) => setRentAmount(e.target.value)} 
              />
            </div>

            <button type="submit" className="primary-btn" id="btn-submit-contract">Create Draft Contract</button>
          </form>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contract ID</th>
                <th>Tenant Name</th>
                <th>Property</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Monthly Rent</th>
                <th>Status</th>
                <th>Alerts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No lease contracts recorded yet.
                  </td>
                </tr>
              ) : (
                contracts.map((ctr) => (
                  <tr key={ctr.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                        <FileText style={{ width: '16px', height: '16px', color: 'var(--color-primary)' }} />
                        {ctr.id}
                      </span>
                    </td>
                    <td>{ctr.tenant_name}</td>
                    <td>{ctr.property_name}</td>
                    <td>{ctr.start_date}</td>
                    <td>{ctr.end_date}</td>
                    <td>₹{ctr.rent_amount?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${
                        ctr.status === 'Active' ? 'success' :
                        ctr.status === 'Draft' ? 'warning' :
                        ctr.status === 'Expired' ? 'overdue' :
                        'muted'
                      }`}>
                        {ctr.status}
                      </span>
                    </td>
                    <td>{getDaysLeftBadge(ctr)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {ctr.status === 'Draft' && (
                          <button 
                            id={`btn-sign-${ctr.id}`}
                            className="primary-btn" 
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            onClick={() => handleSign(ctr.id)}
                          >
                            <FileSignature style={{ width: '12px', height: '12px', marginRight: '4px' }} /> Sign Lease
                          </button>
                        )}
                        {ctr.status === 'Active' && (
                          <>
                            <button 
                              id={`btn-renew-toggle-${ctr.id}`}
                              className="secondary-btn"
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                              onClick={() => {
                                setRenewingId(ctr.id);
                                setTerminatingId(null);
                              }}
                            >
                              Renew
                            </button>
                            <button 
                              id={`btn-terminate-toggle-${ctr.id}`}
                              className="secondary-btn"
                              style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--color-danger)', borderColor: 'hsla(0, 80%, 60%, 0.2)' }}
                              onClick={() => {
                                setTerminatingId(ctr.id);
                                setRenewingId(null);
                              }}
                            >
                              Terminate
                            </button>
                          </>
                        )}
                      </div>

                      {/* Renewal Popup/Overlay Form */}
                      {renewingId === ctr.id && (
                        <div className="card" style={{ marginTop: '12px', padding: '12px', background: 'hsla(0, 0%, 100%, 0.05)' }}>
                          <form onSubmit={(e) => handleRenewSubmit(e, ctr.id)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>New End Date</label>
                              <input 
                                id={`renew-end-${ctr.id}`}
                                type="date" 
                                required 
                                value={newEndDate} 
                                onChange={(e) => setNewEndDate(e.target.value)} 
                              />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>New Monthly Rent (INR)</label>
                              <input 
                                id={`renew-rent-${ctr.id}`}
                                type="number" 
                                required 
                                placeholder="Rent Amount" 
                                value={renewRent} 
                                onChange={(e) => setRenewRent(e.target.value)} 
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="submit" id={`btn-renew-submit-${ctr.id}`} className="primary-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Submit Renewal</button>
                              <button type="button" className="secondary-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setRenewingId(null)}>Cancel</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Termination Popup/Overlay Form */}
                      {terminatingId === ctr.id && (
                        <div className="card" style={{ marginTop: '12px', padding: '12px', background: 'hsla(0, 0%, 100%, 0.05)' }}>
                          <form onSubmit={(e) => handleTerminateSubmit(e, ctr.id)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Termination Date</label>
                              <input 
                                id={`terminate-date-${ctr.id}`}
                                type="date" 
                                required 
                                value={terminationDate} 
                                onChange={(e) => setTerminationDate(e.target.value)} 
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="submit" id={`btn-terminate-submit-${ctr.id}`} className="primary-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--color-danger)' }}>Confirm Termination</button>
                              <button type="button" className="secondary-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setTerminatingId(null)}>Cancel</button>
                            </div>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
