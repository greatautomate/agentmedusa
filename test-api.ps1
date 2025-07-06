# Test script for MedusaXD API
$API_BASE = "https://medusaxd.com/api"

Write-Host "Testing MedusaXD API..." -ForegroundColor Cyan
Write-Host ""

try {
    # 1. Health Check
    Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
    $health = Invoke-RestMethod -Uri "$API_BASE/health" -Method GET
    Write-Host "✅ Health Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Conversations: $($health.conversations)" -ForegroundColor Gray
    Write-Host "   Files: $($health.files)" -ForegroundColor Gray
    Write-Host "   Agents: $($health.agents)" -ForegroundColor Gray
    Write-Host ""
    
    # 2. Password Verification
    Write-Host "2. Testing Password Verification..." -ForegroundColor Yellow
    $passwordBody = @{password = "MedusaXD"} | ConvertTo-Json
    $passwordResult = Invoke-RestMethod -Uri "$API_BASE/verify-password" -Method POST -Body $passwordBody -ContentType "application/json"
    Write-Host "✅ Password verification: $($passwordResult.success)" -ForegroundColor Green
    Write-Host ""
    
    # 3. Create Conversation
    Write-Host "3. Creating new conversation..." -ForegroundColor Yellow
    $conversation = Invoke-RestMethod -Uri "$API_BASE/conversations" -Method POST -ContentType "application/json"
    Write-Host "✅ Conversation created with ID: $($conversation.id)" -ForegroundColor Green
    Write-Host "   Agent ID: $($conversation.agent_id)" -ForegroundColor Gray
    Write-Host ""
    
    # 4. Send Message
    Write-Host "4. Sending test message..." -ForegroundColor Yellow
    $messageBody = @{
        message = "Write a simple Python hello world script with comments and explain each line"
    } | ConvertTo-Json
    
    $messageResult = Invoke-RestMethod -Uri "$API_BASE/conversations/$($conversation.id)/messages" -Method POST -Body $messageBody -ContentType "application/json"
    Write-Host "✅ Message sent successfully!" -ForegroundColor Green
    Write-Host "Response content (first 200 chars):" -ForegroundColor Gray
    $content = $messageResult.messages[0].content
    if ($content.Length -gt 200) {
        Write-Host $content.Substring(0, 200) + "..." -ForegroundColor White
    } else {
        Write-Host $content -ForegroundColor White
    }
    Write-Host ""
    
    # Check if response contains code blocks
    if ($content -match '```') {
        Write-Host "Response contains code blocks!" -ForegroundColor Green
        Write-Host "Code blocks found in response - this should render properly in the frontend." -ForegroundColor Green
    } else {
        Write-Host "No code blocks found in response" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error testing API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "API Testing Complete!" -ForegroundColor Cyan
