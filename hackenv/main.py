from fastapi import FastAPI, Depends
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from modules.Keys_Relation import get_keys_relations  # Importing keys relations function
from fastapi.middleware.cors import CORSMiddleware
from modules.dataquality import get_data_quality
from pydantic  import BaseModel
from typing import  List,Dict,Any




app = FastAPI()



DATABASE_PATH = "database.db" 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)
# Database Configuration
DATABASE_URL = "sqlite:///./database.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/keys_relation")
def keys_relations(db=Depends(get_db)):
    key_relations = get_keys_relations(db)  # Calling the key relationships function
    return {"message": "Welcome to the FastAPI Service", "key_relationships": key_relations}

@app.get("/get_tables")
def get_tables(db=Depends(get_db)):
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return {"tables": tables}

@app.get("/get_tables_with_columns")
def get_tables_with_columns(db=Depends(get_db)):
    inspector = inspect(engine)
    tables = inspector.get_table_names()


# Database Configuration
DATABASE_URL = "sqlite:///./database.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/keys_relation")
def keys_relations(db=Depends(get_db)):
    key_relations = get_keys_relations(db)  # Calling the key relationships function
    return {"message": "Welcome to the FastAPI Service", "key_relationships": key_relations}

@app.get("/get_tables")
def get_tables(db=Depends(get_db)):
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return {"tables": tables}

@app.get("/get_tables_with_columns")
def get_tables_with_columns(db=Depends(get_db)):
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    table_info = {}

    for table in tables:
        columns = [column["name"] for column in inspector.get_columns(table)]
        table_info[table] = columns

    return {"tables_with_columns": table_info}

@app.get("/get_table_columns/{table_name}")
def get_table_columns(table_name: str, db=Depends(get_db)):
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if table_name not in tables:
        return {"error": f"Table '{table_name}' does not exist"}

    columns = [column["name"] for column in inspector.get_columns(table_name)]
    return {"table": table_name, "columns": columns}

@app.get("/get_keys_relations")
def get_keys_relations_endpoint(db=Depends(get_db)):
    return get_keys_relations(db)  # Calling function from keys_relations.py

    table_info = {}

    for table in tables:
        columns = [column["name"] for column in inspector.get_columns(table)]
        table_info[table] = columns

    return {"tables_with_columns": table_info}

@app.get("/get_table_columns/{table_name}")
def get_table_columns(table_name: str, db=Depends(get_db)):
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if table_name not in tables:
        return {"error": f"Table '{table_name}' does not exist"}

    columns = [column["name"] for column in inspector.get_columns(table_name)]
    return {"table": table_name, "columns": columns}


class DataQualityRequest(BaseModel):
    table_names: List[str]

@app.post("/data-quality/")
def data_quality(table_names : str= None):
    """Endpoint to compute data quality for multiple tables."""
    table_names_list=table_names.split(",") if table_names else None
    print(table_names_list)
    return get_data_quality(table_names_list)
