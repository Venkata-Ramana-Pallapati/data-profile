import React, { useState, useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { CorrelationData, ViewType } from '/home/sigmoid/Desktop/TESTING/project/src/types/index.ts';

const ColumnCorrelation = () => {
  // State Management - Combined and minimized
  const [correlationData, setCorrelationData] = useState<[string, string, number][]>([]);
  const [uniqueColumns, setUniqueColumns] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<{col1: string, col2: string, value: number, x: number, y: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<ViewType>('global');
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<Record<string, string[]>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [zoomedColumn, setZoomedColumn] = useState<number | null>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  
  // Component mounted flag to prevent state updates after unmounting
  const isMounted = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initial Data Loading
  useEffect(() => {
    fetchTables();
    if (view === 'global') {
      loadGlobalCorrelation();
    }
  }, []);

  useEffect(() => {
    if (selectedTables.length > 0) fetchColumnsForTables();
  }, [selectedTables]);

  // Data Fetching Functions - Consolidated
  const fetchTables = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/list-tables');
      if (isMounted.current) {
        setTables((await response.json()).tables);
      }
    } catch (error) {
      if (isMounted.current) {
        setError('Failed to fetch tables');
      }
    }
  };

  const fetchColumnsForTables = async () => {
    const columnsData: Record<string, string[]> = {};
    for (const table of selectedTables) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/table-columns/${table}`);
        columnsData[table] = (await response.json()).columns || [];
      } catch (error) {
        console.error(`Error fetching columns for ${table}:`, error);
      }
    }
    if (isMounted.current) {
      setAvailableColumns(columnsData);
    }
  };

  // Load global correlation data from localStorage or fetch from API if not available
  const loadGlobalCorrelation = () => {
    // Check if data exists in localStorage
    const storedData = localStorage.getItem('globalCorrelationData');
    
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        const cacheAge = Date.now() - parsedData.timestamp;
        const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (cacheAge < CACHE_EXPIRATION) {
          console.log("Using cached global correlation data from localStorage");
          if (isMounted.current) {
            setCorrelationData(parsedData.data);
            setUniqueColumns(parsedData.columns);
            setMatrix(parsedData.matrix);
            setAiSummary(parsedData.summary || '');
            return;
          }
        } else {
          console.log("Cached data expired, fetching fresh data");
        }
      } catch (error) {
        console.error("Error parsing stored data:", error);
      }
    }
    
    // If no valid cached data, fetch from API
    fetchGlobalCorrelation();
  };

  const fetchGlobalCorrelation = async () => {
    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
      resetMatrixData();
    }
    
    try {
      const response = await fetch('http://127.0.0.1:8000/global_correlation');
      const data = await response.json();
      
      // Debug response
      console.log("Global correlation API response:", data);
      
      // Transform the new format to the expected [col1, col2, value] format
      const transformedData = transformCorrelationData(data);
      
      // Check if transformedData exists and is an array
      if (!transformedData || !Array.isArray(transformedData)) {
        throw new Error('Invalid data format received from API');
      }
      
      // Process the transformed data
      const columns = processData(transformedData);
      
      // Generate a fresh matrix after processing data
      const size = columns.length;
      const correlationMatrix = Array.from({ length: size }, () => Array(size).fill(0));
      
      transformedData.forEach(([col1, col2, value]) => {
        const i = columns.indexOf(col1);
        const j = columns.indexOf(col2);
        if (i !== -1 && j !== -1) {
          correlationMatrix[i][j] = value;
          correlationMatrix[j][i] = value;
        }
      });
      
      // Set diagonal to 1
      for (let i = 0; i < size; i++) correlationMatrix[i][i] = 1;
      
      const summary = generateGlobalSummary(transformedData, columns.length);
      
      // Store all processed data in localStorage
      const storageData = {
        data: transformedData,
        columns: columns,
        matrix: correlationMatrix,
        summary: summary,
        timestamp: Date.now()
      };
      
      localStorage.setItem('globalCorrelationData', JSON.stringify(storageData));
      
      if (isMounted.current) {
        setCorrelationData(transformedData);
        setUniqueColumns(columns);
        setMatrix(correlationMatrix);
        setAiSummary(summary);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching global correlation:", error);
      if (isMounted.current) {
        setError('Failed to fetch global correlation data');
        setIsLoading(false);
      }
    }
  };

  // New function to transform the new API response format to the expected format
  const transformCorrelationData = (data: any): [string, string, number][] => {
    // Check if data is an array (new format) or has sorted_correlations property (old format)
    if (Array.isArray(data)) {
      // New format: array of {target, feature, importance} objects
      return data.map(item => [item.target, item.feature, item.importance]);
    } else if (data.sorted_correlations && Array.isArray(data.sorted_correlations)) {
      // Old format: {sorted_correlations: [[col1, col2, value], ...]}
      return data.sorted_correlations;
    }
    
    // If neither format matches, return empty array
    console.error("Unknown data format:", data);
    return [];
  };

  const fetchCustomCorrelation = async () => {
    if (selectedColumns.length < 2) {
      setError('Please select at least 2 columns');
      return;
    }

    setIsLoading(true);
    setError(null);
    resetMatrixData();

    try {
      const selectedColumnsByTable = selectedColumns.reduce((acc, col) => {
        const [table, column] = col.split(".");
        if (!acc[table]) acc[table] = [];
        acc[table].push(column);
        return acc;
      }, {} as Record<string, string[]>);
      
      const response = await fetch('http://127.0.0.1:8000/custom_correlation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_columns: selectedColumnsByTable }),
      });
      
      const data = await response.json();
      const formattedData = formatCorrelationData(data.correlation);
      
      if (isMounted.current) {
        setCorrelationData(formattedData);
        processData(formattedData);
        setAiSummary(generateCustomSummary(formattedData));
      }
    } catch (error) {
      if (isMounted.current) {
        setError('Failed to fetch custom correlation data');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Data Processing Functions
  const processData = (data: [string, string, number][]) => {
    const columns = new Set<string>();
    data.forEach(([col1, col2]) => {
      columns.add(col1);
      columns.add(col2);
    });

    const uniqueColumnsArray = Array.from(columns);
    
    if (isMounted.current) {
      setUniqueColumns(uniqueColumnsArray);
    }

    const size = uniqueColumnsArray.length;
    const correlationMatrix = Array.from({ length: size }, () => Array(size).fill(0));

    data.forEach(([col1, col2, value]) => {
      const i = uniqueColumnsArray.indexOf(col1);
      const j = uniqueColumnsArray.indexOf(col2);
      if (i !== -1 && j !== -1) {
        correlationMatrix[i][j] = value;
        correlationMatrix[j][i] = value;
      }
    });

    // Set diagonal to 1
    for (let i = 0; i < size; i++) correlationMatrix[i][i] = 1;
    
    if (isMounted.current) {
      setMatrix(correlationMatrix);
    }
    
    return uniqueColumnsArray;
  };

  const formatCorrelationData = (data: CorrelationData): [string, string, number][] => {
    const result: [string, string, number][] = [];
    Object.entries(data).forEach(([col1, relatedColumns]) => {
      Object.entries(relatedColumns).forEach(([col2, value]) => {
        result.push([col1, col2, value]);
      });
    });
    return result;
  };

  // AI Summary Functions
  const generateGlobalSummary = (data: [string, string, number][], columnsCount: number) => {
    const strong = data.filter(([,, value]) => Math.abs(value) > 0.7);
    const moderate = data.filter(([,, value]) => Math.abs(value) > 0.4 && Math.abs(value) <= 0.7);
    
    return `Global Analysis: ${strong.length} strong correlations, ${moderate.length} moderate correlations
Top correlation: ${strong[0]?.[0].split('.').pop()} and ${strong[0]?.[1].split('.').pop()} (r = ${strong[0]?.[2].toFixed(2) || 'N/A'})
Total columns: ${columnsCount}`;
  };

  const generateCustomSummary = (data: [string, string, number][]) => {
    const avgCorr = data.reduce((sum, [,, v]) => sum + Math.abs(v), 0) / Math.max(data.length, 1);
    const strongest = data.reduce((prev, curr) => Math.abs(curr[2]) > Math.abs(prev[2]) ? curr : prev, ["","",0]);
    
    return `Custom Analysis: ${selectedColumns.length} columns, avg correlation: ${avgCorr.toFixed(2)}
Strongest: ${strongest[0].split('.').pop()} and ${strongest[1].split('.').pop()} (r = ${strongest[2].toFixed(2)})`;
  };

  // Event Handlers
  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    if (newView === 'global') {
      // When switching to global view, load data from localStorage
      // Reset and show loading state if needed
      resetMatrixData();
      loadGlobalCorrelation();
    } else {
      // For custom view, reset the matrix data
      resetMatrixData();
      setError(null);
    }
  };

  const handleTableSelect = (table: string, checked: boolean) => {
    if (checked) {
      setSelectedTables(prev => [...prev, table]);
    } else {
      setSelectedTables(prev => prev.filter(t => t !== table));
      setSelectedColumns(prev => prev.filter(col => !col.startsWith(table + '.')));
    }
  };

  const handleColumnSelect = (column: string, checked: boolean) => {
    setSelectedColumns(prev => checked ? [...prev, column] : prev.filter(col => col !== column));
  };

  const handleCellHover = (e: React.MouseEvent<HTMLTableCellElement>, i: number, j: number, value: number) => {
    const cell = e.currentTarget.getBoundingClientRect();
    const matrix = matrixRef.current?.getBoundingClientRect();
    
    if (matrix) {
      setSelectedCell(`${i}-${j}`);
      setHoverData({
        col1: getSimpleName(uniqueColumns[i]),
        col2: getSimpleName(uniqueColumns[j]),
        value,
        x: cell.left + cell.width/2 - matrix.left,
        y: cell.top - matrix.top - 40
      });
    }
  };

  // Utility Functions
  const resetMatrixData = () => {
    setMatrix([]);
    setUniqueColumns([]);
    setCorrelationData([]);
    setAiSummary('');
  };

  const getColor = (value: number) => ({
    backgroundColor: `rgb(${255 - Math.round(255 * Math.abs(value))}, ${255 - Math.round(255 * Math.abs(value))}, 255)`,
    color: Math.abs(value) > 0.5 ? 'white' : 'black'
  });

  const getStrength = (v: number) => {
    const abs = Math.abs(v);
    if (abs > 0.8) return 'Very Strong';
    if (abs > 0.6) return 'Strong';
    if (abs > 0.4) return 'Moderate';
    if (abs > 0.2) return 'Weak';
    return 'Very Weak';
  };

  // Improved function to show column names more clearly
  const getSimpleName = (name: string) => {
    if (!name) return '';
    const parts = name.split('.');
    // Return just the column name without table prefix
    return parts.length > 1 ? parts[1] : parts[0];
  };

  // Function to get full column name for tooltips
  const getFullName = (name: string) => {
    if (!name) return '';
    return name;
  };

  // Get the cached timestamp for display
  const getCachedTimestamp = () => {
    try {
      const storedData = localStorage.getItem('globalCorrelationData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        return new Date(parsedData.timestamp).toLocaleTimeString();
      }
    } catch (error) {
      console.error("Error parsing stored timestamp:", error);
    }
    return null;
  };

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="mb-3 flex justify-between items-center bg-white rounded-lg p-2 shadow-md border border-gray-200">
        <div className="flex gap-2">
          <button 
            onClick={() => handleViewChange('global')}
            className={`px-3 py-2 rounded-md border text-base font-medium ${view === 'global' ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 border-gray-300'}`}
          >
            Global
          </button>
          <button 
            onClick={() => handleViewChange('custom')}
            className={`px-3 py-2 rounded-md border text-base font-medium ${view === 'custom' ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 border-gray-300'}`}
          >
            Custom
          </button>
        </div>

        <div className="flex items-center gap-2">
          {view === 'global' && getCachedTimestamp() && (
            <div className="text-xs text-gray-500">
              Cached: {getCachedTimestamp()}
            </div>
          )}
          <button
            onClick={() => setShowAI(!showAI)}
            className={`p-2 rounded-full border ${showAI ? 'bg-blue-600 text-white border-blue-700' : 'bg-blue-100 border-blue-200'}`}
          >
            <Bot className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* AI Tooltip */}
      {showAI && (
        <div className="mb-3 bg-blue-600 text-white rounded-lg shadow-md p-3 text-sm border border-blue-800">
          {aiSummary || 'No analysis available yet'}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-3 h-full">
        {/* Controls Panel */}
        {view === 'custom' && !isLoading && (
          <div className="lg:w-1/4 bg-white rounded-lg shadow-md p-3 flex flex-col h-full border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1 border-b border-gray-200">Select Data</h3>
            
            {/* Tables */}
            <div className="mb-2">
              <h4 className="text-xs font-medium text-gray-700 mb-1 pb-1 border-b border-gray-100">Tables</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {tables.map(table => (
                  <label key={table} className="flex items-center border border-gray-100 p-1 rounded hover:bg-blue-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(table)}
                      onChange={(e) => handleTableSelect(table, e.target.checked)}
                      className="mr-1"
                    />
                    <span className="truncate">{table}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Columns */}
            {selectedTables.length > 0 && (
              <div className="mb-2 flex-grow overflow-auto border border-gray-200 rounded p-1">
                <h4 className="text-xs font-medium text-gray-700 sticky top-0 bg-white pb-1 border-b border-gray-100">Columns</h4>
                <div className="h-32 overflow-y-auto text-xs">
                  {selectedTables.map(table => (
                    <div key={table} className="mb-1 pb-1 border-b border-gray-100 last:border-b-0">
                      <div className="font-medium">{table}</div>
                      {availableColumns[table]?.map(column => (
                        <label key={`${table}.${column}`} className="flex items-center ml-2 border border-gray-100 p-1 rounded my-1 hover:bg-blue-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(`${table}.${column}`)}
                            onChange={(e) => handleColumnSelect(`${table}.${column}`, e.target.checked)}
                            className="mr-1"
                          />
                          <span className="truncate">{column}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={fetchCustomCorrelation}
              disabled={selectedColumns.length < 2}
              className={`w-full py-2 rounded-md text-sm font-medium border ${
                selectedColumns.length < 2
                  ? 'bg-gray-200 cursor-not-allowed border-gray-300'
                  : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
              }`}
            >
              Calculate
            </button>
          </div>
        )}

        {/* Matrix Display - ENHANCED */}
        {!isLoading && matrix.length > 0 && (
          <div className={`${view === 'custom' ? 'lg:w-3/4' : 'w-full'}`}>
            <div ref={matrixRef} className="bg-white rounded-lg shadow-md p-3 relative overflow-hidden h-full border border-gray-200">
              {/* Enhanced Cell Hover Tooltip */}
              {hoverData && (
                <div 
                  className="absolute z-20 rounded-md shadow-lg bg-blue-600 text-white p-2 text-sm border border-blue-800 transform transition-transform duration-200 ease-in-out scale-110"
                  style={{ 
                    left: `${hoverData.x}px`, 
                    top: `${hoverData.y}px`,
                    transform: 'translate(-50%, -100%)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="font-medium">{hoverData.col1} × {hoverData.col2}</div>
                  <div className="font-bold text-lg">{hoverData.value.toFixed(2)}</div>
                  <div>{getStrength(hoverData.value)}</div>
                </div>
              )}
              
              {/* Enhanced Legend with larger buttons */}
              <div className="mb-2 flex justify-between items-center border-b border-gray-200 pb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Correlation Matrix
                  {uniqueColumns.length > 0 && <span className="ml-2 text-xs text-gray-500">({uniqueColumns.length} columns)</span>}
                </h3>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-white border border-gray-300 rounded-sm"></div>
                    <span className="ml-1 text-xs">0</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-blue-300 border border-blue-400 rounded-sm"></div>
                    <span className="ml-1 text-xs">0.5</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-blue-600 text-white text-center border border-blue-700 rounded-sm"></div>
                    <span className="ml-1 text-xs">0.7</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-blue-900 text-white text-center border border-blue-950 rounded-sm"></div>
                    <span className="ml-1 text-xs">1</span>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Matrix with Improved Column Names and Hover Effects */}
              <div className="overflow-auto" style={{maxHeight: "calc(100vh - 240px)"}}>
                <table className="text-xs w-full table-fixed border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1 w-20 border border-gray-300 bg-gray-50 sticky left-0 top-0 z-10"></th>
                      {uniqueColumns.map((col, idx) => (
                        <th 
                          key={idx} 
                          className="p-1 w-10 h-16 overflow-hidden border border-gray-300 bg-gray-50 sticky top-0 z-10"
                          onMouseEnter={() => setZoomedColumn(idx)}
                          onMouseLeave={() => setZoomedColumn(null)}
                          title={getFullName(col)} // Show full column name on hover
                        >
                          <div 
                            className="transform -rotate-45 origin-left truncate w-20 transition-all duration-200 whitespace-nowrap"
                            style={{
                              transform: zoomedColumn === idx ? 'rotate(-45deg) scale(1.2)' : 'rotate(-45deg)',
                              fontWeight: zoomedColumn === idx ? 'bold' : 'normal',
                              color: zoomedColumn === idx ? 'rgb(37, 99, 235)' : 'inherit',
                              textShadow: zoomedColumn === idx ? '0px 1px 2px rgba(0,0,0,0.1)' : 'none'
                            }}
                          >
                            {getSimpleName(col)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, i) => (
                      <tr key={i}>
                        <td 
                          className="p-1 font-medium truncate border border-gray-300 bg-gray-50 sticky left-0 z-10"
                          onMouseEnter={() => setZoomedColumn(i + 100)} // Use i+100 to differentiate from column headers
                          onMouseLeave={() => setZoomedColumn(null)}
                          title={getFullName(uniqueColumns[i])} // Show full column name on hover
                        >
                          <div 
                            className="transition-all duration-200 whitespace-nowrap"
                            style={{
                              fontWeight: zoomedColumn === i + 100 ? 'bold' : 'normal',
                              transform: zoomedColumn === i + 100 ? 'scale(1.05)' : 'scale(1)',
                              color: zoomedColumn === i + 100 ? 'rgb(37, 99, 235)' : 'inherit',
                              textShadow: zoomedColumn === i + 100 ? '0px 1px 2px rgba(0,0,0,0.1)' : 'none'
                            }}
                          >
                            {getSimpleName(uniqueColumns[i])}
                          </div>
                        </td>
                        {row.map((value, j) => (
                          <td
                            key={j}
                            className="p-0 border border-gray-300 transition-all duration-200 hover:shadow-lg"
                            style={{
                              ...getColor(value),
                              width: '10px',
                              height: '10px',
                              transition: 'all 0.2s ease-in-out',
                              transform: (selectedCell === `${i}-${j}`) ? 'scale(1.2)' : 'scale(1)',
                              boxShadow: (selectedCell === `${i}-${j}`) ? '0 4px 8px rgba(0, 0, 0, 0.15)' : 'none',
                              zIndex: (selectedCell === `${i}-${j}`) ? 5 : 'auto'
                            }}
                            onMouseEnter={(e) => handleCellHover(e, i, j, value)}
                            onMouseLeave={() => { setHoverData(null); setSelectedCell(null); }}
                          >
                            {/* No content needed - color shows correlation */}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnCorrelation;