import React, { useEffect, useState } from 'react';

interface TransformedData {
  primary_keys: Record<string, string>;
  foreign_keys: Record<string, string[]>;
  relationships: Array<{
    table: string;
    references_table: string;
    foreign_key: string;
  }>;
}

const SchemaNetworkVisualizer: React.FC = () => {
  const [data, setData] = useState<TransformedData | null>(null);
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
        console.log("API Response:", apiResponse);
  
        if (!apiResponse.primary_keys || !apiResponse.foreign_keys) {
          throw new Error("Invalid API response format");
        }
  
        const transformedData: TransformedData = {
          primary_keys: {},
          foreign_keys: {},
          relationships: [],
        };
  
        // Process primary keys
        Object.entries(apiResponse.primary_keys).forEach(([tableName, pk]) => {
          transformedData.primary_keys[tableName] = String(pk);
        });
  
        // Process foreign keys
        Object.entries(apiResponse.foreign_keys).forEach(([tableName, fks]) => {
          transformedData.foreign_keys[tableName] = [];
  
          if (Array.isArray(fks) && fks.length > 0) {
            fks.forEach((fk) => {
              const fkDisplay = `${String(fk)} → (Referenced Table Unknown)`;
              transformedData.foreign_keys[tableName].push(fkDisplay);
  
              // Infer referenced table
              const referencedTable = Object.keys(apiResponse.primary_keys).find(
                (t) => apiResponse.primary_keys[t] === fk
              );
  
              if (referencedTable) {
                transformedData.relationships.push({
                  table: tableName,
                  references_table: referencedTable,
                  foreign_key: String(fk),
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

  const NetworkView = () => {
    const centerX = 400;
    const centerY = 300;
    const radius = 250;
    const tables = Object.keys(data.primary_keys);

    return (
      <div className="w-full h-screen bg-gradient-to-r from-blue-50 via-indigo-50 to-teal-100 p-6">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">Database Schema Network View</h1>
        <div className="w-full h-[600px] relative overflow-hidden bg-white/80 p-6 rounded-2xl shadow-2xl">
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
      </div>
    );
  };

  return <NetworkView />;
};

export default SchemaNetworkVisualizer;