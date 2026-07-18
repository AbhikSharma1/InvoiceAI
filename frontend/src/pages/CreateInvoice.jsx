import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

const API_BASE = 'http://localhost:4000';

const defaultForm = {
    invoiceNumber: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    fromBusinessName: '',
    fromEmail: '',
    fromAddress: '',
    fromPhone: '',
    client: { name: '', email: '', address: '', phone: '' },
    items: [{ id: '1', description: '', qty: 1, unitPrice: 0 }],
    taxPercent: 18,
    currency: 'INR',
    status: 'draft',
    notes: '',
};

function CreateInvoice() {
    const navigate = useNavigate();
    const { getToken } = useAuth();

    const [form, setForm] = useState(defaultForm);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // ── helpers ──────────────────────────────────────────────
    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
    const setClient = (field, value) => setForm(f => ({ ...f, client: { ...f.client, [field]: value } }));

    const setItem = (idx, field, value) =>
        setForm(f => {
            const items = [...f.items];
            items[idx] = { ...items[idx], [field]: field === 'description' ? value : Number(value) || 0 };
            return { ...f, items };
        });

    const addItem = () =>
        setForm(f => ({
            ...f,
            items: [...f.items, { id: String(Date.now()), description: '', qty: 1, unitPrice: 0 }],
        }));

    const removeItem = idx =>
        setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

    const subtotal = form.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
    const tax = (subtotal * (Number(form.taxPercent) || 0)) / 100;
    const total = subtotal + tax;

    const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: form.currency || 'INR' }).format(n);

    // ── AI generate ──────────────────────────────────────────
    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setAiLoading(true);
        setAiError('');
        try {
            const res = await fetch(`${API_BASE}/api/ai/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || 'AI generation failed');

            const d = json.data;
            setForm(f => ({
                ...f,
                invoiceNumber: d.invoiceNumber || f.invoiceNumber,
                issueDate: d.issueDate || f.issueDate,
                dueDate: d.dueDate || f.dueDate,
                fromBusinessName: d.fromBusinessName || f.fromBusinessName,
                fromEmail: d.fromEmail || f.fromEmail,
                fromAddress: d.fromAddress || f.fromAddress,
                fromPhone: d.fromPhone || f.fromPhone,
                client: { ...f.client, ...(d.client || {}) },
                items: Array.isArray(d.items) && d.items.length ? d.items.map((it, i) => ({ id: String(i + 1), description: it.description || '', qty: Number(it.qty) || 1, unitPrice: Number(it.unitPrice) || 0 })) : f.items,
                taxPercent: d.taxPercent ?? f.taxPercent,
                currency: d.currency || f.currency,
                notes: d.notes || f.notes,
            }));
            setAiPrompt('');
        } catch (err) {
            setAiError(err.message || 'Failed to generate invoice');
        } finally {
            setAiLoading(false);
        }
    };

    // ── Save ─────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        setSaveError('');
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...form, subtotal, tax, total }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save invoice');
            navigate('/app/invoices');
        } catch (err) {
            setSaveError(err.message || 'Failed to save invoice');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
                <p className="mt-1 text-gray-500">Fill in the details or use AI to generate from text</p>
            </div>

            {/* AI Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                    <span>🤖</span> AI Invoice Generator
                </h2>
                <p className="text-sm text-gray-500 mb-3">Describe your invoice in plain text and AI will fill the form</p>
                <textarea
                    rows={3}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder='e.g. "Invoice for Acme Corp for web design ₹15000, consultation 2hrs ₹3000, due in 30 days"'
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                />
                {aiError && <p className="text-sm text-red-600 mt-1">{aiError}</p>}
                <button
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {aiLoading ? 'Generating...' : '✨ Generate with AI'}
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Invoice Info */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4">Invoice Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                                <input className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} placeholder="INV-0001" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                                <input type="date" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" value={form.issueDate} onChange={e => set('issueDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <input type="date" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* From */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4">From (Your Business)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[['Business Name', 'fromBusinessName', 'text', 'Acme Inc.'], ['Email', 'fromEmail', 'email', 'you@example.com'], ['Phone', 'fromPhone', 'text', '+91 98765 43210'], ['Address', 'fromAddress', 'text', '123 Main St, City']].map(([label, field, type, ph]) => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                    <input type={type} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" placeholder={ph} value={form[field]} onChange={e => set(field, e.target.value)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4">Bill To (Client)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[['Client Name', 'name', 'Client Corp'], ['Email', 'email', 'client@example.com'], ['Phone', 'phone', '+91 98765 43210'], ['Address', 'address', '456 Client Ave']].map(([label, field, ph]) => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                    <input className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" placeholder={ph} value={form.client[field]} onChange={e => setClient(field, e.target.value)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4">Line Items</h2>
                        <div className="hidden md:grid md:grid-cols-12 gap-3 mb-2 text-xs font-semibold text-gray-500 uppercase px-1">
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2 text-center">Qty</div>
                            <div className="col-span-3 text-center">Unit Price</div>
                            <div className="col-span-2 text-right">Total</div>
                        </div>
                        <div className="space-y-3">
                            {form.items.map((item, idx) => (
                                <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                                    <div className="col-span-12 md:col-span-5">
                                        <input className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Item description" value={item.description} onChange={e => setItem(idx, 'description', e.target.value)} />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <input type="number" min="1" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-center focus:ring-2 focus:ring-blue-500" value={item.qty} onChange={e => setItem(idx, 'qty', e.target.value)} />
                                    </div>
                                    <div className="col-span-5 md:col-span-3">
                                        <input type="number" min="0" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-right focus:ring-2 focus:ring-blue-500" value={item.unitPrice} onChange={e => setItem(idx, 'unitPrice', e.target.value)} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 text-right text-sm font-medium text-gray-700">
                                        {fmt(item.qty * item.unitPrice)}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        {form.items.length > 1 && (
                                            <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">✕</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={addItem} className="mt-4 w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                            + Add Item
                        </button>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea rows={3} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Payment terms, thank you note, etc." value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>
                </div>

                {/* Right Column - Summary */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm sticky top-24">
                        <h2 className="font-semibold text-gray-800 mb-4">Summary</h2>

                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" value={form.currency} onChange={e => set('currency', e.target.value)}>
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
                                <input type="number" min="0" max="100" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" value={form.taxPercent} onChange={e => set('taxPercent', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => set('status', e.target.value)}>
                                    <option value="draft">Draft</option>
                                    <option value="unpaid">Unpaid</option>
                                    <option value="paid">Paid</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4 space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span><span className="font-medium text-gray-900">{fmt(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Tax ({form.taxPercent}%)</span><span className="font-medium text-gray-900">{fmt(tax)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
                                <span>Total</span><span>{fmt(total)}</span>
                            </div>
                        </div>

                        {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            {saving ? 'Saving...' : 'Save Invoice'}
                        </button>
                        <button onClick={() => navigate('/app/invoices')} className="mt-2 w-full py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateInvoice;
