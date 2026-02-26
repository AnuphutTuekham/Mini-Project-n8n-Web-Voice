$ErrorActionPreference = 'Stop'
$outPath = 'src/data/pc_parts_real_20_each.sql'

$catalog = @{
  cpu = @(
    'Intel Core i3-12100F','Intel Core i5-12400F','Intel Core i5-13400F','Intel Core i5-14400F','Intel Core i7-12700K',
    'Intel Core i7-13700K','Intel Core i7-14700K','Intel Core i9-12900K','Intel Core i9-13900K','Intel Core i9-14900K',
    'AMD Ryzen 5 5600','AMD Ryzen 5 7600','AMD Ryzen 5 7600X','AMD Ryzen 7 5700X','AMD Ryzen 7 7700',
    'AMD Ryzen 7 7800X3D','AMD Ryzen 9 5900X','AMD Ryzen 9 7900','AMD Ryzen 9 7950X','AMD Ryzen 9 7950X3D'
  )
  gpu = @(
    'NVIDIA GeForce RTX 3050 8GB','NVIDIA GeForce RTX 3060 12GB','NVIDIA GeForce RTX 3060 Ti','NVIDIA GeForce RTX 4060',
    'NVIDIA GeForce RTX 4060 Ti 8GB','NVIDIA GeForce RTX 4070','NVIDIA GeForce RTX 4070 SUPER','NVIDIA GeForce RTX 4070 Ti SUPER',
    'NVIDIA GeForce RTX 4080 SUPER','NVIDIA GeForce RTX 4090','AMD Radeon RX 6600','AMD Radeon RX 6650 XT','AMD Radeon RX 6700 XT',
    'AMD Radeon RX 7600','AMD Radeon RX 7700 XT','AMD Radeon RX 7800 XT','AMD Radeon RX 7900 GRE','AMD Radeon RX 7900 XT',
    'AMD Radeon RX 7900 XTX','Intel Arc A770 16GB'
  )
  ram = @(
    'Corsair Vengeance LPX DDR4 16GB 3200','Corsair Vengeance LPX DDR4 32GB 3600','Corsair Vengeance DDR5 32GB 6000',
    'G.SKILL Ripjaws V DDR4 16GB 3200','G.SKILL Trident Z Neo DDR4 32GB 3600','G.SKILL Trident Z5 DDR5 32GB 6000',
    'Kingston FURY Beast DDR4 16GB 3200','Kingston FURY Beast DDR4 32GB 3600','Kingston FURY Beast DDR5 32GB 6000',
    'Kingston FURY Renegade DDR5 32GB 6400','Crucial Pro DDR4 32GB 3200','Crucial Pro DDR5 32GB 5600',
    'TeamGroup T-Force Vulcan Z DDR4 16GB 3200','TeamGroup T-Force Delta RGB DDR5 32GB 6000',
    'ADATA XPG GAMMIX D35 DDR4 16GB 3200','ADATA XPG Lancer DDR5 32GB 6000','Patriot Viper Steel DDR4 16GB 3200',
    'Patriot Viper Venom DDR5 32GB 6200','Lexar ARES RGB DDR5 32GB 6000','PNY XLR8 Gaming DDR5 32GB 6000'
  )
  ssd = @(
    'Samsung 990 PRO 1TB','Samsung 990 PRO 2TB','Samsung 980 PRO 1TB','Samsung 970 EVO Plus 1TB','WD Black SN850X 1TB',
    'WD Black SN850X 2TB','WD Blue SN580 1TB','Crucial T500 1TB','Crucial P3 Plus 1TB','Kingston KC3000 1TB',
    'Kingston NV2 1TB','Kingston NV2 2TB','Solidigm P44 Pro 1TB','SK hynix Platinum P41 1TB','ADATA XPG SX8200 Pro 1TB',
    'Lexar NM790 1TB','Lexar NM790 2TB','TeamGroup MP44L 1TB','Seagate FireCuda 530 1TB','Corsair MP600 PRO LPX 1TB'
  )
  mainboard = @(
    'ASUS TUF Gaming B650-PLUS','ASUS ROG Strix B650-A Gaming WiFi','ASUS PRIME B760M-A WiFi D4','ASUS TUF Gaming Z790-PLUS WiFi',
    'MSI B650 Tomahawk WiFi','MSI MAG B650M Mortar WiFi','MSI PRO B760M-A WiFi DDR4','MSI MAG Z790 Tomahawk WiFi',
    'Gigabyte B650 AORUS Elite AX','Gigabyte B650M DS3H','Gigabyte B760M AORUS Elite AX DDR4','Gigabyte Z790 AORUS Elite AX',
    'ASRock B650M Pro RS','ASRock B650E Steel Legend WiFi','ASRock B760M Pro RS/D4 WiFi','ASRock Z790 PG Lightning',
    'BIOSTAR B650MP-E Pro','NZXT N7 B650E','Colorful CVN B760M Frost','EVGA Z790 Classified'
  )
  psu = @(
    'Corsair RM650e 650W 80+ Gold','Corsair RM750e 750W 80+ Gold','Corsair RM850x 850W 80+ Gold','Corsair HX1000i 1000W 80+ Platinum',
    'Seasonic Focus GX-650 650W 80+ Gold','Seasonic Focus GX-750 750W 80+ Gold','Seasonic Vertex GX-850 850W 80+ Gold','Seasonic Prime TX-1000 1000W 80+ Titanium',
    'Cooler Master MWE Gold 650 V2','Cooler Master MWE Gold 750 V2','Cooler Master V850 Gold i','Cooler Master GX III Gold 1050',
    'Thermaltake Toughpower GF A3 750W','Thermaltake Toughpower GF3 850W','be quiet! Pure Power 12 M 750W','be quiet! Straight Power 12 850W',
    'MSI MPG A850G PCIE5','MSI MAG A750GL PCIE5','Super Flower Leadex III Gold 850W','FSP Hydro G Pro 850W'
  )
  case = @(
    'NZXT H5 Flow','NZXT H7 Flow','Corsair 4000D Airflow','Corsair 5000D Airflow','Lian Li Lancool 216',
    'Lian Li O11 Dynamic EVO','Fractal Design Pop Air','Fractal Design North','Fractal Design Meshify 2 Compact','Phanteks Eclipse G360A',
    'Phanteks NV5','be quiet! Pure Base 500DX','Cooler Master MasterBox TD500 Mesh','Cooler Master HAF 500','DeepCool CH560',
    'DeepCool CK560','Montech Air 903 Max','HYTE Y60','Antec NX410','Thermaltake Ceres 300 TG ARGB'
  )
}

