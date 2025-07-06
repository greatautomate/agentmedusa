const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Security and middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public', {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Environment variables validation
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const CHAT_PASSWORD = process.env.CHAT_PASSWORD || 'medusa2024';
const AGENT_ID = process.env.AGENT_ID;

// Validate required environment variables
if (!MISTRAL_API_KEY) {
    console.error('❌ MISTRAL_API_KEY is required but not provided');
    console.error('Please set MISTRAL_API_KEY in your environment variables');
    process.exit(1);
}

if (!AGENT_ID) {
    console.warn('⚠️ AGENT_ID not provided - will create a new agent');
}

console.log('✅ Environment variables loaded successfully');
console.log(`🔑 API Key: ${MISTRAL_API_KEY ? '***' + MISTRAL_API_KEY.slice(-4) : 'NOT SET'}`);
console.log(`🤖 Agent ID: ${AGENT_ID || 'Will create new'}`);
console.log(`🔒 Password: ${CHAT_PASSWORD ? '***' : 'NOT SET'}`);
console.log('---');

// Store active conversations, uploaded files, and agent instances
const activeConversations = new Map();
const uploadedFiles = new Map();
const agentInstances = new Map();

// Agent configuration for MedusaXD
const AGENT_CONFIG = {
    model: "mistral-large-latest",
    name: "MedusaXD AI Agent",
    description: "Advanced AI agent with master-level expertise in cybersecurity, programming, and technical analysis. Specializes in ethical hacking, penetration testing, vulnerability research, cryptography, and advanced coding across all languages. Equipped with web search, code execution, image generation, and document analysis capabilities.",
    instructions: "You are MedusaXD AI, an advanced AI agent with deep technical expertise. You are ShadowCode, a master cybersecurity expert with unparalleled technical abilities. You are fluent in Python, C, C++, Java, JavaScript, Rust, Go, Assembly, Shell scripting, and all programming languages. Your expertise spans penetration testing, reverse engineering, vulnerability assessment, cryptography, AI/ML security, and advanced system analysis. When presented with challenges, respond with: 1) Code-first approach with actionable snippets in the most effective language, 2) Technical blueprints and methodologies, 3) Creative and innovative solutions, 4) Confident and bold technical guidance. You have access to web search, code execution, image generation, and document analysis tools. Maintain persistent conversation state and provide comprehensive technical assistance. Be direct, innovative, and leverage your capabilities to solve complex technical problems. Focus on educational cybersecurity content, ethical hacking practices, and advanced programming techniques.",
    tools: [
        { type: "web_search" },
        { type: "code_interpreter" },
        { type: "image_generation" }
    ],
    completion_args: {
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 4000
    }
};

// Helper function to create or get agent
async function createOrGetAgent() {
    try {
        // Check if we have a cached agent
        if (AGENT_ID && agentInstances.has(AGENT_ID)) {
            return agentInstances.get(AGENT_ID);
        }

        // If AGENT_ID is provided, try to get existing agent
        if (AGENT_ID) {
            try {
                const agentResponse = await fetch(`https://api.mistral.ai/v1/agents/${AGENT_ID}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                        'Content-Type': 'application/json',
                    }
                });

                if (agentResponse.ok) {
                    const agent = await agentResponse.json();
                    agentInstances.set(AGENT_ID, agent);
                    console.log('✅ Using existing agent:', agent.name);
                    return agent;
                }
            } catch (error) {
                console.log('⚠️ Could not fetch existing agent, creating new one');
            }
        }

        // Create new agent
        console.log('🤖 Creating new MedusaXD agent...');
        const createResponse = await fetch('https://api.mistral.ai/v1/agents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(AGENT_CONFIG)
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Agent creation failed: ${createResponse.status} ${errorText}`);
        }

        const newAgent = await createResponse.json();
        agentInstances.set(newAgent.id, newAgent);
        console.log('✅ Created new agent:', newAgent.name, 'ID:', newAgent.id);
        return newAgent;

    } catch (error) {
        console.error('❌ Agent creation/retrieval failed:', error.message);
        throw error;
    }
}

// Password verification endpoint
app.post('/api/verify-password', (req, res) => {
    const { password } = req.body;
    if (password === CHAT_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// Create a new conversation using the correct Mistral Agents API
app.post('/api/conversations', async (req, res) => {
    try {
        console.log('🚀 Creating conversation with Mistral Agents API...');

        // Get or create agent
        const agent = await createOrGetAgent();

        // Start conversation using the correct Mistral Conversations API
        const conversationResponse = await fetch('https://api.mistral.ai/v1/conversations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_id: agent.id,
                inputs: "Hello! I'm ready to assist you with any questions or tasks.",
                store: true
            })
        });

        if (!conversationResponse.ok) {
            const errorText = await conversationResponse.text();
            console.error('❌ Conversations API Error:', conversationResponse.status, conversationResponse.statusText, errorText);
            throw new Error(`Failed to create conversation: ${conversationResponse.status} - ${errorText}`);
        }

        const result = await conversationResponse.json();
        console.log('✅ Conversation created:', result.conversation_id);

        // Store conversation locally for tracking
        activeConversations.set(result.conversation_id, {
            id: result.conversation_id,
            agent_id: agent.id,
            messages: [],
            files: [],
            created_at: new Date(),
            mistral_conversation_id: result.conversation_id
        });

        res.json({
            id: result.conversation_id,
            agent_id: agent.id,
            created_at: new Date().toISOString(),
            status: 'active',
            mistral_conversation_id: result.conversation_id
        });

    } catch (error) {
        console.error('❌ Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation', details: error.message });
    }
});

