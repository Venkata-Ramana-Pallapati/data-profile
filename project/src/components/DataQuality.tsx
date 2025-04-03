import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Database, FileCheck, AlertCircle, Info, X, Bot,Book,  ChevronUp, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ColumnMetrics {
  missing_values: number;
  null_values_percentage: number;
  completeness_percentage: number;
  uniqueness_percentage: number;
}

interface TableMetrics {
  table_name: string;
  total_rows: number;
  missing_values: number;
  duplicate_rows: number;
  null_values_percentage: number;
  completeness_percentage: number;
  uniqueness_percentage: number;
  columns: Record<string, ColumnMetrics>;
  llm_analysis: string;
}

const COLORS = {
  completeness: "#0088FE",
  uniqueness: "#00C49F",
  missing: "#FFBB28",
  duplicate: "#FF8042"
};
interface TableMetadata {
  [tableName: string]: string;
}

const DQCalculationDetails = {
  title: "Data Quality Score Calculation",
  formula: `Overall DQ = (Completeness% + Uniqueness% + (100 - MissingValues%) + (100 - DuplicateRows%)) / 4`,
  steps: [
    "1. Calculate Completeness: (Filled Fields / Total Fields) × 100",
    "2. Calculate Uniqueness: (Unique Records / Total Records) × 100",
    "3. Calculate Missing Value Impact: 100 - (Missing Fields / Total Fields × 100)",
    "4. Calculate Duplicate Impact: 100 - (Duplicate Records / Total Records × 100)",
    "5. Take average of all four metrics"
  ],
  example: `Example:
Completeness: 95%
Uniqueness: 88%
Missing Values: 5% → Impact: 95%
Duplicates: 12% → Impact: 88%
Final Score = (95 + 88 + 95 + 88) / 4 = 91.5%`
};

const CompletenessDetails = {
  title: "Completeness Calculation",
  formula: `table_completeness = (1 - (total_missing_values / total_cells)) * 100`,
  explanation: "Completeness measures the percentage of fields that are filled with valid data versus the total number of fields that could potentially contain data.",
  impact: [
    "Higher completeness means more reliable data for analysis",
    "Critical data fields should have higher completeness targets",
    "Low completeness may indicate data collection or entry issues"
  ],
  example: `Example:
Table with 500 rows and 8 columns (4,000 total fields)
600 fields contain missing data (3,400 fields are filled)
Completeness = (1 - (600 / 4,000)) × 100
= (1 - 0.15) × 100
= 0.85 × 100
= 85%`,
  recommendations: [
    "Improve data collection processes for low-completeness fields",
    "Implement validation rules to ensure critical fields are filled",
    "Consider making important fields mandatory in your forms/UI"
  ]
};

const UniquenessDetails = {
  title: "Uniqueness Calculation",
  formula: `Uniqueness% = (Number of Unique Records / Total Records) × 100`,
  explanation: "Uniqueness measures the percentage of records that are unique (not duplicated) in your dataset.",
  impact: [
    "Low uniqueness can skew analysis results and lead to incorrect conclusions",
    "Duplicate records waste storage and processing resources",
    "Uniqueness is especially critical for primary key fields"
  ],
  example: `Example:
Table with 1000 total records
50 records are duplicates (950 unique records)
Uniqueness = (950 / 1000) × 100 = 95%`,
  recommendations: [
    "Implement proper primary key constraints in your database",
    "Add deduplication processes to your data pipeline",
    "Review data entry processes that may lead to duplicates"
  ]
};

const MissingValuesDetails = {
  title: "Missing Values Calculation",
  formula: `Missing Values% = (Number of Missing Values / (Total Rows × Total Columns)) × 100`,
  explanation: "Missing values percentage represents the proportion of values that are NULL, empty, or otherwise missing in your dataset.",
  impact: [
    "Missing values can lead to biased analyses",
    "May require imputation before certain operations",
    "Critical fields with missing data should be prioritized"
  ],
  example: `Example:
Table with 1000 rows and 10 columns (10,000 possible values)
300 values are missing
Missing Values = (300 / 10,000) × 100 = 3%`,
  recommendations: [
    "Investigate data collection processes for fields with high missing rates",
    "Consider imputation strategies for analysis-critical fields",
    "Flag records with missing values in key fields"
  ]
};

