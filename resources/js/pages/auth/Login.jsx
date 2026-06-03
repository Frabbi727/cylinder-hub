import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Flame, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, loading, user } = useAuth();
  const navigate            = useNavigate();
  const { t }               = useTranslation();

  // Redirect already-authenticated users to their home page
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/' : '/dashboard'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(form);
      // Navigate to role-appropriate home immediately — no double redirect
      navigate(data.user.role === 'admin' ? '/' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t('auth.invalidCredentials'));
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:16 }}>
      <div className="card" style={{ width:'100%', maxWidth:400, padding:40 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52,height:52,borderRadius:14,background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',color:'#fff' }}>
            <Flame size={26} />
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Cylinder<span style={{ color:'var(--primary)' }}>Hub</span></h1>
          <p className="dim" style={{ marginTop:4, fontSize:13 }}>{t('auth.subtitle')}</p>
        </div>

        {error && (
          <div style={{ background:'var(--error-bg)',color:'var(--error)',borderRadius:8,padding:'10px 14px',marginBottom:20,fontSize:13 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label className="label">{t('auth.emailAddress')}</label>
            <input type="email" className="input" value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
          </div>
          <div style={{ marginBottom:24, position:'relative' }}>
            <label className="label">{t('auth.password')}</label>
            <input type={showPw ? 'text' : 'password'} className="input" value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))} required style={{ paddingRight:40 }} />
            <button type="button" onClick={() => setShowPw(s => !s)}
              style={{ position:'absolute',right:12,top:30,background:'none',border:'none',cursor:'pointer',color:'var(--text-3)' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
        <p className="dim tiny" style={{ textAlign:'center', marginTop:24 }}>{t('auth.defaultHint')}</p>
      </div>
    </div>
  );
}
