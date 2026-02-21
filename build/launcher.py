"""
Launcher principal - Inicia servidor FastAPI e serve arquivos estÃ¡ticos do React
Este arquivo serÃ¡ empacotado como executÃ¡vel com PyInstaller
"""
import sys
import os
import webbrowser
import threading
import time
import subprocess
from pathlib import Path

# Adicionar diretório do servidor ao path
if getattr(sys, 'frozen', False):
    # Executando como executável empacotado
    # sys._MEIPASS é o diretório temporário onde PyInstaller extrai os arquivos
    if hasattr(sys, '_MEIPASS'):
        TEMP_DIR = Path(sys._MEIPASS)
    else:
        TEMP_DIR = Path(sys.executable).parent
    # Diretório onde o executável está (para MongoDB portátil)
    EXE_DIR = Path(sys.executable).parent
    SERVER_DIR = TEMP_DIR / 'server'
    FRONTEND_DIR = TEMP_DIR / 'frontend_dist'
    BASE_DIR = EXE_DIR  # Para MongoDB portátil
    print(f"[DEBUG] Executável empacotado detectado")
    print(f"[DEBUG] sys._MEIPASS: {TEMP_DIR}")
    print(f"[DEBUG] EXE_DIR: {EXE_DIR}")
else:
    # Executando como script Python normal
    BASE_DIR = Path(__file__).parent.parent
    EXE_DIR = BASE_DIR
    TEMP_DIR = BASE_DIR
    SERVER_DIR = BASE_DIR / 'server'
    FRONTEND_DIR = BASE_DIR / 'frontend' / 'dist'
    print(f"[DEBUG] Executando como script Python normal")

# Adicionar server ao path
sys.path.insert(0, str(SERVER_DIR))

# Carregar .env do server para o launcher usar as mesmas variáveis (ex.: GITHUB_REPO_*)
_env_file = SERVER_DIR / '.env'
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file)
    except Exception:
        pass

# Configurar variáveis de ambiente antes de importar
os.environ.setdefault('MONGO_URI', 'mongodb://localhost:27017')
os.environ.setdefault('MONGO_DB_NAME', 'torre_de_controle')
os.environ['CORS_ORIGINS'] = os.getenv('CORS_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000')
os.environ['HOST'] = '127.0.0.1'
os.environ['PORT'] = '8000'
os.environ.setdefault('GITHUB_REPO_OWNER', 'Afonso-Front-End')
os.environ.setdefault('GITHUB_REPO_NAME', 'torre-de-controle')

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import JSONResponse

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import uvicorn

# Importar routers e dependências
from routers import ROUTERS
from limiter import limiter
from database import ping, close_db
from config import get_settings

settings = get_settings()

# Lifespan para fechar conexão MongoDB ao encerrar
async def lifespan(app: FastAPI):
    """Inicialização e shutdown."""
    yield
    close_db()

