@echo off
title CarolinaPOS - Instalacion Servidor de Impresion
echo.
echo  CarolinaPOS Print Server
echo  ========================
echo.

:: Verificar que servidor.py este en la misma carpeta
if not exist "%~dp0servidor.py" (
    echo  ERROR: Falta el archivo servidor.py
    echo.
    echo  Asegurate de tener estos dos archivos en la misma carpeta:
    echo    - instalar.bat
    echo    - servidor.py
    echo.
    echo  Puedes descargar ambos desde app.carolinapos.co/configuracion
    pause
    exit /b 1
)

:: Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Python no encontrado. Instalando automaticamente...
    winget install -e --id Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo  No se pudo instalar Python automaticamente.
        echo  Descarga Python desde python.org/downloads
        echo  Marca "Add Python to PATH" al instalar, luego ejecuta este archivo de nuevo.
        pause
        exit /b 1
    )
    :: Recargar PATH para encontrar python recien instalado
    call refreshenv >nul 2>&1
)

:: Instalar dependencias de Python
echo  Instalando dependencias...
python -m pip install flask pywin32 --quiet --disable-pip-version-check
if %errorlevel% neq 0 (
    echo  Error instalando dependencias. Verifica tu conexion a internet.
    pause
    exit /b 1
)

:: Crear lanzador en carpeta Inicio de Windows (autoarranque)
echo  Configurando inicio automatico...
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
(
    echo @echo off
    echo start "CarolinaPOS Print Server" /min python "%~dp0servidor.py"
) > "%STARTUP%\CarolinaPOS-Print.bat"

:: Iniciar servidor ahora mismo
echo  Iniciando servidor...
start "CarolinaPOS Print Server" /min python "%~dp0servidor.py"

echo.
echo  Instalacion completada.
echo  El servidor esta corriendo en segundo plano.
echo  Se iniciara automaticamente cada vez que enciendas el PC.
echo.
pause
