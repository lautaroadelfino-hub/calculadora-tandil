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
rem El veredicto lo da el codigo de salida de los tests, no una palabra del
rem texto: "3 failed | 573 passed" tambien contiene "passed".
if errorlevel 1 (
  echo  ALGO SE ROMPIO: hay tests que fallan. Mira arriba cual, y avisame.
) else (
  echo  TODO EL CALCULO ESTA OK: la suite completa paso.
)
echo ============================================
pause
