import React, { useState, useEffect } from 'react';

const Statistics = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, { text: string; isError: boolean }>>({});
  const [showAiPopup, setShowAiPopup] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysisCache, setAiAnalysisCache] = useState<Record<string, { text: string; isError: boolean }> | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showAiPopup && !aiLoading) {
      timer = setTimeout(() => setShowAiPopup(false), 10000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showAiPopup, aiLoading]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/statistical-analysis/');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError('Failed to fetch statistical data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiAnalysis = async () => {
    // Check if we have cached results
    if (aiAnalysisCache) {
      setAiAnalysis(aiAnalysisCache);
      setShowAiPopup(true);
      return;
    }

    try {
      setAiLoading(true);
      setShowAiPopup(true);
      setAiAnalysis({ loading: { text: "AI Analysis is processing... Coming soon!", isError: false } });

      // Using the original URL with the typo as in your code
      const response = await fetch('http://127.0.0.1:8000/stastical-llm-analysis/');
      if (!response.ok) throw new Error('Failed to fetch AI analysis');

      const data = await response.json();
      const aiAnalysisResult: Record<string, { text: string; isError: boolean }> = {};

      for (const category in data) {
        aiAnalysisResult[category] = {
          text: data[category] || 'No data available.',
          isError: data[category]?.startsWith('Error') ?? false,
        };
      }

      setAiAnalysis(aiAnalysisResult);
      // Store the result in cache
      setAiAnalysisCache(aiAnalysisResult);
    } catch (err) {
      console.error('Error fetching AI analysis:', err);
      setAiAnalysis({
        error: { text: 'Error fetching AI analysis. Please try again later.', isError: true },
      });
    } finally {
      setAiLoading(false);
    }
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const renderStatTable = (categoryData: any, categoryName: string) => {
    if (!categoryData) return null;

    const metrics = Object.keys(categoryData).filter(key => key !== 'sum');
    if (metrics.length === 0) return null;

    const firstMetric = metrics[0];
    const statKeys = Object.keys(categoryData[firstMetric]);

    return (
      <div className="mb-8 overflow-hidden bg-white rounded-lg shadow">
        <div className="px-6 py-4 bg-gray-800 text-white">
          <h2 className="text-xl font-semibold">{categoryName}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Metric</th>
                {statKeys.map((key, index) => (
                  <th key={`${categoryName}-th-${index}`} className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                    {key.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, index) => (
                <tr key={`${categoryName}-tr-${index}`} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{metric}</td>
                  {statKeys.map(key => (
                    <td key={key} className="px-6 py-4 text-sm text-gray-600">
                      {formatNumber(categoryData[metric][key])}
                    </td>
                  ))}
                </tr>
              ))}
              {categoryData.sum &&
                Object.keys(categoryData.sum).map((sumKey, index) => (
                  <tr key={`${categoryName}-sum-${index}`} className="border-t bg-gray-50 font-semibold">
                    <td className="px-6 py-4 text-sm text-gray-800">Total {sumKey}</td>
                    <td colSpan={statKeys.length} className="px-6 py-4 text-sm text-gray-800">
                      {formatNumber(categoryData.sum[sumKey])}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex justify-between items-center">
          Statistical Analysis
          <button
            className="px-3 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-sm"
            onClick={fetchAiAnalysis}
            disabled={aiLoading}
          >
            {aiLoading ? 'Processing...' : '🤖 AI Analysis'}
          </button>
        </h1>

        {/* AI Analysis Popup */}
        {showAiPopup && (
          <div className="fixed top-5 right-5 bg-blue-600 text-white p-6 rounded-lg shadow-lg max-w-md w-full z-50">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">AI Analysis</h2>
              <button onClick={() => setShowAiPopup(false)} className="text-white font-bold text-xl">
                &times;
              </button>
            </div>
            <div className="mt-4">
              {aiLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <p>Processing your data...</p>
                </div>
              ) : (
                Object.keys(aiAnalysis).map(category => (
                  <div key={category} className="mb-4">
                    <h3 className="text-lg font-semibold capitalize">{category.replace('_', ' ')}</h3>
                    <p className={aiAnalysis[category].isError ? "text-red-200" : "text-white"}>
                      {aiAnalysis[category].text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {stats &&
            Object.entries(stats).map(([category, data]) => (
              <React.Fragment key={category}>
                {renderStatTable(data, category.replace('_', ' '))}
              </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Statistics;