const DuplicatesDetails = {
  title: "Duplicates Calculation",
  formula: `Duplicates% = (Number of Duplicate Rows / Total Rows) × 100`,
  explanation: "Duplicates percentage represents the proportion of rows that are exact copies of other rows in your dataset.",
  impact: [
    "Duplicate records can skew analysis results",
    "May lead to incorrect counts and aggregations",
    "Can cause issues with data processing and reporting"
  ],
  example: `Example:
Table with 1000 total rows
120 rows are duplicates
Duplicates = (120 / 1000) × 100 = 12%`,
  recommendations: [
    "Implement unique constraints in your database",
    "Add deduplication steps to your ETL processes",
    "Investigate source systems that generate duplicate data"
  ]
};

const DataQuality = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [data, setData] = useState<TableMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [showFormulaPopup, setShowFormulaPopup] = useState(false);
  const [showMetricInfo, setShowMetricInfo] = useState<{metric: string | null, table: string | null}>({metric: null, table: null});
  const [tableName, setTableName] = useState(window.selectedTableName || '');
  const [llmAnalysis, setLlmAnalysis] = useState<string>('');
  const [tableMetadata, setTableMetadata] = useState<TableMetadata>({});
  const [showTableSummary, setShowTableSummary] = useState(false);
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

  // Effect to fetch tables when component mounts
  useEffect(() => {
    fetchTables();
  }, []);

  // Effect to automatically trigger data quality analysis when tableName changes
  useEffect(() => {
    if (tableName) {
      // Set the selected table
      setSelectedTable(tableName);
      // Trigger data quality analysis
      handleFetchData(tableName);
    }
  }, [tableName]);

  // Backup effect in case tableName isn't set but tables are loaded
  useEffect(() => {
    if (tables.length > 0 && !selectedTable) {
      setSelectedTable(tables[0]);
      handleFetchData(tables[0]);
    }
  }, [tables]);




  const fetchTableMetadata = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/list-metadata/");
      if (!response.ok) throw new Error(`Failed to fetch table metadata! Status: ${response.status}`);
      const metadata = await response.json();
      setTableMetadata(metadata);
    } catch (error) {
      console.error("Error fetching table metadata:", error);
    }
  };

  // Add metadata fetch when component mounts or table changes
  useEffect(() => {
    fetchTableMetadata();
  }, []);


  const TableSummaryModal = ({ 
    tableName, 
    summary, 
    onClose 
  }: { 
    tableName: string, 
    summary: string, 
    onClose: () => void 
  }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      <motion.div 
        className="bg-white rounded-xl p-6 shadow-2xl max-w-lg w-full mx-4 relative z-10"
        onClick={e => e.stopPropagation()}
        whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
      >
        <div className="absolute top-3 right-3">
          <button onClick={onClose} className="transition-transform hover:rotate-90">
            <X className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
        <h3 className="text-2xl font-bold mb-4 text-indigo-700 flex items-center">
          <Book className="h-6 w-6 mr-2 text-indigo-500" />
          {tableName} Table Summary
        </h3>
        <div className="space-y-4 text-gray-700 leading-relaxed">
          <p>{summary}</p>
        </div>
      </motion.div>
    </motion.div>
  );
  const renderTableSummaryButton = (tableName: string) => {
    if (!tableMetadata[tableName]) return null;

    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setShowTableSummary(true);
        }}
        className="ml-2 p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
      >
        <Book className="h-5 w-5" />
      </motion.button>
    );
  };


  const fetchTables = async () => {
    setError(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/list-tables");
      if (!response.ok) throw new Error(`Failed to fetch tables! Status: ${response.status}`);
      const data = await response.json();
      setTables(Array.isArray(data.tables) ? data.tables : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch available tables.";
      setError(errorMessage);
      setTables([]);
    }
  };

  const handleFetchData = async (tableName: string) => {
    if (!tableName) {
      setError("Please select a table.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch data quality metrics
      const metricsResponse = await fetch(`http://127.0.0.1:8000/data-quality?table_names=${tableName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!metricsResponse.ok) throw new Error(`Data fetch error! Status: ${metricsResponse.status}`);
      const metricsResult: TableMetrics[] = await metricsResponse.json();
      
      // Fetch LLM analysis summary
      const llmResponse = await fetch(`http://127.0.0.1:8000/data-quality-summary/${tableName}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      console.log("hii",llmResponse)
      if (!llmResponse.ok) throw new Error(`LLM Analysis fetch error! Status: ${llmResponse.status}`);
      const llmResult = await llmResponse.json();
      console.log(llmResult['llm_analysis'])
      console.log(llmResult[tableName].llm_analysis)
      // Update state with both metrics and LLM analysis
      setData(metricsResult);
      setLlmAnalysis(llmResult[tableName].llm_analysis || 'No analysis available.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch data quality metrics";
      setError(errorMessage);
      setLlmAnalysis('Unable to generate AI analysis.');
    } finally {
      setLoading(false);
    }
  };
  const calculateOverallDQ = (tableMetrics: TableMetrics | undefined) => {
    if (!tableMetrics) return "N/A";
  
    const totalColumns = Object.keys(tableMetrics.columns || {}).length;
    const totalCells = (tableMetrics.total_rows || 1) * totalColumns; // Adjusted total count
  
    const scores = [
      tableMetrics.completeness_percentage ?? 0,
      tableMetrics.uniqueness_percentage ?? 0,
      100 - (((tableMetrics.missing_values ?? 0) / totalCells) * 100), // Adjusted for total cells
      100 - (((tableMetrics.duplicate_rows ?? 0) / (tableMetrics.total_rows || 1)) * 100)
    ];
  
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  const InfoPopup = ({ title, content, onClose, colorClass }: { title: string; content: React.ReactNode; onClose: () => void; colorClass?: string }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      <motion.div 
        className="bg-white rounded-xl p-6 shadow-2xl max-w-lg w-full mx-4 relative z-10"
        onClick={e => e.stopPropagation()}
        whileHover={{ boxShadow: "0 25pxrows_with_missing_values 50px -12px rgba(0, 0, 0, 0.25)" }}
      >
        <div className="absolute top-3 right-3">
          <button onClick={onClose} className="transition-transform hover:rotate-90">
            <X className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
        <h3 className={`text-2xl font-bold mb-4 ${colorClass || 'text-indigo-700'}`}>{title}</h3>
        <div className="space-y-4">
          {content}
        </div>
      </motion.div>
    </motion.div>
  );

  const FormulaPopup = ({ onClose }: { onClose: () => void }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      <motion.div 
        className="bg-white rounded-xl p-6 shadow-2xl max-w-lg w-full mx-4 relative z-10"
        onClick={e => e.stopPropagation()}
        whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
      >
        <div className="absolute top-3 right-3 flex space-x-2">
          <Eye className="h-6 w-6 text-indigo-600" />
          <button onClick={onClose} className="transition-transform hover:rotate-90">
            <X className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
        <h3 className="text-2xl font-bold mb-4 text-indigo-700">{DQCalculationDetails.title}</h3>
        <div className="space-y-6">
          <div className="bg-indigo-50 p-4 rounded-lg shadow-inner">
            <h4 className="font-semibold mb-2 text-indigo-900">Main Formula:</h4>
            <pre className="whitespace-pre-wrap font-mono text-sm text-indigo-900">{DQCalculationDetails.formula}</pre>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
            <h4 className="font-semibold mb-2 text-blue-900">Calculation Steps:</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              {DQCalculationDetails.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg shadow-inner">
            <h4 className="font-semibold mb-2 text-purple-900">Example Calculation:</h4>
            <pre className="whitespace-pre-wrap font-mono text-sm text-purple-900">{DQCalculationDetails.example}</pre>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // Metric Information Popups - Dynamic based on metric type
  const MetricInfoPopup = ({ metric, table, onClose }: { metric: string; table: string; onClose: () => void }) => {
    let details;
    let colorClass;

    switch (metric) {
      case "completeness":
        details = CompletenessDetails;
        colorClass = "text-blue-700";
        break;
      case "uniqueness":
        details = UniquenessDetails;
        colorClass = "text-green-700";
        break;
      case "missing":
        details = MissingValuesDetails;
        colorClass = "text-yellow-700";
        break;
      case "duplicate":
        details = DuplicatesDetails;
        colorClass = "text-orange-700";
        break;
      default:
        details = MissingValuesDetails;
        colorClass = "text-gray-700";
    }

    return (
      <InfoPopup
        title={details.title}
        colorClass={colorClass}
        content={
          <div className="space-y-4">
            <p className="text-gray-700">
              Information about <strong>{metric}</strong> in the <strong>{table}</strong> table.
            </p>
            <div className="bg-indigo-50 p-4 rounded-lg shadow-inner">
              <h4 className="font-semibold mb-2 text-indigo-900">Formula:</h4>
              <pre className="whitespace-pre-wrap font-mono text-sm text-indigo-900">{details.formula}</pre>
              <p className="mt-2 text-indigo-800">{details.explanation}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
              <h4 className="font-semibold mb-2 text-blue-900">Impact on Data Quality:</h4>
              <ul className="list-disc pl-5 text-blue-700 space-y-1">
                {details.impact.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg shadow-inner">
              <h4 className="font-semibold mb-2 text-purple-900">Example Calculation:</h4>
              <pre className="whitespace-pre-wrap font-mono text-sm text-purple-900">{details.example}</pre>
            </div>
            <div className="bg-green-50 p-4 rounded-lg shadow-inner">
              <h4 className="font-semibold mb-2 text-green-900">Recommended Actions:</h4>
              <ul className="list-disc pl-5 text-green-700 space-y-1">
                {details.recommendations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        }
        onClose={onClose}
      />
    );
  };

  const renderMetricPieChart = (value: number, label: string, color: string, onClick: () => void, tableName: string, metricType: string) => {
    // Ensure minimum value for visualization purposes (0.1% minimum to show color)
    const displayValue = value;
    const visualValue = value < 0.1 ? 0.1 : value;
    
    const pieData = [
      { name: label, value: visualValue },
      { name: 'Remaining', value: 100 - visualValue }
    ];

    return (
      <motion.div 
        className="relative"
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div 
          onClick={onClick}
          className="p-4 bg-white rounded-lg shadow-lg cursor-pointer border border-transparent hover:border-indigo-200 transition-all duration-300 hover:shadow-xl"
        >
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  fill={color}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#ffffff"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? color : '#f3f4f6'} 
                      fillOpacity={index === 0 ? 0.9 : 0.3}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <h4 className="font-semibold">{label}</h4>
            <p className="text-lg font-bold" style={{ color }}>{displayValue.toFixed(1)}%</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.2, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            setShowMetricInfo({ metric: metricType, table: tableName });
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 shadow-md"
        >
          <Info className="h-4 w-4 text-gray-600" />
        </motion.button>
      </motion.div>
    );
  };

  const renderBarChart = (label: string, dataset: Record<string, number>, color: string) => {
    const data = Object.entries(dataset).map(([name, value]) => ({ name, value }));
    
    return (
      <motion.div 
        className="bg-white p-6 rounded-lg shadow-lg h-80 border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-xl font-semibold mb-4">{label}</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
            <YAxis axisLine={false} tick={{ fill: '#666', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '8px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: 'none' 
              }} 
            />
            <Legend />
            <Bar 
              dataKey="value" 
              fill={color} 
              radius={[4, 4, 0, 0]} 
              barSize={35} 
              animationDuration={1500}
              label={{ position: 'top', fill: '#666', fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  const renderSummaryMetrics = (tableData: TableMetrics | undefined) => {
    if (!tableData) return null;
    
    const overallDQ = calculateOverallDQ(tableData);
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div 
          className="bg-white rounded-lg p-4 shadow-lg flex items-center relative group overflow-hidden"
          whileHover={{ scale: 1.02 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div 
            className="absolute left-0 bottom-0 h-full w-1"
            style={{ 
              background: `linear-gradient(to top, ${COLORS.completeness}, ${COLORS.uniqueness})` 
            }} 
          />
          <div className="rounded-full bg-blue-100 p-3 mr-4 shadow-inner">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Overall DQ Score</h4>
            <p className="text-2xl font-bold text-blue-600">{overallDQ}%</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.2, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFormulaPopup(true)}
            className="absolute top-2 right-2 p-2 rounded-full bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blue-100"
          >
            <Eye className="h-4 w-4 text-blue-600" />
          </motion.button>
        </motion.div>
        
        <motion.div 
          className="bg-white rounded-lg p-4 shadow-lg flex items-center overflow-hidden relative"
          whileHover={{ scale: 1.02 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div 
            className="absolute left-0 bottom-0 h-full w-1"
            style={{ 
              background: `linear-gradient(to top, ${COLORS.uniqueness}, ${COLORS.missing})` 
            }} 
          />
          <div className="rounded-full bg-green-100 p-3 mr-4 shadow-inner">
            <FileCheck className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Total rows processed</h4>
            <p className="text-2xl font-bold text-green-600">{tableData.total_rows.toLocaleString()}</p>
          </div>
        </motion.div>
      </div>
    );
  };

  const toggleDetail = (table: string, detail: string) => {
    setSelectedDetails((prev) => ({
      ...prev,
      [table]: prev[table] === detail ? null : detail,
    }));
  };

  const renderAIAnalysisBox = () => {
    return (
      <motion.div
        className="bg-gradient-to-br from-blue-100 to-indigo-100 p-4 rounded-lg shadow-lg h-full border border-blue-200"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {/* Table Summary Section */}
        {tableName && tableMetadata[tableName] && (
          <>
            <div className="flex items-center mb-4">
              <div className="bg-green-300 p-2 rounded-full shadow-md">
                <Book className="h-5 w-5 text-green-900" />
              </div>
              <h3 className="text-xl font-semibold text-green-700 ml-2">Table Summary</h3>
            </div>
            
            <div className="bg-green-100 p-6 rounded-lg shadow-sm border-l-4 border-green-300 max-h-48 overflow-y-auto">
              <p className="text-md text-green-800 leading-relaxed">
                {tableMetadata[tableName] || 'No summary available.'}
              </p>
            </div>
          </>
        )}
  
        {/* AI Analysis Section */}
        <div className="flex items-center mb-4 mt-4">
          <div className="bg-blue-300 p-2 rounded-full shadow-md">
            <Bot className="h-5 w-5 text-blue-900" />
          </div>
          <h3 className="text-xl font-semibold text-blue-700 ml-2">AI Analysis</h3>
        </div>
  
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm mb-4 border-l-4 border-blue-400 max-h-48 overflow-y-auto">
          <p className="text-md text-blue-800 leading-relaxed">
            {llmAnalysis || 'Generating AI-powered insights...'}
          </p>
        </div>
      </motion.div>
    );
  };

  if (!tableName) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-gray-800 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 bg-white rounded-lg shadow-lg"
        >
          <Database className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">No Table Selected</h3>
          <p className="text-gray-500">Please select a table to view data quality metrics.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-gray-800">
      <motion.h2 
        className="text-3xl font-bold mb-6 text-center text-indigo-800 drop-shadow-sm flex justify-center items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Data Quality Analysis
      </motion.h2>



      <AnimatePresence>
        {showTableSummary && tableName && tableMetadata[tableName] && (
          <TableSummaryModal
            tableName={tableName}
            summary={tableMetadata[tableName]}
            onClose={() => setShowTableSummary(false)}
          />
        )}
      </AnimatePresence>




      <AnimatePresence>
        {showFormulaPopup && <FormulaPopup onClose={() => setShowFormulaPopup(false)} />}
      </AnimatePresence>
      
      <AnimatePresence>
        {showMetricInfo.metric && showMetricInfo.table && (
          <MetricInfoPopup
            metric={showMetricInfo.metric}
            table={showMetricInfo.table}
            onClose={() => setShowMetricInfo({metric: null, table: null})}
          />
        )}
      </AnimatePresence>

      {loading && (
        <div className="text-center py-8">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-2"
          />
          <p className="text-indigo-700">Loading data...</p>
        </div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-100 text-red-700 rounded-md border-l-4 border-red-500 shadow-md"
        >
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </motion.div>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-12 gap-6">
          {/* Main Visualization Area - 9 columns */}
          <div className="col-span-9">
            {data.map((tableData, tableIndex) => (
              <motion.div 
                key={tableData.table_name} 
                className="mb-8 p-6 bg-white bg-opacity-80 rounded-xl shadow-lg border border-gray-100"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tableIndex * 0.2 }}
              >
                <h3 className="text-xl font-bold mb-4 text-indigo-800 border-b pb-2">{tableData.table_name}</h3>
                {renderSummaryMetrics(tableData)}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {renderMetricPieChart(
                    tableData.completeness_percentage,
                    "Completeness",
                    COLORS.completeness,
                    () => toggleDetail(tableData.table_name, "completeness"),
                    tableData.table_name,
                    "completeness"
                  )}
                  {renderMetricPieChart(
                    tableData.uniqueness_percentage,
                    "Uniqueness",
                    COLORS.uniqueness,
                    () => toggleDetail(tableData.table_name, "uniqueness"),
                    tableData.table_name,
                    "uniqueness"
                  )}
                 {renderMetricPieChart(
    (tableData.missing_values / (tableData.total_rows * Object.keys(tableData.columns).length)) * 100,
    "Missing Values",
    COLORS.missing,
    () => toggleDetail(tableData.table_name, "missing"),
    tableData.table_name,
    "missing"
  )}
  {renderMetricPieChart(
    (tableData.duplicate_rows / tableData.total_rows) * 100,
    "Duplicates",
    COLORS.duplicate,
    () => toggleDetail(tableData.table_name, "duplicates"),
    tableData.table_name,
    "duplicate"
  )}
</div>

<AnimatePresence>
  {selectedDetails[tableData.table_name] === "completeness" && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mt-6 overflow-hidden"
    >
      <div className="bg-blue-50 p-4 rounded-lg shadow-inner mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-blue-800 flex items-center">
            <ChevronUp className="h-5 w-5 mr-1" />
            Column Completeness Analysis
          </h3>
          <button 
            onClick={() => toggleDetail(tableData.table_name, "")}
            className="text-blue-500 hover:text-blue-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {renderBarChart(
          "Column Completeness (%)",
          Object.fromEntries(
            Object.entries(tableData.columns).map(([column, metrics]) => [
              column,
              metrics.completeness_percentage
            ])
          ),
          COLORS.completeness
        )}
      </div>
    </motion.div>
  )}

  {selectedDetails[tableData.table_name] === "uniqueness" && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mt-6 overflow-hidden"
    >
      <div className="bg-green-50 p-4 rounded-lg shadow-inner mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-green-800 flex items-center">
            <ChevronUp className="h-5 w-5 mr-1" />
            Column Uniqueness Analysis
          </h3>
          <button 
            onClick={() => toggleDetail(tableData.table_name, "")}
            className="text-green-500 hover:text-green-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {renderBarChart(
          "Column Uniqueness (%)",
          Object.fromEntries(
            Object.entries(tableData.columns).map(([column, metrics]) => [
              column,
              metrics.uniqueness_percentage
            ])
          ),
          COLORS.uniqueness
        )}
      </div>
    </motion.div>
  )}

  {selectedDetails[tableData.table_name] === "missing" && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mt-6 overflow-hidden"
    >
      <div className="bg-yellow-50 p-4 rounded-lg shadow-inner mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-yellow-800 flex items-center">
            <ChevronUp className="h-5 w-5 mr-1" />
            Column Missing Values Analysis
          </h3>
          <button 
            onClick={() => toggleDetail(tableData.table_name, "")}
            className="text-yellow-500 hover:text-yellow-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {renderBarChart(
          "Missing Values by Column (%)",
          Object.fromEntries(
            Object.entries(tableData.columns).map(([column, metrics]) => [
              column,
              metrics.null_values_percentage
            ])
          ),
          COLORS.missing
        )}
      </div>
    </motion.div>
  )}

  {selectedDetails[tableData.table_name] === "duplicates" && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mt-6 overflow-hidden"
    >
      <div className="bg-orange-50 p-4 rounded-lg shadow-inner mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-orange-800 flex items-center">
            <ChevronUp className="h-5 w-5 mr-1" />
            Column Duplicates Analysis
          </h3>
          <button 
            onClick={() => toggleDetail(tableData.table_name, "")}
            className="text-orange-500 hover:text-orange-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-700 mb-4">
          This table has {tableData.duplicate_rows} duplicate rows 
          ({((tableData.duplicate_rows / tableData.total_rows) * 100).toFixed(2)}% of total)
        </p>
      </div>
    </motion.div>
  )}
</AnimatePresence>
</motion.div>
))}
</div>

{/* Sidebar - 3 columns */}
<div className="col-span-3">
    {(llmAnalysis || data.length > 0) && (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="sticky top-4 mt-4"
      >
        {renderAIAnalysisBox()}
      </motion.div>
    )}
  </div>
</div>
)}
</div>
);
};

export default DataQuality;