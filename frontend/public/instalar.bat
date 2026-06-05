@echo off
title CarolinaPOS - Instalacion Servidor de Impresion
echo.
echo  CarolinaPOS Print Server
echo  ========================
echo.

:: Descargar servidor.py si no existe
if not exist "%~dp0servidor.py" (
    echo  Descargando servidor.py...
    powershell -Command "Invoke-WebRequest -Uri 'https://app.carolinapos.co/servidor.py' -OutFile '%~dp0servidor.py'" >nul 2>&1
    if not exist "%~dp0servidor.py" (
        echo.
        echo  No se pudo descargar servidor.py automaticamente.
        echo  Por favor descarga el archivo desde app.carolinapos.co/servidor.py
        echo  y colocalo en la misma carpeta que este archivo.
        pause
        exit /b 1
    )
    echo  servidor.py descargado correctamente.
)

:: Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Python no encontrado. Instalando automaticamente...
    winget install -e --id Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo  No se pudo instalar Python automaticamente.
        echo  Por favor descarga Python desde: https://python.org/downloads
        echo  Asegurate de marcar "Add Python to PATH" al instalar.
        pause
        exit /b 1
    )
    :: Refrescar PATH en esta sesion
    for /f "tokens=*" %%i in ('where python') do set PYTHONPATH=%%i
)

echo  Instalando dependencias...
python -m pip install flask pywin32 --quiet --disable-pip-version-check

echo  Registrando inicio automatico con Windows...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "CarolinaPOS-Print" /t REG_SZ /d "pythonw \"%~dp0servidor.py\"" /f >nul 2>&1

:: Detener instancia anterior si existe
taskkill /f /im pythonw.exe /fi "WINDOWTITLE eq CarolinaPOS*" >nul 2>&1

echo  Iniciando servidor...
start /min "" pythonw "%~dp0servidor.py"

echo.
echo  Listo! El servidor de impresion esta corriendo.
echo  Se iniciara automaticamente cada vez que enciendas el PC.
echo.
pause
