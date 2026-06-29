import React, { useState } from 'react';
import { Home, MapPin, User, Plus } from 'lucide-react';

export default function PropertiesView({ properties, onAddProperty }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [owner, setOwner] = useState('Mr. Property Owner');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !address || !owner) {
      setError('All fields are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    onAddProperty({ name, address, owner })
      .then(() => {
        setName('');
        setAddress('');
      })
      .catch((err) => setError(err.message || 'Failed to add property.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="properties-view">
      <div className="view-header">
        <h2 className="view-title">Properties</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start' }}>
        {/* Properties Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {properties.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No properties registered. Use the panel on the right to add a property.
            </div>
          ) : (
            properties.map((prop, idx) => (
              <div key={idx} className="metric-card" style={{ gap: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="metric-icon-box primary" style={{ width: '42px', height: '42px' }}>
                    <Home style={{ width: '20px', height: '20px' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>{prop.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: prop_{(idx + 1).toString().padStart(2, '0')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <MapPin style={{ width: '14px', height: '14px', color: 'var(--color-primary)' }} />
                    <span>{prop.address}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <User style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
                    <span>Owner: {prop.owner}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Property Card */}
        <div className="table-card">
          <h3 className="table-title" style={{ marginBottom: '16px' }}>Add Property</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prop-name">Property Name</label>
              <input
                id="prop-name"
                type="text"
                className="form-input"
                placeholder="e.g. Flat 3B or Flat 101"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="prop-address">Address</label>
              <input
                id="prop-address"
                type="text"
                className="form-input"
                placeholder="e.g. Orchid Heights, Sector 45"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prop-owner">Owner Name</label>
              <input
                id="prop-owner"
                type="text"
                className="form-input"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </div>

            {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</div>}

            <button 
              type="submit" 
              className="primary-btn" 
              id="btn-add-property" 
              style={{ justifyContent: 'center', width: '100%' }}
              disabled={submitting}
            >
              <Plus style={{ width: '16px', height: '16px' }} /> 
              {submitting ? 'Adding...' : 'Add Property'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
