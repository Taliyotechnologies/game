const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');
const gameOverlay = document.getElementById('gameOverlay');
const playPauseBtn = document.getElementById('playPauseBtn');
const resetBtn = document.getElementById('resetBtn');

// Game state
let gameRunning = false;
let gamePaused = true;

// Game constants
const PADDLE_WIDTH = 12, PADDLE_HEIGHT = 80;
const BALL_SIZE = 14;
const PADDLE_SPEED = 8;
const AI_SPEED = 4.5;
const MAX_BALL_SPEED = 12;

// Particle system
let particles = [];

// Sound effects (using Web Audio API)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function createBeep(frequency, duration) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// Game objects
let leftPaddle = {
  x: 15,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  dy: 0,
  color: '#FF6B6B'
};

let rightPaddle = {
  x: canvas.width - 25,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  dy: 0,
  color: '#4ECDC4'
};

let ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: 6 * (Math.random() > 0.5 ? 1 : -1),
  dy: 4 * (Math.random() > 0.5 ? 1 : -1),
  color: '#FFD700',
  trail: []
};

let scoreL = 0, scoreR = 0;
const scoreLeftElem = document.getElementById('score-left');
const scoreRightElem = document.getElementById('score-right');

// Particle class
class Particle {
  constructor(x, y, dx, dy, color, life) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = Math.random() * 4 + 2;
  }
  
  update() {
    this.x += this.dx;
    this.y += this.dy;
    this.life--;
    this.dx *= 0.98;
    this.dy *= 0.98;
  }
  
  draw() {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function createParticles(x, y, color, count = 15) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = Math.random() * 8 + 4;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const life = Math.random() * 30 + 20;
    particles.push(new Particle(x, y, dx, dy, color, life));
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.update();
    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach(particle => particle.draw());
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.dx = 6 * (Math.random() > 0.5 ? 1 : -1);
  ball.dy = 4 * (Math.random() > 0.5 ? 1 : -1);
  ball.trail = [];
  
  // Create reset particles
  createParticles(ball.x, ball.y, '#FFD700', 20);
}

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  
  // Add glow effect
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

