import { useState, useEffect } from 'react';
import { Upload, Trash2, Database, FileSpreadsheet, Loader2, List, RefreshCw, Info, Save, Eye } from 'lucide-react';

const DataWarehouseUI = () => {
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [metadata, setMetadata] = useState('');
  const [currentMetadata, setCurrentMetadata] = useState('');
  const [activeSection, setActiveSection] = useState('tables');
  const [getMetadataTable, setGetMetadataTable] = useState('');

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://127.0.0.1:8000/list-tables/');
      const data = await response.json();
      setTables(data.tables);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
  
    setIsLoading(true);
    setUploadStatus('Uploading...');
  
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
  
    try {
      const response = await fetch('http://127.0.0.1:8000/upload-files/', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        setUploadStatus('Upload successful!');
        fetchTables();
      } else {
        setUploadStatus('Upload failed.');
      }
    } catch (error) {
      setUploadStatus('Upload failed.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadStatus(''), 3000);
    }
  };

  const deleteTable = async (tableName) => {
    try {
      await fetch(`http://127.0.0.1:8000/delete-table/${tableName}`, {
        method: 'DELETE',
      });
      fetchTables();
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  const deleteAllTables = async () => {
    try {
      await fetch('http://127.0.0.1:8000/delete-all-tables', {
        method: 'DELETE',
      });
      fetchTables();
    } catch (error) {
      console.error('Error deleting all tables:', error);
    }
  };

  const addMetadata = async () => {
    if (!selectedTable || !metadata) {
      alert('Please select a table and enter metadata');
      return;
    }
    try {
      const response = await fetch('http://127.0.0.1:8000/add-metadata/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_name: selectedTable,
          metadata: metadata
        }),
      });
      if (response.ok) {
        setMetadata('');
        alert('Metadata added successfully!');
      }
    } catch (error) {
      console.error('Error adding metadata:', error);
    }
  };

  const fetchMetadata = async () => {
    if (!getMetadataTable) {
      alert('Please select a table');
      return;
    }
    try {
      const response = await fetch(`http://127.0.0.1:8000/get-metadata/${getMetadataTable}`);
      const data = await response.json();
      setCurrentMetadata(data.metadata);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setCurrentMetadata('No metadata available');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto bg-white/90 rounded-xl shadow-xl p-8 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Database className="text-blue-500" size={32} />
            Data Warehouse Manager
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => setActiveSection('tables')}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                activeSection === 'tables' 
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tables
            </button>
            <button
              onClick={() => setActiveSection('metadata')}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                activeSection === 'metadata'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Metadata
            </button>
          </div>
        </div>

        {activeSection === 'tables' && (
          <>
            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  multiple
                />
                <label
                  htmlFor="file-upload"
                  className={`
                    inline-flex items-center justify-center w-full gap-2 px-4 py-3 rounded-lg
                    ${isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}
                    text-white cursor-pointer transition-colors duration-200
                  `}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <Upload />}
                  Upload CSV
                </label>
              </div>

              <button
                onClick={fetchTables}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
              >
                <List />
                List Tables
              </button>

              <button
                onClick={fetchTables}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200"
              >
                <RefreshCw className={isLoading ? 'animate-spin' : ''} />
                Refresh Tables
              </button>

              <button
                onClick={deleteAllTables}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
              >
                <Trash2 />
                Delete All
              </button>
            </div>

            {/* Upload Status */}
            {uploadStatus && (
              <div className="text-center text-sm mb-4 animate-fade-in">
                {uploadStatus}
              </div>
            )}

            {/* Tables List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Available Tables</h2>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              ) : tables.length > 0 ? (
                <div className="grid gap-4">
                  {tables.map((table) => (
                    <div
                      key={table}
                      className="bg-gray-50 p-4 rounded-lg flex items-center justify-between group hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="text-green-500" />
                        <span className="font-medium text-gray-700">{table}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTable(table);
                            setActiveSection('metadata');
                          }}
                          className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-blue-600"
                        >
                          <Info />
                        </button>
                        <button
                          onClick={() => deleteTable(table)}
                          className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-red-600"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No tables found. Upload a CSV file to get started.
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === 'metadata' && (
          <div className="space-y-8 animate-fade-in">
            {/* Add Metadata Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Add Metadata</h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-700 font-medium">Select Table</label>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="p-2 border rounded-lg bg-white"
                  >
                    <option value="">Select a table...</option>
                    {tables.map((table) => (
                      <option key={table} value={table}>{table}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-gray-700 font-medium">Metadata</label>
                  <textarea
                    value={metadata}
                    onChange={(e) => setMetadata(e.target.value)}
                    placeholder="Enter metadata for the selected table..."
                    className="p-4 border rounded-lg bg-white h-32 resize-none"
                  />
                </div>

                <button
                  onClick={addMetadata}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 w-full"
                >
                  <Save />
                  Save Metadata
                </button>
              </div>
            </div>

            {/* Get Metadata Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Get Metadata</h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-700 font-medium">Select Table</label>
                  <select
                    value={getMetadataTable}
                    onChange={(e) => setGetMetadataTable(e.target.value)}
                    className="p-2 border rounded-lg bg-white"
                  >
                    <option value="">Select a table...</option>
                    {tables.map((table) => (
                      <option key={table} value={table}>{table}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={fetchMetadata}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 w-full"
                >
                  <Eye />
                  Get Metadata
                </button>

                {currentMetadata && (
                  <div className="mt-4">
                    <h4 className="text-lg font-medium text-gray-700 mb-2">Current Metadata</h4>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <pre className="whitespace-pre-wrap">{currentMetadata}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataWarehouseUI;