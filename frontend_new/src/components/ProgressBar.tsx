import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'green' | 'blue' | 'yellow' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  showPercentage = true,
  color = 'green',
  size = 'md',
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-green-600';
      case 'blue':
        return 'bg-blue-600';
      case 'yellow':
        return 'bg-yellow-600';
      case 'red':
        return 'bg-red-600';
      default:
        return 'bg-green-600';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'md':
        return 'h-4';
      case 'lg':
        return 'h-6';
      default:
        return 'h-4';
    }
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-600">
              {current}/{total} ({percentage}%)
            </span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-full ${getSizeClasses()}`}>
        <div
          className={`${getColorClasses()} ${getSizeClasses()} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
