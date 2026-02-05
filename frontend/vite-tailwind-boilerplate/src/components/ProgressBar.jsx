import React from "react";

export function ProgressBar({ value }) {
  const [animatedValue, setAnimatedValue] = React.useState(0);

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
      setAnimatedValue(Math.round(start));
    }, stepTime);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-3 bg-green-500 rounded-full transition-all"
        style={{ width: `${animatedValue}%` }}
      />
    </div>
  );
}
