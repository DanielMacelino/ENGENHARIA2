# 🏥 Integração IoT (Wokwi) - Status do Posto de Saúde

## 📋 Descrição

Este documento descreve como integrar um **simulador IoT virtual (Wokwi)** ao Sistema de Agendamento do Posto de Saúde para indicar se o posto está **ABERTO (08:00-19:00)** ou **FECHADO**.

---

## 🎯 O que foi implementado?

### **Backend** (Node.js + Express)
- ✅ Rota: `GET /api/status/posto` - Retorna status completo em JSON
- ✅ Rota: `GET /api/status/iot` - Resposta simplificada para IoT
- ✅ Cálculo automático de horário (08:00 - 19:00)
- ✅ Informações: hora atual, próxima mudança, status em tempo real

### **Frontend** (JavaScript + HTML)
- ✅ Badge visual no dashboard do aluno
- ✅ Atualização a cada 30 segundos
- ✅ Animação de pulsação quando aberto
- ✅ Cores: 🟢 Verde (aberto) / 🔴 Vermelho (fechado)
- ✅ Funciona em produção (Vercel)

### **IoT (Wokwi)**
- ✅ Simulação de LED RGB
- ✅ Consulta API do backend em tempo real
- ✅ Compatível com ESP32 e Arduino

---

## 🚀 Como testar LOCALMENTE?

### **1️⃣ Iniciar o Backend**
```bash
cd backend
npm install
npm run dev
```

Acesse: `http://localhost:3000/api/status/posto`

Você verá algo como:
```json
{
  "aberto": true,
  "hora_atual": "14:30",
  "horario_funcionamento": "08:00 - 19:00",
  "proxima_abertura": "08:00",
  "proxima_fechamento": "19:00",
  "proxima_mudanca": "19:00",
  "status_texto": "✅ ABERTO",
  "tipo_mudanca": "fechamento"
}
```

### **2️⃣ Iniciar o Frontend**
```bash
cd frontend
npm install
npm start
```

Acesse: `http://localhost:8080/aluno/dashboard`

Você verá um **badge verde com "✅ ABERTO"** no topo do dashboard.

### **3️⃣ Simular no Wokwi**

Crie um novo projeto em [wokwi.com](https://wokwi.com):

#### **Diagrama (diagram.json)**
```json
{
  "version": 1,
  "author": "Seu Nome",
  "title": "Status Posto de Saúde",
  "description": "LED RGB indicador de funcionamento",
  "parts": [
    { "type": "wokwi-esp32-devkit-v1", "id": "esp32" },
    { "type": "wokwi-led", "id": "led_red", "attrs": { "color": "red" } },
    { "type": "wokwi-led", "id": "led_green", "attrs": { "color": "green" } },
    { "type": "wokwi-resistor", "id": "r1", "attrs": { "resistance": "220" } },
    { "type": "wokwi-resistor", "id": "r2", "attrs": { "resistance": "220" } }
  ],
  "connections": [
    [ "esp32:D32", "led_red:a", "", [] ],
    [ "esp32:D33", "led_green:a", "", [] ],
    [ "led_red:c", "r1:A", "", [] ],
    [ "led_green:c", "r2:A", "", [] ],
    [ "r1:B", "esp32:GND", "", [] ],
    [ "r2:B", "esp32:GND", "", [] ]
  ]
}
```

#### **Código Arduino (sketch.ino)**
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

// Configuração WiFi (simular no Wokwi)
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// API do Backend
const char* apiUrl = "http://seu-backend-vercel.vercel.app/api/status/iot";

// Pinos dos LEDs
const int LED_RED = 32;
const int LED_GREEN = 33;

void setup() {
  Serial.begin(115200);
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  
  // Conectar WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println("\nWiFi conectado!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiUrl);
    
    int httpCode = http.GET();
    if (httpCode == 200) {
      String payload = http.getString();
      Serial.println("Resposta: " + payload);
      
      // Simples parse: se contém "open", é verde
      if (payload.indexOf("open") > -1) {
        digitalWrite(LED_GREEN, HIGH);
        digitalWrite(LED_RED, LOW);
        Serial.println("🟢 ABERTO");
      } else {
        digitalWrite(LED_GREEN, LOW);
        digitalWrite(LED_RED, HIGH);
        Serial.println("🔴 FECHADO");
      }
    } else {
      Serial.print("Erro: ");
      Serial.println(httpCode);
    }
    http.end();
  }
  
  delay(30000); // Atualizar a cada 30 segundos
}
```

---

## 🌐 Como testar em PRODUÇÃO (Vercel)?

### **Pré-requisitos:**
1. Backend deployado no Vercel
2. Frontend deployado no Vercel
3. URLs acessíveis publicamente

### **Configuração:**

1. **Atualizar `frontend/config.js`:**
```javascript
const config = {
    API_BASE_URL: process.env.NODE_ENV === 'production' 
        ? 'https://seu-backend-vercel.vercel.app/api'
        : 'http://localhost:3000/api',
};
```

2. **Fazer deploy:**
```bash
# Frontend
npm run build
vercel deploy --prod

