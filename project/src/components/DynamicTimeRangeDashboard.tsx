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
import { Bot, X, BarChart2, Calendar, Database, RefreshCw } from 'lucide-react';

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
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [roboticInfo, setRoboticInfo] = useState<RoboticInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);
  const roboticInfoCache = useRef<{[key: string]: RoboticInfo}>({});

  // Fetch frequency data for the selected time range.
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://127.0.0.1:8000/frequency/${timeRange}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        const responseData = jsonData.data || jsonData;
        const categoryKeys = Object.keys(responseData);
        setCategories(categoryKeys);
        // If nothing is selected yet, default select all
        if (selectedTables.length === 0) {
          setSelectedTables(categoryKeys);
        }
        setData(transformApiData(responseData));
      } catch (err) {
        setError('Failed to fetch frequency data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  // Transform API data into an array of chart data points.
  const transformApiData = (apiData: Record<string, CategoryData[]>): ChartDataPoint[] => {
    const allDates = new Set<string>();
    Object.entries(apiData).forEach(([category, categoryData]: [string, CategoryData[]]) => {
      categoryData.forEach((item) => {
        item.frequency.forEach((entry: FrequencyItem) => {
          allDates.add(entry.time_block);
        });
      });
    });
    return Array.from(allDates)
      .sort()
      .map(date => {
        const dataPoint: ChartDataPoint = { date };
        Object.entries(apiData).forEach(([category, categoryData]: [string, CategoryData[]]) => {
          // Look for frequency data where the column is 'timestamp' (adjust as needed).
          const timestampData = categoryData.find(item => item.column === 'timestamp');
          const frequencyItem = timestampData?.frequency.find((f: FrequencyItem) => f.time_block === date);
          dataPoint[category] = frequencyItem?.row_count ?? 0;
        });
        return dataPoint;
      });
  };

  // Toggle a table in the multi-select dropdown.
  const handleTableToggle = (table: string) => {
    setSelectedTables((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  };

  // Toggle Select All option.
  const toggleSelectAll = () => {
    setSelectedTables((prev) =>
      prev.length === categories.length ? [] : [...categories]
    );
  };

  // Handle the round AI Analysis button click with caching
  const handleRoboticButtonClick = async () => {
    if (selectedTables.length === 0) return;
    
    // Create a cache key based on selected tables and time range
    const cacheKey = `${timeRange}_${selectedTables.sort().join(',')}`;
    const currentTime = Date.now();
    
    // Check if we have a valid cached response (less than 1 minute old)
    if (
      roboticInfoCache.current[cacheKey] && 
      roboticInfoCache.current[cacheKey].timestamp && 
      currentTime - roboticInfoCache.current[cacheKey].timestamp! < 60000
    ) {
      // Use cached data
      setRoboticInfo(roboticInfoCache.current[cacheKey]);
      setIsPopupVisible(true);
      return;
    }
    
    // Fetch new data
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/llm_frequency/${timeRange}?tables=${encodeURIComponent(selectedTables.join(','))}`
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
        setIsPopupVisible(true);
      }
    } catch (err) {
      console.error('Error fetching robotic analysis:', err);
    }
  };

  // Close popup
  const handleClosePopup = () => {
    setIsPopupVisible(false);
    // Wait for exit animation to complete before setting roboticInfo to null
    setTimeout(() => {
      setRoboticInfo(null);
    }, 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-6xl p-6 bg-gray-800 rounded-lg shadow-2xl flex items-center justify-center h-96">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, 0, -5, 0]
            }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xl font-medium text-blue-300 flex items-center"
          >
            <RefreshCw className="mr-2 animate-spin text-blue-400" />
            Loading your dashboard...
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-6xl p-6 bg-gray-800 rounded-lg shadow-2xl flex items-center justify-center h-96 border border-red-500">
          <div className="text-xl text-red-400 flex items-center">
            <X className="mr-2 text-red-500" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  // Animation variants for the popup
  const popupVariants = {
    hidden: { opacity: 0, scale: 0.8, x: 30, rotate: -3 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      x: 0,
      rotate: 0,
      transition: { 
        type: "spring", 
        damping: 15, 
        stiffness: 300,
        duration: 0.6
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      x: 30,
      rotate: 3,
      transition: { 
        duration: 0.3 
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 relative">
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
        className="absolute bottom-20 right-40 w-24 h-24 bg-indigo-600 rounded-full opacity-5"
        animate={{ 
          y: [0, 15, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 7, repeat: Infinity, repeatType: "reverse", delay: 2 }}
      />

      {/* Fixed AI Analysis Button at Top Right with enhanced animation */}
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "#1e40af" }}
        whileTap={{ scale: 0.95 }}
        onClick={handleRoboticButtonClick}
        className="fixed top-4 right-4 z-50 px-5 py-3 rounded-full bg-blue-700 text-white shadow-lg shadow-blue-900/40 flex items-center font-semibold border border-blue-600"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 12 }}
      >
        <Bot className="mr-2 text-blue-300" /> AI Analysis
      </motion.button>

      <div className="w-full max-w-6xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 relative z-10 backdrop-blur-sm">
        {/* Header with glowing accent */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap space-x-4 items-center mb-8 relative"
        >
          <motion.div 
            className="absolute -left-4 -top-4 w-16 h-16 bg-blue-600 rounded-full opacity-30 blur-xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          
          <h2 className="text-3xl font-bold text-white flex items-center">
            <BarChart2 className="mr-3 text-blue-400" /> 
            Frequency Analysis
          </h2>
          
          {/* Time Range Selector with enhanced styling */}
          <div className="relative ml-4">
            <Calendar className="absolute left-3 top-2.5 text-blue-400 h-4 w-4" />
            <motion.select
              whileHover={{ scale: 1.03, backgroundColor: "#1e3a8a" }}
              className="pl-10 pr-4 py-2 rounded-lg bg-gray-700 text-blue-100 border border-blue-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </motion.select>
          </div>
          
          {/* Multi‑Select Tables Dropdown with enhanced styling */}
          <div className="relative ml-4">
            <Database className="absolute left-3 top-2.5 text-blue-400 h-4 w-4" />
            <motion.button
              whileHover={{ scale: 1.03, backgroundColor: "#1e3a8a" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="pl-10 pr-4 py-2 rounded-lg bg-gray-700 text-blue-100 border border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Select Tables ({selectedTables.length})
            </motion.button>
            
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="absolute right-0 mt-2 py-3 w-64 bg-gray-800 rounded-lg shadow-2xl z-10 border border-gray-700"
                >
                  <div className="px-4 py-2 border-b border-gray-700">
                    <label className="flex items-center space-x-2 cursor-pointer text-blue-100">
                      <input
                        type="checkbox"
                        checked={selectedTables.length === categories.length}
                        onChange={toggleSelectAll}
                        className="form-checkbox text-blue-600 rounded bg-gray-600 border-gray-500"
                      />
                      <span className="text-sm font-medium">Select All Tables</span>
                    </label>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {categories.map((cat, index) => (
                      <motion.div 
                        key={cat} 
                        className="px-4 py-2 hover:bg-gray-700"
                        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 1)' }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <label className="flex items-center space-x-2 cursor-pointer text-blue-100">
                          <input
                            type="checkbox"
                            checked={selectedTables.includes(cat)}
                            onChange={() => handleTableToggle(cat)}
                            className="form-checkbox text-blue-600 rounded bg-gray-600 border-gray-500"
                          />
                          <span className="text-sm">{cat}</span>
                        </label>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Frequency Chart with glass-like styling */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="h-96 mt-12 p-4 rounded-xl bg-gray-900/50 border border-gray-700 backdrop-blur-sm"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                {colorPalette.map((color, index) => (
                  <linearGradient key={index} id={`colorGrad${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color.stroke} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={color.fill} stopOpacity={0.2}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.3)" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(31, 41, 55, 0.95)', 
                  color: '#e5e7eb',
                  borderRadius: '8px',
                  border: '1px solid rgba(75, 85, 99, 1)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                }} 
                labelStyle={{ fontWeight: 'bold', color: '#f3f4f6' }}
                itemStyle={{ color: '#f3f4f6' }}
              />
              {selectedTables.map((category, index) => (
                <Area
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stackId="1"
                  stroke={colorPalette[index % colorPalette.length].stroke}
                  fill={`url(#colorGrad${index % colorPalette.length})`}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Enhanced AI Analysis Popup with striking dark blue and black styling */}
      <AnimatePresence>
        {isPopupVisible && roboticInfo && (
          <motion.div
            className="fixed top-16 right-6 rounded-xl shadow-2xl w-96 z-50 overflow-hidden"
            variants={popupVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Dark blue thick background with glow effect */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 rounded-xl"
              animate={{ 
                boxShadow: [
                  "0 0 20px 2px rgba(30, 58, 138, 0.3)", 
                  "0 0 30px 5px rgba(30, 64, 175, 0.4)", 
                  "0 0 20px 2px rgba(30, 58, 138, 0.3)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Main content container with glass effect */}
            <div className="relative m-0.5 rounded-lg overflow-hidden border border-blue-900/50 bg-gradient-to-br from-gray-900 to-gray-900/95">
              {/* Header with animated accent */}
              <div className="relative pt-4 pb-3 px-5 border-b border-blue-900/50 overflow-hidden">
                <motion.div 
                  className="absolute -right-6 -top-6 w-12 h-12 rounded-full bg-blue-500 blur-xl opacity-20"
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                <motion.h3 
                  className="text-lg font-bold flex items-center text-blue-300"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      color: ["#93c5fd", "#3b82f6", "#93c5fd"]
                    }}
                    transition={{ repeat: Infinity, duration: 3, repeatType: "reverse" }}
                    className="mr-3"
                  >
                    <Bot className="text-current" />
                  </motion.div>
                  AI Insights
                  
                  <motion.div 
                    whileHover={{ rotate: 90, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="ml-auto"
                  >
                    <X 
                      className="cursor-pointer text-blue-400 hover:text-blue-300" 
                      onClick={handleClosePopup} 
                    />
                  </motion.div>
                </motion.h3>
              </div>
              
              {/* Summary content with animated reveal */}
              <motion.div 
                className="px-5 py-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm text-blue-100 leading-relaxed">{roboticInfo.summary}</p>
              </motion.div>
              
              {/* Decorative elements */}
              <motion.div 
                className="absolute top-3 right-14 w-1.5 h-1.5 rounded-full bg-blue-400"
                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div 
                className="absolute bottom-3 left-4 w-1 h-1 rounded-full bg-blue-500"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              
              {/* Bottom accent border */}
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-700 to-transparent"
                animate={{ 
                  opacity: [0.3, 0.7, 0.3],
                  backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add custom CSS for scrollbars */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
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