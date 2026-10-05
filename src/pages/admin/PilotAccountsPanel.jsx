import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserCheck, Clock, CheckCircle, XCircle, AlertCircle, Copy, Check,
    Trash2, Plus, RefreshCw, Eye, EyeOff, ShieldCheck, Calendar,
    Building, Mail, Key, Search, Sparkles, User, ExternalLink
} from "lucide-react";
import { API_URL, getAuthHeaders } from "../../firebase";

const PilotAccountsPanel = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [statusMsg, setStatusMsg] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); // "all", "active", "expired"

    // Creation Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        companyName: "",
        durationDays: 5
    });

    // Created Account Modal / Success Banner
    const [createdAccount, setCreatedAccount] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    const fetchAccounts = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");

        try {
            const headers = await getAuthHeaders();
            const res = await axios.get(`${API_URL}/admin/pilot-accounts`, { headers });
            if (res.data && res.data.success) {
                setAccounts(res.data.pilotAccounts || []);
            } else {
                setAccounts([]);
            }
        } catch (err) {
            console.error("[PILOT-PANEL] Failed to fetch accounts:", err);
            setError(err.response?.data?.message || "Failed to load pilot accounts.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormError("");

        const email = formData.email.trim();
        const password = formData.password.trim();
        const duration = Number(formData.durationDays);

        if (!email) {
            setFormError("Email is required.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setFormError("Please enter a valid email address.");
            return;
        }

        if (!password || password.length < 6) {
            setFormError("Password must be at least 6 characters long.");
            return;
        }

        if (!Number.isInteger(duration) || duration < 1 || duration > 10) {
            setFormError("Duration must be between 1 and 10 days.");
            return;
        }

        setCreating(true);

        try {
            const headers = await getAuthHeaders();
            const res = await axios.post(
                `${API_URL}/admin/pilot-accounts`,
                {
                    email,
                    password,
                    durationDays: duration,
                    name: formData.name.trim(),
                    companyName: formData.companyName.trim()
                },
                { headers }
            );

            if (res.data && res.data.success) {
                const created = res.data.pilotAccount;
                // Store password locally in success state ONLY for initial display to admin
                setCreatedAccount({
                    ...created,
                    plainPassword: password
                });
                setIsCreateOpen(false);
                setFormData({
                    email: "",
                    password: "",
                    name: "",
                    companyName: "",
                    durationDays: 5
                });
                setStatusMsg("Pilot account created successfully!");
                await fetchAccounts();
            }
        } catch (err) {
            console.error("[PILOT-PANEL] Creation error:", err);
            setFormError(err.response?.data?.message || "Failed to create pilot account.");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (userId, email) => {
        if (!window.confirm(`Are you sure you want to permanently delete pilot account: ${email}? This will revoke their access immediately.`)) {
            return;
        }

        try {
            const headers = await getAuthHeaders();
            await axios.delete(`${API_URL}/admin/pilot-accounts/${userId}`, { headers });
            setStatusMsg(`Pilot account ${email} deleted successfully.`);
            await fetchAccounts();
        } catch (err) {
            console.error("[PILOT-PANEL] Delete error:", err);
            alert(err.response?.data?.message || "Failed to delete pilot account.");
        } finally {
            setTimeout(() => setStatusMsg(""), 4000);
        }
    };

    const copyToClipboard = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2500);
    };

    const copyAllCredentials = () => {
        if (!createdAccount) return;
        const text = `Hire1Percent Pilot Recruiter Access
Login URL: https://www.hire1percent.com/login
Email: ${createdAccount.email}
Password: ${createdAccount.plainPassword}
Role: Recruiter
Expiration: ${new Date(createdAccount.pilotExpiresAt).toLocaleDateString()} (${createdAccount.durationDays} Days)
Note: No email verification required. Log in directly as Recruiter.`;
        navigator.clipboard.writeText(text);
        setCopiedField("all");
        setTimeout(() => setCopiedField(null), 2500);
    };

    // Filter accounts
    const filteredAccounts = accounts.filter((acc) => {
        const matchesStatus =
            filterStatus === "all" ||
            (filterStatus === "active" && acc.status === "ACTIVE") ||
            (filterStatus === "expired" && acc.status === "EXPIRED");

        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
            !q ||
            acc.email?.toLowerCase().includes(q) ||
            acc.name?.toLowerCase().includes(q) ||
            acc.company?.toLowerCase().includes(q);

        return matchesStatus && matchesQuery;
    });

    const activeCount = accounts.filter((a) => a.status === "ACTIVE").length;
    const expiredCount = accounts.filter((a) => a.status === "EXPIRED").length;

    return (
        <div className="space-y-6">
            {/* Top Notification / Status Banner */}
            <AnimatePresence>
                {statusMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-800"
                    >
                        <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                        <span>{statusMsg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header & Primary Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600">
                            <ShieldCheck size={16} />
                        </span>
                        <h2 className="text-xl font-black tracking-tight text-gray-950">Pilot Recruiter Accounts</h2>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                        Create and manage temporary 1–10 day recruiter accounts for customer evaluations.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchAccounts(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-gray-600 shadow-xs hover:bg-gray-50 transition cursor-pointer"
                        title="Refresh pilot accounts list"
                    >
                        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={() => {
                            setIsCreateOpen(!isCreateOpen);
                            setFormError("");
                        }}
                        className="flex items-center gap-2 rounded-2xl bg-black px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-gray-800 transition active:scale-95 cursor-pointer"
                    >
                        <Plus size={15} />
                        <span>Create Pilot Recruiter</span>
                    </button>
                </div>
            </div>

            {/* Newly Created Credentials Modal / Announcement */}
            <AnimatePresence>
                {createdAccount && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-6 shadow-md"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Account Provisioned</span>
                                    <h3 className="text-lg font-black text-gray-900">Pilot Recruiter Credentials Ready</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setCreatedAccount(null)}
                                className="rounded-xl border border-black/10 bg-white p-1.5 text-gray-400 hover:text-gray-700 transition"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        <p className="mt-3 text-xs text-gray-600">
                            Share these credentials with the customer. The account has immediate access to the full Recruiter Dashboard with <strong>no email verification required</strong>.
                        </p>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="rounded-2xl border border-black/10 bg-white p-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Login Email</p>
                                    <p className="text-sm font-black text-gray-900 truncate">{createdAccount.email}</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(createdAccount.email, "email")}
                                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                                    title="Copy Email"
                                >
                                    {copiedField === "email" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                </button>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white p-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Initial Password</p>
                                    <p className="text-sm font-black font-mono text-gray-900">{createdAccount.plainPassword}</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(createdAccount.plainPassword, "password")}
                                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                                    title="Copy Password"
                                >
                                    {copiedField === "password" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                </button>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white p-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Assigned Role</p>
                                <p className="text-sm font-black text-purple-700">recruiter (Fixed)</p>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white p-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Access Expiration</p>
                                <p className="text-sm font-black text-emerald-700">
                                    {new Date(createdAccount.pilotExpiresAt).toLocaleDateString()} ({createdAccount.durationDays} Days)
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                                onClick={copyAllCredentials}
                                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95 cursor-pointer"
                            >
                                {copiedField === "all" ? <Check size={14} /> : <Copy size={14} />}
                                <span>{copiedField === "all" ? "Credentials Copied!" : "Copy Full Invitation Details"}</span>
                            </button>
                            <button
                                onClick={() => setCreatedAccount(null)}
                                className="rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                            >
                                Dismiss
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Pilot Recruiter Collapsible Form */}
            <AnimatePresence>
                {isCreateOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-gray-900">Provision New Pilot Recruiter</h3>
                                <p className="text-xs text-gray-500">Duration is strictly validated server-side between 1 and 10 days.</p>
                            </div>
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600">
                                Admin Provisioned
                            </span>
                        </div>

                        {formError && (
                            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-700">
                                <AlertCircle size={15} className="shrink-0 text-red-600" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Email */}
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Customer Email <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="customer@enterprise.com"
                                            className="w-full rounded-2xl border border-black/10 bg-[#fcfaf6] pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:bg-white transition"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Initial Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Key size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Min. 6 characters"
                                            className="w-full rounded-2xl border border-black/10 bg-[#fcfaf6] pl-10 pr-10 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:bg-white transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-700"
                                        >
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Contact Name */}
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Contact / Recruiter Name (Optional)
                                    </label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. John Doe"
                                            className="w-full rounded-2xl border border-black/10 bg-[#fcfaf6] pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:bg-white transition"
                                        />
                                    </div>
                                </div>

                                {/* Company Name */}
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Company / Enterprise Name (Optional)
                                    </label>
                                    <div className="relative">
                                        <Building size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={formData.companyName}
                                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                            placeholder="e.g. Acme Innovations"
                                            className="w-full rounded-2xl border border-black/10 bg-[#fcfaf6] pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:bg-white transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Role (Fixed) & Duration (1-10 days) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Assigned Role (Fixed)
                                    </label>
                                    <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-gray-50 px-4 py-2.5">
                                        <ShieldCheck size={16} className="text-purple-600" />
                                        <span className="text-xs font-black text-gray-800">recruiter</span>
                                        <span className="text-[10px] text-gray-400 font-medium">(Fixed by system security policy)</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Pilot Duration (1–10 Days) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.durationDays}
                                        onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                                        className="w-full rounded-2xl border border-black/10 bg-[#fcfaf6] px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-black focus:bg-white transition cursor-pointer"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                                            <option key={d} value={d}>
                                                {d} {d === 1 ? "Day" : "Days"} Access
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Submit & Cancel Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateOpen(false);
                                        setFormError("");
                                    }}
                                    className="rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex items-center gap-2 rounded-2xl bg-black px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-gray-800 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {creating ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Provisioning Pilot Account...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={14} />
                                            <span>Create Pilot Recruiter</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-2.5 shadow-2xs">
                {/* Status Tabs */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setFilterStatus("all")}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                            filterStatus === "all"
                                ? "bg-black text-white shadow-xs"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                        All Accounts ({accounts.length})
                    </button>
                    <button
                        onClick={() => setFilterStatus("active")}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                            filterStatus === "active"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                        Active ({activeCount})
                    </button>
                    <button
                        onClick={() => setFilterStatus("expired")}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                            filterStatus === "expired"
                                ? "bg-red-600 text-white shadow-xs"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                        Expired ({expiredCount})
                    </button>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by email or company..."
                        className="w-full rounded-xl border border-black/10 bg-[#fcfaf6] pl-9 pr-3 py-1.5 text-xs text-gray-900 outline-none focus:border-black focus:bg-white"
                    />
                </div>
            </div>

            {/* Accounts Listing */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <RefreshCw size={24} className="animate-spin mb-3 text-gray-500" />
                    <p className="text-xs font-bold uppercase tracking-widest">Loading Pilot Accounts...</p>
                </div>
            ) : filteredAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-3xl border border-dashed border-black/15 bg-white text-center p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-3">
                        <UserCheck size={24} />
                    </div>
                    <h3 className="text-sm font-black text-gray-900">No Pilot Accounts Found</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">
                        {searchQuery
                            ? "No accounts matched your search criteria."
                            : "There are no pilot accounts provisioned under this filter yet."}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="mt-4 flex items-center gap-2 rounded-2xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition"
                        >
                            <Plus size={14} /> Create First Pilot Account
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAccounts.map((account) => {
                        const isActive = account.status === "ACTIVE";
                        const expiresDate = account.pilotExpiresAt ? new Date(account.pilotExpiresAt) : null;

                        return (
                            <motion.div
                                key={account.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`rounded-3xl border p-5 transition-all bg-white ${
                                    isActive
                                        ? "border-black/10 hover:border-black/20 shadow-xs"
                                        : "border-red-500/20 bg-gradient-to-br from-white to-red-50/20 opacity-80"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-700">
                                            Recruiter
                                        </span>
                                        <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700">
                                            Pilot
                                        </span>
                                        {isActive ? (
                                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-700">
                                                Expired
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleDelete(account.id, account.email)}
                                        className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                        title="Delete Pilot Account"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>

                                <div className="mt-3">
                                    <h4 className="text-base font-black text-gray-900 truncate">
                                        {account.name || account.email.split("@")[0]}
                                    </h4>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                        <Mail size={12} className="text-gray-400" />
                                        <span className="truncate">{account.email}</span>
                                    </p>
                                    {account.company && (
                                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                            <Building size={12} className="text-gray-400" />
                                            <span className="font-semibold">{account.company}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 pt-3.5 border-t border-black/5 grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Created</p>
                                        <p className="font-semibold text-gray-700">
                                            {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Expires</p>
                                        <p className={`font-black ${isActive ? "text-emerald-700" : "text-red-600"}`}>
                                            {expiresDate ? expiresDate.toLocaleDateString() : "—"}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 rounded-2xl bg-[#fcfaf6] border border-black/5 p-2.5 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <Clock size={13} className={isActive ? "text-emerald-600" : "text-red-500"} />
                                        <span className="font-semibold text-[11px]">
                                            {isActive
                                                ? `${account.daysRemaining}d ${account.hoursRemaining}h remaining`
                                                : "Access Revoked (Expired)"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(account.email, `acc_${account.id}`)}
                                        className="text-[10px] font-bold text-gray-500 hover:text-black transition flex items-center gap-1 cursor-pointer"
                                    >
                                        {copiedField === `acc_${account.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                        <span>{copiedField === `acc_${account.id}` ? "Copied" : "Copy Email"}</span>
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PilotAccountsPanel;
