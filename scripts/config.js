/**
 * Configuration for Sanmati Sales
 */
const CONFIG = {
    // GitHub Repository Settings - USING SAME REPO FOR MEDIA
    GITHUB_USERNAME: 'pratikh6i',
    GITHUB_REPO: 'sanmatisales-poc-repo',  // Same repo for website and media
    MEDIA_FOLDER: 'media',                  // Folder for product images/videos

    // Contact Information
    WHATSAPP_NUMBER: '918530515022',

    // API URLs
    get GITHUB_API_URL() {
        return `https://api.github.com/repos/${this.GITHUB_USERNAME}/${this.GITHUB_REPO}/contents/${this.MEDIA_FOLDER}`;
    },

    get GITHUB_RAW_URL() {
        return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.GITHUB_REPO}/main/${this.MEDIA_FOLDER}`;
    },

    // Logo location
    get LOGO_URL() {
        return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.GITHUB_REPO}/main/assets/logo.png`;
    },

    // Products metadata file
    PRODUCTS_JSON: 'products.json',

    // Local Storage Keys
    STORAGE_KEYS: {
        GITHUB_TOKEN: 'sanmati_github_token_v2',      // Encrypted token storage
        PRODUCTS_METADATA: 'sanmati_products_metadata',
        SESSION_VALID: 'sanmati_session_valid',       // Session persistence
    },

    // Image Extensions
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],

    // Video Extensions
    VIDEO_EXTENSIONS: ['mp4', 'webm', 'mov'],

    // Max file size (10MB)
    MAX_FILE_SIZE: 10 * 1024 * 1024,

    // Map locations - 20+ pins around Kolhapur region
    MAP_LOCATIONS: [
        { name: 'Kolhapur', lat: 16.7050, lng: 74.2433 },
        { name: 'Sangli', lat: 16.8524, lng: 74.5815 },
        { name: 'Miraj', lat: 16.8184, lng: 74.6459 },
        { name: 'Ichalkaranji', lat: 16.6986, lng: 74.4597 },
        { name: 'Jaysingpur', lat: 16.7842, lng: 74.5453 },
        { name: 'Kumbhoj', lat: 16.7361, lng: 74.3708 },
        { name: 'Hatkanangle', lat: 16.7466, lng: 74.4345 },
        { name: 'Shirol', lat: 16.7287, lng: 74.6026 },
        { name: 'Kagal', lat: 16.5779, lng: 74.3156 },
        { name: 'Gadhinglaj', lat: 16.2307, lng: 74.3496 },
        { name: 'Kodoli', lat: 16.8753, lng: 74.2037 },
        { name: 'Panhala', lat: 16.8135, lng: 74.1124 },
        { name: 'Nipani', lat: 16.4024, lng: 74.3832 },
        { name: 'Athani', lat: 16.7265, lng: 75.0643 },
        { name: 'Tasgaon', lat: 17.0357, lng: 74.6051 },
        { name: 'Vita', lat: 17.2721, lng: 74.5378 },
        { name: 'Islampur', lat: 17.0622, lng: 74.2682 },
        { name: 'Rajaramnagar', lat: 16.7166, lng: 74.2269 },
        { name: 'Bhudargad', lat: 16.2899, lng: 74.1432 },
        { name: 'Peth Vadgaon', lat: 16.7308, lng: 74.2895 },
        { name: 'Rankala', lat: 16.6980, lng: 74.2278 },
        { name: 'Gandhinagar', lat: 16.7095, lng: 74.2452 },
    ],
};

// Make read-only
Object.freeze(CONFIG);
Object.freeze(CONFIG.STORAGE_KEYS);
