import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
    Database, Search, Filter, Plus, Play, CheckCircle2, XCircle, AlertCircle,
    Eye, Trash2, Users, Code2, Terminal, Check, Copy, Sparkles, Clock, Cpu,
    FileCode, ShieldCheck, ChevronDown, ChevronUp, RefreshCw, Loader2,
    ArrowUpRight, BookOpen, Layers, Lock, Unlock, X, CheckSquare, Square
} from "lucide-react";
import { API_URL, getAuthHeaders } from "../../firebase";

const QuestionBankPanel = () => {
    // Data states
    const [questions, setQuestions] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        draft: 0,
        byDifficulty: { LOW: 0, MEDIUM: 0, HIGH: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Filtering & Pagination states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [selectedTopic, setSelectedTopic] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modals
    const [inspectQuestion, setInspectQuestion] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [accessTargetQuestion, setAccessTargetQuestion] = useState(null);
    const [newRecruiterId, setNewRecruiterId] = useState("");

    // Action loading states
    const [actionLoading, setActionLoading] = useState(null);
    const [sandboxRunning, setSandboxRunning] = useState(false);
    const [sandboxResults, setSandboxResults] = useState(null);

    // Rejection prompt
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");

    // Multi-question selection for batch actions (2, 3, 4, 5, or N questions)
    const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());

    // New Question Form State
    const defaultQuestionForm = {
        title: "",
        slug: "",
        difficulty: "MEDIUM",
        approvalStatus: "APPROVED",
        topics: "",
        tags: "",
        description: "",
        inputFormat: "",
        outputFormat: "",
        constraints: "",
        marks: 10,
        functionSignature: {
            functionName: "solve",
            args: [{ name: "nums", type: "list[int]" }],
            returnType: "int"
        },
        starterCode: {
            python: "class Solution:\n    def solve(self, nums: list[int]) -> int:\n        # Write your solution here\n        pass\n\nif __name__ == '__main__':\n    import sys\n    lines = sys.stdin.read().splitlines()\n    # Parse input and call solution\n",
            javascript: "function solve(nums) {\n    // Write your solution here\n}\n\nconst fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\n"
        },
        referenceSolution: {
            python: "import sys\n\ndef solve():\n    lines = sys.stdin.read().splitlines()\n    if not lines: return\n    # Example implementation\n\nif __name__ == '__main__':\n    solve()\n"
        },
        testCases: [
            { input: "1 2 3\n", expectedOutput: "6\n", isHidden: false, category: "NORMAL", explanation: "Sample case 1" },
            { input: "0\n", expectedOutput: "0\n", isHidden: true, category: "EDGE_CASE", explanation: "Zero edge case" }
        ]
    };
    const [formData, setFormData] = useState(defaultQuestionForm);
    const [formSubmitting, setFormSubmitting] = useState(false);

    // Fetch stats
    const fetchStats = async () => {
        try {
            const headers = await getAuthHeaders();
            const res = await axios.get(`${API_URL}/question-bank/stats`, { headers });
            if (res.data?.success && res.data.stats) {
                setStats(res.data.stats);
            }
        } catch (err) {
            console.error("[QUESTION-BANK] Error fetching stats:", err);
        }
    };

    // Fetch questions list
    const fetchQuestions = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setErrorMsg("");

        try {
            const headers = await getAuthHeaders();
            const params = {
                page,
                limit: 25,
                search: searchQuery.trim() || undefined,
                difficulty: selectedDifficulty !== "ALL" ? selectedDifficulty : undefined,
                status: selectedStatus !== "ALL" ? selectedStatus : undefined,
                topic: selectedTopic !== "ALL" ? selectedTopic : undefined
            };

            const res = await axios.get(`${API_URL}/question-bank`, { headers, params });
            if (res.data?.success) {
                setQuestions(res.data.questions || []);
                setTotalPages(res.data.pagination?.totalPages || 1);
                setTotalCount(res.data.pagination?.total || 0);
            } else {
                setQuestions([]);
            }
        } catch (err) {
            console.error("[QUESTION-BANK] Error fetching questions:", err);
            setErrorMsg(err.response?.data?.message || "Failed to load questions from bank.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [page, selectedDifficulty, selectedStatus, selectedTopic]);

    // Handle Search Submit
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchQuestions();
    };

    // Auto-slugify when typing title in create form
    const handleTitleChange = (val) => {
        const slugified = val
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        setFormData(prev => ({
            ...prev,
            title: val,
            slug: prev.slug === '' || prev.slug === prev.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') ? slugified : prev.slug
        }));
    };

    // Approve question
    const handleApprove = async (id) => {
        setActionLoading(id + "_approve");
        try {
            const headers = await getAuthHeaders();
            await axios.post(`${API_URL}/question-bank/${id}/approve`, {}, { headers });
            setStatusMsg("✓ Question approved and available in bank!");
            setSelectedQuestionIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            await fetchQuestions();
            await fetchStats();
        } catch (err) {
            console.error("[QUESTION-BANK] Approve error:", err);
            setErrorMsg(err.response?.data?.message || "Failed to approve question.");
        } finally {
            setActionLoading(null);
            setTimeout(() => setStatusMsg(""), 4000);
        }
    };

    // Toggle single question selection for batch actions
    const toggleSelectQuestion = (id) => {
        setSelectedQuestionIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Toggle select all visible on current page
    const toggleSelectAllVisible = () => {
        if (selectedQuestionIds.size === questions.length && questions.length > 0) {
            setSelectedQuestionIds(new Set());
        } else {
            setSelectedQuestionIds(new Set(questions.map(q => q._id)));
        }
    };

    // Quick select all pending questions on the current page
    const selectAllPending = () => {
        const unapproved = questions.filter(q => q.approvalStatus !== 'APPROVED').map(q => q._id);
        setSelectedQuestionIds(new Set(unapproved));
        if (unapproved.length > 0) {
            setStatusMsg(`Selected ${unapproved.length} unapproved question(s)`);
            setTimeout(() => setStatusMsg(""), 2500);
        }
    };

    // Bulk approve selected questions (2, 3, 4, 5, or N questions)
    const handleBulkApprove = async () => {
        if (selectedQuestionIds.size === 0) return;
        setActionLoading("bulk_approve");
        try {
            const headers = await getAuthHeaders();
            const res = await axios.post(`${API_URL}/question-bank/bulk-approve`, {
                questionIds: Array.from(selectedQuestionIds)
            }, { headers });
            if (res.data?.success) {
                const count = res.data.modifiedCount ?? selectedQuestionIds.size;
                setStatusMsg(`✓ ${count} question(s) approved successfully!`);
                setSelectedQuestionIds(new Set());
                await fetchQuestions();
                await fetchStats();
            }
        } catch (err) {
            console.error("[QUESTION-BANK] Bulk approve error:", err);
            setErrorMsg(err.response?.data?.message || "Failed to bulk approve questions.");
        } finally {
            setActionLoading(null);
            setTimeout(() => setStatusMsg(""), 4000);
        }
    };

    // Reject question
    const handleReject = async (id) => {
        if (!rejectReason.trim()) {
            setErrorMsg("Please provide a reason for rejection.");
            setTimeout(() => setErrorMsg(""), 3000);
            return;
        }
        setActionLoading(id + "_reject");
        try {
            const headers = await getAuthHeaders();
            await axios.post(`${API_URL}/question-bank/${id}/reject`, { reason: rejectReason.trim() }, { headers });
            setStatusMsg("✓ Question marked as rejected.");
            setRejectingId(null);
            setRejectReason("");
            await fetchQuestions();
            await fetchStats();
        } catch (err) {
            console.error("[QUESTION-BANK] Reject error:", err);
            setErrorMsg(err.response?.data?.message || "Failed to reject question.");
        } finally {
            setActionLoading(null);
            setTimeout(() => setStatusMsg(""), 4000);
        }
    };

    // Archive / Delete question
    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
        setActionLoading(id + "_delete");
        try {
            const headers = await getAuthHeaders();
            await axios.delete(`${API_URL}/question-bank/${id}`, { headers });
            setStatusMsg("✓ Question removed from bank.");
            await fetchQuestions();
            await fetchStats();
        } catch (err) {
            console.error("[QUESTION-BANK] Delete error:", err);
            setErrorMsg(err.response?.data?.message || "Failed to delete question.");
        } finally {
            setActionLoading(null);
            setTimeout(() => setStatusMsg(""), 4000);
        }
    };

    // Run Sandbox Validation on Reference Solution
    const handleRunSandbox = async (id) => {
        setSandboxRunning(true);
        setSandboxResults(null);
        try {
            const headers = await getAuthHeaders();
            const res = await axios.post(`${API_URL}/question-bank/${id}/validate`, {}, { headers });
            if (res.data?.success) {
                setSandboxResults(res.data.validationResult);
                setStatusMsg(`Sandbox completed: ${res.data.validationResult.passed}/${res.data.validationResult.total} passed`);
                // Update question in inspect modal
                if (inspectQuestion && inspectQuestion._id === id) {
                    setInspectQuestion(res.data.question);
                }
                await fetchQuestions();
            } else {
                setErrorMsg(res.data?.message || "Validation failed.");
            }
        } catch (err) {
            console.error("[QUESTION-BANK] Sandbox validation error:", err);
            setErrorMsg(err.response?.data?.message || "Sandbox validation execution failed.");
        } finally {
            setSandboxRunning(false);
            setTimeout(() => setStatusMsg(""), 4000);
        }
    };

    // Grant Recruiter Access
    const handleGrantAccess = async () => {
        if (!accessTargetQuestion || !newRecruiterId.trim()) return;
        setActionLoading("grant_access");
        try {
            const headers = await getAuthHeaders();
            const res = await axios.post(`${API_URL}/question-bank/${accessTargetQuestion._id}/grant-access`, {
                recruiterIds: [newRecruiterId.trim()]
            }, { headers });
            if (res.data?.success) {
                setStatusMsg("✓ Access granted to recruiter!");
                setAccessTargetQuestion(res.data.question);
                setNewRecruiterId("");
                await fetchQuestions();
            }
        } catch (err) {
            console.error("[QUESTION-BANK] Grant access error:", err);
            setErrorMsg(err.response?.data?.message || "Failed to grant recruiter access.");
        } finally {
            setActionLoading(null);
            setTimeout(() => setStatusMsg(""), 4000);
        }
    };

    // Create New Question Submit
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.slug.trim() || !formData.description.trim()) {
            setErrorMsg("Please fill in title, slug, and problem description.");
            setTimeout(() => setErrorMsg(""), 4000);
            return;
        }

        setFormSubmitting(true);
        try {
            const headers = await getAuthHeaders();
            const payload = {
                title: formData.title.trim(),
                slug: formData.slug.trim(),
                difficulty: formData.difficulty,
                approvalStatus: formData.approvalStatus || "APPROVED",
                topics: formData.topics.split(",").map(t => t.trim()).filter(Boolean),
                tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
                description: formData.description,
                inputFormat: formData.inputFormat,
                outputFormat: formData.outputFormat,
                constraints: formData.constraints,
                marks: Number(formData.marks) || 10,
                functionSignature: formData.functionSignature,
                starterCode: formData.starterCode,
                referenceSolution: formData.referenceSolution,
                testCases: formData.testCases,
                supportedLanguages: ["python", "javascript", "java", "c++", "go"]
            };

            const res = await axios.post(`${API_URL}/question-bank`, payload, { headers });
            if (res.data?.success) {
                setStatusMsg("✓ New coding question posted successfully!");
                setIsCreateOpen(false);
                setFormData(defaultQuestionForm);
                await fetchQuestions();
                await fetchStats();
            }
        } catch (err) {
            console.error("[QUESTION-BANK] Create question error:", err);
            setErrorMsg(err.response?.data?.message || "Failed to create question.");
        } finally {
            setFormSubmitting(false);
            setTimeout(() => setStatusMsg(""), 4000);
        }
    };

    // Helper for safe array display
    const ensureArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split(/[,\s]+/).filter(Boolean);
        return [];
    };

    // Difficulty Pill styling
    const getDifficultyBadge = (diff) => {
        const d = (diff || "MEDIUM").toUpperCase();
        if (d === "LOW") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Low
                </span>
            );
        }
        if (d === "HIGH") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    High
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Medium
            </span>
        );
    };

    // Status Pill styling
    const getStatusBadge = (status) => {
        const s = (status || "DRAFT").toUpperCase();
        if (s === "APPROVED") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-800 border border-emerald-500/30">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Approved
                </span>
            );
        }
        if (s === "PENDING_REVIEW") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-800 border border-amber-500/30">
                    <Clock size={12} className="text-amber-600" /> Pending Review
                </span>
            );
        }
        if (s === "REJECTED") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-800 border border-rose-500/30">
                    <XCircle size={12} className="text-rose-600" /> Rejected
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                <FileCode size={12} className="text-slate-500" /> Draft
            </span>
        );
    };

    return (
        <div className="space-y-8 font-sans">
            {/* ─── Notification Alerts ─── */}
            <AnimatePresence>
                {statusMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm"
                    >
                        <span>{statusMsg}</span>
                        <button onClick={() => setStatusMsg("")} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-5 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between shadow-sm"
                    >
                        <span>{errorMsg}</span>
                        <button onClick={() => setErrorMsg("")} className="text-rose-600 hover:text-rose-900 cursor-pointer">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Top Stats Bar ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: "Total Questions", count: stats.total || 0, status: "ALL", color: "text-gray-900", bg: "bg-white border-black/10" },
                    { label: "Approved & Live", count: stats.approved || 0, status: "APPROVED", color: "text-emerald-600", bg: "bg-emerald-500/5 border-emerald-500/20" },
                    { label: "Pending Review", count: stats.pending || 0, status: "PENDING_REVIEW", color: "text-amber-600", bg: "bg-amber-500/5 border-amber-500/20" },
                    { label: "Rejected", count: stats.rejected || 0, status: "REJECTED", color: "text-rose-600", bg: "bg-rose-500/5 border-rose-500/20" },
                    { label: "Low Difficulty", count: stats.byDifficulty?.LOW || 0, diff: "LOW", color: "text-emerald-700", bg: "bg-slate-50 border-slate-200" },
                    { label: "Medium Diff.", count: stats.byDifficulty?.MEDIUM || 0, diff: "MEDIUM", color: "text-amber-700", bg: "bg-slate-50 border-slate-200" },
                    { label: "High Difficulty", count: stats.byDifficulty?.HIGH || 0, diff: "HIGH", color: "text-rose-700", bg: "bg-slate-50 border-slate-200" },
                ].map((s, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => {
                            if (s.status !== undefined) setSelectedStatus(s.status);
                            if (s.diff !== undefined) setSelectedDifficulty(s.diff);
                            setPage(1);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] cursor-pointer shadow-sm ${s.bg} ${
                            (s.status && selectedStatus === s.status) || (s.diff && selectedDifficulty === s.diff)
                                ? "ring-2 ring-black"
                                : ""
                        }`}
                    >
                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{s.label}</div>
                        <div className={`text-2xl font-black mt-1 ${s.color}`}>{s.count}</div>
                    </button>
                ))}
            </div>

            {/* ─── Search, Filters & Actions Bar ─── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-black/10 shadow-sm">
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search questions by title, slug, topic, or tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#faf7f1] border border-black/10 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                </form>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Difficulty Dropdown */}
                    <div className="flex items-center gap-1.5 bg-[#faf7f1] px-3 py-2 rounded-2xl border border-black/10">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Diff:</span>
                        <select
                            value={selectedDifficulty}
                            onChange={(e) => { setSelectedDifficulty(e.target.value); setPage(1); }}
                            className="bg-transparent text-xs font-bold text-gray-800 cursor-pointer focus:outline-none"
                        >
                            <option value="ALL">All Difficulties</option>
                            <option value="LOW">Low (Easy)</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High (Hard)</option>
                        </select>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-1.5 bg-[#faf7f1] px-3 py-2 rounded-2xl border border-black/10">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Status:</span>
                        <select
                            value={selectedStatus}
                            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                            className="bg-transparent text-xs font-bold text-gray-800 cursor-pointer focus:outline-none"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="APPROVED">Approved & Live</option>
                            <option value="PENDING_REVIEW">Pending Review</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={() => { fetchQuestions(true); fetchStats(); }}
                        disabled={refreshing}
                        className="p-3 rounded-2xl border border-black/10 bg-[#faf7f1] text-gray-700 hover:text-black hover:bg-gray-100 transition-all cursor-pointer"
                        title="Refresh Questions"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    </button>

                    {/* Post Question Button */}
                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all cursor-pointer shadow-md"
                    >
                        <Plus size={16} />
                        Post Question
                    </button>
                </div>
            </div>

            {/* ─── Question Cards List ─── */}
            {loading ? (
                <div className="py-20 text-center">
                    <Loader2 size={36} className="animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Central Question Bank...</p>
                </div>
            ) : questions.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-[2.5rem] border border-black/10 p-8 shadow-sm">
                    <Database size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-gray-800">No questions found</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                        Try adjusting your search query, difficulty, or status filter to see other questions.
                    </p>
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(""); setSelectedDifficulty("ALL"); setSelectedStatus("ALL"); setSelectedTopic("ALL"); }}
                        className="mt-4 px-4 py-2 rounded-2xl border border-black/10 bg-[#faf7f1] text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                        Reset Filters
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Multi-select and Count Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-black/10 text-xs font-semibold shadow-sm">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <button
                                type="button"
                                onClick={toggleSelectAllVisible}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-black/10 bg-[#faf7f1] hover:bg-gray-100 text-gray-800 transition-colors cursor-pointer"
                            >
                                {selectedQuestionIds.size === questions.length && questions.length > 0 ? (
                                    <CheckSquare size={16} className="text-emerald-600" />
                                ) : (
                                    <Square size={16} className="text-gray-400" />
                                )}
                                <span>
                                    {selectedQuestionIds.size === questions.length && questions.length > 0
                                        ? "Deselect All Visible"
                                        : `Select All Visible (${questions.length})`}
                                </span>
                            </button>

                            {questions.some(q => q.approvalStatus !== "APPROVED") && (
                                <button
                                    type="button"
                                    onClick={selectAllPending}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-900 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                >
                                    <Clock size={14} className="text-amber-600" />
                                    <span>
                                        Select All Unapproved ({questions.filter(q => q.approvalStatus !== "APPROVED").length})
                                    </span>
                                </button>
                            )}

                            {selectedQuestionIds.size > 0 && (
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                    {selectedQuestionIds.size} selected
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                            <span>Showing {questions.length} of {totalCount} question{totalCount !== 1 ? 's' : ''}</span>
                            <span>• Page {page} of {totalPages}</span>
                        </div>
                    </div>

                    {questions.map((q) => {
                        const topics = ensureArray(q.topics);
                        const testCaseCount = q.testCases?.length || 0;
                        const hiddenCount = q.testCases?.filter(tc => tc.isHidden)?.length || 0;
                        const isSelected = selectedQuestionIds.has(q._id);

                        return (
                            <div
                                key={q._id}
                                className={`bg-white rounded-[2rem] border transition-all space-y-4 p-6 shadow-sm ${
                                    isSelected
                                        ? "border-emerald-500/50 bg-emerald-500/[0.02] shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                                        : "border-black/10 hover:border-black/20"
                                }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Selection Checkbox + Details */}
                                    <div className="flex items-start gap-3.5 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleSelectQuestion(q._id)}
                                            className="mt-1 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                                            title={isSelected ? "Deselect question" : "Select question for bulk actions"}
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={20} className="text-emerald-600" />
                                            ) : (
                                                <Square size={20} className="text-gray-300 hover:text-gray-500" />
                                            )}
                                        </button>

                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {getDifficultyBadge(q.difficulty)}
                                                {getStatusBadge(q.approvalStatus)}
                                                {q.accessScope === "RESTRICTED" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                                        <Lock size={10} /> Restricted ({q.allowedRecruiters?.length || 0})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                                        <Unlock size={10} /> Public
                                                    </span>
                                                )}
                                                <span className="text-xs font-mono text-gray-400">/{q.slug}</span>
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                                                {q.title}
                                                {q.usageCount > 0 && (
                                                    <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                        Used in {q.usageCount} assessment{q.usageCount !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </h3>

                                            <p className="text-sm text-gray-600 line-clamp-2 max-w-4xl">
                                                {q.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        {/* Inspect & Test */}
                                        <button
                                            type="button"
                                            onClick={() => { setInspectQuestion(q); setSandboxResults(null); }}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/10 bg-[#faf7f1] text-xs font-bold text-gray-800 hover:bg-gray-100 hover:text-black transition-all cursor-pointer"
                                            title="Inspect & Test Sandbox"
                                        >
                                            <Eye size={14} className="text-indigo-600" />
                                            Inspect & Test
                                        </button>

                                        {/* Individual Approve Button */}
                                        {q.approvalStatus !== "APPROVED" ? (
                                            <button
                                                type="button"
                                                onClick={() => handleApprove(q._id)}
                                                disabled={actionLoading === q._id + "_approve"}
                                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                                                title="Approve this question for all recruiters"
                                            >
                                                {actionLoading === q._id + "_approve" ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Check size={14} />
                                                )}
                                                Approve
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                                <CheckCircle2 size={13} className="text-emerald-600" />
                                                <span>Live in Bank</span>
                                            </div>
                                        )}

                                        {/* Reject */}
                                        {q.approvalStatus !== "REJECTED" && rejectingId !== q._id && (
                                            <button
                                                type="button"
                                                onClick={() => { setRejectingId(q._id); setRejectReason(""); }}
                                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer"
                                                title="Reject Question"
                                            >
                                                <XCircle size={14} />
                                                Reject
                                            </button>
                                        )}

                                        {/* Manage Recruiter Access */}
                                        <button
                                            type="button"
                                            onClick={() => { setAccessTargetQuestion(q); setIsAccessModalOpen(true); }}
                                            className="p-2.5 rounded-xl border border-black/10 bg-[#faf7f1] text-gray-700 hover:text-black hover:bg-gray-100 transition-all cursor-pointer"
                                            title="Manage Recruiter Access"
                                        >
                                            <Users size={14} />
                                        </button>

                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(q._id, q.title)}
                                            disabled={actionLoading === q._id + "_delete"}
                                            className="p-2.5 rounded-xl border border-black/10 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                                            title="Delete Question"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Inline Rejection Form */}
                                {rejectingId === q._id && (
                                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                                        <div className="text-xs font-bold text-rose-900">Specify reason for rejecting this question:</div>
                                        <input
                                            type="text"
                                            placeholder="e.g. Ambiguous problem statement or missing test cases"
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            className="w-full px-4 py-2 text-xs rounded-xl border border-rose-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleReject(q._id)}
                                                disabled={actionLoading === q._id + "_reject"}
                                                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
                                            >
                                                Confirm Rejection
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                                                className="px-3 py-2 rounded-xl bg-white text-gray-700 text-xs font-bold hover:bg-gray-100 border border-gray-200 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom Metadata Strip */}
                                <div className="pt-3 border-t border-black/5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {topics.map((t, idx) => (
                                            <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-[#faf7f1] border border-black/5 text-[11px] font-semibold text-gray-700">
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-500">
                                        <span>Marks: <strong className="text-gray-900">{q.marks || 10} pts</strong></span>
                                        <span>Test Cases: <strong className="text-gray-900">{testCaseCount}</strong> ({testCaseCount - hiddenCount} visible, {hiddenCount} hidden)</span>
                                        {q.testCasesValidatedAt && (
                                            <span className="text-emerald-700 flex items-center gap-1 font-bold">
                                                <CheckCircle2 size={12} /> Sandbox Validated
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                            <button
                                type="button"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-4 py-2 rounded-xl border border-black/10 bg-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 cursor-pointer"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-bold text-gray-600 px-3">
                                {page} of {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="px-4 py-2 rounded-xl border border-black/10 bg-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    )}

                    {/* Sticky Bulk Action Bar for Approving 2, 3, 4, 5, or N questions */}
                    <AnimatePresence>
                        {selectedQuestionIds.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="sticky bottom-6 z-40 p-4 sm:p-5 rounded-2xl bg-gray-950 text-white shadow-2xl flex flex-wrap items-center justify-between gap-4 border border-white/10"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-extrabold text-sm flex items-center justify-center border border-emerald-500/30">
                                        {selectedQuestionIds.size}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white flex items-center gap-2">
                                            <span>{selectedQuestionIds.size} Question{selectedQuestionIds.size !== 1 ? 's' : ''} Selected</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-semibold">Bulk Action</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400">
                                            Approve in one click to make immediately live in recruiter job postings
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedQuestionIds(new Set())}
                                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
                                    >
                                        Clear Selection
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBulkApprove}
                                        disabled={actionLoading === "bulk_approve"}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                                    >
                                        {actionLoading === "bulk_approve" ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Check size={16} />
                                        )}
                                        <span>Approve Selected ({selectedQuestionIds.size})</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                 MODAL 1: INSPECT & SANDBOX TEST RUNNER
            ═══════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {inspectQuestion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="bg-white rounded-[2.5rem] border border-black/10 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl my-6"
                        >
                            {/* Modal Header */}
                            <div className="p-6 md:p-8 border-b border-black/10 flex items-start justify-between bg-gradient-to-r from-[#faf7f1] to-white">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        {getDifficultyBadge(inspectQuestion.difficulty)}
                                        {getStatusBadge(inspectQuestion.approvalStatus)}
                                        <span className="text-xs font-mono text-gray-400">/{inspectQuestion.slug}</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-950">{inspectQuestion.title}</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setInspectQuestion(null)}
                                    className="p-2.5 rounded-full bg-white border border-black/10 text-gray-500 hover:text-black hover:bg-gray-100 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-sm text-gray-800">
                                {/* Problem Statement */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Problem Description</h4>
                                    <div className="p-5 rounded-2xl bg-[#faf7f1] border border-black/5 whitespace-pre-wrap leading-relaxed font-sans">
                                        {inspectQuestion.description}
                                    </div>
                                </div>

                                {/* Constraints & I/O */}
                                {(inspectQuestion.constraints || inspectQuestion.inputFormat || inspectQuestion.outputFormat) && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {inspectQuestion.constraints && (
                                            <div className="p-4 rounded-xl bg-[#faf7f1] border border-black/5">
                                                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Constraints</div>
                                                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{inspectQuestion.constraints}</pre>
                                            </div>
                                        )}
                                        {inspectQuestion.inputFormat && (
                                            <div className="p-4 rounded-xl bg-[#faf7f1] border border-black/5">
                                                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Input Format</div>
                                                <div className="text-xs text-gray-700">{inspectQuestion.inputFormat}</div>
                                            </div>
                                        )}
                                        {inspectQuestion.outputFormat && (
                                            <div className="p-4 rounded-xl bg-[#faf7f1] border border-black/5">
                                                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Output Format</div>
                                                <div className="text-xs text-gray-700">{inspectQuestion.outputFormat}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Test Cases */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Test Cases ({inspectQuestion.testCases?.length || 0})
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => handleRunSandbox(inspectQuestion._id)}
                                            disabled={sandboxRunning}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                                        >
                                            {sandboxRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                            Run in Sandbox
                                        </button>
                                    </div>

                                    {/* Live Sandbox Results Banner */}
                                    {sandboxResults && (
                                        <div className={`p-4 rounded-2xl mb-4 border ${
                                            sandboxResults.failed === 0
                                                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                                : "bg-rose-50 border-rose-300 text-rose-900"
                                        }`}>
                                            <div className="flex items-center justify-between font-bold text-sm">
                                                <span className="flex items-center gap-2">
                                                    {sandboxResults.failed === 0 ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-rose-600" />}
                                                    Sandbox Result: {sandboxResults.status} ({sandboxResults.passed}/{sandboxResults.total} Passed)
                                                </span>
                                                <span className="text-xs font-mono">{sandboxResults.executionTime || 0}ms</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {inspectQuestion.testCases?.map((tc, idx) => (
                                            <div key={idx} className="p-3.5 rounded-xl border border-black/10 bg-[#faf7f1] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-700">#{idx + 1}</span>
                                                    {tc.isHidden ? (
                                                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-bold text-[10px] uppercase">Hidden</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">Public</span>
                                                    )}
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold text-[10px]">{tc.category || "BASIC"}</span>
                                                    {tc.validationStatus === "VALIDATED" && (
                                                        <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                                                            <CheckCircle2 size={12} /> Validated
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                                                    <div className="bg-white p-2 rounded-lg border border-black/5 overflow-x-auto">
                                                        <span className="text-gray-400 block text-[9px] uppercase font-bold mb-0.5">Input:</span>
                                                        {tc.input}
                                                    </div>
                                                    <div className="bg-white p-2 rounded-lg border border-black/5 overflow-x-auto">
                                                        <span className="text-gray-400 block text-[9px] uppercase font-bold mb-0.5">Expected Output:</span>
                                                        {tc.expectedOutput}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-black/10 bg-[#faf7f1] flex items-center justify-between">
                                <div className="text-xs text-gray-500 font-medium">
                                    ID: <span className="font-mono text-gray-700">{inspectQuestion._id}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {inspectQuestion.approvalStatus !== "APPROVED" && (
                                        <button
                                            type="button"
                                            onClick={() => { handleApprove(inspectQuestion._id); setInspectQuestion(null); }}
                                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                                        >
                                            Approve Question
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setInspectQuestion(null)}
                                        className="px-5 py-2.5 rounded-xl border border-black/10 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════════════
                 MODAL 2: POST / CREATE NEW QUESTION MODAL
            ═══════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="bg-white rounded-[2.5rem] border border-black/10 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl my-6"
                        >
                            {/* Modal Header */}
                            <div className="p-6 md:p-8 border-b border-black/10 flex items-center justify-between bg-gradient-to-r from-[#faf7f1] to-white">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                        <Database size={14} className="text-black" /> Question Bank Admin
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-950">Post New Coding Question</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="p-2.5 rounded-full bg-white border border-black/10 text-gray-500 hover:text-black hover:bg-gray-100 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleCreateSubmit} className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-sm">
                                {/* Title & Slug */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Question Title *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Find Peak Element in Array"
                                            value={formData.title}
                                            onChange={(e) => handleTitleChange(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#faf7f1] text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Unique Slug *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. find-peak-element"
                                            value={formData.slug}
                                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#faf7f1] text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                </div>

                                {/* Difficulty & Marks */}
                                {/* Difficulty & Marks & Status */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Difficulty Level
                                        </label>
                                        <select
                                            value={formData.difficulty}
                                            onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#faf7f1] text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                                        >
                                            <option value="LOW">Low (Easy)</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High (Hard)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Points / Marks
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={formData.marks}
                                            onChange={(e) => setFormData(prev => ({ ...prev, marks: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#faf7f1] text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Topics (comma separated)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Arrays, Binary Search"
                                            value={formData.topics}
                                            onChange={(e) => setFormData(prev => ({ ...prev, topics: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#faf7f1] text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Initial Status
                                        </label>
                                        <select
                                            value={formData.approvalStatus || "APPROVED"}
                                            onChange={(e) => setFormData(prev => ({ ...prev, approvalStatus: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                                        >
                                            <option value="APPROVED">Approved & Live</option>
                                            <option value="PENDING_REVIEW">Pending Review</option>
                                            <option value="DRAFT">Draft</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Problem Description */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Problem Description *
                                    </label>
                                    <textarea
                                        rows={5}
                                        required
                                        placeholder="Detailed problem statement with examples, edge cases, and expected behavior..."
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full p-4 rounded-xl border border-black/10 bg-[#faf7f1] text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black font-sans leading-relaxed"
                                    />
                                </div>

                                {/* Constraints & I/O */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Constraints</label>
                                        <input
                                            type="text"
                                            placeholder="1 <= n <= 10^5"
                                            value={formData.constraints}
                                            onChange={(e) => setFormData(prev => ({ ...prev, constraints: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[#faf7f1] text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Input Format</label>
                                        <input
                                            type="text"
                                            placeholder="First line contains N..."
                                            value={formData.inputFormat}
                                            onChange={(e) => setFormData(prev => ({ ...prev, inputFormat: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[#faf7f1] text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Output Format</label>
                                        <input
                                            type="text"
                                            placeholder="Print the single integer..."
                                            value={formData.outputFormat}
                                            onChange={(e) => setFormData(prev => ({ ...prev, outputFormat: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[#faf7f1] text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Test Cases Builder */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                                            Test Cases ({formData.testCases.length})
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                testCases: [...prev.testCases, { input: "", expectedOutput: "", isHidden: false, category: "NORMAL", explanation: "" }]
                                            }))}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/10 bg-[#faf7f1] hover:bg-gray-100 text-xs font-bold cursor-pointer"
                                        >
                                            <Plus size={14} /> Add Test Case
                                        </button>
                                    </div>

                                    {formData.testCases.map((tc, idx) => (
                                        <div key={idx} className="p-3.5 rounded-xl bg-[#faf7f1] border border-black/10 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-700">Test Case #{idx + 1}</span>
                                                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={tc.isHidden}
                                                            onChange={(e) => {
                                                                const updated = [...formData.testCases];
                                                                updated[idx].isHidden = e.target.checked;
                                                                setFormData(prev => ({ ...prev, testCases: updated }));
                                                            }}
                                                            className="rounded"
                                                        />
                                                        Hidden Case (scored, invisible to candidate)
                                                    </label>
                                                </div>
                                                {formData.testCases.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = formData.testCases.filter((_, i) => i !== idx);
                                                            setFormData(prev => ({ ...prev, testCases: updated }));
                                                        }}
                                                        className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Standard Input (STDIN)</span>
                                                    <textarea
                                                        rows={2}
                                                        value={tc.input}
                                                        onChange={(e) => {
                                                            const updated = [...formData.testCases];
                                                            updated[idx].input = e.target.value;
                                                            setFormData(prev => ({ ...prev, testCases: updated }));
                                                        }}
                                                        placeholder="Input data..."
                                                        className="w-full p-2 rounded-lg border border-black/10 bg-white font-mono text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Expected Output (STDOUT)</span>
                                                    <textarea
                                                        rows={2}
                                                        value={tc.expectedOutput}
                                                        onChange={(e) => {
                                                            const updated = [...formData.testCases];
                                                            updated[idx].expectedOutput = e.target.value;
                                                            setFormData(prev => ({ ...prev, testCases: updated }));
                                                        }}
                                                        placeholder="Expected output..."
                                                        className="w-full p-2 rounded-lg border border-black/10 bg-white font-mono text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Modal Actions */}
                                <div className="pt-4 border-t border-black/10 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="px-5 py-2.5 rounded-xl border border-black/10 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formSubmitting}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all cursor-pointer shadow-md disabled:opacity-40"
                                    >
                                        {formSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        Save & Post Question
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════════════
                 MODAL 3: RECRUITER ACCESS MANAGER MODAL
            ═══════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isAccessModalOpen && accessTargetQuestion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="bg-white rounded-[2.5rem] border border-black/10 max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Access Management</span>
                                    <h3 className="text-xl font-bold text-gray-950 mt-0.5">{accessTargetQuestion.title}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setIsAccessModalOpen(false); setAccessTargetQuestion(null); }}
                                    className="p-2 rounded-full border border-black/10 hover:bg-gray-100 cursor-pointer text-gray-500"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-[#faf7f1] border border-black/5 text-xs text-gray-700 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold">Current Access Scope:</span>
                                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                            accessTargetQuestion.accessScope === "RESTRICTED"
                                                ? "bg-purple-100 text-purple-700"
                                                : "bg-blue-100 text-blue-700"
                                        }`}>
                                            {accessTargetQuestion.accessScope || "PUBLIC"}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-[11px]">
                                        Public questions are accessible to all verified recruiters for attaching to assessments. Restricted questions are only visible to specific granted recruiters.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Grant Access to Recruiter User ID
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter recruiter UID or Mongo ID..."
                                            value={newRecruiterId}
                                            onChange={(e) => setNewRecruiterId(e.target.value)}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 bg-[#faf7f1] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleGrantAccess}
                                            disabled={!newRecruiterId.trim() || actionLoading === "grant_access"}
                                            className="px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
                                        >
                                            {actionLoading === "grant_access" ? <Loader2 size={14} className="animate-spin" /> : "Grant"}
                                        </button>
                                    </div>
                                </div>

                                {accessTargetQuestion.allowedRecruiters?.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                            Currently Permitted Recruiters ({accessTargetQuestion.allowedRecruiters.length})
                                        </div>
                                        <div className="max-h-36 overflow-y-auto space-y-1.5">
                                            {accessTargetQuestion.allowedRecruiters.map((rId, idx) => (
                                                <div key={idx} className="p-2 rounded-lg bg-[#faf7f1] border border-black/5 text-xs font-mono text-gray-700 flex items-center justify-between">
                                                    <span>{rId}</span>
                                                    <span className="text-[10px] text-emerald-600 font-bold">Active</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 border-t border-black/10 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setIsAccessModalOpen(false); setAccessTargetQuestion(null); }}
                                    className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuestionBankPanel;
