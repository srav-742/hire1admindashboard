import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Cropper from 'react-easy-crop';
import { 
    Plus, Edit, Trash2, Link2, Search, Loader2, Image as ImageIcon, Upload, 
    CheckCircle, XCircle, Clock, FileText, Eye, AlertCircle, 
    Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Code, Heading1, Heading2, Heading3,
    List, ListOrdered, CheckSquare, Quote, Minus, Video, Table as TableIcon,
    AlignLeft, AlignCenter, AlignRight, Highlighter, Crop, Trash2 as TrashIcon,
    X, Monitor, Tablet, Smartphone, AlertTriangle, Calendar, User, BookOpen,
    ArrowLeft, RotateCcw, Type, Hash
} from 'lucide-react';
import { 
    adminGetBlogPosts, createBlogPost, updateBlogPost, 
    deleteBlogPost, uploadCoverImage, getBlogCategories 
} from '../../services/blogService';
import './BlogPostsPanel.css';

/* ═══════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════ */
const CATEGORIES = [
    { value: '', label: 'Select Category...' },
    { value: 'technical-assessments', label: 'Interview Prep' },
    { value: 'ai-hiring', label: 'Tech Recruiting' },
    { value: 'engineering-hiring', label: 'Engineering' },
    { value: 'product-updates', label: 'Product Updates' },
];

const DEFAULT_TAGS = [
    'AI Hiring', 'Resume Screening', 'Assessment', 'ATS',
    'Recruitment', 'Developer Hiring', 'Automation', 'LLM'
];

const CTA_TYPES = [
    { value: 'none', label: 'None' },
    { value: 'book-demo', label: 'Book Demo' },
    { value: 'contact-sales', label: 'Contact Sales' },
    { value: 'learn-more', label: 'Learn More' },
];

const AUTO_SAVE_INTERVAL = 10000;
const META_TITLE_MAX = 60;
const META_DESC_MAX = 160;

/* ═══════════════════════════════════════════════════════════
   Helper Utilities
   ═══════════════════════════════════════════════════════════ */
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
        .substring(0, 120);
};

const calculateReadingTime = (html) => {
    if (!html) return '0 min read';
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text.split(' ').filter(w => w.length > 0).length;
    const minutes = Math.max(1, Math.ceil(words / 225));
    return `${minutes} min read`;
};

const countWords = (html) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.split(' ').filter(w => w.length > 0).length;
};

const extractTOCFromHTML = (html) => {
    if (!html) return [];
    const headings = [];
    const regex = /<(h[23])[^>]*>(.*?)<\/\1>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const level = parseInt(match[1][1]);
        const text = match[2].replace(/<[^>]*>/g, '').trim();
        const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
        headings.push({ level, text, id });
    }
    return headings;
};

const getCroppedImg = (imageSrc, crop) => {
    return new Promise((resolve) => {
        const image = new window.Image();
        image.crossOrigin = 'anonymous';
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = crop.width;
            canvas.height = crop.height;
            ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    resolve({ blob, url });
                }
            }, 'image/jpeg', 0.92);
        };
    });
};

/* ═══════════════════════════════════════════════════════════
   TipTap Editor Toolbar
   ═══════════════════════════════════════════════════════════ */
const EditorToolbar = ({ editor }) => {
    if (!editor) return null;

    const addImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const result = await uploadCoverImage(file);
                if (result.success && result.url) {
                    editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
                    return;
                }
            } catch (err) {
                console.warn('Image upload failed, using local URL:', err);
            }
            const reader = new FileReader();
            reader.onload = () => {
                editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const addLink = () => {
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
        }
    };

    const addVideo = () => {
        const url = window.prompt('Enter YouTube URL:');
        if (url) {
            editor.commands.setYoutubeVideo({ src: url });
        }
    };

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    return (
        <div className="blog-tiptap-toolbar">
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`blog-tiptap-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`} title="Heading 1"><Heading1 size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`blog-tiptap-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`} title="Heading 2"><Heading2 size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`blog-tiptap-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`} title="Heading 3"><Heading3 size={14} /></button>
            <div className="divider" />
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`blog-tiptap-btn ${editor.isActive('bold') ? 'active' : ''}`} title="Bold"><Bold size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`blog-tiptap-btn ${editor.isActive('italic') ? 'active' : ''}`} title="Italic"><Italic size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`blog-tiptap-btn ${editor.isActive('underline') ? 'active' : ''}`} title="Underline"><UnderlineIcon size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={`blog-tiptap-btn ${editor.isActive('highlight') ? 'active' : ''}`} title="Highlight"><Highlighter size={14} /></button>
            <div className="divider" />
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`blog-tiptap-btn ${editor.isActive('bulletList') ? 'active' : ''}`} title="Bullet List"><List size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`blog-tiptap-btn ${editor.isActive('orderedList') ? 'active' : ''}`} title="Numbered List"><ListOrdered size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`blog-tiptap-btn ${editor.isActive('taskList') ? 'active' : ''}`} title="Checklist"><CheckSquare size={14} /></button>
            <div className="divider" />
            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`blog-tiptap-btn ${editor.isActive('blockquote') ? 'active' : ''}`} title="Quote"><Quote size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`blog-tiptap-btn ${editor.isActive('codeBlock') ? 'active' : ''}`} title="Code Block"><Code size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="blog-tiptap-btn" title="Divider"><Minus size={14} /></button>
            <div className="divider" />
            <button type="button" onClick={addLink} className={`blog-tiptap-btn ${editor.isActive('link') ? 'active' : ''}`} title="Link"><LinkIcon size={14} /></button>
            <button type="button" onClick={addImage} className="blog-tiptap-btn" title="Insert Image"><ImageIcon size={14} /></button>
            <button type="button" onClick={addVideo} className="blog-tiptap-btn" title="Embed Video"><Video size={14} /></button>
            <button type="button" onClick={addTable} className="blog-tiptap-btn" title="Insert Table"><TableIcon size={14} /></button>
            <div className="divider" />
            <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`blog-tiptap-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`} title="Align Left"><AlignLeft size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`blog-tiptap-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`} title="Align Center"><AlignCenter size={14} /></button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`blog-tiptap-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`} title="Align Right"><AlignRight size={14} /></button>
            <div className="divider" />
            <button type="button" onClick={() => editor.chain().focus().undo().run()} className="blog-tiptap-btn" title="Undo"><RotateCcw size={14} /></button>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   Live Preview Panel
   ═══════════════════════════════════════════════════════════ */
