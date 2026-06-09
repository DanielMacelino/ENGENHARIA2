# Mapeamento e Localização dos Requisitos no Sistema

Este documento detalha exatamente em qual pasta, arquivo e página cada um dos requisitos solicitados foi implementado no repositório.

### A. Botão ‘Exportar’ (baixar dados em formato CSV)
*   **Pasta:** `frontend/views/` e `frontend/public/`
*   **Arquivos:** 
    *   `frontend/views/estatisticas.html` (Contém o botão na interface: *Exportar Relatório (CSV)*).
    *   `frontend/public/dashboard.js` (Onde reside a função `exportarEstatisticasCSV()` que faz a extração e o download).
*   **Página:** Página de Estatísticas do Administrador.

### B. Função programada de backup diário (17:00)
*   **Pasta:** `backend/src/`, `backend/src/services/` e a raiz do projeto.
*   **Arquivos:**
    *   `vercel.json` (Contém o agendamento de cron `0 20 * * *`, que equivale a 17h00 no fuso de Brasília, apontando para a rota `/api/backup-diario`).
    *   `backend/src/services/backupService.js` (Lógica do sistema, com a função `executarBackupNuvem()` que busca os dados como CSV e salva no Supabase Storage).
    *   `backend/src/app.js` (Endpoint acionado pelo cron, no GET `/api/backup-diario`).
*   **Página:** Executado em *Background* no servidor (agendamento Vercel / Supabase).

### C. Botão ‘Relatório de monitoramento’ (PDF com acessos)
*   **Pasta:** `frontend/views/` e `backend/`
*   **Arquivos:**
    *   `frontend/views/estatisticas.html` (Botão visual de *Relatório de Monitoramento (PDF)*).
    *   `backend/userController.js` (Lógica em backend que gera dinamicamente o arquivo através de bibliotecas como o `pdfkit` detalhando a acessibilidade, rotas e picos de uso).
*   **Página:** Página de Estatísticas do Administrador.

### D. Stream de vídeo
*   **Pasta:** `frontend/views/` e `frontend/public/`
*   **Arquivos:**
    *   `frontend/views/tutoriais.html` (Possui os *embeds* dinâmicos configurados como streams com a API de vídeo do YouTube num layout em grade).
    *   `frontend/views/login.html` e `frontend/views/cadastro.html` (Contêm também uma reprodução de stream em *background* carregando o `IFCEVIDEO.mp4` via source stream).
*   **Página:** Tutoriais, Login e Cadastro.

### E. Conexão via Socket
*   **Pasta:** `frontend/views/` e `frontend/public/`
*   **Arquivos:**
    *   `frontend/views/comunicacao.html` (Página que monta o painel de mural e troca de mensagens).
    *   `frontend/public/realtime.js` e `frontend/public/main.js` (Responsável por iniciar a assinatura de WebSockets em tempo real do Supabase e propagar atualizações da rede de mensagens e notificações).
*   **Página:** Mural da Equipe / Comunicação (Acessado no menu Lateral pelo link com a tag *SOCKET*).

### F. Dados em tempo real de sensor (IoT Virtual/Wokwi)
*   **Pasta:** Raiz, `backend/src/routes/`, `frontend/views/` e `frontend/public/`
*   **Arquivos:**
    *   `Integração_IoT.md` (Documento detalhando os endpoints e funcionamento do ESP32 no Wokwi para sinalização de aberturas).
    *   `backend/src/routes/statusRoutes.js` (Possui os endpoints `POST /api/status/iot/update` para receber os dados do ESP e o `GET` pra servir a informação ao usuário).
    *   `frontend/public/status.js` (Funções JavaScript em front-end que realizam os *fetches* dessa rota).
    *   `frontend/views/aluno-dashboard.html` (Apresenta visualmente o Status do Posto com as cores dos LEDs do sensor em tempo real).
*   **Página:** Dashboard do Aluno/Paciente (Widgets de Status do Posto).
