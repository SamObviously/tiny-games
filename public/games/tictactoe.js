// TIC-TAC-TOE: Ultra-small 3x3, zero emojis, pure white & black
export class TicTacToe {
  constructor(container, onLog) {
    this.container = container;
    this.onLog = onLog || (() => {});
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.isAi = true;
    this.isOver = false;
    this.scores = { X: 0, O: 0, TIES: 0 };
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div style="display:flex; justify-content:space-between; width:260px; margin-bottom:8px; font-weight:bold;">
          <span>MODE: <button id="ttt-mode-btn" style="padding:2px 8px;">VS CPU</button></span>
          <span>TURN: <span id="ttt-turn">X</span></span>
        </div>
        <div class="ttt-board" id="ttt-board"></div>
        <div id="ttt-result" style="height:20px; font-weight:bold; margin-top:4px;"></div>
        <div style="display:flex; gap:16px; margin-top:8px; font-size:12px;">
          <span>X: <span id="score-x">0</span></span>
          <span>O: <span id="score-o">0</span></span>
          <span>TIE: <span id="score-tie">0</span></span>
        </div>
      </div>
    `;

    this.boardEl = this.container.querySelector('#ttt-board');
    this.turnEl = this.container.querySelector('#ttt-turn');
    this.resultEl = this.container.querySelector('#ttt-result');
    this.modeBtn = this.container.querySelector('#ttt-mode-btn');

    this.modeBtn.addEventListener('click', () => {
      this.isAi = !this.isAi;
      this.modeBtn.textContent = this.isAi ? 'VS CPU' : '2-PLAYER';
      this.onLog('TICTACTOE', `Mode switched to ${this.isAi ? 'VS CPU' : '2-PLAYER'}`);
      this.reset();
    });

    this.renderBoard();
    this.onLog('TICTACTOE', 'Tic-Tac-Toe initialized');
  }

  renderBoard() {
    this.boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'ttt-cell' + (this.board[i] ? ' occupied' : '');
      cell.textContent = this.board[i] || '';
      cell.dataset.index = i;
      cell.addEventListener('click', () => this.handleCellClick(i));
      this.boardEl.appendChild(cell);
    }
  }

  handleCellClick(index) {
    if (this.isOver || this.board[index]) return;

    this.makeMove(index, this.currentPlayer);

    if (!this.isOver && this.isAi && this.currentPlayer === 'O') {
      setTimeout(() => this.makeAiMove(), 250);
    }
  }

  makeMove(index, player) {
    this.board[index] = player;
    this.renderBoard();
    this.onLog('TICTACTOE', `Player ${player} placed mark at position ${index}`);

    const winner = this.checkWinner();
    if (winner) {
      this.isOver = true;
      if (winner === 'TIE') {
        this.resultEl.textContent = 'MATCH DRAW';
        this.scores.TIES++;
        this.onLog('TICTACTOE', 'Game ended in a draw');
      } else {
        this.resultEl.textContent = `PLAYER ${winner} WINS`;
        this.scores[winner]++;
        this.onLog('TICTACTOE', `Player ${winner} won the round`);
      }
      this.updateScores();
      return;
    }

    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    this.turnEl.textContent = this.currentPlayer;
  }

  makeAiMove() {
    if (this.isOver) return;
    // Check if AI can win
    for (let i = 0; i < 9; i++) {
      if (!this.board[i]) {
        this.board[i] = 'O';
        if (this.checkWinner() === 'O') {
          this.board[i] = null;
          this.makeMove(i, 'O');
          return;
        }
        this.board[i] = null;
      }
    }
    // Check if human can win and block
    for (let i = 0; i < 9; i++) {
      if (!this.board[i]) {
        this.board[i] = 'X';
        if (this.checkWinner() === 'X') {
          this.board[i] = null;
          this.makeMove(i, 'O');
          return;
        }
        this.board[i] = null;
      }
    }
    // Take center
    if (!this.board[4]) {
      this.makeMove(4, 'O');
      return;
    }
    // Random empty
    const available = [];
    for (let i = 0; i < 9; i++) {
      if (!this.board[i]) available.push(i);
    }
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      this.makeMove(pick, 'O');
    }
  }

  checkWinner() {
    const lines = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];
    for (const [a, b, c] of lines) {
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        return this.board[a];
      }
    }
    if (this.board.every(cell => cell !== null)) return 'TIE';
    return null;
  }

  updateScores() {
    this.container.querySelector('#score-x').textContent = this.scores.X;
    this.container.querySelector('#score-o').textContent = this.scores.O;
    this.container.querySelector('#score-tie').textContent = this.scores.TIES;
  }

  reset() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.isOver = false;
    this.resultEl.textContent = '';
    this.turnEl.textContent = 'X';
    this.renderBoard();
    this.onLog('TICTACTOE', 'Board reset');
  }

  destroy() {
    // cleanup
  }
}
