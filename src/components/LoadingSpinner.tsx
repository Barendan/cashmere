
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[400px]">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-spa-sage border-t-transparent"></div>
    </div>
  );
};

export default LoadingSpinner;
