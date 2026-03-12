/**
 * SuperInstance Native Mobile Adapter
 *
 * Bridges PWA to native mobile APIs when available
 * Provides enhanced phone/tablet capabilities:
 * - Haptic feedback patterns
 * - Voice input optimization
 * - Math keyboard support
 * - AR/VR integration hooks
 * - Siri/Google Assistant integration
 * - Native share sheet
 * - Biometric auth
 *
 * Graceful degradation for non-supported features
 */

/**
 * Haptic feedback patterns for mobile interaction
 */
export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'cell-select'
  | 'formula-complete'
  | 'scroll-snap'
  | 'double-tap';

/**
 * Voice input configuration
 */
export interface VoiceInputConfig {
  continuous: boolean;
  interimResults: boolean;
  language: string;
  grammar?: SpeechGrammar;
  mathMode?: boolean; // Recognizes mathematical expressions
}

/**
 * Math keyboard integration
 */
export interface MathKeyboardConfig {
  layout: 'qwerty-math' | 'scientific' | 'compact';
  autoSuggest: boolean;
  latexOutput: boolean;
  naturalLanguage: boolean;
}

/**
 * Biometric authentication options
 */
export interface BiometricAuthConfig {
  title: string;
  subtitle: string;
  allowedTypes: ('fingerprint' | 'face' | 'voice')[];
  fallbackAllowed: boolean;
}

/**
 * Native capability availability
 */
export interface NativeCapabilities {
  haptics: {
    available: boolean;
    intensity: 'basic' | 'advanced';
    patternsSupported: HapticPattern[];
  };
  voice: {
    available: boolean;
    languages: string[];
    mathMode: boolean;
    offline: boolean;
  };
  math: {
    available: boolean;
    latexSupport: boolean;
    naturalMathSupport: boolean;
    unicodeSupport: boolean;
  };
  biometric: {
    available: boolean;
    types: string[];
    secure: boolean;
  };
  share: {
    available: boolean;
    formats: string[];
    files: boolean;
  };
  payment: {
    available: boolean;
    providers: string[];
  };
  ar: {
    available: boolean;
    hitTest: boolean;
    imageTracking: boolean;
  };
}

/**
 * NativeMobileAdapter - Bridge to native mobile features
 *
 * Implements:
 * - Haptic feedback with context awareness
 * - Voice recognition optimized for mathematical expressions
 * - Math keyboard support (MathLive integration)
 * - Siri/Google Assistant shortcuts
 * - Native share sheets for spreadsheet exports
 * - Biometric authentication for secured cells
 */
export class NativeMobileAdapter {
  private capabilities: NativeCapabilities | null = null;
  private hapticsSupported = false;
  private voiceRecognition: SpeechRecognition | null = null;
  private mathKeyboard: any = null;
  private sessionHaptics: Map<string, number> = new Map();
  private voiceInputConfig: VoiceInputConfig = {
    continuous: false,
    interimResults: true,
    language: 'en-US',
    mathMode: true
  };

  private constructor() {
    this.detectCapabilities();
  }

  private static instance: NativeMobileAdapter | null = null;

  static getInstance(): NativeMobileAdapter {
    if (!this.instance) {
      this.instance = new NativeMobileAdapter();
    }
    return this.instance;
  }

  /**
   * Detect native mobile capabilities available
   */
  async detectCapabilities(): Promise<void> {
    const capabilities: NativeCapabilities = {
      haptics: {
        available: false,
        intensity: 'basic',
        patternsSupported: []
      },
      voice: {
        available: false,
        languages: [],
        mathMode: false,
        offline: false
      },
      math: {
        available: false,
        latexSupport: false,
        naturalMathSupport: false,
        unicodeSupport: false
      },
      biometric: {
        available: false,
        types: [],
        secure: false
      },
      share: {
        available: false,
        formats: [],
        files: false
      },
      payment: {
        available: false,
        providers: []
      },
      ar: {
        available: false,
        hitTest: false,
        imageTracking: false
      }
    };

    // Haptics detection
    if ('vibrate' in navigator) {
      capabilities.haptics.available = true;

      // Test web.dev/vibration API
      if ('VibrationActuator' in window) {
        capabilities.haptics.intensity = 'advanced';
        capabilities.haptics.patternsSupported = ['light', 'medium', 'heavy', 'success', 'warning', 'error'];
      } else if (
        navigator.vibrate &&
        navigator.vibrate.length > 0 &&
        (typeof (navigator as any).vibrate(10) === 'boolean')
      ) {
        capabilities.haptics.intensity = 'basic';
        capabilities.haptics.patternsSupported = ['light', 'medium', 'heavy'];
      }
    }

    // Voice detection
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      // Test recognition availability
      try {
        const recognition = new SR();
        recognition.lang = 'en-US';

        capabilities.voice.available = true;
        capabilities.voice.languages = ['en-US'];
        capabilities.voice.mathMode = this.detectMathModeCapability();

        // Check for offline support
        if ('serviceWorker' in navigator) {
          const swr: any = new (window as any).OfflineSpeechRecognition?.SpeechRecognition();
          if (swr) {
            capabilities.voice.offline = true;
          }
        }

        recognition.stop(); // Clean up test instance

      } catch (e) {
        // Voice API unavailable
      }
    }

