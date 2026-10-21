
const canvas = document.getElementById("universe");
const ctx = canvas.getContext("2d");

const countInput = document.getElementById("particleCount");
const speedInput = document.getElementById("speed");
const colorInput = document.getElementById("colorTheme");
const connectionsInput = document.getElementById("connections");

const countValue = document.getElementById("countValue");
const speedValue = document.getElementById("speedValue");
const particleStatus = document.getElementById("particleStatus");

const burstButton = document.getElementById("burstButton");
const resetButton = document.getElementById("resetButton");

const palettes = {
  cosmic: [185, 220, 270, 300],
  ocean: [175, 190, 205, 225],
  fire: [5, 25, 42, 55],
  forest: [105, 130, 155, 175]
};

let width = 0;
let height = 0;
let dpr = 1;
let particles = [];
let stars = [];
let animationId = null;
let lastTime = 0;
let rainbowHue = 0;

const pointer = {
  x: -1000,
  y: -1000,
  active: false
};

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  createStars();
  createParticles(Number(countInput.value));
}

function createStars() {
  const amount = Math.min(
    180,
    Math.floor((width * height) / 6500)
  );

  stars = Array.from({ length: amount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: random(0.4, 1.4),
    alpha: random(0.15, 0.65),
    phase: random(0, Math.PI * 2)
  }));
}

function createParticles(amount) {
  particles = Array.from({ length: amount }, () => ({
    x: random(0, width),
    y: random(0, height),
    vx: random(-0.5, 0.5),
    vy: random(-0.5, 0.5),
    radius: random(1.2, 2.8),
    hue: random(0, 360)
  }));

  countValue.textContent = amount;
  particleStatus.textContent = amount + " PARTICLES";
}

function getHue(index) {
  if (colorInput.value === "rainbow") {
    return (particles[index].hue + rainbowHue) % 360;
  }

  const palette = palettes[colorInput.value] || palettes.cosmic;
  return palette[index % palette.length];
}

function particleColor(index, alpha = 1) {
  return `hsla(${getHue(index)}, 95%, 70%, ${alpha})`;
}

function drawBackground() {
  // Clear fully so old frames do not leave unwanted trails.
  ctx.fillStyle = "#070816";
  ctx.fillRect(0, 0, width, height);

  for (const star of stars) {
    const twinkle =
      0.65 + Math.sin(performance.now() * 0.001 + star.phase) * 0.35;

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(205, 210, 255, ${star.alpha * twinkle})`;
    ctx.fill();
  }

  // Soft cosmic glow behind the particles.
  const glow = ctx.createRadialGradient(
    width * 0.5, height * 0.45, 0,
    width * 0.5, height * 0.45, Math.max(width, height) * 0.65
  );

  glow.addColorStop(0, "rgba(75, 43, 140, 0.13)");
  glow.addColorStop(1, "rgba(7, 8, 22, 0)");

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function updateParticles(delta) {
  const speed = Number(speedInput.value) / 10;
  const step = Math.min(delta / 16.67, 2);

  for (const p of particles) {
    p.x += p.vx * speed * step;
    p.y += p.vy * speed * step;

    // Wrap around the screen edges.
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    // Repel nearby particles from the mouse or finger.
    if (pointer.active) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const distanceSquared = dx * dx + dy * dy;
      const radius = 120;

      if (distanceSquared < radius * radius && distanceSquared > 0) {
        const distance = Math.sqrt(distanceSquared);
        const force = (1 - distance / radius) * 0.7;

        p.vx += (dx / distance) * force * step;
        p.vy += (dy / distance) * force * step;
      }
    }

    // Gentle drag keeps particle speeds under control.
    p.vx *= 0.995;
    p.vy *= 0.995;

    const maxSpeed = 3;

    p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
    p.vy = Math.max(-maxSpeed, Math.min(maxSpeed, p.vy));
  }
}

function drawConnections() {
  if (!connectionsInput.checked) return;

  const maxDistance = 105;
  const maxDistanceSquared = maxDistance * maxDistance;

  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];

    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < maxDistanceSquared) {
        const distance = Math.sqrt(distanceSquared);
        const alpha = (1 - distance / maxDistance) * 0.32;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = particleColor(i, alpha);
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
  }
}

function drawParticles() {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = particleColor(i, 0.95);
    ctx.shadowBlur = 12;
    ctx.shadowColor = particleColor(i, 0.9);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

function animate(time = 0) {
  const delta = lastTime
    ? Math.min(time - lastTime, 40)
    : 16.67;

  lastTime = time;
  rainbowHue = (rainbowHue + delta * 0.015) % 360;

  drawBackground();
  updateParticles(delta);
  drawConnections();
  drawParticles();

  animationId = requestAnimationFrame(animate);
}

function setPointer(event) {
  const rect = canvas.getBoundingClientRect();

  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.active = true;
}

canvas.addEventListener("pointermove", setPointer);

canvas.addEventListener("pointerdown", setPointer);

canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});

canvas.addEventListener("pointercancel", () => {
  pointer.active = false;
});

countInput.addEventListener("input", () => {
  createParticles(Number(countInput.value));
});

speedInput.addEventListener("input", () => {
  speedValue.textContent =
    (Number(speedInput.value) / 10).toFixed(1) + "×";
});

colorInput.addEventListener("change", () => {
  // The selected theme is applied automatically.
});

connectionsInput.addEventListener("change", () => {
  // drawConnections checks this setting every frame.
});

burstButton.addEventListener("click", () => {
  const centerX = width / 2;
  const centerY = height / 2;

  for (const p of particles) {
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = random(1.5, 4);

    p.vx += (dx / distance) * force;
    p.vy += (dy / distance) * force;
  }

  pointer.active = false;
});

resetButton.addEventListener("click", () => {
  createParticles(Number(countInput.value));
  pointer.active = false;
  lastTime = 0;
});

window.addEventListener("resize", resizeCanvas);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  } else if (animationId === null) {
    lastTime = 0;
    animationId = requestAnimationFrame(animate);
  }
});

// Initialize the project.
resizeCanvas();

speedValue.textContent =
  (Number(speedInput.value) / 10).toFixed(1) + "×";

animationId = requestAnimationFrame(animate);
                    
