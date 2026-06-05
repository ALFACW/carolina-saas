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

:: ── 2. Instalar dependencias (solo si faltan) ────────────────────────────────
echo  Verificando componentes...
python -m pip install flask pywin32 --quiet --disable-pip-version-check

:: ── 3. Configurar inicio automatico con Windows (solo la primera vez) ────────
set "TASKNAME=CarolinaPOS Print Server"
schtasks /query /tn "%TASKNAME%" >nul 2>&1
if %errorlevel% neq 0 (
    echo  Configurando inicio automatico...
    schtasks /create /tn "%TASKNAME%" /sc onlogon /tr "pythonw \"%~dp0servidor.py\"" /rl limited /f >nul 2>&1
    if %errorlevel% == 0 (
        echo  Listo. El servidor se iniciara automaticamente al encender el PC.
    ) else (
        echo  No se pudo configurar el inicio automatico.
    )
)

:: ── 4. Verificar si ya esta corriendo ────────────────────────────────────────
netstat -an 2>nul | find ":8765" | find "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo.
    echo  El servidor ya esta corriendo en http://localhost:8765
    echo  Se inicia automaticamente cada vez que enciendes el PC.
    echo  Puedes cerrar esta ventana.
    echo.
    pause
    exit /b 0
)

:: ── 5. Iniciar servidor en segundo plano (sin ventana) ───────────────────────
echo  Iniciando servidor...
start "" pythonw servidor.py

timeout /t 3 /nobreak >nul

netstat -an 2>nul | find ":8765" | find "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo.
    echo  Servidor CarolinaPOS corriendo en http://localhost:8765
    echo  Puedes cerrar esta ventana.
) else (
    echo.
    echo  ERROR: El servidor no pudo iniciarse.
    echo  Intenta ejecutar este archivo como Administrador.
)

echo.
pause