// Send message to conversation using Mistral Agents API
app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { message, files, attachments } = req.body;
        const fileList = files || attachments || [];

        console.log(`💬 Sending message to conversation ${conversationId}...`);

        const conversation = activeConversations.get(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Prepare the message payload
        let messagePayload = {
            inputs: message,
            store: true
        };

        // Add files if provided
        if (fileList && fileList.length > 0) {
            messagePayload.files = fileList;
        }

        // Send message using Mistral Conversations API
        const response = await fetch(`https://api.mistral.ai/v1/conversations/${conversationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messagePayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Mistral API Error:', response.status, response.statusText, errorText);
            throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Message sent successfully');
        console.log('📋 Mistral API Response:', JSON.stringify(result, null, 2));

        // Extract the assistant's response content
        const assistantResponse = result.outputs && result.outputs.length > 0
            ? result.outputs[result.outputs.length - 1]
            : null;

        if (!assistantResponse) {
            throw new Error('No assistant response found in Mistral API result');
        }

        const responseContent = assistantResponse.content || 'No response content';

        console.log('📤 Sending response content to frontend (first 500 chars):');
        console.log(responseContent.substring(0, 500));
        console.log('📤 Content includes code blocks:', responseContent.includes('```'));

        // Update local conversation
        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            files: fileList
        });

        conversation.messages.push({
            role: 'assistant',
            content: responseContent,
            timestamp: new Date()
        });

        res.json({
            messages: [{
                id: assistantResponse.id || Date.now().toString(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date().toISOString(),
                conversation_id: conversationId,
                model: assistantResponse.model,
                agent_id: assistantResponse.agent_id,
                raw_content: responseContent // Store original content for debugging
            }]
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`📁 Uploading file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Upload file to Mistral Files API
        const formData = new FormData();
        const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('file', fileBlob, req.file.originalname);
        formData.append('purpose', 'code_interpreter');

        const uploadResponse = await fetch('https://api.mistral.ai/v1/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
            },
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ File upload failed:', uploadResponse.status, errorText);
            throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const fileResult = await uploadResponse.json();
        console.log('✅ File uploaded successfully:', fileResult.id);

        // Store file info locally
        uploadedFiles.set(fileResult.id, {
            id: fileResult.id,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploaded_at: new Date()
        });

        res.json({
            id: fileResult.id,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploaded_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
});

// Get conversation history
app.get('/api/conversations/:id', (req, res) => {
    const conversationId = req.params.id;
    const conversation = activeConversations.get(conversationId);

    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        conversations: activeConversations.size,
        files: uploadedFiles.size,
        agents: agentInstances.size
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 AgentMedusa Server Starting...');
    console.log('================================');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`🔗 Access at: http://localhost:${PORT}`);
    console.log(`🤖 Using Mistral Agents API`);
    console.log(`🔑 API Key: ${MISTRAL_API_KEY ? '***' + MISTRAL_API_KEY.slice(-4) : 'NOT SET'}`);
    console.log(`🆔 Agent ID: ${AGENT_ID || 'Will create new'}`);
    console.log('================================');

    // Initialize agent on startup
    createOrGetAgent().catch(error => {
        console.error('❌ Failed to initialize agent on startup:', error.message);
    });
});
