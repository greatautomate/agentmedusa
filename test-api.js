// Test script for MedusaXD API
const API_BASE = 'https://medusaxd.com/api';

async function testAPI() {
    console.log('🧪 Testing MedusaXD API...\n');
    
    try {
        // 1. Health Check
        console.log('1. Testing Health Check...');
        const healthResponse = await fetch(`${API_BASE}/health`);
        const health = await healthResponse.json();
        console.log('✅ Health:', health);
        console.log('');
        
        // 2. Password Verification
        console.log('2. Testing Password Verification...');
        const passwordResponse = await fetch(`${API_BASE}/verify-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'MedusaXD' })
        });
        const passwordResult = await passwordResponse.json();
        console.log('✅ Password verification:', passwordResult);
        console.log('');
        
        // 3. Create Conversation
        console.log('3. Creating new conversation...');
        const conversationResponse = await fetch(`${API_BASE}/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const conversation = await conversationResponse.json();
        console.log('✅ Conversation created:', conversation);
        console.log('');
        
        // 4. Send Message
        console.log('4. Sending test message...');
        const messageResponse = await fetch(`${API_BASE}/conversations/${conversation.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Write a simple Python hello world script with comments and explain each line'
            })
        });
        const messageResult = await messageResponse.json();
        console.log('✅ Message sent, response:');
        console.log('Content:', messageResult.messages[0].content);
        console.log('');
        
        // 5. Get Conversation History
        console.log('5. Getting conversation history...');
        const historyResponse = await fetch(`${API_BASE}/conversations/${conversation.id}`);
        const history = await historyResponse.json();
        console.log('✅ Conversation history:', history);
        
    } catch (error) {
        console.error('❌ Error testing API:', error);
    }
}

// Run the test
testAPI();