$priceRange = @{
  cpu = @(3900, 25900)
  gpu = @(7900, 78900)
  ram = @(1390, 6990)
  ssd = @(1490, 9990)
  mainboard = @(3590, 18900)
  psu = @(2290, 13900)
  case = @(1790, 6990)
}

$warrantyByCategory = @{ cpu = 36; gpu = 36; ram = 120; ssd = 60; mainboard = 36; psu = 120; case = 24 }

$rows = New-Object System.Collections.Generic.List[object]
foreach ($category in @('cpu','gpu','ram','ssd','mainboard','psu','case')) {
  $items = $catalog[$category]
  for ($i = 0; $i -lt $items.Count; $i++) {
    $name = $items[$i]
    $min = $priceRange[$category][0]
    $max = $priceRange[$category][1]
    $price = [int]($min + ((($i + 1) * 997) % ([Math]::Max(1, ($max - $min)))))
    $stock = [int](3 + (($i * 7 + $category.Length) % 38))
    $warranty = [int]$warrantyByCategory[$category]
    $sku = ('{0}-{1:D3}' -f $category.ToUpper(), ($i + 1))
    $tagsJson = ('["{0}","pc-part","ของแท้"]' -f $category)

    $rows.Add([pscustomobject]@{
      sku = $sku
      name = $name
      category = $category
      price = $price
      stock = $stock
      warranty_months = $warranty
      tags = $tagsJson
    })
  }
}

if ($rows.Count -ne 140) { throw "Expected 140 rows, got $($rows.Count)" }

$lines = @()
$lines += '-- Generated list: real-world PC components, 20 items per category'
$lines += '-- Categories: cpu, gpu, ram, ssd, mainboard, psu, case'
$lines += ''
$lines += 'CREATE TABLE IF NOT EXISTS pc_parts ('
$lines += '  sku VARCHAR(50) PRIMARY KEY,'
$lines += '  name VARCHAR(255) NOT NULL,'
$lines += '  category VARCHAR(30) NOT NULL,'
$lines += '  price INT NOT NULL,'
$lines += '  stock INT NOT NULL,'
$lines += '  warranty_months INT NOT NULL,'
$lines += '  tags TEXT NOT NULL'
$lines += ');'
$lines += ''
$lines += 'INSERT INTO pc_parts (sku, name, category, price, stock, warranty_months, tags) VALUES'

for ($i = 0; $i -lt $rows.Count; $i++) {
  $r = $rows[$i]
  $nameEscaped = $r.name.Replace("'", "''")
  $comma = if ($i -lt $rows.Count - 1) { ',' } else { ';' }
  $lines += "('$($r.sku)', '$nameEscaped', '$($r.category)', $($r.price), $($r.stock), $($r.warranty_months), '$($r.tags)')$comma"
}

$fullPath = Join-Path (Get-Location) $outPath
[System.IO.File]::WriteAllLines($fullPath, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Output "Created $outPath with $($rows.Count) rows"
