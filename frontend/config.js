// config.js
// Configurações do ambiente do Frontend - IFCE Posto de Saúde

const config = {
    // Definimos a URL base da API
    // Para integração futura com o Backend, altere para a URL real:
    API_BASE_URL: 'http://localhost:3000/api',
};

if (typeof window !== 'undefined') {
    window.appConfig = config;
}

if (typeof module !== 'undefined') {
    module.exports = config;
}
