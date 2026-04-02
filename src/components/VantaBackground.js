import React, { useEffect, useRef } from 'react';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', reject);
      }
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

const VantaBackground = ({ isDarkMode }) => {
  const containerRef = useRef(null);
  const vantaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (!window.THREE) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        }
        if (!window.VANTA || !window.VANTA.NET) {
          await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js');
        }
        if (cancelled || !containerRef.current || !window.VANTA || !window.VANTA.NET) return;

        // Destroy previous if re-initializing on theme change
        if (vantaRef.current && vantaRef.current.destroy) {
          vantaRef.current.destroy();
          vantaRef.current = null;
        }

        // Muted grayscale for readability across themes
        const lineColor = 0x8a8f98; // soft gray
        const bgColor = isDarkMode ? 0x000000 : 0xffffff;

        vantaRef.current = window.VANTA.NET({
          el: containerRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: lineColor,
          backgroundColor: bgColor,
          points: 10.0,
          maxDistance: 17.0,
          spacing: 17.0,
          showDots: false
        });
      } catch (e) {
        // silently fail
      }
    }

    init();

    return () => {
      cancelled = true;
      if (vantaRef.current && vantaRef.current.destroy) {
        vantaRef.current.destroy();
        vantaRef.current = null;
      }
    };
  }, [isDarkMode]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
};

export default VantaBackground;


