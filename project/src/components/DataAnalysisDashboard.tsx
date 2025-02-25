import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, BarChart2, Activity,Download } from 'lucide-react';
import { useRef } from "react";
import * as htmlToImage from 'html-to-image';

import jsPDF from 'jspdf';
// Types

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

type GranularityLevel = 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low';

interface GranularityData {
  name: string;
  value: number;
  level: string;
  description: string;
}

const COLORS = {
  quality: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'],
  correlation: '#8884d8',
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
  granularity: '#3B82F6'
};

const DataAnalysisDashboard = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [dataQuality, setDataQuality] = useState<DataQualityResponse | null>(null);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [frequencyData, setFrequencyData] = useState<ChartDataPoint[]>([]);
  const [granularityData, setGranularityData] = useState<GranularityData[]>([]);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [overallMetrics, setOverallMetrics] = useState<any>(null);
  const [showCorrelationDropdown, setShowCorrelationDropdown] = useState(false);
  const [selectedTablesForCorrelation, setSelectedTablesForCorrelation] = useState<Record<string, boolean>>({});
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>({});
  const [tableColumns, setTableColumns] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState(false);
  const dashboardRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);



  //downloading pdfs 
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

      // Wait for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await htmlToImage.toPng(dashboardRef.current, {
        quality: 1.0,
        backgroundColor: '#1a1f2e',
        style: {
          transform: 'scale(1)',
        },
        filter: (node) => {
          // Filter out tooltip elements during capture
          return !node.classList?.contains('recharts-tooltip-wrapper');
        }
      });

      // Create and trigger download
      const link = document.createElement('a');
      link.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();

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
      const tablesResponse = await fetch('http://127.0.0.1:8000/list-tables');
      const tablesData = await tablesResponse.json();
      const tablesList = tablesData.tables;
      console.log(tablesList);
      setTables(tablesList);

      const tableNamesParam = tablesList.join(",");
      console.log(typeof(tableNamesParam));
      const qualityResponse = await fetch(`http://127.0.0.1:8000/data-quality1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_names: tableNamesParam })  // ✅ Send as string
      });

      const qualityData = await qualityResponse.json();
      console.log(qualityData);
      setDataQuality(qualityData);
      calculateOverallMetrics(qualityData);

      const correlationResponse = await fetch('http://127.0.0.1:8000/xgboost-correlation/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_columns: tablesList.reduce((acc: any, table: string) => ({
            ...acc,
            [table]: Object.keys(qualityData[table]?.columns || {})
          }), {})
        })
      });
      const correlationData = await correlationResponse.json();
      setCorrelationData(transformCorrelationData(correlationData));

      const [granularityResponse, metadataResponse] = await Promise.all([
        fetch('http://127.0.0.1:8000/llm_granularity'),
        fetch('http://127.0.0.1:8000/metadata')
      ]);

      const granularityData = await granularityResponse.json();
      const metadataData = await metadataResponse.json();

      const transformedGranularityData = Object.entries(granularityData)
        .slice(1)
        .map(([name, level]) => {
          const cleanName = name.replace('- ', '').toLowerCase();
          const cleanLevel = (level as string).toString().replace(/\*\*/g, '').trim() as GranularityLevel;
          const description = metadataData.tables?.[cleanName]?.description || 'No description available';

          return {
            name: cleanName,
            value: granularityToValue[cleanLevel],
            level: cleanLevel,
            description
          };
        });

      setGranularityData(transformedGranularityData);
      setLoading(false);

      if (tablesList.length > 0) {
        setSelectedTable(tablesList[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

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
      console.log(dataCategories);
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

  const transformCorrelationData = (data: any) => {
    return Object.entries(data).map(([name, value]) => ({
      name,
      value: parseFloat(value as string)
    }));
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

  const handleCalculateCorrelation = async () => {
    const selectedColumnsFormat = Object.entries(selectedColumns).reduce((acc, [table, columns]) => {
      if (columns.length > 0) {
        acc[table] = columns;
      }
      return acc;
    }, {} as Record<string, string[]>);

    try {
      const response = await fetch('http://127.0.0.1:8000/xgboost-correlation/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_columns: selectedColumnsFormat })
      });
      const data = await response.json();
      setCorrelationData(transformCorrelationData(data));
      setShowCorrelationDropdown(false);
    } catch (error) {
      console.error('Error calculating correlation:', error);
    }
  };

  const CustomGranularityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
          <p className="font-medium text-lg mb-2 capitalize text-gray-800">{label}</p>
          <p className="text-blue-600 mb-2">Granularity: {item.level}</p>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="text-sm text-gray-700">{item.description}</p>
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

  if (loading) {
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-xl font-semibold text-white">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div ref={dashboardRef} className="max-w-7xl mx-auto space-y-6">

        {/* Overall Metrics Section */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">Overall Data Quality Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <h3 className="text-lg font-semibold">Total Rows</h3>
              <p className="text-2xl">{overallMetrics?.totalRows.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <h3 className="text-lg font-semibold">Missing Values</h3>
              <p className="text-2xl">{overallMetrics?.missingValues.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <h3 className="text-lg font-semibold">Avg Completeness</h3>
              <p className="text-2xl">{overallMetrics?.avgCompleteness.toFixed(1)}%</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <h3 className="text-lg font-semibold">Avg Uniqueness</h3>
              <p className="text-2xl">{overallMetrics?.avgUniqueness.toFixed(1)}%</p>
            </div>
          </div>
          {renderOverallMetricsPieChart()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Correlation Analysis */}
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6" />
                <h2 className="text-xl font-bold">Column Correlations</h2>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowCorrelationDropdown(!showCorrelationDropdown)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Select Columns
                </button>
                
                {showCorrelationDropdown && (
                  <div className="absolute right-0 mt-2 w-96 bg-white text-gray-800 rounded-lg shadow-xl z-50">
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-4">Select Tables and Columns</h3>
                      <div className="max-h-96 overflow-y-auto">
                        {tables.map(table => (
                          <div key={table} className="mb-4">
                            <label className="flex items-center gap-2 font-medium">
                              <input
                                type="checkbox"
                                checked={selectedTablesForCorrelation[table] || false}
                                onChange={() => handleTableSelection(table)}
                                className="rounded"
                              />
                              {table}
                            </label>
                            
                            {selectedTablesForCorrelation[table] && tableColumns[table] && (
                              <div className="ml-6 mt-2 space-y-1">
                                {tableColumns[table].map(column => (
                                  <label key={column} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedColumns[table]?.includes(column) || false}
                                      onChange={() => handleColumnSelection(table, column)}
                                      className="rounded"
                                    />
                                    {column}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleCalculateCorrelation}
                        className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Calculate Correlation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={correlationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="white" />
                  <YAxis stroke="white" />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke={COLORS.correlation} fill={COLORS.correlation} fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Frequency Analysis */}
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white">
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
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Granularity Analysis */}
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">Granularity Analysis</h2>
              </div>
              <div className="flex gap-2">
                {Object.entries(granularityToValue).reverse().map(([level]) => (
                  <div key={level} className="flex items-center gap-2 px-3 py-1 rounded bg-white bg-opacity-10">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ 
                        backgroundColor: COLORS.granularity,
                        opacity: (granularityToValue[level as GranularityLevel] + 1) / 5 
                      }} 
                    />
                    <span className="text-xs">{level}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={granularityData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                    stroke="white"
                    tick={{ fill: 'white', fontSize: 12 }}
                  />
                  <YAxis 
                    ticks={[0, 1, 2, 3, 4]}
                    tickFormatter={(value) => {
                      const levels: GranularityLevel[] = ["Very Low", "Low", "Medium", "High", "Very High"];
                      return levels[value];
                    }}
                    stroke="white"
                    tick={{ fill: 'white', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomGranularityTooltip />} />
                  <Bar 
                    dataKey="value" 
                    fill={COLORS.granularity}
                    radius={[4, 4, 0, 0]}
                  >
                    {granularityData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS.granularity}
                        opacity={(entry.value + 1) / 5}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>


                    {/* Download Button */}
                    <div className="max-w-7xl mx-auto mt-6 flex justify-end">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`
            flex items-center gap-2 px-6 py-3 
            bg-blue-600 hover:bg-blue-700 
            rounded-lg text-white transition-all duration-200
            ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}
            shadow-lg hover:shadow-xl
          `}
        >
          {isDownloading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Capturing...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Download Dashboard</span>
            </>
          )}
        </button>
      </div>





    </div>
  );
};

export default DataAnalysisDashboard;