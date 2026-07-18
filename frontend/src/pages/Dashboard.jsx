import { useNavigate } from 'react-router-dom';
import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { dashboardStyles } from '../assets/dummyStyles'

const API_BASE = 'http://localhost:4000';

function normalizeClient(raw) {
    if (!raw) return { name: "", email: "", address: "", phone: "" };
    if (typeof raw === "string")
        return { name: raw, email: "", address: "", phone: "" };
    if (typeof raw === "object") {
        return {
            name: raw.name ?? raw.company ?? raw.client ?? "",
            email: raw.email ?? raw.emailAddress ?? "",
            address: raw.address ?? "",
            phone: raw.phone ?? raw.contact ?? "",
        };
    }
    return { name: "", email: "", address: "", phone: "" };
}

function currencyFmt(amount = 0, currency = "INR") {
    try {
        const n = Number(amount || 0);
        if (currency === "INR")
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
            }).format(n);
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
        }).format(n);
    } catch {
        return `${currency} ${amount}`;
    }
}

// Icons
const TrendingUpIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" />
    </svg>
);
const DollarIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);
const ClockIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);
const FileTextIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

function capitalize(s) {
    if (!s) return s;
    return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function formatDate(dateInput) {
    if (!dateInput) return "—";
    const d = dateInput instanceof Date ? dateInput : new Date(String(dateInput));
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

// Internal KpiCard Component to solve the missing file error
const KpiCard = ({ title, values, hint, iconType, trend }) => {
    const Icon = iconType === "document" ? FileTextIcon : iconType === "revenue" ? DollarIcon : ClockIcon;
    return (
        <div className={dashboardStyles.kpiCard}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-500 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold">{values}</h3>
                    <p className="text-xs text-gray-400 mt-1">{hint}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                </div>
            </div>
            {trend && (
                <div className={`mt-4 flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUpIcon className="w-4 h-4 mr-1" />
                    <span>{trend > 0 ? '+' : ''}{trend}%</span>
                </div>
            )}
        </div>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { getToken, isSignedIn } = useAuth();

    const obtainToken = useCallback(async () => {
        if (typeof getToken !== "function") return null;
        try {
            let token = await getToken({ template: "default" }).catch(() => null);
            if (!token) {
                token = await getToken({ forceRefresh: true }).catch(() => null);
            }
            return token;
        } catch {
            return null;
        }
    }, [getToken]);

    const [storedInvoices, setStoredInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [businessProfile, setBusinessProfile] = useState(null);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await obtainToken();
            const headers = { Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/api/invoice`, {
                method: "GET",
                headers,
            });
            const json = await res.json().catch(() => null);

            if (res.status === 401) {
                setError("Unauthorized. Please sign in.");
                setStoredInvoices([]);
                return;
            }

            if (!res.ok) {
                const msg = json?.message || `Failed to fetch (${res.status})`;
                throw new Error(msg);
            }

            const raw = json?.data || [];
            const mapped = (Array.isArray(raw) ? raw : []).map((inv) => ({
                ...inv,
                id: inv.invoiceNumber || inv._id || String(inv._id || ""),
                client: inv.client ?? {},
                amount: Number(inv.total ?? inv.amount ?? 0),
                currency: (inv.currency || "INR").toUpperCase(),
                status: typeof inv.status === "string" ? capitalize(inv.status) : inv.status || "Draft",
            }));
            setStoredInvoices(mapped);
        } catch (err) {
            console.error("Failed to fetch invoices:", err);
            setError(err?.message || "Failed to load invoices");
            setStoredInvoices([]);
        } finally {
            setLoading(false);
        }
    }, [obtainToken]);

    const fetchBusinessProfile = useCallback(async () => {
        try {
            const token = await obtainToken();
            if (!token) return;
            const res = await fetch(`${API_BASE}/api/businessProfile/me`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                },
            });
            if (!res.ok) return;
            const json = await res.json().catch(() => null);
            if (json?.data) setBusinessProfile(json.data);
        } catch (err) {
            console.warn("Failed to fetch business profile:", err);
        }
    }, [obtainToken]);

    useEffect(() => {
        fetchInvoices();
        fetchBusinessProfile();
        function onStorage(e) {
            if (e.key === "invoice_v1") fetchInvoices();
        }
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [fetchInvoices, fetchBusinessProfile, isSignedIn]);

    const HARD_RATES = { USD_TO_INR: 83 };

    function convertToINR(amount = 0, currency = "INR") {
        const n = Number(amount || 0);
        const curr = String(currency || "INR").trim().toUpperCase();
        if (curr === "INR") return n;
        if (curr === "USD") return n * HARD_RATES.USD_TO_INR;
        return n;
    }

    const kpis = useMemo(() => {
        let totalPaid = 0, totalUnpaid = 0, paidCount = 0, unpaidCount = 0;
        storedInvoices.forEach((inv) => {
            const amtInINR = convertToINR(inv.amount, inv.currency);
            if (inv.status === "Paid") {
                totalPaid += amtInINR;
                paidCount++;
            } else if (inv.status === "Unpaid" || inv.status === "Overdue") {
                totalUnpaid += amtInINR;
                unpaidCount++;
            }
        });
        const totalAmount = totalPaid + totalUnpaid;
        return {
            totalInvoices: storedInvoices.length,
            totalPaid,
            totalUnpaid,
            paidCount,
            unpaidCount,
            paidPercentage: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
            unpaidPercentage: totalAmount > 0 ? (totalUnpaid / totalAmount) * 100 : 0,
        };
    }, [storedInvoices]);

    return (
        <div className={dashboardStyles.pageContainer}>
            <div className={dashboardStyles.headerContainer}>
                <h1 className={dashboardStyles.headerTitle}>Dashboard Overview</h1>
                <p className={dashboardStyles.headerSubtitle}>Track your invoicing performance and business growth</p>
            </div>

            {loading ? (
                <div className='p-6 text-gray-500'>Loading Invoices...</div>
            ) : error ? (
                <div className='p-6'>
                    <div className='text-red-600 mb-3 font-medium'>Error: {error}</div>
                    <div className='flex gap-2'>
                        <button onClick={fetchInvoices} className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'>Retry</button>
                        {String(error).toLowerCase().includes("unauthorized") && (
                            <button onClick={() => navigate("/login")} className='px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors'>Sign In</button>
                        )}
                    </div>
                </div>
            ) : (
                <div className={dashboardStyles.kpiGrid}>
                    <KpiCard title="Total Invoices" values={kpis.totalInvoices}
                        hint="Active Invoices"
                        iconType="document"
                        trend={8.5}
                    />

                    <KpiCard title="Total Paid" values={currencyFmt(kpis.totalPaid, "INR")}
                        hint="Received Amount (INR)"
                        iconType="revenue"
                        trend={12.2}
                    />

                    <KpiCard title="Total Unpaid" values={currencyFmt(kpis.totalUnpaid, "INR")}
                        hint="Outstanding Balance (INR)"
                        iconType="clock"
                        trend={-3.1}
                    />
                </div>
            )}
        </div>
    )
}

export default Dashboard;