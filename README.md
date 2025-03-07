This repository contains a full-stack web application built using FastAPI for the backend and React for the frontend. The application utilizes SQLite3 as the database and includes a set of dependencies listed in the requirements.txt file.
Features
FastAPI Backend: A high-performance backend using FastAPI with automatic OpenAPI documentation.
React Frontend: A modern single-page application (SPA) built with React.
SQLite3 Database: Lightweight, file-based database for development and small-scale applications.
API Endpoints: CRUD operations and authentication support.
Docker Support (Optional): Easily deploy the application using Docker.
Tech StackBackend (FastAPI)
Python
FastAPI
SQLite3
SQLAlchemy
Pydantic
Frontend (React)
React.js
Vite (or Create React App)
Axios
React Router
Installation and SetupPrerequisites
Ensure you have the following installed:
Python 3.8+
Node.js & npm
Backend Setup
Clone the repository:
git clone https://github.com/your-username/your-repository.git
cd your-repository
Create and activate a virtual environment:
python -m venv env
source env/bin/activate  # On Windows use `env\Scripts\activate`
Install backend dependencies:
pip install -r requirements.txt
Run the FastAPI server:
uvicorn app.main:app --reload
The API will be available at http://127.0.0.1:8000.
Frontend Setup
Navigate to the frontend directory:
cd frontend
Install frontend dependencies:
npm install
Run the React development server:
npm run dev  # For Vite
The frontend will be available at http://localhost:3000.
API Documentation
FastAPI automatically generates interactive API documentation:
Swagger UI: http://127.0.0.1:8000/docs
ReDoc: http://127.0.0.1:8000/redoc
