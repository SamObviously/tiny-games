// REFLEX: Reaction time tester, zero emojis, pure white & black
export class ReflexTester {
  constructor(container, onLog) {
    this.container = container;
    this.onLog = onLog || (() => {});
    this.state = 'IDLE'; // IDLE, ARMED, TRIGGERED, RESULT
    this.timer = null;
    this.startTime = 0;
    this.bestScore = parseInt(localStorage.getItem('reflex_best') || '9999', 10);
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div style="display:flex; justify-content:space-between; width:320px; margin-bottom:8px; font-weight:bold; font-size:12px;">
          <span>STATUS: <span id="reflex-status">READY</span></span>
          <span>BEST: <span id="reflex-best">${this.bestScore === 9999 ? '---' : this.bestScore + ' MS'}</span></span>
        </div>
        <div class="reflex-box ready" id="reflex-target">
          <div id="reflex-prompt-1" style="font-size:16px; margin-bottom:6px;">CLICK TO ARM</div>
          <div id="reflex-prompt-2" style="font-size:12px; opacity:0.8;">TEST YOUR LATENCY</div>
        </div>
        <div style="margin-top:12px;">
          <button id="reflex-reset-btn">RESET BEST</button>
        </div>
      </div>
    `;

    this.target = this.container.querySelector('#reflex-target');
    this.statusEl = this.container.querySelector('#reflex-status');
    this.bestEl = this.container.querySelector('#reflex-best');
    this.prompt1 = this.container.querySelector('#reflex-prompt-1');
    this.prompt2 = this.container.querySelector('#reflex-prompt-2');
    this.resetBtn = this.container.querySelector('#reflex-reset-btn');

    this.target.addEventListener('click', () => this.handleClick());
    this.resetBtn.addEventListener('click', () => {
      localStorage.removeItem('reflex_best');
      this.bestScore = 9999;
      this.bestEl.textContent = '---';
      this.onLog('REFLEX', 'Best latency score cleared');
    });

    this.onLog('REFLEX', 'Reflex Tester initialized');
  }

  handleClick() {
    if (this.state === 'IDLE' || this.state === 'RESULT') {
      // Arm the test
      this.state = 'ARMED';
      this.statusEl.textContent = 'WAITING';
      this.target.className = 'reflex-box ready';
      this.prompt1.textContent = 'WAIT FOR WHITE SCREEN...';
      this.prompt2.textContent = 'DO NOT CLICK EARLY';

      const delay = Math.floor(Math.random() * 2500) + 1500; // 1.5s to 4s
      this.timer = setTimeout(() => {
        this.trigger();
      }, delay);
      return;
    }

    if (this.state === 'ARMED') {
      // Early click penalty
      clearTimeout(this.timer);
      this.state = 'RESULT';
      this.statusEl.textContent = 'PENALTY';
      this.target.className = 'reflex-box failed';
      this.prompt1.textContent = 'TOO EARLY!';
      this.prompt2.textContent = 'CLICK TO TRY AGAIN';
      this.onLog('REFLEX', 'False start: clicked before trigger');
      return;
    }

    if (this.state === 'TRIGGERED') {
      const elapsed = Math.round(performance.now() - this.startTime);
      this.state = 'RESULT';
      this.statusEl.textContent = 'MEASURED';
      this.target.className = 'reflex-box ready';
      this.prompt1.textContent = `${elapsed} MS`;
      this.prompt2.textContent = 'CLICK TO RETRY';

      if (elapsed < this.bestScore) {
        this.bestScore = elapsed;
        this.bestEl.textContent = `${elapsed} MS`;
        localStorage.setItem('reflex_best', elapsed.toString());
        this.onLog('REFLEX', `NEW BEST LATENCY: ${elapsed}ms`);
      } else {
        this.onLog('REFLEX', `Latency measured: ${elapsed}ms`);
      }
    }
  }

  trigger() {
    this.state = 'TRIGGERED';
    this.startTime = performance.now();
    this.statusEl.textContent = 'NOW';
    this.target.className = 'reflex-box trigger';
    this.prompt1.textContent = 'CLICK NOW!';
    this.prompt2.textContent = 'REACT FAST';
  }

  destroy() {
    if (this.timer) clearTimeout(this.timer);
  }
}
