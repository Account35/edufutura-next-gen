import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CAPSBadgeProps {
  code?: string | null;
  description?: string | null;
  aligned?: boolean;
  className?: string;
}

export const CAPSBadge = ({ 
  code, 
  description, 
  aligned = true,
  className = "" 
}: CAPSBadgeProps) => {
  if (!aligned && !code) return null;

  const badge = (
    <Badge className={`bg-secondary text-white hover:bg-secondary/90 ${className}`}>
      <CheckCircle className="h-3 w-3 mr-1" />
      {code ? `CAPS ${code}` : 'CAPS Aligned'}
    </Badge>
  );

  if (description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};
