/**
 * Admin Panel Logic
 * Handles image management with session persistence
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
            fileInput.value = '';
        });
    },

    /**
     * Check authentication status - with session persistence
     */
    checkAuth() {
        // Re-initialize GitHubAPI to check stored token
        GitHubAPI.init();

        if (GitHubAPI.isAuthenticated()) {
            // Already authenticated from previous session
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

        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Verifying...</span>';

        const isValid = await GitHubAPI.validateToken(token);

        if (isValid) {
            GitHubAPI.setToken(token);
            this.showManager();
            await this.loadProducts();
            App.showToast('Login successful! Session saved.', 'success');
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
                imagesGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: var(--space-8); color: var(--gray-500);">
                        <p>No images yet. Upload your first product!</p>
                        <p style="font-size: var(--font-size-sm); margin-top: var(--space-2);">
                            Images will be stored in: <code>media/</code> folder
                        </p>
                    </div>
                `;
                return;
            }

            imagesGrid.innerHTML = products.map(product => this.renderImageItem(product)).join('');
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
        const isVideo = CONFIG.VIDEO_EXTENSIONS.some(ext =>
            product.name.toLowerCase().endsWith(`.${ext}`)
        );

        return `
            <div class="image-item" data-filename="${product.name}" data-sha="${product.sha}">
                <div class="image-preview">
                    ${isVideo
                ? `<video src="${product.rawUrl}" muted loop></video>`
                : `<img src="${product.rawUrl}" alt="${displayName || product.name}">`
            }
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
                        <button class="btn-delete" title="Delete">Delete</button>
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
                await this.saveImageName(filename, input.value.trim(), btn);
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
            if (displayName) {
                this.metadata[filename] = displayName;
            } else {
                delete this.metadata[filename];
            }

            await GitHubAPI.saveMetadata(this.metadata);
            App.showToast('Name saved!', 'success');
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

            this.products = this.products.filter(p => p.name !== filename);
            delete this.metadata[filename];

            imageItem.style.opacity = '0';
            imageItem.style.transform = 'scale(0.8)';
            imageItem.style.transition = 'all 0.3s ease';
            setTimeout(() => imageItem.remove(), 300);

            App.showToast('Image deleted', 'success');
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

        for (const file of files) {
            try {
                progressText.textContent = `Uploading ${file.name}...`;
                await GitHubAPI.uploadImage(file);
                completed++;
                progressFill.style.width = `${Math.round((completed / totalFiles) * 100)}%`;
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
                App.showToast(`Failed: ${file.name}`, 'error');
            }
        }

        setTimeout(() => {
            uploadProgress.classList.add('hidden');
            progressFill.style.width = '0%';
        }, 1000);

        if (completed > 0) {
            App.showToast(`Uploaded ${completed} file${completed > 1 ? 's' : ''}!`, 'success');
            await this.loadProducts();
            App.loadProducts();
        }
    },

    /**
     * Logout - clears session
     */
    logout() {
        GitHubAPI.clearToken();
        this.showLogin();
        App.closeAdminPanel();
        App.showToast('Logged out', 'success');
    },
};
