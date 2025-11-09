import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
}

export const ProgressRing = ({
  progress,
  size = 100,
  strokeWidth = 8,
  className,
  showPercentage = true,
}: ProgressRingProps) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className={cn('progress-ring', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="progress-ring-circle">
        {/* Background circle */}
        <circle
          className="progress-ring-bg"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="progress-ring-fill"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showPercentage && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            fontSize: size * 0.25,
            fontWeight: 600,
          }}
        >
          <span className="font-mono text-primary">{Math.round(clampedProgress)}%</span>
        </div>
      )}
    </div>
  );
};