import React from "react";

export function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const duration = 800;
    const stepTime = 16;
    const increment = value / (duration / stepTime);

    const interval = setInterval(() => {
      start += increment;
      if (start >= value) {
        start = value;
        clearInterval(interval);
      }
      setDisplayValue(Math.round(start));
    }, stepTime);

    return () => clearInterval(interval);
  }, [value]);

  return <div className="text-5xl font-semibold text-gray-800 mb-4">{displayValue}%</div>;
}
