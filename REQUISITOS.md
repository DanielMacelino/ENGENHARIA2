# 🩺 Sistema de Agendamento - Posto de Saúde (IFCE - Campus Crato)
### 📑 Memorial Descritivo - Mapeamento de Requisitos da API

Este documento detalha o cumprimento integral dos requisitos solicitados para o seminário. Abaixo, apresentamos a função completa correspondente a cada item solicitado, garantindo a rastreabilidade entre o código e a funcionalidade.

**Apresentado por:** Daniel, Vitoria e Alexandre - 2026

---

## 🎴  1: Autenticação
### Requisito A: Rota `POST /logar`
> Recebe email e senha e devolve um Token JWT válido para acessar as demais rotas.

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

## 🎴  2: Listagem de Itens
### Requisito B: Rota `GET /itens`
> Retorna a lista completa de itens cadastrados (Mocks).

**Localização:** `backend/userController.js:L63`
**Código Completo:**
```javascript
export const getItens = (req, res) => {
    return res.json(itens);
};
```

---

## 🎴  3: Inserção de Itens (Persistência Dupla)
### Requisito C: Rota `POST /itens`
> Insere no Supabase (Banco de Dados) e mantém no Array local (Requisito H).

**Localização:** `backend/userController.js:L68`
**Código Completo:**
```javascript
export const criarItem = async (req, res) => {
    const { nome, codigo, descricao } = req.body;
    if (!nome || !codigo) return res.status(400).json({ error: "Nome e código são obrigatórios" });

    // Inserção no Supabase para manter consistência com search/delete
    const { data, error } = await supabase.from("itens").insert([{ nome, codigo, descricao }]).select();
    
    // Fallback para o mock local (Requisito H)
    const novo = { id: data ? data[0].id : String(itens.length + 1), nome, codigo, descricao };
    itens.push(novo);

    if (error) return res.status(500).json(error);
    return res.status(201).json(novo);
};
```

---

## 🎴  4: Exclusão de Itens
### Requisito D: Rota `DELETE /itens/:id`
> Remove um item do banco utilizando o Supabase filtrando pelo ID.

**Localização:** `backend/userController.js:L84`
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

## 🎴  5: Pesquisa por Código
### Requisito F: Rota `GET /itens/:codigo`
> Realiza uma busca filtrada no banco de dados via Supabase.

**Localização:** `backend/userController.js:L92`
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

## 🎴  6: Controle de Acesso (D² - Middleware)
### Requisito D (Bis): Restrição de Dias Úteis
> Middleware que permite o acesso da API apenas de segunda à sexta.

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

## 🎴  7: Auditoria de Requisições
### Requisito E: Middleware de Registro de Logs
> Registra o horário e a rota de cada requisição realizada.

**Localização:** `backend/src/middlewares/appMiddleware.js:L4`
**Código Completo:**
```javascript
export const logRequest = (req, res, next) => {
    const now = new Date();
    console.log(`[${now.toLocaleString()}] ${req.method} em ${req.url}`);
    registrarLog(req.method, req.url);
    next();
};
```

---

## 🎴  8: Consulta de Auditoria
### Requisito F (Bis): Rota `GET /logs/:data`
> Retorna os registros de requisição em uma determinada data informada.

**Localização:** `backend/userController.js:L104`
**Código Completo:**
```javascript
export const getLogsPorData = (req, res) => {
    const { data } = req.params; // esperado: AAAA-MM-DD
    const filtrados = logsRequisicoes.filter(l => l.data === data);
    return res.json(filtrados);
};
```

---

## 🎴  9: Download de PDF
### Requisito G: Rota `GET /relatorio`
> Gera um arquivo PDF para download contendo a lista de itens do mock.

**Localização:** `backend/userController.js:L116`
**Código Completo:**
```javascript
export const generatePDF = (req, res) => {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
    doc.pipe(res);
    doc.fontSize(20).text("Relatório de Itens do Sistema", { align: 'center' });
    doc.moveDown();

    // Listagem real dos itens no PDF
    itens.forEach(item => {
        doc.fontSize(12).text(`- ${item.nome} (Código: ${item.codigo})`);
        if(item.descricao) doc.fontSize(10).text(`  Descrição: ${item.descricao}`);
        doc.moveDown(0.5);
    });

    doc.end();
};
```

---

## 🎴  10: Persistência e Cloud
### Requisitos H, I & J
> **H (Dados Mockados):** Definidos no topo do `userController.js` (L9: `usuarios` e L14: `itens`).
> **I (GitHub):** Versionado no repositório `DanielMacelino/ENGENHARIA2`.
> **J (Vercel):** Aplicação configurada com `vercel.json` na raiz e rodando na nuvem.

---
*Apresentado por Daniel, Vitoria e Alexandre - 2026*
