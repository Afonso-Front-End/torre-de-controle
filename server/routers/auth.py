"""
Rotas de autenticação: login e criar conta.
"""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from bson import ObjectId
from database import get_db
from security import hash_password, verify_password, create_access_token, decode_access_token
from table_ids import VALID_TABLE_IDS
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
from limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

COLLECTION = "usuarios"


def _tabelas_inicial():
    """Um slot vazio por tabela (IDs 1–20) para configurações futuras."""
    return {str(i): {} for i in sorted(VALID_TABLE_IDS)}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest):
    """
    Login por nome e senha.
    Retorna JWT em caso de sucesso.
    """
    db = get_db()
    col = db[COLLECTION]
    user = col.find_one({"nome": body.nome})
    if not user or not verify_password(body.senha, user["senha_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome ou senha incorretos.",
        )
    token = create_access_token(data={"sub": str(user["_id"]), "nome": user["nome"]})
    return TokenResponse(access_token=token)


@router.post("/criar-conta", response_model=UsuarioResponse)
@limiter.limit("5/minute")
def criar_conta(request: Request, body: CriarContaRequest):
    """
    Cria nova conta (nome, nome da base, senha).
    Senha é armazenada apenas em hash.
    """
    db = get_db()
    col = db[COLLECTION]
    if col.find_one({"nome": body.nome}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário com este nome.",
        )
    doc = {
        "nome": body.nome,
        "nome_base": body.nome_base,
        "senha_hash": hash_password(body.senha),
        "role": "user",
        "tabelas": _tabelas_inicial(),
    }
    result = col.insert_one(doc)
    return UsuarioResponse(
        id=str(result.inserted_id),
        nome=doc["nome"],
        nome_base=doc["nome_base"],
        role=doc["role"],
    )


def get_current_user_id(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str | None:
    """Extrai o ID do usuário do JWT (para rotas protegidas no futuro)."""
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    return payload["sub"]


def require_user_id(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    """Exige JWT válido; retorna o ID do usuário ou levanta 401."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação ausente.",
        )
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
        )
    return payload["sub"]


@router.patch("/perfil", response_model=PerfilResponse)
@limiter.limit("20/minute")
def atualizar_perfil(request: Request, body: UpdatePerfilRequest, user_id: str = Depends(require_user_id)):
    """
    Atualiza a foto do usuário logado.
    Requer Authorization: Bearer <token>.
    """
    db = get_db()
    col = db[COLLECTION]
    result = col.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"foto": body.foto}},
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )
    user = col.find_one({"_id": ObjectId(user_id)})
    return PerfilResponse(nome=user["nome"], foto=user.get("foto"))


@router.get("/me", response_model=MeResponse)
@limiter.limit("30/minute")
def get_me(request: Request, user_id: str = Depends(require_user_id)):
    """
    Retorna dados do usuário logado (nome, foto, config, tabelas).
    Requer Authorization: Bearer <token>.
    Se o usuário ainda não tiver campo tabelas (conta antiga), cria automaticamente.
    """
    db = get_db()
    col = db[COLLECTION]
    user = col.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )
    tabelas = user.get("tabelas")
    if not isinstance(tabelas, dict):
        tabelas = _tabelas_inicial()
        col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"tabelas": tabelas}},
        )
    return MeResponse(
        nome=user["nome"],
        foto=user.get("foto"),
        config=user.get("config") or {},
        tabelas=tabelas,
    )


@router.patch("/config", response_model=ConfigResponse)
@limiter.limit("30/minute")
def atualizar_config(request: Request, body: UpdateConfigRequest, user_id: str = Depends(require_user_id)):
    """
    Atualiza a config do usuário logado. O body.config é mesclado com a config existente.
    Requer Authorization: Bearer <token>.
    """
    db = get_db()
    col = db[COLLECTION]
    user = col.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )
    current = user.get("config") or {}
    merged = {**current, **body.config}
    # Garantir que motorista_prefixos_correio seja sempre uma lista (persistência correta)
    if "motorista_prefixos_correio" in merged:
        raw = merged["motorista_prefixos_correio"]
        if isinstance(raw, str):
            merged["motorista_prefixos_correio"] = [s.strip() for s in raw.split(",") if s.strip()]
        elif isinstance(raw, list):
            merged["motorista_prefixos_correio"] = [
                str(p).strip() for p in raw if p is not None and str(p).strip()
            ]
        else:
            merged["motorista_prefixos_correio"] = []
    col.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"config": merged}},
    )
    return ConfigResponse(config=merged)
