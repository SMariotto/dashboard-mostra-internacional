@echo off
chcp 65001 >nul
title Smart Canada 2050 - servidor do painel
cd /d "%~dp0"

rem Procura o Node: primeiro o portátil da pasta tools\node (o pacote zip do projeto já leva um), depois o do sistema.
set "NODE_EXE="
if exist "%~dp0tools\node\node.exe" set "NODE_EXE=%~dp0tools\node\node.exe"
if not defined NODE_EXE (
  where node >nul 2>nul
  if not errorlevel 1 set "NODE_EXE=node"
)
if not defined NODE_EXE goto semnode

if not exist "servidor\publico\index.html" (
  echo AVISO: a interface não está em servidor\publico. Rode "npm run build" no computador do Samuel.
  echo.
)

rem SEM_NAVEGADOR=1 liga só o servidor, sem abrir o navegador (usado nos testes).
set "ABRIR=--abrir"
if defined SEM_NAVEGADOR set "ABRIR="

echo Ligando o servidor do painel Smart Canada 2050...
"%NODE_EXE%" servidor\index.js %ABRIR% %*
echo.
echo O servidor parou. Feche esta janela ou aperte uma tecla.
pause >nul
exit /b

:semnode
echo.
echo ==============================================================
echo   O Node.js não foi encontrado (nem em tools\node, nem no sistema).
echo ==============================================================
echo.
echo   O pacote zip do projeto já deveria trazer o arquivo tools\node\node.exe.
echo   Se ele sumiu, sem instalar nada e sem senha de administrador:
echo.
echo   1. Em outro computador com internet, abra https://nodejs.org/pt/download
echo   2. Baixe o "Windows Binary (.zip)" para 64 bits (x64).
echo   3. Extraia o zip. Abra a pasta extraída (node-vXX-win-x64).
echo   4. Copie TUDO que está dentro dela para a pasta:
echo        %~dp0tools\node
echo      (no fim deve existir o arquivo tools\node\node.exe)
echo   5. Rode este INICIAR.bat de novo.
echo.
pause
exit /b 1
