Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Projetos\Minha Esposa Pedio\logonova.png"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($img, $width, $height, $outPath) {
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $destImage = New-Object System.Drawing.Bitmap($width, $height)
    $destImage.SetResolution($img.HorizontalResolution, $img.VerticalResolution)
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($img, $destRect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    $destImage.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()
    Write-Host "Generated: $outPath"
}

# 1. Tauri PNGs
Resize-Image $srcImg 32 32 "c:\Projetos\Minha Esposa Pedio\src-tauri\icons\32x32.png"
Resize-Image $srcImg 128 128 "c:\Projetos\Minha Esposa Pedio\src-tauri\icons\128x128.png"
Resize-Image $srcImg 256 256 "c:\Projetos\Minha Esposa Pedio\src-tauri\icons\128x128@2x.png"
Resize-Image $srcImg 512 512 "c:\Projetos\Minha Esposa Pedio\src-tauri\icons\icon.png"

# 2. Public web icons
Resize-Image $srcImg 512 512 "c:\Projetos\Minha Esposa Pedio\public\icon.png"
Resize-Image $srcImg 512 512 "c:\Projetos\Minha Esposa Pedio\public\logo.png"

# 3. Create .ico
$icoPath = "c:\Projetos\Minha Esposa Pedio\src-tauri\icons\icon.ico"
$iconBmp = New-Object System.Drawing.Bitmap($srcImg, 256, 256)
$hIcon = $iconBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fileStream = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fileStream)
$fileStream.Close()
$icon.Dispose()
$iconBmp.Dispose()
Copy-Item $icoPath "c:\Projetos\Minha Esposa Pedio\public\favicon.ico" -Force

$srcImg.Dispose()
Write-Host "All icons generated successfully from logonova.png!"
