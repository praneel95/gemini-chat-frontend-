    document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const imageInput = document.getElementById('image-input');

    let chatHistory = []; // To store conversation history

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const imageInput = document.getElementById('image-input');

    let chatHistory = []; // To store conversation history

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
            const response = await fetch('https://gemini-chat-backend-8r6r.onrender.com', {
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

    // Clear chat history button
    const clearChatBtn = document.createElement('button');
    clearChatBtn.textContent = 'Clear Chat';
    clearChatBtn.id = 'clear-chat-btn';
    clearChatBtn.classList.add('clear-chat-btn'); // Add a class for styling
    document.querySelector('.chat-container').prepend(clearChatBtn); // Add to the top of chat container

    clearChatBtn.addEventListener('click', () => {
        chatBox.innerHTML = ''; // Clear messages from display
        chatHistory = []; // Clear chat history array
    });
});
});
