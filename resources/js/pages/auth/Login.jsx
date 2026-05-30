import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Flame, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [form, setForm]     = useState({ email: 'admin@cylinderhub.com', password: 'password' });
  const [error, setError]   = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, loading }  = useAuth();
  const navigate            = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 40 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', color: '#fff'
          }}>
            <Flame size={26} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Cylinder<span style={{ color: 'var(--primary)' }}>Hub</span>
          </h1>
          <p className="dim" style={{ marginTop: 4, fontSize: 13 }}>Admin Console — Sign in to continue</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--error-bg)', color: 'var(--error)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Email address</label>
            <input
              type="email" className="input" placeholder="you@cylinderhub.com"
              value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))}
              required
            />
          </div>

          <div style={{ marginBottom: 24, position: 'relative' }}>
            <label className="label">Password</label>
            <input
              type={showPw ? 'text' : 'password'} className="input" placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))}
              required style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              style={{
                position: 'absolute', right: 12, top: 30, background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--text-3)'
              }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="dim tiny" style={{ textAlign: 'center', marginTop: 24 }}>
          Default: admin@cylinderhub.com / password
        </p>
      </div>
    </div>
  );
}