const LivePreview = ({ formData, editorHTML, previewMode, setPreviewMode, isMobileModal = false }) => {
    const toc = useMemo(() => extractTOCFromHTML(editorHTML), [editorHTML]);
    const readTime = useMemo(() => calculateReadingTime(editorHTML), [editorHTML]);
    const categoryLabel = CATEGORIES.find(c => c.value === formData.category)?.label || formData.category || '';

    const Wrapper = isMobileModal ? 'div' : React.Fragment;
    const wrapperProps = isMobileModal ? { className: 'blog-mobile-preview-body' } : {};

    return (
        <>
            {!isMobileModal && (
                <div className="blog-preview-header">
                    <h4>Live Preview</h4>
                    <div className="blog-preview-modes">
                        {[
                            { key: 'desktop', icon: <Monitor size={12} /> },
                            { key: 'tablet', icon: <Tablet size={12} /> },
                            { key: 'mobile', icon: <Smartphone size={12} /> },
                        ].map(m => (
                            <button
                                key={m.key}
                                type="button"
                                className={`blog-preview-mode-btn ${previewMode === m.key ? 'active' : ''}`}
                                onClick={() => setPreviewMode(m.key)}
                            >
                                {m.icon}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <Wrapper {...wrapperProps}>
                <div className="blog-preview-content">
                    <div className={`blog-preview-frame ${previewMode}`}>
                        <div className="blog-preview-article">
                            {/* Premium Full-Width Cover Image Banner (No overlay text) */}
                            <div className="relative w-full h-[200px] overflow-hidden bg-slate-100">
                                {formData.coverImagePreview ? (
                                    <img src={formData.coverImagePreview} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-950" />
                                )}
                            </div>

                            {/* Overlapping Header Card */}
                            <div className="relative z-10 -mt-10 px-4">
                                <div className="bg-white border border-slate-100 rounded-2xl shadow-md p-6 text-center space-y-4">
                                    <div>
                                        <span className="inline-block px-2.5 py-1 rounded bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest">
                                            {categoryLabel || 'Insights'}
                                        </span>
                                    </div>

                                    <h2 className="text-slate-900 text-base md:text-lg font-extrabold leading-tight tracking-tight">
                                        {formData.title || 'Untitled Article'}
                                    </h2>

                                    {formData.subtitle && (
                                        <p className="text-slate-500 text-xs font-normal line-clamp-2">
                                            {formData.subtitle}
                                        </p>
                                    )}

                                    {/* Metadata */}
                                    <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                        <span>By Hire1Percent Team</span>
                                        <span className="text-slate-200">|</span>
                                        <span>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        <span className="text-slate-200">|</span>
                                        <span>{readTime}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="preview-body" style={{ padding: '20px 24px' }}>
                                {/* Table of Contents */}
                                {toc.length > 0 && (
                                    <div className="blog-preview-toc">
                                        <h5>Table of Contents</h5>
                                        <ul>
                                            {toc.map((item, i) => (
                                                <li key={i} style={{ paddingLeft: `${(item.level - 2) * 14}px` }}>
                                                    <a href={`#${item.id}`}>{item.text}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Article Content */}
                                {editorHTML && <div className="preview-content" dangerouslySetInnerHTML={{ __html: editorHTML }} />}


                            </div>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </>
    );
};

/* ═══════════════════════════════════════════════════════════
   Main BlogPostsPanel Component
   ═══════════════════════════════════════════════════════════ */
export default function BlogPostsPanel() {
    // List Dashboard States
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [existingFeatured, setExistingFeatured] = useState(null);

    // Toggle Editor Mode State
    const [showEditor, setShowEditor] = useState(false);
    const [editingPostId, setEditingPostId] = useState(null);

    // ─── Editor Form State ──────────────────────────────────
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        slug: '',
        slugManual: false,
        category: '',
        tags: [],
        coverImage: null,
        coverImagePreview: '',
        coverAltText: '',
        coverCaption: '',
        status: 'draft',
        scheduledDate: '',
        scheduledTime: '',
        isFeatured: false,
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
        ogImage: null,
        ogImagePreview: '',
        canonicalUrl: '',
        ctaType: 'none',
        ctaHeading: '',
        ctaDescription: '',
        ctaButtonText: '',
        ctaButtonLink: '',
    });

    // Editor UI States
    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [publishing, setPublishing] = useState(false);
    const [previewMode, setPreviewMode] = useState('desktop');
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImage, setCropImage] = useState('');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [tagInput, setTagInput] = useState('');
    const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: 'success' });
    const [deleteModal, setDeleteModal] = useState({ show: false, postId: null, postTitle: '' });
    const [deleting, setDeleting] = useState(false);

    const dirtyRef = useRef(false);
    const autoSaveTimerRef = useRef(null);
    const fileInputRef = useRef(null);
    const ogFileInputRef = useRef(null);

    // ─── TipTap Rich Text Editor Config ──────────────────────
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                codeBlock: false,
            }),
            Image.configure({ inline: false, allowBase64: true }),
            Link.configure({ openOnClick: false, autolink: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Underline,
            TaskList,
            TaskItem.configure({ nested: true }),
            Placeholder.configure({ placeholder: 'Start typing Hire1Percent insights here...' }),
            Youtube.configure({ width: 640, height: 360 }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Highlight,
        ],
        content: '',
        onUpdate: () => {
            dirtyRef.current = true;
        },
    });

    const editorHTML = editor?.getHTML() || '';

    // Fetch Dashboard Posts List
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await adminGetBlogPosts({
                page,
                limit: 20
            });
            if (res && res.posts) {
                setPosts(res.posts);
                setTotalPages(res.pages || 1);
            } else if (Array.isArray(res)) {
                setPosts(res);
            } else {
                const localPosts = localStorage.getItem('local_blog_posts');
                if (localPosts) {
                    setPosts(JSON.parse(localPosts));
                } else {
                    const mock = getMockPosts();
                    localStorage.setItem('local_blog_posts', JSON.stringify(mock));
                    setPosts(mock);
                }
            }
        } catch (err) {
            console.warn("[ADMIN-BLOG] Fetch failed, fallback to mock data:", err);
            const localPosts = localStorage.getItem('local_blog_posts');
            if (localPosts) {
                setPosts(JSON.parse(localPosts));
            } else {
                setPosts(prev => {
                    if (prev.length > 0) return prev;
                    const mock = getMockPosts();
                    localStorage.setItem('local_blog_posts', JSON.stringify(mock));
                    return mock;
                });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [page]);

    // Load single post for editing
    const openEdit = async (post) => {
        setEditingPostId(post._id || post.id);
        setFormData({
            title: post.title || '',
            subtitle: post.subtitle || '',
            slug: post.slug || '',
            slugManual: true,
            category: post.category?.slug || post.category || '',
            tags: post.tags || [],
            coverImage: null,
            coverImagePreview: post.coverImage || '',
            coverAltText: post.coverAltText || '',
            coverCaption: post.coverCaption || '',
            status: post.status || 'draft',
            scheduledDate: post.scheduledAt ? new Date(post.scheduledAt).toISOString().split('T')[0] : '',
            scheduledTime: post.scheduledAt ? new Date(post.scheduledAt).toTimeString().slice(0, 5) : '',
            isFeatured: post.isFeatured || false,
            seoTitle: post.seo?.metaTitle || '',
            seoDescription: post.seo?.metaDescription || '',
            seoKeywords: post.seo?.keywords?.join(', ') || '',
            ogImage: null,
            ogImagePreview: post.seo?.ogImage || '',
            canonicalUrl: post.seo?.canonicalUrl || '',
            ctaType: post.cta?.type || 'none',
            ctaHeading: post.cta?.heading || '',
            ctaDescription: post.cta?.description || '',
            ctaButtonText: post.cta?.buttonText || '',
            ctaButtonLink: post.cta?.buttonLink || '',
        });
        if (editor) {
            editor.commands.setContent(post.content || '');
        }
        dirtyRef.current = false;
        setShowEditor(true);
    };

    const openCreate = () => {
        setEditingPostId(null);
        setFormData({
            title: '',
            subtitle: '',
            slug: '',
            slugManual: false,
            category: '',
            tags: [],
            coverImage: null,
            coverImagePreview: '',
            coverAltText: '',
            coverCaption: '',
            status: 'draft',
            scheduledDate: '',
            scheduledTime: '',
            isFeatured: false,
            seoTitle: '',
            seoDescription: '',
            seoKeywords: '',
            ogImage: null,
            ogImagePreview: '',
            canonicalUrl: '',
            ctaType: 'none',
            ctaHeading: '',
            ctaDescription: '',
            ctaButtonText: '',
            ctaButtonLink: '',
        });
        if (editor) {
            editor.commands.setContent('');
        }
        dirtyRef.current = false;
        setShowEditor(true);
    };

    // Auto-generate slug
    useEffect(() => {
        if (!formData.slugManual && formData.title) {
            setFormData(prev => ({ ...prev, slug: slugify(formData.title) }));
        }
    }, [formData.title, formData.slugManual]);

    // Auto-save logic
    useEffect(() => {
        autoSaveTimerRef.current = setInterval(() => {
            if (dirtyRef.current && formData.title.trim() && showEditor) {
                handleSave(true);
            }
        }, AUTO_SAVE_INTERVAL);
        return () => clearInterval(autoSaveTimerRef.current);
    }, [formData, editingPostId, showEditor]);

    // Show status messages
    const triggerFeedback = (text, type = 'success') => {
        setFeedbackMsg({ text, type });
        setTimeout(() => setFeedbackMsg({ text: '', type: 'success' }), 4000);
    };

    // Update state fields
    const updateField = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        dirtyRef.current = true;
    }, []);

    // ─── Cover Image Upload ─────────────────────────────────
    const handleCoverUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            updateField('coverImage', file);
            updateField('coverImagePreview', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleCoverDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            updateField('coverImage', file);
            updateField('coverImagePreview', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = useCallback((_, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const applyCrop = async () => {
        if (!croppedAreaPixels || !cropImage) return;
        try {
            const { url } = await getCroppedImg(cropImage, croppedAreaPixels);
            updateField('coverImagePreview', url);
            setShowCropModal(false);
        } catch (err) {
            console.error('Crop failure:', err);
        }
    };

    const openCropModal = () => {
        if (formData.coverImagePreview) {
            setCropImage(formData.coverImagePreview);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setShowCropModal(true);
        }
    };

    // ─── Tags ───────────────────────────────────────────────
    const addTag = (tag) => {
        const trimmed = tag.trim();
        if (trimmed && !formData.tags.includes(trimmed)) {
            updateField('tags', [...formData.tags, trimmed]);
        }
        setTagInput('');
    };

    const removeTag = (tag) => {
        updateField('tags', formData.tags.filter(t => t !== tag));
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (tagInput.trim()) addTag(tagInput);
        } else if (e.key === 'Backspace' && !tagInput && formData.tags.length > 0) {
            removeTag(formData.tags[formData.tags.length - 1]);
        }
    };

    // ─── Build Payload ──────────────────────────────────────
    const buildPayload = useCallback(() => {
        const html = editor?.getHTML() || '';
        const payload = {
            title: formData.title,
            subtitle: formData.subtitle,
            slug: formData.slug,
            category: formData.category,
            tags: formData.tags,
            content: html,
            coverImage: formData.coverImagePreview,
            coverAltText: formData.coverAltText,
            coverCaption: formData.coverCaption,
            status: formData.status,
            isFeatured: formData.isFeatured,
            seo: {
                metaTitle: formData.seoTitle,
                metaDescription: formData.seoDescription,
                keywords: formData.seoKeywords.split(',').map(k => k.trim()).filter(Boolean),
                ogImage: formData.ogImagePreview || formData.coverImagePreview,
                canonicalUrl: formData.canonicalUrl,
            },
            cta: {
                type: formData.ctaType,
                heading: formData.ctaHeading,
                description: formData.ctaDescription,
                buttonText: formData.ctaButtonText,
                buttonLink: formData.ctaButtonLink,
            },
            authorName: 'Hire1Percent Team',
        };

        if (formData.status === 'scheduled' && formData.scheduledDate) {
            payload.scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime || '00:00'}`).toISOString();
        }

        return payload;
    }, [formData, editor]);

    // ─── Save / Auto Save ───────────────────────────────────
    const handleSave = useCallback(async (isAutoSave = false) => {
        if (!formData.title.trim()) return;

        setSaveStatus('saving');
        try {
            const payload = buildPayload();
            if (isAutoSave) payload.status = payload.status === 'published' ? 'published' : 'draft';

            let result;
            if (editingPostId) {
                result = await updateBlogPost(editingPostId, payload);
            } else {
                payload.status = 'draft';
                result = await createBlogPost(payload);
                if (result?._id || result?.post?._id) {
                    setEditingPostId(result._id || result.post._id);
                }
            }

            dirtyRef.current = false;
            setSaveStatus('saved');
            setLastSavedAt(new Date());
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error('Save failed:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 4000);
        }
    }, [formData, editingPostId, buildPayload]);

    // ─── Publish ────────────────────────────────────────────
    const handlePublish = async () => {
        setPublishing(true);
        try {
            const payload = buildPayload();
            payload.status = formData.status === 'scheduled' ? 'scheduled' : 'published';
            payload.publishedAt = formData.status === 'scheduled'
                ? new Date(`${formData.scheduledDate}T${formData.scheduledTime || '00:00'}`).toISOString()
                : new Date().toISOString();

            if (editingPostId) {
                await updateBlogPost(editingPostId, payload);
            } else {
                await createBlogPost(payload);
            }

            dirtyRef.current = false;
            triggerFeedback(formData.status === 'scheduled' ? '🎉 Post Scheduled Successfully' : '🎉 Post Published Successfully');
            setShowEditor(false);
            fetchDashboardData();
        } catch (err) {
            console.error('Publish failed:', err);
            triggerFeedback('❌ Failed to publish post', 'error');
        } finally {
            setPublishing(false);
        }
    };

    // ─── Delete ─────────────────────────────────────────────
    const handleDeleteClick = (e, post) => {
        e.stopPropagation();
        setDeleteModal({ show: true, postId: post._id || post.id, postTitle: post.title });
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteBlogPost(deleteModal.postId);
            triggerFeedback('🗑️ Article deleted successfully');
            
            const localPosts = localStorage.getItem('local_blog_posts');
            if (localPosts) {
                const updated = JSON.parse(localPosts).filter(p => (p._id || p.id) !== deleteModal.postId);
                localStorage.setItem('local_blog_posts', JSON.stringify(updated));
            }
            
            setPosts(prev => prev.filter(p => (p._id || p.id) !== deleteModal.postId));
            fetchDashboardData();
        } catch (err) {
            setPosts(prev => prev.filter(p => (p._id || p.id) !== deleteModal.postId));
            
            const localPosts = localStorage.getItem('local_blog_posts');
            if (localPosts) {
                const updated = JSON.parse(localPosts).filter(p => (p._id || p.id) !== deleteModal.postId);
                localStorage.setItem('local_blog_posts', JSON.stringify(updated));
            }
            
            triggerFeedback('🗑️ Article deleted successfully (Local Mode)');
        } finally {
            setDeleting(false);
            setDeleteModal({ show: false, postId: null, postTitle: '' });
        }
    };

    // ─── Validation Warnings ────────────────────────────────
    const warnings = useMemo(() => {
        const w = [];
        if (!formData.title.trim()) w.push('Title is required');
        if (!formData.subtitle.trim()) w.push('Subtitle / excerpt is required');
        if (!formData.category) w.push('Category not selected');
        if (!formData.coverImagePreview) w.push('Cover image is missing');
        if (formData.coverImagePreview && !formData.coverAltText.trim()) w.push('Cover image alt text is missing');
        if (!editorHTML || editorHTML === '<p></p>') w.push('Article content is empty');
        if (formData.seoTitle && formData.seoTitle.length > META_TITLE_MAX) w.push(`Meta title exceeds ${META_TITLE_MAX} characters`);
        if (formData.seoDescription && formData.seoDescription.length > META_DESC_MAX) w.push(`Meta description exceeds ${META_DESC_MAX} characters`);
        return w;
    }, [formData, editorHTML]);

    const seoTitlePercent = formData.seoTitle ? Math.min(100, (formData.seoTitle.length / META_TITLE_MAX) * 100) : 0;
    const seoDescPercent = formData.seoDescription ? Math.min(100, (formData.seoDescription.length / META_DESC_MAX) * 100) : 0;
    const seoMeterClass = (pct) => pct > 100 ? 'danger' : pct > 85 ? 'warning' : 'good';

    // Filters and search logic
    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title?.toLowerCase().includes(search.toLowerCase()) ||
                            post.subtitle?.toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
        
        const postCatSlug = typeof post.category === 'object' ? post.category.slug : post.category;
        const matchesCategory = categoryFilter === 'all' || postCatSlug === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    return (
        <div className="relative min-h-[500px]">
            {/* Status Toast */}
            {feedbackMsg.text && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl border text-sm font-semibold shadow-2xl flex items-center gap-2 animate-fade ${
                    feedbackMsg.type === 'error' ? 'bg-red-500 text-white border-red-600' : 'bg-black text-white border-white/10'
                }`}>
                    <AlertCircle size={16} />
                    {feedbackMsg.text}
                </div>
            )}

            {/* Editor Full Screen Toggle Overlay */}
            {showEditor ? (
                <div className="admin-blog-editor-view">
                    <div className="blog-editor-wrapper">
                        {/* Left Side: Forms */}
                        <div className="blog-editor-main">
                            <div className="blog-action-bar">
                                <div className="blog-action-bar-left">
                                    <button type="button" className="blog-btn blog-btn-ghost" onClick={() => setShowEditor(false)}>
                                        <ArrowLeft size={16} />
                                    </button>
                                    <div>
                                        <span className="text-sm font-bold text-gray-900">
                                            {editingPostId ? 'Edit Article' : 'New Article'}
                                        </span>
                                        <div className={`save-status ${saveStatus}`}>
                                            {saveStatus === 'saving' && <><Loader2 size={10} className="animate-spin" /> Auto Saving...</>}
                                            {saveStatus === 'saved' && <><span style={{ color: '#10b981' }}>✓</span> Draft Saved</>}
                                            {saveStatus === 'error' && <><span style={{ color: '#ef4444' }}>✕</span> Save Failed</>}
                                            {saveStatus === 'idle' && lastSavedAt && (
                                                <>Last saved {lastSavedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="blog-action-bar-right">
                                    <button type="button" className="blog-btn blog-btn-secondary" onClick={() => handleSave(false)}>
                                        Save Draft
                                    </button>
                                    <button
                                        type="button"
                                        className="blog-btn blog-btn-success"
                                        onClick={handlePublish}
                                        disabled={publishing || !formData.title.trim()}
                                    >
                                        {publishing ? <Loader2 size={14} className="animate-spin" /> : null}
                                        {formData.status === 'scheduled' ? 'Schedule' : 'Publish'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ maxWidth: '100%', padding: '24px 0' }}>


                                {/* Basic Info Card */}
                                <div className="blog-section-card">
                                    <div className="blog-section-title">Basic Information</div>
                                    <div className="blog-section-desc">Manage the blog title, slug, category, and custom tag fields.</div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">Title <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            className="blog-input title-input"
                                            placeholder="Enter your article title..."
                                            value={formData.title}
                                            onChange={(e) => updateField('title', e.target.value)}
                                        />
                                    </div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">Subtitle / Excerpt <span className="required">*</span></label>
                                        <textarea
                                            className="blog-textarea"
                                            placeholder="Short summary used in cards..."
                                            value={formData.subtitle}
                                            onChange={(e) => updateField('subtitle', e.target.value)}
                                        />
                                    </div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">
                                            Slug URL
                                            <button
                                                type="button"
                                                className="blog-btn blog-btn-ghost"
                                                style={{ padding: '2px 8px', fontSize: '10px', marginLeft: '4px' }}
                                                onClick={() => updateField('slugManual', !formData.slugManual)}
                                            >
                                                {formData.slugManual ? 'Auto' : 'Edit'}
                                            </button>
                                        </label>
                                        <input
                                            type="text"
                                            className="blog-input"
                                            value={formData.slug}
                                            onChange={(e) => updateField('slug', slugify(e.target.value))}
                                            readOnly={!formData.slugManual}
                                            style={{ fontFamily: "monospace", fontSize: '12px', opacity: formData.slugManual ? 1 : 0.7 }}
                                        />
                                        <div className="text-[11px] text-gray-400 mt-1">Preview: hire1percent.com/blog/{formData.slug || '...'}</div>
                                    </div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">Category <span className="required">*</span></label>
                                        <select
                                            className="blog-select"
                                            value={formData.category}
                                            onChange={(e) => updateField('category', e.target.value)}
                                        >
                                            {CATEGORIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">Tags</label>
                                        <div className="blog-tags-container" onClick={() => document.getElementById('tag-ip')?.focus()}>
                                            {formData.tags.map(tag => (
                                                <span key={tag} className="blog-tag">
                                                    {tag}
                                                    <button type="button" onClick={() => removeTag(tag)}>×</button>
                                                </span>
                                            ))}
                                            <input
                                                id="tag-ip"
                                                type="text"
                                                className="blog-tags-input"
                                                placeholder={formData.tags.length === 0 ? "Type and Enter..." : "Add..."}
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={handleTagKeyDown}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Author Card */}
                                <div className="blog-section-card">
                                    <div className="blog-section-title">Author</div>
                                    <div className="blog-section-desc">Displays editorial writer name. Non-editable.</div>
                                    <div className="blog-author-display">
                                        <div className="blog-author-avatar">H</div>
                                        <div className="blog-author-info">
                                            <h4>Hire1Percent Team</h4>
                                            <p>By Hire1Percent Team</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cover Media Card */}
                                <div className="blog-section-card">
                                    <div className="blog-section-title">Cover Media</div>
                                    <div className="blog-section-desc">Hero image displayed at the top of the post. Aspect ratio 1200 x 630px.</div>

                                    <div className="blog-field-group">
                                        <div
                                            className={`blog-cover-upload ${formData.coverImagePreview ? 'has-image' : ''}`}
                                            onClick={() => !formData.coverImagePreview && fileInputRef.current?.click()}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={handleCoverDrop}
                                        >
                                            {formData.coverImagePreview ? (
                                                <>
                                                    <img src={formData.coverImagePreview} alt="" className="blog-cover-preview" />
                                                    <div className="blog-cover-actions">
                                                        <button type="button" className="blog-cover-action-btn" onClick={(e) => { e.stopPropagation(); openCropModal(); }}><Crop size={14} /></button>
                                                        <button type="button" className="blog-cover-action-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}><Upload size={14} /></button>
                                                        <button type="button" className="blog-cover-action-btn danger" onClick={(e) => { e.stopPropagation(); updateField('coverImagePreview', ''); }}><Trash2 size={14} /></button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="py-4">
                                                    <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                                    <p className="text-xs font-bold text-gray-700">Click or drag image to upload cover</p>
                                                </div>
                                            )}
                                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
                                        </div>
                                    </div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">Alt Text <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            className="blog-input"
                                            placeholder="Recruiter conducting AI-powered technical interview"
                                            value={formData.coverAltText}
                                            onChange={(e) => updateField('coverAltText', e.target.value)}
                                        />
                                    </div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">Cover Caption</label>
                                        <input
                                            type="text"
                                            className="blog-input"
                                            placeholder="Hire1Percent AI Interview Dashboard"
                                            value={formData.coverCaption}
                                            onChange={(e) => updateField('coverCaption', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Rich Text Content Card */}
                                <div className="blog-section-card" style={{ padding: '28px 0 0' }}>
                                    <div style={{ padding: '0 28px' }}>
                                        <div className="blog-section-title">Article Content</div>
                                        <div className="blog-section-desc">TipTap premium Rich Text interface. Supports lists, dividers, tables, and embeds.</div>
                                    </div>

                                    <div className="blog-tiptap-editor-area" style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)', borderRadius: '0 0 20px 20px' }}>
                                        <EditorToolbar editor={editor} />
                                        <EditorContent editor={editor} />
                                        <div className="blog-editor-meta-bar">
                                            <div className="blog-editor-meta-item"><Type size={11} /> {countWords(editorHTML)} words</div>
                                            <div className="blog-editor-meta-item"><Clock size={11} /> {calculateReadingTime(editorHTML)}</div>
                                            <div className="blog-editor-meta-item"><Hash size={11} /> {extractTOCFromHTML(editorHTML).length} headings</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Publishing Status Card */}
                                <div className="blog-section-card">
                                    <div className="blog-section-title">Publishing options</div>
                                    <div className="blog-section-desc">Manage draft, instant publishing, or scheduled releases.</div>

                                    <div className="blog-field-group">
                                        <div className="blog-radio-group">
                                            {[
                                                { value: 'draft', label: 'Draft' },
                                                { value: 'published', label: 'Publish Immediately' },
                                                { value: 'scheduled', label: 'Schedule Post' },
                                            ].map(opt => (
                                                <div key={opt.value} className={`blog-radio-option ${formData.status === opt.value ? 'active' : ''}`} onClick={() => updateField('status', opt.value)}>
                                                    <input type="radio" checked={formData.status === opt.value} readOnly />
                                                    <label>{opt.label}</label>
                                                </div>
                                            ))}
                                        </div>

                                        {formData.status === 'scheduled' && (
                                            <div className="blog-schedule-row">
                                                <input type="date" value={formData.scheduledDate} onChange={(e) => updateField('scheduledDate', e.target.value)} className="blog-input" />
                                                <input type="time" value={formData.scheduledTime} onChange={(e) => updateField('scheduledTime', e.target.value)} className="blog-input" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="blog-field-group" style={{ marginTop: '16px' }}>
                                        <div className="blog-checkbox-row" onClick={() => updateField('isFeatured', !formData.isFeatured)}>
                                            <input type="checkbox" checked={formData.isFeatured} readOnly />
                                            <label>Featured Article</label>
                                        </div>
                                    </div>
                                </div>

                                {/* SEO Card */}
                                <div className="blog-section-card">
                                    <div className="blog-section-title">SEO Optimization</div>
                                    <div className="blog-section-desc">Meta configurations matching search algorithms.</div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">Meta Title</label>
                                        <input
                                            type="text"
                                            className="blog-input"
                                            placeholder="AI Resume Screening Guide (2026) | Hire1Percent"
                                            value={formData.seoTitle}
                                            onChange={(e) => updateField('seoTitle', e.target.value)}
                                        />
                                        <div className="blog-seo-meter">
                                            <div className="blog-seo-meter-bar">
                                                <div className={`blog-seo-meter-fill ${seoMeterClass(seoTitlePercent)}`} style={{ width: `${Math.min(100, seoTitlePercent)}%` }} />
                                            </div>
                                            <span className="blog-seo-meter-text">{formData.seoTitle.length}/{META_TITLE_MAX}</span>
                                        </div>
                                    </div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">Meta Description</label>
                                        <textarea
                                            className="blog-textarea"
                                            placeholder="Learn how AI-powered technical assessments..."
                                            value={formData.seoDescription}
                                            onChange={(e) => updateField('seoDescription', e.target.value)}
                                        />
                                        <div className="blog-seo-meter">
                                            <div className="blog-seo-meter-bar">
                                                <div className={`blog-seo-meter-fill ${seoMeterClass(seoDescPercent)}`} style={{ width: `${Math.min(100, seoDescPercent)}%` }} />
                                            </div>
                                            <span className="blog-seo-meter-text">{formData.seoDescription.length}/{META_DESC_MAX}</span>
                                        </div>
                                    </div>

                                    <div className="blog-field-group">
                                        <label className="blog-field-label">SEO Keywords</label>
                                        <input
                                            type="text"
                                            className="blog-input"
                                            placeholder="AI Hiring, ATS, Resume Screening"
                                            value={formData.seoKeywords}
                                            onChange={(e) => updateField('seoKeywords', e.target.value)}
                                        />
                                    </div>


                                </div>


                            </div>
                        </div>

                        {/* Right Side: Split Preview */}
                        <div className="blog-editor-preview-panel">
                            <LivePreview formData={formData} editorHTML={editorHTML} previewMode={previewMode} setPreviewMode={setPreviewMode} />
                        </div>
                    </div>

                    {/* Crop Modal */}
                    {showCropModal && (
                        <div className="blog-crop-modal-overlay">
                            <div className="blog-crop-modal">
                                <div className="blog-crop-modal-header">
                                    <h3>Crop Cover Photo</h3>
                                </div>
                                <div className="blog-crop-container">
                                    <Cropper
                                        image={cropImage}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={1200 / 630}
                                        onCropChange={setCrop}
                                        onZoomChange={setZoom}
                                        onCropComplete={handleCropComplete}
                                    />
                                </div>
                                <div className="blog-crop-modal-footer">
                                    <button type="button" className="blog-btn blog-btn-secondary" onClick={() => setShowCropModal(false)}>Cancel</button>
                                    <button type="button" className="blog-btn blog-btn-success" onClick={applyCrop}>Crop cover</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* List dashboard panel view */
                <div className="space-y-6">
                    {/* Stats metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Posts", value: posts.length, color: "text-gray-900", bg: "bg-white" },
                            { label: "Published Articles", value: posts.filter(p => p.status === 'published').length, color: "text-teal-600", bg: "bg-white" },
                            { label: "Drafts", value: posts.filter(p => p.status === 'draft' || !p.status).length, color: "text-amber-500", bg: "bg-white" },
                            { label: "Scheduled", value: posts.filter(p => p.status === 'scheduled').length, color: "text-blue-500", bg: "bg-white" }
                        ].map((stat, idx) => (
                            <div key={idx} className={`p-5 rounded-2xl border border-black/10 shadow-sm ${stat.bg}`}>
                                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filter and Action headers */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search articles by title..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-black/10 bg-white text-sm focus:outline-none focus:border-black/30"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-4 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 text-xs font-semibold outline-none cursor-pointer"
                            >
                                <option value="all">All Statuses</option>
                                <option value="published">Published</option>
                                <option value="draft">Drafts</option>
                                <option value="scheduled">Scheduled</option>
                            </select>

                            <button
                                onClick={openCreate}
                                className="px-5 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                            >
                                <Plus size={14} /> Write Blog Post
                            </button>
                        </div>
                    </div>

                    {/* Main post grid list */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Loader2 className="animate-spin mb-3 text-black" size={24} />
                            <span className="text-xs uppercase font-bold tracking-wider">Loading articles...</span>
                        </div>
                    ) : filteredPosts.length > 0 ? (
                        <div className="bg-white rounded-[2rem] border border-black/10 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-black/10 bg-gray-50/50 text-[10px] font-black uppercase tracking-wider text-gray-400">
                                            <th className="px-6 py-4 w-16">Cover</th>
                                            <th className="px-6 py-4 pl-4">Title</th>
                                            <th className="px-6 py-4 text-center">Category</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5">
                                        {filteredPosts.map((post) => (
                                            <tr key={post._id || post.id} className="hover:bg-[#faf7f1]/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="w-12 h-8 rounded-lg overflow-hidden border border-black/5 bg-gray-100 flex items-center justify-center shrink-0">
                                                        {post.coverImage ? (
                                                            <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FileText size={14} className="text-gray-400" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-900 text-sm line-clamp-1">{post.title}</span>
                                                            {post.isFeatured && (
                                                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase">Featured</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{post.subtitle || "No subtitle excerpt."}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-50 border border-black/5 text-gray-600">
                                                        {typeof post.category === 'object'
                                                            ? CATEGORIES.find(c => c.value === post.category.slug)?.label || post.category.name || 'Insights'
                                                            : CATEGORIES.find(c => c.value === post.category)?.label || post.category || 'Insights'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                                                        post.status === 'published' 
                                                        ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                                                        : post.status === 'scheduled'
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                        {post.status === 'published' ? 'Published' : post.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button onClick={() => openEdit(post)} className="p-2 rounded-lg bg-gray-50 border border-black/5 hover:bg-gray-100 text-gray-600 hover:text-black transition-colors" title="Edit Post">
                                                            <Edit size={12} />
                                                        </button>
                                                        <button onClick={(e) => handleDeleteClick(e, post)} className="p-2 rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors" title="Delete Post">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white border border-black/10 rounded-[2rem] text-gray-400">
                            <FileText size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold">No articles found</p>
                            <p className="text-xs mt-1">Start writing premium content by clicking "Write Blog Post" above.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal.show && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-black/10 p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-red-600 mb-2">Delete Article?</h3>
                        <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete "{deleteModal.postTitle}" permanently?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteModal({ show: false })} className="px-4 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-xs font-bold">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold">Delete Permanently</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getMockPosts() {
    return [
        {
            _id: 'mock-1',
            title: 'Why AI Resume Screening Alone Is No Longer Enough',
            subtitle: 'Modern recruiters receive thousands of AI-generated resumes every day. Learn why assessment-first hiring is becoming the new industry standard.',
            slug: 'why-ai-resume-screening-alone-is-no-longer-enough',
            category: 'ai-hiring',
            status: 'published',
            isFeatured: true,
            coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
            content: '<h2>The AI Resume Paradox</h2><p>Every day, recruitment channels are flooded with AI-optimized resumes that match jobs descriptions perfectly. However, coding and design skills don\'t translate automatically. Companies need robust technical assessments.</p>',
            publishedAt: new Date().toISOString()
        },
        {
            _id: 'mock-2',
            title: 'Top 5 CodeSignal Internal CMS Vetting Features for 2026',
            subtitle: 'Explore the internal CMS capabilities that help evaluate programming challenges, system design templates, and technical blogs at scale.',
            slug: 'top-5-codesignal-internal-cms-vetting-features',
            category: 'technical-assessments',
            status: 'draft',
            isFeatured: false,
            coverImage: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=300&q=80',
            content: '<p>Standard text fields aren\'t enough when designing technical mock interviews. Custom testing frameworks, sandboxed compilers, and interactive dashboards are key.</p>'
        },
        {
            _id: 'mock-3',
            title: 'Vetting Engineers with Realistic System Design Scenarios',
            subtitle: 'Static coding puzzles are out. Interactive whiteboard agents and architectural design reviews are the true test of high-level expertise.',
            slug: 'vetting-engineers-with-realistic-system-design-scenarios',
            category: 'engineering-hiring',
            status: 'scheduled',
            isFeatured: false,
            coverImage: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=300&q=80',
            content: '<h2>Architecting for Vetting</h2><p>Vetting elite candidates requires assessing their ability to build distributed systems, handle failure states, and justify trade-offs under pressure.</p>',
            scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString()
        }
    ];
}
