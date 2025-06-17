import { X, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ErrorBannerProps {
  title: string;
  description: string;
  variant?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
  onActionClick?: () => void;
  actionLabel?: string;
  className?: string;
}

export function ErrorBanner({
  title,
  description,
  variant = 'error',
  onDismiss,
  onActionClick,
  actionLabel = 'Settings',
  className
}: ErrorBannerProps) {
  const variantStyles = {
    error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20',
    warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20',
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20'
  };

  const iconStyles = {
    error: 'text-red-500 dark:text-red-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    info: 'text-blue-500 dark:text-blue-400'
  };

  const textStyles = {
    error: 'text-red-800 dark:text-red-200',
    warning: 'text-yellow-800 dark:text-yellow-200',
    info: 'text-blue-800 dark:text-blue-200'
  };

  return (
    <Card className={cn(
      'p-4 border shadow-sm',
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle 
          size={20} 
          className={cn('mt-0.5 flex-shrink-0', iconStyles[variant])} 
        />
        
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-medium text-sm mb-1', textStyles[variant])}>
            {title}
          </h4>
          <p className={cn('text-xs leading-relaxed', textStyles[variant])}>
            {description}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {onActionClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onActionClick}
              className={cn(
                'h-8 text-xs',
                variant === 'error' && 'border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900',
                variant === 'warning' && 'border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900',
                variant === 'info' && 'border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900'
              )}
            >
              <Settings size={12} className="mr-1" />
              {actionLabel}
            </Button>
          )}
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className={cn(
                'h-8 w-8 p-0',
                variant === 'error' && 'hover:bg-red-100 dark:hover:bg-red-900',
                variant === 'warning' && 'hover:bg-yellow-100 dark:hover:bg-yellow-900',
                variant === 'info' && 'hover:bg-blue-100 dark:hover:bg-blue-900'
              )}
            >
              <X size={14} className={iconStyles[variant]} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
} 