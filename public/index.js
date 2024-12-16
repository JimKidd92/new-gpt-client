document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const messagesDiv = document.getElementById("messages");
  const newChatButton = document.getElementById("new-chat-button");
  const chatList = document.getElementById("chat-list");
  const modelSelect = document.getElementById("model-select");

  let conversationHistory = [];
  let chatSessions = JSON.parse(sessionStorage.getItem("chatSessions")) || [];
  let currentChatIndex = null; 
  let selectedModel = modelSelect.value;

  loadChatList();

  modelSelect.addEventListener("change", () => {
    selectedModel = modelSelect.value;
    newChatButton.click();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (message === "") return;
    appendMessage("user", message);
    userInput.value = "";
    userInput.focus();

    conversationHistory.push({ role: "user", content: message });

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: conversationHistory,
          model: selectedModel,
        }),
      });
      const data = await response.json();
      appendMessage("bot", data.reply);

      // Add the bot's reply to the conversation history
      conversationHistory.push({ role: "assistant", content: data.reply });
    } catch (error) {
      appendMessage(
        "bot",
        "Sorry, there was an error processing your request."
      );
      console.error("Error:", error);
    }
  });

  newChatButton.addEventListener("click", () => {
    if (conversationHistory.length > 0) {
      saveCurrentChat();
    }

    currentChatIndex = null;
    conversationHistory = [];
    messagesDiv.innerHTML = "";
    userInput.value = "";
    userInput.focus();
  });

  function appendMessage(sender, message) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);

    const timestampDiv = document.createElement("div");
    timestampDiv.classList.add("timestamp");
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    timestampDiv.textContent = timestamp;

    const contentDiv = document.createElement("div");
    contentDiv.classList.add("content");

    if (sender === "bot") {
      const parsedMarkdown = marked.parse(message);
      const sanitizedHTML = DOMPurify.sanitize(parsedMarkdown);
      contentDiv.innerHTML = sanitizedHTML;
      contentDiv.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
      });
    } else {
      contentDiv.textContent = message;
    }

    messageDiv.appendChild(timestampDiv);
    messageDiv.appendChild(contentDiv);

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function loadChatList() {
    chatList.innerHTML = "";

    chatSessions.forEach((session, index) => {
      const listItem = document.createElement("li");
      listItem.classList.toggle("active", index === currentChatIndex);

      const titleSpan = document.createElement("span");
      titleSpan.textContent = session.title || `Chat ${index + 1}`;
      titleSpan.addEventListener("click", () => {
        saveCurrentChat();
        loadChatSession(index);
      });
      titleSpan.classList.add("chat-title");

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "×";
      deleteBtn.classList.add("delete-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteChatSession(index);
      });

      listItem.appendChild(titleSpan);
      listItem.appendChild(deleteBtn);

      chatList.appendChild(listItem);
    });
  }

  function saveCurrentChat() {
    const title = generateChatTitle(conversationHistory);

    if (currentChatIndex !== null) {
      chatSessions[currentChatIndex].history = conversationHistory;
      chatSessions[currentChatIndex].title = title;
    } else {
      chatSessions.push({
        id: Date.now(),
        title: title,
        history: conversationHistory,
      });
      currentChatIndex = chatSessions.length - 1;
    }

    sessionStorage.setItem("chatSessions", JSON.stringify(chatSessions));
    loadChatList();
  }

  function loadChatSession(index) {
    const session = chatSessions[index];
    conversationHistory = session.history.slice();
    currentChatIndex = index;
    messagesDiv.innerHTML = "";

    conversationHistory.forEach((message) => {
      appendMessage(message.role === "user" ? "user" : "bot", message.content);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function generateChatTitle(history) {
    const firstUserMessage = history.find((msg) => msg.role === "user");
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 20) + "...";
    } else {
      return "New Chat";
    }
  }

  function deleteChatSession(index) {
    const updatedChatSessions = chatSessions.splice(index, 1);
    sessionStorage.setItem("chatSessions", JSON.stringify(updatedChatSessions));

    if (currentChatIndex === index) {
      currentChatIndex = null;
      conversationHistory = [];
      messagesDiv.innerHTML = "";
      userInput.value = "";
    } else if (currentChatIndex > index) {
      currentChatIndex--;
    }

    loadChatList();
  }
});
