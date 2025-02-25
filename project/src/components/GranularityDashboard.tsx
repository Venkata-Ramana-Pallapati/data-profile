import React, { useState, useEffect } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, ChevronDown, BarChart2, Database } from "lucide-react";

interface Column {
  column_name: string;
  granularity: string;
  reason: string;
}

interface GranularityData {
  columns: Column[];
  table_granularity: string;
  overall_reason: string;
}

const getColorIntensity = (granularity: string) => {
  const intensityMap: Record<"Very High" | "High" | "Medium" | "Low" | "Very Low", number> = {
    "Very High": 1,
    "High": 0.8,
    "Medium": 0.6,
    "Low": 0.4,
    "Very Low": 0.2
  };
  return intensityMap[granularity as keyof typeof intensityMap] || 0.5;
};

const GranularityLegend = () => {
  const legendItems = [
    { label: "Very High", intensity: 1 },
    { label: "High", intensity: 0.8 },
    { label: "Medium", intensity: 0.6 },
    { label: "Low", intensity: 0.4 },
    { label: "Very Low", intensity: 0.2 }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex flex-wrap justify-center gap-6 mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-inner"
    >
      {legendItems.map(({ label, intensity }, index) => (
        <motion.div 
          key={label} 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
          className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <div 
            className="w-8 h-8 rounded-md"
            style={{ 
              backgroundColor: `rgba(59, 130, 246, ${intensity})`,
              boxShadow: `0 0 10px rgba(59, 130, 246, ${intensity * 0.5})`
            }}
          />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
};

const getImpactLevel = (granularity: string) => {
  const impactMap: Record<string, string> = {
    "Very High": "Critical - Immediate attention required",
    "High": "Significant - Regular monitoring needed",
    "Medium": "Moderate - Periodic review recommended",
    "Low": "Minor - Standard oversight sufficient",
    "Very Low": "Minimal - Basic monitoring adequate"
  };
  return impactMap[granularity] || "Unknown";
};

const getRecommendation = (granularity: string) => {
  const recommendationMap: Record<string, string> = {
    "Very High": "Implement strict monitoring protocols and schedule regular reviews. Consider implementing automated alerts for any significant changes.",
    "High": "Conduct regular reviews and maintain detailed documentation. Set up periodic check-ins to assess performance.",
    "Medium": "Perform periodic checks and maintain standard documentation. Review quarterly for any necessary adjustments.",
    "Low": "Follow standard review procedures and document any significant changes. Annual review should be sufficient.",
    "Very Low": "Basic monitoring with minimal intervention required. Document major changes only."
  };
  return recommendationMap[granularity] || "Standard review process recommended";
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any }) => {
  if (active && payload && payload.length) {
    const { column_name, granularity, reason } = payload[0].payload;
    
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-lg shadow-xl p-6 text-white max-w-md"
        style={{ minWidth: '20rem' }}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4"
        >
          <div className="border-b border-white/20 pb-3">
            <h3 className="text-xl font-bold break-words">{column_name}</h3>
            <motion.div 
              className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-sm mt-2 font-semibold"
              animate={{ 
                boxShadow: ['0 0 0px rgba(255,255,255,0.5)', '0 0 10px rgba(255,255,255,0.8)', '0 0 0px rgba(255,255,255,0.5)'],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              {granularity}
            </motion.div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-2">
                Detailed Analysis
              </h4>
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                {reason}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-2">
                Impact Assessment
              </h4>
              <p className="text-sm leading-relaxed">
                {getImpactLevel(granularity)}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-2">
                Recommendations
              </h4>
              <p className="text-sm leading-relaxed">
                {getRecommendation(granularity)}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }
  return null;
};

const GranularityDashboard: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tables, setTables] = useState<string[]>([]);
  const [data, setData] = useState<Column[]>([]);
  const [showRobotBox, setShowRobotBox] = useState(false);
  const [overallReason, setOverallReason] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableReasons, setTableReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchGranularityData();
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://127.0.0.1:8000/list-tables');
      const responseData = await response.json();
      
      if (responseData.tables && Array.isArray(responseData.tables)) {
        setTables(responseData.tables);
        if (responseData.tables.length > 0) {
          setSelectedTable(responseData.tables[0]);
        }
      }
    } catch (err) {
      setError('Failed to fetch tables. Please try again later.');
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGranularityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`http://127.0.0.1:8000/granularity/${selectedTable}`);
      const result: GranularityData = await response.json();
      setData(result.columns);
      
      // Store the overall reason for the current table
      setOverallReason(result.overall_reason);
      setTableReasons(prev => ({
        ...prev,
        [selectedTable]: result.overall_reason
      }));
      
    } catch (err) {
      setError('Failed to fetch granularity data. Please try again later.');
      console.error('Error fetching granularity data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 p-6 relative">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto bg-white rounded-xl shadow-xl p-8 border border-blue-100"
      >
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.5
          }}
          whileHover={{ 
            scale: 1.1,
            rotate: 10,
            boxShadow: "0 0 15px rgba(59, 130, 246, 0.6)"
          }}
          onClick={() => setShowRobotBox(!showRobotBox)}
          className="absolute top-6 right-6 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center"
        >
          <Bot className="h-6 w-6" />
          <motion.span
            animate={{ 
              boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 20px rgba(255,255,255,0.8)', '0 0 0px rgba(255,255,255,0)'],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute w-full h-full rounded-full"
          />
        </motion.button>

        <AnimatePresence>
          {showRobotBox && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 25 }}
              className="fixed top-16 right-6 bg-gradient-to-br from-gray-900 to-blue-900 text-white p-6 rounded-lg shadow-xl w-96 z-50 border border-blue-400"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-300" />
                  <h3 className="text-lg font-bold">{selectedTable}</h3>
                </div>
                <button 
                  onClick={() => setShowRobotBox(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="absolute left-0 top-0 w-1 h-full bg-blue-400 rounded-full" />
                <p className="text-sm leading-relaxed pl-4 text-blue-50">
                  {tableReasons[selectedTable] || overallReason}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BarChart2 className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Database Granularity Analysis
          </h1>
        </motion.div>

        <div className="relative inline-block text-left mb-8">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-gradient-to-r from-blue-100 to-indigo-100 text-gray-800 px-4 py-3 rounded-lg shadow-md flex items-center justify-between w-64 hover:from-blue-200 hover:to-indigo-200 transition-all duration-200 border border-blue-200"
          >
            <span className="truncate font-medium">{selectedTable || "Select a Table"}</span>
            <motion.div
              animate={{ rotate: dropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="ml-2 h-5 w-5 text-blue-600" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 mt-2 w-64 bg-white border border-blue-200 shadow-lg rounded-lg z-10 max-h-64 overflow-y-auto"
              >
                {tables.map((table, index) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={table}
                    onClick={() => {
                      setSelectedTable(table);
                      setDropdownOpen(false);
                    }}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-200 border-b border-blue-50 last:border-b-0 flex items-center gap-2"
                  >
                    <Database className="h-4 w-4 text-blue-500" />
                    <span>{table}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <motion.div 
            className="h-[500px] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              transition: { duration: 1.5, repeat: Infinity }
            }}
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-b-3 border-blue-500"></div>
              <div className="absolute top-0 left-0 animate-ping rounded-full h-16 w-16 border border-blue-300 opacity-30"></div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="h-[500px] bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 shadow-inner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <XAxis 
                    dataKey="column_name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70} 
                    tick={{ fill: '#4B5563', fontSize: 14 }}
                  />
                  <YAxis 
                    ticks={[0, 1, 2, 3, 4]} 
                    tickFormatter={value => ["Very Low", "Low", "Medium", "High", "Very High"][value]} 
                    tick={{ fill: '#4B5563', fontSize: 14 }}
                  />
                  <Tooltip 
                    content={<CustomTooltip />} 
                    cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                  />
                  <Bar
                    dataKey={(entry: Column) => {
                      const granularityMapping: Record<string, number> = {
                        "Very High": 6,
                        "High": 4,
                        "Medium": 3,
                        "Low": 2,
                        "Very Low": 1
                      };
                      return granularityMapping[entry.granularity] ?? 0;
                    }}
                    radius={[8, 8, 0, 0]}
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`rgba(59, 130, 246, ${getColorIntensity(entry.granularity)})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
            
            <GranularityLegend />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default GranularityDashboard;