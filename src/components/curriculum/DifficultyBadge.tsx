import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface DifficultyBadgeProps {
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  className?: string;
}

export const DifficultyBadge = ({ level, className = "" }: DifficultyBadgeProps) => {
  const config = {
    Beginner: {
      className: "bg-green-100 text-green-700 hover:bg-green-100",
      stars: 1,
    },
    Intermediate: {
      className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
      stars: 2,
    },
    Advanced: {
      className: "bg-red-100 text-red-700 hover:bg-red-100",
      stars: 3,
    },
  };

  const { className: badgeClass, stars } = config[level];

  return (
    <Badge className={`${badgeClass} ${className} flex items-center gap-1`}>
      {Array.from({ length: stars }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-current" />
      ))}
      <span className="ml-1">{level}</span>
    </Badge>
  );
};
