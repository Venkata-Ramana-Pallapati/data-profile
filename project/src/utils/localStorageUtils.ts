const SELECTED_TABLE_KEY = "selectedTable";

export const setSelectedTable = (tableName: string) => {
  localStorage.setItem(SELECTED_TABLE_KEY, tableName);
  console.log(`Stored Table in Local Storage: ${tableName}`);
};

export const getSelectedTable = (): string | null => {
  const table = localStorage.getItem(SELECTED_TABLE_KEY);
  console.log("Accessing Selected Table Globally:", table);
  return table;
};
