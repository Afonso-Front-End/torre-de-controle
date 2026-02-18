"""
Servidor FastAPI com MongoDB.
CORS, headers de segurança e rate limiting configurados.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import get_settings
from database import ping, close_db
from limiter import limiter
from routers import ROUTERS

settings = get_settings()


async def lifespan(app: FastAPI):
    """Inicialização e shutdown."""
    yield
    close_db()


app = FastAPI(
    title="Torre de Controle API",
    description="API segura com MongoDB",
    version="0.1.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS – apenas origens permitidas
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Headers de segurança (evitar clickjacking, XSS, etc.)
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


for router, prefix in ROUTERS:
    app.include_router(router, prefix=prefix)


@app.get("/health")
def health():
    """Health check (sem rate limit)."""
    return {"status": "ok", "mongo": ping()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
