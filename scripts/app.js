/**
 * Main Application Logic
 * Handles public website functionality
 */
const App = {
    products: [],
    metadata: {},

    /**
     * Initialize the application
     */
    async init() {
        this.setupEventListeners();
        this.setupScrollEffects();
        await this.loadProducts();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const targetId = anchor.getAttribute('href');
                if (targetId === '#admin') {
                    e.preventDefault();
                    this.openAdminPanel();
                    return;
                }

                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Modal close
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.querySelector('.modal-backdrop').addEventListener('click', () => this.closeModal());

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Modal WhatsApp button
        document.getElementById('modalWhatsapp').addEventListener('click', () => {
            if (this.currentProduct) {
                this.openWhatsApp(this.currentProduct.displayName, this.currentProduct.rawUrl);
            }
        });
    },

    /**
     * Setup scroll effects
     */
    setupScrollEffects() {
        const header = document.getElementById('header');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    },

    /**
     * Load products from GitHub
     */
    async loadProducts() {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const productsGrid = document.getElementById('productsGrid');

        try {
            // Fetch products and metadata in parallel
            const [products, metadata] = await Promise.all([
                GitHubAPI.fetchProducts(),
                GitHubAPI.fetchMetadata(),
            ]);

            this.products = products;
            this.metadata = metadata;

            // Hide loading
            loadingState.classList.add('hidden');

            if (products.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            }

            // Render products
            productsGrid.innerHTML = products.map(product =>
                this.renderProductCard(product)
            ).join('');

            // Attach event listeners to cards
            productsGrid.querySelectorAll('.product-card').forEach((card, index) => {
                card.addEventListener('click', () => {
                    this.openProductModal(this.products[index]);
                });

                // WhatsApp button
                const whatsappBtn = card.querySelector('.action-btn');
                if (whatsappBtn) {
                    whatsappBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const product = this.products[index];
                        const displayName = this.getDisplayName(product.name);
                        this.openWhatsApp(displayName, product.rawUrl);
                    });
                }
            });

        } catch (error) {
            console.error('Failed to load products:', error);
            loadingState.innerHTML = `
                <p style="color: var(--error);">Failed to load products. Please try again later.</p>
            `;
        }
    },

    /**
     * Get display name for a product
     */
    getDisplayName(filename) {
        // Check metadata first
        if (this.metadata[filename]) {
            return this.metadata[filename];
        }

        // Parse filename
        let name = filename.replace(/\.[^/.]+$/, ''); // Remove extension

        // Remove common prefixes
        const prefixes = [
            /^Gemini_Generated_Image_/i,
            /^unnamed\s*\(?[\d]*\)?/i,
            /^product_/i,
            /^image_/i,
            /^IMG_/i,
            /^DSC_/i,
            /^\d+_/,
        ];

        prefixes.forEach(prefix => {
            name = name.replace(prefix, '');
        });

        // Clean up
        name = name.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

        // Title case
        name = name.replace(/\b\w/g, l => l.toUpperCase());

        // Default if too short
        if (name.length < 3) {
            name = 'Premium Tool';
        }

        return name;
    },

    /**
     * Render a product card
     */
    renderProductCard(product) {
        const displayName = this.getDisplayName(product.name);

        return `
            <article class="product-card" data-filename="${product.name}">
                <img 
                    class="product-card-image" 
                    src="${product.rawUrl}" 
                    alt="${displayName}"
                    loading="lazy"
                >
                <div class="product-card-overlay">
                    <h3 class="product-card-name">${displayName}</h3>
                    <div class="product-card-delivery">
                        <span>🚚</span>
                        <span>Home Delivery</span>
                    </div>
                </div>
                <div class="product-card-actions">
                    <button class="action-btn" title="Enquire on WhatsApp">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                        </svg>
                    </button>
                </div>
            </article>
        `;
    },

    /**
     * Open product modal
     */
    openProductModal(product) {
        const displayName = this.getDisplayName(product.name);
        this.currentProduct = { ...product, displayName };

        const modal = document.getElementById('productModal');
        const modalMedia = document.getElementById('modalMedia');
        const modalTitle = document.getElementById('modalTitle');

        modalMedia.innerHTML = `<img src="${product.rawUrl}" alt="${displayName}">`;
        modalTitle.textContent = displayName;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close product modal
     */
    closeModal() {
        const modal = document.getElementById('productModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentProduct = null;
    },

    /**
     * Open WhatsApp with pre-filled message
     */
    openWhatsApp(productName, imageUrl) {
        const message = `Hi! I'm interested in this product:

*${productName}*

📷 View Product: ${imageUrl}

🚚 Is home delivery available to my location?`;

        const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    },

    /**
     * Open admin panel
     */
    openAdminPanel() {
        const adminPanel = document.getElementById('adminPanel');
        adminPanel.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Initialize admin if needed
        if (typeof Admin !== 'undefined') {
            Admin.init();
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');

        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `${icons[type]}<span>${message}</span>`;

        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
