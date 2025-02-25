import { useEffect, useState } from "react";
import { Database, GitBranch, Table2, Key, BarChart3, AlertCircle, Layers, Clock } from "lucide-react";

interface DataProfilingOverviewProps {
  onSubModuleChange: (subModule: string) => void;
  activeModule: string;
}

export function DataProfilingOverview({ onSubModuleChange, activeModule }: DataProfilingOverviewProps) {
  const features = [
    { icon: Database, title: "Data Quality", description: "Analyze data completeness, accuracy, and consistency", color: "from-blue-500 to-blue-600", module: "Data Quality" },
    { icon: GitBranch, title: "Column Correlation", description: "Discover relationships between data columns", color: "from-purple-500 to-purple-600", module: "Column Correlation" },
    { icon: Table2, title: "Fact & Dimension Tables", description: "Identify and analyze table relationships", color: "from-green-500 to-green-600", module: "Fact Table And Dimension Table" },
    { icon: Key, title: "Primary & Foreign Keys", description: "Map key relationships across tables", color: "from-yellow-500 to-yellow-600", module: "Primary Key Foreign Key Relation" },
    { icon: BarChart3, title: "Statistical Analysis", description: "Get detailed statistical insights", color: "from-pink-500 to-pink-600", module: "Statistical Analysis" },
    { icon: AlertCircle, title: "Business Rule Violations", description: "Detect and analyze rule violations", color: "from-red-500 to-red-600", module: "Business Rule Violations" },
    { icon: Layers, title: "Data Granularity", description: "Analyze data at different levels", color: "from-indigo-500 to-indigo-600", module: "Data Granularity" },
    { icon: Clock, title: "Data Frequency", description: "Monitor data update patterns", color: "from-cyan-500 to-cyan-600", module: "Data Frequency" },
  ];

  const [triggeredModules, setTriggeredModules] = useState(new Set());

  // Auto-trigger all submodules once when "Data Profiling" is selected
  useEffect(() => {
    if (activeModule === "dataProfiler" && triggeredModules.size === 0) {
      const newTriggeredModules = new Set();
      features.forEach((feature) => {
        console.log(`Triggering: ${feature.module}`);
        onSubModuleChange(feature.module);
        newTriggeredModules.add(feature.module);
      });
      setTriggeredModules(newTriggeredModules);
    }
  }, [activeModule, onSubModuleChange, triggeredModules]);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Data Profiling</h1>
          <p className="text-lg text-gray-600">Comprehensive tools for analyzing and understanding your data structure and quality</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <button
              key={index}
              onClick={() => {
                if (!triggeredModules.has(feature.module)) {
                  console.log(`Triggering: ${feature.module}`);
                  onSubModuleChange(feature.module);
                  setTriggeredModules(new Set(triggeredModules).add(feature.module));
                }
              }}
              className={`text-left bg-gradient-to-br ${feature.color} p-6 rounded-xl text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg`}
            >
              <feature.icon className="w-10 h-10 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-white/80">{feature.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
