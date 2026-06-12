param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$request = Get-Content -LiteralPath $InputPath -Raw -Encoding UTF8 | ConvertFrom-Json
$result = New-Object System.Collections.Generic.List[object]

foreach ($item in $request) {
  $source = $null
  $thumbnail = $null
  $graphics = $null
  try {
    $source = [System.Drawing.Bitmap]::FromFile($item.absolutePath)
    $thumbnail = New-Object System.Drawing.Bitmap 96, 96
    $graphics = [System.Drawing.Graphics]::FromImage($thumbnail)
    $graphics.DrawImage($source, 0, 0, 96, 96)
    $graphics.Dispose()
    $graphics = $null

    $white = 0
    $yellow = 0.0
    $rose = 0.0
    $neutral = 0.0
    $sampleCount = 0

    for ($y = 0; $y -lt 96; $y += 2) {
      for ($x = 0; $x -lt 96; $x += 2) {
        $pixel = $thumbnail.GetPixel($x, $y)
        $red = $pixel.R / 255.0
        $green = $pixel.G / 255.0
        $blue = $pixel.B / 255.0
        $maximum = [Math]::Max($red, [Math]::Max($green, $blue))
        $minimum = [Math]::Min($red, [Math]::Min($green, $blue))
        $delta = $maximum - $minimum
        $saturation = if ($maximum -eq 0) { 0 } else { $delta / $maximum }
        $hue = 0.0

        if ($delta -ne 0) {
          if ($maximum -eq $red) {
            $hue = 60 * ((($green - $blue) / $delta) % 6)
          } elseif ($maximum -eq $green) {
            $hue = 60 * ((($blue - $red) / $delta) + 2)
          } else {
            $hue = 60 * ((($red - $green) / $delta) + 4)
          }
          if ($hue -lt 0) { $hue += 360 }
        }

        if ($red -gt 0.92 -and $green -gt 0.92 -and $blue -gt 0.92) { $white++ }
        if ($maximum -gt 0.25 -and $maximum -lt 0.98) {
          if ($saturation -gt 0.12 -and $hue -ge 30 -and $hue -le 70) {
            $yellow += $saturation * $maximum
          }
          if ($saturation -gt 0.12 -and (($hue -ge 0 -and $hue -lt 30) -or $hue -gt 340)) {
            $rose += $saturation * $maximum
          }
          if ($saturation -lt 0.12 -and $maximum -gt 0.35 -and $maximum -lt 0.9) {
            $neutral += (1 - $saturation) * $maximum
          }
        }
        $sampleCount++
      }
    }

    $result.Add([pscustomobject]@{
      sourceRelativePath = [string]$item.sourceRelativePath
      whiteRatio = $white / $sampleCount
      yellowScore = $yellow
      roseScore = $rose
      neutralScore = $neutral
    })
  } catch {
    # Unsupported formats are left without metrics and retain filename-based detection.
  } finally {
    if ($graphics) { $graphics.Dispose() }
    if ($thumbnail) { $thumbnail.Dispose() }
    if ($source) { $source.Dispose() }
  }
}

$result | ConvertTo-Json -Depth 4 -Compress | Set-Content -LiteralPath $OutputPath -Encoding UTF8
