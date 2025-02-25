import sqlite3
import pandas as pd
from pydantic import BaseModel
from typing import List, Dict, Any
from utils.helpers import json_friendly
from openai import AzureOpenAI
from fastapi import FastAPI, HTTPException

DATABASE = "database.db"
app = FastAPI()

# Azure OpenAI Configuration
client = AzureOpenAI(
    api_key="3PvetJSoQDfCiTal64L8j6hrJnq0z7bVg8jZ0kcLFny0XBuaF7LwJQQJ99BBACYeBjFXJ3w3AAABACOGX2Lm",
    api_version="2024-02-01",
    azure_endpoint="https://team-lagaan-openapi.openai.azure.com/openai/deployments/lagaan-gpt-4o-mini/chat/completions?api-version=2024-08-01-preview"
)


def get_db_connection():
    """Establish a connection to the SQLite database."""
    return sqlite3.connect(DATABASE)

def get_data_from_table(table_name):
    """Fetch all data from a given table in the SQLite database."""
    conn = get_db_connection()
    query = f"SELECT * FROM {table_name}"
    data = pd.read_sql_query(query, conn)
    conn.close()
    return data

def compute_metrics(data, table_name):
    """Compute data quality metrics for a given DataFrame."""
    total_rows = len(data)
    total_columns = len(data.columns)
    total_cells = total_rows * total_columns

    if total_rows == 0:
        return {
            "table_name": table_name,
            "error": "Table is empty",
            "total_rows": 0,
            "missing_values": 0,
            "duplicate_rows": 0,
            "null_values_percentage": 0,
            "completeness_percentage": 0,
            "uniqueness_percentage": 0,
            "columns": {}
        }

    total_missing_values = data.isnull().sum().sum()
    table_completeness = (1 - (total_missing_values / total_cells)) * 100
    total_unique_values = data.nunique().sum()
    table_uniqueness = (total_unique_values / total_cells) * 100
    table_null_percentage = (total_missing_values / total_cells) * 100
    total_duplicate_rows = data.duplicated().sum()

    metrics = {
        "table_name": table_name,
        "total_rows": total_rows,
        "missing_values": json_friendly(total_missing_values),
        "duplicate_rows": json_friendly(total_duplicate_rows),
        "null_values_percentage": json_friendly(table_null_percentage),
        "completeness_percentage": json_friendly(table_completeness),
        "uniqueness_percentage": json_friendly(table_uniqueness),
        "columns": {}
    }

    for column in data.columns:
        missing_values = data[column].isnull().sum()
        column_completeness = (1 - (missing_values / total_rows)) * 100
        column_uniqueness = (data[column].nunique() / total_rows) * 100
        column_null_percentage = (missing_values / total_rows) * 100

        metrics["columns"][column] = {
            "missing_values": json_friendly(missing_values),
            "null_values_percentage": json_friendly(column_null_percentage),
            "completeness_percentage": json_friendly(column_completeness),
            "uniqueness_percentage": json_friendly(column_uniqueness)
        }
    
    return metrics

def generate_llm_prompt(metrics: Dict[str, Any]) -> str:
    """Generate a prompt for the LLM based on the metrics."""
    return f"""
    Please analyze the following data quality metrics and provide a concise summary in business perspective im not going to filter this i will directly show this in dash board so direclty give correct data with out extara infomation givw output like a paragraph :

    Table: {metrics['table_name']}
    - Total Rows: {metrics['total_rows']}
    - Overall Completeness: {metrics['completeness_percentage']:.2f}%
    - Overall Uniqueness: {metrics['uniqueness_percentage']:.2f}%
    - Duplicate Rows: {metrics['duplicate_rows']}
    - Missing Values: {metrics['missing_values']}
    
    Column-specific metrics:
    {format_column_metrics(metrics['columns'])}
    
    Provide:
    1. A summary of overall data quality
    2. Key issues identified
    3. Specific recommendations for improvement
    4. Highlight any columns needing attention
    """

def format_column_metrics(columns: Dict[str, Dict[str, float]]) -> str:
    """Format column metrics for the prompt."""
    return "\n".join([
        f"Column '{col}':\n"
        f"- Completeness: {metrics['completeness_percentage']:.2f}%\n"
        f"- Uniqueness: {metrics['uniqueness_percentage']:.2f}%\n"
        f"- Missing Values: {metrics['missing_values']}"
        for col, metrics in columns.items()
    ])

def get_llm_analysis(metrics: Dict[str, Any]) -> str:
    """Get LLM analysis of the data quality metrics."""
    prompt = generate_llm_prompt(metrics)

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Give a business perspective in 2 short sentences."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=100
    )
    
    return response.choices[0].message.content

class DataQualityRequest(BaseModel):
    table_names: List[str]

def get_data_quality(table_names: List[str]) -> List[Dict[str, Any]]:
    """Compute data quality metrics for multiple tables and get LLM analysis."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {row[0] for row in cursor.fetchall()}
    conn.close()

    results = []
    for table in table_names:
        if table not in existing_tables:
            results.append({"table_name": table, "error": "Table not found", "llm_analysis": None})
        else:
            data = get_data_from_table(table)
            metrics = compute_metrics(data, table)
            llm_analysis = get_llm_analysis(metrics)
            results.append({**metrics, "llm_analysis": llm_analysis})
    
    return results
