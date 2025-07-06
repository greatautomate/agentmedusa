# Test the live MedusaXD application with a simple code request
$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = 'Bearer MedusaXD'
}

$body = @{
    message = "Write a simple hello world function in JavaScript with comments"
    conversation_id = "test-frontend-fix"
} | ConvertTo-Json

Write-Host "Testing MedusaXD API with code request..." -ForegroundColor Green
Write-Host "URL: https://medusaxd.com/api/chat" -ForegroundColor Yellow
Write-Host "Request body: $body" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://medusaxd.com/api/chat" -Method POST -Headers $headers -Body $body
    
    Write-Host "`n=== API Response ===" -ForegroundColor Green
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Messages count: $($response.messages.Count)" -ForegroundColor Yellow
    
    if ($response.messages -and $response.messages.Count -gt 0) {
        $lastMessage = $response.messages[-1]
        Write-Host "`n=== Last Message Content ===" -ForegroundColor Green
        Write-Host $lastMessage.content
        
        # Check if it contains code blocks
        if ($lastMessage.content -match '```') {
            Write-Host "`n✅ CONTAINS CODE BLOCKS!" -ForegroundColor Green
        } else {
            Write-Host "`n❌ NO CODE BLOCKS FOUND" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host "`nNow open https://medusaxd.com and ask the same question to test the frontend!" -ForegroundColor Magenta
Write-Host "Question to ask: Write a simple hello world function in JavaScript with comments" -ForegroundColor Yellow
Write-Host "`nCheck the browser console (F12) for debug logs from our fixes!" -ForegroundColor Cyan
