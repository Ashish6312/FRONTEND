import { useState, useEffect } from 'react';

const useCountUp = (endValue, duration = 2000, startValue = 0) => {
  const [count, setCount] = useState(startValue);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      setCount(progress * (endValue - startValue) + startValue);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue); // Ensure we end up at the exact target value
      }
    };
    
    window.requestAnimationFrame(step);
  }, [endValue, duration, startValue]);

  return Number(count.toFixed(2));
};

export default useCountUp;
