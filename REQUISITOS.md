# Mapeamento de Requisitos - API de Agendamento

Este documento especifica onde cada um dos requisitos do seminário foi implementado no código.

## Legenda de Arquivos
- **Controller:** `backend/userController.js`
- **Routes:** `backend/src/routes/userRoutes.js`
- **Middleware:** `backend/src/middlewares/appMiddleware.js`
- **Server:** `backend/src/server.js`

---

### A. Rota POST para '/logar'
- **Implementação:** `backend/src/routes/userRoutes.js:L9`
- **Lógica:** Função `login` em `backend/userController.js:L31`. Recebe email/senha e devolve um JWT.

### B. Rota GET para obter uma lista de itens
- **Implementação:** `backend/src/routes/userRoutes.js:15`
- **Lógica:** Função `getItens` em `backend/userController.js:63`. Retorna o array `itens`.

### C. Rota POST para inserir um novo item
- **Implementação:** `backend/src/routes/userRoutes.js:18`
- **Lógica:** Função `criarItem` em `backend/userController.js:68`. Adiciona ao array mockado.

### D. Rota DELETE para excluir um item
- **Implementação:** `backend/src/routes/userRoutes.js:21`
- **Lógica:** Função `deletarItem` em `backend/userController.js:77`. Remove do array pelo ID ou Código.

### F. Rota GET para pesquisar um item pelo código
- **Implementação:** `backend/src/routes/userRoutes.js:24`
- **Lógica:** Função `pesquisarItem` em `backend/userController.js:86`.

### D (Bis). Middleware de acesso apenas de Segunda à Sexta
- **Implementação:** `backend/src/middlewares/appMiddleware.js:10` (`workingDaysOnly`).
- **Aplicação:** Aplicado em `backend/src/routes/userRoutes.js:12`.

### E. Middleware que registra horário e rota
- **Implementação:** `backend/src/middlewares/appMiddleware.js:4` (`logRequest`).
- **Armazenamento:** Os dados são salvos no array `logsRequisicoes` via função `registrarLog` (`userController.js:21`).

### F (Bis). Rota GET que retorna os registros de requisição por data
- **Implementação:** `backend/src/routes/userRoutes.js:27` (`/logs/:data`).
- **Lógica:** Função `getLogsPorData` em `backend/userController.js:93`.

### G. Rota GET que gera um PDF para download
- **Implementação:** `backend/src/routes/userRoutes.js:30` (`/relatorio`).
- **Lógica:** Função `gerarPDF` em `backend/userController.js:100`. Utiliza a biblioteca `pdfkit`.

### H. Dados Mockados (Arrays)
- **Implementação:** Definidos no topo de `backend/userController.js`:
    - `usuarios`: L7
    - `itens`: L13
    - `logsRequisicoes`: L20

### I. Versionamento no GitHub
- O projeto está versionado em: `https://github.com/DanielMacelino/ENGENHARIA2`

### J. Aplicação em Nuvem
- A aplicação está configurada para deploy via **Vercel** (arquivo `vercel.json` na raiz).
