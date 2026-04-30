import React, { useState, useEffect, useRef } from "https://esm.sh/react@18.2.0";
import ReactDOM from "https://esm.sh/react-dom@18.2.0/client";
import { 
  Play, Grid, ShoppingCart, LogOut, Rocket, Coins, 
  ArrowLeft, Check, Lock, AlertTriangle, RefreshCw, 
  Menu as MenuIcon, Trophy, Star, ArrowRight, 
  RefreshCcw, Power, Pause 
} from "https://esm.sh/lucide-react@0.263.1";

// --- CONSTANTS & DATA ---

const SHIP_DESIGNS = [
  { id: 'default', name: 'Mk-1 Pioneer', cost: 0, description: 'Standard issue exploration craft.', color: '#06b6d4' },
  { id: 'interceptor', name: 'Red Viper', cost: 100, description: 'High-speed assault fighter.', color: '#ef4444' },
  { id: 'tank', name: 'Iron Clad', cost: 100, description: 'Heavily armored transport.', color: '#64748b' },
  { id: 'scout', name: 'Void Runner', cost: 100, description: 'Lightweight reconnaissance.', color: '#fbbf24' },
  { id: 'bomber', name: 'Heavy Green', cost: 100, description: 'Military grade bomber.', color: '#10b981' },
  { id: 'stealth', name: 'Nightshade', cost: 100, description: 'Radar invisible angular design.', color: '#1e293b' },
  { id: 'royal', name: 'Golden Wing', cost: 100, description: 'Ceremonial royal guard ship.', color: '#fbbf24' },
  { id: 'alien', name: 'Xeno Pod', cost: 100, description: 'Salvaged extraterrestrial tech.', color: '#d946ef' },
  { id: 'racer', name: 'Velocity X', cost: 100, description: 'Illegal street racing mod.', color: '#f43f5e' },
  { id: 'retro', name: 'Pixel Hero', cost: 100, description: 'A blast from the past.', color: '#ffffff' },
];

// --- COMPONENTS ---

// 1. Music Manager
const MusicManager = ({ screen, level }) => {
  const audioCtxRef = useRef(null);
  const isPlayingRef = useRef(false);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef(null);
  const sequenceStepRef = useRef(0);

  const MENU_TEMPO = 95; 
  const GAME_TEMPO = 110; 
  const BOSS_TEMPO = 120; 

  const SCALES = {
    MENU_MELODY: [261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25], 
    MENU_BASS: [65.41, 73.42, 87.31, 98.00], 
    GAME: [65.41, 65.41, 65.41, 77.78, 65.41, 98.00, 87.31, 65.41], 
    BOSS_LOW: [32.70, 34.65, 41.20, 32.70], 
    BOSS_BRASS: [65.41, 69.30, 82.41, 87.31, 98.00], 
    BOSS_HIGH: [1046.50, 1108.73, 1244.51, 1318.51] 
  };

  // Helper functions for sound (simplified for merging)
  const playBass = (ctx, time, freq, type, vol) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter();
    osc.type = type; osc.frequency.value = freq;
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(200, time); filter.frequency.linearRampToValueAtTime(800, time + 0.1); 
    gain.gain.setValueAtTime(vol, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination); osc.start(time); osc.stop(time + 0.2);
  };
  const playPluck = (ctx, time, freq, vol) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(vol, time + 0.01); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(time); osc.stop(time + 0.3);
  };
  const playPad = (ctx, time, freq, duration) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(0.1, time + 0.5); gain.gain.linearRampToValueAtTime(0, time + duration);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(time); osc.stop(time + duration);
  };
  const playKick = (ctx, time, freqStart) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.setValueAtTime(freqStart, time); osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(0.8, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(time); osc.stop(time + 0.5);
  };
  const playHiHat = (ctx, time, length) => {
    const bufferSize = ctx.sampleRate * length; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 5000;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.3, time); gain.gain.exponentialRampToValueAtTime(0.01, time + length);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination); noise.start(time);
  };
  const playBleep = (ctx, time, freq, duration = 0.1) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.1, time); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(time); osc.stop(time + duration);
  };
  const playShaker = (ctx, time, vol) => {
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 8000;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(vol, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    noise.connect(filter).connect(gain).connect(ctx.destination); noise.start(time);
  };
  const playTensionSnare = (ctx, time, vol) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.setValueAtTime(250, time); osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    gain.gain.setValueAtTime(vol, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    const bufferSize = ctx.sampleRate * 0.1; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 2000;
    const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(vol * 0.5, time); noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination); osc.connect(gain).connect(ctx.destination);
    noise.start(time); osc.start(time); osc.stop(time + 0.1);
  };
  const playDrone = (ctx, time, freq, duration) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain(); const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
      osc.type = 'triangle'; osc.frequency.value = freq * 0.5;
      lfo.frequency.value = 0.5; lfoGain.gain.value = 20; lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(0.15, time + 1.0); gain.gain.linearRampToValueAtTime(0, time + duration);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(time); lfo.start(time); osc.stop(time + duration); lfo.stop(time + duration);
  };
  const playCinematicKick = (ctx, time, vol) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.setValueAtTime(80, time); osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.8);
    gain.gain.setValueAtTime(vol, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
    const bufferSize = ctx.sampleRate * 0.1; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 400;
    const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(vol * 0.4, time); noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination); noise.start(time);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(time); osc.stop(time + 0.8);
  };
  const playCinematicBrass = (ctx, time, freq, duration) => {
    const osc1 = ctx.createOscillator(); const osc2 = ctx.createOscillator(); const osc3 = ctx.createOscillator();
    const gain = ctx.createGain(); const filter = ctx.createBiquadFilter();
    osc1.type = 'sawtooth'; osc2.type = 'sawtooth'; osc3.type = 'square';
    osc1.frequency.value = freq; osc2.frequency.value = freq * 1.015; osc3.frequency.value = freq * 0.5;
    filter.type = 'lowpass'; filter.Q.value = 4; filter.frequency.setValueAtTime(freq * 0.8, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 6, time + 0.3); filter.frequency.exponentialRampToValueAtTime(freq, time + duration);
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(0.4, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.2, time + 0.5); gain.gain.linearRampToValueAtTime(0, time + duration);
    osc1.connect(filter); osc2.connect(filter); osc3.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc1.start(time); osc2.start(time); osc3.start(time);
    const stopTime = time + duration + 0.5; osc1.stop(stopTime); osc2.stop(stopTime); osc3.stop(stopTime);
  };
  const playSpaceChime = (ctx, time, freq) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(0.05, time + 0.05); gain.gain.exponentialRampToValueAtTime(0.001, time + 2.0); 
      osc.connect(gain); gain.connect(ctx.destination); osc.start(time); osc.stop(time + 2.0);
  };

  const scheduleMenuNote = (ctx, time) => {
    const step = sequenceStepRef.current % 32; 
    sequenceStepRef.current++;
    if (step % 4 === 0) {
        const bassNote = SCALES.MENU_BASS[Math.floor((step / 8)) % SCALES.MENU_BASS.length];
        playBass(ctx, time, bassNote, 'triangle', 0.2);
    }
    const arpPattern = [1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0];
    if (arpPattern[step % 16]) {
        const noteIndex = (step % 7);
        const freq = SCALES.MENU_MELODY[noteIndex];
        const finalFreq = Math.random() > 0.7 ? freq * 2 : freq;
        playPluck(ctx, time, finalFreq, 0.15);
    }
    if (step === 0 || step === 16) {
         playPad(ctx, time, SCALES.MENU_MELODY[0], 1.5); 
         playPad(ctx, time, SCALES.MENU_MELODY[4], 1.5); 
    }
  };

  const scheduleGameNote = (ctx, time) => {
    const step = sequenceStepRef.current % 16;
    sequenceStepRef.current++;
    if (step % 4 === 0) playKick(ctx, time, 110);
    if (step % 4 === 2) playHiHat(ctx, time, 0.05);
    const bassPattern = [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0];
    if (bassPattern[step]) {
        const freq = SCALES.GAME[Math.floor((step / 16) * SCALES.GAME.length) % SCALES.GAME.length];
        playBass(ctx, time, freq, 'square', 0.1);
    }
    if (Math.random() > 0.8) {
        playBleep(ctx, time, 800 + Math.random() * 400);
    }
  };

  const scheduleBossNote = (ctx, time) => {
    const step = sequenceStepRef.current % 32; 
    sequenceStepRef.current++;
    playShaker(ctx, time, 0.03); 
    const tenseRhythm = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1];
    if (tenseRhythm[step % 16]) {
        playTensionSnare(ctx, time, 0.15);
    }
    if (step % 16 === 0) {
        playDrone(ctx, time, 65.41, 4.0); 
    }
    if (step === 0) playCinematicKick(ctx, time, 0.8);
    if (step === 10) playCinematicKick(ctx, time, 0.6);
    if (step === 12) playCinematicKick(ctx, time, 0.7);
    if (step === 0) {
        playCinematicBrass(ctx, time, SCALES.BOSS_BRASS[0], 2.5); 
    }
    if (step === 16) {
        playCinematicBrass(ctx, time, SCALES.BOSS_BRASS[1], 2.5); 
    }
    if (Math.random() > 0.7) {
        const freq = SCALES.BOSS_HIGH[Math.floor(Math.random() * SCALES.BOSS_HIGH.length)];
        playSpaceChime(ctx, time, freq);
    }
  };

  useEffect(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = (window.AudioContext || window.webkitAudioContext);
      audioCtxRef.current = new AudioContextClass();
    }
    const ctx = audioCtxRef.current;
    
    const scheduler = () => {
      if (isPlayingRef.current && ctx) {
        while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
            if (screen === 'MENU') {
                scheduleMenuNote(ctx, nextNoteTimeRef.current);
                nextNoteTimeRef.current += 15.0 / MENU_TEMPO; 
            } else if (screen === 'PLAYING') {
                const isBoss = level % 10 === 0;
                if (isBoss) {
                    scheduleBossNote(ctx, nextNoteTimeRef.current);
                    nextNoteTimeRef.current += 15.0 / BOSS_TEMPO; 
                } else {
                    scheduleGameNote(ctx, nextNoteTimeRef.current);
                    nextNoteTimeRef.current += 15.0 / GAME_TEMPO; 
                }
            } else {
                nextNoteTimeRef.current += 0.5; 
            }
        }
        timerIDRef.current = requestAnimationFrame(scheduler);
      } else {
        timerIDRef.current = requestAnimationFrame(scheduler);
      }
    };
    timerIDRef.current = requestAnimationFrame(scheduler);
    return () => { if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current); };
  }, [screen, level]);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (screen === 'MENU' || screen === 'PLAYING') {
      if (ctx.state === 'suspended') ctx.resume();
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        nextNoteTimeRef.current = ctx.currentTime + 0.1;
        sequenceStepRef.current = 0;
      }
    } else {
      isPlayingRef.current = false;
    }
  }, [screen]);

  return null;
};

