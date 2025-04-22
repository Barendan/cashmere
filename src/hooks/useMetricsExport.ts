
import { useState } from "react";
import { generateCsvData } from "@/components/metrics/metricsUtils";

interface UseMetricsExportProps {
  getExportData: () => any[];
  isProductData: boolean;
  filename?: string;
}

export const useMetricsExport = ({ 
  getExportData, 
  isProductData, 
  filename 
}: UseMetricsExportProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = () => {
    try {
      setIsExporting(true);
      const dataToExport = getExportData();
      
      if (!dataToExport || dataToExport.length === 0) {
        console.warn("No data available to export");
        return;
      }
      
      const defaultFilename = isProductData ? "product-performance" : "service-performance";
      const outputFilename = filename || defaultFilename;
      const csv = generateCsvData(dataToExport, isProductData);
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `spa-${outputFilename}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Successfully exported ${isProductData ? "product" : "service"} data to CSV`);
    } catch (error) {
      console.error("Error exporting data:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportData,
    isExporting
  };
};

export default useMetricsExport;
