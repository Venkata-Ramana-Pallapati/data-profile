import React, { useState, useEffect, useCallback } from "react";
import { Bot } from 'lucide-react';

interface FactDimensionData {
  fact_table: {
    [fact: string]: {
      dimensions?: {
        [dimension: string]: {
          sub_dimensions?: {
            [subDimension: string]: {};
          };
        };
      };
    };
  };
}

const FactAndDimensions: React.FC = () => {
  const [factDimensions, setFactDimensions] = useState<FactDimensionData | null>(null);
  const [expandedFacts, setExpandedFacts] = useState<Record<string, boolean>>({});
  const [expandedDimensions, setExpandedDimensions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<string>("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [cachedInsights, setCachedInsights] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/fact-dimension");
        if (!response.ok) throw new Error("Failed to fetch data");
        const data: FactDimensionData = await response.json();
        setFactDimensions(data);
      } catch (err) {
        setError("Failed to load data. Please try again.");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchInsights = useCallback(async () => {
    if (cachedInsights) {
      setInsights(cachedInsights);
      return;
    }

    setInsightsLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/fact-dimension/business-insights/`);
      if (!response.ok) throw new Error("Failed to fetch insights");
      const data = await response.json();
      const businessAnalysis = data.business_analysis;
      setInsights(businessAnalysis);
      setCachedInsights(businessAnalysis);
    } catch (err) {
      setInsights("Failed to load insights. Please try again.");
      console.error("Error fetching insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  }, [cachedInsights]);

  const toggleFact = (fact: string) => {
    setExpandedFacts((prev) => ({ ...prev, [fact]: !prev[fact] }));
  };

  const toggleDimension = (dimension: string) => {
    setExpandedDimensions((prev) => ({ ...prev, [dimension]: !prev[dimension] }));
  };

  const toggleInsights = () => {
    if (!showInsights && !insights) {
      fetchInsights();
    }
    setShowInsights(!showInsights);
  };

  if (loading) return <div className="text-center p-8 text-gray-600">Loading...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen text-gray-800 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-800">Fact and Dimension Relationships</h1>
      </div>

      {/* Bot Button (Top-Right Corner) */}
      <button
        onClick={toggleInsights}
        className="fixed top-6 right-6 bg-blue-700 hover:bg-blue-800 p-4 rounded-full shadow-lg text-white"
      >
        <Bot size={24} />
      </button>

      {/* Insights Popup (Fixed to Top-Right) */}
      {showInsights && (
        <div className="fixed top-16 right-6 bg-blue-700 text-white p-6 rounded-lg w-80 shadow-xl animate-slideIn">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">AI Insights</h2>
            <button onClick={toggleInsights} className="text-white text-lg">✕</button>
          </div>
          <div>
            {insightsLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
              </div>
            ) : (
              <p>{insights}</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-4xl mx-auto">
        {factDimensions &&
          Object.entries(factDimensions.fact_table).map(([fact, factData]) => (
            <div key={fact}>
              <div className="flex items-center bg-purple-500 text-white p-4 rounded-lg cursor-pointer"
                   onClick={() => toggleFact(fact)}>
                <span className="mr-3">{expandedFacts[fact] ? "▼" : "►"}</span>
                <span>{fact}</span>
              </div>
              {expandedFacts[fact] && factData.dimensions && (
                <div className="ml-6 mt-2 border-l-4 border-purple-300">
                  {Object.entries(factData.dimensions).map(([dimension, dimData]) => (
                    <div key={dimension}>
                      <div className="flex items-center bg-blue-500 text-white p-3 rounded-lg cursor-pointer"
                           onClick={() => toggleDimension(dimension)}>
                        <span className="mr-2">{expandedDimensions[dimension] ? "▼" : "►"}</span>
                        <span>{dimension}</span>
                      </div>
                      {expandedDimensions[dimension] && dimData.sub_dimensions && (
                        <div className="ml-6 mt-2 border-l-4 border-blue-300">
                          {Object.keys(dimData.sub_dimensions).map((subDim) => (
                            <div key={subDim} className="bg-teal-500 text-white p-2 rounded-lg mt-2">{subDim}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default FactAndDimensions;
