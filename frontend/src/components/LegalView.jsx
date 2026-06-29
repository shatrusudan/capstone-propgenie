import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, Scale, DollarSign, Calendar } from 'lucide-react';

export default function LegalView({ 
  legalPolicies, 
  evictions, 
  onUpdateEvictionMilestone 
}) {
  const [updatingEvcId, setUpdatingEvcId] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [milestoneStatus, setMilestoneStatus] = useState('Completed');
  const [milestoneDate, setMilestoneDate] = useState('');

  const handleMilestoneUpdate = async (e, evcId) => {
    e.preventDefault();
    if (!selectedMilestone) return;

    try {
      await onUpdateEvictionMilestone(evcId, {
        milestone_name: selectedMilestone,
        status: milestoneStatus,
        date: milestoneDate || null
      });
      setUpdatingEvcId(null);
      setSelectedMilestone('');
      setMilestoneDate('');
    } catch (err) {
      alert('Failed to update milestone: ' + err.message);
    }
  };

  return (
    <div className="legal-view">
      <div className="view-header">
        <h2 className="view-title">Legal Protections & Court Proceedings</h2>
      </div>

      {/* Grid of Legal Policies & Coverage details */}
      <div className="metrics-grid" style={{ marginBottom: '32px' }}>
        {legalPolicies.length === 0 ? (
          <div className="metric-card">
            <h3 className="metric-title" style={{ color: 'var(--text-muted)' }}>No policies active</h3>
          </div>
        ) : (
          legalPolicies.map(pol => (
            <div key={pol.id} className="metric-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge success" style={{ marginBottom: '8px', display: 'inline-block' }}>{pol.status}</span>
                <h4 className="metric-value" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{pol.coverage_type}</h4>
                <p className="metric-title" style={{ fontSize: '0.82rem' }}>Property: {pol.property_name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="metric-title" style={{ display: 'block', fontSize: '0.75rem' }}>Coverage Limit</span>
                <span className="metric-value" style={{ color: 'var(--color-primary)' }}>₹{pol.coverage_limit?.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Eviction Proceedings and Milestones Dashboard */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Scale style={{ color: 'var(--color-primary)', width: '24px', height: '24px' }} />
          <h3 className="section-title" style={{ margin: 0 }}>CDMX Court Eviction Process Milestones</h3>
        </div>

        {evictions.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No eviction proceedings active. All tenants are compliant.
          </div>
        ) : (
          evictions.map(evc => (
            <div key={evc.id} style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'white' }}>
                    Eviction Proceeding: {evc.tenant_name} ({evc.property_name})
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Jurisdiction: <strong>{evc.court_name}</strong>
                  </span>
                </div>
                <button
                  id={`btn-update-milestone-toggle-${evc.id}`}
                  className="secondary-btn"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => setUpdatingEvcId(updatingEvcId === evc.id ? null : evc.id)}
                >
                  Update Milestone
                </button>
              </div>

              {/* Milestone update form */}
              {updatingEvcId === evc.id && (
                <div className="card" style={{ marginBottom: '20px', background: 'hsla(0, 0%, 100%, 0.05)', maxWidth: '500px' }}>
                  <form onSubmit={(e) => handleMilestoneUpdate(e, evc.id)} className="crud-form">
                    <div className="form-group">
                      <label>Select Milestone</label>
                      <select
                        id={`select-milestone-name-${evc.id}`}
                        value={selectedMilestone}
                        onChange={(e) => setSelectedMilestone(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Milestone --</option>
                        {evc.milestones.map(ms => (
                          <option key={ms.milestone} value={ms.milestone}>
                            {ms.milestone} ({ms.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Milestone Status</label>
                      <select
                        id={`select-milestone-status-${evc.id}`}
                        value={milestoneStatus}
                        onChange={(e) => setMilestoneStatus(e.target.value)}
                        required
                      >
                        <option value="Completed">Completed</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Execution Date (Optional)</label>
                      <input
                        id={`input-milestone-date-${evc.id}`}
                        type="date"
                        value={milestoneDate}
                        onChange={(e) => setMilestoneDate(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" id={`btn-milestone-submit-${evc.id}`} className="primary-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Save Milestone</button>
                      <button type="button" className="secondary-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setUpdatingEvcId(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Progress Stepper timeline */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', padding: '16px', background: 'hsla(0, 0%, 100%, 0.02)', borderRadius: '8px' }}>
                {evc.milestones.map((ms, index) => (
                  <div key={ms.milestone} style={{ flex: '1 1 150px', minWidth: '150px', textAlign: 'center', position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {/* Stepper Circle */}
                      <div 
                        className="metric-icon-box"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: ms.status === 'Completed' ? 'var(--color-primary-glow)' : 'hsla(0, 0%, 100%, 0.05)',
                          color: ms.status === 'Completed' ? 'var(--color-primary)' : 'var(--text-muted)',
                          marginBottom: '8px',
                          zIndex: 2
                        }}
                      >
                        {index + 1}
                      </div>

                      {/* Milestone Label */}
                      <span style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', color: ms.status === 'Completed' ? 'white' : 'var(--text-secondary)' }}>
                        {ms.milestone}
                      </span>
                      
                      {/* Status / Date */}
                      <span style={{ fontSize: '0.75rem', color: ms.status === 'Completed' ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                        {ms.status === 'Completed' ? `Done: ${ms.date}` : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
