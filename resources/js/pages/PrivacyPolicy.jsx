import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <Flame size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              Cylinder<span style={{ color: 'var(--primary)' }}>Hub</span>
            </h1>
            <p className="dim" style={{ fontSize: 12, margin: 0 }}>Business Management Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 40px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 0, marginBottom: 4 }}>Privacy Policy</h2>
          <p className="dim" style={{ fontSize: 13, marginBottom: 28 }}>Last updated: June 6, 2026</p>

          <Section title="1. Introduction">
            <p>CylinderHub ("we", "our", or "us") operates a business management platform for LPG cylinder distribution businesses. This Privacy Policy explains how we collect, use, and protect information when you use our platform.</p>
            <p>By accessing or using CylinderHub, you agree to the terms of this Privacy Policy.</p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect information that is necessary to provide our service:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, phone number, and role (admin or salesman) provided at account creation.</li>
              <li><strong>Business Data:</strong> Sales records, customer information, allocation records, payment data, and inventory data entered by users.</li>
              <li><strong>Usage Data:</strong> Login timestamps, actions taken within the platform, and IP addresses for security purposes.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and session data for authentication and troubleshooting.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use collected information solely to:</p>
            <ul>
              <li>Provide, operate, and maintain the CylinderHub platform.</li>
              <li>Authenticate users and maintain session security.</li>
              <li>Generate business reports and analytics for your organization.</li>
              <li>Send system notifications relevant to your role (e.g. unreconciled allocation reminders).</li>
              <li>Troubleshoot technical issues and improve platform stability.</li>
              <li>Comply with applicable legal obligations.</li>
            </ul>
          </Section>

          <Section title="4. Data Sharing">
            <p>We do not sell, trade, or rent your personal information to third parties. We may share data only in the following limited circumstances:</p>
            <ul>
              <li><strong>Within your organization:</strong> Admins can view all salesman activity and data within their account.</li>
              <li><strong>Service providers:</strong> Trusted infrastructure providers (hosting, database) who operate under strict confidentiality agreements.</li>
              <li><strong>Legal requirements:</strong> If required by law, court order, or government authority.</li>
            </ul>
          </Section>

          <Section title="5. Data Storage and Security">
            <p>All data is stored on secure servers. We implement industry-standard security measures including:</p>
            <ul>
              <li>HTTPS encryption for all data in transit.</li>
              <li>Secure token-based authentication (short-lived access tokens + refresh tokens).</li>
              <li>Role-based access control — salesmen can only access their own data.</li>
              <li>Audit logs for all significant actions within the platform.</li>
            </ul>
            <p>While we take reasonable precautions, no system is completely secure. You are responsible for keeping your login credentials confidential.</p>
          </Section>

          <Section title="6. Data Retention">
            <p>We retain your business data for as long as your account is active or as required by your organization's needs. Sales records, allocation history, and audit logs are retained for a minimum of 2 years to support business reporting and compliance. You may request deletion of your account by contacting your system administrator.</p>
          </Section>

          <Section title="7. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>Access personal information we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Object to certain processing of your data.</li>
            </ul>
            <p>To exercise these rights, contact your organization's account administrator.</p>
          </Section>

          <Section title="8. Cookies and Local Storage">
            <p>CylinderHub uses browser local storage to maintain your authentication session (access token and refresh token). These are essential for the platform to function and are cleared upon logout. We do not use tracking cookies or advertising cookies.</p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. Changes will be reflected by updating the "Last updated" date above. Continued use of the platform after changes constitutes acceptance of the revised policy.</p>
          </Section>

          <Section title="10. Contact">
            <p>If you have any questions about this Privacy Policy, please contact your organization's CylinderHub administrator or reach out to us through the platform's support channel.</p>
          </Section>
        </div>

        {/* Back link */}
        <button
          onClick={() => navigate('/login')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 14, fontWeight: 500, marginTop: 24, padding: 0 }}
        >
          <ArrowLeft size={15} />
          Back to Login
        </button>

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, marginTop: 0, color: 'var(--text)' }}>{title}</h3>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)' }}>{children}</div>
    </div>
  );
}
