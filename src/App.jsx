import { useState, useRef, useEffect } from 'react';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 1. Inicializamos los estados leyendo la memoria local (si existe) o usando el valor por defecto
  const [frequency, setFrequency] = useState(() => Number(localStorage.getItem('tinnitus_freq')) || 15625);
  const [timer, setTimer] = useState(() => Number(localStorage.getItem('tinnitus_timer')) || 30);
  const [noiseVolume, setNoiseVolume] = useState(() => Number(localStorage.getItem('tinnitus_noise')) || 70);
  const [oscVolume, setOscVolume] = useState(() => Number(localStorage.getItem('tinnitus_osc')) || 15);

  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const noiseRef = useRef(null);
  const mainGainRef = useRef(null);
  
  const noiseGainRef = useRef(null);
  const oscGainRef = useRef(null);
  const timerTimeoutRef = useRef(null);

  // 2. NUEVO: Cada vez que cambian los valores, los guardamos en la memoria del navegador
  useEffect(() => {
    localStorage.setItem('tinnitus_freq', frequency);
    localStorage.setItem('tinnitus_timer', timer);
    localStorage.setItem('tinnitus_noise', noiseVolume);
    localStorage.setItem('tinnitus_osc', oscVolume);
  }, [frequency, timer, noiseVolume, oscVolume]);

  const createBrownNoise = (ctx) => {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; 
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  };

  const stopAudio = () => {
    oscRef.current?.stop();
    noiseRef.current?.stop();
    setIsPlaying(false);
    if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
  };

  const startAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;

    mainGainRef.current = ctx.createGain();
    mainGainRef.current.connect(ctx.destination);

    oscRef.current = ctx.createOscillator();
    oscRef.current.frequency.value = frequency;
    
    oscGainRef.current = ctx.createGain();
    oscGainRef.current.gain.value = oscVolume / 1000;
    oscRef.current.connect(oscGainRef.current).connect(mainGainRef.current);

    noiseRef.current = createBrownNoise(ctx);
    
    const lowPassFilter = ctx.createBiquadFilter();
    lowPassFilter.type = 'lowpass';
    lowPassFilter.frequency.value = 600; 
    
    noiseGainRef.current = ctx.createGain();
    noiseGainRef.current.gain.value = noiseVolume / 100;
    
    noiseRef.current.connect(lowPassFilter).connect(noiseGainRef.current).connect(mainGainRef.current);

    oscRef.current.start();
    noiseRef.current.start();
    setIsPlaying(true);

    timerTimeoutRef.current = setTimeout(() => {
      mainGainRef.current.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 5);
      setTimeout(stopAudio, 5000);
    }, timer * 60000);
  };

  useEffect(() => {
    if (oscRef.current && isPlaying && audioCtxRef.current) {
      oscRef.current.frequency.exponentialRampToValueAtTime(frequency, audioCtxRef.current.currentTime + 0.1);
    }
  }, [frequency, isPlaying]);

  useEffect(() => {
    if (noiseGainRef.current && isPlaying && audioCtxRef.current) {
      noiseGainRef.current.gain.setTargetAtTime(noiseVolume / 100, audioCtxRef.current.currentTime, 0.1);
    }
  }, [noiseVolume, isPlaying]);

  useEffect(() => {
    if (oscGainRef.current && isPlaying && audioCtxRef.current) {
      oscGainRef.current.gain.setTargetAtTime(oscVolume / 1000, audioCtxRef.current.currentTime, 0.1);
    }
  }, [oscVolume, isPlaying]);

  return (
    <div style={{ backgroundColor: '#0f172a', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '10px', color: 'white' }}>Alivio Tinnitus</h2>
      
      <button 
        onClick={isPlaying ? stopAudio : startAudio}
        style={{ width: '150px', height: '150px', borderRadius: '50%', border: 'none', backgroundColor: isPlaying ? '#ef4444' : '#22c55e', color: 'white', fontSize: '18px', fontWeight: 'bold', margin: '20px 0', cursor: 'pointer' }}
      >
        {isPlaying ? 'PAUSAR' : 'REPRODUCIR'}
      </button>

      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#94a3b8' }}>Volumen del Fondo: {noiseVolume}%</p>
          <input type="range" min="0" max="100" value={noiseVolume} onChange={(e) => setNoiseVolume(Number(e.target.value))} style={{ width: '100%' }} />
          
          <p style={{ margin: '15px 0 10px 0', fontSize: '14px', color: '#94a3b8' }}>Volumen del Pitido: {oscVolume}%</p>
          <input type="range" min="0" max="100" value={oscVolume} onChange={(e) => setOscVolume(Number(e.target.value))} style={{ width: '100%' }} />
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#94a3b8' }}>Frecuencia (Pitch): {frequency} Hz</p>
          <input type="range" min="10000" max="17000" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} style={{ width: '100%' }} />
          
          <p style={{ margin: '15px 0 10px 0', fontSize: '14px', color: '#94a3b8' }}>Temporizador: {timer} min</p>
          <input type="range" min="5" max="120" step="5" value={timer} onChange={(e) => setTimer(Number(e.target.value))} style={{ width: '100%' }} />
        </div>

      </div>
    </div>
  );
}