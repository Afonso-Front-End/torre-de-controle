"""
Conexão segura com MongoDB.
Usa variáveis de ambiente para URI e nome do banco.
"""
# Campo em todas as coleções de dados do usuário: só retorna/altera documentos deste usuário
USER_ID_FIELD = "userId"

from pymongo import MongoClient
from pymongo.errors import PyMongoError
from config import get_settings

_settings = get_settings()
_client: MongoClient | None = None


def get_client() -> MongoClient:
    """Retorna o cliente MongoDB (singleton)."""
    global _client
    if _client is None:
        _client = MongoClient(
            _settings.mongo_uri,
            serverSelectionTimeoutMS=5000,
            maxPoolSize=10,
        )
    return _client


def get_db():
    """Retorna a instância do banco de dados."""
    return get_client()[_settings.mongo_db_name]


def close_db():
    """Fecha a conexão (útil para testes ou shutdown)."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


def ping() -> bool:
    """Verifica se o MongoDB está acessível."""
    try:
        get_client().admin.command("ping")
        return True
    except PyMongoError:
        return False
