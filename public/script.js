
class MedusaXDAgent {
    constructor() {
        this.currentConversation = null;
        this.isAuthenticated = false;
        this.agentId = null;
        this.attachedFiles = [];
        this.config = null;
        this.settings = {
            responseStyle: 'detailed',
            codeTheme: 'dark',
            autoScroll: true,
            soundNotifications: false
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.showPasswordModal();
        await this.loadConfig();
        this.loadSettings();
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            this.config = await response.json();
            this.agentId = this.config.agentId;
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('medusaxd-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
            // Reset to defaults if corrupted
            this.settings = {
                theme: 'dark',
                soundNotifications: true,
                autoScroll: true,
                showTimestamps: true
            };
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('medusaxd-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings to localStorage:', error);
            this.showToast('Failed to save settings', 'warning');
        }
    }

    setupEventListeners() {
        // Password modal
        document.getElementById('unlockBtn').addEventListener('click', () => this.verifyPassword());
        document.getElementById('passwordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyPassword();
        });

        // Chat interface
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Action buttons
        document.getElementById('newConversationBtn').addEventListener('click', () => this.createNewConversation());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportConversation());
        document.getElementById('uploadFileBtn').addEventListener('click', () => this.showFileModal());
        document.getElementById('attachBtn').addEventListener('click', () => this.showFileModal());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettingsModal());

        // File upload
        document.getElementById('closeFileModal').addEventListener('click', () => this.hideFileModal());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('fileUploadArea').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // Settings modal
        document.getElementById('closeSettingsModal').addEventListener('click', () => this.hideSettingsModal());
        document.getElementById('responseStyle').addEventListener('change', (e) => {
            this.settings.responseStyle = e.target.value;
            this.saveSettings();
        });
        document.getElementById('codeTheme').addEventListener('change', (e) => {
            this.settings.codeTheme = e.target.value;
            this.saveSettings();
        });
        document.getElementById('autoScroll').addEventListener('change', (e) => {
            this.settings.autoScroll = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('soundNotifications').addEventListener('change', (e) => {
            this.settings.soundNotifications = e.target.checked;
            this.saveSettings();
        });

        // Drag and drop
        this.setupDragAndDrop();

        // Auto-resize textarea
        document.getElementById('messageInput').addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        });
    }

    setupDragAndDrop() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.target.style.borderColor = '#ff6b6b';
        });

        fileUploadArea.addEventListener('dragleave', (e) => {
            e.target.style.borderColor = '#333';
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.target.style.borderColor = '#333';
            this.handleFileSelect(e);
        });
    }

    showPasswordModal() {
        document.getElementById('passwordModal').style.display = 'flex';
    }

    async verifyPassword() {
        const password = document.getElementById('passwordInput').value;
        const errorDiv = document.getElementById('passwordError');
        
        try {
            const response = await fetch('/api/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                this.isAuthenticated = true;
                document.getElementById('passwordModal').style.display = 'none';
                document.getElementById('chatContainer').style.display = 'flex';
                await this.createNewConversation();
                document.getElementById('messageInput').focus();
                this.showToast('Welcome to MedusaXD AI Agent!', 'success');
            } else {
                errorDiv.textContent = 'Invalid password. Access denied.';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Connection error. Please try again.';
            errorDiv.style.display = 'block';
        }
    }

    async createNewConversation() {
        try {
            this.updateAgentStatus('Initializing new conversation...');
            
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to create conversation');
            }

            const conversation = await response.json();
            this.currentConversation = conversation.id;
            
            this.updateAgentStatus('Agent Ready');
            this.clearChat();
            this.addSystemMessage('New conversation started with persistent memory and advanced capabilities enabled.');
            this.showToast('New conversation created', 'success');
            
        } catch (error) {
            console.error('Create conversation error:', error);
            this.updateAgentStatus('Error');
            this.addSystemMessage('Failed to create new conversation. Please try again.');
            this.showToast('Failed to create conversation', 'error');
        }
    }

    async sendMessage() {
        if (!this.currentConversation) {
            await this.createNewConversation();
        }

        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;

        // Add user message
        this.addMessage('user', message);
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Show typing indicator
        this.showTypingIndicator();
        this.updateAgentStatus('Processing with advanced AI...');
        
        // Disable send button
        document.getElementById('sendBtn').disabled = true;

        try {
            const response = await fetch(`/api/conversations/${this.currentConversation}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    attachments: this.attachedFiles
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const result = await response.json();
            
            // Remove typing indicator
            this.removeTypingIndicator();
            
            // Add assistant response
            if (result.messages && result.messages.length > 0) {
                const assistantMessage = result.messages[result.messages.length - 1];
                this.addMessage('assistant', assistantMessage.content, assistantMessage.tool_calls);
            }
            
            // Clear attachments
            this.clearAttachments();
            this.updateAgentStatus('Agent Ready');
            
            if (this.settings.soundNotifications) {
                this.playNotificationSound();
            }
            
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('assistant', 'I apologize, but I encountered an error processing your request. Please try again.');
            this.updateAgentStatus('Error');
            this.showToast('Error sending message', 'error');
            console.error('Send message error:', error);
        }

        // Re-enable send button
        document.getElementById('sendBtn').disabled = false;
    }

    addMessage(role, content, toolCalls = null) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const timestamp = new Date().toLocaleTimeString();
        const avatar = role === 'user' ? 'U' : 'AI';
        const roleName = role === 'user' ? 'You' : 'MedusaXD AI';

        let toolsHtml = '';
        if (toolCalls && toolCalls.length > 0) {
            toolsHtml = `
                <div class="message-tools">
                    <div class="tool-usage">
                        <i class="fas fa-tools"></i>
                        <span>Tools used: ${toolCalls.map(t => t.function?.name || t.type).join(', ')}</span>
                    </div>
                </div>
            `;
        }

        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-meta">
                    <div class="message-avatar">${avatar}</div>
                    <span class="message-role">${roleName}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-actions">
                    <button class="message-action-btn" onclick="medusaAgent.copyMessage(this)" title="Copy message">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="message-action-btn" onclick="medusaAgent.regenerateMessage(this)" title="Regenerate" ${role === 'user' ? 'style="display:none"' : ''}>
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
            </div>
            <div class="message-content">${this.formatMessageContent(content)}</div>
            ${toolsHtml}
        `;

        messagesContainer.appendChild(messageDiv);
        this.enhanceCodeBlocks(messageDiv);

        if (this.settings.autoScroll) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    formatMessageContent(content) {
        // Debug logging
        console.log('formatMessageContent called with:', content.substring(0, 100) + '...');
        console.log('marked available:', typeof marked !== 'undefined');
        console.log('Prism available:', typeof window.Prism !== 'undefined');

        // Use marked.js for better markdown parsing if available
        if (typeof marked !== 'undefined') {
            // Configure marked for safe rendering
            marked.setOptions({
                highlight: function(code, lang) {
                    if (window.Prism && window.Prism.languages[lang]) {
                        return window.Prism.highlight(code, window.Prism.languages[lang], lang);
                    }
                    return code;
                },
                breaks: true,
                gfm: true
            });

            // Parse markdown but handle code blocks specially
            let processedContent = content;

            // Extract and replace code blocks temporarily
            const codeBlocks = [];
            processedContent = processedContent.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
                const index = codeBlocks.length;
                console.log('Found code block:', { lang: lang || 'text', code: code.trim().substring(0, 50) + '...' });
                codeBlocks.push({ lang: lang || 'text', code: code.trim() });
                return `<div data-medusa-code-placeholder="${index}"></div>`;
            });

            console.log('Extracted code blocks:', codeBlocks.length);

            // Parse markdown
            let html = marked.parse(processedContent);
            console.log('HTML after marked.parse:', html.substring(0, 200) + '...');

            // Restore code blocks with enhanced formatting
            codeBlocks.forEach((block, index) => {
                const placeholder = `<div data-medusa-code-placeholder="${index}"></div>`;
                const codeHtml = this.createEnhancedCodeBlock(block.lang, block.code);
                console.log(`Replacing placeholder ${placeholder} with code block`);
                const beforeReplace = html.includes(placeholder);
                html = html.replace(placeholder, codeHtml);
                const afterReplace = html.includes(placeholder);
                console.log(`Placeholder found before: ${beforeReplace}, after: ${afterReplace}`);
            });

            console.log('Final HTML length:', html.length);
            return html;
        } else {
            console.log('Falling back to simple formatting');
            // Fallback to simple formatting
            return this.formatMessageSimple(content);
        }
    }

    formatMessageSimple(content) {
        // Format code blocks
        content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return this.createEnhancedCodeBlock(lang || 'text', code.trim());
        });

        // Format inline code
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Format other markdown
        content = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        return content;
    }

    createEnhancedCodeBlock(language, code) {
        const escapedCode = this.escapeHtml(code);
        const lines = code.split('\n').length;
        const isLong = lines > 10;
        const blockId = 'code_' + Math.random().toString(36).substr(2, 9);

        return `
            <div class="code-block-container" id="${blockId}">
                <div class="code-block-header">
                    <span class="code-language">${language}</span>
                    <div class="code-actions">
                        <button class="code-action-btn" onclick="medusaAgent.copyCodeBlock('${blockId}')" title="Copy code">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        ${isLong ? `<button class="code-action-btn" onclick="medusaAgent.toggleCodeExpansion('${blockId}')" title="Expand/Collapse">
                            <i class="fas fa-expand"></i> Expand
                        </button>` : ''}
                    </div>
                </div>
                <div class="code-block-content ${isLong ? 'collapsed' : ''}" data-expanded="false">
                    <pre><code class="language-${language}">${escapedCode}</code></pre>
                    ${isLong ? `<div class="code-expand-overlay">
                        <button class="code-expand-btn" onclick="medusaAgent.toggleCodeExpansion('${blockId}')">
                            <i class="fas fa-chevron-down"></i> Show more
                        </button>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    enhanceCodeBlocks(messageDiv) {
        const codeBlocks = messageDiv.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            if (window.Prism) {
                window.Prism.highlightElement(block);
            }
        });
    }

    copyCodeBlock(blockId) {
        const codeBlock = document.getElementById(blockId);
        if (!codeBlock) {
            console.error('Code block not found:', blockId);
            return;
        }

        const code = codeBlock.querySelector('code');
        if (!code) {
            console.error('Code element not found in block:', blockId);
            return;
        }

        const text = code.textContent;
        const copyBtn = codeBlock.querySelector('.code-action-btn');

        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.showCopySuccess(copyBtn);
                this.showToast('Code copied to clipboard', 'success');
            }).catch(err => {
                console.error('Failed to copy code:', err);
                this.fallbackCopyText(text, copyBtn);
            });
        } else {
            // Fallback for older browsers
            this.fallbackCopyText(text, copyBtn);
        }
    }

    showCopySuccess(copyBtn) {
        if (!copyBtn) return;

        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.classList.add('copied');

        setTimeout(() => {
            copyBtn.innerHTML = originalHtml;
            copyBtn.classList.remove('copied');
        }, 2000);
    }

    fallbackCopyText(text, copyBtn, isMessage = false) {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                if (isMessage) {
                    this.showMessageCopySuccess(copyBtn);
                    this.showToast('Message copied to clipboard', 'success');
                } else {
                    this.showCopySuccess(copyBtn);
                    this.showToast('Code copied to clipboard', 'success');
                }
            } else {
                throw new Error('Copy command failed');
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            const itemType = isMessage ? 'message' : 'code';
            this.showToast(`Failed to copy ${itemType}. Please select and copy manually.`, 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    toggleCodeExpansion(blockId) {
        const codeBlock = document.getElementById(blockId);
        const content = codeBlock.querySelector('.code-block-content');
        const expandBtn = codeBlock.querySelector('.code-expand-btn');
        const actionBtn = codeBlock.querySelector('.code-action-btn[title="Expand/Collapse"]');
        const overlay = codeBlock.querySelector('.code-expand-overlay');

        const isExpanded = content.dataset.expanded === 'true';

        if (isExpanded) {
            // Collapse
            content.classList.add('collapsed');
            content.classList.remove('expanded');
            content.dataset.expanded = 'false';
            if (expandBtn) expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Show more';
            if (actionBtn) actionBtn.innerHTML = '<i class="fas fa-expand"></i> Expand';
            if (overlay) overlay.style.display = 'flex';
        } else {
            // Expand
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            content.dataset.expanded = 'true';
            if (expandBtn) expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Show less';
            if (actionBtn) actionBtn.innerHTML = '<i class="fas fa-compress"></i> Collapse';
            if (overlay) overlay.style.display = 'none';
        }
    }

    copyMessage(button) {
        const message = button.closest('.message');
        const content = message.querySelector('.message-content');
        const text = content.textContent;

        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.showMessageCopySuccess(button);
                this.showToast('Message copied to clipboard', 'success');
            }).catch(err => {
                console.error('Failed to copy message:', err);
                this.fallbackCopyText(text, button, true);
            });
        } else {
            // Fallback for older browsers
            this.fallbackCopyText(text, button, true);
        }
    }

    showMessageCopySuccess(button) {
        const originalHtml = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';

        setTimeout(() => {
            button.innerHTML = originalHtml;
        }, 1000);
    }

    regenerateMessage(button) {
        // TODO: Implement message regeneration
        this.showToast('Regeneration feature coming soon', 'warning');
    }

    addSystemMessage(content) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${content}`;
        messagesContainer.appendChild(messageDiv);
        
        if (this.settings.autoScroll) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <span>MedusaXD AI Agent is processing</span>
            <div class="typing-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        
        if (this.settings.autoScroll) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    updateAgentStatus(status) {
        const statusElement = document.getElementById('agentStatus');
        statusElement.innerHTML = `<i class="fas fa-circle"></i> ${status}`;
    }

    clearChat() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <h3>Welcome to MedusaXD AI Agent</h3>
                <p>Your advanced AI agent with master-level cybersecurity expertise and technical capabilities!</p>
                <div class="agent-features">
                    <div class="feature">
                        <i class="fas fa-memory"></i>
                        <span>Persistent Memory</span>
                        <small>Remembers context across conversations</small>
                    </div>
                    <div class="feature">
                        <i class="fas fa-shield-alt"></i>
                        <span>Cybersecurity Expert</span>
                        <small>Ethical hacking, penetration testing, vulnerability analysis</small>
                    </div>
                    <div class="feature">
                        <i class="fas fa-code"></i>
                        <span>Master Programmer</span>
                        <small>Expert in all languages: Python, C++, Assembly, Rust, Go</small>
                    </div>
                    <div class="feature">
                        <i class="fas fa-file-upload"></i>
                        <span>File Analysis</span>
                        <small>Upload and analyze documents, images, and data</small>
                    </div>
                </div>
                <div class="quick-actions">
                    <button class="quick-action" onclick="medusaAgent.insertPrompt(\'Write a Python script that\')">
                        <i class="fas fa-python"></i> Python Script
                    </button>
                    <button class="quick-action" onclick="medusaAgent.insertPrompt(\'Analyze this data and provide insights\')">
                        <i class="fas fa-chart-line"></i> Data Analysis
                    </button>
                    <button class="quick-action" onclick="medusaAgent.insertPrompt(\'Help me debug this code\')">
                        <i class="fas fa-bug"></i> Debug Code
                    </button>
                </div>
            </div>
        `;
    }

    insertPrompt(prompt) {
        const messageInput = document.getElementById('messageInput');
        messageInput.value = prompt;
        messageInput.focus();
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    }

    async exportConversation() {
        if (!this.currentConversation) {
            this.showToast('No conversation to export', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/conversations/${this.currentConversation}/export`);
            
            if (!response.ok) {
                throw new Error('Failed to export conversation');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `medusaxd-chat-${this.currentConversation}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast('Conversation exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Failed to export conversation', 'error');
        }
    }

    showFileModal() {
        document.getElementById('fileModal').style.display = 'flex';
    }

    hideFileModal() {
        document.getElementById('fileModal').style.display = 'none';
    }

    showSettingsModal() {
        document.getElementById('settingsModal').style.display = 'flex';
        
        // Load current settings
        document.getElementById('responseStyle').value = this.settings.responseStyle;
        document.getElementById('codeTheme').value = this.settings.codeTheme;
        document.getElementById('autoScroll').checked = this.settings.autoScroll;
        document.getElementById('soundNotifications').checked = this.settings.soundNotifications;
    }

    hideSettingsModal() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    async handleFileSelect(event) {
        const files = event.target.files || event.dataTransfer.files;
        
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                this.showToast(`File ${file.name} is too large. Maximum size is 10MB.`, 'warning');
                continue;
            }
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Upload failed');
                }
                
                const result = await response.json();
                
                this.attachedFiles.push({
                    id: result.id,
                    name: result.name,
                    type: result.type,
                    size: result.size
                });
                
                this.showToast(`File ${file.name} uploaded successfully`, 'success');
            } catch (error) {
                console.error('Upload error:', error);
                this.showToast(`Failed to upload ${file.name}`, 'error');
            }
        }
        
        this.updateAttachmentPreview();
        this.hideFileModal();
    }

    updateAttachmentPreview() {
        const preview = document.getElementById('attachmentPreview');
        preview.innerHTML = '';
        
        this.attachedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'attachment-item';
            item.innerHTML = `
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
                <button class="remove-attachment" onclick="medusaAgent.removeAttachment(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(item);
        });
    }

    removeAttachment(index) {
        this.attachedFiles.splice(index, 1);
        this.updateAttachmentPreview();
        this.showToast('Attachment removed', 'success');
    }

    clearAttachments() {
        this.attachedFiles = [];
        this.updateAttachmentPreview();
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i>
            ${message}
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    playNotificationSound() {
        // Create a simple notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }
}

// Initialize the agent application
let medusaAgent;
document.addEventListener('DOMContentLoaded', () => {
    medusaAgent = new MedusaXDAgent();
});

