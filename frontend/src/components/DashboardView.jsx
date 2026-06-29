import React from 'react';
import { IndianRupee, TrendingUp, TrendingDown, Users, AlertCircle } from 'lucide-react';

export default function DashboardView({ financials, tenants, properties, tickets }) {
  const summary = financials?.financial_summary || { total_revenue: 0, total_expenses: 0, net_p_and_l: 0 };
  const revenueList = financials?.revenue_transactions || [];
  const expenseList = financials?.expense_transactions || [];
  const ticketList = tickets || [];

  const totalProps = properties?.length || 0;
  const totalTenants = tenants?.length || 0;
  const occupancyRate = totalProps > 0 ? Math.round((totalTenants / totalProps) * 100) : 0;
  const openTickets = ticketList.filter(t => t.status === 'Open').length;

  return (
    <div className="dashboard-view">
      <div className="view-header">
        <h2 className="view-title">Overview</h2>
      </div>

      {/* Metrics Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card" id="card-revenue">
          <div className="metric-header">
            <span>Total Revenue</span>
            <div className="metric-icon-box success">
              <IndianRupee className="nav-item-icon" />
            </div>
          </div>
          <div className="metric-value">₹{summary.total_revenue.toLocaleString('en-IN')}</div>
        </div>

        <div className="metric-card" id="card-expenses">
          <div className="metric-header">
            <span>Total Expenses</span>
            <div className="metric-icon-box danger">
              <IndianRupee className="nav-item-icon" />
            </div>
          </div>
          <div className="metric-value">₹{summary.total_expenses.toLocaleString('en-IN')}</div>
        </div>

        <div className="metric-card" id="card-pnl">
          <div className="metric-header">
            <span>Net P&L</span>
            <div className="metric-icon-box primary">
              {summary.net_p_and_l >= 0 ? <TrendingUp className="nav-item-icon" /> : <TrendingDown className="nav-item-icon" />}
            </div>
          </div>
          <div className={`metric-value ${summary.net_p_and_l >= 0 ? 'text-success' : 'text-danger'}`} style={{ color: summary.net_p_and_l >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            ₹{summary.net_p_and_l.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="metric-card" id="card-occupancy">
          <div className="metric-header">
            <span>Occupancy</span>
            <div className="metric-icon-box primary">
              <Users className="nav-item-icon" />
            </div>
          </div>
          <div className="metric-value">{occupancyRate}% <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>({totalTenants}/{totalProps})</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Recent Rent Payments */}
        <div className="table-card">
          <div className="table-header-row">
            <h3 className="table-title">Recent Payments</h3>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {revenueList.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No payment records found.</td>
                  </tr>
                ) : (
                  revenueList.map(pay => (
                    <tr key={pay.id}>
                      <td>{pay.tenant_name}</td>
                      <td>{pay.property}</td>
                      <td>₹{pay.amount.toLocaleString('en-IN')}</td>
                      <td>{pay.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Expenses */}
        <div className="table-card">
          <div className="table-header-row">
            <h3 className="table-title">Operational Expenses</h3>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenseList.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No expenses recorded.</td>
                  </tr>
                ) : (
                  expenseList.map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.property}</td>
                      <td><span style={{ textTransform: 'capitalize' }}>{exp.category}</span></td>
                      <td>{exp.description}</td>
                      <td style={{ color: 'var(--color-danger)' }}>₹{exp.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Maintenance Overview */}
      <div className="table-card" style={{ marginTop: '16px' }}>
        <div className="table-header-row">
          <h3 className="table-title">Active Maintenance Issues</h3>
          {openTickets > 0 && (
            <span className="badge overdue" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle style={{ width: '12px', height: '12px' }} /> {openTickets} Open Issues
            </span>
          )}
        </div>
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Tenant</th>
                <th>Issue Reported</th>
                <th>Status</th>
                <th>Assigned Vendor</th>
              </tr>
            </thead>
            <tbody>
              {ticketList.filter(t => t.status !== 'Closed').length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>All issues resolved! No open tickets.</td>
                </tr>
              ) : (
                ticketList.filter(t => t.status !== 'Closed').map(tkt => (
                  <tr key={tkt.id}>
                    <td>{tkt.property}</td>
                    <td>{tkt.tenant_name}</td>
                    <td>{tkt.issue}</td>
                    <td>
                      <span className={`badge ${tkt.status === 'Open' ? 'open' : 'closed'}`} style={{ background: tkt.status === 'Open' ? 'var(--color-primary-glow)' : 'var(--color-success-glow)', color: tkt.status === 'Open' ? 'var(--color-primary)' : 'var(--color-success)', border: 'none' }}>
                        {tkt.status}
                      </span>
                    </td>
                    <td>{tkt.vendor}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
