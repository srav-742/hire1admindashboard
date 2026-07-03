import axios from "axios";
import { API_URL, getAuthHeaders } from "../firebase";

/**
 * Get all blog posts for the admin dashboard (including drafts, published, scheduled)
 */
export const adminGetBlogPosts = async (params = {}) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/v1/admin/blogs`, {
        headers,
        params
    });
    return response.data;
};

/**
 * Create a new blog post
 */
export const createBlogPost = async (postData) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_URL}/v1/admin/blogs`, postData, {
        headers
    });
    return response.data;
};

/**
 * Update an existing blog post by ID
 */
export const updateBlogPost = async (id, postData) => {
    const headers = await getAuthHeaders();
    const response = await axios.put(`${API_URL}/v1/admin/blogs/${id}`, postData, {
        headers
    });
    return response.data;
};

/**
 * Delete a blog post by ID
 */
export const deleteBlogPost = async (id) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_URL}/v1/admin/blogs/${id}`, {
        headers
    });
    return response.data;
};

/**
 * Upload cover image buffer
 */
export const uploadCoverImage = async (file) => {
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append("image", file);

    const response = await axios.post(`${API_URL}/v1/admin/blogs/upload-cover`, formData, {
        headers: {
            ...headers,
            "Content-Type": "multipart/form-data"
        }
    });
    return response.data;
};

/**
 * Get dynamic list of categories
 */
export const getBlogCategories = async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/v1/blogs/categories`, { headers });
    return response.data;
};
