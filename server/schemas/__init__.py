# Schemas Pydantic para validação de entrada/saída da API.
from .auth import (
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
from .resultados_consulta import (
    ProcessarResultadosRequest,
    ProcessarResultadosResponse,
    ListaMotoristaResponse,
    NumerosJmsResponse,
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
    "ProcessarResultadosRequest",
    "ProcessarResultadosResponse",
    "ListaMotoristaResponse",
    "NumerosJmsResponse",
]
