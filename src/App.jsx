import { useState, useRef, useEffect } from 'react';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Estados con localStorage para recordar la última configuración
  const [whiteVolume, setWhiteVolume] = useState(() => Number(localStorage.getItem('tinnitus_white')) || 0);
  const [pinkVolume, setPinkVolume] = useState(() => Number(localStorage.getItem('tinnitus_pink')) || 0);
  const [brownVolume, setBrownVolume] = useState(() => Number(localStorage.getItem('tinnitus_brown')) || 50);
  const [oscVolume, setOscVolume] = useState(() => Number(localStorage.getItem('tinnitus_osc')) || 0);
  const [frequency, setFrequency] = useState(() => Number(localStorage.getItem('tinnitus_freq')) || 15000);
  const [timer, setTimer] = useState(() => Number(localStorage.getItem('tinnitus_timer')) || 30);

  // Referencias de la Web Audio API
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  
  const whiteGainRef = useRef(null);
  const pinkGainRef = useRef(null);
  const brownGainRef = useRef(null);
  const oscGainRef = useRef(null);
  const oscRef = useRef(null);

  const whiteSourceRef = useRef(null);
  const pinkSourceRef = useRef(null);
  const brownSourceRef = useRef(null);

  const timerTimeoutRef = useRef(null);

  // Guardado automático en memoria
  useEffect(() => {
    localStorage.setItem('tinnitus_white', whiteVolume);
    localStorage.setItem('tinnitus_pink', pinkVolume);
    localStorage.setItem('tinnitus_brown', brownVolume);
    localStorage.setItem('tinnitus_osc', oscVolume);
    localStorage.setItem('tinnitus_freq', frequency);
    localStorage.setItem('tinnitus_timer', timer);
  }, [whiteVolume, pinkVolume, brownVolume, oscVolume, frequency, timer]);

  // Motor algorítmico para generar los colores de ruido
  const createNoise = (ctx, type) => {
    const bufferSize = 2 * ctx.sampleRate;
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
    if (oscRef.current) oscRef.current.stop();
    if (whiteSourceRef.current) whiteSourceRef.current.stop();
    if (pinkSourceRef.current) pinkSourceRef.current.stop();
    if (brownSourceRef.current) brownSourceRef.current.stop();
    
    setIsPlaying(false);
    if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
  };

  const startAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;

    masterGainRef.current = ctx.createGain();
    masterGainRef.current.connect(ctx.destination);

    // Canal: Ruido Blanco
    whiteSourceRef.current = createNoise(ctx, 'white');
    whiteGainRef.current = ctx.createGain();
    whiteGainRef.current.gain.value = whiteVolume / 100;
    whiteSourceRef.current.connect(whiteGainRef.current).connect(masterGainRef.current);

    // Canal: Ruido Rosa
    pinkSourceRef.current = createNoise(ctx, 'pink');
    pinkGainRef.current = ctx.createGain();
    pinkGainRef.current.gain.value = pinkVolume / 100;
    pinkSourceRef.current.connect(pinkGainRef.current).connect(masterGainRef.current);

    // Canal: Ruido Marrón (Con filtro para suavizarlo)
    brownSourceRef.current = createNoise(ctx, 'brown');
    const brownFilter = ctx.createBiquadFilter();
    brownFilter.type = 'lowpass';
    brownFilter.frequency.value = 600;
    brownGainRef.current = ctx.createGain();
    brownGainRef.current.gain.value = brownVolume / 100;
    brownSourceRef.current.connect(brownFilter).connect(brownGainRef.current).connect(masterGainRef.current);

    // Canal: Tonal Puro
    oscRef.current = ctx.createOscillator();
    oscRef.current.frequency.value = frequency;
    oscGainRef.current = ctx.createGain();
    oscGainRef.current.gain.value = oscVolume / 1000;
    oscRef.current.connect(oscGainRef.current).connect(masterGainRef.current);

    // Arrancamos el mezclador maestro
    whiteSourceRef.current.start();
    pinkSourceRef.current.start();
    brownSourceRef.current.start();
    oscRef.current.start();
    
    setIsPlaying(true);

    // Temporizador con Fade Out de 5 segundos
    timerTimeoutRef.current = setTimeout(() => {
      masterGainRef.current.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 5);
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

  useEffect(() => {
    if (oscGainRef.current && isPlaying && audioCtxRef.current) {
      oscGainRef.current.gain.setTargetAtTime(oscVolume / 1000, audioCtxRef.current.currentTime, 0.1);
    }
  }, [oscVolume, isPlaying]);

  useEffect(() => {
    if (oscRef.current && isPlaying && audioCtxRef.current) {
      oscRef.current.frequency.setTargetAtTime(frequency, audioCtxRef.current.currentTime, 0.1);
    }
  }, [frequency, isPlaying]);

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.4); }
            70% { transform: scale(1.03); box-shadow: 0 0 0 20px rgba(45, 212, 191, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(45, 212, 191, 0); }
          }
          input[type=range] {
            accent-color: #94a3b8;
          }
        `}
      </style>
      
      <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        
        <h1 style={{ margin: '0 0 30px 0', fontSize: '26px', fontWeight: '600', color: '#f8fafc' }}>Alivio Tinnitus</h1>
        
        <button 
          onClick={isPlaying ? stopAudio : startAudio}
          style={{ 
            width: '160px', 
            height: '160px', 
            borderRadius: '50%', 
            border: 'none', 
            backgroundColor: isPlaying ? '#0f766e' : '#2dd4bf', 
            color: isPlaying ? '#ccfbf1' : '#042f2e', 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '40px', 
            cursor: 'pointer',
            transition: 'background-color 0.3s, transform 0.2s',
            animation: isPlaying ? 'pulse 2.5s infinite' : 'none'
          }}
        >
          {isPlaying ? 'REPRODUCIENDO...' : 'REPRODUCIR'}
        </button>

        <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '500' }}>Temporizador: {timer} min</p>
            <input type="range" min="5" max="120" step="5" value={timer} onChange={(e) => setTimer(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '500' }}>Ruido Blanco</p>
            <input type="range" min="0" max="100" value={whiteVolume} onChange={(e) => setWhiteVolume(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
            
            <p style={{ margin: '25px 0 12px 0', fontSize: '15px', fontWeight: '500' }}>Ruido Rosa</p>
            <input type="range" min="0" max="100" value={pinkVolume} onChange={(e) => setPinkVolume(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
            
            <p style={{ margin: '25px 0 12px 0', fontSize: '15px', fontWeight: '500' }}>Ruido Rojo (Marrón)</p>
            <input type="range" min="0" max="100" value={brownVolume} onChange={(e) => setBrownVolume(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '500' }}>Tonal (Volumen)</p>
            <input type="range" min="0" max="100" value={oscVolume} onChange={(e) => setOscVolume(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
            
            <p style={{ margin: '25px 0 12px 0', fontSize: '15px', fontWeight: '500' }}>Frecuencia (Pitch): {frequency} Hz</p>
            <input type="range" min="8000" max="17000" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
          </div>

        </div>
      </div>
    </>
  );
}