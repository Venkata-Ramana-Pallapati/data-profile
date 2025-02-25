from fastapi import FastAPI, File, UploadFile, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import sessionmaker, declarative_base
import pandas as pd
import io
from datetime import datetime
import numpy as np

app = FastAPI()

# Database Configuration
DATABASE_URL = "sqlite:///./database.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Define Tables
class Customer(Base):
    __tablename__ = "customer"
    customer_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)  # Changed to String
    address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Sales(Base):
    __tablename__ = "sales"
    sales_id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey("customer.customer_id"))
    product_id = Column(String, ForeignKey("product.product_id"))
    retailer_id = Column(String, ForeignKey("retailer.retailer_id"))
    quantity = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    sales_date = Column(DateTime, default=datetime.utcnow)

class Orders(Base):
    __tablename__ = "orders"
    order_id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey("customer.customer_id"))
    product_id = Column(String, ForeignKey("product.product_id"))
    retailer_id = Column(String, ForeignKey("retailer.retailer_id"))
    order_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False)

class Product(Base):
    __tablename__ = "product"
    product_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category_id = Column(String, ForeignKey("product_category.category_id"))
    price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, nullable=False)

class ProductCategory(Base):
    __tablename__ = "product_category"
    category_id = Column(String, primary_key=True)
    category_name = Column(String, nullable=False)

class Retailer(Base):
    __tablename__ = "retailer"
    retailer_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)

class SelfPosition(Base):
    __tablename__ = "self_position"
    position_id = Column(String, primary_key=True)
    product_id = Column(String, ForeignKey("product.product_id"))
    shelf_location = Column(String, nullable=False)
    height = Column(Float, nullable=False)

# Create Tables
Base.metadata.create_all(bind=engine)

# CSV Upload Function
@app.post("/upload_csv/{table_name}")
async def upload_csv(table_name: str, file: UploadFile = File(...), db=Depends(get_db)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))

        # Convert column names to lowercase and strip spaces
        df.columns = df.columns.str.lower().str.strip()

        # Convert NaN values to None
        df.replace({np.nan: None}, inplace=True)

        # Predefined tables and their models
        tables = {
            "customer": Customer,
            "sales": Sales,
            "orders": Orders,
            "product": Product,
            "product_category": ProductCategory,
            "retailer": Retailer,
            "self_position": SelfPosition
        }

        if table_name not in tables:
            return {"error": "Invalid table name"}

        TableClass = tables[table_name]

        # Get database table columns
        table_columns = {column.name for column in TableClass.__table__.columns}
        csv_columns = set(df.columns)

        # Identify invalid columns and remove them
        invalid_columns = csv_columns - table_columns
        if invalid_columns:
            df = df.drop(columns=invalid_columns)

        # Convert ID and phone number columns to string
        id_columns = ["customer_id", "product_id", "retailer_id", "order_id", "sales_id", "category_id", "position_id", "phone"]
        for col in id_columns:
            if col in df.columns:
                df[col] = df[col].astype(str)

        # Convert datetime columns to Python datetime objects
        datetime_columns = [col for col in df.columns if "date" in col or "created_at" in col]
        for col in datetime_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce")
                df[col] = df[col].apply(lambda x: x.to_pydatetime() if pd.notnull(x) else None)

        # Insert data
        db.bulk_insert_mappings(TableClass, df.to_dict(orient="records"))
        db.commit()

        return {"message": f"CSV uploaded successfully to {table_name}"}

    except Exception as e:
        return {"error": str(e)}