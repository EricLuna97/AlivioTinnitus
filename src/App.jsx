import { useState, useRef, useEffect } from 'react';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequency, setFrequency] = useState(15625); // Frecuencia TV CRT
  const [timer, setTimer] = useState(30); // Minutos por defecto
  
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const noiseRef = useRef(null);
  const mainGainRef = useRef(null);
  const timerTimeoutRef = useRef(null);

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
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;

    mainGainRef.current = ctx.createGain();
    mainGainRef.current.connect(ctx.destination);

    // Oscilador Agudo (Low Gain para no lastimar)
    oscRef.current = ctx.createOscillator();
    oscRef.current.frequency.value = frequency;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.03; 
    oscRef.current.connect(oscGain).connect(mainGainRef.current);

    // Ruido Marrón (Base relajante)
    noiseRef.current = createBrownNoise(ctx);
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.7;
    noiseRef.current.connect(noiseGain).connect(mainGainRef.current);

    oscRef.current.start();
    noiseRef.current.start();
    setIsPlaying(true);

    // Configurar Timer
    timerTimeoutRef.current = setTimeout(() => {
      // Fade out de 5 segundos antes de apagar
      mainGainRef.current.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 5);
      setTimeout(stopAudio, 5000);
    }, timer * 60000);
  };

  useEffect(() => {
    if (oscRef.current && isPlaying && audioCtxRef.current) {
      // Usamos exponentialRampToValueAtTime para que el cambio de pitch sea suave y no haga "clics"
      oscRef.current.frequency.exponentialRampToValueAtTime(
        frequency, 
        audioCtxRef.current.currentTime + 0.1
      );
    }
  }, [frequency, isPlaying]);
  
  return (
    <div style={{ backgroundColor: '#0f172a', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Alivio Tinnitus</h1>
      
      <button 
        onClick={isPlaying ? stopAudio : startAudio}
        style={{ width: '180px', height: '180px', borderRadius: '50%', border: 'none', backgroundColor: isPlaying ? '#ef4444' : '#22c55e', color: 'white', fontSize: '20px', fontWeight: 'bold', margin: '30px 0', cursor: 'pointer' }}
      >
        {isPlaying ? 'PAUSAR' : 'REPRODUCIR'}
      </button>

      <div style={{ width: '100%', maxWidth: '300px' }}>
        <p>Frecuencia: {frequency} Hz</p>
        <input type="range" min="12000" max="17000" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} style={{ width: '100%' }} />
        
        <p style={{ marginTop: '20px' }}>Temporizador: {timer} min</p>
        <input type="range" min="5" max="120" step="5" value={timer} onChange={(e) => setTimer(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
    </div>
  );
}