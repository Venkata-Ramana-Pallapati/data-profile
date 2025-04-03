import React, { useEffect, useState, useRef } from 'react';

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
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [svgSize, setSvgSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle window resize and container size calculation
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        // Use the actual container dimensions for better accuracy
        const containerWidth = Math.max(containerRef.current.clientWidth - 40, 800);
        const containerHeight = Math.max(window.innerHeight - 200, 600);
        setSvgSize({ width: containerWidth, height: containerHeight });
      }
    };

    handleResize(); // Initial calculation
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLoading(true);
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
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching schema data:", error);
        setError("Failed to load schema data. Please check your API response.");
        setLoading(false);
      });
  }, []);

  const handleTableClick = (tableName: string) => {
    if (selectedTable === tableName) {
      setSelectedTable(null);
    } else {
      setSelectedTable(tableName);
    }
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-red-50 via-pink-50 to-red-100">
        <div className="bg-red-100 border-l-4 border-red-500 p-8 rounded-lg shadow-xl text-red-700 max-w-lg">
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p className="mb-4">{error}</p>
          <button 
            className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition-colors duration-300 shadow-md"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200">
        <div className="bg-white/90 p-10 rounded-2xl shadow-2xl text-center">
          <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <div className="text-2xl font-semibold text-indigo-800">
            Loading schema data...
          </div>
          <p className="text-indigo-500 mt-2">Fetching your database structure</p>
        </div>
      </div>
    );
  }

  const NetworkView = () => {
    const tables = Object.keys(data.primary_keys);
    const tableCount = tables.length;
    
    // Adjusted calculations for better centering
    const centerX = svgSize.width / 2;
    const centerY = svgSize.height / 2;
    
    // Dynamically adjust radius based on table count and container size
    const minDimension = Math.min(svgSize.width, svgSize.height);
    const baseRadius = minDimension * 0.38;
    
    // Scale radius based on number of tables to prevent overcrowding
    let radius = baseRadius;
    if (tableCount > 8) {
      // Gradually increase radius for more tables
      radius = baseRadius * (1 + (tableCount - 8) * 0.04);
    }
    
    // Ensure radius doesn't exceed container boundaries
    radius = Math.min(radius, minDimension * 0.45);

    // Generate colors for tables
    const getTableColor = (index: number, isSelected: boolean, isHovered: boolean, isRelated: boolean) => {
      // Ensure index is a valid non-negative number
      const safeIndex = Math.max(0, index || 0);
      
      const baseColors = [
        { main: "#8B5CF6", light: "#C4B5FD", dark: "#6D28D9" }, // Purple
        { main: "#EC4899", light: "#F9A8D4", dark: "#BE185D" }, // Pink
        { main: "#3B82F6", light: "#93C5FD", dark: "#1D4ED8" }, // Blue
        { main: "#10B981", light: "#A7F3D0", dark: "#047857" }, // Green
        { main: "#F59E0B", light: "#FCD34D", dark: "#B45309" }, // Amber
        { main: "#EF4444", light: "#FCA5A5", dark: "#B91C1C" }, // Red
        { main: "#06B6D4", light: "#A5F3FC", dark: "#0E7490" }, // Cyan
      ];
      
      // Use a default color if the index is out of bounds
      const colorSet = baseColors[safeIndex % baseColors.length] || baseColors[0];
      
      if (isSelected) return colorSet.dark;
      if (isHovered) return colorSet.main;
      if (isRelated) return colorSet.light;
      return "#F3F4F6"; // Default light gray
    };

    // Get relationships for a specific table
    const getTableRelationships = (tableName: string) => {
      return {
        outgoing: data.relationships.filter(rel => rel.table === tableName),
        incoming: data.relationships.filter(rel => rel.references_table === tableName)
      };
    };

    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-200 p-6 md:p-8" ref={containerRef}>
        <div className="w-full mx-auto overflow-hidden">
          <h1 className="text-3xl md:text-4xl font-extrabold text-center text-gray-800 mb-6 md:mb-8">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
              Database Schema Network View
            </span>
          </h1>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-4 md:p-8 overflow-hidden border border-indigo-100 flex justify-center">
            <svg 
              width={svgSize.width} 
              height={svgSize.height} 
              viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
              preserveAspectRatio="xMidYMid meet"
              className="mx-auto"
            >
              {/* Background gradient */}
              <defs>
                <radialGradient id="bg-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="#F5F3FF" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#EEF2FF" stopOpacity="0.1" />
                </radialGradient>
              </defs>
              <rect x="0" y="0" width={svgSize.width} height={svgSize.height} fill="url(#bg-gradient)" />
              
              {/* Draw relationships */}
              {data.relationships.map((rel, idx) => {
                // Calculate angles for nodes based on their position in the table array
                const startTableIndex = tables.indexOf(rel.table);
                const endTableIndex = tables.indexOf(rel.references_table);
                
                // Ensure valid indexes (could be -1 if table not found)
                if (startTableIndex === -1 || endTableIndex === -1) {
                  return null; // Skip this relationship if tables not found
                }
                
                const startAngle = (startTableIndex * 2 * Math.PI) / tableCount;
                const endAngle = (endTableIndex * 2 * Math.PI) / tableCount;
                
                // Calculate precise coordinates for start and end points
                const startX = centerX + radius * Math.cos(startAngle);
                const startY = centerY + radius * Math.sin(startAngle);
                const endX = centerX + radius * Math.cos(endAngle);
                const endY = centerY + radius * Math.sin(endAngle);
                
                // Improved control point calculation for curved lines
                // Calculate mid-angle and adjust the curve based on angle difference
                const angleDiff = Math.abs(startAngle - endAngle);
                const midAngle = (startAngle + endAngle) / 2;
                
                // Adjust curve intensity based on angle difference
                const curveIntensity = angleDiff > Math.PI ? 0.7 : 0.5;
                
                const controlX = centerX + (radius * curveIntensity) * Math.cos(midAngle);
                const controlY = centerY + (radius * curveIntensity) * Math.sin(midAngle);
                
                const isHighlighted = selectedTable === rel.table || selectedTable === rel.references_table;
                
                // Determine color based on table position - ensure valid indices
                const sourceIndex = Math.max(0, startTableIndex);
                const targetIndex = Math.max(0, endTableIndex);
                const colorIndex = Math.min(sourceIndex, targetIndex);
                const gradientId = `line-gradient-${idx}`;
                
                return (
                  <g key={idx} className="transition-all duration-300">
                    <defs>
                      <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={getTableColor(sourceIndex, false, false, true)} />
                        <stop offset="100%" stopColor={getTableColor(targetIndex, false, false, true)} />
                      </linearGradient>
                    </defs>
                    
                    {/* Relationship glow effect for highlighted relationships */}
                    {isHighlighted && (
                      <path 
                        d={`M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`}
                        fill="none"
                        stroke={getTableColor(colorIndex, true, false, false)} 
                        strokeWidth="8" 
                        strokeOpacity="0.3"
                        filter="url(#glow)"
                      />
                    )}
                    
                    {/* Main relationship line */}
                    <path 
                      d={`M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`}
                      fill="none"
                      stroke={isHighlighted ? getTableColor(colorIndex, true, false, false) : `url(#${gradientId})`} 
                      strokeWidth={isHighlighted ? "3" : "2"} 
                      strokeDasharray={isHighlighted ? "none" : "5,3"}
                      markerEnd={`url(#arrowhead-${colorIndex})`} 
                      className="transition-all duration-300"
                    />
                    
                    {/* Relationship label - improved positioning */}
                    <text 
                      x={(startX + endX) / 2 + 5} 
                      y={(startY + endY) / 2 - 10} 
                      textAnchor="middle"
                      className={`text-xs font-medium transition-all duration-300 ${
                        isHighlighted ? 'fill-indigo-900' : 'fill-gray-600'
                      }`}
                      filter={isHighlighted ? "url(#text-bg)" : ""}
                      transform={`rotate(${(Math.atan2(endY - startY, endX - startX) * 180) / Math.PI < 90 ? 0 : 180}, ${(startX + endX) / 2}, ${(startY + endY) / 2})`}
                    >
                      {rel.foreign_key}
                    </text>
                  </g>
                );
              })}
              
              {/* Draw tables with improved positioning */}
              {tables.map((tableName, idx) => {
                // Calculate angle and position with equal spacing
                const angle = (idx * 2 * Math.PI) / tableCount;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                
                const isHovered = hoveredTable === tableName;
                const isSelected = selectedTable === tableName;
                const isRelated = selectedTable && 
                  data.relationships.some(
                    rel => (rel.table === selectedTable && rel.references_table === tableName) || 
                           (rel.references_table === selectedTable && rel.table === tableName)
                  );
                
                const tableRelationships = getTableRelationships(tableName);
                const relationshipCount = tableRelationships.incoming.length + tableRelationships.outgoing.length;
                
                // Dynamic sizing based on relationships and importance
                const baseSize = 50;
                const relationshipBonus = Math.min(relationshipCount * 3, 15);
                const nodeSize = baseSize + relationshipBonus;
                
                const fillColor = getTableColor(idx, isSelected, isHovered, isRelated);
                const strokeColor = getTableColor(idx, true, false, false);
                
                return (
                  <g 
                    key={tableName}
                    transform={`translate(${x}, ${y})`}
                    onMouseEnter={() => setHoveredTable(tableName)}
                    onMouseLeave={() => setHoveredTable(null)}
                    onClick={() => handleTableClick(tableName)}
                    className="cursor-pointer"
                  >
                    {/* Glow effect for selected/hovered tables */}
                    {(isSelected || isHovered) && (
                      <circle 
                        r={nodeSize + 10} 
                        fill={fillColor}
                        opacity="0.3"
                        filter="url(#glow)"
                      />
                    )}
                    
                    {/* Table node */}
                    <circle 
                      r={isSelected ? nodeSize + 15 : isHovered ? nodeSize + 10 : nodeSize} 
                      fill={isSelected || isHovered ? fillColor : isRelated ? getTableColor(idx, false, false, true) : "#F9FAFB"} 
                      stroke={strokeColor} 
                      strokeWidth={isSelected || isHovered ? "3" : "2"}
                      className="transition-all duration-300 shadow-lg"
                    />
                    
                    {/* Modified: Table name - positioned inside the circle */}
                    <text 
                      y="-10" 
                      textAnchor="middle" 
                      className={`text-sm font-bold transition-colors duration-300 ${
                        isSelected || isHovered ? 'fill-white' : 'fill-gray-800'
                      }`}
                      style={{ textShadow: isSelected || isHovered ? '0 1px 2px rgba(0,0,0,0.3)' : 'none' }}
                    >
                      {tableName}
                    </text>
                    
                    {/* Modified: Primary key - positioned inside the circle */}
                    <text 
                      y="10" 
                      textAnchor="middle" 
                      className={`text-xs transition-all duration-300 ${
                        isSelected || isHovered ? 'fill-gray-100' : 'fill-gray-600'
                      }`}
                    >
                      PK: {data.primary_keys[tableName]}
                    </text>
                    
                    {/* Modified: Relationship count - positioned inside the circle */}
                    <text 
                      y="25" 
                      textAnchor="middle" 
                      className={`text-xs transition-all duration-300 ${
                        isSelected || isHovered ? 'fill-gray-200' : 'fill-gray-500'
                      }`}
                    >
                      {relationshipCount > 0 
                        ? `${relationshipCount} ${relationshipCount === 1 ? 'Rel' : 'Rels'}` 
                        : "No Rels"}
                    </text>
                    
                    {/* Modified: Interaction hint - only show on hover and inside circle */}
                    {isHovered && !isSelected && (
                      <text 
                        y="40" 
                        textAnchor="middle" 
                        className="text-xs fill-white font-medium animate-pulse"
                      >
                        Click for details
                      </text>
                    )}
                  </g>
                );
              })}
              
              {/* SVG Definitions */}
              <defs>
                {/* Create arrowheads with different colors */}
                {tables.map((_, idx) => (
                  <marker 
                    key={idx}
                    id={`arrowhead-${idx}`} 
                    markerWidth="15" 
                    markerHeight="10" 
                    refX="12" 
                    refY="5" 
                    orient="auto"
                  >
                    <polygon points="0 0, 15 5, 0 10" fill={getTableColor(idx, true, false, false)} />
                  </marker>
                ))}
                
                {/* Glow filter */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                
                {/* Text background for better readability */}
                <filter id="text-bg" x="-50%" y="-50%" width="200%" height="200%">
                  <feFlood floodColor="white" floodOpacity="0.7" result="bg" />
                  <feComposite in="SourceGraphic" in2="bg" operator="over" />
                </filter>
              </defs>
            </svg>
          </div>
          
          {/* Table details panel (shows when a table is selected) */}
          {selectedTable && (
            <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 max-w-4xl mx-auto border border-indigo-100 animate-fadeIn">
              <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-4">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700">
                  {selectedTable} Details
                </h2>
                <button 
                  onClick={() => setSelectedTable(null)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full transition-colors duration-300"
                >
                  Close
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-indigo-800 mb-3 text-lg">Primary Key</h3>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg shadow-inner border border-indigo-100">
                    <span className="font-mono text-indigo-900">{data.primary_keys[selectedTable]}</span>
                  </div>
                  
                  <h3 className="font-semibold text-indigo-800 mt-6 mb-3 text-lg">Foreign Keys</h3>
                  {data.foreign_keys[selectedTable] && data.foreign_keys[selectedTable].length > 0 ? (
                    <ul className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg shadow-inner border border-indigo-100 space-y-2">
                      {data.foreign_keys[selectedTable].map((fk, idx) => (
                        <li key={idx} className="text-sm font-mono flex items-start">
                          <span className="text-indigo-500 mr-2">•</span> 
                          {fk}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg shadow-inner border border-indigo-100 text-gray-500 italic">
                      No foreign keys defined
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-indigo-800 mb-3 text-lg">Relationships</h3>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg shadow-inner border border-indigo-100">
                    <h4 className="font-medium text-indigo-900 mb-2 border-b border-indigo-100 pb-1">References:</h4>
                    {getTableRelationships(selectedTable).outgoing.length > 0 ? (
                      <ul className="mb-4 space-y-1">
                        {getTableRelationships(selectedTable).outgoing.map((rel, idx) => (
                          <li key={idx} className="text-sm flex items-center">
                            <span className="text-indigo-500 mr-2">→</span>
                            <span 
                              className="text-indigo-700 font-medium cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTable(rel.references_table);
                              }}
                            >
                              {rel.references_table}
                            </span>
                            <span className="text-gray-500 mx-1">(via</span>
                            <span className="font-mono text-indigo-600">{rel.foreign_key}</span>
                            <span className="text-gray-500">)</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 mb-4 italic">No outgoing references</p>
                    )}
                    
                    <h4 className="font-medium text-indigo-900 mb-2 border-b border-indigo-100 pb-1">Referenced by:</h4>
                    {getTableRelationships(selectedTable).incoming.length > 0 ? (
                      <ul className="space-y-1">
                        {getTableRelationships(selectedTable).incoming.map((rel, idx) => (
                          <li key={idx} className="text-sm flex items-center">
                            <span className="text-purple-500 mr-2">←</span>
                            <span 
                              className="text-purple-700 font-medium cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTable(rel.table);
                              }}
                            >
                              {rel.table}
                            </span>
                            <span className="text-gray-500 mx-1">(via</span>
                            <span className="font-mono text-purple-600">{rel.foreign_key}</span>
                            <span className="text-gray-500">)</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Not referenced by other tables</p>
                    )}
                  </div>
                  
                  {/* Additional Information Card */}
                  <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg shadow-inner border border-indigo-100">
                    <h4 className="font-medium text-indigo-900 mb-2 border-b border-indigo-100 pb-1">Statistics</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-sm">
                        <span className="text-gray-500">Outgoing References:</span>
                        <span className="text-indigo-700 font-medium ml-2">
                          {getTableRelationships(selectedTable).outgoing.length}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Incoming References:</span>
                        <span className="text-purple-700 font-medium ml-2">
                          {getTableRelationships(selectedTable).incoming.length}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Total Relationships:</span>
                        <span className="text-indigo-900 font-medium ml-2">
                          {getTableRelationships(selectedTable).outgoing.length + 
                           getTableRelationships(selectedTable).incoming.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* CSS for animated dashed lines */}
        <style jsx>{`
          @keyframes dash {
            to {
              stroke-dashoffset: 200;
            }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    );
  };

  return <NetworkView />;
};

export default SchemaNetworkVisualizer;