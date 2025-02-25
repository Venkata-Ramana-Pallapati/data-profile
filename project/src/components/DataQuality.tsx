import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Database, FileCheck, AlertCircle, Menu, Info, X, Calculator, Bot, ChevronDown, ChevronUp } from "lucide-react";
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

interface TableSummary {
  summary: string;
  isExpanded: boolean;
}

const COLORS = {
  completeness: "#0088FE",
  uniqueness: "#00C49F",
  missing: "#FFBB28",
  duplicate: "#FF8042"
};

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

export function DataQuality() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [data, setData] = useState<TableMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [showFormulaPopup, setShowFormulaPopup] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [tableSummaries, setTableSummaries] = useState<Record<string, TableSummary>>({});
  const [showMissingInfo, setShowMissingInfo] = useState<string | null>(null);
  const [showDuplicateInfo, setShowDuplicateInfo] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (tables.length > 0 && !selectedTable) {
      setSelectedTable(tables[0]);
      handleFetchData(tables[0]);
    }
  }, [tables]);

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

  const handleTableSelection = async (tableName: string) => {
    setSelectedTable(tableName);
    await handleFetchData(tableName);
  };

  const handleFetchData = async (tableName: string) => {
    if (!tableName) {
      setError("Please select a table.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/data-quality?table_names=${tableName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error(`Data fetch error! Status: ${response.status}`);

      const result: TableMetrics[] = await response.json();
      setData(result);
      
      const newSummaries = result.reduce((acc, table) => ({
        ...acc,
        [table.table_name]: {
          summary: table.llm_analysis,
          isExpanded: false
        }
      }), {});
      
      setTableSummaries(newSummaries);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch data quality metrics";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallDQ = (tableMetrics: TableMetrics | undefined) => {
    if (!tableMetrics) return "N/A";
    
    const scores = [
      tableMetrics.completeness_percentage ?? 0,
      tableMetrics.uniqueness_percentage ?? 0,
      100 - (((tableMetrics.missing_values ?? 0) / (tableMetrics.total_rows || 1)) * 100),
      100 - (((tableMetrics.duplicate_rows ?? 0) / (tableMetrics.total_rows || 1)) * 100)
    ];
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  const InfoPopup = ({ title, content, onClose }: { title: string; content: React.ReactNode; onClose: () => void }) => (
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
        <h3 className="text-2xl font-bold mb-4 text-indigo-700">{title}</h3>
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
          <Calculator className="h-6 w-6 text-indigo-600" />
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

  const RoboticDescription = () => {
    const analysisData = data.map(table => ({
      tableName: table.table_name,
      analysis: table.llm_analysis,
      metrics: {
        dqScore: calculateOverallDQ(table),
        completeness: table.completeness_percentage.toFixed(1),
        uniqueness: table.uniqueness_percentage.toFixed(1),
        missingValues: ((table.missing_values / table.total_rows) * 100).toFixed(1)
      }
    }));

    return (
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        className="fixed top-20 right-4 bg-gradient-to-br from-slate-800 via-blue-800 to-indigo-800 text-white p-6 rounded-lg shadow-xl w-96 z-50 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Bot className="h-8 w-8 mr-3 text-blue-300" />
            <h3 className="text-xl font-bold">AI Data Analysis</h3>
          </div>
          <button 
            onClick={() => setShowDescription(false)} 
            className="text-gray-400 hover:text-white transition-transform hover:rotate-90"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {analysisData.length > 0 ? (
          <div className="space-y-6">
            {analysisData.map((table, index) => (
              <motion.div 
                key={index} 
                className="bg-white bg-opacity-10 p-4 rounded-lg backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <h4 className="font-semibold text-blue-300 mb-2">{table.tableName}</h4>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-black bg-opacity-20 p-2 rounded shadow-inner">
                    <p className="text-xs text-blue-300">DQ Score</p>
                    <p className="text-lg font-bold">{table.metrics.dqScore}%</p>
                  </div>
                  <div className="bg-black bg-opacity-20 p-2 rounded shadow-inner">
                    <p className="text-xs text-blue-300">Completeness</p>
                    <p className="text-lg font-bold">{table.metrics.completeness}%</p>
                  </div>
                  <div className="bg-black bg-opacity-20 p-2 rounded shadow-inner">
                    <p className="text-xs text-blue-300">Uniqueness</p>
                    <p className="text-lg font-bold">{table.metrics.uniqueness}%</p>
                  </div>
                  <div className="bg-black bg-opacity-20 p-2 rounded shadow-inner">
                    <p className="text-xs text-blue-300">Missing Values</p>
                    <p className="text-lg font-bold">{table.metrics.missingValues}%</p>
                  </div>
                </div>
                <div className="text-sm mt-3">
                  <p className="text-gray-300">{table.analysis}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-blue-400 mb-4" />
            <p className="text-gray-300">No analysis available. Please select and analyze tables first.</p>
          </div>
        )}
      </motion.div>
    );
  };

  const renderMetricPieChart = (value: number, label: string, color: string, onClick: () => void, tableName: string) => {
    const pieData = [
      { name: label, value: value },
      { name: 'Remaining', value: 100 - value }
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
            <p className="text-lg font-bold" style={{ color }}>{value.toFixed(1)}%</p>
          </div>
        </div>
        {(label === "Missing Values" || label === "Duplicates") && (
          <motion.button
            whileHover={{ scale: 1.2, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (label === "Missing Values") {
                setShowMissingInfo(tableName);
              } else {
                setShowDuplicateInfo(tableName);
              }
            }}
            className="absolute top-2 right-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 shadow-md"
          >
            <Info className="h-4 w-4 text-gray-600" />
          </motion.button>
        )}
      </motion.div>
    );
  };

  const renderBarChart = (label: string, dataset: Record<string, number>, color: string) => {
    let data;

    if (label.includes("Duplicate")) {
      data = [
        { name: "Total Rows", value: dataset["Total Rows"] },
        { name: "Unique Rows", value: dataset["Total Rows"] - dataset["Duplicate Rows"] },
        { name: "Duplicate Rows", value: dataset["Duplicate Rows"] }
      ];
    } else {
      data = Object.entries(dataset).map(([name, value]) => ({ name, value }));
    }
    
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
            <Calculator className="h-4 w-4 text-blue-600" />
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

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-gray-800">
      <motion.h2 
        className="text-3xl font-bold mb-6 text-center text-indigo-800 drop-shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Data Quality Analysis
      </motion.h2>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowDescription(true)}
        className="fixed top-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all z-50 group"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Bot className="h-6 w-6" />
        <span className="absolute right-full mr-2 bg-white text-indigo-600 px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-lg">
          Show AI Analysis
        </span>
      </motion.button>

      <AnimatePresence>
        {showFormulaPopup && <FormulaPopup onClose={() => setShowFormulaPopup(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showDescription && <RoboticDescription />}
      </AnimatePresence>

      <div className="flex gap-6">
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="w-1/4 bg-white rounded-lg p-4 shadow-xl h-fit border border-gray-100"
        >
          <h3 className="text-lg font-semibold mb-4 text-indigo-700 border-b pb-2">Available Tables</h3>
          <div className="space-y-2">
            {tables.map((table, index) => (
              <motion.button
                key={table}
                onClick={() => handleTableSelection(table)}
                className={`w-full text-left px-4 py-2 rounded-md transition-all duration-300 ${
                  selectedTable === table 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'hover:bg-indigo-100'
                }`}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {table}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-1"
        >
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
            <div className="space-y-8">
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
                      tableData.table_name
                    )}
                    {renderMetricPieChart(
                      tableData.uniqueness_percentage,
                      "Uniqueness",
                      COLORS.uniqueness,
                      () => toggleDetail(tableData.table_name, "uniqueness"),
                      tableData.table_name
                    )}
                    {renderMetricPieChart(
                      (tableData.missing_values / tableData.total_rows) * 100,
                      "Missing Values",
                      COLORS.missing,
                      () => toggleDetail(tableData.table_name, "missing"),
                      tableData.table_name
                    )}
                    {renderMetricPieChart(
                      (tableData.duplicate_rows / tableData.total_rows) * 100,
                      "Duplicates",
                      COLORS.duplicate,
                      () => toggleDetail(tableData.table_name, "duplicate"),
                      tableData.table_name
                    )}
                  </div>

                  <AnimatePresence>
                    {selectedDetails[tableData.table_name] && (
                      <motion.div 
                        className="mt-6"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {selectedDetails[tableData.table_name] === "completeness" &&
                          renderBarChart("Completeness by Column", 
                            Object.fromEntries(
                              Object.entries(tableData.columns).map(([col, val]) => [col, val.completeness_percentage])
                            ), 
                            COLORS.completeness
                          )}
                        {selectedDetails[tableData.table_name] === "uniqueness" &&
                          renderBarChart("Uniqueness by Column", 
                            Object.fromEntries(
                              Object.entries(tableData.columns).map(([col, val]) => [col, val.uniqueness_percentage])
                            ), 
                            COLORS.uniqueness
                          )}
                        {selectedDetails[tableData.table_name] === "missing" &&
                          renderBarChart("Missing Values by Column", 
                            Object.fromEntries(
                              Object.entries(tableData.columns).map(([col, val]) => [col, val.missing_values])
                            ), 
                            COLORS.missing
                          )}
                       
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showMissingInfo === tableData.table_name && (
                      <InfoPopup
                        title="Missing Values Details"
                        content={
                          <div>
<p className="text-lg mb-4 flex items-center">
                              <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                              <span>Missing values can impact data analysis accuracy</span>
                            </p>
                            <div className="bg-amber-50 p-4 rounded-lg mb-4">
                              <h4 className="font-semibold text-amber-700 mb-2">Impact on Analysis:</h4>
                              <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">
                                <li>Statistical calculations may be skewed</li>
                                <li>Machine learning models may produce biased results</li>
                                <li>Visualizations might be incomplete or misleading</li>
                                <li>Business decisions based on incomplete data can be costly</li>
                              </ul>
                            </div>
                            <h4 className="font-semibold mb-2">Recommended Actions:</h4>
                            <ol className="list-decimal pl-5 space-y-1 text-sm">
                              <li>Identify patterns in missing data (random vs. systematic)</li>
                              <li>For columns with &lt;5% missing values, consider imputation</li>
                              <li>For columns with &gt;20% missing values, consider excluding from analysis</li>
                              <li>Review data collection processes to prevent future missing values</li>
                            </ol>
                          </div>
                        }
                        onClose={() => setShowMissingInfo(null)}
                      />
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showDuplicateInfo === tableData.table_name && (
                      <InfoPopup
                        title="Duplicate Rows Analysis"
                        content={
                          <div>
                            <p className="text-lg mb-4 flex items-center">
                              <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                              <span>Duplicate records can distort analysis results</span>
                            </p>
                            <div className="bg-orange-50 p-4 rounded-lg mb-4">
                              <h4 className="font-semibold text-orange-700 mb-2">Impact on Analysis:</h4>
                              <ul className="list-disc pl-5 space-y-1 text-sm text-orange-700">
                                <li>Overrepresentation of certain data points</li>
                                <li>Skewed aggregations and statistical measures</li>
                                <li>Biased machine learning models</li>
                                <li>Inflated counts and metrics</li>
                              </ul>
                            </div>
                            <h4 className="font-semibold mb-2">Recommended Actions:</h4>
                            <ol className="list-decimal pl-5 space-y-1 text-sm">
                              <li>Identify and remove exact duplicates</li>
                              <li>Investigate near-duplicates with slight variations</li>
                              <li>Implement unique constraints in your database</li>
                              <li>Review data integration processes for potential duplication sources</li>
                            </ol>
                          </div>
                        }
                        onClose={() => setShowDuplicateInfo(null)}
                      />
                    )}
                  </AnimatePresence>

                  <motion.div 
                    className="mt-6 bg-blue-50 rounded-lg p-4 cursor-pointer border border-blue-100"
                    onClick={() => {
                      setTableSummaries({
                        ...tableSummaries,
                        [tableData.table_name]: {
                          ...tableSummaries[tableData.table_name],
                          isExpanded: !tableSummaries[tableData.table_name]?.isExpanded
                        }
                      });
                    }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Bot className="h-5 w-5 mr-2 text-blue-600" />
                        <h4 className="font-semibold text-blue-700">AI Analysis Summary</h4>
                      </div>
                      {tableSummaries[tableData.table_name]?.isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-blue-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    
                    <AnimatePresence>
                      {tableSummaries[tableData.table_name]?.isExpanded && (
                        <motion.div 
                          className="mt-3 text-blue-800"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="text-sm">{tableSummaries[tableData.table_name]?.summary || "No analysis available."}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && data.length === 0 && !error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8 mt-4 bg-white bg-opacity-80 rounded-lg shadow-md p-6"
            >
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">No Data Available</h3>
              <p className="text-gray-500">Select a table from the sidebar to view data quality metrics.</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}