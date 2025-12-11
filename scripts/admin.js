/**
 * Admin Panel Logic
 * Handles image management with session persistence and easy reordering
 */
const Admin = {
    isInitialized: false,
    products: [],
    metadata: {},
    productOrder: [],
    isReorderMode: false,

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

        // Reorder toggle button
        const reorderToggle = document.getElementById('reorderToggle');
        if (reorderToggle) {
            reorderToggle.addEventListener('click', () => this.toggleReorderMode());
        }
    },

    /**
     * Toggle reorder mode
     */
    toggleReorderMode() {
        this.isReorderMode = !this.isReorderMode;
        const toggle = document.getElementById('reorderToggle');
        const imagesGrid = document.getElementById('imagesGrid');

        if (this.isReorderMode) {
            toggle.classList.add('active');
            toggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Save Order</span>`;
            imagesGrid.classList.add('reorder-mode');
            this.attachReorderListeners();
            App.showToast('Use arrows to reorder. Tap "Save Order" when done.', 'success');
        } else {
            toggle.classList.remove('active');
            toggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg><span>Reorder Images</span>`;
            imagesGrid.classList.remove('reorder-mode');
            this.saveProductOrder();
        }
    },

    /**
     * Attach reorder arrow button listeners
     */
    attachReorderListeners() {
        const grid = document.getElementById('imagesGrid');

        // Move up buttons
        grid.querySelectorAll('.move-up-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const item = btn.closest('.image-item');
                const prev = item.previousElementSibling;
                if (prev) {
                    item.parentNode.insertBefore(item, prev);
                    this.flashItem(item);
                }
            };
        });

        // Move down buttons
        grid.querySelectorAll('.move-down-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const item = btn.closest('.image-item');
                const next = item.nextElementSibling;
                if (next) {
                    item.parentNode.insertBefore(next, item);
                    this.flashItem(item);
                }
            };
        });
    },

    /**
     * Flash item to show it moved
     */
    flashItem(item) {
        item.style.transform = 'scale(1.02)';
        item.style.boxShadow = '0 0 20px rgba(0, 180, 216, 0.5)';
        setTimeout(() => {
            item.style.transform = '';
            item.style.boxShadow = '';
        }, 200);
    },

    /**
     * Save product order to metadata
     */
    async saveProductOrder() {
        const grid = document.getElementById('imagesGrid');
        const items = grid.querySelectorAll('.image-item');
        const order = [...items].map(item => item.dataset.filename);

        try {
            this.metadata._order = order;
            await GitHubAPI.saveMetadata(this.metadata);
            App.showToast('Order saved!', 'success');
            App.loadProducts();
        } catch (error) {
            console.error('Failed to save order:', error);
            App.showToast('Failed to save order', 'error');
        }
    },

    /**
     * Check authentication status
     */
    checkAuth() {
        GitHubAPI.init();

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

    showLogin() {
        document.getElementById('adminLogin').classList.remove('hidden');
        document.getElementById('adminManager').classList.add('hidden');
    },

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
                    </div>
                `;
                return;
            }

            // Sort by saved order
            let sortedProducts = products;
            if (metadata._order && Array.isArray(metadata._order)) {
                sortedProducts = [...products].sort((a, b) => {
                    const indexA = metadata._order.indexOf(a.name);
                    const indexB = metadata._order.indexOf(b.name);
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                });
            }

            imagesGrid.innerHTML = sortedProducts.map((product, index) =>
                this.renderImageItem(product, index, sortedProducts.length)
            ).join('');

            this.attachImageEventListeners();
            if (this.isReorderMode) {
                this.attachReorderListeners();
            }

        } catch (error) {
            console.error('Failed to load products:', error);
            imagesGrid.innerHTML = '<p style="text-align: center; color: var(--error);">Failed to load images.</p>';
        }
    },

    /**
     * Render an image item with reorder arrows
     */
    renderImageItem(product, index, total) {
        const displayName = this.metadata[product.name] || '';
        const isVideo = CONFIG.VIDEO_EXTENSIONS.some(ext =>
            product.name.toLowerCase().endsWith(`.${ext}`)
        );
        const isFirst = index === 0;
        const isLast = index === total - 1;

        return `
            <div class="image-item" data-filename="${product.name}" data-sha="${product.sha}">
                <div class="reorder-arrows">
                    <button class="move-up-btn ${isFirst ? 'disabled' : ''}" ${isFirst ? 'disabled' : ''} title="Move up">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    </button>
                    <span class="position-badge">${index + 1}</span>
                    <button class="move-down-btn ${isLast ? 'disabled' : ''}" ${isLast ? 'disabled' : ''} title="Move down">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </button>
                </div>
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

        imagesGrid.querySelectorAll('.btn-save').forEach(btn => {
            btn.addEventListener('click', async () => {
                const imageItem = btn.closest('.image-item');
                const filename = imageItem.dataset.filename;
                const input = imageItem.querySelector('.image-name-input');
                await this.saveImageName(filename, input.value.trim(), btn);
            });
        });

        imagesGrid.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const imageItem = btn.closest('.image-item');
                const filename = imageItem.dataset.filename;
                const sha = imageItem.dataset.sha;

                if (confirm(`Delete "${filename}"?`)) {
                    await this.deleteImage(filename, sha, imageItem);
                }
            });
        });

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
            App.showToast('Failed to save', 'error');
        }

        btn.disabled = false;
        btn.textContent = originalText;
    },

    async deleteImage(filename, sha, imageItem) {
        const deleteBtn = imageItem.querySelector('.btn-delete');
        deleteBtn.disabled = true;
        deleteBtn.textContent = '...';

        try {
            await GitHubAPI.deleteImage(filename, sha);

            this.products = this.products.filter(p => p.name !== filename);
            delete this.metadata[filename];
            if (this.metadata._order) {
                this.metadata._order = this.metadata._order.filter(n => n !== filename);
            }

            imageItem.style.opacity = '0';
            imageItem.style.transform = 'scale(0.8)';
            setTimeout(() => imageItem.remove(), 300);

            App.showToast('Image deleted', 'success');
            App.loadProducts();

        } catch (error) {
            App.showToast('Failed to delete', 'error');
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete';
        }
    },

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

    logout() {
        GitHubAPI.clearToken();
        this.showLogin();
        App.closeAdminPanel();
        App.showToast('Logged out', 'success');
    },
};