// 2. Modals
const GameOverModal = ({ distance, level, onRetry, onMenu }) => {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-500">
      <div className="w-11/12 max-w-md bg-gradient-to-b from-red-950/80 to-black border border-red-900/50 p-8 rounded-3xl text-center shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-500">
        <div className="inline-block mb-6 animate-bounce">
          <div className="p-4 bg-red-950/50 rounded-full border border-red-900"><AlertTriangle size={48} className="text-red-500" /></div>
        </div>
        <h1 className="text-4xl font-black text-red-500 uppercase mb-2 drop-shadow-sm">Mission Failed</h1>
        <p className="text-red-200/50 font-mono mb-8 text-sm">Ship signal lost in deep space.</p>
        <div className="bg-black/40 rounded-2xl p-6 mb-8 border border-red-900/30">
            <div className="text-red-400 font-bold text-xs tracking-widest uppercase mb-1">Distance Traveled</div>
            <div className="text-5xl font-mono font-bold text-white mb-2">{distance}m</div>
            <div className="text-slate-500 text-xs font-bold tracking-wider">LEVEL {level}</div>
        </div>
        <div className="flex gap-4 justify-center">
            <button onClick={onRetry} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 hover:shadow-lg hover:shadow-red-900/50 active:scale-95"><RefreshCw size={20} /> RETRY</button>
            <button onClick={onMenu} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 px-6 py-4 rounded-xl font-bold border border-slate-800 hover:border-slate-700 transition-all hover:scale-105 active:scale-95"><MenuIcon size={20} /> MENU</button>
        </div>
      </div>
    </div>
  );
};

const VictoryModal = ({ level, coinsEarned, onNextLevel, onReplay, onMenu, isLastLevel }) => {
  return (
    <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-500">
      <div className="w-11/12 max-w-md bg-gradient-to-b from-slate-900 to-black border border-cyan-500/30 p-8 rounded-3xl text-center shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-in zoom-in-95 slide-in-from-bottom-5 duration-500">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse"></div>
          <Trophy size={64} className="relative text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
          <Star size={24} className="absolute -top-2 -right-4 text-white animate-spin-slow" fill="currentColor" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase mb-2">MISSION COMPLETE</h1>
        <p className="text-slate-400 font-mono mb-6 text-sm">Sector cleared.</p>
        <div className="flex gap-4 mb-8">
            <div className="flex-1 bg-slate-800/50 rounded-2xl p-4 border border-cyan-500/20">
                <div className="text-cyan-500 font-bold text-[10px] tracking-widest uppercase mb-1">Target</div>
                <div className="text-2xl font-mono font-bold text-white">{100 + ((level - 1) * 30)}m</div>
            </div>
            <div className="flex-1 bg-yellow-900/20 rounded-2xl p-4 border border-yellow-500/30">
                <div className="text-yellow-500 font-bold text-[10px] tracking-widest uppercase mb-1">Earned</div>
                <div className="flex items-center justify-center gap-1 text-2xl font-mono font-bold text-yellow-100"><Coins size={20} className="text-yellow-400"/> +{coinsEarned}</div>
            </div>
        </div>
        <div className="flex flex-col gap-3 justify-center">
            {!isLastLevel ? (
                 <button onClick={onNextLevel} className="group w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] active:scale-95">NEXT MISSION <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" /></button>
            ) : (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-lg text-yellow-200 font-bold mb-4 animate-pulse">🏆 KELAZZ! <br/> DAH JAGO NI YAA.</div>
            )}
            <div className="flex gap-3">
                <button onClick={onReplay} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-4 rounded-xl font-bold border border-slate-700 transition-all hover:scale-105 active:scale-95"><RefreshCcw size={20} /> REPLAY</button>
                <button onClick={onMenu} className="flex-1 flex items-center justify-center gap-2 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white px-4 py-4 rounded-xl font-bold border border-transparent hover:border-slate-700 transition-all hover:scale-105 active:scale-95"><MenuIcon size={20} /> MENU</button>
            </div>
        </div>
      </div>
    </div>
  );
};

const SystemHalted = () => {
  return (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 text-slate-500">
      <Power size={64} className="text-red-900 mb-6" />
      <h1 className="text-4xl font-mono text-red-900 mb-4 tracking-tighter">SYSTEM HALTED</h1>
      <p className="mb-8">It is now safe to close your browser.</p>
      <button onClick={() => window.location.reload()} className="flex items-center gap-2 border border-slate-800 px-4 py-2 rounded text-slate-600 hover:text-slate-400 hover:border-slate-600 transition-colors"><RefreshCcw size={16} /> Reboot System</button>
    </div>
  );
};

// 3. Main Menu
const MainMenu = ({ coins, onPlay, onLevels, onShop, onExit }) => {
  const playClickSound = () => {
    try {
        const AudioContextClass = (window.AudioContext || window.webkitAudioContext);
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };
  const handlePlay = () => { playClickSound(); onPlay(); };
  const handleLevels = () => { playClickSound(); onLevels(); };
  const handleShop = () => { playClickSound(); onShop(); };
  const handleExit = () => { playClickSound(); onExit(); };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#020205_100%)] z-20 animate-in fade-in zoom-in duration-700">
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-full border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
        <Coins className="text-yellow-400" size={20} />
        <span className="text-yellow-100 font-bold font-mono text-lg">{coins}</span>
      </div>
      <div className="text-center mb-10 animate-in slide-in-from-top-10 fade-in duration-1000">
        <div className="relative inline-block mb-4 text-cyan-400 drop-shadow-[0_0_25px_rgba(34,211,238,0.6)] animate-bounce">
          <Rocket size={80} strokeWidth={1.5} />
        </div>
        <h1 className="text-5xl sm:text-6xl font-black italic leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500 drop-shadow-lg">
          METEOR<br />ESCAPE
        </h1>
      </div>
      <div className="flex flex-col gap-3 w-64 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-150 fill-mode-backwards">
        <button onClick={handlePlay} className="group flex items-center justify-center gap-3 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg rounded-xl shadow-[0_10px_15px_-3px_rgba(8,145,178,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] active:scale-95">
          <Play size={24} fill="currentColor" className="group-hover:translate-x-1 transition-transform" /> PLAY NOW
        </button>
        <button onClick={handleLevels} className="group flex items-center justify-center gap-3 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-lg rounded-xl transition-all duration-300 hover:scale-105 hover:border-cyan-500/50 hover:text-white active:scale-95">
          <Grid size={24} className="group-hover:rotate-90 transition-transform duration-500" /> LEVELS
        </button>
        <button onClick={handleShop} className="group flex items-center justify-center gap-3 px-8 py-3 bg-indigo-900/50 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/50 font-bold text-lg rounded-xl transition-all duration-300 hover:scale-105 hover:border-indigo-400 hover:text-white hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] active:scale-95">
          <ShoppingCart size={24} className="group-hover:-rotate-12 transition-transform" /> HANGAR
        </button>
        <button onClick={handleExit} className="group flex items-center justify-center gap-3 px-8 py-3 bg-transparent hover:bg-red-950/30 text-red-400 border border-red-900/30 font-bold text-lg rounded-xl transition-all duration-300 hover:border-red-500/50 hover:text-red-300 active:scale-95">
          <LogOut size={24} className="group-hover:-translate-x-1 transition-transform" /> EXIT
        </button>
      </div>
      <p className="mt-8 text-slate-600 font-mono text-sm opacity-60">v2.2.0 Economy Update</p>
    </div>
  );
};

