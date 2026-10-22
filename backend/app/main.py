import logging
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.routers import (
    admin,
    auth,
    customers,
    delivery,
    parcels,
    rates,
    sellers,
    shipments,
    super_admin,
    tracking,
)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("courier_logistics")

app = FastAPI(
    title="Courier Logistics API",
    description="Multi-Hub Courier & Logistics Tracking System Backend API",
    version="1.0.0",
)

# Parse dynamic CORS origins from config
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches unhandled exceptions and logs details."""
    logger.error(f"Unhandled error processing {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal Error: {str(exc)}"},
    )


# Register routers
app.include_router(auth.router)
app.include_router(tracking.router)
app.include_router(parcels.router)
app.include_router(shipments.router)
app.include_router(delivery.router)
app.include_router(admin.router)
app.include_router(customers.router)
app.include_router(rates.router)
app.include_router(sellers.router)
app.include_router(super_admin.router)


@app.get("/", tags=["Root"])
def root():
    """Root entrypoint returning system meta information."""
    return {
        "message": "Courier Logistics API",
        "docs": "/docs",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """System health check endpoint verifying database connectivity."""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
        }
    except Exception as exc:
        logger.error(f"Health check failed: database unreachable: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connectivity check failed: {str(exc)}",
        )
