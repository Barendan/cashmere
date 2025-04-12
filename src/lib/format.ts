
/**
 * Format a number as currency
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Format a date to a readable string
 */
export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
};

/**
 * Format a number as percentage
 */
export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * Format a number with specified decimals
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
  return value.toFixed(decimals);
};

/**
 * Format tooltip value for charts
 */
export const formatTooltipValue = (value: number | string, type: 'currency' | 'percent' | 'number' = 'number'): string => {
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  
  if (isNaN(value)) return 'N/A';
  
  switch (type) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'number':
    default:
      return formatNumber(value);
  }
};
