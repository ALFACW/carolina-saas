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
if %errorlevel% equ 0 goto instalar_deps

echo  Python no encontrado. Instalando automaticamente...
echo  (esto puede tardar 1-2 minutos, no cierres esta ventana)
echo.

winget install -e --id Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
if %errorlevel% equ 0 (
    echo.
    echo  Python instalado. Reiniciando...
    echo.
    start "" cmd /c ""%~f0""
    exit /b 0
)

:: winget fallo — intentar con version especifica
winget install -e --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
if %errorlevel% equ 0 (
    echo.
    echo  Python instalado. Reiniciando...
    echo.
    start "" cmd /c ""%~f0""
    exit /b 0
)

echo.
echo  No se pudo instalar Python automaticamente.
echo  Por favor instala Python manualmente:
echo    1. Se abrira python.org en tu navegador
echo    2. Descarga e instala Python (marca "Add Python to PATH")
echo    3. Vuelve a abrir este archivo
echo.
start https://www.python.org/downloads/
pause
exit /b 1

:: ── 2. Instalar pywin32 ──────────────────────────────────────────────────────
:instalar_deps
echo  Verificando componentes...
python -m pip install pywin32 --quiet --disable-pip-version-check
if %errorlevel% neq 0 (
    echo  Error al instalar pywin32. Verifica tu conexion a internet.
    pause
    exit /b 1
)

:: ── 3. Configurar inicio automatico ─────────────────────────────────────────
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

:: ── 4. Iniciar servidor ──────────────────────────────────────────────────────
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
