// SNAKE MICRO: 16x16 grid, sharp square pixels, pure white & black, zero emojis
export class SnakeMicro {
  constructor(container, onLog) {
    this.container = container;
    this.onLog = onLog || (() => {});
    this.gridSize = 16;
    this.cellSize = 14; // 16 * 14 = 224px
    this.snake = [{ x: 8, y: 8 }];
    this.food = { x: 4, y: 4 };
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('snake_highscore') || '0', 10);
    this.interval = null;
    this.speed = 120;
    this.isOver = false;
    this.isPaused = true;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div style="display:flex; justify-content:space-between; width:228px; margin-bottom:8px; font-weight:bold; font-size:12px;">
          <span>SCORE: <span id="snake-score">0</span></span>
          <span>HIGH: <span id="snake-high">${this.highScore}</span></span>
        </div>
        <canvas id="snake-canvas" class="game-canvas" width="224" height="224"></canvas>
        <div id="snake-msg" style="height:20px; font-weight:bold; margin-top:6px; font-size:12px;">PRESS START OR SPACE</div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button id="snake-start-btn">START</button>
          <button id="snake-reset-btn">RESET</button>
        </div>
        <!-- Directional buttons for touch / mouse -->
        <div style="display:grid; grid-template-columns: repeat(3, 40px); gap: 4px; margin-top: 12px;">
          <div></div>
          <button id="s-up">W</button>
          <div></div>
          <button id="s-left">A</button>
          <button id="s-down">S</button>
          <button id="s-right">D</button>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#snake-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = this.container.querySelector('#snake-score');
    this.highEl = this.container.querySelector('#snake-high');
    this.msgEl = this.container.querySelector('#snake-msg');
    this.startBtn = this.container.querySelector('#snake-start-btn');
    this.resetBtn = this.container.querySelector('#snake-reset-btn');

    this.startBtn.addEventListener('click', () => this.toggleStart());
    this.resetBtn.addEventListener('click', () => this.reset());

    // D-Pad buttons
    this.container.querySelector('#s-up').addEventListener('click', () => this.changeDir(0, -1));
    this.container.querySelector('#s-down').addEventListener('click', () => this.changeDir(0, 1));
    this.container.querySelector('#s-left').addEventListener('click', () => this.changeDir(-1, 0));
    this.container.querySelector('#s-right').addEventListener('click', () => this.changeDir(1, 0));

    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);

    this.placeFood();
    this.draw();
    this.onLog('SNAKE', 'Snake Micro loaded');
  }

  handleKeyDown(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      this.toggleStart();
      return;
    }
    if (['ArrowUp', 'KeyW'].includes(e.code)) {
      e.preventDefault();
      this.changeDir(0, -1);
    } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
      e.preventDefault();
      this.changeDir(0, 1);
    } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
      e.preventDefault();
      this.changeDir(-1, 0);
    } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      this.changeDir(1, 0);
    }
  }

  changeDir(x, y) {
    if (this.isPaused || this.isOver) return;
    if (x !== 0 && this.direction.x !== 0) return; // Prevent 180 reverse
    if (y !== 0 && this.direction.y !== 0) return;
    this.nextDirection = { x, y };
  }

  toggleStart() {
    if (this.isOver) {
      this.reset();
    }
    if (this.isPaused) {
      this.isPaused = false;
      this.startBtn.textContent = 'PAUSE';
      this.msgEl.textContent = 'RUNNING';
      this.interval = setInterval(() => this.tick(), this.speed);
      this.onLog('SNAKE', 'Game started');
    } else {
      this.isPaused = true;
      this.startBtn.textContent = 'RESUME';
      this.msgEl.textContent = 'PAUSED';
      clearInterval(this.interval);
      this.onLog('SNAKE', 'Game paused');
    }
  }

  tick() {
    this.direction = { ...this.nextDirection };
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    // Collision with walls
    if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
      return this.gameOver('WALL COLLISION');
    }

    // Collision with self
    if (this.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      return this.gameOver('SELF COLLISION');
    }

    this.snake.unshift(head);

    // Food eaten
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      this.scoreEl.textContent = this.score;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.highEl.textContent = this.highScore;
        localStorage.setItem('snake_highscore', this.highScore.toString());
      }
      this.placeFood();
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  gameOver(reason) {
    clearInterval(this.interval);
    this.isOver = true;
    this.isPaused = true;
    this.startBtn.textContent = 'START';
    this.msgEl.textContent = `GAME OVER (${reason})`;
    this.onLog('SNAKE', `Game Over: ${reason}. Final Score: ${this.score}`);
    this.draw();
  }

  placeFood() {
    while (true) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      if (!this.snake.some(s => s.x === x && s.y === y)) {
        this.food = { x, y };
        break;
      }
    }
  }

  draw() {
    // Clear canvas - strict pure black
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid lines faintly or minimalist border
    // Food: Solid sharp white square
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(
      this.food.x * this.cellSize + 1,
      this.food.y * this.cellSize + 1,
      this.cellSize - 2,
      this.cellSize - 2
    );

    // Snake: Sharp hollow/bordered white squares
    this.snake.forEach((seg, i) => {
      if (i === 0) {
        // Head: solid white
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(
          seg.x * this.cellSize + 1,
          seg.y * this.cellSize + 1,
          this.cellSize - 2,
          this.cellSize - 2
        );
      } else {
        // Body: sharp outline white
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
          seg.x * this.cellSize + 1.5,
          seg.y * this.cellSize + 1.5,
          this.cellSize - 3,
          this.cellSize - 3
        );
      }
    });
  }

  reset() {
    clearInterval(this.interval);
    this.snake = [{ x: 8, y: 8 }];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.scoreEl.textContent = '0';
    this.isOver = false;
    this.isPaused = true;
    this.startBtn.textContent = 'START';
    this.msgEl.textContent = 'PRESS START OR SPACE';
    this.placeFood();
    this.draw();
    this.onLog('SNAKE', 'Game reset');
  }

  destroy() {
    clearInterval(this.interval);
    window.removeEventListener('keydown', this.boundKeyDown);
  }
}
