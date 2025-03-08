import { useEffect, useState } from 'react';

function DataQuality() {
  const [tableName, setTableName] = useState(window.selectedTableName || '');
  
  // Listen for table selection events
  useEffect(() => {
    const handleTableSelected = (event) => {
      const { tableName } = event.detail;
      setTableName(tableName);
    };
    
    // Listen for both events
    window.addEventListener('tableSelected', handleTableSelected);
    window.addEventListener('dataQualitySelected', handleTableSelected);
    
    // Initial load from local storage if not already set
    if (!tableName) {
      const savedTable = localStorage.getItem('selectedDatabaseTable');
      if (savedTable) {
        try {
          const parsedTable = savedTable.startsWith('"') ? JSON.parse(savedTable) : savedTable;
          setTableName(parsedTable);
        } catch (e) {
          setTableName(savedTable);
        }
      }
    }
    
    return () => {
      window.removeEventListener('tableSelected', handleTableSelected);
      window.removeEventListener('dataQualitySelected', handleTableSelected);
    };
  }, []);

  // Use tableName in your component logic
  if (!tableName) {
    return <div>Please select a table first</div>;
  }

  return (
    <div>
      <h2>Data Quality for: {tableName}</h2>
      {/* Rest of your component */}
    </div>
  );
}