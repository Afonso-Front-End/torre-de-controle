# -*- mode: python ; coding: utf-8 -*-
"""
Arquivo de especificaÃ§Ã£o do PyInstaller
Execute: pyinstaller build.spec
"""

import sys
from pathlib import Path

# Diretórios
# PyInstaller define SPECPATH automaticamente quando executa o spec
# IMPORTANTE: SPECPATH retorna o DIRETÓRIO onde o spec está, não o arquivo!
import os

# Obter caminho absoluto do diretório do spec
# PyInstaller sempre define SPECPATH quando executa o spec
# SPECPATH retorna o diretório (ex: D:\torre-de-controle\build), não o arquivo
if 'SPECPATH' in globals():
    spec_dir = Path(os.path.abspath(SPECPATH))
else:
    # Fallback: usar diretório atual ou __file__
    try:
        spec_dir = Path(os.path.abspath(__file__)).parent
    except NameError:
        spec_dir = Path(os.getcwd())

# BASE_DIR é o diretório pai do diretório build (raiz do projeto)
# spec_dir está em: D:\torre-de-controle\build
# Então BASE_DIR deve ser: D:\torre-de-controle (subir um nível)
BASE_DIR = spec_dir.parent

SERVER_DIR = BASE_DIR / 'server'
FRONTEND_DIST = BASE_DIR / 'frontend' / 'dist'

# Converter para caminhos absolutos
SERVER_DIR = Path(os.path.abspath(str(SERVER_DIR)))
FRONTEND_DIST = Path(os.path.abspath(str(FRONTEND_DIST)))

# Debug: mostrar caminhos
print(f"[DEBUG] SPECPATH: {SPECPATH if 'SPECPATH' in globals() else 'N/A'}")
print(f"[DEBUG] spec_dir: {spec_dir}")
print(f"[DEBUG] BASE_DIR: {BASE_DIR}")
print(f"[DEBUG] FRONTEND_DIST: {FRONTEND_DIST}")
print(f"[DEBUG] FRONTEND_DIST existe: {FRONTEND_DIST.exists()}")
print(f"[DEBUG] SERVER_DIR: {SERVER_DIR}")
print(f"[DEBUG] SERVER_DIR existe: {SERVER_DIR.exists()}")

# Verificar se os diretórios existem
if not FRONTEND_DIST.exists():
    raise FileNotFoundError(
        f"Diretório frontend/dist não encontrado!\n"
        f"Procurado em: {FRONTEND_DIST}\n"
        f"BASE_DIR: {BASE_DIR}\n"
        f"Diretório atual: {os.getcwd()}\n"
        f"spec_dir: {spec_dir}"
    )
if not SERVER_DIR.exists():
    raise FileNotFoundError(
        f"Diretório server não encontrado!\n"
        f"Procurado em: {SERVER_DIR}\n"
        f"BASE_DIR: {BASE_DIR}"
    )

block_cipher = None

a = Analysis(
    ['launcher.py'],
    pathex=[str(BASE_DIR / 'build'), str(SERVER_DIR)],
    binaries=[],
    datas=[
        # Incluir arquivos estáticos do frontend (PyInstaller copia recursivamente)
        (str(FRONTEND_DIST), 'frontend_dist'),
        # Incluir arquivos do servidor necessários
        (str(SERVER_DIR / 'routers'), 'server/routers'),
        (str(SERVER_DIR / 'services'), 'server/services'),
        (str(SERVER_DIR / 'schemas'), 'server/schemas'),
        # Incluir arquivos Python do servidor
        (str(SERVER_DIR / 'database.py'), 'server'),
        (str(SERVER_DIR / 'config.py'), 'server'),
        (str(SERVER_DIR / 'limiter.py'), 'server'),
        (str(SERVER_DIR / 'security.py'), 'server'),
        (str(SERVER_DIR / 'table_ids.py'), 'server'),
        (str(SERVER_DIR / 'main.py'), 'server'),
    ],
    hiddenimports=[
        'uvicorn',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.logging',
        'fastapi',
        'fastapi.staticfiles',
        'fastapi.responses',
        'pymongo',
        'openpyxl',
        'bcrypt',
        'jose',
        'slowapi',
        'pydantic',
        'dotenv',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='TorreDeControle',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
