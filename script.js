const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");

// API Setup
const API_KEY = "AIzaSyBfQ7n3-HyiV7CxSHK_AfqVHicLwDZU9dg";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const chatHistory = [];
let userData = { message: "", file: {}};

let typingInterval, controller;

// Function to create message element
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Function for scrollToBottom
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth"});

// Simulate typing effect for bot response
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    // Set an interval to type each word
    typingInterval = setInterval(() => {
        if(wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? " " : " ") + words[wordIndex++];
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
        }
    }, 40);
}

// Make the API call and generate the bot's reponse
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    // Add user message and file data to chat history
    chatHistory.push({
        role: "user",
        parts: [{ text: userData.message}, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ... rest }) => rest)(userData.file) }] : [])]
    });

    try {
        // Send the chat history to API to get a response
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({ contents: chatHistory}),
            signal: controller.signal
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.error.message);

        // Process the reponse text and display it with typing effect
        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        typingEffect(responseText, textElement, botMsgDiv);
        
        chatHistory.push({role: "model", parts: [{ text: responseText}] });

        console.log(chatHistory);
    } catch (error) {
        console.log(error);
    } finally {
        userData.file = {};
    }
}

// Handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if(!userMessage) return;

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    // Generate user message HTML with optional file attachment
    const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
            `;
        
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");

    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        // Generate bot message HTML and add in the chats container after 600ms
        const botMsgHTML = `<img src="assets/gemini-chatbot-logo.svg" class="avatar"><p class="message-text">Just a sec...</p>`
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading")
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv);
 }, 600);
 
}

// Handle file input change (file upload)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if(!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64string = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        // Store file data in userData obj
        userData.file = { fileName: file.name, data: base64string, mime_type: file.type, isImage};
    }
});

// Cancel File Upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

// Stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());