import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ArrowLeft, Mail } from 'lucide-react';

export default function TermsAndConditions() {
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
          <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 6px' }}>Terms and Conditions</h1>
          <p className="dim" style={{ fontSize:13, margin:'0 0 8px' }}>Effective date: {UPDATED}</p>
          <p className="dim" style={{ fontSize:13, margin:'0 0 32px' }}>
            Please read these Terms and Conditions carefully before using the{' '}
            <strong>{APP_NAME}</strong> mobile application. By downloading, installing, or using
            the App, you agree to be bound by these terms.
          </p>

          <Section title="1. Acceptance of Terms">
            <p>
              These Terms and Conditions ("Terms") govern your use of the {APP_NAME} mobile
              application ("App") published on the Google Play Store by CylinderHub. By
              accessing or using the App, you confirm that you have read, understood, and agree
              to be bound by these Terms.
            </p>
            <p>
              If you do not agree to these Terms, do not download, install, or use the App.
            </p>
          </Section>

          <Section title="2. Eligibility and Account Access">
            <ul>
              <li>The App is intended for use by authorized salesman employees of businesses that have purchased a CylinderHub account. You must be at least 18 years old to use the App.</li>
              <li>Accounts are created and managed by your employer's administrator. You cannot self-register.</li>
              <li>You are responsible for keeping your login credentials (email and password) confidential. Do not share your password with anyone, including colleagues.</li>
              <li>You must notify your employer immediately if you suspect unauthorized access to your account.</li>
              <li>Your access to the App may be deactivated at any time by your employer or by us for violation of these Terms.</li>
            </ul>
          </Section>

          <Section title="3. Description of the App">
            <p>The {APP_NAME} is a business operations tool that enables salesman employees to:</p>
            <ul>
              <li>View their daily cylinder stock allocations from their employer</li>
              <li>Record sales to customers and manage customer information</li>
              <li>Track and collect outstanding due payments from customers</li>
              <li>Log empty cylinder returns from customers</li>
              <li>Submit End-of-Day (EOD) reconciliation of stock and cash</li>
              <li>View personal sales reports and performance data</li>
            </ul>
            <p>The App connects to your employer's CylinderHub backend server. Features are subject to the permissions configured by your employer's administrator.</p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree to use the App only for its intended business purpose. You must NOT:</p>
            <ul>
              <li>Enter false, fabricated, or misleading data into the system (e.g. recording sales that did not occur, submitting incorrect EOD figures)</li>
              <li>Access or attempt to access another user's data or account</li>
              <li>Attempt to bypass, reverse-engineer, decompile, or tamper with the App or its security measures</li>
              <li>Use the App for any unlawful purpose or in violation of any applicable law or regulation</li>
              <li>Share your account credentials with any other person</li>
              <li>Scrape, copy, or redistribute any data from the App without authorization</li>
              <li>Interfere with the App's servers or infrastructure</li>
            </ul>
            <p>
              Violation of acceptable use policies may result in immediate account suspension and
              may be reported to your employer.
            </p>
          </Section>

          <Section title="5. Data Accuracy and Your Responsibility">
            <ul>
              <li>You are solely responsible for the accuracy of all data you enter, including sales amounts, customer details, payment records, and EOD reconciliation figures.</li>
              <li>EOD reconciliation submissions are treated as final. Corrections can only be made by your employer's administrator.</li>
              <li>CylinderHub is not liable for business consequences arising from inaccurate data you enter into the App.</li>
              <li>You acknowledge that all your activity within the App is logged and visible to your employer's administrator.</li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              The {APP_NAME} application, including its design, code, branding, and content, is the
              intellectual property of CylinderHub. You are granted a limited, non-exclusive,
              non-transferable, revocable licence to use the App solely for your authorized
              business activities.
            </p>
            <p>You may not:</p>
            <ul>
              <li>Copy, modify, or distribute the App or any part of it</li>
              <li>Create derivative works based on the App</li>
              <li>Remove or alter any proprietary notices or branding within the App</li>
            </ul>
          </Section>

          <Section title="7. Business Data Ownership">
            <p>
              All business data you enter (sales records, customer data, collection records) belongs
              to your employer's organization. CylinderHub holds this data on behalf of your employer
              and does not claim ownership over it. Upon your account deactivation, your employer
              retains access to historical records.
            </p>
          </Section>

          <Section title="8. App Updates and Availability">
            <ul>
              <li>We may release updates to the App through the Google Play Store. You are encouraged to keep the App up to date to ensure security and access to the latest features.</li>
              <li>We reserve the right to modify, suspend, or discontinue the App (or any feature) at any time with or without notice.</li>
              <li>We do not guarantee uninterrupted availability. Server maintenance, updates, or technical issues may cause temporary downtime.</li>
            </ul>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>
              The App is provided "as is" and "as available" without any warranties of any kind,
              either express or implied. To the fullest extent permitted by law, CylinderHub disclaims
              all warranties including but not limited to:
            </p>
            <ul>
              <li>Fitness for a particular purpose</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Accuracy or completeness of any data or reports generated</li>
            </ul>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, CylinderHub shall not be liable for:</p>
            <ul>
              <li>Any indirect, incidental, special, or consequential damages arising from your use of the App</li>
              <li>Financial losses based on reports or data within the App</li>
              <li>Loss of data due to device failure, user error, or unauthorized access</li>
              <li>Any damages arising from App downtime or unavailability</li>
            </ul>
          </Section>

          <Section title="11. Termination">
            <p>
              These Terms remain in effect while you use the App. Your right to use the App terminates
              automatically if:
            </p>
            <ul>
              <li>Your employer deactivates your account</li>
              <li>You violate any of these Terms</li>
              <li>We discontinue the App</li>
            </ul>
            <p>Upon termination, you must immediately stop using the App and delete it from your device.</p>
          </Section>

          <Section title="12. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of
              Bangladesh, without regard to its conflict of law principles. Any disputes arising
              under or in connection with these Terms shall be subject to the exclusive jurisdiction
              of the courts of Bangladesh.
            </p>
          </Section>

          <Section title="13. Changes to These Terms">
            <p>
              We may revise these Terms from time to time. When we do, the effective date above
              will be updated. Continued use of the App after changes constitutes acceptance of the
              revised Terms. We encourage you to review this page periodically.
            </p>
          </Section>

          <Section title="14. Contact Us">
            <p>
              If you have any questions about these Terms and Conditions, or to report a violation,
              please contact us:
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
