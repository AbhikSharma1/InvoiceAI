import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

const API_BASE = 'http://localhost:4000';

function fmt(amount = 0, currency = 'INR') {
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(amount));
    } catch { return `${currency} ${amount}`; }
}

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return '—';
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

const STATUS_STYLE = {
    paid:    { color: '#16a34a', bg: '#dcfce7', label: 'PAID' },
    unpaid:  { color: '#d97706', bg: '#fef3c7', label: 'UNPAID' },
    overdue: { color: '#dc2626', bg: '#fee2e2', label: 'OVERDUE' },
    draft:   { color: '#6b7280', bg: '#f3f4f6', label: 'DRAFT' },
};

export default function InvoicePreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const printRef = useRef();

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const fetchInvoice = useCallback(async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/invoice/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || 'Not found');
            setInvoice(json.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id, getToken]);

    useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

    const handleDownload = () => {
        window.print();
    };

    if (loading) return <div className="p-12 text-center text-gray-400">Loading invoice...</div>;
    if (error)   return (
        <div className="p-12 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => navigate('/app/invoices')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Back to Invoices</button>
        </div>
    );
    if (!invoice) return null;

    const client   = typeof invoice.client === 'string' ? { name: invoice.client } : (invoice.client || {});
    const items    = Array.isArray(invoice.items) ? invoice.items : [];
    const status   = STATUS_STYLE[invoice.status] || STATUS_STYLE.draft;
    const subtotal = Number(invoice.subtotal || 0);
    const tax      = Number(invoice.tax || 0);
    const total    = Number(invoice.total || 0);

    return (
        <>
            {/* ── Print styles injected into head ── */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
                    #invoice-print-area {
                        position: fixed !important;
                        top: 0; left: 0;
                        width: 100%; height: auto;
                        margin: 0; padding: 0;
                        box-shadow: none !important;
                    }
                    .no-print { display: none !important; }
                    @page { margin: 0; size: A4; }
                }
            `}</style>

            <div className="min-h-screen bg-gray-100 py-8 px-4">
                {/* ── Top action bar (hidden on print) ── */}
                <div className="no-print max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <button onClick={() => navigate('/app/invoices')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1">
                            ← Back to Invoices
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate(`/app/create-invoice?edit=${id}`)}
                            className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
                        >
                            ✏️ Edit
                        </button>
                        <button
                            onClick={handleDownload}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
                        >
                            ⬇️ Download PDF
                        </button>
                    </div>
                </div>

                {/* ── Printable Invoice ── */}
                <div
                    id="invoice-print-area"
                    ref={printRef}
                    style={{
                        maxWidth: '794px',
                        margin: '0 auto',
                        background: '#ffffff',
                        fontFamily: "'Segoe UI', Arial, sans-serif",
                        fontSize: '13px',
                        color: '#1f2937',
                        boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header band */}
                    <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #4f46e5 100%)', padding: '36px 40px 28px', color: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            {/* Left: business info */}
                            <div>
                                {invoice.logoDataUrl && (
                                    <img src={invoice.logoDataUrl} alt="logo" style={{ height: '52px', marginBottom: '10px', objectFit: 'contain', background: '#fff', borderRadius: '6px', padding: '4px' }} />
                                )}
                                <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px' }}>
                                    {invoice.fromBusinessName || 'Your Business'}
                                </div>
                                {invoice.fromAddress && <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>{invoice.fromAddress}</div>}
                                {invoice.fromEmail   && <div style={{ fontSize: '12px', opacity: 0.85 }}>{invoice.fromEmail}</div>}
                                {invoice.fromPhone   && <div style={{ fontSize: '12px', opacity: 0.85 }}>{invoice.fromPhone}</div>}
                                {invoice.fromGst     && <div style={{ fontSize: '12px', opacity: 0.85 }}>GST: {invoice.fromGst}</div>}
                            </div>

                            {/* Right: invoice meta */}
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', opacity: 0.95 }}>INVOICE</div>
                                <div style={{ fontSize: '15px', fontWeight: '600', opacity: 0.9, marginTop: '4px' }}>{invoice.invoiceNumber}</div>
                                <div style={{
                                    display: 'inline-block',
                                    marginTop: '10px',
                                    padding: '4px 14px',
                                    borderRadius: '20px',
                                    background: status.bg,
                                    color: status.color,
                                    fontWeight: '700',
                                    fontSize: '11px',
                                    letterSpacing: '1px',
                                }}>
                                    {status.label}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bill From / Bill To / Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0', borderBottom: '1px solid #e5e7eb' }}>
                        {/* Bill To */}
                        <div style={{ padding: '24px 28px', borderRight: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Bill To</div>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{client.name || '—'}</div>
                            {client.email   && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>{client.email}</div>}
                            {client.phone   && <div style={{ fontSize: '12px', color: '#6b7280' }}>{client.phone}</div>}
                            {client.address && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>{client.address}</div>}
                        </div>

                        {/* Issue Date */}
                        <div style={{ padding: '24px 28px', borderRight: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Issue Date</div>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{fmtDate(invoice.issueDate)}</div>
                            {invoice.dueDate && (
                                <>
                                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '16px', marginBottom: '8px' }}>Due Date</div>
                                    <div style={{ fontWeight: '600', fontSize: '14px', color: invoice.status === 'overdue' ? '#dc2626' : '#111827' }}>{fmtDate(invoice.dueDate)}</div>
                                </>
                            )}
                        </div>

                        {/* Amount Due */}
                        <div style={{ padding: '24px 28px', background: '#f8fafc' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Amount Due</div>
                            <div style={{ fontWeight: '800', fontSize: '22px', color: '#1e40af' }}>{fmt(total, invoice.currency)}</div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Incl. {invoice.taxPercent || 0}% tax</div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div style={{ padding: '28px 28px 0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: '6px 0 0 6px' }}>#</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unit Price</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: '0 6px 6px 0' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px 14px', color: '#9ca3af', fontSize: '12px' }}>{i + 1}</td>
                                        <td style={{ padding: '12px 14px', fontWeight: '500' }}>{item.description || '—'}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#6b7280' }}>{item.qty}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#6b7280' }}>{fmt(item.unitPrice, invoice.currency)}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '600' }}>{fmt((item.qty || 0) * (item.unitPrice || 0), invoice.currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals + Signature */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', padding: '20px 28px 28px', alignItems: 'end' }}>
                        {/* Notes + Signature */}
                        <div>
                            {invoice.notes && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Notes</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.6', background: '#f9fafb', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>{invoice.notes}</div>
                                </div>
                            )}

                            {/* Signature */}
                            {(invoice.signatureDataUrl || invoice.signatureName) && (
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Authorised Signatory</div>
                                    {invoice.signatureDataUrl && (
                                        <img src={invoice.signatureDataUrl} alt="signature" style={{ height: '48px', objectFit: 'contain', marginBottom: '6px' }} />
                                    )}
                                    {invoice.stampDataUrl && (
                                        <img src={invoice.stampDataUrl} alt="stamp" style={{ height: '56px', objectFit: 'contain', marginLeft: '12px', verticalAlign: 'bottom' }} />
                                    )}
                                    <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '6px', marginTop: '6px' }}>
                                        {invoice.signatureName  && <div style={{ fontWeight: '600', fontSize: '13px' }}>{invoice.signatureName}</div>}
                                        {invoice.signatureTitle && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{invoice.signatureTitle}</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Totals box */}
                        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#6b7280', fontSize: '13px' }}>Subtotal</span>
                                <span style={{ fontWeight: '600' }}>{fmt(subtotal, invoice.currency)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#6b7280', fontSize: '13px' }}>Tax ({invoice.taxPercent || 0}%)</span>
                                <span style={{ fontWeight: '600' }}>{fmt(tax, invoice.currency)}</span>
                            </div>
                            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '700', fontSize: '15px' }}>Total</span>
                                <span style={{ fontWeight: '800', fontSize: '18px', color: '#1e40af' }}>{fmt(total, invoice.currency)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ background: '#f1f5f9', padding: '16px 28px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            Thank you for your business! · Generated by <strong style={{ color: '#6b7280' }}>InvoiceAI</strong>
                        </div>
                        {invoice.fromEmail && (
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>
                                Questions? Contact us at {invoice.fromEmail}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
