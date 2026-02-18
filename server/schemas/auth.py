"""
Schemas Pydantic para autenticação e perfil.
"""
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Payload de login (nome + senha)."""
    nome: str = Field(..., min_length=1, max_length=200)
    senha: str = Field(..., min_length=1)


class CriarContaRequest(BaseModel):
    """Payload de criar conta."""
    nome: str = Field(..., min_length=1, max_length=200)
    nome_base: str = Field(..., min_length=1, max_length=200)
    senha: str = Field(..., min_length=8, max_length=128)


class UsuarioResponse(BaseModel):
    """Resposta com dados do usuário (sem senha)."""
    id: str
    nome: str
    nome_base: str
    role: str = "user"  # admin | user


class TokenResponse(BaseModel):
    """Resposta com token JWT."""
    access_token: str
    token_type: str = "bearer"


class UpdatePerfilRequest(BaseModel):
    """Payload para atualizar perfil (ex.: foto/avatar)."""
    foto: str = Field(..., min_length=1, max_length=2000)


class PerfilResponse(BaseModel):
    """Resposta com dados do perfil atualizado."""
    nome: str
    foto: str | None = None


class MeResponse(BaseModel):
    """Resposta com dados do usuário logado (perfil + config + tabelas)."""
    nome: str
    foto: str | None = None
    config: dict = Field(default_factory=dict)
    tabelas: dict = Field(default_factory=dict)  # IDs 1–20: config por tabela


class UpdateConfigRequest(BaseModel):
    """Payload para atualizar config do usuário (chaves/valores livres)."""
    config: dict = Field(default_factory=dict)


class ConfigResponse(BaseModel):
    """Resposta com config atualizado."""
    config: dict
