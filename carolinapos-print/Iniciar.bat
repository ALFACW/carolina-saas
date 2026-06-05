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

:: ── 2. Instalar dependencias ─────────────────────────────────────────────────
echo  Verificando componentes...
python -m pip install flask pywin32 --quiet --disable-pip-version-check

:: ── 3. Configurar inicio automatico via carpeta Startup (no requiere admin) ──
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LAUNCHER=%STARTUP%\CarolinaPOS-Print.bat"
if not exist "%LAUNCHER%" (
    echo  Configurando inicio automatico...
    (
        echo @echo off
        echo cd /d "%~dp0"
        echo start "" pythonw "%~dp0servidor.py"
    ) > "%LAUNCHER%"
    if exist "%LAUNCHER%" (
        echo  Listo. El servidor se iniciara automaticamente al encender el PC.
    ) else (
        echo  No se pudo configurar inicio automatico.
    )
)

:: ── 4. Verificar si ya esta corriendo ────────────────────────────────────────
netstat -an 2>nul | find ":8765" | find "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo.
    echo  El servidor ya esta corriendo en http://localhost:8765
    echo  Se inicia automaticamente al encender el PC.
    echo  Puedes cerrar esta ventana.
    echo.
    pause
    exit /b 0
)

:: ── 5. Iniciar servidor en segundo plano ─────────────────────────────────────
echo  Iniciando servidor...
start "" pythonw servidor.py

timeout /t 4 /nobreak >nul

:: ── 6. Verificar que inicio bien ─────────────────────────────────────────────
netstat -an 2>nul | find ":8765" | find "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo.
    echo  Servidor CarolinaPOS corriendo en http://localhost:8765
    echo  Puedes cerrar esta ventana.
    echo.
) else (
    echo.
    echo  ERROR: El servidor no pudo iniciarse.
    echo  Abriendo registro de errores...
    echo.
    if exist "%~dp0servidor.log" (
        notepad "%~dp0servidor.log"
    ) else (
        echo  No se genero registro. Intenta ejecutar este archivo como Administrador.
    )
)

pause
