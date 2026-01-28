@echo off
title Hayalet Yerel Sunucu (Kapatmayin)
echo Sunucu baslatiliyor...
cd local-server
if %errorlevel% neq 0 (
    echo "local-server" klasoru bulunamadi!
    pause
    exit /b
)

echo.
echo ==================================================
echo Tarayicida Hayalet Pro'yu acin ve Yuz Tanima kullanin.
echo Bu pencereyi kapatirsaniz sunucu durur.
echo ==================================================
echo.

call npm start
pause
