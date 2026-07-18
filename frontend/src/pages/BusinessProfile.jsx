import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

const API_BASE = 'http://localhost:4000';

const defaultForm = {
    businessName: '',
    email: '',
    phone: '',
    address: '',
    gst: '',
    signatureOwnerName: '',
    signatureOwnerTitle: '',
    defaultTaxPercent: 18,
};

export default function BusinessProfile() {
    const { getToken } = useAuth();

    const [form, setForm]         = useState(defaultForm);
    const [profileId, setProfileId] = useState(null);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [success, setSuccess]   = useState('');
    const [error, setError]       = useState('');

    // image previews (data URLs for display, File objects for upload)
    const [logo, setLogo]           = useState({ file: null, preview: '' });
    const [stamp, setStamp]         = useState({ file: null, preview: '' });
    const [signature, setSignature] = useState({ file: null, preview: '' });

    const logoRef      = useRef();
    const stampRef     = useRef();
    const signatureRef = useRef();

    // ── fetch existing profile ────────────────────────────────
    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/api/businessProfile/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 404) { setLoading(false); return; }
            const json = await res.json();
            if (json.success && json.data) {
                const d = json.data;
                setProfileId(d._id);
                setForm({
                    businessName:        d.businessName || '',
                    email:               d.email || '',
                    phone:               d.phone || '',
                    address:             d.address || '',
                    gst:                 d.gst || '',
                    signatureOwnerName:  d.signatureOwnerName || '',
                    signatureOwnerTitle: d.signatureOwnerTitle || '',
                    defaultTaxPercent:   d.defaultTaxPercent ?? 18,
                });
                if (d.logourl)      setLogo(p      => ({ ...p, preview: d.logourl }));
                if (d.stampurl)     setStamp(p     => ({ ...p, preview: d.stampurl }));
                if (d.signatureurl) setSignature(p => ({ ...p, preview: d.signatureurl }));
            }
        } catch (err) {
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    // ── image picker ─────────────────────────────────────────
    const pickImage = (setter, ref) => ref.current?.click();

    const onFileChange = (setter) => (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setter({ file, preview: ev.target.result });
        reader.readAsDataURL(file);
    };

    // ── save ─────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true); setError(''); setSuccess('');
        try {
            const token = await getToken();
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (logo.file)      fd.append('logoName', logo.file);
            if (stamp.file)     fd.append('stampName', stamp.file);
            if (signature.file) fd.append('signatureNameMeta', signature.file);

            const url    = profileId ? `${API_BASE}/api/businessProfile/${profileId}` : `${API_BASE}/api/businessProfile`;
            const method = profileId ? 'PUT' : 'POST';

            const res  = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || 'Save failed');

            setProfileId(json.data._id);
            setSuccess('Business profile saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    if (loading) return <div className="p-12 text-center text-gray-400">Loading profile...</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Business Profile</h1>
                <p className="mt-1 text-gray-500">Your business details appear on every invoice you create</p>
            </div>

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl text-sm font-medium">
                    ✓ {success}
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left: form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Business Info */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="p-2 bg-blue-100 text-blue-600 rounded-lg">🏢</span> Business Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                ['Business Name', 'businessName', 'text', 'Acme Inc.'],
                                ['Email', 'email', 'email', 'contact@acme.com'],
                                ['Phone', 'phone', 'text', '+91 98765 43210'],
                                ['GST Number', 'gst', 'text', '22AAAAA0000A1Z5'],
                            ].map(([label, field, type, ph]) => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                    <input
                                        type={type}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={ph}
                                        value={form[field]}
                                        onChange={e => set(field, e.target.value)}
                                    />
                                </div>
                            ))}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="123 Main Street, City, State - 400001"
                                    value={form.address}
                                    onChange={e => set('address', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Signature Info */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="p-2 bg-purple-100 text-purple-600 rounded-lg">✍️</span> Signature Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                                <input
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="John Doe"
                                    value={form.signatureOwnerName}
                                    onChange={e => set('signatureOwnerName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Title</label>
                                <input
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="CEO / Director"
                                    value={form.signatureOwnerTitle}
                                    onChange={e => set('signatureOwnerTitle', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tax */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="p-2 bg-amber-100 text-amber-600 rounded-lg">%</span> Default Tax Rate
                        </h2>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-32 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-center font-semibold focus:ring-2 focus:ring-blue-500"
                                value={form.defaultTaxPercent}
                                onChange={e => set('defaultTaxPercent', e.target.value)}
                            />
                            <span className="text-gray-500 text-sm">% — applied by default on new invoices</span>
                        </div>
                    </div>
                </div>

                {/* Right: images + save */}
                <div className="space-y-6">
                    {/* Logo */}
                    <ImageUploadCard
                        label="Company Logo"
                        preview={logo.preview}
                        inputRef={logoRef}
                        onPick={() => pickImage(setLogo, logoRef)}
                        onChange={onFileChange(setLogo)}
                        onRemove={() => setLogo({ file: null, preview: '' })}
                        aspect="w-40 h-28"
                    />

                    {/* Stamp */}
                    <ImageUploadCard
                        label="Company Stamp"
                        preview={stamp.preview}
                        inputRef={stampRef}
                        onPick={() => pickImage(setStamp, stampRef)}
                        onChange={onFileChange(setStamp)}
                        onRemove={() => setStamp({ file: null, preview: '' })}
                        aspect="w-32 h-24"
                    />

                    {/* Signature */}
                    <ImageUploadCard
                        label="Signature"
                        preview={signature.preview}
                        inputRef={signatureRef}
                        onPick={() => pickImage(setSignature, signatureRef)}
                        onChange={onFileChange(setSignature)}
                        onRemove={() => setSignature({ file: null, preview: '' })}
                        aspect="w-36 h-20"
                    />

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                        {saving ? 'Saving...' : profileId ? 'Update Profile' : 'Save Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ImageUploadCard({ label, preview, inputRef, onPick, onChange, onRemove, aspect }) {
    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-3">{label}</p>
            {preview ? (
                <div className="text-center space-y-3">
                    <div className={`${aspect} mx-auto rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-50`}>
                        <img src={preview} alt={label} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex gap-2 justify-center">
                        <button onClick={onPick} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors">Change</button>
                        <button onClick={onRemove} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">Remove</button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={onPick}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                >
                    <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Upload {label}</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                </button>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
        </div>
    );
}
