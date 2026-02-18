@echo off
REM Script de build para Windows
echo ========================================
echo Torre de Controle - Build Executavel
echo ========================================
echo.

cd /d "%~dp0"

REM 1. Build do Frontend React
echo [1/5] Construindo frontend React...
cd ..\frontend
if not exist "node_modules" (
    echo Instalando dependencias do frontend...
    call npm install
)
call npm run build
if errorlevel 1 (
    echo ERRO: Falha ao construir frontend!
    pause
    exit /b 1
)
cd ..\build

REM 2. Instalar dependências Python
echo [2/5] Instalando dependencias Python...
cd ..\server
python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias Python!
    pause
    exit /b 1
)

REM 3. Instalar PyInstaller
echo [3/5] Instalando PyInstaller...
python -m pip install pyinstaller --quiet
if errorlevel 1 (
    echo ERRO: Falha ao instalar PyInstaller!
    pause
    exit /b 1
)

REM 4. Fechar executável existente se estiver rodando
echo [4/5] Verificando se executavel esta em uso...
cd ..\build
tasklist /FI "IMAGENAME eq TorreDeControle.exe" 2>NUL | find /I /N "TorreDeControle.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Executavel encontrado em execucao. Tentando encerrar...
    taskkill /F /IM TorreDeControle.exe >NUL 2>&1
    timeout /t 2 /nobreak >NUL
    echo Processo encerrado.
)

REM Remover executável antigo se existir
if exist "dist\TorreDeControle.exe" (
    echo Removendo executavel antigo...
    del /F /Q "dist\TorreDeControle.exe" >NUL 2>&1
    timeout /t 1 /nobreak >NUL
)

REM 5. Criar executável
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
