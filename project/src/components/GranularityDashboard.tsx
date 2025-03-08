import React, { useState, useEffect } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart2, Database, BarChartHorizontal, BrainCircuit, ChevronDown, ChevronUp, PieChart } from "lucide-react";

interface Column {
  column_name: string;
  granularity: string;
  reason: string;
}

interface GranularityData {
  columns: Column[];
  table_granularity: string;
  overall_reason: string;
  analysis?: string;
  statistics?: TableStatistics;
}

interface TableStatistics {
  column_count: number;
  high_granularity_columns: number;
  low_granularity_columns: number;
  average_granularity: string;
  data_quality_score?: number;
}

const getColorIntensity = (granularity: string) => {
  const intensityMap: Record<"Very High" | "High" | "Medium" | "Low" | "Very Low", number> = {
    "Very High": 0.9,
    "High": 0.7,
    "Medium": 0.5,
    "Low": 0.3,
    "Very Low": 0.1
  };
  return intensityMap[granularity as keyof typeof intensityMap] || 0.5;
};

// Modified legend component to be more compact and fit directly below the chart
const GranularityLegend = () => {
  const legendItems = [
    { label: "Very High", intensity: 0.9 },
    { label: "High", intensity: 0.7 },
    { label: "Medium", intensity: 0.5 },
    { label: "Low", intensity: 0.3 },
    { label: "Very Low", intensity: 0.1 }
  ];
   
  return (
    <div className="flex flex-wrap justify-center gap-4 pt-4 pb-2">
      {legendItems.map(({ label, intensity }) => (
        <div 
          key={label} 
          className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm"
        >
          <div 
            className="w-6 h-6 rounded-md"
            style={{ 
              backgroundColor: `rgba(59, 130, 246, ${intensity})`
            }}
          />
          <span className="text-sm text-gray-700">{label}</span>
        </div>
      ))}
    </div>
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
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-lg shadow-xl p-6 text-white max-w-md" style={{ minWidth: '20rem' }}>
        <div className="flex flex-col gap-4">
          <div className="border-b border-white/20 pb-3">
            <h3 className="text-xl font-bold break-words">{column_name}</h3>
            <div className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-sm mt-2 font-semibold">
              {granularity}
            </div>
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
        </div>
      </div>
    );
  }
  return null;
};

