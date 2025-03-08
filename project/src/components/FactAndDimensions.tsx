import React, { useState } from "react";
import DataQuality from "./DataQuality";
import GranularityDashboard from "./GranularityDashboard";
import DynamicTimeRangeDashboard from "./DynamicTimeRangeDashboard";
import Statistics from "./Statistics";

const ParentComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dataQuality");

  return (
    <div className="container mx-auto mt-5 p-5">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Data Analysis Dashboard
      </h1>
      
      {/* Tabs Navigation */}
      <div className="flex justify-center">
        <ul className="flex border-b" role="tablist">
          <li className="mr-2" role="presentation">
            <button
              className={`px-4 py-2 rounded-t-lg ${activeTab === "dataQuality" ? "border-b-2 border-blue-500 text-blue-500 font-bold" : "border-transparent text-gray-600"}`} 
              onClick={() => setActiveTab("dataQuality")}
              role="tab"
            >
              Data Quality
            </button>
          </li>
          <li className="mr-2" role="presentation">
            <button
              className={`px-4 py-2 rounded-t-lg ${activeTab === "granularity" ? "border-b-2 border-green-500 text-green-500 font-bold" : "border-transparent text-gray-600"}`} 
              onClick={() => setActiveTab("granularity")}
              role="tab"
            >
              Granularity Dashboard
            </button>
          </li>
          <li className="mr-2" role="presentation">
            <button
              className={`px-4 py-2 rounded-t-lg ${activeTab === "timeRange" ? "border-b-2 border-yellow-500 text-yellow-500 font-bold" : "border-transparent text-gray-600"}`} 
              onClick={() => setActiveTab("timeRange")}
              role="tab"
            >
Frequency            </button>
          </li>
          <li className="mr-2" role="presentation">
            <button
              className={`px-4 py-2 rounded-t-lg ${activeTab === "statistics" ? "border-b-2 border-purple-500 text-purple-500 font-bold" : "border-transparent text-gray-600"}`} 
              onClick={() => setActiveTab("statistics")}
              role="tab"
            >
              Statistics
            </button>
          </li>
        </ul>
      </div>
      
      {/* Tabs Content */}
      <div className="tab-content mt-6 p-4 border rounded-lg shadow-lg">
        {activeTab === "dataQuality" && <div className="tab-pane active"><DataQuality /></div>}
        {activeTab === "granularity" && <div className="tab-pane"><GranularityDashboard /></div>}
        {activeTab === "timeRange" && <div className="tab-pane"><DynamicTimeRangeDashboard /></div>}
        {activeTab === "statistics" && <div className="tab-pane"><Statistics /></div>}
      </div>
    </div>
  );
};

export default ParentComponent;
