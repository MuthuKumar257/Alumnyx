$bootstrapBody = @{
    email = 'admin@alumnyx.com'
    password = 'password123'
    forceResetPassword = $true
} | ConvertTo-Json

$loginBody = @{
    email = 'admin@alumnyx.com'
    password = 'password123'
} | ConvertTo-Json

$baseUrl = "https://apialumnyx.development.catalystappsail.in"

Write-Host "--- Bootstrapping Admin ---"
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/bootstrap-admin" -Method Post -Body $bootstrapBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response Body: $($response.Content)"
} catch {
    Write-Host "Bootstrap Failed"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
        Write-Host "Error Body: $errBody"
    } else {
        Write-Host "Error: $($_.Exception.Message)"
    }
}

Write-Host "`n--- Logging In ---"
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response Body: $($response.Content)"
} catch {
    Write-Host "Login Failed"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
        Write-Host "Error Body: $errBody"
    } else {
        Write-Host "Error: $($_.Exception.Message)"
    }
}
