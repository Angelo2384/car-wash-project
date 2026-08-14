import { useEffect } from 'react';

export default function FoamEffect() {
  useEffect(() => {
    let isDrawing = false;
    let lastFoamTime = 0;
    let cursorTimeout: ReturnType<typeof setTimeout> | null = null;
    let isEasterEggActive = false; // Toggle state for the easter egg

    const handleDoubleClick = () => {
      isEasterEggActive = !isEasterEggActive;
      
      if (isEasterEggActive) {
        document.body.classList.add('easter-egg-active');
        window.getSelection()?.removeAllRanges(); // Clear any accidental selection from the double click
      } else {
        // Turn off everything
        document.body.classList.remove('easter-egg-active');
        document.body.classList.remove('is-scrubbing');
        document.body.classList.remove('foaming-cursor');
        isDrawing = false;
        if (cursorTimeout) clearTimeout(cursorTimeout);
      }
    };

    const createFoam = (x: number, y: number) => {
      const foam = document.createElement('div');
      
      // Very occasional light, fluffy foam suds to keep it mostly clear
      const isSuds = Math.random() > 0.82; // 18% chance for fluffy foam suds
      foam.className = isSuds ? 'foam-suds' : 'foam-bubble';
      
      // Smaller bubbles and even smaller foam suds
      const size = isSuds 
        ? Math.random() * 10 + 10 // Foam suds: 10px to 20px
        : Math.random() * 15 + 15; // Bubbles: 15px to 30px
      const offsetX = (Math.random() - 0.5) * 40; 
      const offsetY = (Math.random() - 0.5) * 40;

      foam.style.left = `${x + offsetX - size / 2}px`;
      foam.style.top = `${y + offsetY - size / 2}px`;
      foam.style.width = `${size}px`;
      foam.style.height = `${size}px`;

      // Append to root to ensure it scrolls correctly with the rest of the site
      const root = document.getElementById('root') || document.body;
      root.appendChild(foam);

      // Remove after animation completes (1.5 seconds)
      setTimeout(() => {
        foam.remove();
      }, 1500);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isEasterEggActive) return; // Do nothing if easter egg is off

      // In Easter Egg mode, we prevent native selection entirely so you can scrub freely
      e.preventDefault();

      isDrawing = true;
      document.body.classList.add('is-scrubbing');
      createFoam(e.pageX, e.pageY);
    };

    const handleMouseUp = () => {
      isDrawing = false;
      document.body.classList.remove('is-scrubbing');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;
      
      // Add foaming cursor class and set a 2-second timeout to remove it
      document.body.classList.add('foaming-cursor');
      if (cursorTimeout) {
        clearTimeout(cursorTimeout);
      }
      cursorTimeout = setTimeout(() => {
        document.body.classList.remove('foaming-cursor');
      }, 2000);
      
      const now = Date.now();
      // Throttle bubble creation slightly for performance
      if (now - lastFoamTime > 30) {
        // Less foam overall: 2 to 5 bubbles per move
        const numBubbles = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < numBubbles; i++) {
          createFoam(e.pageX, e.pageY);
        }
        lastFoamTime = now;
      }
    };

    // Use capture: true to ensure these run even if a lower section calls stopPropagation
    window.addEventListener('dblclick', handleDoubleClick, { capture: true });
    window.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    window.addEventListener('mousemove', handleMouseMove, { capture: true });

    return () => {
      window.removeEventListener('dblclick', handleDoubleClick, { capture: true });
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      if (cursorTimeout) clearTimeout(cursorTimeout);
      document.body.classList.remove('easter-egg-active');
      document.body.classList.remove('foaming-cursor');
      document.body.classList.remove('is-scrubbing');
    };
  }, []);

  return null;
}
