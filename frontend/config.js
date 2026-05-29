// config.js
// Configurações do ambiente do Frontend - IFCE Posto de Saúde

const config = {
    // Definimos a URL base da API dinamicamente para funcionar em localhost e em produção (Vercel)
    API_BASE_URL: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3000/api'),
};

if (typeof window !== 'undefined') {
    window.appConfig = config;
}

if (typeof module !== 'undefined') {
    module.exports = config;
}
