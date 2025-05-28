declare module 'react-day-picker' {
  import * as React from 'react';
  
  export interface DayModifiers {
    selected?: boolean;
    disabled?: boolean;
    hidden?: boolean;
    today?: boolean;
    outside?: boolean;
    [key: string]: boolean | undefined;
  }

  export interface DayPickerProps {
    mode?: 'single' | 'multiple' | 'range' | 'default';
    selected?: Date | Date[] | { from: Date; to: Date };
    onSelect?: (day: Date | undefined) => void;
    defaultMonth?: Date;
    month?: Date;
    onMonthChange?: (month: Date) => void;
    fromMonth?: Date;
    toMonth?: Date;
    fromYear?: number;
    toYear?: number;
    numberOfMonths?: number;
    pagedNavigation?: boolean;
    showOutsideDays?: boolean;
    fixedWeeks?: boolean;
    showWeekNumber?: boolean;
    ISOWeek?: boolean;
    locale?: Locale;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    className?: string;
    classNames?: Record<string, string>;
    styles?: Record<string, React.CSSProperties>;
    modifiers?: Record<string, Date[] | ((date: Date) => boolean)>;
    modifiersClassNames?: Record<string, string>;
    modifiersStyles?: Record<string, React.CSSProperties>;
    dir?: 'ltr' | 'rtl';
    disabled?: boolean | Date[] | ((date: Date) => boolean);
    hidden?: boolean | Date[] | ((date: Date) => boolean);
    footer?: React.ReactNode;
    captionLayout?: 'dropdown' | 'buttons';
    onDayClick?: (date: Date, modifiers: DayModifiers, e: React.MouseEvent) => void;
    onDayFocus?: (date: Date, modifiers: DayModifiers, e: React.FocusEvent) => void;
    onDayBlur?: (date: Date, modifiers: DayModifiers, e: React.FocusEvent) => void;
    onDayMouseEnter?: (date: Date, modifiers: DayModifiers, e: React.MouseEvent) => void;
    onDayMouseLeave?: (date: Date, modifiers: DayModifiers, e: React.MouseEvent) => void;
    onDayKeyDown?: (date: Date, modifiers: DayModifiers, e: React.KeyboardEvent) => void;
    onDayKeyUp?: (date: Date, modifiers: DayModifiers, e: React.KeyboardEvent) => void;
    onDayKeyPress?: (date: Date, modifiers: DayModifiers, e: React.KeyboardEvent) => void;
    onDayTouchStart?: (date: Date, modifiers: DayModifiers, e: React.TouchEvent) => void;
    onDayTouchEnd?: (date: Date, modifiers: DayModifiers, e: React.TouchEvent) => void;
    onDayTouchCancel?: (date: Date, modifiers: DayModifiers, e: React.TouchEvent) => void;
    formatters?: {
      formatDay?: (date: Date, options?: Record<string, unknown>) => string;
      formatWeekdayName?: (date: Date, options?: Record<string, unknown>) => string;
      formatMonthCaption?: (date: Date, options?: Record<string, unknown>) => string;
      formatYearCaption?: (date: Date, options?: Record<string, unknown>) => string;
    };
    labels?: {
      labelDay?: (date: Date, options?: Record<string, unknown>) => string;
      labelMonthDropdown?: (month: Date, options?: Record<string, unknown>) => string;
      labelYearDropdown?: (year: number, options?: Record<string, unknown>) => string;
      labelNext?: string;
      labelPrevious?: string;
    };
    components?: {
      Caption?: React.ComponentType<Record<string, unknown>>;
      CaptionLabel?: React.ComponentType<Record<string, unknown>>;
      Day?: React.ComponentType<Record<string, unknown>>;
      DayContent?: React.ComponentType<Record<string, unknown>>;
      Dropdown?: React.ComponentType<Record<string, unknown>>;
      Footer?: React.ComponentType<Record<string, unknown>>;
      Head?: React.ComponentType<Record<string, unknown>>;
      IconDropdown?: React.ComponentType<Record<string, unknown>>;
      IconNext?: React.ComponentType<Record<string, unknown>>;
      IconPrevious?: React.ComponentType<Record<string, unknown>>;
      Row?: React.ComponentType<Record<string, unknown>>;
      WeekNumber?: React.ComponentType<Record<string, unknown>>;
    };
    [key: string]: unknown;
  }
  
  // Define a basic Locale interface
  export interface Locale {
    code?: string;
    formatLong?: Record<string, unknown>;
    formatRelative?: unknown;
    localize?: Record<string, unknown>;
    match?: Record<string, unknown>;
    options?: Record<string, unknown>;
  }

  export const DayPicker: React.FC<DayPickerProps>;
  
  export interface DateRange {
    from: Date;
    to: Date;
  }
  
  export interface ModifiersClassNames {
    selected?: string;
    disabled?: string;
    hidden?: string;
    today?: string;
    outside?: string;
    [key: string]: string | undefined;
  }
  
  export interface ModifiersStyles {
    selected?: React.CSSProperties;
    disabled?: React.CSSProperties;
    hidden?: React.CSSProperties;
    today?: React.CSSProperties;
    outside?: React.CSSProperties;
    [key: string]: React.CSSProperties | undefined;
  }
}
