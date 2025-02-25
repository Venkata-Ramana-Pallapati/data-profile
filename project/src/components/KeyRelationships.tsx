import React, { useEffect, useState } from 'react';

interface ForeignKeyReference {
  column: string[];
  references_table: string;
  references_column: string[];
}

interface TableSchema {
  primary_keys: string[];
  foreign_keys: ForeignKeyReference[];
}

interface ApiResponse {
  message: string;
  key_relationships: {
    key_relationships: Record<string, TableSchema>;
  };
}

interface TransformedData {
  primary_keys: Record<string, string>;
  foreign_keys: Record<string, string[]>;
  relationships: Array<{
    table: string;
    references_table: string;
    foreign_key: string;
  }>;
}

const SchemaVisualizer: React.FC = () => {
  const [data, setData] = useState<TransformedData | null>(null);
  const [activeView, setActiveView] = useState<'flow' | 'network'>('flow');
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/analyze-keys")
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((apiResponse: { primary_keys: Record<string, string>; foreign_keys: Record<string, string[]> }) => {
        console.log("API Response:", apiResponse); // Debugging log
  
        if (!apiResponse.primary_keys || !apiResponse.foreign_keys) {
          throw new Error("Invalid API response format");
        }
  
        const transformedData: TransformedData = {
          primary_keys: {},
          foreign_keys: {},
          relationships: [],
        } as TransformedData; // ✅ Fix for TypeScript error
  
        // Process primary keys
        Object.entries(apiResponse.primary_keys).forEach(([tableName, pk]) => {
          transformedData.primary_keys[tableName] = String(pk); // ✅ Ensure pk is a string
        });
  
        // Process foreign keys
        Object.entries(apiResponse.foreign_keys).forEach(([tableName, fks]) => {
          transformedData.foreign_keys[tableName] = [];
  
          if (Array.isArray(fks) && fks.length > 0) {
            fks.forEach((fk) => {
              const fkDisplay = `${String(fk)} → (Referenced Table Unknown)`; // ✅ Ensure fk is a string
              transformedData.foreign_keys[tableName].push(fkDisplay);
  
              // Infer referenced table
              const referencedTable = Object.keys(apiResponse.primary_keys).find(
                (t) => apiResponse.primary_keys[t] === fk
              );
  
              if (referencedTable) {
                transformedData.relationships.push({
                  table: tableName,
                  references_table: referencedTable,
                  foreign_key: String(fk), // ✅ Ensure it's a string
                });
              }
            });
          }
        });
  
        setData(transformedData);
        setError(null);
      })
      .catch((error) => {
        console.error("Error fetching schema data:", error);
        setError("Failed to load schema data. Please check your API response.");
      });
  }, []);
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-2xl font-semibold text-gray-700">
          Loading schema data...
        </div>
      </div>
    );
  }

  const FlowView = () => (
    <div className="p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-100 backdrop-blur-lg shadow-lg rounded-2xl">
      <h2 className="text-xl font-bold mb-4 text-purple-600">Flow View</h2>
      <div className="grid grid-cols-2 gap-6">
        {Object.keys(data.primary_keys).map(tableName => (
          <div
            key={tableName}
            className="p-6 rounded-lg shadow-md bg-gradient-to-r from-purple-50 via-purple-100 to-purple-200 border border-purple-300 transition-all hover:bg-gradient-to-r hover:from-purple-300 hover:via-purple-400 hover:to-purple-500 hover:scale-105 hover:shadow-xl"
          >
            <div className="font-bold text-lg text-purple-800">{tableName}</div>
            <div className="text-md text-gray-600">PK: {data.primary_keys[tableName]}</div>
            {data.foreign_keys[tableName]?.length > 0 && (
              <div className="text-md text-gray-500 mt-2">
                <div className="font-semibold mb-1">Foreign Keys:</div>
                {data.foreign_keys[tableName].map((fk, index) => (
                  <div key={index} className="text-sm">{fk}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const NetworkView = () => {
    const centerX = 400;
    const centerY = 300;
    const radius = 250;
    const tables = Object.keys(data.primary_keys);

    return (
      <div className="w-full h-[600px] relative overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50 to-teal-100 p-6 rounded-2xl shadow-2xl">
        <svg width="800" height="600" className="mx-auto">
          {data.relationships.map((rel, idx) => {
            const startAngle = (tables.indexOf(rel.table) * 2 * Math.PI) / tables.length;
            const endAngle = (tables.indexOf(rel.references_table) * 2 * Math.PI) / tables.length;
            
            const startX = centerX + radius * Math.cos(startAngle);
            const startY = centerY + radius * Math.sin(startAngle);
            const endX = centerX + radius * Math.cos(endAngle);
            const endY = centerY + radius * Math.sin(endAngle);
            
            return (
              <g key={idx}>
                <line 
                  x1={startX} 
                  y1={startY} 
                  x2={endX} 
                  y2={endY} 
                  stroke="#7C3AED" 
                  strokeWidth="2" 
                  markerEnd="url(#arrowhead)" 
                />
                <text 
                  x={(startX + endX) / 2} 
                  y={(startY + endY) / 2} 
                  className={`text-xs font-semibold transition-all duration-300 ${hoveredTable === rel.table ? 'fill-gray-900' : 'fill-gray-500'}`}
                >
                  FK: {rel.foreign_key}
                </text>
              </g>
            );
          })}
          {tables.map((tableName, idx) => {
            const angle = (idx * 2 * Math.PI) / tables.length;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            const isHovered = hoveredTable === tableName;
            
            return (
              <g key={tableName}>
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isHovered ? 60 : 50} 
                  fill={isHovered ? "#9F7AEA" : "#F3F4F6"} 
                  stroke={isHovered ? "#7C3AED" : "#D1D5DB"} 
                  strokeWidth="2"
                  className="transition-all duration-300"
                  onMouseEnter={() => setHoveredTable(tableName)}
                  onMouseLeave={() => setHoveredTable(null)}
                />
                <text 
                  x={x} 
                  y={y - 15} 
                  textAnchor="middle" 
                  className={`text-sm font-medium transition-colors duration-300 ${isHovered ? 'fill-white' : 'fill-black'}`}
                >
                  {tableName}
                </text>
                <text 
                  x={x} 
                  y={y + 5} 
                  textAnchor="middle" 
                  className={`text-xs transition-all duration-300 ${isHovered ? 'fill-gray-200' : 'fill-gray-700'}`}
                >
                  PK: {data.primary_keys[tableName]}
                </text>
              </g>
            );
          })}
          <defs>
            <marker 
              id="arrowhead" 
              markerWidth="10" 
              markerHeight="7" 
              refX="9" 
              refY="3.5" 
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#7C3AED" />
            </marker>
          </defs>
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-100 to-gray-300 p-6">
      <div className="max-w-7xl w-full bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">Database Schema Visualizer</h1>
        <div className="flex justify-center space-x-4 mb-6">
          <button 
            onClick={() => setActiveView('flow')} 
            className={`px-5 py-2.5 rounded-xl font-semibold text-lg transition-all ${activeView === 'flow' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
          >
            Flow View
          </button>
          <button 
            onClick={() => setActiveView('network')} 
            className={`px-5 py-2.5 rounded-xl font-semibold text-lg transition-all ${activeView === 'network' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
          >
            Network View
          </button>
        </div>
        {activeView === 'flow' && <FlowView />}
        {activeView === 'network' && <NetworkView />}
      </div>
    </div>
  );
};

export default SchemaVisualizer;