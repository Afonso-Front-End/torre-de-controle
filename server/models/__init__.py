# Compatibilidade: re-exporta de schemas (pasta renomeada para schemas).
from schemas import (
    LoginRequest,
    CriarContaRequest,
    UsuarioResponse,
    TokenResponse,
    UpdatePerfilRequest,
    PerfilResponse,
    MeResponse,
    UpdateConfigRequest,
    ConfigResponse,
)

__all__ = [
    "LoginRequest",
    "CriarContaRequest",
    "UsuarioResponse",
    "TokenResponse",
    "UpdatePerfilRequest",
    "PerfilResponse",
    "MeResponse",
    "UpdateConfigRequest",
    "ConfigResponse",
]
