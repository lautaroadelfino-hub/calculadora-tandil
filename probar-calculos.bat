@echo off
rem Doble clic para verificar que todos los calculos funcionan bien.
cd /d "%~dp0"
echo ============================================
echo  Probando los calculos de LiquidAR...
echo ============================================
echo.
call npm test
echo.
echo ============================================
echo  Si arriba dice "passed" (ej: "31 passed"), TODO EL CALCULO ESTA OK.
echo  Si dice "failed", algo se rompio (avisame que numero).
echo ============================================
pause
