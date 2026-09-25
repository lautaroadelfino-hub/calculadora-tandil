@echo off
rem Doble clic para bajar una copia completa de la base de datos (Firestore)
rem a la carpeta respaldos\, con la fecha y la hora en el nombre.
cd /d "%~dp0"
echo ============================================
echo  Respaldando la base de datos de LiquidAR...
echo ============================================
echo.
node scripts\respaldar.mjs
echo.
if errorlevel 1 (
  echo  NO SE PUDO RESPALDAR. Mira el error de arriba.
) else (
  echo  Listo. La copia esta en la carpeta respaldos\ (ver arriba cual).
)
echo ============================================
pause
