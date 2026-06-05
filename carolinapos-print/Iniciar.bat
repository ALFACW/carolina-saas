@echo off
title CarolinaPOS - Servidor de Impresion
cd /d "%~dp0"

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

echo.
echo  Iniciando CarolinaPOS Print Server...
echo  (La primera vez puede tardar 1 minuto instalando componentes)
echo.
python servidor.py
