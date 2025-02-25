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
import { Bot, X } from 'lucide-react';

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-full max-w-6xl p-6 bg-white rounded-lg shadow-lg flex items-center justify-center h-96">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-lg font-medium text-gray-600"
          >
            Loading data...
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-full max-w-6xl p-6 bg-white rounded-lg shadow-lg flex items-center justify-center h-96">
          <div className="text-lg text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  // Animation variants for the popup
  const popupVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -20, x: 30 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      x: 0,
      transition: { 
        type: "spring", 
        damping: 12, 
        stiffness: 200 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      y: -20, 
      x: 30,
      transition: { 
        duration: 0.2 
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 relative">
      {/* Fixed AI Analysis Button at Top Right with enhanced animation */}
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "#4338ca" }}
        whileTap={{ scale: 0.95 }}
        onClick={handleRoboticButtonClick}
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center text-white shadow-lg"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 12 }}
      >
        <Bot className="mr-2" /> AI Analysis
      </motion.button>

      <div className="w-full max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6 relative z-10">
        <motion.div 
          initial={{ y: -10, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex space-x-4 items-center mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-800">📊 Frequency Analysis</h2>
          
          {/* Time Range Selector with enhanced hover effect */}
          <motion.select
            whileHover={{ scale: 1.05, backgroundColor: "#f3f4f6" }}
            className="px-4 py-2 rounded bg-gray-50 text-gray-800 border border-gray-300 cursor-pointer"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </motion.select>
          
          {/* Multi‑Select Tables Dropdown with enhanced animations */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "#f3f4f6" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-4 py-2 rounded bg-gray-50 text-gray-800 border border-gray-300"
            >
              Select Tables
            </motion.button>
            
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 py-2 w-56 bg-white rounded-md shadow-xl z-10 border border-gray-200"
                >
                  <div className="px-4 py-2 border-b border-gray-200">
                    <label className="flex items-center space-x-2 cursor-pointer text-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedTables.length === categories.length}
                        onChange={toggleSelectAll}
                        className="form-checkbox text-indigo-600"
                      />
                      <span>Select All</span>
                    </label>
                  </div>
                  {categories.map((cat, index) => (
                    <motion.div 
                      key={cat} 
                      className="px-4 py-2 hover:bg-gray-100"
                      whileHover={{ backgroundColor: 'rgba(243, 244, 246, 1)' }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer text-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedTables.includes(cat)}
                          onChange={() => handleTableToggle(cat)}
                          className="form-checkbox text-indigo-600"
                        />
                        <span>{cat}</span>
                      </label>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Frequency Chart with Increased Height and Additional Margin */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="h-96 mt-12"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              className="transform transition-transform duration-500 hover:scale-102"
            >
              <defs>
                {colorPalette.map((color, index) => (
                  <linearGradient key={index} id={`colorGrad${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color.stroke} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={color.fill} stopOpacity={0.2}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(209, 213, 219, 0.5)" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  color: '#111827',
                  borderRadius: '8px',
                  border: '1px solid rgba(209, 213, 219, 1)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
                labelStyle={{ fontWeight: 'bold' }}
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

      {/* Enhanced AI Analysis Popup with beautiful animations and thick blue background */}
      <AnimatePresence>
        {isPopupVisible && roboticInfo && (
          <motion.div
            className="fixed top-16 right-6 p-1 rounded-xl shadow-2xl w-80 z-50 overflow-hidden"
            variants={popupVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Animated background gradient */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-xl"
              animate={{ 
                background: [
                  "linear-gradient(to bottom right, #2563eb, #4f46e5)",
                  "linear-gradient(to bottom right, #1d4ed8, #4338ca)",
                  "linear-gradient(to bottom right, #2563eb, #4f46e5)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Content container */}
            <div className="relative bg-white m-1 rounded-lg shadow-inner overflow-hidden">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2 px-4 pt-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                <motion.h3 
                  className="text-lg font-bold flex items-center text-indigo-700"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                  >
                    <Bot className="mr-2 text-indigo-600" />
                  </motion.div>
                  AI Insights
                </motion.h3>
                <motion.div 
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X 
                    className="cursor-pointer text-gray-500 hover:text-gray-700" 
                    onClick={handleClosePopup} 
                  />
                </motion.div>
              </div>
              <motion.div 
                className="px-4 py-3 bg-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm text-gray-700">{roboticInfo.summary}</p>
              </motion.div>
              
              {/* Animated sparkles/accent elements */}
              <motion.div 
                className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400"
                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div 
                className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-indigo-500"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicTimeRangeDashboard;