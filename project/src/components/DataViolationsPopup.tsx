import React, { useEffect, useState } from "react";
import { AlertCircle, X, ChevronRight } from "lucide-react";
import  "./DataViolationsPopup.css";
interface DataViolationsPopupProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ViolationData {
  violations: {
    [table: string]: {
      [field: string]: { rowid: number; value: number }[];
    };
  };
  summary: string;
}

const DataViolationsPopup: React.FC<DataViolationsPopupProps> = ({ isOpen, setIsOpen }) => {
  const [data, setData] = useState<ViolationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    fetch("http://127.0.0.1:8000/business-rules/violations/summary/")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching data violations:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  // Calculate total violations
  const totalViolations = data
    ? Object.values(data.violations).reduce(
        (acc, table) =>
          acc + Object.values(table).reduce((tableAcc, field) => tableAcc + field.length, 0),
        0
      )
    : 0;

  return (
    <div>
      {/* Floating Notification Button */}
      {totalViolations > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 bg-red-500 text-white rounded-full p-4 shadow-lg hover:bg-red-600 transition-all duration-300 animate-bounce"
        >
          <AlertCircle className="h-6 w-6" />
          <span className="absolute -top-2 -right-2 bg-red-700 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
            {totalViolations}
          </span>
        </button>
      )}

      {/* Modal */}
      {isOpen && data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all duration-500">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Data Rule Violations</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Summary */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">Summary</h3>
                <p className="text-blue-700 text-sm">{data.summary}</p>
              </div>

              {/* Violations List */}
              <div className="space-y-4">
                {Object.entries(data.violations).map(([table, fields]) => (
                  <div key={table} className="bg-white border rounded-lg overflow-hidden hover:shadow-md">
                    <div
                      className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
                      onClick={() => setExpanded(expanded === table ? null : table)}
                    >
                      <h3 className="font-semibold text-gray-700 capitalize">{table}</h3>
                      <ChevronRight className={`h-5 w-5 transform transition-transform ${expanded === table ? "rotate-90" : ""}`} />
                    </div>
                    {expanded === table &&
                      Object.entries(fields).map(([field, violations]) => (
                        <div key={field} className="p-4">
                          <h4 className="text-sm font-medium text-gray-600 mb-2 capitalize">{field} Violations</h4>
                          <div className="space-y-2">
                            {violations.map((violation) => (
                              <div key={violation.rowid} className="bg-red-50 p-3 rounded text-sm">
                                <span className="font-medium">Row ID: {violation.rowid}</span>
                                <span className="text-red-600 ml-2">
                                {field}: {(violation as Record<string, any>)[field]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataViolationsPopup;
