@echo off
title Cia da Capivara Turismo - Inicializador
echo ========================================================
echo   CIA DA CAPIVARA TURISMO - INICIALIZADOR DO SISTEMA
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Verificar se o Node.js está instalado globalmente
set "NODE_CMD=node"
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [*] Node.js detectado instalado no sistema globalmente.
    goto start_server
)

:: 2. Se não estiver global, verificar se existe o node.exe portátil local
if exist "bin\node.exe" (
    echo [*] Node.js portatil local detectado.
    set "NODE_CMD=bin\node.exe"
    goto start_server
)

:: 3. Se não houver nenhum, baixar o node.exe portátil via PowerShell
echo [!] Node.js nao foi encontrado instalado nesta maquina.
echo [*] Provisionando ambiente automatico...
echo [*] Baixando versao portatil do Node.js oficial (apenas uma vez)...
echo [*] Isso pode levar alguns segundos dependendo da sua internet...
echo.

if not exist "bin" mkdir "bin"
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.12.2/win-x64/node.exe', 'bin\node.exe')"

if not exist "bin\node.exe" (
    echo.
    echo [ERRO] Falha ao baixar o Node.js portatil.
    echo Certifique-se de estar conectado a internet na primeira execucao.
    echo.
    pause
    exit /b
)
echo [OK] Ambiente configurado com sucesso!
set "NODE_CMD=bin\node.exe"

:start_server
echo [*] Iniciando o servidor local em background...
start /b "" %NODE_CMD% server.js >nul 2>nul

echo [*] Aguardando o servidor carregar...
:: Espera de ~3 segundos via ping compatível com qualquer console
ping -n 4 127.0.0.1 > nul

echo [*] Abrindo o painel administrativo em janela de aplicativo nativo...
:: Abre em modo App nativo usando o Edge (nativo em qualquer Windows 10/11)
start msedge --app=http://localhost:3000 --window-size=1280,820

echo.
echo ========================================================
echo   SISTEMA EXECUTANDO COM SUCESSO!
echo ========================================================
echo.
echo [INFO] Para encerrar o sistema:
echo        1. Feche a janela do aplicativo Cia da Capivara
echo        2. Pressione QUALQUER TECLA abaixo para desligar o servidor
echo.
pause

echo.
echo [*] Encerrando o servidor local e limpando processos...
taskkill /f /im node.exe >nul 2>nul
echo [OK] Servidor desligado com sucesso.
ping -n 2 127.0.0.1 > nul
exit
