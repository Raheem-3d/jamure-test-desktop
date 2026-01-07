export class SoundPlayer {
  private audioContext: AudioContext | null = null;
  private initialized = false;
  private enabled = true;

  constructor() {
    // Initialize on user interaction to comply with browser autoplay policies
    if (typeof window !== 'undefined') {
      window.addEventListener('click', this.initializeOnInteraction.bind(this), { once: true });
    }
  }

  private initializeOnInteraction() {
    if (!this.initialized) {
      this.init();
    }
  }

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }

  public setEnabled(state: boolean) {
    this.enabled = state;
  }

  public async playBuzzer() {
    if (!this.enabled) return;
    
    try {
      if (!this.initialized) this.init();
      if (!this.audioContext) return;

      // Create audio buffer with a short beep sound
      const duration = 0.3;
      const sampleRate = this.audioContext.sampleRate;
      const frameCount = duration * sampleRate;
      const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);

      // Generate a beep sound
      for (let i = 0; i < frameCount; i++) {
        const progress = i / frameCount;
        const frequency = 800 - (600 * progress); // Falling pitch
        const t = i / sampleRate;
        channelData[i] = Math.sin(2 * Math.PI * frequency * t) * (1 - progress); // Fade out
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Error playing buzzer sound:', error);
    }
  }
}

export const soundPlayer = new SoundPlayer();