# Backend
vercel deploy --prod
```

3. **Testar em Vercel:**
- Acesse: `https://seu-frontend.vercel.app/aluno/dashboard`
- Veja o badge atualizar em tempo real

4. **Configurar Wokwi:**
- URL da API: `https://seu-backend-vercel.vercel.app/api/status/iot`
- O LED RGB responderá ao status real do servidor

---

## 📊 Fluxo de Dados

```
┌─────────────────────────────────────────────┐
│       Backend (Node.js + Express)           │
│   GET /api/status/posto                    │
│   GET /api/status/iot                      │
└──────────────┬──────────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
┌──────────────┐  ┌──────────────┐
│   Frontend   │  │   Wokwi IoT  │
│ (Dashboard)  │  │  (LED RGB)   │
│  🟢 ABERTO   │  │  Verde/Verm. │
└──────────────┘  └──────────────┘
```

---

## 🔌 Endpoints da API

### **GET /api/status/posto**
Retorna informações detalhadas do status:

**Response (200 OK):**
```json
{
  "aberto": true,
  "hora_atual": "14:30",
  "horario_funcionamento": "08:00 - 19:00",
  "proxima_abertura": "08:00",
  "proxima_fechamento": "19:00",
  "proxima_mudanca": "19:00",
  "status_texto": "✅ ABERTO",
  "tipo_mudanca": "fechamento"
}
```

### **GET /api/status/iot**
Resposta simplificada para dispositivos IoT:

**Response (200 OK):**
```json
{
  "status": "open",
  "led_color": "green",
  "timestamp": "2026-05-29T14:30:00.000Z"
}
```

---

## 🎨 Customização

### **Alterar Horário de Funcionamento**

Edite `backend/src/routes/statusRoutes.js`:

```javascript
const horaAbertura = 8;      // Mude para 7
const horaFechamento = 19;   // Mude para 20
```

### **Customizar Cores do Badge**

Edite `frontend/public/status.js`:

```javascript
// Para ABERTO
badge.style.background = 'linear-gradient(135deg, #seu-cor-1 0%, #seu-cor-2 100%)';
badge.style.borderLeft = '5px solid #sua-cor-primaria';

// Para FECHADO
badge.style.background = 'linear-gradient(135deg, #seu-cor-fechado-1 0%, #seu-cor-fechado-2 100%)';
```

---

## ✅ Checklist de Implementação

- [x] Rota GET `/api/status/posto` criada
- [x] Rota GET `/api/status/iot` criada
- [x] Frontend atualiza status a cada 30s
- [x] Badge visual no dashboard
- [x] Suporta Vercel (produção)
- [x] Arquivo Wokwi de exemplo
- [x] Documentação completa

---

## 🐛 Troubleshooting

### **Badge não aparece**
```javascript
// Verifique console:
console.log(window.appConfig?.API_BASE_URL);
```

### **API retorna erro 404**
```bash
# Verifique se a rota foi adicionada ao index.js
# Restart do backend
npm run dev
```

### **LED não funciona no Wokwi**
- Verifique conexão WiFi (simular Wokwi-GUEST)
- Confirme URL da API (use HTTPS em produção)
- Cheque pinos D32 (vermelho) e D33 (verde)

---

## 📚 Recursos Adicionais

- [Documentação Wokwi](https://docs.wokwi.com/)
- [ESP32 Documentação](https://docs.espressif.com/)
- [Vercel Deploy Guide](https://vercel.com/docs)

---

## 🤝 Suporte

Dúvidas? Verifique:
1. Console do navegador (F12)
2. Logs do servidor: `npm run dev`
3. Inspetor de rede (Network tab)

---

**Desenvolvido para ENGENHARIA2 - IFCE Campus Crato** 🏥
