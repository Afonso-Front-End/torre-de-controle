"""
Configuração via variáveis de ambiente.
Nunca commitar .env com valores reais.
"""
from functools import lru_cache
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Configurações carregadas de .env com validação (Pydantic v1)."""

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "torre_de_controle"

    # Segurança
    secret_key: str = "change-me-in-production-use-secrets-token-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 600  # 10 horas

    # CORS: origens permitidas (lista). Inclui 5173 (dev) e 8000 (app servido pelo próprio backend).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000"

    # Servidor
    host: str = "0.0.0.0"
    port: int = 8000

    # GitHub – verificação de atualizações. Quem clona o repo usa estes valores por padrão.
    github_repo_owner: str = "Afonso-Front-End"
    github_repo_name: str = "torre-de-controle"

    @property
    def cors_origins_list(self):
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
