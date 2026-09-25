let myPeerId = null;
let peer = null;
let currentCall = null;
let activeConnection = null;
let localStream = null;

// रैंडम 6 अंकों की आईडी जनरेट करने का फंक्शन
function generateRandomId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// PeerJS इनिशियलाइज़ करना
const customId = generateRandomId();
peer = new Peer(customId);

peer.on('open', (id) => {
  myPeerId = id;
  document.getElementById('my-peer-id').innerText = id;
});

// आईडी कॉपी करने का फंक्शन
function copyId() {
  if (!myPeerId) return;
  navigator.clipboard.writeText(myPeerId).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.innerText = "कॉपी हुआ!";
    setTimeout(() => btn.innerText = "कॉपी करें", 2000);
  });
}

// माइक परमिशन लेना
async function getMicrophone() {
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      alert("माइक की अनुमति (Permission) नहीं मिली!");
      throw err;
    }
  }
  return localStream;
}

// 1. चैट कनेक्शन सेटअप
function setupConnectionEvents(conn) {
  activeConnection = conn;

  conn.on('open', () => {
    addMessage("कस्टमर/यूज़र चैट से जुड़ गया!", "system");
  });

  conn.on('data', (data) => {
    addMessage(data, "received");
  });

  conn.on('close', () => {
    addMessage("यूज़र डिस्कनेक्ट हो गया।", "system");
    activeConnection = null;
  });
}

// चैट के लिए कनेक्ट करना
function connectChat() {
  const targetId = document.getElementById('target-peer-id').value.trim();
  if (!targetId) return alert("आईडी डालें!");
  if (targetId === myPeerId) return alert("आप अपनी आईडी से कनेक्ट नहीं हो सकते!");

  const conn = peer.connect(targetId);
  setupConnectionEvents(conn);
}

// सामने से चैट कनेक्शन आना
peer.on('connection', (conn) => {
  setupConnectionEvents(conn);
});

// चैट मैसेज भेजना
function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  if (activeConnection && activeConnection.open) {
    activeConnection.send(text);
    addMessage(text, "sent");
    input.value = "";
  } else {
    alert("पहले सामने वाले की आईडी से कनेक्ट करें!");
  }
}

function handleKeyPress(e) {
  if (e.key === 'Enter') sendMessage();
}

function addMessage(text, type) {
  const chatMessages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.innerText = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 2. वॉइस कॉल सेटअप
async function makeCall() {
  const targetId = document.getElementById('target-peer-id').value.trim();
  if (!targetId) return alert("कॉल करने के लिए आईडी डालें!");
  if (targetId === myPeerId) return alert("खुद को कॉल नहीं कर सकते!");

  showStatusArea("कॉल लग रही है...");

  try {
    const stream = await getMicrophone();
    const call = peer.call(targetId, stream);
    handleCall(call);

    // ऑटो चैट कनेक्शन भी साथ में बना लें
    if (!activeConnection) {
      const conn = peer.connect(targetId);
      setupConnectionEvents(conn);
    }
  } catch (e) {
    console.error(e);
  }
}

// आने वाली कॉल हैंडल करना
let incomingCallInstance = null;
peer.on('call', async (call) => {
  incomingCallInstance = call;
  document.getElementById('call-status-area').classList.remove('hidden');
  document.getElementById('call-status-text').classList.add('hidden');
  document.getElementById('caller-id-span').innerText = call.peer;
  document.getElementById('incoming-modal').classList.remove('hidden');
});

async function acceptCall() {
  if (!incomingCallInstance) return;
  document.getElementById('incoming-modal').classList.add('hidden');
  showStatusArea("कॉल चालू है...");
  
  const stream = await getMicrophone();
  incomingCallInstance.answer(stream);
  handleCall(incomingCallInstance);
}

function rejectCall() {
  if (incomingCallInstance) {
    incomingCallInstance.close();
  }
  resetCallUI();
}

function handleCall(call) {
  currentCall = call;
  document.getElementById('end-call-btn').classList.remove('hidden');

  call.on('stream', (remoteStream) => {
    const audioEl = document.getElementById('remote-audio');
    audioEl.srcObject = remoteStream;
    showStatusArea("कॉल कनेक्ट हो गई है (बात करें)");
  });

  call.on('close', () => {
    endCall();
  });

  call.on('error', () => {
    endCall();
  });
}

function endCall() {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  resetCallUI();
}

function showStatusArea(text) {
  const area = document.getElementById('call-status-area');
  const textEl = document.getElementById('call-status-text');
  area.classList.remove('hidden');
  textEl.classList.remove('hidden');
  textEl.innerText = text;
}

function resetCallUI() {
  document.getElementById('call-status-area').classList.add('hidden');
  document.getElementById('incoming-modal').classList.add('hidden');
  document.getElementById('end-call-btn').classList.add('hidden');
}
