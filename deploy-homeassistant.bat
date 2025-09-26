@echo off
echo ========================================
echo   Deploiement Home Assistant
echo ========================================

echo.
echo 1. Build de l'application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERREUR: Echec du build
    pause
    exit /b 1
)

echo.
echo 2. Verification du dossier dist...
if not exist "dist" (
    echo ERREUR: Dossier dist non trouve
    pause
    exit /b 1
)

echo.
echo 3. Instructions de deploiement:
echo.
echo    1. Copiez tout le contenu du dossier 'dist' vers:
echo       /config/www/learroom-assistant/
echo.
echo    2. Dans Home Assistant, ajoutez dans configuration.yaml:
echo.
echo       panel_iframe:
echo         learroom_assistant:
echo           title: "LearRoom Assistant"
echo           icon: mdi:robot
echo           url: "/local/learroom-assistant/"
echo           require_admin: false
echo.
echo    3. Redemarrez Home Assistant
echo.
echo    4. Acces via: http://your-home-assistant:8123/local/learroom-assistant/
echo.
echo ========================================
echo   Build termine avec succes!
echo ========================================

pause
