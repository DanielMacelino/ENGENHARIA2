# 🩺 Sistema de Agendamento - Posto de Saúde (IFCE - Campus Crato)
### 📑 Memorial Descritivo - Mapeamento de Requisitos da API

Este documento detalha o cumprimento integral dos requisitos solicitados para o seminário. Abaixo, apresentamos a função completa correspondente a cada item solicitado.

**Apresentado por:** Daniel, Vitoria e Alexandre - 2026

---

## 🎴 Passinho 1: Autenticação
### Requisito A: Rota `POST /logar`
> Recebe email e senha e devolve um Token JWT válido.

**Localização:** `backend/userController.js:L40`
**Código Completo:**
```javascript
export const login = async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (!usuario) {
        return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const token = jwt.sign(
        { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    return res.json({ token, tipo_usuario: usuario.tipo_usuario });
};
```

---

## 🎴 Passinho 2: Listagem de Itens
### Requisito B: Rota `GET /itens`
> Retorna a lista completa de itens cadastrados no sistema.

**Localização:** `backend/userController.js:L62`
**Código Completo:**
```javascript
export const getItens = (req, res) => {
    return res.json(itens);
};
```

---

## 🎴 Passinho 3: Inserção de Itens
### Requisito C: Rota `POST /itens`
> Adiciona um novo item ao array mockado de dados.

**Localização:** `backend/userController.js:L67`
**Código Completo:**
```javascript
export const criarItem = (req, res) => {
    const { nome, codigo, descricao } = req.body;
    if (!nome || !codigo) return res.status(400).json({ error: "Nome e código são obrigatórios" });

    const novo = { id: String(itens.length + 1), nome, codigo, descricao };
    itens.push(novo);
    return res.status(201).json(novo);
};
```

---

## 🎴 Passinho 4: Exclusão de Itens (Integração Supabase)
### Requisito D: Rota `DELETE /itens/:id`
> Remove um item do banco utilizando o Supabase.

**Localização:** `backend/userController.js:L78`
**Código Completo:**
```javascript
export const deleteItem = async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) return res.status(500).json(error);
    res.json({ message: "Item removido com sucesso" });
};
```

---

## 🎴 Passinho 5: Pesquisa por Código (Integração Supabase)
### Requisito F: Rota `GET /itens/:codigo`
> Realiza uma busca filtrada no banco de dados.

**Localização:** `backend/userController.js:L86`
**Código Completo:**
```javascript
export const getItems = async (req, res) => {
    const { codigo } = req.params;
    let query = supabase.from("itens").select("*");

    if (codigo) query = query.eq("codigo", codigo);

    const { data, error } = await query;
    if (error) return res.status(500).json(error);
    res.json(data);
};
```

---

## 🎴 Passinho 6: Controle de Acesso (Segunda a Sexta)
### Requisito D (Bis): Middleware `workingDaysOnly`
> Restringe o uso da API apenas em dias úteis.

**Localização:** `backend/src/middlewares/appMiddleware.js:L12`
**Código Completo:**
```javascript
export const workingDaysOnly = (req, res, next) => {
    const day = new Date().getDay(); 
    if (day === 0 || day === 6) {
        return res.status(403).json({ error: "Acesso disponível apenas de segunda a sexta-feira." });
    }
    next();
};
```

---

## 🎴 Passinho 7: Auditoria em Tempo Real (Registros)
### Requisito E: Middleware `logRequest`
> Registra automaticamente a rota, o método e o horário de cada requisição.

**Localização:** `backend/src/middlewares/appMiddleware.js:L4`
**Código Completo:**
```javascript
export const logRequest = (req, res, next) => {
    const now = new Date();
    console.log(`[${now.toLocaleString()}] ${req.method} em ${req.url}`);
    registrarLog(req.method, req.url);
    next();
};

// Lógica auxiliar no Controller (L29-L37):
export const registrarLog = (metodo, rota) => {
    const agora = new Date();
    logsRequisicoes.push({
        data: agora.toISOString().split('T')[0],
        horario: agora.toLocaleTimeString(),
        metodo, rota
    });
};
```

---

## 🎴 Passinho 8: Consulta de Logs por Data
### Requisito F (Bis): Rota `GET /logs/:data`
> Retorna o histórico de requisições de uma data específica.

**Localização:** `backend/userController.js:L98`
**Código Completo:**
```javascript
export const getLogsPorData = (req, res) => {
    const { data } = req.params; 
    const filtrados = logsRequisicoes.filter(l => l.data === data);
    return res.json(filtrados);
};
```

---

## 🎴 Passinho 9: Relatórios Automatizados (PDF)
### Requisito G: Rota `GET /relatorio`
> Gera dinamicamente um PDF para download do usuário.

**Localização:** `backend/userController.js:L111`
**Código Completo:**
```javascript
export const generatePDF = (req, res) => {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
    doc.pipe(res);
    doc.fontSize(20).text("Relatório de Itens", { align: 'center' });
    doc.end();
};
```

---

## 🎴 Passinho 10: Estrutura, GitHub e Deploy
### Requisitos H, I & J
> **H (Mocks):** Arrays `usuarios` (L8) e `itens` (L14) integrados no código.
> **I (GitHub):** Versionado via Git local e remoto.
> **J (Nuvem):** Deploy configurado em `vercel.json` na raiz do projeto.

---
*Fim da Apresentação - 2026*
