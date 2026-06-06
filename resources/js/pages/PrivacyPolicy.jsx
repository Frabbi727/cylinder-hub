import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ArrowLeft, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const CONTACT  = 'dorstit@gmail.com';
  const APP_NAME = 'CylinderHub Salesman';
  const UPDATED  = 'June 6, 2026';

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'24px 16px' }}>
      <div style={{ maxWidth:740, margin:'0 auto' }}>

        {/* Brand header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>
            <Flame size={20} />
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>Cylinder<span style={{ color:'var(--primary)' }}>Hub</span></div>
            <div className="dim" style={{ fontSize:12 }}>Salesman App</div>
          </div>
        </div>

        <div className="card" style={{ padding:'36px 40px' }}>

          {/* Title */}
          <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 6px' }}>Privacy Policy</h1>
          <p className="dim" style={{ fontSize:13, margin:'0 0 8px' }}>Effective date: {UPDATED}</p>
          <p className="dim" style={{ fontSize:13, margin:'0 0 32px' }}>
            This policy applies to the <strong>{APP_NAME}</strong> mobile application ("App") available on the Google Play Store.
          </p>

          <Section title="1. Who We Are">
            <p>
              <strong>CylinderHub</strong> operates the {APP_NAME} mobile application, a business tool
              designed for salesman employees of LPG cylinder distribution companies. The App is
              provided to authorized users by their employer (the business account holder).
            </p>
            <p>
              For any privacy-related questions or concerns, contact us at:{' '}
              <a href={`mailto:${CONTACT}`} style={{ color:'var(--primary)' }}>{CONTACT}</a>
            </p>
          </Section>

          <Section title="2. What Information We Collect">
            <p>We collect only the information necessary to operate the App:</p>
            <SubTitle>2.1 Account Information</SubTitle>
            <ul>
              <li>Name, email address, and phone number (provided by your employer at account creation)</li>
              <li>Role identifier (salesman)</li>
              <li>Avatar initials generated from your name</li>
            </ul>
            <SubTitle>2.2 Business Activity Data</SubTitle>
            <ul>
              <li>Sales records you create (customer, items, amount, payment type)</li>
              <li>Customer information you add (name, phone, address)</li>
              <li>Due payment collections you record</li>
              <li>Empty cylinder return logs</li>
              <li>End-of-Day (EOD) reconciliation submissions</li>
            </ul>
            <SubTitle>2.3 Device &amp; Technical Data</SubTitle>
            <ul>
              <li>Authentication tokens stored securely on your device (via Android Keystore / SecureStore)</li>
              <li>IP address and request timestamps for security audit purposes</li>
              <li>App version and operating system version for troubleshooting</li>
            </ul>
            <SubTitle>2.4 What We Do NOT Collect</SubTitle>
            <ul>
              <li>Location / GPS data — the App does not request or use location permissions</li>
              <li>Camera or microphone — the App does not access these</li>
              <li>Contacts from your phone — the App does not read your device contacts</li>
              <li>Any data from outside the App</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>Information collected is used exclusively for:</p>
            <ul>
              <li>Authenticating you and maintaining your secure session</li>
              <li>Displaying your daily allocations, sales, and EOD reconciliation data</li>
              <li>Enabling your employer (admin) to track business operations</li>
              <li>Generating sales reports and performance summaries for your account</li>
              <li>Sending in-app notifications relevant to your role (e.g. unreconciled allocation reminders)</li>
              <li>Troubleshooting technical issues</li>
            </ul>
            <p>We do not use your data for advertising, profiling, or any purpose outside your employer's business operations.</p>
          </Section>

          <Section title="4. How We Share Your Information">
            <p>We do not sell, rent, or trade your personal information. Data is shared only in these cases:</p>
            <ul>
              <li>
                <strong>With your employer:</strong> Admins of your organization can view your sales activity,
                allocations, EOD submissions, and performance data. This is the intended purpose of the App.
              </li>
              <li>
                <strong>Infrastructure providers:</strong> Our hosting and database providers store your data
                under strict confidentiality agreements and do not have rights to use it independently.
              </li>
              <li>
                <strong>Legal requirements:</strong> We may disclose data if required by law, regulation,
                court order, or governmental authority.
              </li>
            </ul>
          </Section>

          <Section title="5. Data Storage and Security">
            <ul>
              <li>All data is transmitted over HTTPS (TLS encryption).</li>
              <li>Authentication uses short-lived access tokens (24 hours) and long-lived refresh tokens (30 days), stored in Android's secure storage.</li>
              <li>Access is strictly role-based — you can only view and modify your own data.</li>
              <li>All significant actions are recorded in an audit log.</li>
              <li>Servers are maintained with industry-standard security practices.</li>
            </ul>
            <p>
              While we implement strong security measures, no system is completely immune to threats.
              You are responsible for keeping your login credentials confidential and logging out
              when using shared devices.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              Your business data (sales, collections, reconciliations) is retained for as long as your
              employer's account is active. Audit logs are retained for a minimum of 2 years for
              compliance and dispute resolution. If your account is deactivated by your employer,
              historical records remain in the system for business continuity purposes.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Correction</strong> — request correction of inaccurate personal data</li>
              <li><strong>Deletion</strong> — request deletion of your account and personal data</li>
              <li><strong>Portability</strong> — request your data in a machine-readable format</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{' '}
              <a href={`mailto:${CONTACT}`} style={{ color:'var(--primary)' }}>{CONTACT}</a>.
              Note that business transaction data (sales, reconciliations) may be retained by your
              employer for legal and accounting purposes even after account deletion.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              The {APP_NAME} is intended for use by adult employees only. We do not knowingly collect
              personal information from anyone under 18 years of age. If you believe a minor has
              provided us with personal data, please contact us at{' '}
              <a href={`mailto:${CONTACT}`} style={{ color:'var(--primary)' }}>{CONTACT}</a> and
              we will take steps to delete the information.
            </p>
          </Section>

          <Section title="9. Third-Party Services">
            <p>
              The App connects exclusively to the CylinderHub backend API operated by your organization.
              We do not integrate any third-party analytics SDKs, advertising SDKs, or social login
              providers that would independently collect your data.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              effective date above. Continued use of the App after changes are posted constitutes
              your acceptance of the revised policy. For significant changes, we will notify users
              through the App or via email.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or your
              personal data, please contact us:
            </p>
            <div style={{ background:'var(--bg)', borderRadius:10, padding:'16px 20px', marginTop:12, display:'flex', alignItems:'center', gap:12 }}>
              <Mail size={18} color="var(--primary)" />
              <a href={`mailto:${CONTACT}`} style={{ color:'var(--primary)', fontWeight:600, fontSize:15, textDecoration:'none' }}>
                {CONTACT}
              </a>
            </div>
            <p style={{ marginTop:12 }}>We aim to respond within 5 business days.</p>
          </Section>

        </div>

        {/* Back */}
        <button
          onClick={() => navigate('/login')}
          style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'var(--primary)', fontSize:14, fontWeight:500, marginTop:24, padding:0 }}
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
    <div style={{ marginBottom:30 }}>
      <h2 style={{ fontSize:15, fontWeight:700, margin:'0 0 10px', color:'var(--text)' }}>{title}</h2>
      <div style={{ fontSize:14, lineHeight:1.75, color:'var(--text-2)' }}>{children}</div>
    </div>
  );
}

function SubTitle({ children }) {
  return <p style={{ fontWeight:600, fontSize:13, marginBottom:4, marginTop:12, color:'var(--text)' }}>{children}</p>;
}
