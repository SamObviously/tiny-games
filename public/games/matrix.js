// MEMORY MATRIX: Pattern sequence memory game, zero emojis, pure white & black
export class MemoryMatrix {
  constructor(container, onLog) {
    this.container = container;
    this.onLog = onLog || (() => {});
    this.sequence = [];
    this.playerStep = 0;
    this.level = 1;
    this.highLevel = parseInt(localStorage.getItem('matrix_high') || '1', 10);
    this.isPlayingSequence = false;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div style="display:flex; justify-content:space-between; width:228px; margin-bottom:8px; font-weight:bold; font-size:12px;">
          <span>LEVEL: <span id="matrix-lvl">1</span></span>
          <span>HIGH: <span id="matrix-high">${this.highLevel}</span></span>
        </div>
        <div class="matrix-grid" id="matrix-board"></div>
        <div id="matrix-msg" style="height:20px; font-weight:bold; margin-top:4px; font-size:12px;">PRESS START</div>
        <div style="margin-top:10px;">
          <button id="matrix-start-btn">START</button>
        </div>
      </div>
    `;

    this.boardEl = this.container.querySelector('#matrix-board');
    this.lvlEl = this.container.querySelector('#matrix-lvl');
    this.highEl = this.container.querySelector('#matrix-high');
    this.msgEl = this.container.querySelector('#matrix-msg');
    this.startBtn = this.container.querySelector('#matrix-start-btn');

    this.tiles = [];
    for (let i = 0; i < 9; i++) {
      const tile = document.createElement('div');
      tile.className = 'matrix-tile';
      tile.dataset.index = i;
      tile.addEventListener('click', () => this.handleTileClick(i));
      this.boardEl.appendChild(tile);
      this.tiles.push(tile);
    }

    this.startBtn.addEventListener('click', () => this.startGame());
    this.onLog('MATRIX', 'Memory Matrix initialized');
  }

  startGame() {
    this.level = 1;
    this.sequence = [];
    this.playerStep = 0;
    this.lvlEl.textContent = '1';
    this.startBtn.disabled = true;
    this.nextRound();
    this.onLog('MATRIX', 'New game started');
  }

  nextRound() {
    this.playerStep = 0;
    this.lvlEl.textContent = this.level;
    this.msgEl.textContent = 'WATCH PATTERN';
    this.isPlayingSequence = true;

    // Add new random tile (0-8)
    this.sequence.push(Math.floor(Math.random() * 9));

    setTimeout(() => {
      this.playSequence(0);
    }, 600);
  }

  playSequence(index) {
    if (index >= this.sequence.length) {
      this.isPlayingSequence = false;
      this.msgEl.textContent = 'YOUR TURN';
      return;
    }

    const tileIdx = this.sequence[index];
    this.flashTile(tileIdx, () => {
      setTimeout(() => {
        this.playSequence(index + 1);
      }, 200);
    });
  }

  flashTile(index, callback) {
    const tile = this.tiles[index];
    tile.classList.add('active');
    setTimeout(() => {
      tile.classList.remove('active');
      if (callback) callback();
    }, 350);
  }

  handleTileClick(index) {
    if (this.isPlayingSequence || this.sequence.length === 0) return;

    this.flashTile(index);

    if (index === this.sequence[this.playerStep]) {
      this.playerStep++;
      if (this.playerStep === this.sequence.length) {
        // Round cleared
        this.onLog('MATRIX', `Cleared Level ${this.level}`);
        this.level++;
        if (this.level > this.highLevel) {
          this.highLevel = this.level;
          this.highEl.textContent = this.highLevel;
          localStorage.setItem('matrix_high', this.highLevel.toString());
        }
        this.msgEl.textContent = 'CORRECT';
        setTimeout(() => {
          this.nextRound();
        }, 800);
      }
    } else {
      // Failed
      this.msgEl.textContent = `FAILED AT LVL ${this.level}`;
      this.startBtn.disabled = false;
      this.startBtn.textContent = 'RETRY';
      this.onLog('MATRIX', `Failed at Level ${this.level}. Max was ${this.sequence.length}`);
      this.sequence = [];
    }
  }

  destroy() {
    // cleanup
  }
}
