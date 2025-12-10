/**
 * Admin Panel Logic
 * Handles image management for store owner
 */
const Admin = {
    isInitialized: false,
    products: [],
    metadata: {},

    /**
     * Initialize admin panel
     */
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.setupEventListeners();
        this.checkAuth();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Logout button
        document.getElementById('adminLogout').addEventListener('click', () => this.logout());

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Upload zone
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        uploadZone.addEventListener('click', () => fileInput.click());

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            fileInput.value = ''; // Reset for same file selection
        });
    },

    /**
     * Check authentication status
     */
    checkAuth() {
        if (GitHubAPI.isAuthenticated()) {
            this.showManager();
            this.loadProducts();
        } else {
            this.showLogin();
        }
    },

    /**
     * Handle login form submission
     */
    async handleLogin() {
        const tokenInput = document.getElementById('githubToken');
        const token = tokenInput.value.trim();

        if (!token) {
            App.showToast('Please enter your GitHub token', 'error');
            return;
        }

        // Validate token
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Verifying...</span>';

        const isValid = await GitHubAPI.validateToken(token);

        if (isValid) {
            GitHubAPI.setToken(token);
            this.showManager();
            await this.loadProducts();
            App.showToast('Login successful!', 'success');
        } else {
            App.showToast('Invalid token or no repo access', 'error');
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Login</span>';
        tokenInput.value = '';
    },

    /**
     * Show login form
     */
    showLogin() {
        document.getElementById('adminLogin').classList.remove('hidden');
        document.getElementById('adminManager').classList.add('hidden');
    },

    /**
     * Show manager interface
     */
    showManager() {
        document.getElementById('adminLogin').classList.add('hidden');
        document.getElementById('adminManager').classList.remove('hidden');
    },

    /**
     * Load products in admin view
     */
    async loadProducts() {
        const imagesGrid = document.getElementById('imagesGrid');
        imagesGrid.innerHTML = '<div class="loading-state"><div class="loader"><div class="loader-ring"></div><div class="loader-ring"></div></div><p>Loading images...</p></div>';

        try {
            const [products, metadata] = await Promise.all([
                GitHubAPI.fetchProducts(),
                GitHubAPI.fetchMetadata(),
            ]);

            this.products = products;
            this.metadata = metadata;

            if (products.length === 0) {
                imagesGrid.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: var(--space-8);">No images yet. Upload your first product!</p>';
                return;
            }

            imagesGrid.innerHTML = products.map(product => this.renderImageItem(product)).join('');

            // Attach event listeners
            this.attachImageEventListeners();

        } catch (error) {
            console.error('Failed to load products:', error);
            imagesGrid.innerHTML = '<p style="text-align: center; color: var(--error);">Failed to load images.</p>';
        }
    },

    /**
     * Render an image item for admin
     */
    renderImageItem(product) {
        const displayName = this.metadata[product.name] || '';

        return `
            <div class="image-item" data-filename="${product.name}" data-sha="${product.sha}">
                <div class="image-preview">
                    <img src="${product.rawUrl}" alt="${displayName || product.name}">
                </div>
                <div class="image-controls">
                    <input 
                        type="text" 
                        class="image-name-input" 
                        placeholder="Enter display name..."
                        value="${displayName}"
                    >
                    <div class="image-actions">
                        <button class="btn-save" title="Save name">Save</button>
                        <button class="btn-delete" title="Delete image">Delete</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Attach event listeners to image items
     */
    attachImageEventListeners() {
        const imagesGrid = document.getElementById('imagesGrid');

        // Save buttons
        imagesGrid.querySelectorAll('.btn-save').forEach(btn => {
            btn.addEventListener('click', async () => {
                const imageItem = btn.closest('.image-item');
                const filename = imageItem.dataset.filename;
                const input = imageItem.querySelector('.image-name-input');
                const newName = input.value.trim();

                await this.saveImageName(filename, newName, btn);
            });
        });

        // Delete buttons
        imagesGrid.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const imageItem = btn.closest('.image-item');
                const filename = imageItem.dataset.filename;
                const sha = imageItem.dataset.sha;

                if (confirm(`Delete "${filename}"? This cannot be undone.`)) {
                    await this.deleteImage(filename, sha, imageItem);
                }
            });
        });

        // Enter key to save
        imagesGrid.querySelectorAll('.image-name-input').forEach(input => {
            input.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    const imageItem = input.closest('.image-item');
                    const filename = imageItem.dataset.filename;
                    const btn = imageItem.querySelector('.btn-save');

                    await this.saveImageName(filename, input.value.trim(), btn);
                }
            });
        });
    },

    /**
     * Save image display name
     */
    async saveImageName(filename, displayName, btn) {
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '...';

        try {
            // Update local metadata
            if (displayName) {
                this.metadata[filename] = displayName;
            } else {
                delete this.metadata[filename];
            }

            // Save to GitHub
            await GitHubAPI.saveMetadata(this.metadata);

            App.showToast('Name saved!', 'success');

            // Also update main app metadata
            App.metadata = { ...this.metadata };

        } catch (error) {
            console.error('Failed to save name:', error);
            App.showToast('Failed to save: ' + error.message, 'error');
        }

        btn.disabled = false;
        btn.textContent = originalText;
    },

    /**
     * Delete an image
     */
    async deleteImage(filename, sha, imageItem) {
        const deleteBtn = imageItem.querySelector('.btn-delete');
        deleteBtn.disabled = true;
        deleteBtn.textContent = '...';

        try {
            await GitHubAPI.deleteImage(filename, sha);

            // Remove from local data
            this.products = this.products.filter(p => p.name !== filename);
            delete this.metadata[filename];

            // Animate removal
            imageItem.style.opacity = '0';
            imageItem.style.transform = 'scale(0.8)';
            setTimeout(() => imageItem.remove(), 300);

            App.showToast('Image deleted', 'success');

            // Refresh main app
            App.loadProducts();

        } catch (error) {
            console.error('Failed to delete:', error);
            App.showToast('Failed to delete: ' + error.message, 'error');
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete';
        }
    },

    /**
     * Handle file uploads
     */
    async handleFiles(files) {
        if (!files || files.length === 0) return;

        const uploadProgress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        uploadProgress.classList.remove('hidden');

        const totalFiles = files.length;
        let completed = 0;
        let failed = 0;

        for (const file of files) {
            try {
                progressText.textContent = `Uploading ${file.name}...`;

                await GitHubAPI.uploadImage(file);
                completed++;

                const percent = Math.round((completed / totalFiles) * 100);
                progressFill.style.width = `${percent}%`;

            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
                failed++;
                App.showToast(`Failed to upload ${file.name}`, 'error');
            }
        }

        // Reset progress
        setTimeout(() => {
            uploadProgress.classList.add('hidden');
            progressFill.style.width = '0%';
        }, 1000);

        // Show result
        if (completed > 0) {
            App.showToast(`Uploaded ${completed} image${completed > 1 ? 's' : ''}!`, 'success');

            // Refresh both admin and main app
            await this.loadProducts();
            App.loadProducts();
        }
    },

    /**
     * Logout
     */
    logout() {
        GitHubAPI.clearToken();
        this.showLogin();

        // Close admin panel
        const adminPanel = document.getElementById('adminPanel');
        adminPanel.classList.add('hidden');
        document.body.style.overflow = '';

        App.showToast('Logged out', 'success');
    },
};

// Close admin panel when clicking close area
document.addEventListener('DOMContentLoaded', () => {
    // Add close button to admin header
    const adminHeader = document.querySelector('.admin-header');
    if (adminHeader) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-ghost';
        closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        closeBtn.style.marginRight = 'auto';
        closeBtn.style.marginLeft = '0';
        closeBtn.addEventListener('click', () => {
            document.getElementById('adminPanel').classList.add('hidden');
            document.body.style.overflow = '';
        });
        adminHeader.insertBefore(closeBtn, adminHeader.firstChild);
    }
});
