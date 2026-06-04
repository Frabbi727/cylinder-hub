import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { stockService } from '../../services/stockService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';

function StatusBadge({ row, t }) {
  if (row.is_verified === true)  return <span className="pill pill-green"  style={{ fontSize: 11 }}>{t('extraReturns.statusVerified')}</span>;
  if (row.is_verified === false) return <span className="pill pill-coral"  style={{ fontSize: 11 }}>{t('extraReturns.statusRejected')}</span>;
  return <span className="pill pill-amber" style={{ fontSize: 11 }}>{t('extraReturns.statusPending')}</span>;
}

export default function ExtraReturns() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNotes, setRejectNotes]   = useState('');
  const [actionError, setActionError]   = useState('');

  const EXTRA_REASON_LABELS = {
    old_stock:         t('extraReturns.reasonOldStock'),
    neighbour:         t('extraReturns.reasonNeighbour'),
    competitor:        t('extraReturns.reasonCompetitor'),
    salesman_handover: t('extraReturns.reasonHandover'),
    other:             t('extraReturns.reasonOther'),
  };

  const queryParams = {
    is_extra:    1,
    is_verified: statusFilter === 'pending' ? 'null' : statusFilter === 'verified' ? 'true' : statusFilter === 'rejected' ? 'false' : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['extra-returns', statusFilter],
    queryFn:  () => stockService.getReturns(queryParams),
    refetchInterval: 60_000,
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => stockService.verifyReturn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extra-returns'] });
      qc.invalidateQueries({ queryKey: ['pending-extras-count'] });
      setActionError('');
    },
    onError: (e) => setActionError(e.response?.data?.message || 'Failed to verify'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }) => stockService.rejectReturn(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extra-returns'] });
      qc.invalidateQueries({ queryKey: ['pending-extras-count'] });
      setRejectTarget(null);
      setRejectNotes('');
      setActionError('');
    },
    onError: (e) => setActionError(e.response?.data?.message || 'Failed to reject'),
  });

  const returns = data?.data || [];
  const pending = returns.filter(r => r.is_verified == null).length;

  const FILTER_TABS = [
    { key: 'pending',  label: t('extraReturns.pendingTab') },
    { key: 'verified', label: t('extraReturns.verifiedTab') },
    { key: 'rejected', label: t('extraReturns.rejectedTab') },
    { key: 'all',      label: t('extraReturns.allTab') },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{t('extraReturns.title')}</h2>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
          {t('extraReturns.subtitle')}
        </div>
      </div>

      {actionError && (
        <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 16px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
          <AlertCircle size={15} style={{ marginTop: 1 }} />{actionError}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {FILTER_TABS.map(f => (
          <button key={f.key} className={`tab-btn${statusFilter === f.key ? ' active' : ''}`}
            onClick={() => setStatusFilter(f.key)}>
            {f.label}
            {f.key === 'pending' && pending > 0 && (
              <span style={{ marginLeft: 6, background: '#B83030', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 11 }}>{pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: 40 }}><LoadingSpinner text={t('common.loading')} /></div>
        ) : returns.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
            {statusFilter === 'pending' ? (
              <>
                <CheckCircle size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t('extraReturns.allCaughtUp')}</div>
                <div>{t('extraReturns.noPending')}</div>
              </>
            ) : (
              <div>{t('extraReturns.noRecords')}</div>
            )}
          </div>
        ) : (
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{t('extraReturns.colDate')}</th>
                <th>{t('extraReturns.colSalesman')}</th>
                <th>{t('extraReturns.colCustomer')}</th>
                <th>{t('extraReturns.colCylinder')}</th>
                <th style={{ textAlign: 'center' }}>{t('extraReturns.colQty')}</th>
                <th>{t('extraReturns.colReason')}</th>
                <th>{t('extraReturns.colNotes')}</th>
                <th>{t('extraReturns.colStatus')}</th>
                <th>{t('extraReturns.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id} style={{ background: r.is_verified == null ? '#FFFBF0' : undefined }}>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.return_date}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{r.salesman?.name || r.recorded_by?.name || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{r.customer?.name || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{r.cylinder?.name} {r.cylinder?.size}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.qty}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    {EXTRA_REASON_LABELS[r.extra_reason] || r.extra_reason || '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.notes || '—'}
                  </td>
                  <td><StatusBadge row={r} t={t} /></td>
                  <td>
                    {r.is_verified == null && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-soft btn-sm" style={{ color: 'var(--success)', fontSize: 12 }}
                          onClick={() => verifyMutation.mutate(r.id)}
                          disabled={verifyMutation.isPending}>
                          <CheckCircle size={13} /> {t('extraReturns.approve')}
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#B83030', fontSize: 12 }}
                          onClick={() => { setRejectTarget(r); setRejectNotes(''); setActionError(''); }}>
                          <XCircle size={13} /> {t('extraReturns.reject')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject confirmation modal */}
      {rejectTarget && (
        <Modal title={t('extraReturns.rejectModalTitle')} onClose={() => setRejectTarget(null)}>
          <div style={{ background: '#FEF2F2', border: '1px solid #B83030', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {rejectTarget.cylinder?.name} {rejectTarget.cylinder?.size} — {rejectTarget.qty} {t('common.pcs')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {t('extraReturns.rejectBy', { name: rejectTarget.salesman?.name || '—', date: rejectTarget.return_date })}
            </div>
            <div style={{ fontSize: 12, color: '#B83030', marginTop: 6, fontWeight: 600 }}>
              {t('extraReturns.rejectWarning', { qty: rejectTarget.qty })}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label">{t('extraReturns.rejectReasonLabel')}</label>
            <input className="input" placeholder={t('extraReturns.rejectPlaceholder')}
              value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setRejectTarget(null)}>{t('common.cancel')}</button>
            <button className="btn" style={{ background: '#B83030', color: '#fff' }}
              onClick={() => rejectMutation.mutate({ id: rejectTarget.id, notes: rejectNotes })}
              disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? t('extraReturns.rejecting') : t('extraReturns.confirmRejection')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
