param(
  [Parameter(Mandatory=$true)]
  [string]$WebhookUrl,

  [Parameter(Mandatory=$true)]
  [string]$WebhookSecret,

  [Parameter(Mandatory=$true)]
  [string]$CustomerEmail,

  [Parameter(Mandatory=$false)]
  [ValidateSet('subscription_created','subscription_renewed','purchase_approved','subscription_canceled','subscription_renewal_refused','refund','chargeback')]
  [string]$Event = 'subscription_created',

  [Parameter(Mandatory=$false)]
  [string]$AnonKey = ''
)

$payload = @{
  secret = $WebhookSecret
  event  = $Event
  data   = @{
    customer = @{
      email = $CustomerEmail
    }
  }
} | ConvertTo-Json -Depth 10

Write-Host "POST $WebhookUrl" -ForegroundColor Cyan
Write-Host "Event: $Event | Email: $CustomerEmail" -ForegroundColor Cyan

$headers = @{
  'Content-Type' = 'application/json'
}

if ($AnonKey) {
  $headers['apikey'] = $AnonKey
  $headers['Authorization'] = "Bearer $AnonKey"
  Write-Host "Using anon key for authentication" -ForegroundColor Yellow
}

try {
  $res = Invoke-RestMethod -Uri $WebhookUrl -Method Post -Headers $headers -Body $payload
  $res | ConvertTo-Json -Depth 20
} catch {
  Write-Host "Request failed." -ForegroundColor Red
  if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Host $body
  }
  throw
}
