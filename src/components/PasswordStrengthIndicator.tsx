import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STRENGTH_VERY_WEAK, STRENGTH_WEAK, STRENGTH_FAIR, STRENGTH_GOOD } from '@/lib/constants';
import { getPasswordRequirements } from '@/lib/password';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const requirements = getPasswordRequirements(password);
  const metCount = requirements.filter((r) => r.met).length;
  const strength = metCount / requirements.length;

  const getStrengthColor = () => {
    if (strength <= STRENGTH_VERY_WEAK) return 'bg-destructive';
    if (strength <= STRENGTH_WEAK)      return 'bg-orange-500';
    if (strength <= STRENGTH_FAIR)      return 'bg-yellow-500';
    if (strength <= STRENGTH_GOOD)      return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength <= STRENGTH_VERY_WEAK) return 'Very weak';
    if (strength <= STRENGTH_WEAK)      return 'Weak';
    if (strength <= STRENGTH_FAIR)      return 'Fair';
    if (strength <= STRENGTH_GOOD)      return 'Good';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Password strength</span>
          <span className={cn(
            "text-xs font-medium",
            strength === 1 ? "text-green-600" : "text-muted-foreground"
          )}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", getStrengthColor())}
            style={{ width: `${strength * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors duration-200",
              req.met ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {req.met ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
