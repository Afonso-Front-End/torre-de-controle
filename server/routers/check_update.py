"""
Verificação de atualizações via GitHub Releases.
Consulta a API do GitHub e retorna a última release (tag, URL, etc.).
"""
import urllib.request
import json
from fastapi import APIRouter
from config import get_settings

router = APIRouter(prefix="/check-update", tags=["check-update"])


def _fetch_latest_release(owner: str, repo: str) -> dict | None:
    """Obtém a última release do repositório GitHub. Retorna None em caso de erro."""
    url = f"https://api.github.com/repos/{owner}/{repo}/releases/latest"
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github.v3+json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


@router.get("")
def check_update():
    """
    Retorna informações da última release no GitHub.
    Configure GITHUB_REPO_OWNER e GITHUB_REPO_NAME no .env.
    Se não estiver configurado ou a API falhar, retorna has_update: false.
    """
    settings = get_settings()
    owner = (settings.github_repo_owner or "").strip()
    repo = (settings.github_repo_name or "").strip()

    if not owner or not repo:
        return {
            "has_update": False,
            "message": "Repositório GitHub não configurado (GITHUB_REPO_OWNER, GITHUB_REPO_NAME)",
        }

    release = _fetch_latest_release(owner, repo)
    if not release:
        return {"has_update": False, "message": "Não foi possível verificar atualizações."}

    tag_name = release.get("tag_name") or ""
    # Remove 'v' do início se existir (ex.: v1.0.0 -> 1.0.0)
    version = tag_name.lstrip("v") if tag_name else ""

    return {
        "has_update": True,
        "tag_name": tag_name,
        "version": version,
        "name": release.get("name") or tag_name,
        "html_url": release.get("html_url") or f"https://github.com/{owner}/{repo}/releases",
        "body": (release.get("body") or "")[:500],
        "published_at": release.get("published_at"),
    }
