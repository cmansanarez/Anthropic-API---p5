/*
 * CHAT WITH CLAUDE - A p5.js + AI Application (Hybrid HTML/Canvas)
 * This sketch creates a chat interface using HTML/CSS with p5.js for effects
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// Where to send our messages (our server acts as a middleman to Claude)
const API_URL = "http://localhost:3000/api/chat";

// =============================================================================
// GLOBAL VARIABLES
// =============================================================================

let conversationHistory = []; // Array storing all messages back and forth
let isLoading = false;       // Are we waiting for Claude to respond?

// HTML element references
let chatHistory;
let userInput;
let sendButton;

// =============================================================================
// SETUP - Runs once when the program starts
// =============================================================================

function setup() {
  // Create canvas for background effects (sits behind HTML via CSS)
  createCanvas(windowWidth, windowHeight);
  
  // Get references to HTML elements
  chatHistory = document.getElementById('chat-history');
  userInput = document.getElementById('user-input');
  sendButton = document.getElementById('send-button');
  
  // Add event listeners
  sendButton.addEventListener('click', sendMessage);
  
  // Allow Enter key to send message
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

// =============================================================================
// DRAW - Runs 60 times per second, for background effects
// =============================================================================

function draw() {
  // Semi-transparent oscillating overlay - lets background image show through
  let gray = map(sin(frameCount * 0.02), -1, 1, 30, 60);
  background(gray, gray, gray, 5); // The 20 is the alpha (transparency: 0-255)
  
  // You can add more visual effects here later!
  // Ideas: particles, grid lines, glitch effects, etc.
}

// =============================================================================
// DISPLAY MESSAGES IN THE CHAT
// =============================================================================

function displayMessage(role, content) {
  // Create a new message div
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', role);
  
  // Add label and content
  const label = role === 'user' ? 'You' : 'The Pixel Mosher';
  messageDiv.innerHTML = `<strong>${label}:</strong> ${content}`;
  
  // Add to chat history
  chatHistory.appendChild(messageDiv);
  
  // Auto-scroll to bottom
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showLoading(show) {
  // Remove existing loading indicator if present
  const existingLoading = document.querySelector('.loading');
  if (existingLoading) {
    existingLoading.remove();
  }
  
  if (show) {
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('loading');
    loadingDiv.textContent = 'The Pixel Mosher is typing...';
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

// =============================================================================
// SENDING MESSAGES TO CLAUDE
// =============================================================================

async function sendMessage() {
  // Don't send if we're already waiting or if input is empty
  if (isLoading || userInput.value.trim() === "") {
    return;
  }

  // Get the user's message and clear the input box
  let userMessage = userInput.value.trim();
  userInput.value = "";

  // Display user's message
  displayMessage('user', userMessage);

  // Add user's message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage
  });

  // Show loading indicator
  isLoading = true;
  showLoading(true);

  try {
    // Send request to our server (which talks to Claude)
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",  // Which AI model to use
        max_tokens: 1024,                      // Maximum length of response
        messages: conversationHistory          // All previous messages
      })
    });

    // Check if request was successful
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // Read the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Add placeholder for assistant's response
    conversationHistory.push({
      role: "assistant",
      content: ""
    });

    // Hide loading indicator
    isLoading = false;
    showLoading(false);

    // Create message div for streaming response
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'assistant');
    messageDiv.innerHTML = '<strong>The Pixel Mosher:</strong> ';
    const contentSpan = document.createElement('span');
    messageDiv.appendChild(contentSpan);
    chatHistory.appendChild(messageDiv);

    // Get reference to the assistant's message we're building
    const assistantMessage = conversationHistory[conversationHistory.length - 1];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            // Handle content_block_delta events
            if (event.type === 'content_block_delta' && event.delta?.text) {
              assistantMessage.content += event.delta.text;
              contentSpan.textContent = assistantMessage.content;
              
              // Auto-scroll as content streams in
              chatHistory.scrollTop = chatHistory.scrollHeight;
            }

          } catch (e) {
            // Skip unparseable lines
          }
        }
      }
    }

  } catch (error) {
    // If something goes wrong, show error message
    console.error("Error calling Anthropic API:", error);

    // Add error message to conversation
    conversationHistory.push({
      role: "assistant",
      content: "Error: " + error.message
    });

    // Display error
    displayMessage('assistant', "Error: " + error.message);

    // Hide loading indicator
    isLoading = false;
    showLoading(false);
  }
}

// =============================================================================
// WINDOW RESIZE - Keep canvas fullscreen
// =============================================================================

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
