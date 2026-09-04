// Hook pour les effets sonores du chat Legal Flow (message envoyé & réponse IA)
export function useSoundEffects() {
  const playSentSound = () => {
    try {
      const audio = new Audio('/sounds/message-sent.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Fallback Web Audio synth si Audio() bloqué ou en attente d'interaction
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!AudioContextClass) return;
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.09);
        } catch {
          // Silent fallback
        }
      });
    } catch {
      // Ignore
    }
  };

  const playResponseSound = () => {
    try {
      const audio = new Audio('/sounds/ai-response.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Fallback Web Audio synth
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!AudioContextClass) return;
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(659.25, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.07, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.23);
        } catch {
          // Silent fallback
        }
      });
    } catch {
      // Ignore
    }
  };

  return { playSentSound, playResponseSound };
}
