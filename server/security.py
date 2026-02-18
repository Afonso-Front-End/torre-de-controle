"""
Segurança: hash de senha (bcrypt) e JWT.
Nunca logar senhas ou tokens em produção.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from config import get_settings

_settings = get_settings()

# Bcrypt limita a senha a 72 bytes
_MAX_PASSWORD_BYTES = 72


def _prepare_password(senha: str) -> bytes:
    """Codifica a senha em UTF-8 e trunca a 72 bytes (limite do bcrypt)."""
    raw = senha.encode("utf-8")
    if len(raw) > _MAX_PASSWORD_BYTES:
        raw = raw[:_MAX_PASSWORD_BYTES]
    return raw


def hash_password(senha: str) -> str:
    """Gera hash bcrypt da senha."""
    raw = _prepare_password(senha)
    hashed = bcrypt.hashpw(raw, bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def verify_password(senha_plana: str, senha_hash: str) -> bool:
    """Verifica se a senha confere com o hash."""
    raw = _prepare_password(senha_plana)
    return bcrypt.checkpw(raw, senha_hash.encode("utf-8"))


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Cria um JWT com expiração."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=_settings.access_token_expire_minutes)
    )
    to_encode["exp"] = expire
    to_encode["iat"] = datetime.now(timezone.utc)
    return jwt.encode(to_encode, _settings.secret_key, algorithm=_settings.algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decodifica e valida o JWT. Retorna None se inválido."""
    try:
        payload = jwt.decode(
            token,
            _settings.secret_key,
            algorithms=[_settings.algorithm],
        )
        return payload
    except JWTError:
        return None
