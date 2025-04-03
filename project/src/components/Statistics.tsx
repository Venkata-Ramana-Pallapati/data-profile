import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Info, Database, BarChart2, PieChart } from 'lucide-react';

interface StatisticsData {
  table: string;
  columns: Record<string, any>;
}

interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode; // Allow JSX elements
  bgColor: string;
  hoverBgColor: string;
  textColor: string;
  hoverTextColor: string;
  icon?: JSX.Element;
  statId: string | number;
}

const Statistics = () => {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [tableName, setTableName] = useState(window.selectedTableName || '');
  const [showAiInsights, setShowAiInsights] = useState(true);
  const [hoveredStat, setHoveredStat] = useState<string | number | null>(null);
  
  // Listen for table selection events
  useEffect(() => {
    const handleTableSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("Table selected event received:", customEvent.detail.tableName);
      setTableName(customEvent.detail.tableName);
      // Reset states when table changes
      setStats(null);
      setError(null);
      setAiAnalysis('');
      setLoading(true);
    };
    
    // Listen for both events
    window.addEventListener('tableSelected', handleTableSelected);
    
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
    };
  }, []);
   
  // Separate useEffect that watches tableName changes and triggers data fetching
  useEffect(() => {
    if (tableName) {
      console.log("Table name changed to:", tableName);
      // Always reset to loading state when table changes
      setLoading(true);
      setAiLoading(true);
      
      // Fetch new data for the changed table
      fetchStatistics(tableName);
      fetchAiAnalysis(tableName);
    }
  }, [tableName]);
  
  const fetchStatistics = async (table: string) => {
    try {
      // Ensure proper encoding of the table name for the URL
      const encodedTableName = encodeURIComponent(table);
      console.log(`Fetching stats for table: ${encodedTableName}`);
      
      // Use the endpoint with encoded table name
      const response = await fetch(`http://localhost:8000/analyze/${encodedTableName}`);
      
      if (!response.ok) {
        // Try to get more details about the error
        const errorData = await response.text();
        console.error(`Server response (${response.status}):`, errorData);
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Successfully received statistics data:', data);
      setStats(data);
      setError(null); // Clear any previous errors
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch statistical data: ${errorMessage}`);
      console.error('Error in fetchStatistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiAnalysis = async (table: string) => {
    try {
      // Ensure proper encoding of the table name for the URL
      const encodedTableName = encodeURIComponent(table);
      console.log(`Fetching AI analysis for table: ${encodedTableName}`);
      
      // Use the LLM endpoint with encoded table name
      const response = await fetch(`http://localhost:8000/llm-summary/${encodedTableName}`);
      if (!response.ok) {
        // Try to get more details about the error
        const errorData = await response.text();
        console.error(`LLM Server response (${response.status}):`, errorData);
        throw new Error(`Failed to fetch AI analysis: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("hello ramana " ,data.summary)
      console.log('Successfully received AI analysis:', data);
      setAiAnalysis(data.summary || 'No analysis available.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error in fetchAiAnalysis:', errorMessage);
      setAiAnalysis(`Error fetching AI analysis: ${errorMessage}. Please try again later.`);
    } finally {
      setAiLoading(false);
    }
  };

  const formatNumber = (num: any) => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Render the AI insights section with collapsible functionality
  const renderAiInsights = () => {
    if (!aiAnalysis && !aiLoading) return null;

    return (
      <div className="mb-6 overflow-hidden rounded-lg shadow bg-white border border-gray-200">
        <div 
          className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 cursor-pointer"
          onClick={() => setShowAiInsights(!showAiInsights)}
        >
          <div className="flex items-center">
            <span className="text-xl mr-2">✨</span>
            <h2 className="text-xl font-bold">AI Insights</h2>
          </div>
          {showAiInsights ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {showAiInsights && (
          <div className="p-6 bg-blue-50 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {aiLoading ? (
              <div className="flex flex-col items-center space-y-4 py-4">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-blue-600"></div>
                <p className="text-gray-600">Generating insights about your data...</p>
              </div>
            ) : (
              <div className="prose max-w-none">
                {aiAnalysis.split('\n\n').map((paragraph, idx) => {
                  // Check if paragraph is a heading
                  if (paragraph.startsWith('# ')) {
                    return <h3 key={idx} className="text-lg font-bold mt-4 mb-2">{paragraph.replace('# ', '')}</h3>;
                  } else if (paragraph.startsWith('## ')) {
                    return <h4 key={idx} className="text-base font-bold mt-3 mb-2">{paragraph.replace('## ', '')}</h4>;
                  
                  } 
                  else if (paragraph.startsWith('### ')) {
                    return <h4 key={idx} className="text-base  mt-3 mb-2">{paragraph.replace('### ', '')}</h4>;
                  
                  } 
                  else if (paragraph.startsWith('#### ')) {
                    return <h4 key={idx} className="text-base font-bold mt-3 mb-2">{paragraph.replace('#### ', '')}</h4>;
                  
                  } 
                  else if (paragraph.startsWith('** ')) {
                    return <h4 key={idx} className="text-base font-bold mt-3 mb-2">{paragraph.replace('** ', '')}</h4>;
                  
                  } 
                
                  else if (paragraph.startsWith('**')) {
                    return <h4 key={idx} className="text-base font-bold mt-3 mb-2">{paragraph.replace('**', '')}</h4>;
                  
                  } 
                  
                  else if (paragraph.startsWith('- ')) {
                    // Handle bullet points
                    return (
                      <ul key={idx} className="list-disc pl-5 my-2">
                        {paragraph.split('\n').map((item, i) => (
                          <li key={i} className="my-1">{item.replace('- ', '')}</li>
                        ))}
                      </ul>
                    );
                  } else {
                    return <p key={idx} className="my-2">{paragraph}</p>;
                  }
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Individual stat card component
  const StatCard: React.FC<StatCardProps> = ({ 
    title, 
    value, 
    bgColor, 
    hoverBgColor, 
    textColor, 
    hoverTextColor,
    icon,
    statId
  }) => {
    const isHovered = hoveredStat === statId;
    
    return (
      <div 
        className={`p-6 rounded-lg shadow-md transition-all duration-300 ${isHovered ? `${hoverBgColor} transform scale-105 shadow-lg` : bgColor}`}
        onMouseEnter={() => setHoveredStat(statId)}
        onMouseLeave={() => setHoveredStat(null)}
      >
        <div className="flex justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
            <div className={`text-2xl font-semibold ${isHovered ? hoverTextColor : textColor} transition-colors duration-300`}>
              {value}
            </div>
          </div>
          <div className={`${isHovered ? 'opacity-100' : 'opacity-60'} transition-opacity duration-300`}>
            {icon}
          </div>
        </div>
        
        {isHovered && (
          <div className="mt-3 text-sm text-gray-600 animate-fadeIn">
            <div className="h-0.5 bg-gray-200 mb-2"></div>
            {title === "Count" && "Total number of non-null values"}
            {title === "Missing" && "Number of null or missing values"}
            {title === "Mean" && "Average of all values in this column"}
            {title === "Std Dev" && "How spread out the values are"}
            {title === "Unique Values" && "Number of distinct values"}
            {title === "Top Value" && "Most common value in this column"}
          </div>
        )}
      </div>
    );
  };

  // Enhanced column cards with separate individual stat cards
  const renderColumnCards = () => {
    if (!stats || !stats.columns) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Column Details</h3>
        <div className="space-y-12">
          {Object.entries(stats.columns).map(([colName, colData]) => {
            const isNumeric = typeof colData.mean === 'number';
            
            // Prepare data for mini distribution chart
            const distributionData = isNumeric ? [
              { name: 'Min', value: colData.min },
              { name: 'Q1', value: colData.percentiles['25%'] || colData.min },
              { name: 'Median', value: colData.percentiles['50%'] || colData.mean },
              { name: 'Q3', value: colData.percentiles['75%'] || colData.max },
              { name: 'Max', value: colData.max }
            ] : [];
            
            return (
              <div key={colName} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Database className="text-blue-600 mr-3" size={24} />
                      <h4 className="font-bold text-xl text-gray-800 truncate" title={colName}>
                        {colName}
                      </h4>
                    </div>
                    <span className="px-4 py-2 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                      {colData.dtype || (isNumeric ? 'numeric' : 'categorical')}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Individual stat cards in a grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                    {/* Count Card */}
                    <StatCard
                      title="Count"
                      value={formatNumber(colData.count)}
                      bgColor="bg-blue-50"
                      hoverBgColor="bg-blue-100"
                      textColor="text-blue-700"
                      hoverTextColor="text-blue-800"
                      icon={<Database size={24} className="text-blue-600" />}
                      statId={`${colName}-count`}
                    />
                    
                    {/* Missing Card */}
                    <StatCard
                      title="Missing"
                      value={
                        <>
                          {formatNumber(colData.missing)}
                          <span className="text-sm text-gray-500 ml-2">
                            ({((colData.missing / colData.count) * 100).toFixed(1)}%)
                          </span>
                        </>
                      }
                      bgColor="bg-red-50"
                      hoverBgColor="bg-red-100"
                      textColor="text-red-700"
                      hoverTextColor="text-red-800"
                      icon={<Info size={24} className="text-red-600" />}
                      statId={`${colName}-missing`}
                    />
                    
                    {isNumeric ? (
                      <>
                        {/* Mean Card */}
                        <StatCard
                          title="Mean"
                          value={formatNumber(colData.mean)}
                          bgColor="bg-green-50"
                          hoverBgColor="bg-green-100"
                          textColor="text-green-700"
                          hoverTextColor="text-green-800"
                          icon={colData.mean >= 0 ? 
                            <TrendingUp size={24} className="text-green-600" /> : 
                            <TrendingDown size={24} className="text-red-600" />
                          }
                          statId={`${colName}-mean`}
                        />
                        
                        {/* Std Dev Card */}
                        <StatCard
                          title="Std Dev"
                          value={formatNumber(colData.std)}
                          bgColor="bg-purple-50"
                          hoverBgColor="bg-purple-100"
                          textColor="text-purple-700"
                          hoverTextColor="text-purple-800"
                          icon={<BarChart2 size={24} className="text-purple-600" />}
                          statId={`${colName}-std`}
                        />
                        
                        {/* Min Card */}
                        <StatCard
                          title="Min"
                          value={formatNumber(colData.min)}
                          bgColor="bg-yellow-50"
                          hoverBgColor="bg-yellow-100"
                          textColor="text-yellow-700"
                          hoverTextColor="text-yellow-800"
                          icon={<TrendingDown size={24} className="text-yellow-600" />}
                          statId={`${colName}-min`}
                        />
                        
                        {/* Max Card */}
                        <StatCard
                          title="Max"
                          value={formatNumber(colData.max)}
                          bgColor="bg-indigo-50"
                          hoverBgColor="bg-indigo-100"
                          textColor="text-indigo-700"
                          hoverTextColor="text-indigo-800"
                          icon={<TrendingUp size={24} className="text-indigo-600" />}
                          statId={`${colName}-max`}
                        />
                      </>
                    ) : (
                      <>
                        {/* Unique Values Card */}
                        <StatCard
                          title="Unique Values"
                          value={formatNumber(colData.unique)}
                          bgColor="bg-green-50"
                          hoverBgColor="bg-green-100"
                          textColor="text-green-700"
                          hoverTextColor="text-green-800"
                          icon={<PieChart size={24} className="text-green-600" />}
                          statId={`${colName}-unique`}
                        />
                        
                        {/* Top Value Card */}
                        <StatCard
                          title="Top Value"
                          value={
                            <span className="truncate block max-w-xs" title={String(colData.top)}>
                              {String(colData.top)}
                            </span>
                          }
                          bgColor="bg-purple-50"
                          hoverBgColor="bg-purple-100"
                          textColor="text-purple-700"
                          hoverTextColor="text-purple-800"
                          icon={<TrendingUp size={24} className="text-purple-600" />}
                          statId={`${colName}-top`}
                        />
                      </>
                    )}
                  </div>
                  
                  {isNumeric && (
                    <div className="mt-8 border-t pt-6 border-gray-100">
                      <div className="flex items-center mb-4">
                        <BarChart2 size={20} className="text-blue-600 mr-2" />
                        <h5 className="text-lg font-medium text-gray-700">
                          Value Distribution
                        </h5>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distributionData}>
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                              <YAxis width={60} />
                              <Tooltip 
                                labelStyle={{ fontWeight: 'bold' }} 
                                contentStyle={{ 
                                  borderRadius: '8px', 
                                  border: 'none', 
                                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' 
                                }}
                              />
                              <Bar 
                                dataKey="value" 
                                fill="#6366f1" 
                                barSize={35} 
                                radius={[4, 4, 0, 0]} 
                                animationDuration={300}
                                onMouseOver={() => {
                                  // Add hover effect to chart bars
                                  document.querySelectorAll('.recharts-bar-rectangle').forEach(rect => {
                                    rect.classList.add('opacity-80');
                                  });
                                }}
                                onMouseOut={() => {
                                  // Remove hover effect from chart bars
                                  document.querySelectorAll('.recharts-bar-rectangle').forEach(rect => {
                                    rect.classList.remove('opacity-80');
                                  });
                                }}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center bg-white p-8 rounded-xl shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mb-6"></div>
          <p className="text-lg font-medium text-gray-700">Preparing Data Profile</p>
          <p className="text-gray-500 mt-2">Loading statistics for {tableName}...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 flex flex-col items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-xl w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Unable to Load Data Profile</h2>
            <p className="mt-2 text-gray-600">{error}</p>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-6">
            <p>The system will automatically retry when you select a table.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Profile: {tableName}</h1>
            <p className="text-gray-600 mt-2 text-lg">
              Interactive data insights and column analytics
            </p>
          </div>
          
          {loading && stats && (
            <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
              <span className="text-sm">Refreshing...</span>
            </div>
          )}
        </div>

        {/* Main content area with right sidebar for AI analysis */}
        <div className="grid grid-cols-12 gap-6">
          {/* Main content - 9 columns */}
          <div className="col-span-12 lg:col-span-9 space-y-8">
            {renderColumnCards()}
          </div>
          
          {/* AI analysis sidebar - 3 columns */}
          <div className="col-span-12 lg:col-span-3">
            {renderAiInsights()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;