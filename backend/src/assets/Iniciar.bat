@echo off
title CarolinaPOS - Servidor de Impresion
cd /d "%~dp0"

:: ── 1. Verificar o instalar Python ───────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  Python no encontrado. Instalando automaticamente...
    winget install -e --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo  No se pudo instalar Python automaticamente.
        echo  Instala Python desde https://www.python.org/downloads/
        echo  Al instalar marca "Add Python to PATH".
        start https://www.python.org/downloads/
        pause
        exit /b 1
    )
    echo  Python instalado correctamente.
    echo  Reiniciando instalador...
    start "" "%~f0"
    exit /b 0
)

:: ── 2. Instalar pywin32 ───────────────────────────────────────────────────────
echo  Verificando componentes...
python -m pip install pywin32 --quiet --disable-pip-version-check

:: ── 3. Configurar inicio automatico (carpeta Startup, no requiere admin) ─────
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LAUNCHER=%STARTUP%\CarolinaPOS-Print.bat"
if not exist "%LAUNCHER%" (
    echo  Configurando inicio automatico con Windows...
    (
        echo @echo off
        echo cd /d "%~dp0"
        echo start "" pythonw "%~dp0servidor.py"
    ) > "%LAUNCHER%"
    if exist "%LAUNCHER%" (
        echo  Listo. El servidor se iniciara automaticamente al encender el PC.
    )
)

:: ── 4. Iniciar servidor ───────────────────────────────────────────────────────
echo  Iniciando servidor...
python servidor.py

echo.
echo  El servidor se detuvo.
if exist "%~dp0servidor.log" (
    echo  Abriendo registro de errores...
    notepad "%~dp0servidor.log"
)
pause
