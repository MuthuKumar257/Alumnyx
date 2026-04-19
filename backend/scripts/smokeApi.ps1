param(
    [string]$BaseUrl = "https://apialumnyx.development.catalystappsail.in",
    [string]$Email = "admin@alumnyx.com",
    [string]$Password = "password123",
    [switch]$IncludeWrites
)

$ErrorActionPreference = "Stop"

function Write-Pass {
    param([string]$Name, [int]$Status)
    Write-Output ("PASS|{0}|{1}" -f $Name, $Status)
}

function Write-Fail {
    param([string]$Name, $Response)

    $status = "N/A"
    $body = ""

    if ($Response -and $Response.StatusCode) {
        $status = [int]$Response.StatusCode
        try {
            $reader = New-Object System.IO.StreamReader($Response.GetResponseStream())
            $body = $reader.ReadToEnd()
        } catch {
            $body = "(no body)"
        }
    } else {
        $body = "(no response object)"
    }

    Write-Output ("FAIL|{0}|{1}|{2}" -f $Name, $status, $body)
}

function Invoke-Check {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        [string]$ContentType,
        [object]$Body
    )

    try {
        if ($PSBoundParameters.ContainsKey("Body")) {
            $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType $ContentType -Body $Body -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
        }

        Write-Pass -Name $Name -Status $response.StatusCode
    } catch {
        Write-Fail -Name $Name -Response $_.Exception.Response
    }
}

$base = $BaseUrl.TrimEnd('/')
Write-Output ("BASE_URL={0}" -f $base)

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri ("{0}/api/auth/login" -f $base) -Method Post -Body $loginBody -ContentType "application/json"
    $token = [string]$login.token
    if ([string]::IsNullOrWhiteSpace($token)) {
        Write-Output "FAIL|LOGIN|200|Token missing in login response"
        exit 1
    }
    Write-Output "PASS|LOGIN|200"
} catch {
    Write-Fail -Name "LOGIN" -Response $_.Exception.Response
    exit 1
}

$escapedToken = [uri]::EscapeDataString($token)

$readChecks = @(
    @{ Name = "AUTH_ME"; Url = ("{0}/api/auth/me?token={1}" -f $base, $escapedToken) },
    @{ Name = "ADMIN_STATS"; Url = ("{0}/api/admin/stats?token={1}" -f $base, $escapedToken) },
    @{ Name = "ADMIN_USERS"; Url = ("{0}/api/admin/users?token={1}" -f $base, $escapedToken) },
    @{ Name = "ADMIN_DEPARTMENTS"; Url = ("{0}/api/admin/departments?token={1}" -f $base, $escapedToken) },
    @{ Name = "ADMIN_LOGS"; Url = ("{0}/api/admin/logs?token={1}" -f $base, $escapedToken) }
)

foreach ($check in $readChecks) {
    Invoke-Check -Name $check.Name -Method "Get" -Url $check.Url
}

if ($IncludeWrites) {
    $uniName = "Alumnyx University " + (Get-Date -Format "HHmmss")
    $uniBody = "universityName=" + [uri]::EscapeDataString($uniName) + "&token=" + $escapedToken

    Invoke-Check -Name "ADMIN_UNIVERSITY_UPDATE" -Method "Post" -Url ("{0}/api/admin/university/update" -f $base) -ContentType "application/x-www-form-urlencoded" -Body $uniBody

    $emailUnique = "smoke" + (Get-Random -Minimum 1000 -Maximum 9999) + "@alumnyx.com"
    $userBody = "firstName=Smoke&lastName=User&email=" + [uri]::EscapeDataString($emailUnique) + "&role=STUDENT&college=Alumnyx+University&graduationYear=2027&department=cse&token=" + $escapedToken

    Invoke-Check -Name "ADMIN_CREATE_USER" -Method "Post" -Url ("{0}/api/admin/users" -f $base) -ContentType "application/x-www-form-urlencoded" -Body $userBody
}
