param([switch]$TanpaBrowser)
$ErrorActionPreference = 'Stop'
$listener = $null
function Run-LocalAI([byte[]]$imageBytes) {
    $aiRoot = Join-Path $PSScriptRoot 'ai'
    $exe = Join-Path $aiRoot 'bnight-ai.exe'
    if (!(Test-Path -LiteralPath $exe)) { throw 'Komponen Real-ESRGAN tidak lengkap. Ekstrak seluruh paket V2, atau gunakan mode Asli.' }
    Add-Type -AssemblyName System.Drawing
    $memory = New-Object IO.MemoryStream(,$imageBytes)
    $image = $null
    try {
        $image = [Drawing.Image]::FromStream($memory)
        if ($image.Width * $image.Height -gt 1100000) { throw 'Masukan AI terlalu besar. Maksimal 1 megapiksel.' }
    } finally { if ($image) { $image.Dispose() }; $memory.Dispose() }
    $jobRoot = Join-Path $PSScriptRoot '.run'
    [IO.Directory]::CreateDirectory($jobRoot) | Out-Null
    $job = Join-Path $jobRoot ([Guid]::NewGuid().ToString('N'))
    [IO.Directory]::CreateDirectory($job) | Out-Null
    $inputFile = Join-Path $job 'input.png'
    $outputFile = Join-Path $job 'output.png'
    $process = $null
    try {
        [IO.File]::WriteAllBytes($inputFile, $imageBytes)
        $info = New-Object Diagnostics.ProcessStartInfo
        $info.FileName = $exe
        $info.WorkingDirectory = $aiRoot
        $info.Arguments = '-i "' + $inputFile + '" -o "' + $outputFile + '" -m "' + (Join-Path $aiRoot 'models') + '" -n realesr-animevideov3 -s 2 -t 64 -j 1:1:1'
        $info.UseShellExecute = $false
        $info.CreateNoWindow = $true
        $info.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
        $info.RedirectStandardOutput = $true
        $info.RedirectStandardError = $true
        $process = [Diagnostics.Process]::Start($info)
        $outTask = $process.StandardOutput.ReadToEndAsync()
        $errTask = $process.StandardError.ReadToEndAsync()
        if (!$process.WaitForExit(180000)) { $process.Kill(); $process.WaitForExit(); throw 'AI melewati 180 detik. Gunakan mode Asli atau gambar lebih kecil.' }
        if ($process.ExitCode -ne 0 -or !(Test-Path -LiteralPath $outputFile)) { throw 'Real-ESRGAN gagal pada GPU/driver ini. Gunakan mode Asli; mesin geometri tetap bekerja.' }
        return ,([IO.File]::ReadAllBytes($outputFile))
    } finally {
        if ($process) { $process.Dispose() }
        # Remove only the two known generated files in this job directory.
        foreach ($item in @($inputFile,$outputFile)) { if (Test-Path -LiteralPath $item) { Remove-Item -LiteralPath $item -Force } }
        if (Test-Path -LiteralPath $job) { Remove-Item -LiteralPath $job }
    }
}
try {
    $config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'pengaturan.json') -Raw | ConvertFrom-Json
    $port = [int]$config.port
    if ($port -lt 1024 -or $port -gt 65535) { throw 'Port harus antara 1024 dan 65535.' }
    $webRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'web'))
    $token = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $port)
    try { $listener.Start() } catch { throw "Port $port sedang digunakan. Tutup peluncur lama, atau ubah port di pengaturan.json." }
    $url = "http://127.0.0.1:$port/"
    Write-Host "`n BNIGHT VECTOR STUDIO V2 - LOKAL" -ForegroundColor Red
    Write-Host " Buka $url"
    Write-Host ' Kurva kubik, garis lurus, subpiksel, dan Real-ESRGAN opsional.'
    Write-Host ' Tutup jendela ini untuk berhenti. Tidak memakai API atau internet.'
    if ($config.bukaBrowser -eq $true -and !$TanpaBrowser) { Start-Process -FilePath $url -WindowStyle Hidden }
    $mime = @{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.jpg'='image/jpeg';'.png'='image/png';'.svg'='image/svg+xml';'.txt'='text/plain; charset=utf-8'}
    while ($true) {
        if (!$listener.Pending()) { Start-Sleep -Milliseconds 40; continue }
        $client=$listener.AcceptTcpClient();$stream=$null
        try {
            $client.ReceiveTimeout=5000;$client.SendTimeout=10000;$stream=$client.GetStream()
            $buffer=New-Object Collections.Generic.List[byte]
            while ($buffer.Count -lt 32768) {
                $b=$stream.ReadByte();if($b -lt 0){throw 'Client closed'};$buffer.Add([byte]$b)
                $n=$buffer.Count
                if($n -ge 4 -and $buffer[$n-4] -eq 13 -and $buffer[$n-3] -eq 10 -and $buffer[$n-2] -eq 13 -and $buffer[$n-1] -eq 10){break}
            }
            $lines=[Text.Encoding]::ASCII.GetString($buffer.ToArray()) -split "`r`n"
            $parts=$lines[0].Split(' ');if($parts.Length -ne 3){throw 'Invalid request'}
            $headers=@{};foreach($line in $lines[1..($lines.Length-1)]){ $colon=$line.IndexOf(':');if($colon -gt 0){$headers[$line.Substring(0,$colon).ToLowerInvariant()]=$line.Substring($colon+1).Trim()} }
            $code='200 OK';$type='text/plain; charset=utf-8';$body=[Text.Encoding]::UTF8.GetBytes('Not found')
            $path=[Uri]::UnescapeDataString(($parts[1] -split '\?',2)[0])
            $allowedOrigin=@("http://127.0.0.1:$port","http://localhost:$port")
            if($headers['host'] -notin @("127.0.0.1:$port","localhost:$port") -or $headers['sec-fetch-site'] -eq 'cross-site' -or ($headers['origin'] -and $headers['origin'] -notin $allowedOrigin)){
                $code='403 Forbidden'
            } elseif($parts[0] -eq 'POST' -and $path -eq '/api/upscale'){
                if($headers['x-bnight-token'] -ne $token){$code='403 Forbidden'}else{
                    $type='application/json; charset=utf-8'
                    try{
                        $length=0
                        if(![int]::TryParse($headers['content-length'],[ref]$length) -or $length -lt 1 -or $length -gt 10000000){throw 'Ukuran unggahan AI tidak valid.'}
                        $data=New-Object byte[] $length;$read=0
                        while($read -lt $length){$n=$stream.Read($data,$read,$length-$read);if($n -le 0){throw 'Unggahan terputus.'};$read+=$n}
                        $body=Run-LocalAI $data;$type='image/png'
                    }catch{$code='422 Unprocessable Entity';$body=[Text.Encoding]::UTF8.GetBytes((@{error=$_.Exception.Message}|ConvertTo-Json -Compress))}
                }
            } elseif($parts[0] -notin @('GET','HEAD')){$code='405 Method Not Allowed'}else{
                if($path -eq '/local-settings.js'){
                    $js='window.BNIGHT_LOCAL_SETTINGS = '+($config.konversi|ConvertTo-Json -Compress)+'; window.BNIGHT_RUNTIME_TOKEN = "'+$token+'";'
                    $type=$mime['.js'];$body=[Text.Encoding]::UTF8.GetBytes($js)
                }else{
                    if($path -eq '/'){$path='/index.html'}
                    $file=[IO.Path]::GetFullPath((Join-Path $webRoot $path.TrimStart('/')))
                    if(!$file.StartsWith($webRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $path.Contains('\') -or $path.Contains(':')){$code='403 Forbidden'}
                    elseif(Test-Path -LiteralPath $file -PathType Leaf){$body=[IO.File]::ReadAllBytes($file);$ext=[IO.Path]::GetExtension($file).ToLowerInvariant();if($mime.ContainsKey($ext)){$type=$mime[$ext]}else{$type='application/octet-stream'}}
                    else{$code='404 Not Found'}
                }
            }
            $header="HTTP/1.1 $code`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nCross-Origin-Resource-Policy: same-origin`r`nConnection: close`r`n`r`n"
            $bytes=[Text.Encoding]::ASCII.GetBytes($header);$stream.Write($bytes,0,$bytes.Length);if($parts[0] -ne 'HEAD'){$stream.Write($body,0,$body.Length)};$stream.Flush()
        }catch{}finally{if($stream){$stream.Dispose()};$client.Close()}
    }
}catch{Write-Host $_.Exception.Message -ForegroundColor Red;exit 1}finally{if($listener){$listener.Stop()}}