// 4. Level Select
const LevelSelect = ({ onBack, onSelectLevel }) => {
  const levels = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950 z-20 animate-in slide-in-from-right duration-500">
      <div className="flex items-center gap-4 p-6 bg-slate-900/80 backdrop-blur-md shadow-md sticky top-0 z-10 border-b border-slate-800">
        <button onClick={onBack} className="p-3 rounded-full hover:bg-slate-800 text-white transition-all hover:-translate-x-1">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-cyan-400 tracking-widest drop-shadow-sm">SELECT MISSION</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {levels.map((level) => {
            const isHard = level > 20; const isMedium = level > 10 && !isHard;
            const difficultyColor = isHard ? 'border-red-500/30 text-red-200' : (isMedium ? 'border-yellow-500/30 text-yellow-200' : 'border-cyan-500/30 text-cyan-200');
            const hoverBorder = isHard ? 'group-hover:border-red-500' : (isMedium ? 'group-hover:border-yellow-500' : 'group-hover:border-cyan-400');
            const starColor = isHard ? 'bg-red-500' : (isMedium ? 'bg-yellow-500' : 'bg-cyan-400');
            const stars = Math.ceil(level / 10);
            const distance = 100 + ((level - 1) * 30);
            return (
              <button key={level} onClick={() => onSelectLevel(level)} className={`group aspect-square flex flex-col items-center justify-center bg-slate-900/50 border-2 ${difficultyColor} rounded-2xl transition-all duration-200 hover:scale-105 hover:bg-slate-800 ${hoverBorder} hover:shadow-lg`}>
                <span className="text-2xl sm:text-3xl font-black mb-1 opacity-80 group-hover:opacity-100 transition-opacity">{level}</span>
                <div className="flex gap-1 mb-1">
                  {Array.from({ length: stars }).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${starColor} rounded-full shadow-[0_0_5px_currentColor]`} />
                  ))}
                </div>
                <div className="text-[10px] sm:text-xs opacity-50 font-mono group-hover:opacity-90">{distance}m</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 5. Shop
const Shop = ({ coins, unlockedShips, selectedShipId, onBuy, onSelect, onBack }) => {
  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950 z-20 animate-in slide-in-from-right duration-500">
      <div className="flex items-center justify-between p-6 bg-slate-900/80 backdrop-blur-md shadow-md sticky top-0 z-10 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 rounded-full hover:bg-slate-800 text-white transition-all hover:-translate-x-1">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-indigo-400 tracking-widest drop-shadow-sm">SHIP HANGAR</h2>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-full border border-yellow-500/30">
            <Coins className="text-yellow-400" size={20} />
            <span className="text-yellow-100 font-bold font-mono text-lg">{coins}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {SHIP_DESIGNS.map((ship) => {
            const isUnlocked = unlockedShips.includes(ship.id);
            const isSelected = selectedShipId === ship.id;
            const canAfford = coins >= ship.cost;
            return (
              <div key={ship.id} className={`relative group flex flex-col bg-slate-900/50 border-2 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${isSelected ? 'border-indigo-500 bg-indigo-950/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : isUnlocked ? 'border-slate-700 hover:border-slate-500' : 'border-slate-800 opacity-80 hover:opacity-100'}`}>
                <div className="h-32 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020617_100%)] opacity-50"></div>
                    <Rocket size={64} color={ship.color} className={`drop-shadow-[0_0_15px_${ship.color}] transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`} style={{transform: 'rotate(45deg)'}} />
                </div>
                <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className={`text-xl font-bold ${isSelected ? 'text-indigo-400' : 'text-slate-200'}`}>{ship.name}</h3>
                        {isUnlocked && <Check size={20} className="text-green-500" />}
                        {!isUnlocked && <Lock size={18} className="text-slate-500" />}
                    </div>
                    <p className="text-sm text-slate-400 mb-4 flex-1">{ship.description}</p>
                    {isUnlocked ? (
                         <button onClick={() => onSelect(ship.id)} disabled={isSelected} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isSelected ? 'bg-indigo-600 text-white cursor-default' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
                         {isSelected ? 'EQUIPPED' : 'SELECT SHIP'}
                       </button>
                    ) : (
                        <button onClick={() => onBuy(ship.id, ship.cost)} disabled={!canAfford} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-white hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                        <Coins size={16} /> UNLOCK ({ship.cost})
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 6. Game Loop (The Engine)
const GameLoop = ({ level, selectedShipId, onGameOver, onVictory, onExit }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(0);
  const audioCtxRef = useRef(null);
  const engineNoiseSrcRef = useRef(null);
  const engineNoiseFilterRef = useRef(null);
  const engineNoiseGainRef = useRef(null);
  const engineTurbineOscRef = useRef(null);
  const engineTurbineGainRef = useRef(null);
  
  const [hudDistance, setHudDistance] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [bossActive, setBossActive] = useState(false);
  const [bossHp, setBossHp] = useState(0);
  const [bossMaxHp, setBossMaxHp] = useState(100);
  
  // Game State
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const isPausedRef = useRef(false);
  const countdownRef = useRef(3);

  const framesRef = useRef(0);
  const distanceRef = useRef(0);
  const isThrustingRef = useRef(false);
  const isBossFightRef = useRef(false);
  const nextPowerUpFrameRef = useRef(Math.floor(Math.random() * 240) + 360);
  
  const shipRef = useRef({ x: 100, y: 0, w: 50, h: 30, vy: 0, thrust: -0.55, gravity: 0.22, hp: 100, maxHp: 100, shield: 0 });
  const meteorsRef = useRef([]);
  const starsRef = useRef([]);
  const enemiesRef = useRef([]);
  const lasersRef = useRef([]);
  const particlesRef = useRef([]);
  const planetsRef = useRef([]);
  const blackHolesRef = useRef([]);
  const powerUpsRef = useRef([]);
  const bossRef = useRef({ active: false, x: -200, y: 0, w: 180, h: 120, hp: 100, maxHp: 100, vy: 1, lastShot: 0, angle: 0 });

  const TARGET_DISTANCE = 100 + ((level - 1) * 30);
  const IS_BOSS_LEVEL = level % 10 === 0;

  // Sync refs
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { countdownRef.current = countdown; }, [countdown]);

  // Game Initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset game state
    framesRef.current = 0; distanceRef.current = 0;
    shipRef.current = { x: 200, y: canvas.height / 2, w: 50, h: 30, vy: 0, thrust: -0.55, gravity: 0.22, hp: 100, maxHp: 100, shield: 0 };
    meteorsRef.current = []; enemiesRef.current = []; lasersRef.current = [];
    particlesRef.current = []; planetsRef.current = []; blackHolesRef.current = []; powerUpsRef.current = [];
    isThrustingRef.current = false;
    nextPowerUpFrameRef.current = Math.floor(Math.random() * 240) + 360;

    // Reset Control State
    setCountdown(3);
    setIsPaused(false);
    
    // Boss Setup
    const baseBossHp = 300 + (level * 20); 
    setBossMaxHp(baseBossHp); setBossHp(baseBossHp);
    if (IS_BOSS_LEVEL) {
        isBossFightRef.current = true; setBossActive(true);
        bossRef.current = { active: true, x: -300, y: canvas.height / 2 - 60, w: 180, h: 120, hp: baseBossHp, maxHp: baseBossHp, vy: 0.5, lastShot: 0, angle: 0 };
    } else {
        isBossFightRef.current = false; setBossActive(false); bossRef.current.active = false;
    }
    setHudDistance(0); setShowHint(true);

    // Audio Setup
    try {
        const AudioContextClass = (window.AudioContext || window.webkitAudioContext);
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const bufferSize = ctx.sampleRate * 2; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0); let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1; data[i] = (lastOut + (0.02 * white)) / 1.02; lastOut = data[i]; data[i] *= 3.5;
        }
        const noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = buffer; noiseSrc.loop = true;
        const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 200;
        const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.1;
        noiseSrc.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination); noiseSrc.start();
        engineNoiseSrcRef.current = noiseSrc; engineNoiseFilterRef.current = noiseFilter; engineNoiseGainRef.current = noiseGain;

        const turbineOsc = ctx.createOscillator(); turbineOsc.type = 'triangle'; turbineOsc.frequency.value = 300;
        const turbineGain = ctx.createGain(); turbineGain.gain.value = 0.05;
        const turbineFilter = ctx.createBiquadFilter(); turbineFilter.type = 'highpass'; turbineFilter.frequency.value = 500;
        turbineOsc.connect(turbineFilter); turbineFilter.connect(turbineGain); turbineGain.connect(ctx.destination); turbineOsc.start();
        engineTurbineOscRef.current = turbineOsc; engineTurbineGainRef.current = turbineGain;
    } catch (e) {}

    // Initial Stars
    const newStars = [];
    const starColors = ['#ffffff', '#ffffff', '#e0f2fe', '#fef3c7', '#fed7aa'];
    for(let i = 0; i < 2000; i++) {
      const depth = Math.random();
      newStars.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        s: Math.random() * 1.5 + 0.5 * depth, speed: (Math.random() * 0.4 + 0.1) * (depth + 0.5),
        alpha: Math.random() * 0.5 + 0.3 + (depth * 0.2), twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.05 + 0.01, color: starColors[Math.floor(Math.random() * starColors.length)]
      });
    }
    starsRef.current = newStars;
    planetsRef.current.push(generatePlanet(canvas.width * 0.2, canvas.height));
    planetsRef.current.push(generatePlanet(canvas.width * 0.8, canvas.height));

    const handleResize = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      if (shipRef.current.y > canvas.height) shipRef.current.y = canvas.height - 50;
    };
    window.addEventListener('resize', handleResize); handleResize();

    const handleInteraction = () => { if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume(); };
    const startThrust = () => { 
        handleInteraction(); 
        if (!isPausedRef.current && countdownRef.current === 0) isThrustingRef.current = true; 
    };
    const stopThrust = () => { isThrustingRef.current = false; };
    const handleKey = (e) => { 
        if (e.code === 'Space') { 
            handleInteraction(); 
            if (!isPausedRef.current && countdownRef.current === 0) isThrustingRef.current = e.type === 'keydown'; 
            else isThrustingRef.current = false;
        } 
        if (e.code === 'Escape' && e.type === 'keydown') {
            handleInteraction();
            setIsPaused(prev => !prev);
        }
    };

    window.addEventListener('mousedown', startThrust); window.addEventListener('mouseup', stopThrust);
    window.addEventListener('touchstart', startThrust, { passive: false }); window.addEventListener('touchend', stopThrust);
    window.addEventListener('keydown', handleKey); window.addEventListener('keyup', handleKey);

    return () => {
      if (engineNoiseSrcRef.current) try { engineNoiseSrcRef.current.stop(); } catch(e){}
      if (engineTurbineOscRef.current) try { engineTurbineOscRef.current.stop(); } catch(e){}
      if (audioCtxRef.current) audioCtxRef.current.close();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', startThrust); window.removeEventListener('mouseup', stopThrust);
      window.removeEventListener('touchstart', startThrust); window.removeEventListener('touchend', stopThrust);
      window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKey);
    };
  }, [level, selectedShipId]);

  // Animation Loop Effect
  useEffect(() => {
    if (isPaused) return;

    const loop = () => {
        update();
        draw();
        requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPaused]);

  // Countdown Timer Effect
  useEffect(() => {
    if (!isPaused && countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }
  }, [countdown, isPaused]);

  const handleResume = () => {
      setCountdown(3);
      setIsPaused(false);
  };

  const handleMenuExit = () => {
      onExit();
  };

  const generatePlanet = (x, h) => {
      const types = ['gas', 'terrestrial', 'ringed', 'moon'];
      const colors = ['#A5F3FC', '#FDE047', '#EA580C', '#15803D', '#7C3AED', '#94A3B8', '#3B82F6', '#BE123C'];
      return {
          id: Math.random(), x, y: h * 0.15 + Math.random() * (h * 0.7), radius: Math.random() * 80 + 30,
          color: colors[Math.floor(Math.random() * colors.length)], type: types[Math.floor(Math.random() * types.length)],
          speed: Math.random() * 0.2 + 0.05, textureSeed: Math.random() * 10000
      };
  };
  const generateMeteorShape = (size) => {
      const vertices = []; const numPoints = 7 + Math.floor(Math.random() * 5);
      for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2; const r = (size / 2) * (0.6 + Math.random() * 0.6);
          vertices.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      } return vertices;
  };
  const seededRandom = (seed) => {
      var t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const createExplosion = (x, y, color, count, speedMult = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 3 * speedMult;
      let pColor = color;
      if (color === '#ef4444' || color === '#f97316' || color === '#EA580C') {
          const rand = Math.random(); if (rand > 0.6) pColor = '#facc15'; if (rand > 0.8) pColor = '#ffffff'; 
      }
      particlesRef.current.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.0, maxLife: Math.random() * 20 + 10, color: pColor, size: Math.random() * 3 + 1 });
    }
  };
  const createThrustParticles = (ship) => {
      for(let i=0; i<2; i++) {
          particlesRef.current.push({ x: ship.x, y: ship.y + ship.h/2 + (Math.random() - 0.5) * 6, vx: -(Math.random() * 3 + 3), vy: (Math.random() - 0.5) * 1, life: Math.random() * 0.4 + 0.2, maxLife: 20, color: Math.random() > 0.6 ? '#f97316' : '#fbbf24', size: Math.random() * 3 + 1 });
      }
  };
  const playPowerUpSound = () => {
    if (!audioCtxRef.current) return; const ctx = audioCtxRef.current; if (ctx.state === 'suspended') ctx.resume(); const t = ctx.currentTime;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(1200, t); osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
    gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.4);
    const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
    osc2.type = 'triangle'; osc2.frequency.setValueAtTime(2400, t); gain2.gain.setValueAtTime(0.1, t); gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc2.connect(gain2); gain2.connect(ctx.destination); osc2.start(t); osc2.stop(t + 0.3);
  };
  const playVictorySound = () => {
    if (!audioCtxRef.current) return; const ctx = audioCtxRef.current; if (ctx.state === 'suspended') ctx.resume(); const t = ctx.currentTime;
    const playTone = (freq, startTime) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.1, startTime); gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(startTime); osc.stop(startTime + 0.4);
    };
    playTone(523.25, t); playTone(659.25, t + 0.1); playTone(783.99, t + 0.2); playTone(1046.50, t + 0.3);
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(1567.98, t + 0.4); gain.gain.setValueAtTime(0.1, t + 0.4); gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t + 0.4); osc.stop(t + 1.4);
  };
  const playCrashSound = () => {
    if (!audioCtxRef.current) return; const ctx = audioCtxRef.current; if (ctx.state === 'suspended') ctx.resume(); const t = ctx.currentTime;
    const osc = ctx.createOscillator(); const oscGain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    oscGain.gain.setValueAtTime(0.8, t); oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(oscGain); oscGain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.45);
    const bufferSize = ctx.sampleRate * 0.4; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.setValueAtTime(500, t); noiseFilter.frequency.linearRampToValueAtTime(100, t + 0.3);
    const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(0.4, t); noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    noiseSrc.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination); noiseSrc.start(t);
    const debrisOsc = ctx.createOscillator(); const debrisGain = ctx.createGain();
    debrisOsc.type = 'sawtooth'; debrisOsc.frequency.setValueAtTime(Math.random() * 500 + 200, t);
    debrisGain.gain.setValueAtTime(0.2, t); debrisGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    debrisOsc.connect(debrisGain); debrisGain.connect(ctx.destination); debrisOsc.start(t); debrisOsc.stop(t + 0.1);
  };
  const playLaserSound = (type) => {
    if (!audioCtxRef.current) return; const ctx = audioCtxRef.current; if (ctx.state === 'suspended') ctx.resume(); const t = ctx.currentTime;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'BOSS') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
        gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5); osc.start(t); osc.stop(t + 0.55);
    } else {
        osc.type = 'square'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
        gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15); osc.start(t); osc.stop(t + 0.2);
    }
  };
  const damagePlayer = (amount) => {
    const ship = shipRef.current;
    if (ship.shield > 0) {
        ship.shield--; playCrashSound(); createExplosion(ship.x + ship.w/2, ship.y + ship.h/2, '#22d3ee', 15, 2); return false;
    }
    if (ship.hp <= 0) return true;
    playCrashSound(); ship.hp -= amount; createExplosion(ship.x + 25, ship.y + 15, '#ef4444', 8, 0.5);
    if (ship.hp <= 0) {
        ship.hp = 0; createExplosion(ship.x + 25, ship.y + 15, '#f97316', 80, 1.5); 
        onGameOver(Math.floor(distanceRef.current / 10)); cancelAnimationFrame(requestRef.current); return true;
    }
    return false;
  };
  const handleLevelComplete = (dist) => {
      playVictorySound(); const reward = IS_BOSS_LEVEL ? 50 : 20; onVictory(dist, reward); cancelAnimationFrame(requestRef.current);
  };

  const update = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    
    // Always animate background even during countdown
    const ship = shipRef.current;
    
    // Background updates
    starsRef.current.forEach(s => { 
        s.x -= s.speed + (level * 0.05); if (s.x < 0) s.x = canvas.width; 
    });
    for (let i = planetsRef.current.length - 1; i >= 0; i--) { const p = planetsRef.current[i]; p.x -= p.speed * (1 + level * 0.05); if (p.x + p.radius * 2 < -100) planetsRef.current.splice(i, 1); }
    for (let i = blackHolesRef.current.length - 1; i >= 0; i--) { const bh = blackHolesRef.current[i]; bh.x -= bh.speed; if (bh.x + bh.radius * 4 < -500) blackHolesRef.current.splice(i, 1); }
    if (framesRef.current % 300 === 0) planetsRef.current.push(generatePlanet(canvas.width + 100, canvas.height));
    if (framesRef.current % 2000 === 0 && Math.random() > 0.5) blackHolesRef.current.push({ id: Math.random(), x: canvas.width + 300, y: canvas.height * 0.25 + Math.random() * (canvas.height * 0.5), radius: Math.random() * 50 + 50, speed: 0.1 });
    framesRef.current++;

    // If countdown is active, freeze game mechanics but keep visuals
    if (countdownRef.current > 0) {
        return;
    }

    if (audioCtxRef.current && engineNoiseGainRef.current && engineNoiseFilterRef.current && engineTurbineOscRef.current && engineTurbineGainRef.current) {
        const now = audioCtxRef.current.currentTime;
        if (isThrustingRef.current) {
            engineNoiseFilterRef.current.frequency.setTargetAtTime(1500, now, 0.5); engineNoiseGainRef.current.gain.setTargetAtTime(0.3, now, 0.3);
            engineTurbineOscRef.current.frequency.setTargetAtTime(800, now, 0.8); engineTurbineGainRef.current.gain.setTargetAtTime(0.1, now, 0.3);
        } else {
            engineNoiseFilterRef.current.frequency.setTargetAtTime(300, now, 0.5); engineNoiseGainRef.current.gain.setTargetAtTime(0.1, now, 0.5);
            engineTurbineOscRef.current.frequency.setTargetAtTime(300, now, 0.8); engineTurbineGainRef.current.gain.setTargetAtTime(0.02, now, 0.5);
        }
    }

    if (isThrustingRef.current) { ship.vy += ship.thrust; createThrustParticles(ship); }
    ship.vy += ship.gravity; ship.y += ship.vy;
    if (ship.y < 0) { ship.y = 0; ship.vy = 0; }
    if (ship.y + ship.h > canvas.height) { createExplosion(ship.x, ship.y, '#ef4444', 50); onGameOver(Math.floor(distanceRef.current / 10)); cancelAnimationFrame(requestRef.current); return; }

    distanceRef.current++; const currentDistMeters = Math.floor(distanceRef.current / 10);
    if (framesRef.current % 10 === 0) {
      setHudDistance(currentDistMeters);
      if (isBossFightRef.current) {
        setBossHp(bossRef.current.hp);
        if (bossRef.current.hp <= 0) { createExplosion(bossRef.current.x + bossRef.current.w/2, bossRef.current.y + bossRef.current.h/2, '#ef4444', 200, 3); handleLevelComplete(currentDistMeters); return; }
      } else {
         if (currentDistMeters >= TARGET_DISTANCE) { handleLevelComplete(currentDistMeters); return; }
      }
    }
    if (framesRef.current > 200 && showHint) setShowHint(false);
    
    if (framesRef.current >= nextPowerUpFrameRef.current) {
        nextPowerUpFrameRef.current = framesRef.current + Math.floor(Math.random() * 240) + 360;
        const type = Math.random() > 0.5 ? 'REGEN' : 'SHIELD';
        powerUpsRef.current.push({ x: canvas.width + 50, y: Math.random() * (canvas.height - 100) + 50, type: type, radius: 20, speed: 3, wobbleOffset: Math.random() * 10 });
    }
    const shipBox = { x: ship.x + 8, y: ship.y + 8, w: ship.w - 16, h: ship.h - 16 };
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const p = powerUpsRef.current[i]; p.x -= p.speed; p.y += Math.sin((framesRef.current * 0.05) + p.wobbleOffset) * 1.5;
        const dist = Math.hypot((ship.x + ship.w/2) - p.x, (ship.y + ship.h/2) - p.y);
        if (dist < p.radius + ship.w/2) {
            playPowerUpSound();
            if (p.type === 'REGEN') { ship.hp = Math.min(ship.maxHp, ship.hp + 30); createExplosion(ship.x + ship.w/2, ship.y + ship.h/2, '#4ade80', 20, 1.5); } 
            else if (p.type === 'SHIELD') { ship.shield = 3; createExplosion(ship.x + ship.w/2, ship.y + ship.h/2, '#22d3ee', 20, 1.5); }
            powerUpsRef.current.splice(i, 1); continue;
        }
        if (p.x < -50) powerUpsRef.current.splice(i, 1);
    }

    const levelMult = 0.5; const baseSpeed = 4 + (level * levelMult); const speed = baseSpeed + (distanceRef.current / 2000); 
    const meteorRate = isBossFightRef.current ? 45 : Math.max(20, 70 - (level * 1.5)); 
    if (framesRef.current % Math.floor(meteorRate) === 0) {
      const rand = Math.random(); let size = 40; let moveType = 'LINEAR'; let mSpeed = speed;
      if (rand > 0.85) { size = Math.random() * 60 + 60; } 
      else if (rand > 0.5) { size = Math.random() * 40 + 20; moveType = 'WOBBLE'; } 
      else if (rand < 0.15) { size = Math.random() * 15 + 10; mSpeed *= 1.8; moveType = 'FAST'; } 
      else { size = Math.random() * 30 + 30; }
      meteorsRef.current.push({ x: canvas.width + 100, y: Math.random() * (canvas.height - size), size: size, speed: mSpeed, vx: 0, rot: Math.random() * 6.28, rotSpeed: (Math.random() - 0.5) * (moveType === 'FAST' ? 0.3 : 0.1), vertices: generateMeteorShape(size), movementType: moveType });
    }

    if (level >= 2 && !isBossFightRef.current) {
      const enemyRate = Math.max(100, 200 - (level * 5));
      if (framesRef.current % enemyRate === 0) { 
        let possibleTypes = ['BASIC'];
        if (level >= 3) possibleTypes.push('STRAFER'); if (level >= 5) possibleTypes.push('KAMIKAZE'); if (level >= 7) possibleTypes.push('HOMING'); if (level >= 9) possibleTypes.push('HEAVY');
        const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
        let w = 40, h = 25, enemySpeed = baseSpeed * 0.8, hp = 1;
        if (type === 'HEAVY') { w=60; h=40; hp=5; enemySpeed*=0.5; } if (type === 'KAMIKAZE') { w=30; h=20; hp=1; enemySpeed*=1.5; } if (type === 'HOMING') { enemySpeed*=0.7; }
        const startY = Math.random() * (canvas.height - h); let fireRate = 100; if (type === 'HEAVY') fireRate = 140; if (type === 'HOMING') fireRate = 120;
        const initialShotDelay = fireRate - 20; 
        enemiesRef.current.push({ id: Date.now() + Math.random(), type, x: canvas.width + 50, y: startY, initialY: startY, w, h, speed: enemySpeed, hp, maxHp: hp, lastShot: framesRef.current - initialShotDelay, timeAlive: 0 });
      }
    }

    if (isBossFightRef.current && bossRef.current.active) {
      const boss = bossRef.current; boss.angle += 0.05; if (boss.x < 50) boss.x += 1;
      const hoverOffset = Math.sin(boss.angle) * 2; const targetY = ship.y - boss.h/2; const dy = targetY - boss.y; boss.vy = dy * 0.02; boss.y += boss.vy + hoverOffset * 0.1;
      if (boss.y < 0) boss.y = 0; if (boss.y + boss.h > canvas.height) boss.y = canvas.height - boss.h;
      if (framesRef.current - boss.lastShot > 50) { 
        boss.lastShot = framesRef.current; playLaserSound('BOSS');
        lasersRef.current.push({ type: 'BOSS', x: boss.x + boss.w - 20, y: boss.y + boss.h / 2, vx: 15, vy: (ship.y - (boss.y + boss.h/2)) * 0.015, w: 40, h: 6, color: '#34d399', damage: 15 });
      }
    }

    for (let i = particlesRef.current.length - 1; i >= 0; i--) { const p = particlesRef.current[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.02; p.size *= 0.95; if (p.life <= 0) particlesRef.current.splice(i, 1); }
    for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
      const m = meteorsRef.current[i]; m.x -= m.speed;
      if (m.movementType === 'WOBBLE') { m.y += Math.sin(framesRef.current * 0.05) * 2; } m.rot += m.rotSpeed;
      if (rectIntersect(shipBox, {x: m.x + 5, y: m.y + 5, w: m.size - 10, h: m.size - 10})) { createExplosion(m.x + m.size/2, m.y + m.size/2, '#94a3b8', 12); meteorsRef.current.splice(i, 1); if (damagePlayer(10)) return; continue; }
      if (isBossFightRef.current && bossRef.current.active) {
        const boss = bossRef.current;
        if (rectIntersect({x: boss.x + 20, y: boss.y + 20, w: boss.w - 40, h: boss.h - 40}, {x: m.x, y: m.y, w: m.size, h: m.size})) {
          const meteorDmg = Math.floor(m.size * 0.8); bossRef.current.hp -= meteorDmg;
          createExplosion(m.x + m.size/2, m.y + m.size/2, '#94a3b8', 15); createExplosion(m.x + m.size/2, m.y + m.size/2, '#3f3f46', 8); meteorsRef.current.splice(i, 1); continue;
        }
      }
      if (m.x + m.size < -100) meteorsRef.current.splice(i, 1);
    }

    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const e = enemiesRef.current[i]; e.timeAlive++;
      switch (e.type) {
          case 'STRAFER': e.x -= e.speed; e.y = e.initialY + Math.sin(e.timeAlive * 0.05) * 60; break;
          case 'KAMIKAZE': e.x -= e.speed * 1.5; const dy = ship.y - e.y; e.y += dy * 0.02; break;
          default: e.x -= e.speed; break;
      }
      if (e.y < 0) e.y = 0; if (e.y + e.h > canvas.height) e.y = canvas.height - e.h;
      if (e.type !== 'KAMIKAZE') {
          let fireRate = 100; if (e.type === 'HEAVY') fireRate = 140; if (e.type === 'HOMING') fireRate = 120;
          if (framesRef.current - e.lastShot > fireRate) {
             e.lastShot = framesRef.current; playLaserSound('ENEMY');
             if (e.type === 'HEAVY') { for(let angle of [-0.2, 0, 0.2]) { lasersRef.current.push({ type: 'NORMAL', x: e.x, y: e.y + e.h / 2, vx: -10, vy: angle * 8, w: 15, h: 5, color: '#60a5fa', damage: 15 }); } } 
             else if (e.type === 'HOMING') { lasersRef.current.push({ type: 'HOMING', x: e.x, y: e.y + e.h / 2, vx: -7, vy: 0, w: 12, h: 12, color: '#d8b4fe', damage: 15 }); } 
             else { lasersRef.current.push({ type: 'NORMAL', x: e.x, y: e.y + e.h / 2, vx: -12, vy: 0, w: 20, h: 4, color: '#fbbf24', damage: 10 }); }
          }
      }
      if (rectIntersect(shipBox, {x: e.x, y: e.y, w: e.w, h: e.h})) { createExplosion(e.x + e.w/2, e.y + e.h/2, '#10b981', 30); enemiesRef.current.splice(i, 1); if (damagePlayer(e.type === 'KAMIKAZE' ? 35 : 20)) return; continue; }
      if (e.x + e.w < -50) enemiesRef.current.splice(i, 1);
    }

    for (let i = lasersRef.current.length - 1; i >= 0; i--) {
      const l = lasersRef.current[i]; l.x += l.vx; l.y += l.vy;
      if (l.type === 'HOMING') {
          const dx = (ship.x + ship.w/2) - l.x; const dy = (ship.y + ship.h/2) - l.y; const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 0) { l.vx += (dx/dist) * 0.25; l.vy += (dy/dist) * 0.25; }
      }
      if (rectIntersect(shipBox, {x: l.x, y: l.y, w: l.w, h: l.h})) { createExplosion(l.x + l.w/2, l.y + l.h/2, l.color, 8, 0.8); lasersRef.current.splice(i, 1); if (damagePlayer(l.damage)) return; continue; }
      if (l.x < -50 || l.x > canvas.width + 50 || l.y < -50 || l.y > canvas.height + 50) { lasersRef.current.splice(i, 1); }
    }
  };

  const rectIntersect = (r1, r2) => { return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y); };

  const draw = () => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) return;
    const bgGrad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width * 0.8);
    bgGrad.addColorStop(0, "#0f172a"); bgGrad.addColorStop(0.5, "#0b1121"); bgGrad.addColorStop(1, "#020617");
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const time = framesRef.current * 0.002;
    ctx.save(); ctx.globalAlpha = 0.05; ctx.filter = 'blur(40px)'; ctx.fillStyle = '#4c1d95'; ctx.beginPath(); ctx.arc(canvas.width / 2 - 50 + Math.sin(time)*50, canvas.height / 2, 350, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#0e7490'; ctx.beginPath(); ctx.arc(canvas.width / 2 + 50 - Math.cos(time)*50, canvas.height / 2, 300, 0, Math.PI*2); ctx.fill(); ctx.restore();
    starsRef.current.forEach(s => { const twinkle = Math.sin(framesRef.current * s.twinkleSpeed + s.twinklePhase) * 0.3 + 0.7; ctx.globalAlpha = s.alpha * twinkle; ctx.fillStyle = s.color || 'white'; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill(); s.x -= s.speed + (level * 0.05); if (s.x < 0) s.x = canvas.width; }); ctx.globalAlpha = 1;
    blackHolesRef.current.forEach(bh => drawBlackHole(ctx, bh)); planetsRef.current.forEach(p => drawPlanet(ctx, p));
    if (isBossFightRef.current && bossRef.current.active) drawBoss(ctx, bossRef.current);
    drawShip(ctx, shipRef.current, isThrustingRef.current);
    powerUpsRef.current.forEach(p => drawPowerUp(ctx, p)); meteorsRef.current.forEach(m => drawMeteor(ctx, m)); enemiesRef.current.forEach(e => drawEnemy(ctx, e)); lasersRef.current.forEach(l => drawLaser(ctx, l));
    particlesRef.current.forEach(p => { ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
  };
  const drawPowerUp = (ctx, p) => {
      ctx.save(); ctx.translate(p.x, p.y);
      const grad = ctx.createRadialGradient(0, 0, p.radius * 0.3, 0, 0, p.radius);
      if (p.type === 'REGEN') { grad.addColorStop(0, 'rgba(74, 222, 128, 0.1)'); grad.addColorStop(1, 'rgba(74, 222, 128, 0.6)'); ctx.strokeStyle = '#4ade80'; } 
      else { grad.addColorStop(0, 'rgba(34, 211, 238, 0.1)'); grad.addColorStop(1, 'rgba(34, 211, 238, 0.6)'); ctx.strokeStyle = '#22d3ee'; }
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI*2); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'white'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.type === 'REGEN' ? '+' : 'S', 0, 1);
      ctx.beginPath(); ctx.arc(-p.radius*0.3, -p.radius*0.3, 4, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill(); ctx.restore();
  };
  const drawBlackHole = (ctx, bh) => {
    ctx.save(); const grad = ctx.createRadialGradient(bh.x, bh.y, bh.radius * 1.1, bh.x, bh.y, bh.radius * 3);
    grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.1, 'rgba(249, 115, 22, 0.9)'); grad.addColorStop(0.3, 'rgba(239, 68, 68, 0.5)'); grad.addColorStop(0.6, 'rgba(147, 51, 234, 0.2)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius * 1.05, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  };
  const drawPlanet = (ctx, p) => {
    ctx.save(); ctx.translate(p.x, p.y);
    const halo = ctx.createRadialGradient(0, 0, p.radius * 0.9, 0, 0, p.radius * 1.15);
    halo.addColorStop(0, p.color); halo.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = halo; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(0, 0, p.radius * 1.15, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.clip(); 
    const baseGrad = ctx.createRadialGradient(-p.radius*0.4, -p.radius*0.4, 0, 0, 0, p.radius); baseGrad.addColorStop(0, p.color); baseGrad.addColorStop(1, '#0f172a'); ctx.fillStyle = baseGrad; ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
    if (p.type === 'gas') {
        const numBands = 6 + Math.floor(seededRandom(p.textureSeed) * 4); ctx.globalCompositeOperation = 'soft-light';
        for (let i = 0; i < numBands; i++) {
             const yPos = (seededRandom(p.textureSeed + i) - 0.5) * 2 * p.radius; const height = p.radius * 0.15 + seededRandom(p.textureSeed + i * 10) * p.radius * 0.2; const tilt = (seededRandom(p.textureSeed) - 0.5) * 0.5;
             ctx.save(); ctx.rotate(tilt); ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(-p.radius * 1.5, yPos, p.radius * 3, height); ctx.restore();
        }
    } else if (p.type === 'terrestrial') {
        const numContinents = 5 + Math.floor(seededRandom(p.textureSeed) * 4); ctx.fillStyle = 'rgba(255,255,255,0.15)'; 
        for (let i = 0; i < numContinents; i++) {
            const cx = (seededRandom(p.textureSeed + i) - 0.5) * 1.8 * p.radius; const cy = (seededRandom(p.textureSeed + i * 20) - 0.5) * 1.8 * p.radius; const size = p.radius * (0.3 + seededRandom(p.textureSeed + i * 30) * 0.5);
            ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.fill();
        }
    }
    const shadowGrad = ctx.createRadialGradient(-p.radius*0.6, -p.radius*0.6, p.radius * 0.5, 0, 0, p.radius * 1.3); shadowGrad.addColorStop(0, 'rgba(0,0,0,0)'); shadowGrad.addColorStop(1, 'rgba(0,0,0,0.85)'); ctx.fillStyle = shadowGrad; ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2); ctx.restore(); 
    if (p.type === 'ringed') { ctx.save(); ctx.rotate(-0.3); ctx.scale(1, 0.3); ctx.beginPath(); ctx.arc(0, 0, p.radius * 2.2, 0, Math.PI * 2); ctx.lineWidth = p.radius * 0.5; ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke(); ctx.restore(); } ctx.restore();
  };
  const drawShip = (ctx, ship, isThrusting) => {
    ctx.save();
    if (ship.hp < ship.maxHp) {
        const barW = 60; const barH = 5; const barX = ship.x + (ship.w/2) - (barW/2);  const barY = ship.y - 15;
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(barX, barY, barW, barH);
        const pct = Math.max(0, ship.hp / ship.maxHp); ctx.fillStyle = pct > 0.6 ? "#22c55e" : pct > 0.3 ? "#eab308" : "#ef4444"; ctx.fillRect(barX, barY, barW * pct, barH); ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
    }
    if (ship.shield > 0) {
        ctx.save(); const pulse = Math.sin(framesRef.current * 0.1) * 2; ctx.beginPath(); ctx.arc(ship.x + ship.w/2, ship.y + ship.h/2, ship.w * 0.8 + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.4 + (ship.shield * 0.1)})`; ctx.lineWidth = 2 + ship.shield; ctx.stroke(); ctx.fillStyle = `rgba(34, 211, 238, 0.1)`; ctx.fill(); ctx.restore();
    }
    ctx.translate(ship.x + ship.w/2, ship.y + ship.h/2); const tilt = Math.min(Math.max(ship.vy * 0.05, -0.25), 0.25); ctx.rotate(tilt);
    if (isThrusting) { ctx.scale(1.05, 0.95); ctx.translate((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5); }
    const w = ship.w; const h = ship.h; const hw = w/2; const hh = h/2;
    if (isThrusting) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const plumeLength = Math.random() * 20 + 25; const coreGrad = ctx.createLinearGradient(-hw + 10, 0, -hw - plumeLength * 0.6, 0);
        coreGrad.addColorStop(0, 'white'); coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)'); ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.moveTo(-hw + 10, -3); ctx.lineTo(-hw - plumeLength * 0.6, 0); ctx.lineTo(-hw + 10, 3); ctx.fill(); ctx.restore();
    }
    const createBodyGrad = (x0, y0, x1, y1, cDark, cLight) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, cDark); g.addColorStop(0.5, cLight); g.addColorStop(1, cDark); return g; };
    switch(selectedShipId) {
        case 'interceptor': 
            const gradViper = createBodyGrad(-hw, -hh, -hw, hh, '#7f1d1d', '#ef4444'); ctx.fillStyle = gradViper; ctx.beginPath(); ctx.moveTo(hw + 10, 0); ctx.lineTo(-hw, hh); ctx.lineTo(-hw + 15, 0); ctx.lineTo(-hw, -hh); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(20, 0); ctx.lineTo(0, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(2, -1, 5, 2); ctx.fillStyle = '#1f2937'; ctx.fillRect(-15, -hh + 5, 25, 2); ctx.fillRect(-15, hh - 7, 25, 2); break;
        case 'tank': 
            const tankGrad = createBodyGrad(0, -hh, 0, hh, '#334155', '#94a3b8'); ctx.fillStyle = tankGrad; ctx.beginPath(); ctx.roundRect(-hw, -18, w, 36, 4); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-hw + 6, -15, 12, 30); ctx.fillRect(0, -15, 12, 30); ctx.fillRect(18, -15, 12, 30); ctx.fillStyle = '#1e293b'; ctx.fillRect(-hw - 8, -hh - 2, 12, hh * 2 + 4); break;
        case 'scout': 
            const scoutGrad = createBodyGrad(0, -hh, 0, hh, '#ca8a04', '#facc15'); ctx.fillStyle = scoutGrad; ctx.beginPath(); ctx.ellipse(0, 0, hw, hh/1.4, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#4b5563'; ctx.fillRect(-hw, -8, 12, 16); const glassGrad = ctx.createRadialGradient(10, -5, 1, 10, -5, 10); glassGrad.addColorStop(0, '#bae6fd'); glassGrad.addColorStop(1, '#0284c7'); ctx.fillStyle = glassGrad; ctx.beginPath(); ctx.arc(6, -4, 7, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#1e293b'; ctx.fillRect(-15, -2, 30, 4); break;
        case 'bomber': 
            const bomberGrad = createBodyGrad(0, -hh, 0, hh, '#064e3b', '#10b981'); ctx.fillStyle = bomberGrad; ctx.beginPath(); ctx.moveTo(hw, 0); ctx.lineTo(-hw, hh + 8); ctx.lineTo(-hw + 12, 0); ctx.lineTo(-hw, -hh - 8); ctx.fill();
            ctx.fillStyle = '#065f46'; ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(25, 0); ctx.lineTo(10, 5); ctx.fill(); ctx.strokeStyle = '#042f2e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(0, 0); ctx.lineTo(-10, 10); ctx.stroke(); break;
        case 'stealth': 
            ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(hw + 12, 0); ctx.lineTo(-hw, hh + 10); ctx.lineTo(-10, 0); ctx.lineTo(-hw, -hh - 10); ctx.fill();
            ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1; ctx.shadowBlur = 8; ctx.shadowColor = '#38bdf8'; ctx.stroke(); ctx.shadowBlur = 0; break;
        case 'royal': 
            const goldGrad = createBodyGrad(0, -hh, 0, hh, '#78350f', '#fcd34d'); ctx.fillStyle = goldGrad; ctx.beginPath(); ctx.moveTo(hw, 0); ctx.quadraticCurveTo(0, hh, -hw, hh-5); ctx.lineTo(-hw + 10, 0); ctx.lineTo(-hw, -hh+5); ctx.quadraticCurveTo(0, -hh, hw, 0); ctx.fill();
            ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill(); break;
        case 'alien': 
            const alienGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, hw); alienGrad.addColorStop(0, '#f0abfc'); alienGrad.addColorStop(1, '#701a75'); ctx.fillStyle = alienGrad; ctx.beginPath(); ctx.ellipse(0, 0, hw, hh - 2, 0, 0, Math.PI*2); ctx.fill();
            const pulse = Math.sin(framesRef.current * 0.2) * 2; ctx.strokeStyle = '#d8b4fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(0, -10 - pulse, 20, 0); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(0, 10 + pulse, 20, 0); ctx.stroke(); break;
        case 'racer': 
            ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.moveTo(hw+8, 0); ctx.lineTo(-hw, 10); ctx.lineTo(-hw, -10); ctx.fill();
            ctx.fillStyle = '#881337'; ctx.fillRect(-hw, -20, 6, 40); ctx.fillStyle = 'white'; ctx.fillRect(-hw, -2, w, 4); break;
        case 'retro': 
            ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-20, -10, 40, 20); ctx.fillStyle = '#ef4444'; ctx.fillRect(-20, -2, 40, 4); ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, -5, 10, 5); break;
        default: 
            const pioneerGrad = createBodyGrad(0, -hh, 0, hh, '#475569', '#cbd5e1'); ctx.fillStyle = pioneerGrad; ctx.beginPath(); ctx.moveTo(hw, 0); ctx.quadraticCurveTo(0, hh, -hw, hh - 5); ctx.lineTo(-hw, -hh + 5); ctx.quadraticCurveTo(0, -hh, hw, 0); ctx.fill();
            const cockPitGrad = ctx.createLinearGradient(0, -5, 0, 5); cockPitGrad.addColorStop(0, '#7dd3fc'); cockPitGrad.addColorStop(1, '#0369a1'); ctx.fillStyle = cockPitGrad; ctx.beginPath(); ctx.ellipse(12, -3, 10, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = 'white'; ctx.beginPath(); ctx.ellipse(15, -4, 3, 1.5, -0.2, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-25, 15); ctx.lineTo(10, 5); ctx.fill(); break;
    }
    ctx.restore();
  };
  const drawMeteor = (ctx, m) => {
    ctx.save(); ctx.translate(m.x + m.size/2, m.y + m.size/2); ctx.rotate(m.rot);
    ctx.beginPath(); if (m.vertices && m.vertices.length > 0) { ctx.moveTo(m.vertices[0].x, m.vertices[0].y); for(let i=1; i < m.vertices.length; i++) { ctx.lineTo(m.vertices[i].x, m.vertices[i].y); } } else { ctx.arc(0, 0, m.size/2, 0, Math.PI*2); } ctx.closePath();
    const grad = ctx.createRadialGradient(-m.size*0.2, -m.size*0.2, 0, 0, 0, m.size); grad.addColorStop(0, "#94a3b8"); grad.addColorStop(1, "#1e293b"); ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "#0f172a"; ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(m.size*0.2, m.size*0.2, m.size*0.15, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-m.size*0.3, m.size*0.1, m.size*0.1, 0, Math.PI*2); ctx.fill(); ctx.restore();
  };
  const drawBoss = (ctx, boss) => {
    ctx.save(); ctx.translate(boss.x, boss.y); const wobble = Math.sin(boss.angle) * 3; ctx.translate(0, wobble);
    ctx.shadowBlur = 30; ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.fillStyle = "#27272a"; ctx.beginPath(); ctx.ellipse(boss.w/2, boss.h/2, boss.w/2, boss.h/3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3f3f46"; ctx.beginPath(); ctx.arc(boss.w/4, boss.h/2 - 10, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#451a03"; ctx.beginPath(); ctx.arc(boss.w/2 + 20, boss.h/2 + 10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(20, 184, 166, 0.2)"; ctx.strokeStyle = "#14b8a6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(boss.w/2, boss.h/2 - 10, boss.w/4, boss.h/4, 0, Math.PI, 0); ctx.stroke(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(boss.w/2, boss.h/2 - 30); ctx.lineTo(boss.w/2 + 10, boss.h/2 - 20); ctx.lineTo(boss.w/2 + 5, boss.h/2 - 10); ctx.stroke();
    const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5; ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`; ctx.shadowBlur = 10 * pulse; ctx.shadowColor = "#ef4444";
    ctx.beginPath(); ctx.arc(10, boss.h/2, 4, 0, Math.PI*2); ctx.arc(boss.w - 10, boss.h/2, 4, 0, Math.PI*2); ctx.arc(boss.w/2, boss.h - 10, 6, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    const hpPct = Math.max(0, boss.hp / boss.maxHp); ctx.fillStyle = "#18181b"; ctx.fillRect(boss.w/4, -20, boss.w/2, 6);
    ctx.fillStyle = hpPct < 0.3 ? "#ef4444" : "#10b981"; ctx.fillRect(boss.w/4, -20, (boss.w/2) * hpPct, 6); ctx.restore();
  };
  const drawEnemy = (ctx, e) => {
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.type === 'KAMIKAZE') {
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(e.w, e.h/2); ctx.lineTo(e.w + 25 + Math.random()*10, e.h/2 - 5); ctx.lineTo(e.w + 25 + Math.random()*10, e.h/2 + 5); ctx.fill();
        const grad = ctx.createLinearGradient(0, 0, e.w, 0); grad.addColorStop(0, '#ef4444'); grad.addColorStop(1, '#991b1b'); ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(0, e.h/2); ctx.lineTo(e.w, 0); ctx.lineTo(e.w - 5, e.h/2); ctx.lineTo(e.w, e.h); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(5, e.h/2); ctx.lineTo(e.w - 5, e.h/2); ctx.stroke();
    } else if (e.type === 'STRAFER') {
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(e.w, 5, 2, 0, Math.PI*2); ctx.arc(e.w, e.h-5, 2, 0, Math.PI*2); ctx.fill();
        const grad = ctx.createLinearGradient(0, 0, e.w, 0); grad.addColorStop(0, '#eab308'); grad.addColorStop(1, '#a16207'); ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(0, e.h/2); ctx.lineTo(e.w * 0.4, e.h * 0.3); ctx.lineTo(e.w, 0); ctx.lineTo(e.w * 0.8, e.h/2); ctx.lineTo(e.w, e.h); ctx.lineTo(e.w * 0.4, e.h * 0.7); ctx.fill();
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.ellipse(e.w*0.5, e.h/2, 5, 3, 0, 0, Math.PI*2); ctx.fill();
    } else if (e.type === 'HOMING') {
        ctx.strokeStyle = '#d8b4fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.w/2, e.h/2, e.w/2, e.h/2 - 2, framesRef.current * 0.1, 0, Math.PI*2); ctx.stroke();
        const grad = ctx.createRadialGradient(e.w/2, e.h/2, 2, e.w/2, e.h/2, e.w/2); grad.addColorStop(0, '#f0abfc'); grad.addColorStop(1, '#7e22ce'); ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(e.w/2, e.h/2, e.h/3, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(e.w/2, e.h/2, 3, 0, Math.PI*2); ctx.fill();
    } else if (e.type === 'HEAVY') {
        const grad = ctx.createLinearGradient(0, 0, e.w, e.h); grad.addColorStop(0, '#3b82f6'); grad.addColorStop(1, '#1e3a8a'); ctx.fillStyle = grad;
        ctx.fillRect(5, 5, e.w - 10, e.h - 10); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(10, 10, e.w - 20, 5); ctx.fillRect(10, e.h - 15, e.w - 20, 5);
        ctx.fillStyle = '#60a5fa'; ctx.fillRect(0, 5, 8, 6); ctx.fillRect(0, e.h/2 - 3, 8, 6); ctx.fillRect(0, e.h - 11, 8, 6); ctx.fillStyle = '#93c5fd'; ctx.fillRect(e.w-5, 8, 5, e.h-16);
    } else {
        const grad = ctx.createLinearGradient(0, 0, e.w, 0); grad.addColorStop(0, '#34d399'); grad.addColorStop(1, '#059669'); ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(0, e.h/2); ctx.lineTo(e.w, 0); ctx.lineTo(e.w - 8, e.h/2); ctx.lineTo(e.w, e.h); ctx.fill();
        ctx.fillStyle = '#d1fae5'; ctx.beginPath(); ctx.moveTo(e.w * 0.3, e.h/2 - 2); ctx.lineTo(e.w * 0.6, e.h/2 - 2); ctx.lineTo(e.w * 0.6, e.h/2 + 2); ctx.lineTo(e.w * 0.3, e.h/2 + 2); ctx.fill();
        ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(e.w - 5, e.h/2, 2, 0, Math.PI*2); ctx.fill();
    }
    if (e.hp > 1) { ctx.fillStyle = 'white'; ctx.fillRect(0, -8, e.w * (e.hp/e.maxHp), 3); } ctx.restore();
  };
  const drawLaser = (ctx, l) => {
    ctx.save(); ctx.translate(l.x, l.y); const angle = Math.atan2(l.vy, l.vx); ctx.rotate(angle);
    ctx.shadowBlur = 10; ctx.shadowColor = l.color; ctx.fillStyle = l.color;
    if (l.type === 'BOSS') { ctx.fillRect(0, -l.h/2, l.w, l.h); ctx.fillStyle = "white"; ctx.fillRect(0, -l.h/4, l.w, l.h/2); } 
    else if (l.type === 'HOMING') { ctx.beginPath(); ctx.arc(0, 0, l.w/2, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0, 0, l.w/4, 0, Math.PI*2); ctx.fill(); } 
    else { ctx.fillRect(0, -l.h/2, l.w, l.h); } ctx.restore();
  };
  const preventDefault = (e) => { };
  return (
    <>
      <canvas ref={canvasRef} className="block absolute top-0 left-0 z-0 touch-none w-full h-full" onTouchStart={preventDefault} />
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 flex justify-between items-start z-10 transition-opacity duration-500">
        <div className="flex flex-col w-full max-w-xs sm:max-w-md pointer-events-none">
          <div className="flex justify-between items-end mb-2">
            <div className={`text-xl sm:text-2xl font-bold ${bossActive ? 'text-red-500 animate-pulse' : 'text-cyan-400'} drop-shadow-md`}>
                {!bossActive ? <><span className="font-mono">{hudDistance}</span>m</> : "BOSS DETECTED"}
            </div>
            <div className="text-slate-400 font-bold tracking-widest text-sm sm:text-base">LVL {level}</div>
          </div>
          <div className={`w-full h-2 sm:h-3 rounded-full overflow-hidden border ${bossActive ? 'border-red-900 bg-red-950/50' : 'border-slate-700 bg-slate-800'}`}>
              <div className={`h-full transition-all duration-300 ease-out ${bossActive ? 'bg-red-500' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'}`} style={{ width: bossActive ? `${Math.max(0, (bossHp / bossMaxHp) * 100)}%` : `${Math.min(100, (hudDistance / TARGET_DISTANCE) * 100)}%` }} />
          </div>
        </div>
        {!isPaused && countdown === 0 && (
            <button 
                onClick={() => setIsPaused(true)} 
                className="pointer-events-auto p-2 sm:p-3 bg-slate-900/50 backdrop-blur-md border border-slate-700 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
            >
                <Pause size={24} fill="currentColor" />
            </button>
        )}
      </div>
      
      {countdown > 0 && !isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="text-8xl sm:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(34,211,238,0.8)] animate-bounce">
                {countdown}
            </div>
        </div>
      )}

      {isPaused && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl flex flex-col gap-4 min-w-[300px] animate-in zoom-in-95 duration-200">
                <h2 className="text-3xl font-black text-white text-center mb-2 tracking-widest">PAUSED</h2>
                <button onClick={handleResume} className="flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                    <Play size={20} fill="currentColor" /> RESUME
                </button>
                <button onClick={handleMenuExit} className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-4 rounded-xl font-bold border border-slate-700 transition-all hover:scale-105 active:scale-95">
                    <MenuIcon size={20} /> MENU
                </button>
            </div>
        </div>
      )}

      {showHint && countdown === 0 && !isPaused && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 font-bold italic text-lg pointer-events-none z-10 animate-pulse whitespace-nowrap">HOLD TO BOOST</div>}
    </>
  );
};

// 7. App (Root Component)
const App = () => {
  const [screen, setScreen] = useState('MENU');
  const [level, setLevel] = useState(1);
  const [lastDistance, setLastDistance] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [coins, setCoins] = useState(0);
  const [unlockedShips, setUnlockedShips] = useState(['default']);
  const [selectedShipId, setSelectedShipId] = useState('default');

  const handlePlay = () => { setLevel(1); setScreen('PLAYING'); };
  const handleLevelSelect = (lvl) => { setLevel(lvl); setScreen('PLAYING'); };
  const handleGameOver = (distance) => { setLastDistance(distance); setScreen('GAMEOVER'); };
  const handleVictory = (distance, reward) => { 
    setLastDistance(distance); 
    setCoinsEarned(reward); 
    setCoins(prev => prev + reward); 
    setScreen('VICTORY'); 
  };
  const handleRetry = () => { setScreen('PLAYING'); };
  const handleNextLevel = () => { 
    if (level < 30) { 
      setLevel(prev => prev + 1); 
      setScreen('PLAYING'); 
    } else { 
      setScreen('MENU'); 
    } 
  };
  const handleBuyShip = (id, cost) => { 
    if (coins >= cost && !unlockedShips.includes(id)) { 
      setCoins(prev => prev - cost); 
      setUnlockedShips(prev => [...prev, id]); 
    } 
  };
  const handleSelectShip = (id) => { 
    if (unlockedShips.includes(id)) { 
      setSelectedShipId(id); 
    } 
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <MusicManager screen={screen} level={level} />
      
      {screen === 'MENU' && (
        <MainMenu 
          coins={coins} 
          onPlay={handlePlay} 
          onLevels={() => setScreen('LEVELS')} 
          onShop={() => setScreen('SHOP')} 
          onExit={() => setScreen('HALTED')} 
        />
      )}
      
      {screen === 'SHOP' && (
        <Shop 
          coins={coins} 
          unlockedShips={unlockedShips} 
          selectedShipId={selectedShipId} 
          onBuy={handleBuyShip} 
          onSelect={handleSelectShip} 
          onBack={() => setScreen('MENU')} 
        />
      )}
      
      {screen === 'LEVELS' && (
        <LevelSelect 
          onBack={() => setScreen('MENU')} 
          onSelectLevel={handleLevelSelect} 
        />
      )}
      
      {screen === 'PLAYING' && (
        <GameLoop 
          level={level} 
          selectedShipId={selectedShipId} 
          onGameOver={handleGameOver} 
          onVictory={handleVictory}
          onExit={() => setScreen('MENU')}
        />
      )}
      
      {screen === 'GAMEOVER' && (
        <> 
          <div className="absolute inset-0 bg-slate-900" /> 
          <GameOverModal 
            distance={lastDistance} 
            level={level} 
            onRetry={handleRetry} 
            onMenu={() => setScreen('MENU')} 
          /> 
        </>
      )}
      
      {screen === 'VICTORY' && (
        <> 
          <div className="absolute inset-0 bg-slate-900" /> 
          <VictoryModal 
            level={level} 
            coinsEarned={coinsEarned} 
            onNextLevel={handleNextLevel} 
            onReplay={handleRetry} 
            onMenu={() => setScreen('MENU')} 
            isLastLevel={level === 30} 
          /> 
        </>
      )}
      
      {screen === 'HALTED' && <SystemHalted />}
    </div>
  );
};

// --- RENDER ---

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
