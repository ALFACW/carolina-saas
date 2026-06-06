@echo off
title CarolinaPOS - Servidor de Impresion
cd /d "%~dp0"
echo.
echo  +------------------------------------------+
echo  ^|  CarolinaPOS Print Server v2.0            ^|
echo  +------------------------------------------+
echo.

:: ── 1. Verificar Python ──────────────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Python no encontrado. Instalando automaticamente...
    echo.
    winget install -e --id Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo  No se pudo instalar automaticamente.
        echo  Descarga Python desde python.org, marca "Add Python to PATH",
        echo  luego vuelve a abrir este archivo.
        start https://www.python.org/downloads/
        pause
        exit /b 1
    )
    echo.
    echo  Python instalado. Reiniciando...
    echo.
    :: Reabrir este mismo bat en una nueva consola con PATH actualizado
    start "" cmd /c ""%~f0""
    exit /b 0
)

:: ── 2. Instalar pywin32 ──────────────────────────────────────────────────────
echo  Verificando componentes...
python -m pip install pywin32 --quiet --disable-pip-version-check
if %errorlevel% neq 0 (
    echo  Error al instalar pywin32. Verifica tu conexion a internet.
    pause
    exit /b 1
)

:: ── 3. Verificar config.json ─────────────────────────────────────────────────
if not exist "%~dp0config.json" (
    echo.
    echo  Falta el archivo config.json.
    echo.
    echo  Para obtenerlo:
    echo    1. Abre app.carolinapos.co en tu navegador
    echo    2. Ve a Configuracion -^> Impresora
    echo    3. Haz clic en "Descargar config.json"
    echo    4. Copia el archivo a esta misma carpeta
    echo    5. Vuelve a abrir Iniciar.bat
    echo.
    start https://app.carolinapos.co/configuracion
    pause
    exit /b 1
)

:: ── 4. Configurar inicio automatico ─────────────────────────────────────────
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LAUNCHER=%STARTUP%\CarolinaPOS-Print.bat"
if not exist "%LAUNCHER%" (
    echo  Configurando inicio automatico con Windows...
    (
        echo @echo off
        echo cd /d "%~dp0"
        echo start "" pythonw "%~dp0servidor.py"
    ) > "%LAUNCHER%"
    echo  Listo. El servidor arrancara automaticamente al encender el PC.
)

:: ── 5. Iniciar servidor ──────────────────────────────────────────────────────
echo  Iniciando servidor...
echo  Deja esta ventana abierta mientras usas CarolinaPOS.
echo.
python servidor.py

echo.
echo  El servidor se detuvo.
if exist "%~dp0servidor.log" (
    echo  Abriendo registro de errores...
    notepad "%~dp0servidor.log"
)
pause
