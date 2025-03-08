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
  const [showLlmUnderGraph, setShowLlmUnderGraph] = useState<boolean>(false);
  
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
        case 'daily':
          // Just show time without seconds for daily (HH:MM format)
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        case 'weekly':
          // Just day and month without week number or year
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      // Display data under the graph
      setShowLlmUnderGraph(true);
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
        // Display data under the graph
        setShowLlmUnderGraph(true);
      }
    } catch (err) {
      console.error('Error fetching robotic analysis:', err);
    } finally {
      setRoboticLoading(false);
    }
  };

  // Toggle LLM box under graph when clicking on the AI analysis section
  const handleToggleLlmUnderGraph = () => {
    setShowLlmUnderGraph(!showLlmUnderGraph);
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

  // Animation variants for the LLM box under graph
  const llmBoxVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        damping: 15, 
        stiffness: 300,
        duration: 0.6
      }
    },
    exit: { 
      opacity: 0, 
      y: 20,
      transition: { 
        duration: 0.3 
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 p-0 relative w-full h-full">
      {/* Decorative floating elements */}
      <motion.div 
        className="absolute top-20 left-20 w-32 h-32 bg-blue-500 rounded-full opacity-5"
        animate={{ 
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
      />
      <motion.div 
        className="absolute bottom-20 right-40 w-24 h-24 bg-blue-600 rounded-full opacity-5"
        animate={{ 
          y: [0, 15, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 7, repeat: Infinity, repeatType: "reverse", delay: 2 }}
      />

      <div className="w-full h-full bg-blue-100/70 rounded-none shadow-2xl border border-blue-200 relative z-10 backdrop-blur-sm">
        {/* Header with glowing accent */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center mb-6 relative p-8"
        >
          <motion.div 
            className="absolute -left-4 -top-4 w-16 h-16 bg-blue-600 rounded-full opacity-30 blur-xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          
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
          
          {/* AI Analysis indicator */}
          {roboticLoading && (
            <div className="ml-4 flex items-center text-blue-700 mt-2">
              <Loader className="mr-2 animate-spin" /> Analyzing...
            </div>
          )}
        </motion.div>

        {/* Frequency Chart with glass-like styling - REDUCED HEIGHT */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mx-4 p-4 rounded-xl bg-white/70 border border-blue-200 backdrop-blur-sm"
        >
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
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
            <div className="h-78flex items-center justify-center">
              <p className="text-blue-800 text-lg">
                {tableName ? `No data available for ${tableName}` : 'Select a table to view frequency data'}
              </p>
            </div>
          )}
        </motion.div>
        
        {/* Clickable AI Analysis Header */}
        {roboticInfo && (
          <motion.div 
            className="mx-4 mt-4 cursor-pointer"
            onClick={handleToggleLlmUnderGraph}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between px-6 py-3 bg-blue-500/20 border border-blue-200 rounded-t-xl backdrop-blur-sm">
              <div className="flex items-center">
                <motion.div
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    color: ["#3b82f6", "#60a5fa", "#3b82f6"]
                  }}
                  transition={{ repeat: Infinity, duration: 3, repeatType: "reverse" }}
                  className="mr-3"
                >
                  <Bot className="h-6 w-6 text-blue-600" />
                </motion.div>
                <h3 className="text-xl font-bold text-blue-800">AI Analysis</h3>
              </div>
              <motion.div>
                {showLlmUnderGraph ? (
                  <X className="text-blue-700" />
                ) : (
                  <motion.div 
                    animate={{ y: [0, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-blue-700 font-bold"
                  >
                    ▼
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
        
        {/* LLM Analysis Box under the graph */}
        <AnimatePresence>
          {showLlmUnderGraph && roboticInfo && (
            <motion.div
              className="mx-4 rounded-b-xl shadow-lg overflow-hidden relative"
              variants={llmBoxVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Animated light color background */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-blue-300/20 to-blue-400/10 rounded-b-xl"
                animate={{ 
                  backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              
              <div className="relative p-6 backdrop-blur-sm bg-white/40 border border-blue-200 border-t-0 rounded-b-xl">
                {/* Content */}
                <div className="relative">
                  {/* Animated light particles */}
                  <motion.div 
                    className="absolute top-3 right-10 w-2 h-2 rounded-full bg-blue-400"
                    animate={{ 
                      scale: [1, 1.5, 1], 
                      opacity: [0.5, 0.9, 0.5],
                      x: [0, 10, 0],
                      y: [0, -5, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <motion.div 
                    className="absolute bottom-5 left-20 w-2 h-2 rounded-full bg-blue-500"
                    animate={{ 
                      scale: [1, 1.8, 1], 
                      opacity: [0.5, 0.8, 0.5],
                      x: [0, -10, 0],
                      y: [0, 5, 0]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  />
                  <motion.div 
                    className="absolute top-10 left-40 w-1.5 h-1.5 rounded-full bg-blue-300"
                    animate={{ 
                      scale: [1, 1.3, 1], 
                      opacity: [0.6, 1, 0.6],
                      x: [0, 15, 0],
                      y: [0, 10, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  />
                  
                  <p className="text-blue-900 leading-relaxed relative z-10 max-h-32 overflow-y-auto custom-scrollbar">{roboticInfo.summary}</p>
                </div>
                
                {/* Bottom animated light bar */}
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-100 via-blue-500 to-blue-100"
                  animate={{ 
                    opacity: [0.3, 0.7, 0.3],
                    backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"]
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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