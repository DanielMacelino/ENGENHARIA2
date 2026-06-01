# 🏥 Integração IoT - Status do Posto de Saúde

Este documento resume a integração do simulador IoT (Wokwi/ESP32) com o sistema de agendamento.

### 🔌 API de Integração
- **Endpoint:** `POST https://engenharia-2.vercel.app/api/status/iot/update`
- **Payload:** `{"status": "open" | "closed", "led_color": "green" | "red"}`

### 🛠️ Hardware & Pinos (ESP32)
- **LED Vermelho:** Pino 32 (Indica posto fechado)
- **LED Verde:** Pino 33 (Indica posto aberto)
- **Rede WiFi:** `Wokwi-GUEST` (Sem senha)

### 🚀 Funcionamento
O ESP32 conecta-se ao WiFi, atualiza o estado dos LEDs locais e envia periodicamente (a cada 5 segundos) o status atualizado do posto para a API via requisição HTTP POST.
