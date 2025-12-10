/**
 * Configuration for Sanmati Sales
 */
const CONFIG = {
    // GitHub Repository Settings
    GITHUB_USERNAME: 'pratikh6i',
    GITHUB_REPO: 'sanmatisales',
    PRODUCTS_FOLDER: 'products',

    // Contact Information
    WHATSAPP_NUMBER: '918530515022',

    // API URLs
    get GITHUB_API_URL() {
        return `https://api.github.com/repos/${this.GITHUB_USERNAME}/${this.GITHUB_REPO}/contents/${this.PRODUCTS_FOLDER}`;
    },

    get GITHUB_RAW_URL() {
        return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.GITHUB_REPO}/main/${this.PRODUCTS_FOLDER}`;
    },

    // Products metadata file
    PRODUCTS_JSON: 'products.json',

    // Local Storage Keys
    STORAGE_KEYS: {
        GITHUB_TOKEN: 'sanmati_github_token',
        PRODUCTS_METADATA: 'sanmati_products_metadata',
    },

    // Image Extensions
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],

    // Max file size (5MB)
    MAX_FILE_SIZE: 5 * 1024 * 1024,
};

// Make read-only
Object.freeze(CONFIG);
Object.freeze(CONFIG.STORAGE_KEYS);
