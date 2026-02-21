@echo off
REM Script de build para Windows
setlocal
echo ========================================
echo Torre de Controle - Build Executavel
echo ========================================
echo.

cd /d "%~dp0"

REM 1. Build do Frontend React
echo [1/5] Construindo frontend React...
set "FRONTEND_DIR=%~dp0..\frontend"
if not exist "%FRONTEND_DIR%\package.json" (
    echo ERRO: Nao encontrado %FRONTEND_DIR%\package.json
    pause
    exit /b 1
)
pushd "%FRONTEND_DIR%"
if not exist "node_modules" (
    echo Instalando dependencias do frontend...
    call npm install
)
call npm run build
if errorlevel 1 (
    echo ERRO: Falha ao construir frontend!
    popd
    pause
    exit /b 1
)
popd

REM 2. Instalar dependencias Python
echo [2/5] Instalando dependencias Python...
set "SERVER_DIR=%~dp0..\server"
pushd "%SERVER_DIR%"
python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias Python!
    popd
    pause
    exit /b 1
)

REM 3. Instalar PyInstaller
echo [3/5] Instalando PyInstaller...
python -m pip install pyinstaller --quiet
if errorlevel 1 (
    echo ERRO: Falha ao instalar PyInstaller!
    popd
    pause
    exit /b 1
)

REM 4. Fechar executavel existente se estiver rodando
echo [4/5] Verificando se executavel esta em uso...
popd
cd /d "%~dp0"
tasklist /FI "IMAGENAME eq TorreDeControle.exe" 2>NUL | find /I /N "TorreDeControle.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Executavel encontrado em execucao. Tentando encerrar...
    taskkill /F /IM TorreDeControle.exe >NUL 2>&1
    timeout /t 2 /nobreak >NUL
    echo Processo encerrado.
)

REM Remover executavel antigo se existir
if exist "dist\TorreDeControle.exe" (
    echo Removendo executavel antigo...
    del /F /Q "dist\TorreDeControle.exe" >NUL 2>&1
    timeout /t 1 /nobreak >NUL
)

REM 5. Criar executavel
echo [5/5] Criando executavel...
python -m PyInstaller build.spec --clean --noconfirm
if errorlevel 1 (
    echo ERRO: Falha ao criar executavel!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build concluido com sucesso!
echo ========================================
echo O executavel esta em: dist\TorreDeControle.exe
echo.
pause
