// Comprehensive Sound Effects and Haptic Feedback Engine for Hotel Atithi
// Built with Web Audio API for 0ms latency, zero external asset downloads, and full offline support.

class SoundAndHapticsController {
  private audioCtx: AudioContext | null = null;
  // Off by default: customers opt in from their profile (unexpected sounds feel spammy)
  private soundEnabled: boolean = false;
  private hapticsEnabled: boolean = true;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedSound = localStorage.getItem('hotel_atithi_sound_enabled');
        if (savedSound !== null) this.soundEnabled = savedSound === 'true';

        const savedHaptics = localStorage.getItem('hotel_atithi_haptics_enabled');
        if (savedHaptics !== null) this.hapticsEnabled = savedHaptics === 'true';
      } catch {
        // LocalStorage fallback
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('hotel_atithi_sound_enabled', String(enabled));
    } catch {}
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
    try {
      localStorage.setItem('hotel_atithi_haptics_enabled', String(enabled));
    } catch {}
  }

  public isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  // --- HAPTIC FEEDBACK ---
  public triggerHaptic(
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'pop' = 'light'
  ) {
    if (!this.hapticsEnabled) return;
    if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

    try {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'pop':
          navigator.vibrate([18, 25, 18]);
          break;
        case 'medium':
          navigator.vibrate(28);
          break;
        case 'heavy':
          navigator.vibrate(45);
          break;
        case 'success':
          navigator.vibrate([20, 35, 25, 40, 20]);
          break;
        case 'warning':
          navigator.vibrate([40, 30, 40]);
          break;
      }
    } catch {
      // Safe fallback if blocked in iframes
    }
  }

  // --- SOUND EFFECTS (Web Audio API Synthesizer) ---

  // 1. Crisp, subtle button click sound (~15-20ms)
  public playTapSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.025);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.028);
    } catch {
      // Ignore audio failure
    }
  }

  // 2. Delightful Add-To-Cart bubble pop sound
  public playAddToCartSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Note 1: Clean bubble ping
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(784, now + 0.06); // Ascend to G5

      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.075);

      // Note 2: Cheerful confirmation chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // High C6

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.09, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.16);
    } catch {}
  }

  // 3. Gentle quantity remove/decrease blip
  public playRemoveSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.04);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  // 4. Order placed / Payment success chime
  public playSuccessSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 major arpeggio

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch {}
  }

  // 5. Warning / Error sound
  public playErrorSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  // --- GLOBAL EVENT LISTENER ---
  // Unlocks Web Audio on the first tap anywhere in the app
  public initGlobalListeners() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Browsers keep audio locked until the first user gesture, so unlock it here.
    // Cart actions trigger their own sound/haptics from CartContext; ordinary taps
    // (links, tabs, filters) intentionally get none, like the big delivery apps.
    const handleInteraction = () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    };

    // Use pointerdown for instant zero-lag responsiveness on both mobile and desktop
    document.addEventListener('pointerdown', handleInteraction, { capture: true, passive: true });
  }
}

export const soundAndHaptics = new SoundAndHapticsController();
