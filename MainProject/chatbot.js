
function addMessage(text, sender) {
  const chat = document.getElementById("chat-container");
  const bubble = document.createElement("div");
  bubble.className = `message ${sender}-msg`;
  bubble.textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById("user-input");
  const msg = input.value.trim();
  if (!msg) return;

  addMessage(msg, "user");
  input.value = "";

  fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg })
  })
  .then(r => r.json())
  .then(data => addMessage(data.reply, "bot"))
  .catch(err => {
      console.error(err);
      addMessage("Sorry — something went wrong on my side.", "bot");
  });
}

document.getElementById("user-input").addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});
