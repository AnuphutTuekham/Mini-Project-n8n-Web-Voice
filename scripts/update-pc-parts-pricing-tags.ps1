$ErrorActionPreference = 'Stop'

$path = 'src/data/pc_parts_real_20_each.sql'
$content = Get-Content -Path $path -Raw

$priceMap = @{
  cpu = @(3290,4690,7890,8990,12490,14990,16990,15990,20990,23990,3790,6990,8590,6390,10990,13990,11990,14990,21990,25990)
  gpu = @(6990,9990,11990,11990,15990,21990,24990,33990,43990,72990,6990,8990,10990,9990,16990,20990,23990,31990,36990,11990)
  ram = @(1290,2390,3290,1190,2490,3590,1250,2390,3390,4290,2290,2990,1190,3390,1090,3190,990,2890,3090,2990)
  ssd = @(3890,6990,3190,2190,3890,6990,1890,3490,1990,3190,1590,2990,3790,4190,2090,2490,4490,1790,2790,3490)
  mainboard = @(6390,8990,4990,11990,7390,6990,4390,10490,6990,3990,4990,9490,4990,7990,4690,6990,3590,10990,4290,18900)
  psu = @(3290,3890,5190,10990,3490,4190,5690,14900,2890,3590,5990,6990,3590,4990,4990,6990,5490,3990,5390,4490)
  case = @(2990,4390,3590,5790,3590,5790,3190,5690,4990,3290,3790,3490,3190,4590,3390,2490,2190,6990,1890,3590)
}

function Get-Tags {
  param(
    [string]$category,
    [string]$name
  )

  switch ($category) {
    'ram' {
      $ddr = if ($name -match 'DDR[45]') { $Matches[0] } else { 'DDR' }
      $capacity = if ($name -match '(\d+GB)') { $Matches[0] } else { 'Capacity' }
      $speed = if ($name -match '(\d{4})') { $Matches[0] } else { 'Speed' }
      return @($ddr, $capacity, $speed)
    }
    'ssd' {
      $capacity = if ($name -match '(\d+TB|\d+GB)') { $Matches[0] } else { 'Capacity' }
      $iface = if ($name -match 'NV2') { 'PCIe4.0' } elseif ($name -match '970 EVO') { 'PCIe3.0' } else { 'PCIe4.0' }
      return @('NVMe', $capacity, $iface)
    }
    'cpu' {
      if ($name -match '^Intel') {
        $series = if ($name -match 'Core\s+i[3579]-\d+[A-Z0-9]*') { $Matches[0] } else { 'Core' }
        $socket = 'LGA1700'
        return @('Intel', $series, $socket)
      }

      $series = if ($name -match 'Ryzen\s+[579]\s+\d+[A-Z0-9]*') { $Matches[0] } else { 'Ryzen' }
      $socket = if ($name -match 'Ryzen\s+[579]\s+5\d{3}') { 'AM4' } else { 'AM5' }
      return @('AMD', $series, $socket)
    }
    'gpu' {
      $vram = if ($name -match '(\d+GB)') { $Matches[0] } else { 'VRAM' }
      if ($name -match '^NVIDIA') { return @('NVIDIA', $vram, 'GDDR6') }
      if ($name -match '^AMD') { return @('AMD Radeon', $vram, 'GDDR6') }
      return @('Intel Arc', $vram, 'GDDR6')
    }
    'mainboard' {
      $chipset = if ($name -match '(B\d{3}|Z\d{3}|X\d{3})') { $Matches[0] } else { 'Chipset' }
      $platform = if ($chipset -like 'B65*' -or $chipset -like 'X67*') { 'AM5' } else { 'LGA1700' }
      $form = if ($name -match 'B650M|B760M|mATX|MORTAR|DS3H|Pro RS') { 'mATX' } else { 'ATX' }
      return @($chipset, $platform, $form)
    }
    'psu' {
      $watt = if ($name -match '(\d{3,4}W)') { $Matches[0] } else { 'Watt' }
      $eff = if ($name -match '80\+\s*(Gold|Platinum|Titanium)') { "80+ $($Matches[1])" } else { '80+ Gold' }
      return @($watt, $eff, 'ATX')
    }
    'case' {
      $air = if ($name -match 'Airflow|Air|Mesh|Flow') { 'Airflow' } else { 'TemperedGlass' }
      $size = 'ATX Mid Tower'
      return @($size, $air, 'USB 3.0')
    }
    default {
      return @($category, 'pc-part', 'spec')
    }
  }
}

$pattern = "\('(?<sku>[A-Z]+-\d{3})',\s*'(?<name>[^']*)',\s*'(?<category>[a-z]+)',\s*(?<price>\d+),\s*(?<stock>\d+),\s*(?<warranty>\d+),\s*'(?<tags>\[[^']*\])'\)(?<comma>,?)"

$updated = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, {
    param($m)

    $sku = $m.Groups['sku'].Value
    $name = $m.Groups['name'].Value
    $category = $m.Groups['category'].Value
    $stock = $m.Groups['stock'].Value
    $warranty = $m.Groups['warranty'].Value
    $comma = $m.Groups['comma'].Value

    $index = [int]$sku.Split('-')[1] - 1
    if (-not $priceMap.ContainsKey($category) -or $index -lt 0 -or $index -ge $priceMap[$category].Count) {
      return $m.Value
    }

    $newPrice = [int]$priceMap[$category][$index]
    $tagArray = Get-Tags -category $category -name $name
    $tagsJson = ($tagArray | ConvertTo-Json -Compress)

    return "('$sku', '$name', '$category', $newPrice, $stock, $warranty, '$tagsJson')$comma"
  })

[System.IO.File]::WriteAllText((Resolve-Path $path), $updated, [System.Text.UTF8Encoding]::new($false))
Write-Output 'Updated prices and tags in pc_parts_real_20_each.sql'
