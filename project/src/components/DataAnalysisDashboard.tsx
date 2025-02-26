import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, BarChart2, Activity, Download } from 'lucide-react';
import { useRef } from "react";
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import React from "react";

// Types
interface GranularityColumn {
  column_name: string;
  granularity: string;
  reason: string;
}

interface GranularityResponse {
  columns: GranularityColumn[];
}

interface TableMetrics {
  total_rows: number;
  missing_values: number;
  duplicate_rows: number;
  completeness_percentage: number;
  uniqueness_percentage: number;
  columns: Record<string, ColumnMetrics>;
}

interface ColumnMetrics {
  missing_values: number;
  null_values_percentage: number;
  completeness_percentage: number;
  uniqueness_percentage: number;
}

interface DataQualityResponse {
  [tableName: string]: TableMetrics;
}

interface FrequencyItem {
  time_block: string;
  row_count: number;
}

interface CategoryData {
  frequency: FrequencyItem[];
}

interface ApiResponse {
  data: {
    [key: string]: [CategoryData];
  };
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface CorrelationMatrix {
  columns: string[];
  data: number[][];
}

type GranularityLevel = 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low';

interface GranularityData {
  name: string;
  value: number;
  level: string;
  reason: string;
  description: string;
}

// Enhanced color schemes for more vibrant visuals
const COLORS = {
  quality: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'],
  correlation: {
    high: '#ff3366',
    medium: '#ffcc33',
    low: '#33ccff',
    negative: '#9966ff'
  },
  frequency: [
    { stroke: '#8884d8', fill: '#8884d8' },
    { stroke: '#82ca9d', fill: '#82ca9d' },
    { stroke: '#ffc658', fill: '#ffc658' },
    { stroke: '#ff7300', fill: '#ff7300' },
    { stroke: '#0088FE', fill: '#0088FE' },
    { stroke: '#00C49F', fill: '#00C49F' },
    { stroke: '#FFBB28', fill: '#FFBB28' },
    { stroke: '#FF8042', fill: '#FF8042' }
  ],
  // New vibrant gradient palette for granularity bars
  granularity: [
    '#FF6B6B', // Very Low - Vibrant red
    '#FFD166', // Low - Golden yellow
    '#06D6A0', // Medium - Turquoise
    '#118AB2', // High - Blue
    '#073B4C'  // Very High - Deep blue
  ]
};

const DataAnalysisDashboard = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [dataQuality, setDataQuality] = useState<DataQualityResponse | null>(null);
 // const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null);
  const [hoveredCorrelation, setHoveredCorrelation] = useState<{value: number, col1: string, col2: string} | null>(null);
  const [frequencyData, setFrequencyData] = useState<ChartDataPoint[]>([]);
  const [granularityData, setGranularityData] = useState<GranularityData[]>([]);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true); 
  const [overallMetrics, setOverallMetrics] = useState<any>(null);
 // const [showCorrelationDropdown, setShowCorrelationDropdown] = useState(false);
  const [selectedTablesForCorrelation, setSelectedTablesForCorrelation] = useState<Record<string, boolean>>({});
  const [ , setSelectedColumns] = useState<Record<string, string[]>>({});
  const [tableColumns, setTableColumns] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState(false);
  //const dashboardRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Updated PDF download functionality
  // Updated PDF download functionality
// Make sure the ref has the correct type
const dashboardRef = useRef<HTMLDivElement>(null);

