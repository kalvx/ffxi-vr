$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Config = Join-Path $Root "admin\auth-config.js"
$Secure = Read-Host "Choose the GM admin passphrase" -AsSecureString
$Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)

try {
    $Plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
    if ([string]::IsNullOrWhiteSpace($Plain) -or $Plain.Length -lt 10) {
        throw "Use a passphrase at least 10 characters long. Nothing was changed."
    }

    $Bytes = [Text.Encoding]::UTF8.GetBytes($Plain)
    $Sha = [Security.Cryptography.SHA256]::Create()
    try { $HashBytes = $Sha.ComputeHash($Bytes) }
    finally { $Sha.Dispose() }
    $Hash = -join ($HashBytes | ForEach-Object { $_.ToString("x2") })
    $Line = 'window.VR_ADMIN_HASH = "' + $Hash + '";' + [Environment]::NewLine
    [IO.File]::WriteAllText($Config, $Line, [Text.UTF8Encoding]::new($false))
    Write-Host "Admin password configured. Only its SHA-256 hash was written." -ForegroundColor Green
}
finally {
    if ($null -ne $Plain) { $Plain = $null }
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer)
}
