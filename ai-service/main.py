from fastapi import FastAPI

app = FastAPI(
    title="StockWise AI Service",
    description="Service intelligent de gestion de stock",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "Bienvenue dans StockWise AI Service"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "StockWise AI Service"
    }