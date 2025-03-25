import React, { useState } from "react";
import DataQuality from "./DataQuality";
import GranularityDashboard from "./GranularityDashboard";
import DynamicTimeRangeDashboard from "./DynamicTimeRangeDashboard";
import Statistics from "./Statistics";

const ParentComponent: React.FC = () => {
    const [activeTab, setActiveTab] = useState("dataQuality");

    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
                Data Analysis Dashboard
            </h1>
            
            {/* Tabs Navigation */}
            <div className="flex justify-center">
                <ul className="flex border-b" role="tablist">
                    {[
                        { key: "statistics", label: "Statistics" },
                        { key: "dataQuality", label: "Data Quality" },
                        { key: "granularity", label: "Granularity Dashboard" },
                        { key: "timeRange", label: "Frequency" }
                    ].map((tab) => (
                        <li key={tab.key} className="mr-2" role="presentation">
                            <button
                                className={`px-4 py-2 rounded-t-lg transition-colors duration-300 ${
                                    activeTab === tab.key 
                                    ? "border-b-2 border-purple-500 text-purple-500 font-bold" 
                                    : "border-transparent text-gray-600 hover:text-purple-500"
                                }`}
                                onClick={() => setActiveTab(tab.key)}
                                role="tab"
                            >
                                {tab.label}
                            </button>
                        </li>
                    ))}
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