// Updated PDF download functionality with proper TypeScript typing
const handleDownload = async () => {
  if (!dashboardRef.current) return;
  
  try {
    setIsDownloading(true);

    // Hide all tooltips before capture
    const tooltips = document.querySelectorAll('.recharts-tooltip-wrapper');
    tooltips.forEach(tooltip => {
      if (tooltip instanceof HTMLElement) {
        tooltip.style.visibility = 'hidden';
      }
    });

    // Get the dashboard element with proper typing
    const dashboardElement = dashboardRef.current as HTMLDivElement;
    
    // Store original styles safely
    const originalHeight = dashboardElement.style.height;
    const originalOverflow = dashboardElement.style.overflow;
    const originalPosition = dashboardElement.style.position;
    
    // Temporarily modify the element for complete capture
    dashboardElement.style.height = 'auto';
    dashboardElement.style.overflow = 'visible';
    dashboardElement.style.position = 'relative';
    
    // Wait for any DOM updates to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Use html-to-image to capture the complete content
    const dataUrl = await htmlToImage.toPng(dashboardElement, {
      quality: 1.0,
      backgroundColor: '#1a1f2e',
      height: dashboardElement.scrollHeight,
      width: dashboardElement.scrollWidth,
      style: {
        transform: 'scale(1)',
      },
      filter: (node) => {
        // Filter out tooltip elements during capture
        return !node.classList?.contains('recharts-tooltip-wrapper');
      }
    });
    
    // Create PDF with appropriate dimensions
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Get image properties for sizing
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    // Calculate number of pages needed
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageCount = Math.ceil(pdfHeight / pageHeight);
    
    // Add image across multiple pages if needed
    let heightLeft = pdfHeight;
    let position = 0;
    
    // First page
    pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    position -= pageHeight;
    
    // Add subsequent pages if content is larger than one page
    while (heightLeft >= 0) {
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      position -= pageHeight;
    }
    
    // Save the PDF
    pdf.save(`dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    // Restore original styles
    dashboardElement.style.height = originalHeight;
    dashboardElement.style.overflow = originalOverflow;
    dashboardElement.style.position = originalPosition;
    
    // Show tooltips again
    tooltips.forEach(tooltip => {
      if (tooltip instanceof HTMLElement) {
        tooltip.style.visibility = 'visible';
      }
    });

  } catch (error) {
    console.error('Error downloading dashboard:', error);
    alert('Failed to download dashboard. Please try again.');
  } finally {
    setIsDownloading(false);
  }
};
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchFrequencyData();
      fetchGlobalCorrelation();
    }
  }, [selectedTable, timeRange]);

  const granularityToValue: Record<GranularityLevel, number> = {
    "Very High": 4,
    "High": 3,
    "Medium": 2,
    "Low": 1,
    "Very Low": 0
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // 🔹 Fetch available tables
      const tablesResponse = await fetch('http://127.0.0.1:8000/list-tables');
      const tablesData = await tablesResponse.json();
      const tablesList = tablesData.tables || [];
      setTables(tablesList);

      // 🔹 Determine the first table
      const activeTable = tablesList[0] || null;
      if (activeTable) {
        setSelectedTable(activeTable);
      } else {
        console.warn("No tables available.");
        return;
      }

      // 🔹 Fetch data quality
      const tableNamesParam = tablesList.join(",");
      const qualityResponse = await fetch(`http://127.0.0.1:8000/data-quality1/${tableNamesParam}`, { method: 'POST' });
      const qualityData = await qualityResponse.json();
      setDataQuality(qualityData);
      calculateOverallMetrics(qualityData);

    } catch (error) {
      console.error("Error in fetchInitialData:", error);
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch global correlation data
  const fetchGlobalCorrelation = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('http://127.0.0.1:8000/global_correlation1');
      if (!response.ok) {
        throw new Error(`Global correlation API error: ${response.statusText}`);
      }

      const data = await response.json();
      setCorrelationMatrix(data);
    } catch (error) {
      console.error("Error fetching global correlation data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGranularityData = async (tableName: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`http://127.0.0.1:8000/granularity/${tableName}`);
      if (!response.ok) {
        throw new Error(`Granularity API error: ${response.statusText}`);
      }

      const data: GranularityResponse = await response.json();
      
      const transformedGranularityData: GranularityData[] = data.columns.map(({ column_name, granularity, reason }: GranularityColumn) => ({
        name: column_name,
        value: granularityToValue[granularity as GranularityLevel] ?? 0,
        level: granularity,
        reason,
        description: reason || "No description available"
      }));

      setGranularityData(transformedGranularityData);
    } catch (error) {
      console.error("Error fetching granularity data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchGranularityData(selectedTable);
    }
  }, [selectedTable]);

  // New frequency data fetching and transformation
  const fetchFrequencyData = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/frequency/${timeRange}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const jsonData: ApiResponse = await response.json();
      const responseData = jsonData.data || jsonData;

      const dataCategories = Object.keys(responseData);
      setCategories(dataCategories);
      
      if (selectedCategories.length === 0) {
        setSelectedCategories(dataCategories);
      }
      
      const transformedData = transformApiData(responseData);
      setFrequencyData(transformedData);
    } catch (error) {
      console.error('Error fetching frequency data:', error);
    }
  };

  const transformApiData = (apiData: ApiResponse['data']): ChartDataPoint[] => {
    if (!apiData) return [];

    const allDates = new Set<string>();
    Object.values(apiData).forEach(category => {
      category[0].frequency.forEach(item => {
        allDates.add(item.time_block);
      });
    });

    return Array.from(allDates).sort().map(date => {
      const dataPoint: ChartDataPoint = { date };
      Object.entries(apiData).forEach(([key, value]) => {
        const frequencyItem = value[0].frequency.find(item => item.time_block === date);
        dataPoint[key] = frequencyItem ? frequencyItem.row_count : 0;
      });
      return dataPoint;
    });
  };

  const formatDate = (date: string): string => {
    const d = new Date(date);
    switch (timeRange) {
      case 'daily':
        return d.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      case 'weekly':
        return d.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      case 'monthly':
        return d.toLocaleDateString('en-US', { 
          month: 'short',
          year: 'numeric'
        });
      default:
        return date;
    }
  };

  const formatCategoryName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleSelectAll = () => {
    setSelectedCategories(prev => 
      prev.length === categories.length ? [] : [...categories]
    );
  };

  const calculateOverallMetrics = (qualityData: DataQualityResponse) => {
    const metrics = {
      totalRows: 0,
      missingValues: 0,
      duplicateRows: 0,
      avgCompleteness: 0,
      avgUniqueness: 0
    };

    const tableCount = Object.keys(qualityData).length;
    
    Object.values(qualityData).forEach(table => {
      metrics.totalRows += table.total_rows;
      metrics.missingValues += table.missing_values;
      metrics.duplicateRows += table.duplicate_rows;
      metrics.avgCompleteness += table.completeness_percentage;
      metrics.avgUniqueness += table.uniqueness_percentage;
    });

    metrics.avgCompleteness /= tableCount;
    metrics.avgUniqueness /= tableCount;

    setOverallMetrics(metrics);
  };

  const handleTableSelection = async (table: string) => {
    const isSelected = !selectedTablesForCorrelation[table];
    setSelectedTablesForCorrelation(prev => ({
      ...prev,
      [table]: isSelected
    }));

    if (isSelected && !tableColumns[table]) {
      try {
        const response = await fetch('http://127.0.0.1:8000/table-columns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table_names: [table] })
        });
        const data = await response.json();
        setTableColumns(prev => ({
          ...prev,
          [table]: data[table]
        }));
      } catch (error) {
        console.error('Error fetching columns:', error);
      }
    }
  };

  const handleColumnSelection = (table: string, column: string) => {
    setSelectedColumns(prev => {
      const tableColumns = prev[table] || [];
      const updatedColumns = tableColumns.includes(column)
        ? tableColumns.filter(col => col !== column)
        : [...tableColumns, column];
      
      return {
        ...prev,
        [table]: updatedColumns
      };
    });
  };

  // Get correlation cell color based on value
  const getCorrelationColor = (value: number) => {
    const absValue = Math.abs(value);
    
    if (value < 0) {
      return {
        backgroundColor: COLORS.correlation.negative,
        opacity: Math.max(0.2, absValue)
      };
    }
    
    if (absValue > 0.7) {
      return {
        backgroundColor: COLORS.correlation.high,
        opacity: Math.max(0.7, absValue)
      };
    } else if (absValue > 0.4) {
      return {
        backgroundColor: COLORS.correlation.medium,
        opacity: Math.max(0.5, absValue)
      };
    } else {
      return {
        backgroundColor: COLORS.correlation.low,
        opacity: Math.max(0.3, absValue)
      };
    }
  };

  // Get border thickness based on correlation strength
  const getCorrelationBorderThickness = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue > 0.7) return '3px';
    if (absValue > 0.4) return '2px';
    return '1px';
  };

  const CustomGranularityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
          <p className="font-medium text-lg mb-2 capitalize text-gray-800">{label}</p>
          <p className="text-blue-600 mb-2">Granularity: {item.level}</p>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="text-sm text-gray-700">{item.reason}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderOverallMetricsPieChart = () => {
    if (!overallMetrics) return null;

    const data = [
      { name: 'Complete', value: overallMetrics.avgCompleteness },
      { name: 'Incomplete', value: 100 - overallMetrics.avgCompleteness }
    ];

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.quality[index % COLORS.quality.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render correlation heatmap matrix
  const renderCorrelationMatrix = () => {
    if (!correlationMatrix) return <div className="text-center py-8">Loading correlation data...</div>;

    const { columns, data } = correlationMatrix;
    
    return (
      <div className="overflow-auto max-h-80 custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-blue-900 p-2"></th>
              {columns.map((col, idx) => (
                <th key={idx} className="sticky top-0 z-10 bg-blue-900 p-2 text-xs whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <th className="sticky left-0 z-10 bg-blue-900 p-2 text-xs whitespace-nowrap">
                  {columns[rowIdx]}
                </th>
                {row.map((value, colIdx) => {
                  const { backgroundColor, opacity } = getCorrelationColor(value);
                  const borderThickness = getCorrelationBorderThickness(value);
                  
                  return (
                    <td 
                      key={colIdx}
                      className="relative p-0 w-12 h-12 text-center transition-all duration-300 hover:scale-105"
                      style={{ 
                        backgroundColor, 
                        opacity,
                        border: borderThickness + ' solid rgba(255,255,255,0.1)',
                        transform: 'scale(1)',
                        transition: 'transform 0.2s ease, opacity 0.3s ease'
                      }}
                      onMouseEnter={() => setHoveredCorrelation({
                        value,
                        col1: columns[rowIdx],
                        col2: columns[colIdx]
                      })}
                      onMouseLeave={() => setHoveredCorrelation(null)}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                        {value.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Correlation Hover Detail Box
  const renderCorrelationHoverDetail = () => {
    if (!hoveredCorrelation) return null;
    
    const { value, col1, col2 } = hoveredCorrelation;
    const absValue = Math.abs(value);
    let strength = "No correlation";
    
    if (absValue > 0.7) strength = "Strong";
    else if (absValue > 0.4) strength = "Moderate";
    else if (absValue > 0.2) strength = "Weak";
    
    return (
      <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-lg mt-4 animate-fadeIn">
        <h4 className="text-lg font-semibold">
          {strength} {value < 0 ? "Negative" : "Positive"} Correlation
        </h4>
        <p className="text-sm">
          Between <span className="font-medium">{col1}</span> and <span className="font-medium">{col2}</span>
        </p>
        <p className="text-sm mt-2">
          Correlation value: <span className="font-medium">{value.toFixed(3)}</span>
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-xl font-semibold text-white flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading dashboard data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div ref={dashboardRef} className="max-w-7xl mx-auto space-y-6">
        {/* Overall Metrics Section with Animation */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white animate-fadeIn">
          <h2 className="text-2xl font-bold mb-4">Overall Data Quality Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-300">
              <h3 className="text-lg font-semibold">Total Rows</h3>
              <p className="text-2xl">{overallMetrics?.totalRows.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-300">
              <h3 className="text-lg font-semibold">Missing Values</h3>
              <p className="text-2xl">{overallMetrics?.missingValues.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-300">
              <h3 className="text-lg font-semibold">Avg Completeness</h3>
              <p className="text-2xl">{overallMetrics?.avgCompleteness.toFixed(1)}%</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 transform hover:scale-105 transition-transform duration-300">
              <h3 className="text-lg font-semibold">Avg Uniqueness</h3>
              <p className="text-2xl">{overallMetrics?.avgUniqueness.toFixed(1)}%</p>
            </div>
          </div>
          {renderOverallMetricsPieChart()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Correlation Matrix (Replaced Area Chart) */}
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6" />
                <h2 className="text-xl font-bold">Column Correlations</h2>
              </div>
            </div>
            {renderCorrelationMatrix()}
            {renderCorrelationHoverDetail()}
          </div>

          {/* Frequency Analysis with Animation */}
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-6 h-6" />
                <h2 className="text-xl font-bold">Frequency Analysis</h2>
              </div>
              <div className="flex gap-4">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="px-3 py-1 bg-white bg-opacity-20 rounded-md text-white border-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                
                <div className="relative">
                  <button
                    onClick={() => setIsFrequencyDropdownOpen(!isFrequencyDropdownOpen)}
                    className="px-3 py-1 bg-white bg-opacity-20 rounded-md text-white"
                  >
                    Select Tables
                  </button>
                  {isFrequencyDropdownOpen && (
                    <div className="absolute right-0 mt-2 py-2 w-56 bg-white rounded-md shadow-xl z-10">
                      <div className="px-4 py-2 border-b">
                        <label className="flex items-center space-x-2 cursor-pointer text-gray-800">
                          <input
                            type="checkbox"
                            checked={selectedCategories.length === categories.length}
                            onChange={toggleSelectAll}
                            className="form-checkbox"
                          />
                          <span>Select All</span>
                        </label>
                      </div>
                      {categories.map(category => (
                        <div key={category} className="px-4 py-2 hover:bg-gray-100">
                          <label className="flex items-center space-x-2 cursor-pointer text-gray-800">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(category)}
                              onChange={() => handleCategoryToggle(category)}
                              className="form-checkbox"
                            />
                            <span>{formatCategoryName(category)}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={frequencyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    stroke="white"
                  />
                  <YAxis stroke="white" />
                  <Tooltip 
                    labelFormatter={formatDate}
                    formatter={(value: number, name: string) => [value, formatCategoryName(name)]}
                    animationDuration={300}
                  />
                  {selectedCategories.map((category, index) => (
                    <Area 
                      key={category}
                      type="monotone" 
                      dataKey={category} 
                      stackId="1" 
                      stroke={COLORS.frequency[index % COLORS.frequency.length].stroke}
                      fill={COLORS.frequency[index % COLORS.frequency.length].fill}
                      fillOpacity={0.5}
                      name={formatCategoryName(category)}
                      animationDuration={1500}
                      animationEasing="ease-in-out"
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Enhanced Granularity Analysis */}
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white col-span-2 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <div className="mb-4">
                <form onSubmit={(e) => e.preventDefault()}>
                  <label className="block text-white text-lg font-semibold mb-2">Select a Table</label>
                  <select 
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="bg-white bg-opacity-20 rounded-md px-4 py-2 text-white w-64"
                  >
                    {tables.map(table => (
                      <option key={table} value={table}>{table}</option>
                    ))}
                  </select>
                </form>
                              </div>
                              <button 
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-300"
                              >
                                <Download size={16} />
                                <span>{isDownloading ? 'Exporting...' : 'Export to PDF'}</span>
                              </button>
                            </div>
                            <div className="h-96">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={granularityData}
                                  margin={{ top: 10, right: 30, left: 30, bottom: 60 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                  <XAxis 
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end" 
                                    height={70}
                                    stroke="white"
                                  />
                                  <YAxis
                                    stroke="white"
                                    domain={[0, 4]}
                                    ticks={[0, 1, 2, 3, 4]}
                                    tickFormatter={(value) => {
                                      const labels = ["Very Low", "Low", "Medium", "High", "Very High"];
                                      return labels[value];
                                    }}
                                  />
                                  <Tooltip content={<CustomGranularityTooltip />} />
                                  <Bar 
                                    dataKey="value" 
                                    animationDuration={1500}
                                    animationEasing="ease-in-out"
                                  >
                                    {granularityData.map((entry, index) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS.granularity[Math.floor(entry.value)]} 
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="mt-6 grid grid-cols-5 gap-2">
                              {Object.entries(granularityToValue).map(([level, value], index) => (
                                <div key={level} className="flex items-center space-x-2">
                                  <div 
                                    className="w-4 h-4 rounded-full" 
                                    style={{ backgroundColor: COLORS.granularity[value] }}
                                  ></div>
                                  <span className="text-sm">{level}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                
                        {/* Alert Messages for Data Quality Issues */}
                        {dataQuality && Object.values(dataQuality).some(table => 
                          table.completeness_percentage < 70 || table.uniqueness_percentage < 70
                        ) && (
                          <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-xl p-6 text-white animate-fadeIn">
                            <div className="flex items-center gap-3 mb-4">
                              <AlertCircle className="w-6 h-6 text-red-400" />
                              <h2 className="text-xl font-bold text-red-300">Data Quality Alerts</h2>
                            </div>
                            <ul className="space-y-2">
                              {Object.entries(dataQuality).map(([tableName, metrics]) => (
                                <React.Fragment key={tableName}>
                                  {metrics.completeness_percentage < 70 && (
                                    <li className="flex items-start">
                                      <span className="inline-block w-3 h-3 rounded-full bg-red-500 mt-1.5 mr-2"></span>
                                      <span>
                                        <strong>{tableName}</strong> has low completeness ({metrics.completeness_percentage.toFixed(1)}%). 
                                        Consider addressing missing values to improve data quality.
                                      </span>
                                    </li>
                                  )}
                                  {metrics.uniqueness_percentage < 70 && (
                                    <li className="flex items-start">
                                      <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mt-1.5 mr-2"></span>
                                      <span>
                                        <strong>{tableName}</strong> has duplicate data issues (uniqueness: {metrics.uniqueness_percentage.toFixed(1)}%). 
                                        Review duplicate records.
                                      </span>
                                    </li>
                                  )}
                                </React.Fragment>
                              ))}
                            </ul>
                          </div>
                          
                        )}
                      </div>


                      
                    </div>
                  );
                };
                
    export default DataAnalysisDashboard;