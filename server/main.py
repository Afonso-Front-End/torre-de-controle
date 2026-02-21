"""
Servidor FastAPI com MongoDB.
CORS, headers de segurança, limite de body e rate limiting configurados.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

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


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Rejeita requisições com Content-Length acima do limite (max_upload_mb)."""

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > settings.max_upload_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": f"Corpo da requisição demasiado grande. Limite: {settings.max_upload_mb} MB."},
                    )
            except ValueError:
                pass
        return await call_next(request)


app.add_middleware(BodySizeLimitMiddleware)

# Headers de segurança (evitar clickjacking, XSS, etc.) + CSP
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'"
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
