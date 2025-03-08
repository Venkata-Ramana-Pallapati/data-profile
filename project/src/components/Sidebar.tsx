import { useState, useEffect } from "react";
import { Database, LineChart, Terminal, Brain, AlertCircle, GitBranch, Table2, Key, BarChart3, Layers, Clock, ChevronDown, ChevronRight, List } from "lucide-react";
import DataViolationsPopup from "./DataViolationsPopup"; // Import the violations popup
import DataQuality from "./DataQuality";

// Define interfaces
interface DataViolationsResponse {
  violations: {
    [tableName: string]: {
      [columnName: string]: string[];
    };
  };
}
interface DataQualityProps {
  value: string; // Ensure value prop is defined
}

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  subModule?: string;
  onSubModuleChange?: (subModule: string) => void;
  triggerDataProfiling: () => void;
}

interface TableItem {
  name: string;
  selected: boolean;
}

type ModuleStatus = 'idle' | 'loading' | 'ready';

// Local storage key - use a consistent key for storing and retrieving
const SELECTED_TABLE_KEY = 'selectedDatabaseTable';

// Main Sidebar Component
export function Sidebar({ 
  activeModule, 
  onModuleChange, 
  subModule, 
  onSubModuleChange,
  triggerDataProfiling 
}: SidebarProps) {
  const [violationsCount, setViolationsCount] = useState(0);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});
  const [showDataProfilingSubMenu, setShowDataProfilingSubMenu] = useState(false);
  // New states for tables list
  const [tables, setTables] = useState<TableItem[]>([]);
  const [isTableListVisible, setIsTableListVisible] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);

  // Initialize selected table from local storage when component mounts
  useEffect(() => {
    const savedTable = localStorage.getItem(SELECTED_TABLE_KEY);
    console.log("Loading saved table from localStorage:", savedTable);
    if (savedTable) {
      try {
        // Handle both string and JSON formats for backward compatibility
        const parsedTable = savedTable.startsWith('"') ? JSON.parse(savedTable) : savedTable;
        setSelectedTableName(parsedTable);
      } catch (e) {
        // If parsing fails, use it as a plain string
        setSelectedTableName(savedTable);
      }
    }
  }, []);

  // Fetch violations count
  useEffect(() => {
    fetch("http://127.0.0.1:8000/business-rules/violations/summary/")
      .then((res) => res.json())
      .then((data: DataViolationsResponse) => {
        const total = Object.values(data.violations).reduce(
          (acc, table) =>
            acc + Object.values(table).reduce((tableAcc, field) => tableAcc + field.length, 0),
          0
        );
        setViolationsCount(total);
      })
      .catch((err) => console.error("Error fetching violations:", err));
  }, []);

  // Fetch tables function
  const fetchTables = () => {
    setIsLoadingTables(true);
    fetch("http://127.0.0.1:8000/list-tables/")
      .then(res => res.json())
      .then(data => {
        console.log("Received table data:", data);
        // Handle the response format correctly - data.tables is an array
        if (data && data.tables && Array.isArray(data.tables)) {
          // Create table items and mark the previously selected one
          const tableItems = data.tables.map((table: string) => ({ 
            name: table, 
            selected: table === selectedTableName 
          }));
          setTables(tableItems);
          console.log("Table names processed:", tableItems);
        } else {
          console.error("Unexpected data format:", data);
          // Fallback to empty array if format is unexpected
          setTables([]);
        }
        setIsLoadingTables(false);
      })
      .catch(err => {
        console.error("Error fetching tables:", err);
        setIsLoadingTables(false);
        // Mock data in case endpoint fails
        const mockTables = [
          "customers", "orders", "product_categories", "products",
          "retailers", "sales", "stores", "shelf_positions"
        ];
        setTables(mockTables.map(name => ({ 
          name, 
          selected: name === selectedTableName 
        })));
      });
  };

  // Select a table and automatically trigger fact and dimensions
  const selectTable = (tableName: string) => {
    // Update state
    setSelectedTableName(tableName);
    
    // Update tables list
    setTables(prev => prev.map(table => ({
      ...table,
      selected: table.name === tableName
    })));
    
    // Save to local storage - store as plain string, not as stringified JSON
    localStorage.setItem(SELECTED_TABLE_KEY, tableName);
    console.log(`Selected table: ${tableName} (saved to local storage)`);
    
    // Automatically trigger fact and dimensions (removed need for Apply button)
    triggerFactAndDimensions(tableName);
  };

  // Function to trigger fact and dimensions
  const triggerFactAndDimensions = (tableName: string) => {
    console.log(`Automatically applying table selection: ${tableName}`);
    
    // Create and dispatch a custom event with the selected table name
    const event = new CustomEvent('tableSelected', { 
      detail: { tableName: tableName } 
    });
    window.dispatchEvent(event);
    
    // Store in a global variable for easier access by other components
    window.selectedTableName = tableName;
    
    // Set "Fact Table And Dimension Table" as the active submodule
    if (onSubModuleChange) {
      // Make sure we're in the data profiler module
      if (activeModule !== "dataProfiler") {
        onModuleChange("dataProfiler");
        setShowDataProfilingSubMenu(true);
      }
      
      // First ensure the proper category is expanded
      setExpandedCategories(prev => ({
        ...prev,
        relationships: true
      }));
      
      // Then change to the "Fact Table And Dimension Table" submodule
      onSubModuleChange("Fact Table And Dimension Table");
      
      // Create and dispatch a custom event specifically for fact and dimensions component
      const factDimEvent = new CustomEvent('loadFactAndDimensions', { 
        detail: { tableName: tableName } 
      });
      window.dispatchEvent(factDimEvent);
      
      console.log("Triggered Fact Table And Dimension Table view");
    }
  };

  const mainModules = [
    { id: "dataProfiler", name: "Data Profiling", icon: Database },
  ];
  
  // Reorganized data profiling submodules with categories
  const dataProfilingCategories = [
    { 
      id: "relationships",
      name: "Relationships", 
      modules: [
        "Column Correlation",
        "Primary Key Foreign Key Relation",
      ] 
    },
  ];

  // Handle module change
  const handleModuleClick = (moduleId: string) => {
    console.log('Before module change:', activeModule);
    
    if (moduleId === "dataProfiler") {
      // Toggle sub-menu visibility when clicking on Data Profiling
      setShowDataProfilingSubMenu(!showDataProfilingSubMenu);
      
      // Only fetch tables if they haven't been loaded yet and we're opening the menu
      if (!showDataProfilingSubMenu && tables.length === 0) {
        fetchTables();
        setIsTableListVisible(true);
      }
      
      // Only change module and trigger if it's not already active
      if (activeModule !== "dataProfiler") {
        onModuleChange(moduleId);
        console.log('After module change:', moduleId);
        
        if (typeof triggerDataProfiling === 'function') {
          console.log("Attempting to trigger data profiling");
          triggerDataProfiling();
          console.log("Data profiling trigger attempted");
        }
      }
    } else {
      // For other modules, just change the active module
      onModuleChange(moduleId);
      console.log('After module change:', moduleId);
      
      // Hide data profiling submenu when switching to other modules
      setShowDataProfilingSubMenu(false);
    }
  };

  // Handle submodule selection
  const handleSubModuleClick = (subModuleName: string) => {
    if (onSubModuleChange) {
      onSubModuleChange(subModuleName);
      
      // If "Data Quality" is selected, dispatch another table selected event for components that might've missed it
      if (subModuleName === "Data Quality" && selectedTableName) {
        // Dispatch event with current table name
        const event = new CustomEvent('dataQualitySelected', { 
          detail: { tableName: selectedTableName } 
        });
        window.dispatchEvent(event);
      }
      
      // If "Fact Table And Dimension Table" is selected, dispatch the fact dimensions event
      if (subModuleName === "Fact Table And Dimension Table" && selectedTableName) {
        const factDimEvent = new CustomEvent('loadFactAndDimensions', { 
          detail: { tableName: selectedTableName } 
        });
        window.dispatchEvent(factDimEvent);
        console.log("Triggered Fact Table And Dimension Table view from submodule click");
      }
    }
  };

  // Toggle table list visibility
  const toggleTableList = () => {
    setIsTableListVisible(!isTableListVisible);
    if (!isTableListVisible && tables.length === 0) {
      fetchTables();
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  return (
    <>
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white h-screen fixed top-0 left-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold">SigmaDQ</h1>
          {selectedTableName && (
            <div className="mt-1 text-sm text-blue-300">
              <span className="font-medium">Current table:</span> {selectedTableName}
            </div>
          )}
        </div>
        
        <nav className="flex-1">
          <ul className="p-2">
            {mainModules.map((module) => (
              <li key={module.id}>
                <button
                  onClick={() => handleModuleClick(module.id)}
                  className={`w-full flex items-center p-2 rounded-md mb-1 ${
                    activeModule === module.id ? "bg-blue-600" : "hover:bg-gray-700"
                  }`}
                >
                  <module.icon className="w-5 h-5 mr-2" />
                  {module.name}
                </button>
                
                {/* Show List of Tables right after Data Profiling button when active */}
                {activeModule === "dataProfiler" && module.id === "dataProfiler" && showDataProfilingSubMenu && (
                  <>
                    {/* List of Tables Section */}
                    <div className="ml-4 mb-2">
                      <button 
                        onClick={toggleTableList}
                        className="w-full flex items-center justify-between p-2 rounded-md text-sm font-medium hover:bg-gray-700"
                      >
                        <span>QualityMetricsDB</span>
                        {isTableListVisible ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                      </button>
                      
                      {isTableListVisible && (
                        <div className="mt-1 ml-2 bg-gray-700 p-2 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs">Select one table:</span>
                          </div>
                          
                          {isLoadingTables ? (
                            <div className="flex items-center justify-center p-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-500"></div>
                              <span className="ml-2 text-xs">Loading...</span>
                            </div>
                          ) : tables.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto">
                              {tables.map((table, idx) => (
                                <div 
                                  key={idx} 
                                  className={`flex items-center p-1 hover:bg-gray-600 rounded cursor-pointer text-xs ${
                                    table.selected ? 'bg-blue-500 bg-opacity-30' : ''
                                  }`}
                                  onClick={() => selectTable(table.name)}
                                >
                                  <input 
                                    type="radio" 
                                    id={`sidebar-table-${idx}`}
                                    name="tableSelection"
                                    checked={table.selected} 
                                    onChange={() => selectTable(table.name)}
                                    className="mr-1 h-3 w-3 text-blue-500 cursor-pointer"
                                  />
                                  <label 
                                    htmlFor={`sidebar-table-${idx}`}
                                    className="cursor-pointer flex-grow truncate"
                                  >
                                    {table.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center p-2 text-xs text-gray-400">
                              No tables found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Categories and Submodules */}
                    <div className="ml-4 mt-2 space-y-2">
                      {dataProfilingCategories.map((category) => (
                        <div key={category.id}>
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="w-full flex items-center justify-between p-2 rounded-md text-sm font-medium hover:bg-gray-700"
                          >
                            <span>{category.name}</span>
                            {expandedCategories[category.id] ? 
                              <ChevronDown className="w-4 h-4" /> : 
                              <ChevronRight className="w-4 h-4" />
                            }
                          </button>
                          
                          {/* Submodules for the category */}
                          {expandedCategories[category.id] && (
                            <ul className="ml-2 mt-1 space-y-1">
                              {category.modules.map((subModuleName) => (
                                <li key={subModuleName}>
                                  <button
                                    onClick={() => handleSubModuleClick(subModuleName)}
                                    className={`w-full text-left p-2 rounded-md text-sm ${
                                      subModule === subModuleName ? "bg-gray-700" : "hover:bg-gray-700"
                                    }`}
                                  >
                                    {subModuleName}
                                    {/* Show Red Badge if Violations Exist */}
                                    {subModuleName === "Business Rule Violations" && violationsCount > 0 && (
                                      <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2">
                                        {violationsCount}
                                      </span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Floating Alert Button for Data Violations */}
      {violationsCount > 0 && (
        <button
          onClick={() => setIsPopupOpen(true)}
          className="fixed bottom-4 right-4 bg-red-500 text-white rounded-full p-4 shadow-lg hover:bg-red-600 transition-all duration-300 animate-bounce"
        >
          <AlertCircle className="h-6 w-6" />
          <span className="absolute -top-2 -right-2 bg-red-700 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
            {violationsCount}
          </span>
        </button>
      )}

      {/* Data Violations Popup */}
      <DataViolationsPopup isOpen={isPopupOpen} setIsOpen={setIsPopupOpen} />
    </>
  );
}

// Add a global type definition for the window object
declare global {
  interface Window {
    selectedTableName?: string;
  }
}