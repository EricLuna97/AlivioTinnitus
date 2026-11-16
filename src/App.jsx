import { useState, useRef, useEffect } from 'react';
import Footer from './Footer';
import './App.css';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [segundosReproduccion, setSegundosReproduccion] = useState(0);
  
  // Estados con localStorage para recordar la última configuración
  const [whiteVolume, setWhiteVolume] = useState(() => Number(localStorage.getItem('tinnitus_white')) || 0);
  const [pinkVolume, setPinkVolume] = useState(() => Number(localStorage.getItem('tinnitus_pink')) || 0);
  const [brownVolume, setBrownVolume] = useState(() => Number(localStorage.getItem('tinnitus_brown')) || 50);
  const [timer, setTimer] = useState(() => Number(localStorage.getItem('tinnitus_timer')) || 30);

  // Referencias de la Web Audio API
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  
  const whiteGainRef = useRef(null);
  const pinkGainRef = useRef(null);
  const brownGainRef = useRef(null);

  const whiteSourceRef = useRef(null);
  const pinkSourceRef = useRef(null);
  const brownSourceRef = useRef(null);

  const timerTimeoutRef = useRef(null);

  // Guardado automático en memoria
  useEffect(() => {
    localStorage.setItem('tinnitus_white', whiteVolume);
    localStorage.setItem('tinnitus_pink', pinkVolume);
    localStorage.setItem('tinnitus_brown', brownVolume);
    localStorage.setItem('tinnitus_timer', timer);
  }, [whiteVolume, pinkVolume, brownVolume, timer]);

  // Lógica del contador de sesión a prueba de modo suspensión
  useEffect(() => {
    let interval;

    if (isPlaying) {
      const tiempoInicio = Date.now();
      
      interval = setInterval(() => {
        const tiempoActual = Date.now();
        setSegundosReproduccion(Math.floor((tiempoActual - tiempoInicio) / 1000));
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isPlaying]); 

  // Formateador de tiempo (MM:SS o HH:MM:SS)
  const formatearTiempo = (totalSegundos) => {
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    if (horas > 0) {
      return `${horas}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    }
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  };

  // Motor algorítmico para generar los colores de ruido
  const createNoise = (ctx, type) => {
    const bufferSize = 20 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    
    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // Atenuación para evitar saturación
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
      }
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  };

  const stopAudio = () => {
    if (whiteSourceRef.current) {
      whiteSourceRef.current.stop();
      whiteSourceRef.current = null;
    }
    if (pinkSourceRef.current) {
      pinkSourceRef.current.stop();
      pinkSourceRef.current = null;
    }
    if (brownSourceRef.current) {
      brownSourceRef.current.stop();
      brownSourceRef.current = null;
    }
    
    setIsPlaying(false);
    if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
  };

  const startAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;

    // Si el contexto está suspendido (política autoplay del navegador), lo reactivamos
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    masterGainRef.current = ctx.createGain();
    masterGainRef.current.connect(ctx.destination);

    // Canal: Ruido Blanco
    whiteSourceRef.current = createNoise(ctx, 'white');
    const whiteFilter = ctx.createBiquadFilter();
    whiteFilter.type = 'lowpass';
    whiteFilter.frequency.value = 3000;
    whiteGainRef.current = ctx.createGain();
    whiteGainRef.current.gain.value = whiteVolume / 100;
    whiteSourceRef.current.connect(whiteFilter).connect(whiteGainRef.current).connect(masterGainRef.current);

    // Canal: Ruido Rosa
    pinkSourceRef.current = createNoise(ctx, 'pink');
    const pinkFilter = ctx.createBiquadFilter();
    pinkFilter.type = 'lowpass';
    pinkFilter.frequency.value = 3000;
    pinkGainRef.current = ctx.createGain();
    pinkGainRef.current.gain.value = pinkVolume / 100;
    pinkSourceRef.current.connect(pinkFilter).connect(pinkGainRef.current).connect(masterGainRef.current);

    // Canal: Ruido Rojo / Marrón (Con filtro para suavizarlo)
    brownSourceRef.current = createNoise(ctx, 'brown');
    const brownFilter = ctx.createBiquadFilter();
    brownFilter.type = 'lowpass';
    brownFilter.frequency.value = 600;
    brownGainRef.current = ctx.createGain();
    brownGainRef.current.gain.value = brownVolume / 100;
    brownSourceRef.current.connect(brownFilter).connect(brownGainRef.current).connect(masterGainRef.current);

    // Arrancamos las fuentes de ruido
    whiteSourceRef.current.start();
    pinkSourceRef.current.start();
    brownSourceRef.current.start();
    
    setSegundosReproduccion(0);
    setIsPlaying(true);

    // Temporizador con Fade Out de 5 segundos
    timerTimeoutRef.current = setTimeout(() => {
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 5);
      }
      setTimeout(stopAudio, 5000);
    }, timer * 60000);
  };

  // Efectos para transiciones suaves al mover los faders
  useEffect(() => {
    if (whiteGainRef.current && isPlaying && audioCtxRef.current) {
      whiteGainRef.current.gain.setTargetAtTime(whiteVolume / 100, audioCtxRef.current.currentTime, 0.1);
    }
  }, [whiteVolume, isPlaying]);

  useEffect(() => {
    if (pinkGainRef.current && isPlaying && audioCtxRef.current) {
      pinkGainRef.current.gain.setTargetAtTime(pinkVolume / 100, audioCtxRef.current.currentTime, 0.1);
    }
  }, [pinkVolume, isPlaying]);

  useEffect(() => {
    if (brownGainRef.current && isPlaying && audioCtxRef.current) {
      brownGainRef.current.gain.setTargetAtTime(brownVolume / 100, audioCtxRef.current.currentTime, 0.1);
    }
  }, [brownVolume, isPlaying]);

  const timerPresets = [15, 30, 45, 60];

  return (
    <div className="app-wrapper">
      <div className="app-container">
        
        {/* Encabezado */}
        <header className="app-header">
          <div className="brand-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 10v4" />
              <path d="M6 7v10" />
              <path d="M10 4v16" />
              <path d="M14 7v10" />
              <path d="M18 10v4" />
            </svg>
            Terapia Acústica
          </div>
          <h1 className="app-title">Alivio Tinnitus</h1>
          <p className="app-subtitle">Enmascaramiento auditivo continuo</p>
        </header>

        {/* Reproductor Central */}
        <section className="hero-player-section">
          <div className="play-button-outer">
            {isPlaying && (
              <>
                <div className="pulse-ring pulse-ring-1" />
                <div className="pulse-ring pulse-ring-2" />
              </>
            )}

            <button 
              onClick={isPlaying ? stopAudio : startAudio}
              className={`main-play-btn ${isPlaying ? 'active' : 'idle'}`}
              aria-label={isPlaying ? 'Detener reproducción' : 'Iniciar reproducción'}
            >
              <div className="btn-icon">
                {isPlaying ? (
                  <div className="audio-wave-bars">
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                  </div>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '3px' }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
              <span className="btn-label">
                {isPlaying ? 'REPRODUCIENDO...' : 'REPRODUCIR'}
              </span>
            </button>
          </div>

          {/* Indicador de tiempo de sesión */}
          <div className="session-status-pill">
            <span className={`status-dot ${isPlaying ? 'active' : ''}`} />
            <span>
              {isPlaying ? `Tiempo de sesión: ${formatearTiempo(segundosReproduccion)}` : 'Esperando iniciar...'}
            </span>
          </div>
        </section>

        {/* Tarjeta: Temporizador */}
        <div className="glass-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <h2 className="card-title">Temporizador</h2>
            </div>
            <span className="card-value-badge">{timer} min</span>
          </div>

          <div className="slider-container">
            <input 
              type="range" 
              min="5" 
              max="120" 
              step="5" 
              value={timer} 
              onChange={(e) => setTimer(Number(e.target.value))}
              className="custom-range"
              style={{
                background: `linear-gradient(to right, #2dd4bf ${((timer - 5) / (120 - 5)) * 100}%, rgba(255, 255, 255, 0.1) ${((timer - 5) / (120 - 5)) * 100}%)`
              }}
              aria-label="Minutos de temporizador"
            />
          </div>

          <div className="preset-chips-row">
            {timerPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-chip ${timer === preset ? 'selected' : ''}`}
                onClick={() => setTimer(preset)}
              >
                {preset}m
              </button>
            ))}
          </div>

          <p className="timer-footnote">Desvanecimiento gradual suave de 5s al finalizar</p>
        </div>

        {/* Tarjeta: Mezclador de Ruido */}
        <div className="glass-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              </span>
              <h2 className="card-title">Mezclador de Ruido</h2>
            </div>
          </div>

          {/* Ruido Blanco */}
          <div className="noise-channel-strip">
            <div className="noise-info-row">
              <div className="noise-name-tag">
                <span className="noise-color-indicator" style={{ backgroundColor: '#38bdf8', boxShadow: '0 0 8px rgba(56, 189, 248, 0.5)' }} />
                <span className="noise-label">Ruido Blanco</span>
              </div>
              <span className="noise-volume-badge">{whiteVolume}%</span>
            </div>
            <span className="noise-desc">Frecuencias altas · Enmascaramiento nítido</span>
            <div className="slider-container">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={whiteVolume} 
                onChange={(e) => setWhiteVolume(Number(e.target.value))}
                className="custom-range"
                style={{
                  background: `linear-gradient(to right, #38bdf8 ${whiteVolume}%, rgba(255, 255, 255, 0.1) ${whiteVolume}%)`
                }}
                aria-label="Volumen Ruido Blanco"
              />
            </div>
          </div>

          {/* Ruido Rosa */}
          <div className="noise-channel-strip">
            <div className="noise-info-row">
              <div className="noise-name-tag">
                <span className="noise-color-indicator" style={{ backgroundColor: '#f472b6', boxShadow: '0 0 8px rgba(244, 114, 182, 0.5)' }} />
                <span className="noise-label">Ruido Rosa</span>
              </div>
              <span className="noise-volume-badge">{pinkVolume}%</span>
            </div>
            <span className="noise-desc">Espectro natural 1/f · Suave y equilibrado</span>
            <div className="slider-container">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={pinkVolume} 
                onChange={(e) => setPinkVolume(Number(e.target.value))}
                className="custom-range"
                style={{
                  background: `linear-gradient(to right, #f472b6 ${pinkVolume}%, rgba(255, 255, 255, 0.1) ${pinkVolume}%)`
                }}
                aria-label="Volumen Ruido Rosa"
              />
            </div>
          </div>

          {/* Ruido Rojo */}
          <div className="noise-channel-strip">
            <div className="noise-info-row">
              <div className="noise-name-tag">
                <span className="noise-color-indicator" style={{ backgroundColor: '#fb923c', boxShadow: '0 0 8px rgba(251, 146, 60, 0.5)' }} />
                <span className="noise-label">Ruido Rojo</span>
              </div>
              <span className="noise-volume-badge">{brownVolume}%</span>
            </div>
            <span className="noise-desc">Graves profundos · Relajante y envolvente</span>
            <div className="slider-container">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={brownVolume} 
                onChange={(e) => setBrownVolume(Number(e.target.value))}
                className="custom-range"
                style={{
                  background: `linear-gradient(to right, #fb923c ${brownVolume}%, rgba(255, 255, 255, 0.1) ${brownVolume}%)`
                }}
                aria-label="Volumen Ruido Rojo"
              />
            </div>
          </div>

        </div>

        {/* Pie de página con descargo médico y autor */}
        <Footer />

      </div>
    </div>
  );
}
