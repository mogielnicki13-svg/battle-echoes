@echo off
setlocal
echo.
echo ============================================================
echo  Battle Echoes - Pobieranie obrazow (curl.exe)
echo ============================================================
echo.

cd /d "%~dp0.."

if not exist "assets\battles" mkdir "assets\battles"
echo Folder: assets\battles\
echo.

set UA=-A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
set RF=-H "Referer: https://en.wikipedia.org/"
set OPT=-L --retry 3 --retry-delay 2 -s -S --max-time 30

echo Pobieranie 22 obrazow...
echo.

curl.exe %UA% %RF% %OPT% -o "assets\battles\marathon-490bc.jpg"    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Scene_of_the_Battle_of_Marathon.jpg/800px-Scene_of_the_Battle_of_Marathon.jpg"
if %errorlevel%==0 (echo [OK] marathon-490bc.jpg) else (echo [BLAD] marathon-490bc)

curl.exe %UA% %RF% %OPT% -o "assets\battles\cannae-216bc.jpg"      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg/800px-The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg"
if %errorlevel%==0 (echo [OK] cannae-216bc.jpg) else (echo [BLAD] cannae-216bc)

curl.exe %UA% %RF% %OPT% -o "assets\battles\thermopylae-480bc.jpg" "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/L%C3%A9onidas_aux_Thermopyles_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3690_%3B_L_3711.jpg/800px-L%C3%A9onidas_aux_Thermopyles_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3690_%3B_L_3711.jpg"
if %errorlevel%==0 (echo [OK] thermopylae-480bc.jpg) else (echo [BLAD] thermopylae-480bc)

curl.exe %UA% %RF% %OPT% -o "assets\battles\grunwald-1410.jpg"     "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg/800px-Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg"
if %errorlevel%==0 (echo [OK] grunwald-1410.jpg) else (echo [BLAD] grunwald-1410)

curl.exe %UA% %RF% %OPT% -o "assets\battles\hastings-1066.jpg"     "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Bayeux_Tapestry_scene57_Harold_death.jpg/800px-Bayeux_Tapestry_scene57_Harold_death.jpg"
if %errorlevel%==0 (echo [OK] hastings-1066.jpg) else (echo [BLAD] hastings-1066)

curl.exe %UA% %RF% %OPT% -o "assets\battles\agincourt-1415.jpg"    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Schlacht_von_Azincourt.jpg/800px-Schlacht_von_Azincourt.jpg"
if %errorlevel%==0 (echo [OK] agincourt-1415.jpg) else (echo [BLAD] agincourt-1415)

curl.exe %UA% %RF% %OPT% -o "assets\battles\lepanto-1571.jpg"      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg/800px-Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg"
if %errorlevel%==0 (echo [OK] lepanto-1571.jpg) else (echo [BLAD] lepanto-1571)

curl.exe %UA% %RF% %OPT% -o "assets\battles\vienna-1683.jpg"       "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Anonym_Entsatz_Wien_1683.jpg/800px-Anonym_Entsatz_Wien_1683.jpg"
if %errorlevel%==0 (echo [OK] vienna-1683.jpg) else (echo [BLAD] vienna-1683)

curl.exe %UA% %RF% %OPT% -o "assets\battles\rocroi-1643.jpg"       "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/La_Bataille_de_Rocroi.jpg/800px-La_Bataille_de_Rocroi.jpg"
if %errorlevel%==0 (echo [OK] rocroi-1643.jpg) else (echo [BLAD] rocroi-1643)

curl.exe %UA% %RF% %OPT% -o "assets\battles\gettysburg-1863.jpg"   "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Thure_de_Thulstrup_-_L._Prang_and_Co._-_Battle_of_Gettysburg_-_Restoration_by_Adam_Cuerden.jpg/800px-Thure_de_Thulstrup_-_L._Prang_and_Co._-_Battle_of_Gettysburg_-_Restoration_by_Adam_Cuerden.jpg"
if %errorlevel%==0 (echo [OK] gettysburg-1863.jpg) else (echo [BLAD] gettysburg-1863)

