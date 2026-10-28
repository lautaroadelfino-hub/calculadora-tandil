@echo off
rem Doble clic para publicar en la base de datos (Firestore) las escalas de un
rem mes, o de varios, desde una carpeta con sus CSV y su carga.json, por
rem ejemplo docs\acuerdos\comercio-2026-10-27. Tambien se puede arrastrar la
rem carpeta sobre este archivo.
rem Primero muestra que haria, sin tocar nada. Si decis que si, pide la
rem contrasena de admin@liquidar.ar (no se ve mientras la escribis) y publica
rem todo de una: entra todo o no entra nada. Hace un respaldo antes
rem (respaldar.bat): para volver atras esta scripts\restaurar.mjs.
cd /d "%~dp0"
echo ============================================
echo  Publicar un mes en la base de LiquidAR
echo ============================================
echo.
set "carpeta=%~1"
if "%carpeta%"=="" set /p "carpeta=Carpeta con el carga.json (ej: docs\acuerdos\comercio-2026-10-27): "
if "%carpeta%"=="" goto fin
echo.
node scripts\cargarMes.mjs "%carpeta%"
if errorlevel 1 (
  echo.
  echo  NO SE PUEDE PUBLICAR. Mira el error de arriba.
  goto fin
)
echo.
set /p "ok=Publicar de verdad? Escribi SI y Enter (cualquier otra cosa cancela): "
if /i not "%ok%"=="SI" goto fin
echo.
node scripts\cargarMes.mjs "%carpeta%" --aplicar
echo.
if errorlevel 1 (
  echo  NO SE PUBLICO NADA. Mira el error de arriba.
) else (
  echo  Listo. El sitio lo refleja en menos de un minuto.
)
:fin
echo ============================================
pause
