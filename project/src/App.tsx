import { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { DataQuality } from "./components/DataQuality";
import { Dashboard } from "./components/Dashboard";
import { DataProfilingOverview } from "./components/DataProfilingOverview";
import FactAndDimensions from "./components/FactAndDimensions";
import ColumnCorrelation from "./components/ColumnCorrelation";
import KeyRelationships from "./components/KeyRelationships";
import BackButton from "./components/BackButton";
import GranularityDashboard from "./components/GranularityDashboard";
import DynamicTimeRangeDashboard from "./components/DynamicTimeRangeDashboard";
import DataAnalysisDashboard from "./components/DataAnalysisDashboard";
import Statistics from "./components/Statistics";
import type { TableMetrics, User } from "./types";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState("");
  const [activeSubModule, setActiveSubModule] = useState("");
  const [history, setHistory] = useState<{ module: string; subModule: string }[]>([]);

  const handleLogin = (email: string) => {
    setUser({ email });
  };

  const handleModuleChange = (module: string) => {
    setHistory((prev) => [...prev, { module: activeModule, subModule: activeSubModule }]);
    setActiveModule(module);
    setActiveSubModule(""); // Reset submodule when switching modules
  };

  const handleSubModuleChange = (subModule: string) => {
    setHistory((prev) => [...prev, { module: activeModule, subModule: activeSubModule }]);
    setActiveSubModule(subModule);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setActiveModule(lastState.module);
      setActiveSubModule(lastState.subModule);
      setHistory(history.slice(0, -1)); // Remove last history entry
    } else {
      setActiveModule(""); // Go back to Dashboard
      setActiveSubModule("");
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        subModule={activeSubModule}
        onSubModuleChange={handleSubModuleChange}
      />
      <main className="flex-1 bg-gray-100 min-h-screen ml-64 overflow-y-auto">
        <div className="p-4">
          {history.length > 0 && <BackButton onBack={handleBack} />}
          {!activeModule && <Dashboard />}

          {activeModule === "dataProfiler" && !activeSubModule && (
            <DataProfilingOverview onSubModuleChange={handleSubModuleChange} />
          )}

          {activeModule === "dataProfiler" && activeSubModule === "Data Quality" && <DataQuality />}
          {activeModule === "dataProfiler" && activeSubModule === "Fact Table And Dimension Table" && <FactAndDimensions />}
          {activeModule === "dataProfiler" && activeSubModule === "Column Correlation" && <ColumnCorrelation />}
          {activeModule === "dataProfiler" && activeSubModule === "Primary Key Foreign Key Relation" && <KeyRelationships />}
          {activeModule === "dataProfiler" && activeSubModule === "Data Granularity" && <GranularityDashboard />}
          {activeModule === "dataProfiler" && activeSubModule === "Data Frequency" && <DynamicTimeRangeDashboard />}
          {activeModule === "dataProfiler" && activeSubModule === "Entire Report" && <DynamicTimeRangeDashboard />}
          {activeModule === "dataProfiler" && activeSubModule === "Data Analysis Dashboard" && <DataAnalysisDashboard />}
          {activeModule === "dataProfiler" && activeSubModule === "Statistical Analysis" && <Statistics />}
        </div>
      </main>
    </div>
  );
}

export default App;