const LLMAnalysisBox = ({ analysis, isVisible, onToggle }: { 
  analysis?: string, 
  isVisible: boolean, 
  onToggle: () => void
}) => {
  if (!analysis) return null;
  
  return (
    <div className="mt-8 mb-4">
      {/* Toggle button */}
      <button 
        onClick={onToggle}
        className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white p-4 rounded-t-xl shadow-md transition-all duration-300 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <BrainCircuit className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold">AI Analysis</span>
        </div>
        <div>
          {isVisible ? 
            <ChevronUp className="h-5 w-5 text-white" /> : 
            <ChevronDown className="h-5 w-5 text-white" />
          }
        </div>
      </button>
      
      {/* Collapsible content */}
      {isVisible && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-b-xl border-x border-b border-blue-200 shadow-lg transition-all duration-300">
          <div className="bg-white p-6 rounded-lg shadow-inner">
            <div className="relative">
              <div className="absolute left-0 top-0 w-1 h-full bg-indigo-400 rounded-full" />
              <p className="pl-6 text-gray-700 leading-relaxed whitespace-pre-line">{analysis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Granularity Breakdown Card Component with Improved Percentage Display
const EnhancedGranularityBreakdown = ({ statistics }: { statistics?: TableStatistics }) => {
  if (!statistics) return null;
  
  // Calculate percentages for all granularity levels
  const highGranularityPercentage = Math.round((statistics.high_granularity_columns / statistics.column_count) * 100);
  const lowGranularityPercentage = Math.round((statistics.low_granularity_columns / statistics.column_count) * 100);
  const mediumGranularityPercentage = 100 - highGranularityPercentage - lowGranularityPercentage;
  
  // Determine granularity distribution details
  const getGranularityRating = () => {
    if (highGranularityPercentage >= 70) return "Excellent";
    if (highGranularityPercentage >= 50) return "Good";
    if (highGranularityPercentage >= 30) return "Average";
    return "Needs Improvement";
  };
  
  // Get a recommendation based on the distribution
  const getDistributionRecommendation = () => {
    if (highGranularityPercentage >= 70) {
      return "Your data has excellent granularity. Perfect for detailed analysis.";
    } else if (highGranularityPercentage >= 50) {
      return "Good granularity. Consider enhancing lower granularity columns for more detailed insights.";
    } else if (highGranularityPercentage >= 30) {
      return "Average granularity. Review low granularity columns to increase detail level where possible.";
    } else {
      return "Consider restructuring your data model to increase granularity for better analytical capabilities.";
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-blue-100 rounded-full">
          <PieChart className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Granularity Breakdown</h3>
      </div>
      
      {/* Distribution bar with percentages always visible */}
      <div className="mt-4">
        <div className="flex h-10 rounded-lg overflow-hidden mb-2">
          {/* High granularity section */}
          <div 
            className="bg-blue-600 flex items-center justify-center text-white font-medium transition-all duration-500"
            style={{ width: `${highGranularityPercentage || 0}%`, minWidth: highGranularityPercentage > 0 ? '40px' : '0px' }}
          >
            {highGranularityPercentage > 0 ? `${highGranularityPercentage}%` : ''}
          </div>
          
          {/* Medium granularity section */}
          {mediumGranularityPercentage > 0 && (
            <div 
              className="bg-purple-500 flex items-center justify-center text-white font-medium transition-all duration-500"
              style={{ width: `${mediumGranularityPercentage}%`, minWidth: mediumGranularityPercentage > 0 ? '40px' : '0px' }}
            >
              {mediumGranularityPercentage > 0 ? `${mediumGranularityPercentage}%` : ''}
            </div>
          )}
          
          {/* Low granularity section */}
          <div 
            className="bg-amber-400 flex items-center justify-center text-white font-medium transition-all duration-500"
            style={{ width: `${lowGranularityPercentage || 0}%`, minWidth: lowGranularityPercentage > 0 ? '40px' : '0px' }}
          >
            {lowGranularityPercentage > 0 ? `${lowGranularityPercentage}%` : ''}
          </div>
        </div>
        
        {/* Legend with counts */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span className="text-sm text-gray-700">High Granularity</span>
            <span className="font-bold text-sm text-blue-700">
              ({statistics.high_granularity_columns})
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-700">Medium</span>
            <span className="font-bold text-sm text-purple-700">
              ({statistics.column_count - statistics.high_granularity_columns - statistics.low_granularity_columns})
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-400 rounded"></div>
            <span className="text-sm text-gray-700">Low Granularity</span>
            <span className="font-bold text-sm text-amber-700">
              ({statistics.low_granularity_columns})
            </span>
          </div>
        </div>
        
        {/* Rating */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm text-gray-700">Overall Rating:</span>
          <span className={`font-bold text-sm ${
            highGranularityPercentage >= 70 ? "text-green-600" :
            highGranularityPercentage >= 50 ? "text-blue-600" :
            highGranularityPercentage >= 30 ? "text-amber-600" : "text-red-600"
          }`}>
            {getGranularityRating()}
          </span>
        </div>
        
        {/* Recommendation */}
        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-gray-700 border border-blue-100">
          {getDistributionRecommendation()}
        </div>
      </div>
    </div>
  );
};

const StatisticsCard = ({ statistics }: { statistics?: TableStatistics }) => {
  if (!statistics) return null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Column Distribution</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Columns</span>
            <span className="font-bold text-blue-700">{statistics.column_count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">High Granularity</span>
            <span className="font-bold text-green-600">{statistics.high_granularity_columns}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Low Granularity</span>
            <span className="font-bold text-amber-600">{statistics.low_granularity_columns}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <BarChartHorizontal className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Quality Metrics</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Average Granularity</span>
            <span className="font-bold text-blue-700">{statistics.average_granularity}</span>
          </div>
          {statistics.data_quality_score !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Data Quality Score</span>
              <span className={`font-bold ${statistics.data_quality_score >= 75 ? 'text-green-600' : statistics.data_quality_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {statistics.data_quality_score}/100
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced granularity breakdown with improved percentage display */}
      <EnhancedGranularityBreakdown statistics={statistics} />
    </div>
  );
};

// Animated loading component for the granularity dashboard
const LoadingAnimation = () => {
  return (
    <div className="h-[400px] flex flex-col items-center justify-center gap-6">
      {/* Main spinner */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-indigo-600 blur-md opacity-70 animate-pulse"></div>
        <div className="relative animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-blue-600"></div>
      </div>
      
      {/* Loading text with animated dots */}
      <div className="text-blue-700 font-semibold text-lg">
        Loading granularity data
        <span className="animate-dot1">.</span>
        <span className="animate-dot2">.</span>
        <span className="animate-dot3">.</span>
      </div>
      
      {/* Animated progress bar */}
      <div className="w-64 h-2 bg-blue-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full animate-progressBar"></div>
      </div>
      
      {/* Add the CSS for animations in the global styles or inline */}
      <style jsx>{`
        @keyframes dotAnimation1 {
          0%, 100% { opacity: 0.3; }
          20% { opacity: 1; }
        }
        @keyframes dotAnimation2 {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes dotAnimation3 {
          0%, 100% { opacity: 0.3; }
          80% { opacity: 1; }
        }
        @keyframes progressAnimation {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-dot1 { animation: dotAnimation1 1.5s infinite; }
        .animate-dot2 { animation: dotAnimation2 1.5s infinite; }
        .animate-dot3 { animation: dotAnimation3 1.5s infinite; }
        .animate-progressBar { animation: progressAnimation 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

const GranularityDashboard: React.FC = () => {
  const [data, setData] = useState<Column[]>([]);
  const [overallReason, setOverallReason] = useState<string>("");
  const [llmAnalysis, setLlmAnalysis] = useState<string>("");
  const [showLlmAnalysis, setShowLlmAnalysis] = useState(true);
  const [tableStatistics, setTableStatistics] = useState<TableStatistics | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableName, setTableName] = useState("");

  // Initialize tableName from any available source
  useEffect(() => {
    // First check if window.selectedTableName exists
    if (window.selectedTableName) {
      setTableName(window.selectedTableName);
    } else {
      // Check localStorage as fallback
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
  }, []);

  // Listen for table selection events
  useEffect(() => {
    const handleTableSelected = (event: any) => {
      if (event.detail && event.detail.tableName) {
        const newTableName = event.detail.tableName;
        setTableName(newTableName);
        // Reset LLM analysis content to trigger a new fetch
        setLlmAnalysis("");
        // Auto-show LLM analysis for new table
        setShowLlmAnalysis(true);
        console.log("Table selected event received:", newTableName);
      }
    };

    window.addEventListener('tableSelected', handleTableSelected);
    window.addEventListener('dataQualitySelected', handleTableSelected);

    return () => {
      window.removeEventListener('tableSelected', handleTableSelected);
      window.removeEventListener('dataQualitySelected', handleTableSelected);
    };
  }, []);

  // Fetch granularity data when tableName changes
  useEffect(() => {
    if (tableName) {
      console.log("Fetching granularity data for:", tableName);
      fetchGranularityData();
    }
  }, [tableName]);

  // Update LLM analysis when data is loaded
  useEffect(() => {
    if (data.length > 0 && tableName && !llmAnalysis) {
      // Instead of calling an endpoint, use the overall_reason from the data
      setLlmAnalysis(overallReason || "The sales table includes a diverse range of columns with varying degrees of granularity. While identifiers like sales_id and timestamp are highly granular, columns such as store_id have lower granularity due to repetition. This mix results in an overall medium granularity classification, indicating that while detailed sales data is available, there are areas, particularly related to stores, where granularity is less detailed, which can impact analysis of store performance.");
      setShowLlmAnalysis(true);
    }
  }, [data, tableName, overallReason, llmAnalysis]);

  const fetchGranularityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use tableName for the API request
      const response = await fetch(`http://127.0.0.1:8000/granularity/${tableName}`);
      const result: GranularityData = await response.json();
      
      setData(result.columns);
      
      // Store the overall reason
      setOverallReason(result.overall_reason);
      
      // Generate table statistics based on the columns data
      const highGranularityCount = result.columns.filter(col => 
        col.granularity === "High" || col.granularity === "Very High"
      ).length;
      
      const lowGranularityCount = result.columns.filter(col => 
        col.granularity === "Low" || col.granularity === "Very Low"
      ).length;
      
      // Get average granularity level
      const granularityMap = {
        "Very Low": 0,
        "Low": 1,
        "Medium": 2,
        "High": 3,
        "Very High": 4
      };
      
      const avgNumeric = result.columns.reduce((sum, col) => {
        return sum + (granularityMap[col.granularity as keyof typeof granularityMap] || 0);
      }, 0) / (result.columns.length || 1);
      
      // Convert back to string representation
      const avgGranularity = avgNumeric < 0.75 ? "Very Low" :
                            avgNumeric < 1.75 ? "Low" :
                            avgNumeric < 2.75 ? "Medium" :
                            avgNumeric < 3.75 ? "High" : "Very High";
      
      // Calculate data quality score (0-100)
      const qualityScore = Math.round((avgNumeric / 4) * 100);
      
      setTableStatistics({
        column_count: result.columns.length,
        high_granularity_columns: highGranularityCount,
        low_granularity_columns: lowGranularityCount,
        average_granularity: avgGranularity,
        data_quality_score: qualityScore
      });
      
      // Use the overall_reason directly for the LLM analysis
      setLlmAnalysis(result.overall_reason || "The sales table includes a diverse range of columns with varying degrees of granularity. While identifiers like sales_id and timestamp are highly granular, columns such as store_id have lower granularity due to repetition. This mix results in an overall medium granularity classification, indicating that while detailed sales data is available, there are areas, particularly related to stores, where granularity is less detailed, which can impact analysis of store performance.");
      setShowLlmAnalysis(true);
      
    } catch (err) {
      setError('Failed to fetch granularity data. Please try again later.');
      console.error('Error fetching granularity data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle LLM analysis visibility
  const toggleLLMAnalysis = () => {
    setShowLlmAnalysis(!showLlmAnalysis);
  };

  return (
    <div className="w-full bg-gradient-to-b from-blue-50 to-indigo-50 p-4">
      <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-6">
          <BarChart2 className="h-7 w-7 text-blue-500" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            {tableName ? `${tableName} Granularity Analysis` : "Database Granularity Analysis"}
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingAnimation />
        ) : (
          <div>
            {/* Chart container with legend integrated directly below */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-inner">
              {/* Chart section */}
              <div className="h-[400px] p-4">
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
                          "Very High": 4,
                          "High": 3,
                          "Medium": 2,
                          "Low": 1,
                          "Very Low": 0
                        };
                        return granularityMapping[entry.granularity] ?? 0;
                      }}
                      radius={[8, 8, 0, 0]}
                    >
                      {data && data.length > 0 ? data.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`rgba(59, 130, 246, ${getColorIntensity(entry.granularity)})`}
                        />
                      )) : null}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend section - directly below the chart in the same container */}
              <GranularityLegend />
            </div>
            
            {/* Statistics Cards */}
            <StatisticsCard statistics={tableStatistics} />
            
            {/* Footer section with LLM Analysis Box */}
            <div className="mt-8">
              <LLMAnalysisBox 
                analysis={llmAnalysis || "Loading analysis..."}
                isVisible={showLlmAnalysis}
                onToggle={toggleLLMAnalysis}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GranularityDashboard;