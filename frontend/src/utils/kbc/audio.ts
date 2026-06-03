'use client';

class KbcAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private currentVolume: number = 0.5;
  private suspenseInterval: any = null;

  constructor() {
    // Lazy initialize on first interaction to comply with browser autoplay policies
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.error('Web Audio API not supported in this browser:', e);
    }
  }

  private resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    this.resumeContext();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    this.resumeContext();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private createOscillator(
    type: OscillatorType,
    freq: number,
    duration: number,
    gainStart: number = 0.5,
    gainEnd: number = 0.001
  ): { osc: OscillatorNode; gain: GainNode } | null {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return null;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(gainStart, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainEnd, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    return { osc, gain };
  }

  // 1. Intro Theme (Synth Arpeggio Chord Progression)
  public playIntro() {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const chords = [
      [110, 138.61, 164.81, 220], // A Major
      [123.47, 146.83, 164.81, 246.94], // B minor 7 / E
      [130.81, 164.81, 196.00, 261.63], // C Major
      [146.83, 185.00, 220.00, 293.66], // D Major
    ];

    let timeOffset = 0;
    chords.forEach((chord, chordIdx) => {
      chord.forEach((freq, noteIdx) => {
        setTimeout(() => {
          const oscInfo = this.createOscillator('triangle', freq, 0.8, 0.2);
          if (oscInfo) {
            oscInfo.osc.start();
            oscInfo.osc.stop(this.ctx!.currentTime + 0.8);
          }
        }, (chordIdx * 800) + (noteIdx * 150));
      });
    });
  }

  // 2. Question Reveal (Sweeping frequency swell)
  public playReveal() {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 1.2);
    filter.Q.setValueAtTime(5, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.2);
  }

  // 3. Option Selection (Short pluck)
  public playSelect() {
    const oscInfo = this.createOscillator('sine', 523.25, 0.12, 0.4); // C5
    if (oscInfo) {
      oscInfo.osc.start();
      oscInfo.osc.stop(this.ctx!.currentTime + 0.12);
    }
  }

  // 4. Answer Lock (Deep dramatic sub bass drop)
  public playLock() {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 1.0);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.2);
  }

  // 5. Suspense Ticking (Repeating tension clock ticks/heartbeats)
  public startSuspense(isLowTime: boolean = false) {
    this.stopSuspense();
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const tick = () => {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;

      // Heartbeat double thump: Sine wave at 60Hz and 55Hz
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(isLowTime ? 130 : 65, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(isLowTime ? 120 : 60, now + 0.15);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc1.stop(now + 0.4);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.4);
    };

    tick();
    this.suspenseInterval = setInterval(tick, isLowTime ? 500 : 1000);
  }

  public stopSuspense() {
    if (this.suspenseInterval) {
      clearInterval(this.suspenseInterval);
      this.suspenseInterval = null;
    }
  }

  // 6. Correct Answer (Fanfare chord)
  public playCorrect() {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const freqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (C Major)
    freqs.forEach((freq, idx) => {
      setTimeout(() => {
        const oscInfo = this.createOscillator('triangle', freq, 1.2, 0.25);
        if (oscInfo) {
          oscInfo.osc.start();
          oscInfo.osc.stop(this.ctx!.currentTime + 1.2);
        }
      }, idx * 100);
    });
  }

  // 7. Wrong Answer (Descends into dissonance)
  public playWrong() {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(146.83, this.ctx.currentTime); // D3
    osc1.frequency.linearRampToValueAtTime(110.00, this.ctx.currentTime + 1.5); // A2

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(155.56, this.ctx.currentTime); // Eb3 (dissonant semitone)
    osc2.frequency.linearRampToValueAtTime(116.54, this.ctx.currentTime + 1.5);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc1.stop(this.ctx.currentTime + 1.5);
    osc2.start();
    osc2.stop(this.ctx.currentTime + 1.5);
  }

  // 8. Lifeline Activation (Magical wind chime sweep)
  public playLifeline() {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // Pentatonic scale C5-C6
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const randFreq = baseFreqs[Math.floor(Math.random() * baseFreqs.length)] * (1 + Math.random() * 0.1);
        const oscInfo = this.createOscillator('sine', randFreq, 0.4, 0.15);
        if (oscInfo) {
          oscInfo.osc.start();
          oscInfo.osc.stop(this.ctx!.currentTime + 0.4);
        }
      }, i * 60);
    }
  }

  // 9. Prize Ladder Advancement (Rising pitch sequence)
  public playLadder() {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const freqs = [392.00, 440.00, 493.88, 587.33, 659.25, 783.99]; // G4 to G5 arpeggio
    freqs.forEach((freq, idx) => {
      setTimeout(() => {
        const oscInfo = this.createOscillator('triangle', freq, 0.3, 0.25);
        if (oscInfo) {
          oscInfo.osc.start();
          oscInfo.osc.stop(this.ctx!.currentTime + 0.3);
        }
      }, idx * 80);
    });
  }

  // 10. Game Win (Major triumphant fanfare)
  public playWin() {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const roots = [261.63, 329.63, 392.00, 523.25]; // C major
    const octave = roots.map(f => f * 2);

    roots.forEach((freq, idx) => {
      setTimeout(() => {
        const oscInfo = this.createOscillator('triangle', freq, 2.5, 0.2);
        if (oscInfo) {
          oscInfo.osc.start();
          oscInfo.osc.stop(this.ctx!.currentTime + 2.5);
        }
      }, idx * 120);
    });

    setTimeout(() => {
      octave.forEach((freq, idx) => {
        const oscInfo = this.createOscillator('sine', freq, 3.0, 0.15);
        if (oscInfo) {
          oscInfo.osc.start();
          oscInfo.osc.stop(this.ctx!.currentTime + 3.0);
        }
      });
    }, 800);
  }

  // 11. Game Over (Sad descending drone)
  public playGameOver() {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110.00, this.ctx.currentTime); // A2
    osc.frequency.linearRampToValueAtTime(73.42, this.ctx.currentTime + 2.5); // D2

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 2.5);
  }
}

export const KbcAudio = new KbcAudioManager();