# Criar app principal
app = FastAPI(title="Torre de Controle", lifespan=lifespan)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Rejeita requisições com Content-Length acima do limite (max_upload_mb)."""
    async def dispatch(self, request: StarletteRequest, call_next):
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
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'"
    return response

# Incluir routers da API PRIMEIRO (antes das rotas estáticas)
# Isso garante que rotas da API sejam processadas antes da rota catch-all
for router, prefix in ROUTERS:
    app.include_router(router, prefix=prefix)

# Servir arquivos estáticos do React DEPOIS das rotas da API
if FRONTEND_DIR.exists():
    print(f"[DEBUG] Frontend encontrado em: {FRONTEND_DIR}")
    
    # Servir assets estáticos
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
        print(f"[DEBUG] Assets montados em /assets")
    else:
        print(f"[DEBUG] Pasta assets não encontrada em: {assets_dir}")
    
    # Rota raiz - servir index.html
    @app.get("/")
    async def serve_index():
        """Serve index.html na raiz"""
        index_path = FRONTEND_DIR / "index.html"
        print(f"[DEBUG] Tentando servir index.html de: {index_path}")
        if index_path.exists():
            return FileResponse(str(index_path))
        return {"error": f"index.html não encontrado em {index_path}"}
    
    # Rota catch-all para SPA routing (deve ser a ÚLTIMA rota)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve index.html para todas as rotas (SPA routing)"""
        # Não deve chegar aqui para rotas /api/* pois já foram processadas acima
        # Mas por segurança, verificar novamente
        if full_path.startswith("api"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Rota da API não encontrada")
        
        # Tentar servir o arquivo se existir
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        
        # Para qualquer outra rota, servir index.html (SPA)
        index_path = FRONTEND_DIR / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
        
        return {"error": f"Frontend não encontrado. Procurado em: {FRONTEND_DIR}"}
else:
    print(f"[ERRO] Frontend não encontrado em: {FRONTEND_DIR}")

# Health check
@app.get("/health")
def health():
    """Health check (sem rate limit)."""
    return {"status": "ok", "mongo": ping()}



def start_mongodb_portable():
    """Tenta iniciar MongoDB portátil se disponível"""
    mongodb_bin = EXE_DIR / 'MongoDB' / 'bin' / 'mongod.exe'
    mongodb_data = EXE_DIR / 'MongoDB' / 'data'
    
    if mongodb_bin.exists():
        print(f"[INFO] MongoDB portátil encontrado: {mongodb_bin}")
        # Criar diretório de dados se não existir
        mongodb_data.mkdir(parents=True, exist_ok=True)
        
        try:
            # Iniciar MongoDB em background
            process = subprocess.Popen(
                [
                    str(mongodb_bin),
                    '--dbpath', str(mongodb_data),
                    '--port', '27017',
                    '--bind_ip', '127.0.0.1'
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            )
            print(f"[INFO] MongoDB portátil iniciado (PID: {process.pid})")
            # Aguardar um pouco para MongoDB iniciar
            time.sleep(2)
            return process
        except Exception as e:
            print(f"[ERRO] Falha ao iniciar MongoDB portátil: {e}")
            return None
    else:
        print(f"[INFO] MongoDB portátil não encontrado em: {mongodb_bin}")
        print(f"[INFO] Tentando conectar ao MongoDB em mongodb://localhost:27017")
        return None


def check_mongodb_connection():
    """Verifica se o MongoDB está acessível"""
    try:
        from database import ping
        if ping():
            print("[OK] Conexão com MongoDB estabelecida!")
            return True
        else:
            print("[AVISO] MongoDB não está respondendo")
            return False
    except Exception as e:
        print(f"[ERRO] Erro ao verificar MongoDB: {e}")
        return False


def open_browser():
    """Abre o navegador após um pequeno delay"""
    time.sleep(1.5)
    webbrowser.open('http://127.0.0.1:8000')


def _show_error_message(title, message):
    """Mostra mensagem de erro em caixa de diálogo (Windows). Em erro não fecha a janela do utilizador."""
    if sys.platform == 'win32':
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, message, title, 0x10)  # MB_OK + MB_ICONERROR
        except Exception:
            pass
    # Fallback: escrever para stderr (em modo script ainda aparece no terminal)
    print(message, file=sys.stderr)


def _ask_yes_no(title, message):
    """Pergunta Sim/Não. No exe (sem consola) usa MessageBox; em script usa input()."""
    if getattr(sys, 'frozen', False) and sys.platform == 'win32':
        try:
            import ctypes
            # MB_YESNO = 0x04, MB_ICONQUESTION = 0x20, IDYES = 6
            r = ctypes.windll.user32.MessageBoxW(0, message, title, 0x24)
            return r == 6  # IDYES
        except Exception:
            return False
    # Modo script (com consola)
    resposta = input(f"\n{message} (s/N): ").strip().lower()
    return resposta == 's'


def _setup_log_file():
    """Quando executável: redireciona stdout/stderr para ficheiro de log (para não perder mensagens)."""
    if not getattr(sys, 'frozen', False):
        return
    try:
        log_dir = EXE_DIR / 'logs'
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / 'torre-de-controle.log'
        f = open(log_file, 'a', encoding='utf-8')
        f.write(f"\n--- {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
        f.flush()
        sys.stdout = f
        sys.stderr = f
    except Exception:
        pass


if __name__ == "__main__":
    # Quando é o .exe (frozen), não há janela de consola: redirecionar saída para log
    _setup_log_file()

    mongodb_process = None
    try:
        print("=" * 60)
        print("Torre de Controle - Iniciando servidor...")
        print("=" * 60)

        mongodb_process = start_mongodb_portable()

        print("[INFO] Verificando conexão com MongoDB...")
        if not check_mongodb_connection():
            print("[AVISO] MongoDB não está acessível.")
            mongodb_path = EXE_DIR / 'MongoDB' / 'bin' / 'mongod.exe'
            msg = (
                "MongoDB não está acessível.\n\n"
                "Opções:\n"
                "1. Instale e inicie o MongoDB manualmente\n"
                f"2. Adicione MongoDB portátil em:\n   {mongodb_path}\n"
                "3. Configure MONGO_URI no .env\n\n"
                "Deseja continuar mesmo assim? (algumas funcionalidades podem não funcionar)"
            )
            if not _ask_yes_no("Torre de Controle - MongoDB", msg):
                print("Encerrando...")
                sys.exit(1)
            print("[AVISO] Continuando sem MongoDB.")

        print(f"[INFO] Diretório base: {BASE_DIR}")
        print("[INFO] Abrindo navegador em http://127.0.0.1:8000")

        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()

        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8000,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n[INFO] Servidor encerrado pelo usuário")
        if mongodb_process:
            try:
                mongodb_process.terminate()
            except Exception:
                pass
        sys.exit(0)
    except Exception as e:
        err_msg = f"{type(e).__name__}: {e}"
        print(f"[ERRO] {err_msg}", file=sys.stderr)
        _show_error_message("Torre de Controle - Erro", err_msg)
        if mongodb_process:
            try:
                mongodb_process.terminate()
            except Exception:
                pass
        sys.exit(1)
