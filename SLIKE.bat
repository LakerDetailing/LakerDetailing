@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Galerija - Laker Detailing

:menu
cls
echo.
echo   ==========================================
echo      SLIKE U GALERIJI - Laker Detailing
echo   ==========================================
echo.
echo   Slike se nalaze u folderu:  galerija\
echo.
echo     1  -  Objavi slike iz foldera na sajt
echo     2  -  Samo provera (ne menja nista)
echo     3  -  Vrati kako je bilo pre
echo     4  -  Otvori folder sa slikama
echo     5  -  Izlaz
echo.
set "izbor="
set /p izbor=  Izaberi broj i pritisni ENTER:

if "%izbor%"=="1" goto objavi
if "%izbor%"=="2" goto proba
if "%izbor%"=="3" goto vrati
if "%izbor%"=="4" goto folder
if "%izbor%"=="5" exit /b
goto menu

:objavi
cls
node tools-galerija.js
goto kraj

:proba
cls
node tools-galerija.js --proba
goto kraj

:vrati
cls
node tools-galerija.js --vrati
goto kraj

:folder
start "" "%~dp0galerija"
goto menu

:kraj
echo.
pause
goto menu
