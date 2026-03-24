Add-Type -AssemblyName System.Drawing
$img1 = [System.Drawing.Image]::FromFile("f:\New folder\poultry_app\icon-512.jpg")
$img1.Save("f:\New folder\poultry_app\icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$img1.Dispose()

$img2 = [System.Drawing.Image]::FromFile("f:\New folder\poultry_app\icon-192.jpg")
$img2.Save("f:\New folder\poultry_app\icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$img2.Dispose()

Remove-Item "f:\New folder\poultry_app\icon-512.jpg"
Remove-Item "f:\New folder\poultry_app\icon-192.jpg"