curl.exe %UA% %RF% %OPT% -o "assets\battles\waterloo-1815.png"     "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Battle_of_Waterloo_1815.PNG/800px-Battle_of_Waterloo_1815.PNG"
if %errorlevel%==0 (echo [OK] waterloo-1815.png) else (echo [BLAD] waterloo-1815)

curl.exe %UA% %RF% %OPT% -o "assets\battles\austerlitz-1805.jpg"   "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg/800px-La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg"
if %errorlevel%==0 (echo [OK] austerlitz-1805.jpg) else (echo [BLAD] austerlitz-1805)

curl.exe %UA% %RF% %OPT% -o "assets\battles\borodino-1812.jpg"     "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Battle_of_Borodino.jpg/800px-Battle_of_Borodino.jpg"
if %errorlevel%==0 (echo [OK] borodino-1812.jpg) else (echo [BLAD] borodino-1812)

curl.exe %UA% %RF% %OPT% -o "assets\battles\ypres-1914.png"        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Locations_of_the_Allied_and_German_armies%2C_19_October_1914.png/800px-Locations_of_the_Allied_and_German_armies%2C_19_October_1914.png"
if %errorlevel%==0 (echo [OK] ypres-1914.png) else (echo [BLAD] ypres-1914)

curl.exe %UA% %RF% %OPT% -o "assets\battles\marne-1914.jpg"        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/German_soldiers_Battle_of_Marne_WWI.jpg/800px-German_soldiers_Battle_of_Marne_WWI.jpg"
if %errorlevel%==0 (echo [OK] marne-1914.jpg) else (echo [BLAD] marne-1914)

curl.exe %UA% %RF% %OPT% -o "assets\battles\verdun-1916.png"       "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Battle_of_Verdun_map.png/800px-Battle_of_Verdun_map.png"
if %errorlevel%==0 (echo [OK] verdun-1916.png) else (echo [BLAD] verdun-1916)

curl.exe %UA% %RF% %OPT% -o "assets\battles\somme-1916.png"        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Map_of_the_Battle_of_the_Somme%2C_1916.svg/800px-Map_of_the_Battle_of_the_Somme%2C_1916.svg.png"
if %errorlevel%==0 (echo [OK] somme-1916.png) else (echo [BLAD] somme-1916)

curl.exe %UA% %RF% %OPT% -o "assets\battles\britain-1940.jpg"      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Spitfire_and_He_111_during_Battle_of_Britain_1940.jpg/800px-Spitfire_and_He_111_during_Battle_of_Britain_1940.jpg"
if %errorlevel%==0 (echo [OK] britain-1940.jpg) else (echo [BLAD] britain-1940)

curl.exe %UA% %RF% %OPT% -o "assets\battles\stalingrad-1942.jpg"   "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/The_Battle_of_Stalingrad_second_collage.jpg/800px-The_Battle_of_Stalingrad_second_collage.jpg"
if %errorlevel%==0 (echo [OK] stalingrad-1942.jpg) else (echo [BLAD] stalingrad-1942)

curl.exe %UA% %RF% %OPT% -o "assets\battles\kursk-1943.jpg"        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Battle_of_Kursk_%28map%29.jpg/800px-Battle_of_Kursk_%28map%29.jpg"
if %errorlevel%==0 (echo [OK] kursk-1943.jpg) else (echo [BLAD] kursk-1943)

curl.exe %UA% %RF% %OPT% -o "assets\battles\normandy-1944.jpg"     "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/800px-Into_the_Jaws_of_Death_23-0455M_edit.jpg"
if %errorlevel%==0 (echo [OK] normandy-1944.jpg) else (echo [BLAD] normandy-1944)

curl.exe %UA% %RF% %OPT% -o "assets\battles\berlin-1945.jpg"       "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Raising_a_flag_over_the_Reichstag_-_Restoration.jpg/800px-Raising_a_flag_over_the_Reichstag_-_Restoration.jpg"
if %errorlevel%==0 (echo [OK] berlin-1945.jpg) else (echo [BLAD] berlin-1945)

echo.
echo ============================================================
echo  Gotowe! Uruchom teraz:
echo    node scripts\generateLocalImages.js
echo ============================================================
echo.
pause
