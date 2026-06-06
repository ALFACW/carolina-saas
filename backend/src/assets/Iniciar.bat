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
echo  (puede tardar 2-3 minutos, no cierres esta ventana)
echo.

:: Intento 1: winget (rapido, sin descarga)
winget install -e --id Python.Python.3 --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
if %errorlevel% equ 0 goto python_listo

:: Intento 2: descargar instalador via PowerShell
echo  Descargando instalador de Python...
powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe' -OutFile '%TEMP%\python_setup.exe' -UseBasicParsing" >nul 2>&1

:: Intento 3: si PowerShell fallo, usar certutil
if not exist "%TEMP%\python_setup.exe" (
    certutil -urlcache -split -f "https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe" "%TEMP%\python_setup.exe" >nul 2>&1
)

if exist "%TEMP%\python_setup.exe" (
    echo  Instalando Python, espera...
    "%TEMP%\python_setup.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0
    del "%TEMP%\python_setup.exe" >nul 2>&1
    goto python_listo
)

echo.
echo  ERROR: No se pudo instalar Python automaticamente.
echo  Verifica que tengas conexion a internet y vuelve a intentarlo.
pause
exit /b 1

:python_listo
echo  Python instalado. Reiniciando...
echo.
start "" cmd /c ""%~f0""
exit /b 0

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
