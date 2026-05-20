@echo off
title Cia da Capivara Turismo - Inicializador
echo ========================================================
echo   CIA DA CAPIVARA TURISMO - INICIALIZADOR DO SISTEMA
echo ========================================================
echo.
echo [*] Iniciando servidor local em background...
start /b "" node server.js
echo [*] Aguardando o servidor carregar (3 segundos)...
timeout /t 3 /nobreak > nul
echo [*] Abrindo o painel de administracao no navegador...
start "" "http://localhost:3000"
echo.
echo [OK] O sistema esta rodando localmente!
echo [INFO] Para encerrar o sistema, feche esta janela ou use Ctrl+C.
echo.
pause
