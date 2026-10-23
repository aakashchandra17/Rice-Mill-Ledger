import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, grains, raf;

    const init = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(45, Math.floor((w * h) / 28000));
      grains = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: Math.random() * 0.3 + 0.1,
        len: Math.random() * 5 + 5,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.01,
        alpha: Math.random() * 0.35 + 0.35,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const g of grains) {
        if (!reduceMotion) {
          g.x += g.vx;
          g.y += g.vy;
          g.angle += g.spin;
          if (g.y > h + 10) { g.y = -10; g.x = Math.random() * w; }
          if (g.x < -10) g.x = w + 10;
          if (g.x > w + 10) g.x = -10;
        }
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, g.len, g.len / 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 232, 190, ${g.alpha})`;
        ctx.fill();
        ctx.restore();
      }
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', init);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}