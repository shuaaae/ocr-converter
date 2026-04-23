import { useState, useEffect } from 'react';

const useTypingAnimation = (items, typingSpeed = 60, pauseMs = 2000) => {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    let idx = 0, charIdx = 0, deleting = false, timer;
    const tick = () => {
      const current = items[idx];
      if (!deleting) {
        charIdx++;
        setDisplay(current.slice(0, charIdx));
        if (charIdx === current.length) {
          timer = setTimeout(() => { deleting = true; tick(); }, pauseMs);
          return;
        }
      } else {
        charIdx--;
        setDisplay(current.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          idx = (idx + 1) % items.length;
        }
      }
      timer = setTimeout(tick, deleting ? 30 : typingSpeed);
    };
    tick();
    return () => clearTimeout(timer);
  }, [items, typingSpeed, pauseMs]);
  return display;
};

export default useTypingAnimation;