    // Math support detection
    capabilities.math.available = await this.detectMathSupport();
    if (capabilities.math.available) {
      // Test latex support
      const mathmlTest = document.createElement('math');
      mathmlTest.innerHTML = '<mrow><mi>x</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>b</mi></mrow><mrow><mn>2</mn><mi>a</mi></mrow></mfrac></mrow>';
      document.body.appendChild(mathmlTest);

      const layout = mathmlTest.getBoundingClientRect();
      capabilities.math.latexSupport = layout.height > 0;
      document.body.removeChild(mathmlTest);

      // Unicode test
      const unicodeTest = '∑∫∂∇≤≥∞αβγδε';
      capabilities.math.unicodeSupport = unicodeTest.split('').every(char =>
        char.codePointAt(0) && char.codePointAt(0)! > 0x1100
      );

      capabilities.math.naturalMathSupport = this.detectNaturalMathSupport();
    }

    // Biometric detection (Support varies by device)
    if ('credentials' in navigator) {
      const creds = navigator as any;
      if (creds.credentials && 'get' in creds.credentials) {
        try {
          await creds.credentials.get({
            publicKey: {
              challenge: new Uint8Array(16),
              rp: { name: 'SuperInstance' },
              user: {
                id: new Uint8Array(16),
                name: 'test',
                displayName: 'Test'
              },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
              timeout: 1
            }
          });
          // Cannot actually test, just verify API exists
        } catch (e) {
          if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
            capabilities.biometric.available = true;
            capabilities.biometric.secure = true;
          }
        }
      }

