const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const PADDLE_WIDTH = 10, PADDLE_HEIGHT = 80;
const BALL_SIZE = 12;
const PADDLE_SPEED = 6;
const AI_SPEED = 3.5;

let leftPaddle = {
  x: 10,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  dy: 0
};
let rightPaddle = {
  x: canvas.width - 20,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  dy: 0
};
let ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: 5 * (Math.random() > 0.5 ? 1 : -1),
  dy: 3 * (Math.random() > 0.5 ? 1 : -1)
};

let scoreL = 0, scoreR = 0;
const scoreLeftElem = document.getElementById('score-left');
const scoreRightElem = document.getElementById('score-right');

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.dx = 5 * (Math.random() > 0.5 ? 1 : -1);
  ball.dy = 3 * (Math.random() > 0.5 ? 1 : -1);
}

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawBall() {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawNet() {
  ctx.strokeStyle = "#555";
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawNet();
  drawRect(leftPaddle.x, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT, "#61dafb");
  drawRect(rightPaddle.x, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT, "#e06c75");
  drawBall();
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function update() {
  // Move paddles
  leftPaddle.y += leftPaddle.dy;
  leftPaddle.y = clamp(leftPaddle.y, 0, canvas.height - PADDLE_HEIGHT);

  // AI paddle movement
  let aiTarget = ball.y - PADDLE_HEIGHT / 2;
  // Add simple AI lag
  if (rightPaddle.y + PADDLE_HEIGHT / 2 < aiTarget - 8) {
    rightPaddle.y += AI_SPEED;
  } else if (rightPaddle.y + PADDLE_HEIGHT / 2 > aiTarget + 8) {
    rightPaddle.y -= AI_SPEED;
  }
  rightPaddle.y = clamp(rightPaddle.y, 0, canvas.height - PADDLE_HEIGHT);

  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Wall collision
  if (ball.y < BALL_SIZE / 2 || ball.y > canvas.height - BALL_SIZE / 2) {
    ball.dy *= -1;
  }

  // Left paddle collision
  if (
    ball.x - BALL_SIZE / 2 < leftPaddle.x + PADDLE_WIDTH &&
    ball.y > leftPaddle.y &&
    ball.y < leftPaddle.y + PADDLE_HEIGHT
  ) {
    ball.x = leftPaddle.x + PADDLE_WIDTH + BALL_SIZE / 2;
    ball.dx *= -1;
    // Add some effect based on where the ball hits the paddle
    let impact = (ball.y - (leftPaddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
    ball.dy += impact * 2;
  }

  // Right paddle collision
  if (
    ball.x + BALL_SIZE / 2 > rightPaddle.x &&
    ball.y > rightPaddle.y &&
    ball.y < rightPaddle.y + PADDLE_HEIGHT
  ) {
    ball.x = rightPaddle.x - BALL_SIZE / 2;
    ball.dx *= -1;
    let impact = (ball.y - (rightPaddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
    ball.dy += impact * 2;
  }

  // Score check
  if (ball.x < 0) {
    scoreR++;
    scoreRightElem.textContent = scoreR;
    resetBall();
  }
  if (ball.x > canvas.width) {
    scoreL++;
    scoreLeftElem.textContent = scoreL;
    resetBall();
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Mouse move control for left paddle
canvas.addEventListener('mousemove', function (e) {
  const rect = canvas.getBoundingClientRect();
  let mouseY = e.clientY - rect.top;
  leftPaddle.y = clamp(mouseY - PADDLE_HEIGHT / 2, 0, canvas.height - PADDLE_HEIGHT);
});

// Arrow key control for left paddle
window.addEventListener('keydown', function (e) {
  if (e.key === "ArrowUp") {
    leftPaddle.dy = -PADDLE_SPEED;
  }
  if (e.key === "ArrowDown") {
    leftPaddle.dy = PADDLE_SPEED;
  }
});
window.addEventListener('keyup', function (e) {
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    leftPaddle.dy = 0;
  }
});

gameLoop();