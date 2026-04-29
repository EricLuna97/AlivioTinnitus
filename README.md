# Alivio Tinnitus (Tinnitus Relief PWA)

Una Aplicación Web Progresiva (PWA) de nivel clínico, diseñada para el alivio y enmascaramiento del tinnitus (acúfenos). Construida con React y la Web Audio API, genera terapias sonoras matemáticamente puras en tiempo real, sin depender de archivos de audio pregrabados.

## 🚀 Características Principales

* **Síntesis Algorítmica en Tiempo Real:** Genera ruido Blanco, Rosa y Marrón (Rojo) puramente mediante matemáticas. Al no usar samples ni MP3, elimina el problema de los "loops" (bucles de audio) que impiden la relajación profunda del cerebro.
* **Arquitectura de Mezclador de Cero Latencia:** Todos los nodos de audio se instancian simultáneamente. El control se realiza puramente mediante la manipulación de la ganancia (volumen), replicando el comportamiento de una consola de audio profesional y garantizando cero interrupciones al cambiar de sonido.
* **100% Offline (PWA):** Soporte completo para funcionar sin conexión mediante Service Workers. Ideal para su uso nocturno en "Modo Avión", garantizando privacidad, ahorro total de datos y batería, y un entorno libre de publicidades.
* **Oscilador de Tono Puro:** Incluye un generador de onda senoidal de alta precisión con control de afinación (pitch) para emparejamiento de acúfenos tonales.
* **Persistencia de Estado:** Guarda automáticamente la configuración exacta del usuario (volúmenes de mezcla y frecuencias) utilizando `localStorage`.
* **Diseño Accesible:** Interfaz minimalista en "Dark Mode" por defecto, pensada para reducir la fatiga visual nocturna en usuarios con estrés auditivo.

## 🛠️ Stack Tecnológico

* **Frontend:** React (Hooks, Gestión de Estado).
* **Audio Engine:** Web Audio API (`AudioContext`, `BiquadFilterNode`, `GainNode`, `OscillatorNode`).
* **Build Tool:** Vite.
* **PWA:** Vite PWA Plugin.
* **Deployment:** Vercel.

## 🧠 Arquitectura de Audio (Web Audio API)

La aplicación no reproduce archivos, sino que instancia un `AudioContext` en el cliente.
- **Ruido Blanco:** Generado mediante `Math.random()` puro.
- **Ruido Rosa:** Implementa un algoritmo de balanceo de octavas para distribuir la energía espectral simulando fenómenos naturales.
- **Ruido Marrón:** Utiliza un sistema de integración de estado previo y se filtra a través de un `BiquadFilterNode` (Lowpass a 600Hz) para lograr la atenuación de agudos característica.

## 💻 Instalación y Desarrollo Local

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/tu-usuario/tu-repo.git](https://github.com/tu-usuario/tu-repo.git)