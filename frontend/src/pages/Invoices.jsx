import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

const API_BASE = 'http://localhost:4000';

const STATUS_COLORS = {
    paid:    'bg-emerald-100 text-emerald-700',
    unpaid:  'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
    draft:   'bg-gray-100 text-gray-600',
};

function fmt(amount = 0, currency = 'INR') {
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(amount));
    } catch {
        return `${currency} ${amount}`;
    }
}

function formatDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return '—';
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

export default function Invoices() {
    const navigate = useNavigate();
    const { getToken } = useAuth();

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');
    const [search, setSearch]     = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deleting, setDeleting] = useState(null);

    const fetchInvoices = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/invoice`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Failed to fetch');
            setInvoices(json.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this invoice?')) return;
        setDeleting(id);
        try {
            const token = await getToken();
            await fetch(`${API_BASE}/api/invoice/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setInvoices(prev => prev.filter(inv => (inv._id || inv.invoiceNumber) !== id));
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        } finally {
            setDeleting(null);
        }
    };

    const filtered = invoices.filter(inv => {
        const clientName = typeof inv.client === 'string' ? inv.client : inv.client?.name || '';
        const matchSearch = !search ||
            clientName.toLowerCase().includes(search.toLowerCase()) ||
            (inv.invoiceNumber || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const stats = {
        total:   invoices.length,
        paid:    invoices.filter(i => i.status === 'paid').length,
        unpaid:  invoices.filter(i => i.status === 'unpaid').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
                    <p className="mt-1 text-gray-500">Manage and track all your invoices</p>
                </div>
                <button
                    onClick={() => navigate('/app/create-invoice')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                    + Create Invoice
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-gray-900' },
                    { label: 'Paid', value: stats.paid, color: 'text-emerald-600' },
                    { label: 'Unpaid', value: stats.unpaid, color: 'text-amber-600' },
                    { label: 'Overdue', value: stats.overdue, color: 'text-red-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                        <p className="text-sm text-gray-500">{s.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
                <input
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Search by client or invoice number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select
                    className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading invoices...</div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <p className="text-red-500 mb-3">{error}</p>
                        <button onClick={fetchInvoices} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <p className="text-lg font-medium">No invoices found</p>
                        <p className="text-sm mt-1">
                            {invoices.length === 0
                                ? <span>Create your first invoice <button onClick={() => navigate('/app/create-invoice')} className="text-blue-600 underline">here</button></span>
                                : 'Try adjusting your search or filter'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {['Invoice #', 'Client', 'Amount', 'Status', 'Issue Date', 'Due Date', 'Actions'].map(h => (
                                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map(inv => {
                                    const id = inv._id || inv.invoiceNumber;
                                    const clientName = typeof inv.client === 'string' ? inv.client : inv.client?.name || '—';
                                    return (
                                        <tr key={id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-blue-600">{inv.invoiceNumber || '—'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                                        {clientName.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{clientName}</p>
                                                        <p className="text-xs text-gray-400">{inv.client?.email || ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{fmt(inv.total, inv.currency)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[inv.status] || STATUS_COLORS.draft}`}>
                                                    {inv.status || 'draft'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{formatDate(inv.issueDate)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/app/invoices/${id}`)}
                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        View & Download
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(id)}
                                                        disabled={deleting === id}
                                                        className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {deleting === id ? '...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
