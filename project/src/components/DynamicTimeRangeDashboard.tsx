import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Bot, X, BarChart2, Calendar, Database, RefreshCw, Loader } from 'lucide-react';

interface FrequencyItem {
  time_block: string;
  row_count: number;
}

interface CategoryData {
  column: string;
  frequency: FrequencyItem[];
}

interface RoboticInfo {
  summary: string;
  timestamp?: number;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

type TimeRange = 'daily' | 'weekly' | 'monthly';

const colorPalette = [
  { stroke: '#4f46e5', fill: '#818cf8' },
  { stroke: '#0891b2', fill: '#67e8f9' },
  { stroke: '#059669', fill: '#6ee7b7' },
  { stroke: '#d97706', fill: '#fbbf24' },
  { stroke: '#dc2626', fill: '#f87171' },
  { stroke: '#7c3aed', fill: '#a78bfa' },
];

const DynamicTimeRangeDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [roboticInfo, setRoboticInfo] = useState<RoboticInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [roboticLoading, setRoboticLoading] = useState<boolean>(false);
  const roboticInfoCache = useRef<{[key: string]: RoboticInfo}>({});
  const [tableName, setTableName] = useState(window.selectedTableName || '');
  
  // Listen for table selection events
  useEffect(() => {
    const handleTableSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{ tableName: string }>;
      setTableName(customEvent.detail.tableName);
    };
  
    // Listen for both events
    window.addEventListener('tableSelected', handleTableSelected);
    window.addEventListener('dataQualitySelected', handleTableSelected);
    
    // Initial load from local storage if not already set
    if (!tableName) {
      const savedTable = localStorage.getItem('selectedDatabaseTable');
      if (savedTable) {
        try {
          const parsedTable = savedTable.startsWith('"') ? JSON.parse(savedTable) : savedTable;
          setTableName(parsedTable);
        } catch (e) {
          setTableName(savedTable);
        }
      }
    }
     
    return () => {
      window.removeEventListener('tableSelected', handleTableSelected);
      window.removeEventListener('dataQualitySelected', handleTableSelected);
    };
  }, []);

  console.log("Selected table:", tableName);

  // Fetch frequency data for the selected time range and table only
  useEffect(() => {
    const fetchData = async () => {
      if (!tableName) {
        return; // Don't fetch if no table is selected
      }
      
      setLoading(true);
      setError(null);
      try {
        // Modified to fetch data for a specific table only
        const response = await fetch(`http://127.0.0.1:8000/frequency/${timeRange}?table=${tableName}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        const responseData = jsonData.data || jsonData;
        
        // Check if we have data for the specific table
        if (responseData[tableName]) {
          // Transform the data for a single table
          setData(transformSingleTableData(responseData, tableName));
          
          // Auto-trigger the AI analysis when time range changes
          fetchRoboticAnalysis();
        } else {
          setError(`No data available for table: ${tableName}`);
        }
      } catch (err) {
        setError('Failed to fetch frequency data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [timeRange, tableName]);

  // Transform API data into chart data points for a single table
  const transformSingleTableData = (apiData: Record<string, CategoryData[]>, table: string): ChartDataPoint[] => {
    const allDates = new Set<string>();
    const tableData = apiData[table] || [];
    
    // Collect all unique dates from the table's frequency data
    tableData.forEach((item) => {
      item.frequency.forEach((entry: FrequencyItem) => {
        allDates.add(entry.time_block);
      });
    });
    
    // Create data points for each date, including columns from the table
    return Array.from(allDates)
      .sort()
      .map(date => {
        const dataPoint: ChartDataPoint = { date };
        
        // Add data for each column in the table
        tableData.forEach((columnData) => {
          const columnName = columnData.column;
          const frequencyItem = columnData.frequency.find((f: FrequencyItem) => f.time_block === date);
          dataPoint[columnName] = frequencyItem?.row_count ?? 0;
        });
        
        return dataPoint;
      });
  };

  // Function to format date based on selected time range
  const formatXAxisTick = (value: string) => {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        // If date parsing failed, return the original value
        return value;
      }
      
      switch (timeRange) {
        
        case 'weekly':
          // Just day and month without week number or year
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case 'daily':
            // Just show time without seconds for daily (HH:MM format)
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        case 'monthly':
          // Show day, month, and year for monthly
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        default:
          return value;
      }
    } catch (e) {
      console.error("Error formatting date:", e);
      // In case of any error, return the original value
      return value;
    }
  };

  // Fetch robotic analysis with caching
  const fetchRoboticAnalysis = async () => {
    if (!tableName) return;
    
    // Create a cache key based on selected table and time range
    const cacheKey = `${timeRange}_${tableName}`;
    const currentTime = Date.now();
    
    // Check if we have a valid cached response (less than 1 minute old)
    if (
      roboticInfoCache.current[cacheKey] && 
      roboticInfoCache.current[cacheKey].timestamp && 
      currentTime - roboticInfoCache.current[cacheKey].timestamp! < 60000
    ) {
      // Use cached data
      setRoboticInfo(roboticInfoCache.current[cacheKey]);
      return;
    }
    
    // Show loading state
    setRoboticLoading(true);
    
    // Fetch new data
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/llm_frequency/${timeRange}?tables=${tableName}`
      );
      if (response.ok) {
        const data = await response.json();
        // Add timestamp to the data
        const roboticData = {
          ...data,
          timestamp: currentTime
        };
        
        // Update cache
        roboticInfoCache.current[cacheKey] = roboticData;
        setRoboticInfo(roboticData);
      }
    } catch (err) {
      console.error('Error fetching robotic analysis:', err);
    } finally {
      setRoboticLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="w-full max-w-6xl p-6 bg-blue-100/70 rounded-lg shadow-2xl flex items-center justify-center h-64">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, 0, -5, 0]
            }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xl font-medium text-blue-700 flex items-center"
          >
            <RefreshCw className="mr-2 animate-spin text-blue-600" />
            Loading your dashboard...
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="w-full max-w-6xl p-6 bg-blue-100/70 rounded-lg shadow-2xl flex items-center justify-center h-64 border border-red-500">
          <div className="text-xl text-red-500 flex items-center">
            <X className="mr-2 text-red-500" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  // Get the columns (fields) from the data for the chart
  const tableColumns = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'date') : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 p-0 relative w-full h-full">
      {/* Main grid layout - 12 columns with 9:3 split */}
      <div className="grid grid-cols-12 gap-4 p-4 w-full h-full">
        {/* Main content area - 9 columns */}
        <div className="col-span-9 bg-blue-100/70 rounded-lg shadow-2xl border border-blue-200 relative z-10 backdrop-blur-sm">
          {/* Header with glowing accent */}
          <motion.div 
            initial={{ y: -10, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center mb-6 relative p-8"
          >
            <h2 className="text-2xl font-bold text-blue-800 flex items-center mr-4">
              <BarChart2 className="mr-2 text-blue-600" /> 
              {tableName ? `${tableName} Frequency Analysis` : 'Frequency Analysis'}
            </h2>
            
            {/* Time Range Selector with enhanced styling */}
            <div className="relative mr-4 mt-2">
              <Calendar className="absolute left-3 top-2.5 text-blue-600 h-4 w-4" />
              <motion.select
                whileHover={{ scale: 1.03 }}
                className="pl-10 pr-4 py-2 rounded-lg bg-transparent text-blue-900 border border-blue-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              >
                <option value="daily" className="bg-blue-200 hover:bg-blue-300">
                  Daily
                </option>
                <option value="weekly" className="bg-blue-200 hover:bg-blue-300">
                  Weekly
                </option>
                <option value="monthly" className="bg-blue-200 hover:bg-blue-300">
                  Monthly
                </option>
              </motion.select>
            </div>
            
            {/* Display current table name */}
            <div className="relative mt-2">
              <Database className="absolute left-3 top-2.5 text-blue-600 h-4 w-4" />
              <motion.div
                className="pl-10 pr-4 py-2 rounded-lg bg-blue-200 text-blue-900 border border-blue-300"
              >
                Table: {tableName || 'None Selected'}
              </motion.div>
            </div>
          </motion.div>

          {/* Frequency Chart with glass-like styling */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mx-4 p-4 mb-4 rounded-xl bg-white/70 border border-blue-200 backdrop-blur-sm"
          >
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                  <defs>
                    {tableColumns.map((column, index) => (
                      <linearGradient key={index} id={`colorGrad${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colorPalette[index % colorPalette.length].stroke} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={colorPalette[index % colorPalette.length].fill} stopOpacity={0.2}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#1e40af" 
                    tick={{ fill: '#1e40af' }}
                    tickFormatter={formatXAxisTick}
                    height={50} 
                    minTickGap={15} 
                    tickMargin={10} 
                    angle={-30} 
                    textAnchor="end" 
                  />
                  <YAxis stroke="#1e40af" tick={{ fill: '#1e40af' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(219, 234, 254, 0.95)', 
                      color: '#1e40af',
                      borderRadius: '8px',
                      border: '1px solid rgba(37, 99, 235, 0.5)',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }} 
                    labelStyle={{ fontWeight: 'bold', color: '#1e40af' }}
                    itemStyle={{ color: '#1e40af' }}
                    labelFormatter={(label) => formatXAxisTick(label)}
                  />
                  {tableColumns.map((column, index) => (
                    <Area
                      key={column}
                      type="monotone"
                      dataKey={column}
                      stroke={colorPalette[index % colorPalette.length].stroke}
                      fill={`url(#colorGrad${index})`}
                      fillOpacity={0.6}
                      name={column}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-blue-800 text-lg">
                  {tableName ? `No data available for ${tableName}` : 'Select a table to view frequency data'}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* AI Analysis Sidebar - 3 columns */}
        <div className="col-span-3 sticky top-4 self-start">
          {/* AI Analysis Panel */}
          <div className="bg-blue-200 rounded-lg shadow-xl border border-blue-300 overflow-hidden h-full">
            {/* AI Header */}
            <div className="bg-blue-500/60 backdrop-blur-sm p-4 border-b border-blue-300 flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="mr-3 h-6 w-6 text-white" />
                <h3 className="text-xl font-bold text-white">AI Analysis</h3>
              </div>
              
              {roboticLoading && (
                <div className="flex items-center text-white">
                  <Loader className="animate-spin" size={18} />
                </div>
              )}
            </div>

            {/* AI Content - White Background */}
            <div className="bg-white p-6 rounded-md m-4 shadow-inner min-h-96">
              {roboticInfo ? (
                <div className="text-blue-900 leading-relaxed relative max-h-full overflow-y-auto custom-scrollbar">
                  <p>{roboticInfo.summary}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-blue-700">
                  {roboticLoading ? (
                    <>
                      <Loader className="mb-3 animate-spin" size={24} />
                      <p>Analyzing your data...</p>
                    </>
                  ) : (
                    <>
                      <p>Select a table and time range to see AI analysis</p>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Bottom light bar */}
            <div className="h-1 bg-blue-500" />
          </div>
        </div>
      </div>

      {/* Add custom CSS for scrollbars */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #dbeafe;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default DynamicTimeRangeDashboard;