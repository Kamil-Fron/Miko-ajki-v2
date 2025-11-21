import React, { useEffect, useRef } from 'react';

const Snowfall: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const snowflakes: { x: number; y: number; r: number; d: number }[] = [];
    const maxFlakes = 50;

    for (let i = 0; i < maxFlakes; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 3 + 1,
        d: Math.random() * maxFlakes,
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      for (let i = 0; i < maxFlakes; i++) {
        const f = snowflakes[i];
        ctx.moveTo(f.x, f.y);
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
      }
      ctx.fill();
      move();
    }

    let angle = 0;
    function move() {
      angle += 0.01;
      for (let i = 0; i < maxFlakes; i++) {
        const f = snowflakes[i];
        f.y += Math.pow(f.d, 2) + 1;
        f.x += Math.sin(angle) * 2;

        if (f.y > height) {
          snowflakes[i] = { x: Math.random() * width, y: 0, r: f.r, d: f.d };
        }
      }
    }

    const interval = setInterval(draw, 33);

    const handleResize = () => {
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            width = window.innerWidth;
            height = window.innerHeight;
        }
    }
    window.addEventListener('resize', handleResize);

    return () => {
        clearInterval(interval);
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="snow-container" />;
};

export default Snowfall;