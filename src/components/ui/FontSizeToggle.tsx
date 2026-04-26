import { Type, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFontSize } from '@/contexts/FontSizeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const fontSizeOptions = [
  { value: 'small' as const, label: 'Small', description: '14px', preview: 'Aa' },
  { value: 'medium' as const, label: 'Medium', description: '16px', preview: 'Aa' },
  { value: 'large' as const, label: 'Large', description: '18px', preview: 'Aa' },
  { value: 'extra-large' as const, label: 'Extra Large', description: '20px', preview: 'Aa' },
];

export function FontSizeToggle() {
  const { fontSize, setFontSize } = useFontSize();
  const currentOption = fontSizeOptions.find(option => option.value === fontSize);

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-between h-10 px-3",
              "bg-white dark:bg-gray-800",
              "border-gray-200 dark:border-gray-700",
              "hover:bg-gray-50 dark:hover:bg-gray-700",
              "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "transition-all duration-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="font-medium">{currentOption?.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span 
                className="font-bold text-gray-600 dark:text-gray-400"
                style={{ fontSize: currentOption?.description }}
              >
                {currentOption?.preview}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentOption?.description}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2">
          <div className="space-y-1">
            {fontSizeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setFontSize(option.value)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg cursor-pointer",
                  "hover:bg-gray-100 dark:hover:bg-gray-700",
                  "transition-colors duration-150",
                  fontSize === option.value && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    {fontSize === option.value && (
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {option.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {option.description}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="font-bold text-gray-600 dark:text-gray-400"
                    style={{ fontSize: option.description }}
                  >
                    {option.preview}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Changes apply instantly
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
