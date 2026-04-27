# Relatório Técnico de Conformidade - Projeto Agenda IFCE

Este documento atesta que o projeto cumpre integralmente os requisitos técnicos estabelecidos, detalhando a localização e a implementação de cada funcionalidade no código-fonte.

---

### A. Armazenar os dados com banco de dados Supabase em nuvem
O sistema utiliza o Supabase como Backend-as-a-Service, realizando consultas via SDK oficial.
- **Localização:** `backend/supabaseClient.js` (Configuração) e `backend/userController.js` (Consultas).
- **Código Exemplo:**
```javascript
// backend/supabaseClient.js (Linhas 1-9)
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)
```

### B. Salvar imagem em nuvem
As fotos de perfil e imagens do sistema são armazenadas no Supabase Storage (Buckets).
- **Localização:** `backend/userController.js` (Linhas 787-792).
- **Código Exemplo:**
```javascript
const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
    });
```

### C. Ter rota PUT que atualiza algum dado no BD
Implementada para atualização de status de agendamentos e prontuários.
- **Localização:** `backend/src/routes/userRoutes.js` (Linha 26) e `backend/userController.js` (Linhas 718-723).
- **Código Exemplo:**
```javascript
// backend/userController.js
const { data: atualizado, error } = await supabase
    .from("agendamentos")
    .update(updateData)
    .eq("id", id)
```

### D. Ter testes automatizados, usando JEST, para todas as rotas
Conjunto de testes que validam os endpoints da API.
- **Localização:** `backend/tests/routes.test.js`.
- **Comando de Execução:** `npm test`.

### E. Documentar a API no Readme.md
O arquivo principal contém a descrição de todos os endpoints e instruções de instalação.
- **Localização:** `README.md` (Seção "Endpoints da API").

### F. Criptografar a senha do usuário no banco
Utiliza a biblioteca `crypto` com algoritmo `sha512` e `salt` aleatório para máxima segurança.
- **Localização:** `backend/userController.js` (Linhas 11-15).
- **Código Exemplo:**
```javascript
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};
```

### G. Configurar o CORS, permitindo apenas requisição do mesmo servidor
Configuração de segurança para restringir acessos externos não autorizados.
- **Localização:** `backend/src/app.js` (Linhas 21-25).
- **Código Exemplo:**
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### H. Ter segundo fator de segurança (2FA) com código enviado por e-mail
Implementado no fluxo de login, exigindo validação de código de 6 dígitos.
- **Localização:** `backend/userController.js` (Linhas 108-122 e 741-772).
- **Interface:** Aprimorada com inputs de 6 dígitos no frontend (`login.html`).

### I. Ter rota para calcular distância entre dois pontos em um mapa
Utiliza a Fórmula de Haversine para precisão geográfica.
- **Localização:** `backend/userController.js` (Linhas 825-850).
- **Código Exemplo:**
```javascript
const R = 6371; // Raio da Terra em km
const dLat = (lat2 - lat1) * Math.PI / 180;
const dLon = (lon2 - lon1) * Math.PI / 180;
const a = Math.sin(dLat/2) * Math.sin(dLat/2) + ...
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const d = R * c;
```

---
**Documento gerado automaticamente pela IA de Engenharia de Software.**
