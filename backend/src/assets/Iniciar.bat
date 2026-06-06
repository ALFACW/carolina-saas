@echo off
title CarolinaPOS - Servidor de Impresion
cd /d "%~dp0"
echo.
echo  +------------------------------------------+
echo  ^|  CarolinaPOS Print Server v2.0            ^|
echo  +------------------------------------------+
echo.

:: ── 0. Verificar que el ZIP fue extraido ─────────────────────────────────────
if not exist "%~dp0servidor.py" (
    echo  ERROR: Falta el archivo servidor.py en esta carpeta.
    echo.
    echo  Debes EXTRAER el ZIP antes de ejecutar este archivo.
    echo  Haz clic derecho en el ZIP y elige "Extraer aqui",
    echo  luego abre la carpeta y ejecuta Iniciar.bat desde ahi.
    echo.
    pause
    exit /b 1
)

:: ── 1. Verificar Python ───────────────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% equ 0 goto instalar_deps

echo  Python no encontrado. Instalando automaticamente...
echo  (puede tardar 2-3 minutos, no cierres esta ventana)
echo.

:: Intento 1: winget (rapido, sin descarga)
echo  [1/3] Intentando via winget...
winget install -e --id Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
if %errorlevel% equ 0 goto python_listo

:: Intento 2: curl (built-in en Windows 10+, mas confiable)
echo  [2/3] Descargando instalador de Python...
curl -L --progress-bar --output "%TEMP%\python_setup.exe" "https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe"
if exist "%TEMP%\python_setup.exe" goto instalar_exe

:: Intento 3: PowerShell como ultimo recurso
echo  [3/3] Intentando con PowerShell...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe', '%TEMP%\python_setup.exe')"
if not exist "%TEMP%\python_setup.exe" (
    echo.
    echo  No se pudo descargar Python. Verifica tu conexion a internet.
    pause
    exit /b 1
)

:instalar_exe
echo  Instalando Python silenciosamente...
"%TEMP%\python_setup.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0
del "%TEMP%\python_setup.exe" >nul 2>&1

:python_listo
echo  Python listo. Reiniciando...
echo.
start "" cmd /c ""%~f0""
exit /b 0

:: ── 2. Instalar pywin32 ───────────────────────────────────────────────────────
:instalar_deps
echo  Verificando componentes...
python -m pip install pywin32 --quiet --disable-pip-version-check
if %errorlevel% neq 0 (
    echo  Error al instalar pywin32. Verifica tu conexion a internet.
    pause
    exit /b 1
)

:: ── 3. Configurar inicio automatico ──────────────────────────────────────────
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

:: ── 4. Iniciar servidor ───────────────────────────────────────────────────────
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
