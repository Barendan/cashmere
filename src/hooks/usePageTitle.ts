
import { useEffect } from 'react';
import { APP_CONFIG } from '@/config/app';

export const usePageTitle = (pageTitle?: string) => {
  useEffect(() => {
    const title = pageTitle 
      ? `${pageTitle} | ${APP_CONFIG.companyName}` 
      : APP_CONFIG.companyName;
    
    document.title = title;
    
    return () => {
      document.title = APP_CONFIG.companyName;
    };
  }, [pageTitle]);
};

export default usePageTitle;