function drawBall() {
  // Add ball to trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 8) {
    ball.trail.shift();
  }
  
  // Draw trail
  ball.trail.forEach((pos, index) => {
    const alpha = (index + 1) / ball.trail.length * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (BALL_SIZE / 2) * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.globalAlpha = 1;
  
  // Draw main ball with glow
  ctx.fillStyle = ball.color;
  ctx.shadowColor = ball.color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawNet() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.setLineDash([10, 15]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}

function render() {
  // Clear canvas with fade effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  drawNet();
  drawRect(leftPaddle.x, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT, leftPaddle.color);
  drawRect(rightPaddle.x, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT, rightPaddle.color);
  drawBall();
  drawParticles();
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function update() {
  if (!gameRunning || gamePaused) return;
  
  // Move paddles
  leftPaddle.y += leftPaddle.dy;
  leftPaddle.y = clamp(leftPaddle.y, 0, canvas.height - PADDLE_HEIGHT);

  // Enhanced AI paddle movement
  let aiTarget = ball.y - PADDLE_HEIGHT / 2;
  let aiSpeed = AI_SPEED;
  
  // Make AI faster when ball is coming towards it
  if (ball.dx > 0) {
    aiSpeed *= 1.2;
  }
  
  // Add some randomness to make AI beatable
  if (Math.random() < 0.05) {
    aiTarget += (Math.random() - 0.5) * 100;
  }
  
  if (rightPaddle.y + PADDLE_HEIGHT / 2 < aiTarget - 10) {
    rightPaddle.y += aiSpeed;
  } else if (rightPaddle.y + PADDLE_HEIGHT / 2 > aiTarget + 10) {
    rightPaddle.y -= aiSpeed;
  }
  rightPaddle.y = clamp(rightPaddle.y, 0, canvas.height - PADDLE_HEIGHT);

  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Wall collision with particles
  if (ball.y < BALL_SIZE / 2 || ball.y > canvas.height - BALL_SIZE / 2) {
    ball.dy *= -1;
    createParticles(ball.x, ball.y, '#FFFFFF', 8);
    createBeep(800, 0.1);
  }

  // Left paddle collision
  if (
    ball.x - BALL_SIZE / 2 < leftPaddle.x + PADDLE_WIDTH &&
    ball.y > leftPaddle.y &&
    ball.y < leftPaddle.y + PADDLE_HEIGHT &&
    ball.dx < 0
  ) {
    ball.x = leftPaddle.x + PADDLE_WIDTH + BALL_SIZE / 2;
    ball.dx *= -1.05; // Increase speed slightly
    
    // Add spin based on paddle movement and hit position
    let impact = (ball.y - (leftPaddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
    ball.dy += impact * 3 + leftPaddle.dy * 0.3;
    
    // Limit ball speed
    ball.dx = clamp(ball.dx, -MAX_BALL_SPEED, MAX_BALL_SPEED);
    ball.dy = clamp(ball.dy, -MAX_BALL_SPEED, MAX_BALL_SPEED);
    
    createParticles(ball.x, ball.y, leftPaddle.color, 12);
    createBeep(600, 0.15);
  }

  // Right paddle collision
  if (
    ball.x + BALL_SIZE / 2 > rightPaddle.x &&
    ball.y > rightPaddle.y &&
    ball.y < rightPaddle.y + PADDLE_HEIGHT &&
    ball.dx > 0
  ) {
    ball.x = rightPaddle.x - BALL_SIZE / 2;
    ball.dx *= -1.05;
    
    let impact = (ball.y - (rightPaddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
    ball.dy += impact * 3 + rightPaddle.dy * 0.3;
    
    ball.dx = clamp(ball.dx, -MAX_BALL_SPEED, MAX_BALL_SPEED);
    ball.dy = clamp(ball.dy, -MAX_BALL_SPEED, MAX_BALL_SPEED);
    
    createParticles(ball.x, ball.y, rightPaddle.color, 12);
    createBeep(600, 0.15);
  }

  // Score check with enhanced effects
  if (ball.x < 0) {
    scoreR++;
    scoreRightElem.textContent = scoreR;
    scoreRightElem.style.transform = 'scale(1.2)';
    setTimeout(() => scoreRightElem.style.transform = 'scale(1)', 300);
    createBeep(300, 0.5);
    resetBall();
  }
  if (ball.x > canvas.width) {
    scoreL++;
    scoreLeftElem.textContent = scoreL;
    scoreLeftElem.style.transform = 'scale(1.2)';
    setTimeout(() => scoreLeftElem.style.transform = 'scale(1)', 300);
    createBeep(300, 0.5);
    resetBall();
  }
  
  updateParticles();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function toggleGame() {
  if (!gameRunning) {
    gameRunning = true;
    gamePaused = false;
    gameOverlay.classList.add('hidden');
    playPauseBtn.innerHTML = '⏸️ PAUSE';
    playPauseBtn.classList.remove('primary');
    playPauseBtn.classList.add('secondary');
  } else {
    gamePaused = !gamePaused;
    if (gamePaused) {
      gameOverlay.classList.remove('hidden');
      gameOverlay.querySelector('h2').textContent = '⏸️ GAME PAUSED';
      gameOverlay.querySelector('p').textContent = 'Press RESUME to continue the battle!';
      playPauseBtn.innerHTML = '▶️ RESUME';
      playPauseBtn.classList.remove('secondary');
      playPauseBtn.classList.add('primary');
    } else {
      gameOverlay.classList.add('hidden');
      playPauseBtn.innerHTML = '⏸️ PAUSE';
      playPauseBtn.classList.remove('primary');
      playPauseBtn.classList.add('secondary');
    }
  }
}

function resetGame() {
  scoreL = 0;
  scoreR = 0;
  scoreLeftElem.textContent = scoreL;
  scoreRightElem.textContent = scoreR;
  gameRunning = false;
  gamePaused = true;
  particles = [];
  
  gameOverlay.classList.remove('hidden');
  gameOverlay.querySelector('h2').textContent = '🎮 GAME RESET';
  gameOverlay.querySelector('p').textContent = 'Press START to begin a new battle!';
  playPauseBtn.innerHTML = '▶️ START GAME';
  playPauseBtn.classList.remove('secondary');
  playPauseBtn.classList.add('primary');
  
  resetBall();
  createBeep(400, 0.3);
}

// Event listeners
playPauseBtn.addEventListener('click', toggleGame);
resetBtn.addEventListener('click', resetGame);

// Enhanced mouse control
canvas.addEventListener('mousemove', function (e) {
  if (!gameRunning || gamePaused) return;
  const rect = canvas.getBoundingClientRect();
  let mouseY = e.clientY - rect.top;
  leftPaddle.y = clamp(mouseY - PADDLE_HEIGHT / 2, 0, canvas.height - PADDLE_HEIGHT);
});

// Enhanced keyboard controls
let keys = {};
window.addEventListener('keydown', function (e) {
  keys[e.key] = true;
  
  if (e.key === ' ') {
    e.preventDefault();
    toggleGame();
  }
  if (e.key === 'r' || e.key === 'R') {
    resetGame();
  }
});

window.addEventListener('keyup', function (e) {
  keys[e.key] = false;
});

// Smooth paddle movement
function updatePaddleMovement() {
  if (keys['ArrowUp'] || keys['w'] || keys['W']) {
    leftPaddle.dy = -PADDLE_SPEED;
  } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
    leftPaddle.dy = PADDLE_SPEED;
  } else {
    leftPaddle.dy *= 0.8; // Smooth deceleration
  }
}

// Update paddle movement in game loop
const originalUpdate = update;
update = function() {
  updatePaddleMovement();
  originalUpdate();
};

// Start the game loop
gameLoop();

// Initialize audio context on first user interaction
document.addEventListener('click', () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}, { once: true });