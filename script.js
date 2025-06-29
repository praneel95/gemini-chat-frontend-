document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const imageInput = document.getElementById('image-input');

    let chatHistory = []; // To store current conversation history
    let allChats = JSON.parse(localStorage.getItem('allChats')) || {}; // To store all chat sessions
    let currentChatId = null; // To track the current chat session

    const saveChat = () => {
        if (chatHistory.length > 0) {
            if (!currentChatId) {
                currentChatId = `chat-${Date.now()}`;
            }
            allChats[currentChatId] = chatHistory;
            localStorage.setItem('allChats', JSON.stringify(allChats));
            renderPastChats();
        }
    };

    const loadChat = (chatId) => {
        currentChatId = chatId;
        chatHistory = allChats[chatId] || [];
        chatBox.innerHTML = ''; // Clear current display
        chatHistory.forEach(entry => {
            if (entry.role === 'user') {
                appendMessage(entry.parts[0].text, 'user', false, entry.imageUrl);
            } else if (entry.role === 'model') {
                appendMessage(entry.parts[0].text, 'bot');
            }
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const renderPastChats = () => {
        const pastChatsList = document.getElementById('past-chats-list');
        pastChatsList.innerHTML = '';
        Object.keys(allChats).forEach(chatId => {
            const chatEntry = allChats[chatId];
            if (chatEntry.length > 0) {
                const firstMessage = chatEntry[0].parts[0].text.substring(0, 30) + '...'; // Display first 30 chars
                const listItem = document.createElement('li');
                listItem.textContent = firstMessage;
                listItem.dataset.chatId = chatId;
                listItem.addEventListener('click', () => loadChat(chatId));
                pastChatsList.appendChild(listItem);
            }
        });
    };

    // Initial render of past chats on load
    renderPastChats();

    // Save chat before unload
    window.addEventListener('beforeunload', saveChat);

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const fileToText = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const sendMessage = async () => {
        const message = userInput.value.trim();
        const selectedFile = imageInput.files[0];

        if (message === '' && !selectedFile) return;

        let fileContent = null;
        let fileMimeType = null;
        let displayUrl = null;

        if (selectedFile) {
            fileMimeType = selectedFile.type;
            if (fileMimeType.startsWith('image/')) {
                fileContent = await fileToBase64(selectedFile);
                displayUrl = URL.createObjectURL(selectedFile);
            } else if (fileMimeType === 'application/pdf' || fileMimeType === 'text/csv' || fileMimeType === 'text/plain') {
                fileContent = await fileToText(selectedFile);
            } else {
                alert('Unsupported file type.');
                return;
            }
        }

        // Add user message to history and display
        const userMessage = { role: 'user', parts: [{ text: message }] };
        if (fileContent && fileMimeType) {
            userMessage.parts.push({
                inlineData: {
                    mimeType: fileMimeType,
                    data: fileContent
                }
            });
        }
        chatHistory.push(userMessage);
        appendMessage(message, 'user', false, displayUrl);

        userInput.value = '';
        imageInput.value = '';
        userInput.disabled = true;
        sendBtn.disabled = true;

        const loadingMessageElement = appendMessage('...', 'bot', true);

        try {
            const response = await fetch('https://gemini-chat-backend-8r6r.onrender.com/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message, fileContent, fileMimeType, history: chatHistory }) // Send history
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            updateMessage(loadingMessageElement, data.response);

            // Add bot response to history
            chatHistory.push({ role: 'model', parts: [{ text: data.response }] });
            saveChat(); // Save chat after bot response

        } catch (error) {
            console.error('Error sending message:', error);
            updateMessage(loadingMessageElement, 'Error: Could not connect to the server.');
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }
    };

    const appendMessage = (message, sender, isLoading = false, imageUrl = null) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.maxWidth = '200px';
            img.style.display = 'block';
            img.style.marginBottom = '10px';
            messageElement.appendChild(img);
        }

        const p = document.createElement('p');
        p.textContent = message;
        messageElement.appendChild(p);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        if (isLoading) {
            messageElement.classList.add('loading-message');
        }
        return messageElement;
    };

    const updateMessage = (messageElement, newMessage) => {
        // Use marked.js to convert markdown to HTML
        messageElement.querySelector('p').innerHTML = marked.parse(newMessage);
        messageElement.classList.remove('loading-message');
        chatBox.scrollTop = chatBox.scrollHeight;

        // Apply syntax highlighting to code blocks
        messageElement.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    };

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // New Chat button functionality
    const newChatBtn = document.getElementById('new-chat-btn');
    newChatBtn.addEventListener('click', () => {
        saveChat(); // Save current chat before starting a new one
        chatBox.innerHTML = ''; // Clear messages from display
        chatHistory = []; // Clear chat history array
        currentChatId = null; // Reset current chat ID
    });

    // Search in Chat functionality
    const searchChatInput = document.getElementById('search-chat-input');
    searchChatInput.addEventListener('input', () => {
        const query = searchChatInput.value.toLowerCase();
        const messages = chatBox.querySelectorAll('.message p');
        messages.forEach(messageP => {
            const originalText = messageP.dataset.originalText || messageP.textContent; // Store original text
            messageP.dataset.originalText = originalText;

            if (query && originalText.toLowerCase().includes(query)) {
                const highlightedText = originalText.replace(new RegExp(query, 'gi'), match => `<span class="highlight">${match}</span>`);
                messageP.innerHTML = highlightedText;
            } else {
                messageP.innerHTML = originalText;
            }
        });
    });
});
