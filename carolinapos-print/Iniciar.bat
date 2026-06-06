@echo off
title CarolinaPOS - Servidor de Impresion
cd /d "%~dp0"

:: ── 1. Verificar Python ──────────────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  Python no encontrado. Abriendo pagina de descarga...
    echo  Al instalar Python, marca "Add Python to PATH".
    echo  Luego cierra esta ventana y vuelve a abrir Iniciar.bat.
    echo.
    start https://www.python.org/downloads/
    pause
    exit /b 1
)

:: ── 2. Instalar pywin32 ──────────────────────────────────────────────────────
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

:: ── 4. Iniciar servidor ──────────────────────────────────────────────────────
echo  Iniciando servidor...
python servidor.py

echo.
echo  El servidor se detuvo.
if exist "%~dp0servidor.log" (
    echo  Abriendo registro de errores...
    notepad "%~dp0servidor.log"
)
pause
