# ============================================================
# BATTLE ECHOES — scripts/downloadImages.ps1
# Pobiera obrazy bitew z Wikimedia do assets/battles/
#
# URUCHOMIENIE (z katalogu projektu, w CMD):
#   powershell -ExecutionPolicy Bypass -File scripts\downloadImages.ps1
#
# Po zakonczeniu uruchom:
#   node scripts\generateLocalImages.js
# ============================================================

# Wymus TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$headers = @{
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    'Referer'    = 'https://en.wikipedia.org/'
    'Accept'     = 'image/webp,image/apng,image/*,*/*;q=0.8'
}

# battleId => @(url, ext)
$battles = [ordered]@{
    'marathon-490bc'    = @('https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Scene_of_the_Battle_of_Marathon.jpg/800px-Scene_of_the_Battle_of_Marathon.jpg', 'jpg')
    'cannae-216bc'      = @('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg/800px-The_Death_of_Paulus_Aemilius_at_the_Battle_of_Cannae_%28Yale_University_Art_Gallery_scan%29.jpg', 'jpg')
    'thermopylae-480bc' = @('https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/L%C3%A9onidas_aux_Thermopyles_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3690_%3B_L_3711.jpg/800px-L%C3%A9onidas_aux_Thermopyles_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3690_%3B_L_3711.jpg', 'jpg')
    'grunwald-1410'     = @('https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg/800px-Jan_Matejko%2C_Bitwa_pod_Grunwaldem.jpg', 'jpg')
    'hastings-1066'     = @('https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Bayeux_Tapestry_scene57_Harold_death.jpg/800px-Bayeux_Tapestry_scene57_Harold_death.jpg', 'jpg')
    'agincourt-1415'    = @('https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Schlacht_von_Azincourt.jpg/800px-Schlacht_von_Azincourt.jpg', 'jpg')
    'lepanto-1571'      = @('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg/800px-Laureys_a_Castro_-_The_Battle_of_Lepanto.jpeg', 'jpg')
    'vienna-1683'       = @('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Anonym_Entsatz_Wien_1683.jpg/800px-Anonym_Entsatz_Wien_1683.jpg', 'jpg')
    'rocroi-1643'       = @('https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/La_Bataille_de_Rocroi.jpg/800px-La_Bataille_de_Rocroi.jpg', 'jpg')
    'gettysburg-1863'   = @('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Thure_de_Thulstrup_-_L._Prang_and_Co._-_Battle_of_Gettysburg_-_Restoration_by_Adam_Cuerden.jpg/800px-Thure_de_Thulstrup_-_L._Prang_and_Co._-_Battle_of_Gettysburg_-_Restoration_by_Adam_Cuerden.jpg', 'jpg')
    'waterloo-1815'     = @('https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Battle_of_Waterloo_1815.PNG/800px-Battle_of_Waterloo_1815.PNG', 'png')
    'austerlitz-1805'   = @('https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg/800px-La_bataille_d%27Austerlitz._2_decembre_1805_%28Fran%C3%A7ois_G%C3%A9rard%29.jpg', 'jpg')
    'borodino-1812'     = @('https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Battle_of_Borodino.jpg/800px-Battle_of_Borodino.jpg', 'jpg')
    'ypres-1914'        = @('https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Locations_of_the_Allied_and_German_armies%2C_19_October_1914.png/800px-Locations_of_the_Allied_and_German_armies%2C_19_October_1914.png', 'png')
    'marne-1914'        = @('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/German_soldiers_Battle_of_Marne_WWI.jpg/800px-German_soldiers_Battle_of_Marne_WWI.jpg', 'jpg')
    'verdun-1916'       = @('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Battle_of_Verdun_map.png/800px-Battle_of_Verdun_map.png', 'png')
    'somme-1916'        = @('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Map_of_the_Battle_of_the_Somme%2C_1916.svg/800px-Map_of_the_Battle_of_the_Somme%2C_1916.svg.png', 'png')
    'britain-1940'      = @('https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Spitfire_and_He_111_during_Battle_of_Britain_1940.jpg/800px-Spitfire_and_He_111_during_Battle_of_Britain_1940.jpg', 'jpg')
    'stalingrad-1942'   = @('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/The_Battle_of_Stalingrad_second_collage.jpg/800px-The_Battle_of_Stalingrad_second_collage.jpg', 'jpg')
    'kursk-1943'        = @('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Battle_of_Kursk_%28map%29.jpg/800px-Battle_of_Kursk_%28map%29.jpg', 'jpg')
    'normandy-1944'     = @('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/800px-Into_the_Jaws_of_Death_23-0455M_edit.jpg', 'jpg')
    'berlin-1945'       = @('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Raising_a_flag_over_the_Reichstag_-_Restoration.jpg/800px-Raising_a_flag_over_the_Reichstag_-_Restoration.jpg', 'jpg')
}

# Utworz folder assets/battles
$outDir = "assets\battles"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    Write-Host "📁 Utworzono: assets\battles`n"
}

$ok = 0; $skip = 0; $fail = 0

foreach ($entry in $battles.GetEnumerator()) {
    $id   = $entry.Key
    $url  = $entry.Value[0]
    $ext  = $entry.Value[1]
    $name = "$id.$ext"
    $dest = Join-Path $outDir $name

    if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 1000) {
        Write-Host "⏭  $($id.PadRight(22)) $name (juz istnieje)"
        $skip++
        continue
    }

    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -Headers $headers -UseBasicParsing -TimeoutSec 30
        $size = $null
        if (Test-Path $dest) { $size = [math]::Round((Get-Item $dest).Length / 1KB) }
        if ($size -and $size -gt 1) {
            Write-Host "✅ $($id.PadRight(22)) $name ($size KB)"
            $ok++
        } else {
            Write-Host "❌ $($id.PadRight(22)) BLAD: plik pusty lub za maly"
            if (Test-Path $dest) { Remove-Item $dest -Force }
            $fail++
        }
    } catch {
        Write-Host "❌ $($id.PadRight(22)) BLAD: $($_.Exception.Message)"
        if (Test-Path $dest) { Remove-Item $dest -Force }
        $fail++
    }

    Start-Sleep -Milliseconds 300
}

Write-Host "`nPodsumowanie: ✅ $ok nowych | ⏭ $skip istniejacych | ❌ $fail bledow"

if (($ok + $skip) -gt 0) {
    Write-Host "`n➡  Uruchom teraz w CMD:"
    Write-Host "   node scripts\generateLocalImages.js"
} else {
    Write-Host "`n⚠  Zadne obrazy nie zostaly pobrane."
    Write-Host "   Sprawdz polaczenie z internetem lub pobierz obrazy recznie przez przegladarke."
    Write-Host "   Instrukcja reczna: otwierz URL z listy wyzej w Chrome i zapisz jako 'battleId.ext'"
    Write-Host "   np. marathon-490bc.jpg do folderu assets\battles\"
}
