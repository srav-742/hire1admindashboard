import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Edit, Trash2, Link2, Search, Loader2, Image, Upload, 
    CheckCircle, XCircle, Clock, FileText, Eye, AlertCircle, 
    Bold, Italic, Link, Code, MessageSquare, Heading2, Heading3
} from 'lucide-react';
import { 
    adminGetBlogPosts, createBlogPost, updateBlogPost, 
    deleteBlogPost, uploadCoverImage, getBlogCategories 
} from '../../services/blogService';

export default function BlogPostsPanel() {
    // List & filter states
    const [posts, setPosts] = useState([]);
    const [totalPosts, setTotalPosts] = useState(0);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal & Editor states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [editorTitle, setEditorTitle] = useState('');
    const [editorSubtitle, setEditorSubtitle] = useState('');
    const [editorContent, setEditorContent] = useState('');
    const [editorCoverUrl, setEditorCoverUrl] = useState('');
    const [editorCategory, setEditorCategory] = useState('');
    const [editorTags, setEditorTags] = useState('');
    const [editorStatus, setEditorStatus] = useState('draft');
    const [editorPublishedAt, setEditorPublishedAt] = useState('');
    const [editorMetaTitle, setEditorMetaTitle] = useState('');
    const [editorMetaDesc, setEditorMetaDesc] = useState('');
    const [editorKeywords, setEditorKeywords] = useState('');
    const [editorSlug, setEditorSlug] = useState('');
    
    // UI Aux states
    const [uploadingImage, setUploadingImage] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [isSlugSynced, setIsSlugSynced] = useState(true);

    const textareaRef = useRef(null);

    // Fetch posts and categories
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await adminGetBlogPosts({
                page,
                limit: 10,
                status: statusFilter || undefined,
                search: search || undefined
            });
            setPosts(data.posts || []);
            setTotalPages(data.pages || 1);
            setTotalPosts(data.total || 0);

            const catData = await getBlogCategories();
            setCategories(catData.categories || []);
        } catch (err) {
            console.error('[ADMIN-BLOG] Failed to load data:', err);
            showFeedback('❌ Failed to load blog data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, statusFilter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchData();
    };

    // Slug generation utility
    const slugify = (text) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    };

    const handleTitleChange = (val) => {
        setEditorTitle(val);
        if (isSlugSynced) {
            setEditorSlug(slugify(val));
        }
    };

    const showFeedback = (msg, type = 'success') => {
        setStatusMsg(msg);
        setTimeout(() => setStatusMsg(''), 4000);
    };

    // Open create modal
    const openCreateModal = () => {
        setEditingPost(null);
        setEditorTitle('');
        setEditorSubtitle('');
        setEditorContent('');
        setEditorCoverUrl('');
        setEditorCategory('');
        setEditorTags('');
        setEditorStatus('draft');
        setEditorPublishedAt(new Date().toISOString().substring(0, 16));
        setEditorMetaTitle('');
        setEditorMetaDesc('');
        setEditorKeywords('');
        setEditorSlug('');
        setIsSlugSynced(true);
        setIsModalOpen(true);
    };

    // Open edit modal
    const openEditModal = (post) => {
        setEditingPost(post);
        setEditorTitle(post.title || '');
        setEditorSubtitle(post.subtitle || '');
        setEditorContent(post.content || '');
        setEditorCoverUrl(post.coverImage || '');
        setEditorCategory(post.category?.name || post.category || '');
        setEditorTags(post.tags ? post.tags.join(', ') : '');
        setEditorStatus(post.status || 'draft');
        setEditorPublishedAt(post.publishedAt ? new Date(post.publishedAt).toISOString().substring(0, 16) : '');
        setEditorMetaTitle(post.seo?.metaTitle || '');
        setEditorMetaDesc(post.seo?.metaDescription || '');
        setEditorKeywords(post.seo?.keywords ? post.seo.keywords.join(', ') : '');
        setEditorSlug(post.slug || '');
        setIsSlugSynced(false); // don't auto update existing slugs
        setIsModalOpen(true);
    };

    // Cloudinary Cover Image Upload
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const result = await uploadCoverImage(file);
            if (result.success && result.url) {
                setEditorCoverUrl(result.url);
                showFeedback('🖼️ Cover image uploaded to Cloudinary');
            } else {
                throw new Error("Invalid server response URL");
            }
        } catch (err) {
            console.error('[ADMIN-BLOG] Image upload failed:', err);
            showFeedback('❌ Failed to upload cover image', 'error');
        } finally {
            setUploadingImage(false);
        }
    };

    // Insert Markdown Helpers
    const insertMarkdown = (syntaxBefore, syntaxAfter = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        const replacement = syntaxBefore + selectedText + syntaxAfter;

        setEditorContent(
            text.substring(0, start) + replacement + text.substring(end)
        );

        // Reset cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + syntaxBefore.length,
                start + syntaxBefore.length + selectedText.length
            );
        }, 50);
    };

    // Save changes
    const handleSavePost = async (e) => {
        e.preventDefault();
        if (!editorTitle.trim() || !editorContent.trim()) {
            showFeedback('❌ Title and Content are required fields', 'error');
            return;
        }

        setActionLoading(true);
        try {
            const payload = {
                title: editorTitle,
                subtitle: editorSubtitle,
                content: editorContent,
                coverImage: editorCoverUrl,
                category: editorCategory.trim(),
                tags: editorTags.split(',').map(t => t.trim()).filter(Boolean),
                status: editorStatus,
                publishedAt: editorPublishedAt ? new Date(editorPublishedAt) : undefined,
                seo: {
                    metaTitle: editorMetaTitle,
                    metaDescription: editorMetaDesc,
                    keywords: editorKeywords.split(',').map(k => k.trim()).filter(Boolean)
                },
                slug: editorSlug
            };

            if (editingPost) {
                await updateBlogPost(editingPost._id, payload);
                showFeedback('🎉 Article updated successfully');
            } else {
                await createBlogPost(payload);
                showFeedback('🎉 Article created successfully');
            }

            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error('[ADMIN-BLOG] Save failed:', err);
            showFeedback('❌ Failed to save article', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Delete post
    const handleDeletePost = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this blog post?")) return;

        try {
            await deleteBlogPost(id);
            showFeedback('🗑️ Article deleted successfully');
            fetchData();
        } catch (err) {
            console.error('[ADMIN-BLOG] Delete failed:', err);
            showFeedback('❌ Failed to delete article', 'error');
        }
    };

    // Simple markdown-to-HTML parser (fallback preview)
    const renderMarkdownPreview = (md) => {
        if (!md) return '<p class="text-gray-400">Preview will render here as you type...</p>';
        // Sanity check escaping
        let html = md
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h4 class="text-base font-bold text-gray-950 mt-4 mb-2">$1</h4>');
        html = html.replace(/^## (.*$)/gim, '<h3 class="text-lg font-black text-gray-950 mt-5 mb-2">$1</h3>');
        html = html.replace(/^# (.*$)/gim, '<h2 class="text-2xl font-black text-gray-950 mt-6 mb-3">$1</h2>');

        // Bold & Italic
        html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-500 underline font-semibold">$1</a>');

        // Images
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-xl border border-black/10 max-h-72 object-cover my-4" />');

        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900 text-teal-400 font-mono text-xs p-4 rounded-xl my-4 overflow-x-auto">$1</pre>');
        html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 font-mono text-xs px-1.5 py-0.5 rounded text-red-500">$1</code>');

        // Blockquotes
        html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 py-1 my-4 italic text-gray-600 bg-gray-50 rounded-r-lg">$1</blockquote>');

        // Paragraphs (breaks)
        html = html.replace(/\n\s*\n/g, '</p><p class="text-gray-700 text-sm leading-relaxed mb-4">');

        return `<p class="text-gray-700 text-sm leading-relaxed mb-4">${html}</p>`;
    };

    // Calculate metrics
    const publishedCount = posts.filter(p => p.status === 'published').length;
    const draftCount = posts.filter(p => p.status === 'draft').length;
    const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);

    return (
        <div className="space-y-6">
            {/* Status Feedback Toast */}
            {statusMsg && (
                <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-black border border-white/10 text-white text-sm font-semibold shadow-2xl flex items-center gap-2 animate-fade">
                    <AlertCircle size={16} className="text-teal-400" />
                    {statusMsg}
                </div>
            )}

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Total Posts", value: totalPosts, color: "text-gray-950", bg: "bg-white border border-black/10" },
                    { label: "Published Articles", value: posts.filter(p => p.status === 'published').length + (statusFilter ? 0 : 0), countOverride: true, color: "text-emerald-600", bg: "bg-emerald-500/5 border-emerald-500/10" },
                    { label: "Drafts", value: posts.filter(p => p.status === 'draft').length, color: "text-amber-600", bg: "bg-amber-500/5 border-amber-500/10" },
                    { label: "Total Views", value: totalViews, color: "text-blue-600", bg: "bg-blue-500/5 border-blue-500/10" }
                ].map((stat, idx) => (
                    <div key={idx} className={`p-5 rounded-[1.75rem] text-center shadow-sm ${stat.bg}`}>
                        <p className={`text-3xl font-black ${stat.color}`}>{stat.countOverride ? posts.filter(p => p.status === 'published').length : stat.value}</p>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters & Actions Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-black/10 focus:border-black outline-none text-sm font-medium transition-all text-gray-900"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="px-6 py-3 rounded-2xl bg-black hover:bg-gray-900 text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                        Search
                    </button>
                </form>

                <div className="flex items-center gap-3">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-4 py-3 rounded-2xl bg-white border border-black/10 text-gray-900 text-sm font-semibold outline-none focus:border-black transition-all cursor-pointer"
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Drafts</option>
                        <option value="published">Published</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="archived">Archived</option>
                    </select>

                    <button
                        onClick={openCreateModal}
                        className="px-6 py-3 rounded-2xl bg-black hover:bg-gray-950 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-black/10"
                    >
                        <Plus size={14} /> Write Blog Post
                    </button>
                </div>
            </div>

            {/* Post Table */}
            {loading ? (
                <div className="flex items-center justify-center py-24 text-gray-500">
                    <Loader2 className="animate-spin mr-3 text-black" size={20} />
                    <span className="font-bold">Loading blog posts...</span>
                </div>
            ) : posts.length > 0 ? (
                <div className="bg-white rounded-[2rem] border border-black/10 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/10 bg-gray-50/50 text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    <th className="px-6 py-4">Article</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Views</th>
                                    <th className="px-6 py-4">Publish Date</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {posts.map((post) => (
                                    <tr key={post._id} className="hover:bg-[#faf9f6]/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {post.coverImage ? (
                                                    <img src={post.coverImage} alt="" className="w-10 h-10 rounded-xl object-cover border border-black/10 shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 border border-black/10 flex items-center justify-center text-gray-400 shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-950 text-sm truncate max-w-xs">{post.title}</p>
                                                    {post.subtitle && <p className="text-gray-400 text-xs truncate max-w-xs">{post.subtitle}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-gray-100 border border-black/5 text-gray-700 text-xs font-semibold">
                                                {post.category?.name || "Uncategorized"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {post.status === 'published' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                                    <CheckCircle size={10} /> Published
                                                </span>
                                            )}
                                            {post.status === 'draft' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-xs font-semibold">
                                                    <FileText size={10} /> Draft
                                                </span>
                                            )}
                                            {post.status === 'scheduled' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                                                    <Clock size={10} /> Scheduled
                                                </span>
                                            )}
                                            {post.status === 'archived' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                                                    <XCircle size={10} /> Archived
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                                            {post.views || 0}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(post)}
                                                    className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-black transition-colors"
                                                    title="Edit Post"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePost(post._id)}
                                                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                                                    title="Delete Post"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`https://hire1percent.com/blog/${post.slug}`);
                                                        showFeedback("🔗 Link copied to clipboard!");
                                                    }}
                                                    className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-black transition-colors"
                                                    title="Copy Article Link"
                                                >
                                                    <Link2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-black/10 flex justify-between items-center bg-gray-50/50">
                            <button
                                onClick={() => setPage(p => Math.max(p - 1, 1))}
                                disabled={page === 1}
                                className="px-4 py-2 rounded-xl bg-white border border-black/10 hover:bg-gray-50 disabled:opacity-50 text-xs font-bold text-gray-600 transition-all cursor-pointer"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-semibold text-gray-500">Page {page} of {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                disabled={page === totalPages}
                                className="px-4 py-2 rounded-xl bg-white border border-black/10 hover:bg-gray-50 disabled:opacity-50 text-xs font-bold text-gray-600 transition-all cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-20 bg-white border border-black/10 rounded-[2.5rem] text-gray-500 shadow-sm">
                    <FileText className="mx-auto mb-4 opacity-20" size={48} />
                    <p className="font-bold text-lg">No articles found</p>
                    <p className="text-sm mt-1">Get started by creating your first dynamic blog post.</p>
                </div>
            )}

            {/* Split Screen Editor Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#fcfaf6] w-full max-w-7xl h-[92vh] rounded-[2.5rem] border border-black/20 shadow-2xl flex flex-col overflow-hidden animate-zoom">
                        
                        {/* Modal Header */}
                        <div className="px-8 py-5 border-b border-black/10 bg-white flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-gray-950">{editingPost ? 'Edit Blog Post' : 'Write New Blog Post'}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Prepare premium, SEO-indexed content for your audience</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold bg-gray-50 hover:bg-gray-100 rounded-xl border border-black/10 text-gray-500 hover:text-black transition-all cursor-pointer"
                            >
                                Close Editor
                            </button>
                        </div>

                        {/* Modal Content - Dual Panel Split Screen */}
                        <form onSubmit={handleSavePost} className="flex-1 flex overflow-hidden min-h-0">
                            
                            {/* Left Panel - Write / Edit */}
                            <div className="w-1/2 flex flex-col border-r border-black/10 bg-white min-h-0">
                                
                                {/* Markdown helper toolbar */}
                                <div className="px-6 py-3 border-b border-black/5 bg-gray-50/50 flex flex-wrap gap-1.5">
                                    {[
                                        { icon: <Bold size={14} />, label: "Bold", action: () => insertMarkdown('**', '**') },
                                        { icon: <Italic size={14} />, label: "Italic", action: () => insertMarkdown('*', '*') },
                                        { icon: <Link size={14} />, label: "Link", action: () => insertMarkdown('[text](url)') },
                                        { icon: <Image size={14} />, label: "Image", action: () => insertMarkdown('![caption](url)') },
                                        { icon: <Code size={14} />, label: "Inline Code", action: () => insertMarkdown('`', '`') },
                                        { icon: <FileText size={14} />, label: "Code Block", action: () => insertMarkdown('```\n', '\n```') },
                                        { icon: <MessageSquare size={14} />, label: "Quote", action: () => insertMarkdown('> ') },
                                        { icon: <Heading2 size={14} />, label: "H2 Header", action: () => insertMarkdown('## ') },
                                        { icon: <Heading3 size={14} />, label: "H3 Header", action: () => insertMarkdown('### ') },
                                    ].map((btn, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={btn.action}
                                            className="p-2 rounded-lg hover:bg-gray-200/70 text-gray-500 hover:text-black transition-colors"
                                            title={btn.label}
                                        >
                                            {btn.icon}
                                        </button>
                                    ))}
                                </div>

                                {/* Text fields */}
                                <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Post Title</label>
                                        <input
                                            type="text"
                                            value={editorTitle}
                                            onChange={e => handleTitleChange(e.target.value)}
                                            placeholder="Enter article title..."
                                            className="w-full px-4 py-3 rounded-xl border border-black/10 outline-none focus:border-black font-bold text-gray-900"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subtitle / Excerpt</label>
                                        <input
                                            type="text"
                                            value={editorSubtitle}
                                            onChange={e => setEditorSubtitle(e.target.value)}
                                            placeholder="Enter brief summary or excerpt..."
                                            className="w-full px-4 py-3 rounded-xl border border-black/10 outline-none focus:border-black text-gray-700"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col space-y-1 min-h-[300px]">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Content (Markdown Format)</label>
                                            <span className="text-[10px] text-gray-400">{editorContent.length} chars</span>
                                        </div>
                                        <textarea
                                            ref={textareaRef}
                                            value={editorContent}
                                            onChange={e => setEditorContent(e.target.value)}
                                            placeholder="Write article details using Markdown syntax..."
                                            className="w-full flex-1 p-4 rounded-xl border border-black/10 outline-none focus:border-black resize-none font-mono text-sm leading-relaxed text-gray-800 custom-scrollbar"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Middle Panel - Render Live Preview */}
                            <div className="w-1/4 flex flex-col border-r border-black/10 bg-gray-50/50 min-h-0">
                                <div className="px-6 py-4 border-b border-black/5 flex items-center gap-2">
                                    <Eye size={14} className="text-gray-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live HTML Preview</span>
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white">
                                    {editorTitle && <h1 className="text-xl font-black text-gray-950 mb-1">{editorTitle}</h1>}
                                    {editorSubtitle && <p className="text-gray-400 text-xs italic mb-4">{editorSubtitle}</p>}
                                    {editorCoverUrl && (
                                        <img src={editorCoverUrl} alt="" className="w-full rounded-xl border border-black/10 max-h-40 object-cover mb-4" />
                                    )}
                                    <div 
                                        className="preview-content select-text prose prose-sm max-w-none" 
                                        dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(editorContent) }} 
                                    />
                                </div>
                            </div>
                            
                            {/* Right Panel - Settings & Metadata */}
                            <div className="w-1/4 p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar min-h-0 bg-[#fbf9f6]/40">
                                
                                {/* Status Controls */}
                                <div className="p-4 rounded-2xl bg-white border border-black/10 space-y-3 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-950">Publishing Command</h4>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Select Status</label>
                                        <select
                                            value={editorStatus}
                                            onChange={e => setEditorStatus(e.target.value)}
                                            className="w-full px-3 py-2 text-sm font-semibold rounded-xl bg-gray-50 border border-black/10 outline-none"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="published">Publish Immediately</option>
                                            <option value="scheduled">Scheduled Publish</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>

                                    {editorStatus === 'scheduled' && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Release Date & Time</label>
                                            <input
                                                type="datetime-local"
                                                value={editorPublishedAt}
                                                onChange={e => setEditorPublishedAt(e.target.value)}
                                                className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-gray-50 border border-black/10 outline-none"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Image Uploader */}
                                <div className="p-4 rounded-2xl bg-white border border-black/10 space-y-3 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-950">Cover Photo</h4>
                                    
                                    {editorCoverUrl ? (
                                        <div className="relative group rounded-xl overflow-hidden border border-black/15 bg-gray-100">
                                            <img src={editorCoverUrl} alt="" className="w-full h-32 object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <label className="p-2.5 rounded-full bg-white hover:bg-gray-100 text-gray-800 cursor-pointer shadow-lg">
                                                    <Upload size={16} />
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditorCoverUrl('')}
                                                    className="p-2.5 ml-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="border-2 border-dashed border-black/10 hover:border-black/30 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-gray-50/50">
                                            {uploadingImage ? (
                                                <Loader2 size={24} className="animate-spin text-gray-500 mb-2" />
                                            ) : (
                                                <Image size={24} className="text-gray-400 mb-2" />
                                            )}
                                            <span className="text-xs font-bold text-gray-700">Upload Cover Image</span>
                                            <span className="text-[10px] text-gray-400 mt-1">Cloudinary integration</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                                        </label>
                                    )}
                                </div>

                                {/* Category & Tags */}
                                <div className="p-4 rounded-2xl bg-white border border-black/10 space-y-3 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-950">Taxonomy</h4>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Category</label>
                                        <input
                                            type="text"
                                            value={editorCategory}
                                            onChange={e => setEditorCategory(e.target.value)}
                                            placeholder="e.g. AI Recruitment, Tech & Coding"
                                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 border border-black/10 outline-none text-gray-700"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Tags (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={editorTags}
                                            onChange={e => setEditorTags(e.target.value)}
                                            placeholder="e.g. AI, Recruitment, Interview"
                                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 border border-black/10 outline-none text-gray-700"
                                        />
                                    </div>
                                </div>

                                {/* URL Slug Customizer */}
                                <div className="p-4 rounded-2xl bg-white border border-black/10 space-y-3 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-gray-950">Article Slug</h4>
                                        <button
                                            type="button"
                                            onClick={() => setIsSlugSynced(!isSlugSynced)}
                                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border transition-all ${isSlugSynced ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-gray-100 text-gray-500 border-black/10'}`}
                                        >
                                            {isSlugSynced ? 'Auto Sync' : 'Manual'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={editorSlug}
                                        onChange={e => {
                                            setEditorSlug(e.target.value);
                                            setIsSlugSynced(false);
                                        }}
                                        placeholder="Article unique slug URL..."
                                        className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-gray-50 border border-black/10 outline-none text-gray-700"
                                        required
                                    />
                                    <p className="text-[9px] text-gray-400">Resolves to: `/blog/{editorSlug || 'slug'}`</p>
                                </div>

                                {/* SEO Metadata options */}
                                <div className="p-4 rounded-2xl bg-white border border-black/10 space-y-3 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-950">Search Engine Options (SEO)</h4>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Meta Title</label>
                                            <span className={`text-[8px] font-bold ${editorMetaTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                                                {editorMetaTitle.length}/60 chars
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={editorMetaTitle}
                                            onChange={e => setEditorMetaTitle(e.target.value)}
                                            placeholder="Enter optimized title tag..."
                                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 border border-black/10 outline-none text-gray-700"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Meta Description</label>
                                            <span className={`text-[8px] font-bold ${editorMetaDesc.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                                                {editorMetaDesc.length}/160 chars
                                            </span>
                                        </div>
                                        <textarea
                                            value={editorMetaDesc}
                                            onChange={e => setEditorMetaDesc(e.target.value)}
                                            placeholder="Enter search description excerpt..."
                                            rows={3}
                                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 border border-black/10 outline-none text-gray-700 resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">SEO Keywords (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={editorKeywords}
                                            onChange={e => setEditorKeywords(e.target.value)}
                                            placeholder="e.g. recruitment AI, career guide"
                                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 border border-black/10 outline-none text-gray-700"
                                        />
                                    </div>
                                </div>
                            </div>

                        </form>

                        {/* Modal Footer */}
                        <div className="px-8 py-4 border-t border-black/10 bg-white flex justify-end gap-3 items-center">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-3 rounded-2xl bg-white border border-black/10 hover:bg-gray-50 text-xs font-bold text-gray-500 transition-all cursor-pointer"
                            >
                                Discard Changes
                            </button>
                            <button
                                onClick={handleSavePost}
                                disabled={actionLoading}
                                className="px-8 py-3 rounded-2xl bg-black hover:bg-gray-900 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Saving...
                                    </>
                                ) : (
                                    <>
                                        Save & Release
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