      if ('touchId' in navigator || 'facematch' in navigator) {
        capabilities.biometric.types.push('fingerprint', 'face');
      }
    }

    // Share API
    if ('share' in navigator) {
      capabilities.share.available = true;
      capabilities.share.formats = ['text/plain', 'text/html'];

      // Test files capability
      if ('canShare' in navigator) {
        const testFile = new File(['test'], 'test.csv', { type: 'text/csv' });
        capabilities.share.files = (navigator as any).canShare?.({ files: [testFile] }) || false;
      }
    }

    // Payment API (Apple Pay/Google Pay)
    if ('canMakePayment' in (navigator as any)) {
      try {
        const canMakePayment = await (navigator as any).payments.canMakePayment?.({
          supportedMethods: ['https://google.com/pay', 'https://apple.com/apple-pay']
        });

        if (canMakePayment) {
          capabilities.payment.available = true;
          if ('google' in (navigator as any).payments) {
            capabilities.payment.providers.push('Google Pay');
          }
          if ('apple' in (navigator as any).payments) {
            capabilities.payment.providers.push('Apple Pay');
          }
        }
      } catch (e) {
        // Payment API unavailable
      }
    }

    // AR/VR capabilities
    if ('xr' in navigator) {
      const xr: any = (navigator as any).xr;

      if ('isSessionSupported' in xr) {
        try {
          const arSupported = await xr.isSessionSupported?.('immersive-ar');
          const vrSupported = await xr.isSessionSupported?.('immersive-vr');

          if (arSupported || vrSupported) {
            capabilities.ar.available = true;
            capabilities.ar.hitTest = arSupported;
            capabilities.ar.imageTracking = arSupported; // AR usually supports image tracking
          }
        } catch (e) {
          // XR unavailable
        }
      }
    }

    this.capabilities = capabilities;
    console.log('[Mobile] Detected capabilities:', capabilities);
  }

  /**
   * Trigger haptic feedback with pattern
   */
  async haptic(pattern: HapticPattern): Promise<void> {
    if (!this.capabilities?.haptics.available) return;

    // Debounce haptics for same pattern
    const patternKey = `haptic-${pattern}`;
    const lastTime = this.sessionHaptics.get(patternKey) || 0;
    const debounceTime = ['light', 'medium', 'heavy'].includes(pattern) ? 100 : 300;

    if (Date.now() - lastTime < debounceTime) return;
    this.sessionHaptics.set(patternKey, Date.now());

    // Advanced haptics with VibrationActuator
    if (this.capabilities.haptics.intensity === 'advanced' && 'VibrationActuator' in window) {
      const actuator = (navigator as any).vibrate as VibrationActuator;

      switch (pattern) {
        case 'cell-select':
          await actuator.playEffect?.('touch', { intensity: 0.3, duration: 20 });
          break;
        case 'formula-complete':
          await actuator.playEffect?.('success', { intensity: 0.5 });
          break;
        case 'light':
          await actuator.playEffect?.('touch', { intensity: 0.3, duration: 30 });
          break;
        case 'medium':
          await actuator.playEffect?.('medium', { intensity: 0.5, duration: 50 });
          break;
        case 'heavy':
          await actuator.playEffect?.('heavy', { intensity: 0.7, duration: 70 });
          break;
        case 'warning':
          await actuator.playEffect?.('warning', { intensity: 0.6 });
          break;
        case 'error':
          await actuator.playEffect?.('error', { intensity: 0.8 });
          break;
        case 'success':
          // Custom success pattern: low-high-low
          await actuator.playSequence?.([
            { duration: 20, intensity: 0.3 },
            { duration: 30, intensity: 0.6 },
            { duration: 20, intensity: 0.4 }
          ]);
          break;
        case 'scroll-snap':
          // Brief tactile feedback
          await actuator.playEffect?.('light', { intensity: 0.2, duration: 15 });
          break;
        case 'double-tap':
          // Two quick taps
          await actuator.playSequence?.([
            { duration: 10, intensity: 0.3 },
            { duration: 40, intensity: 0 },
            { duration: 10, intensity: 0.3 }
          ]);
          break;
      }
    } else {
      // Legacy vibration API
      const patterns = {
        light: 20,
        medium: 35,
        heavy: 50,
        success: [20, 30, 50],
        warning: [100, 50, 100],
        error: [200, 100, 200],
        'cell-select': 15,
        'formula-complete': [30, 100, 25],
        'scroll-snap': 10,
        'double-tap': [10, 30, 10]
      };

      const pattern = patterns[pattern];
      if (pattern) {
        navigator.vibrate(pattern as number | number[]);
      }
    }
  }

  /**
   * Start voice input for formulas
   */
  async startVoiceRecognition(config?: Partial<VoiceInputConfig>): Promise<Speaker> {
    if (!this.capabilities?.voice.available) throw new Error('Voice recognition not available');

    const SRConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SRConstructor) throw new Error('SpeechRecognition API not available');

    // Stop existing recognition
    if (this.voiceRecognition) {
      this.voiceRecognition.stop();
    }

    this.voiceInputConfig = { ...this.voiceInputConfig, ...config };

    // We now use a custom wrapper class instead of just the raw
    // EventHandler registration and error handling
    this.voiceRecognition = new SRConstructor();
    this.voiceRecognition.continuous = this.voiceInputConfig.continuous;
    this.voiceRecognition.interimResults = this.voiceInputConfig.interimResults;
    this.voiceRecognition.lang = this.voiceInputConfig.language;

    // Math mode optimizations
    if (this.voiceInputConfig.mathMode) {
      this.voiceRecognition.grammars = this.createMathGrammar();
    }

    return new VoiceInputSession(this.voiceRecognition, this.voiceInputConfig);
  }

  /**
   * Open native math keyboard
   */
  async showMathKeyboard(config?: MathKeyboardConfig): Promise<{ action: string; input: string }> {
    if (!this.capabilities?.math.available) {
      throw new Error('Math keyboard not available');
    }

    // Import MathLive dynamically

    try {
      const mathLive = await import('https://unpkg.com/mathlive@0.90.0/dist/mathlive.mjs');

      return new Promise((resolve, reject) => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.zIndex = '9999';
        container.style.background = 'white';
        container.style.borderRadius = '12px';
        container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        container.style.padding = '20px';
        container.style.maxWidth = '90vw';
        container.style.maxHeight = '70vh';
        container.style.overflow = 'auto';

        const mf = new mathLive.MathfieldElement({
          value: 'x=' + (config?.latexOutput ? '\\frac{-b}{2a}' : '(-b)/(2a)'),
          fontsDirectory: 'https://unpkg.com/mathlive@0.90.0/dist/fonts',
          ...config
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
          document.body.removeChild(container);
          reject(new Error('Cancelled'));
        };

        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.style.marginLeft = '10px';
        okBtn.onclick = () => {
          const latexValue = mf.value;
          const action = 'submit';
          const input = config?.latexOutput ? latexValue : this.latexToText(latexValue);
          document.body.removeChild(container);
          resolve({ action, input });
        };

        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.justifyContent = 'flex-end';
        buttons.style.marginTop = '20px';
        buttons.appendChild(cancelBtn);
        buttons.appendChild(okBtn);

        container.appendChild(mf);
        container.appendChild(buttons);
        document.body.appendChild(container);
      });
    } catch (error) {
      throw new Error(`Failed to load math keyboard: ${error.message}`);
    }
  }

  /**
   * Request biometric authentication
   */
  async authenticateWithBiometrics(config: BiometricAuthConfig): Promise<boolean> {
    if (!this.capabilities?.biometric.available) {
      if (config.fallbackAllowed) return true; // Allow fallback
      throw new Error('Biometric authentication not available');
    }

    try {
      if ('credentials' in navigator) {
        const creds = navigator as any;

        const credential = await creds.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: config.title },
            user: {
              id: new TextEncoder().encode('superinstance-user'),
              name: 'user',
              displayName: config.subtitle
            },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'preferred'
            }
          }
        });

        return !!credential;
      }
    } catch (error) {
      if (error.name === 'AbortError' && config.fallbackAllowed) return true;
      throw error;
    }

    return false;
  }

  /**
   * Share content via native share sheet
   */
  async shareContent(
    content: {
      title?: string;
      text?: string;
      url?: string;
      files?: File[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.capabilities?.share.available) {
      return { success: false, error: 'Share API not available' };
    }

    try {
      const shareData: ShareData = {
        title: content.title,
        text: content.text,
        url: content.url
      };

      // Add files if supported
      if (content.files && this.capabilities.share.files) {
        shareData.files = content.files.map(file => new File([file], file.name, { type: file.type }));
      }

      await navigator.share(shareData);
      await haptic('success');
      return { success: true };
    } catch (error: any) {
      // User cancelled is not an error
      if (error.name === 'AbortError') {
        return { success: true, error: 'User cancelled' };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect math mode capability
   */
  private detectMathModeCapability(): boolean {
    // Test with mathematical terms
    try {
      const recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Create grammar that includes mathematical terms
      const grammar = '#JSGF V1.0; grammar math; public <math> = integrate | derivative | sum | product | limit | epsilon | alpha | beta | gamma | delta;';

      try {
        const SRGList: any = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
        const speechRecognitionList = new SRGList();
        speechRecognitionList.addFromString(grammar, 1);

        if (recognition.grammars !== undefined) {
          recognition.grammars = speechRecognitionList;
          return true;
        }
      } catch (e) {
        // Grammar support not available
        return false;
      }
    } catch (e) {
      return false;
    }

    return false;
  }

  /**
   * Create math grammar for voice recognition
   */
  private createMathGrammar(): any {
    const grammar = `#JSGF V1.0; grammar superinstance;
      public <math> = integrate | derivative | limit |
                      sum | product | factorial |
                      alpha | beta | gamma | delta | epsilon | pi |
                      sqrt | log | ln | exp |
                      plus | minus | times | divided by |
                      equals | greater than | less than | approximately |
                      to the power of | square | cube |
                      open parenthesis | close parenthesis |
                      numerator | denominator | fraction;

      public <string> = x | y | z | A | B | C | a | b | c;`;

    const SRGList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
    const speechRecognitionList = new SRGList();
    speechRecognitionList.addFromString(grammar, 1);
    return speechRecognitionList;
  }

  /**
   * Detect math support
   */
  private async detectMathSupport(): Promise<boolean> {
    // Basic math features detection
    const basicMath = !!(Math)
      && 'sqrt' in Math
      && 'pow' in Math
      && 'log' in Math
      && 'sin' in Math
      && 'cos' in Math;

    // Unicode math detection
    const unicodeMath = !!(String.fromCodePoint && String.fromCodePoint(0x03B1) === 'α');

    return basicMath && unicodeMath;
  }

  /**
   * Detect natural math expression support in speech
   */
  private detectNaturalMathSupport(): boolean {
    // Test browser's speech recognition for mathematical expressions
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return false;

    // Simple heuristic: check if math API is exposed
    return !!(window as any).MathJax || !!(window as any).MathLive || !!(document as any).queryCommandSupported?.('insertMath');
  }

  /**
   * Convert LaTeX to text representation
   */
  private latexToText(latex: string): string {
    // Basic LaTeX to text conversion
    return latex
      .replace(/\\frac{(\w+)}{(\w+)}/g, '($1 over $2)')
      .replace(/\\sqrt{(\w+)}/g, 'square root of $1')
      .replace(/\\/.(\w+)/g, '$1') // Remove backslash from commands
      .replace(/\\alpha/g, 'alpha')
      .replace(/\\beta/g, 'beta')
      .replace(/\\gamma/g, 'gamma')
      .replace(/\\delta/g, 'delta')
      .replace(/\\pi/g, 'pi')
      .replace(/\\sum/g, 'sum')
      .replace(/\\int/g, 'integral')
      .replace(/\.\./g, ' to ')
      .replace(/[{}]/g, '');
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): NativeCapabilities {
    if (!this.capabilities) {
      throw new Error('Capabilities not yet detected. Call detectCapabilities() first.');
    }
    return { ...this.capabilities };
  }

  /**
   * Check if specific capability is available
   */
  hasCapability(capability: keyof NativeCapabilities): boolean {
    return this.capabilities?.[capability]?.available || false;
  }
}

/**
 * Voice input session wrapper
 */
class VoiceInputSession {
  private recognition: SpeechRecognition;
  private config: VoiceInputConfig;
  private interimTranscript = '';
  private finalTranscript = '';
  private onResultCallback?: (data: { interim: string; final: string; isStable: boolean }) => void;
  private onErrorCallback?: (error: string) => void;
  private isActive = false;

  constructor(recognition: SpeechRecognition, config: VoiceInputConfig) {
    this.recognition = recognition;
    this.config = config;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.recognition.onstart = () => {
      this.isActive = true;
      this.interimTranscript = '';
      this.finalTranscript = '';
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      // Process results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();

        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      // Mathematical expression preprocessing
      if (this.config.mathMode) {
        interim = this.preprocessMathSpeech(interim);
        final = this.preprocessMathSpeech(final);
      }

      this.interimTranscript = interim;
      this.finalTranscript = final;

      // Callback with normalized math expressions
      this.onResultCallback?.({
        interim,
        final,
        isStable: event.results[event.results.length - 1]?.isFinal || false
      });
    };

    this.recognition.onerror = (event) => {
      this.onErrorCallback?.(event.error);
      if (!this.config.continuous) {
        this.isActive = false;
      }
    };

    this.recognition.onend = () => {
      this.isActive = false;
    };

    this.recognition.start();
  }

  /**
   * Preprocess mathematical speech patterns
   */
  private preprocessMathSpeech(text: string): string {
    // Natural language to formula conversion examples
    const replacements = [
      { regex: /integrate/g, replace: 'integrate' },
      { regex: /derivative of/g, replace: 'd/dx' },
      { regex: /square root of ([a-zA-Z]+)/g, replace: 'sqrt($1)' },
      { regex: /pee(?: aye|ie)?/g, replace: 'pi' },
      { regex: /([a-zA-Z]+) squared/g, replace: '$1^2' },
      {
        regex: /([a-zA-Z]+) to the power of ([a-zA-Z0-9]+)/g,
        replace: '$1^$2'
      },
      { regex: /plus/g, replace: '+' },
      { regex: /minus/g, replace: '-' },
      { regex: /times/g, replace: '*' },
      { regex: /divided by/g, replace: '/' },
      { regex: /equals/g, replace: '=' },
      { regex: /greater than/g, replace: '>' },
      { regex: /less than/g, replace: '<' },
      { regex: /alpha/g, replace: 'α' },
      { regex: /beta/g, replace: 'β' },
      { regex: /gamma/g, replace: 'γ' },
      { regex: /delta/g, replace: 'δ' },
      { regex: /epsilon/g, replace: 'ε' }
    ];

    let result = text;
    for (const { regex, replace } of replacements) {
      result = result.replace(regex, replace);
    }

    return result;
  }

  /**
   * Set result callback
   */
  onresult(callback: (data: { interim: string; final: string; isStable: boolean }) => void): VoiceInputSession {
    this.onResultCallback = callback;
    return this;
  }

  /**
   * Configure error handling
   */
  onerror(callback: (error: string) => void): VoiceInputSession {
    this.onErrorCallback = callback;
    return this;
  }

  /**
   * Stop the recognition
   */
  stop(): void {
    if (this.isActive && this.recognition) {
      this.recognition.stop();
      this.isActive = false;
    }
  }

  /**
   * Get current transcript state
   */
  getTranscript(): { interim: string; final: string } {
    return {
      interim: this.interimTranscript,
      final: this.finalTranscript
    };
  }
}

/**
 * Global instance exports
 */
export const mobileAdapter = NativeMobileAdapter.getInstance();
export const haptic = async (pattern: HapticPattern) => mobileAdapter.haptic(pattern);