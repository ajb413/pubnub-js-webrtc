const chatInterface = document.getElementById('chat-interface');
const myVideoSample = document.getElementById('my-video-sample');
const myVideo = document.getElementById('my-video');
const remoteVideo = document.getElementById('remote-video');
const videoModal = document.getElementById('video-modal');
const closeVideoButton = document.getElementById('close-video');

const brokenMyVideo = document.getElementById('broken-my-video');
const brokenSampleVideo = document.getElementById('broken-sample-video');

const usernameModal = document.getElementById('username-input-modal');
const usernameInput = document.getElementById('username-input');
const joinButton = document.getElementById('join-button');

const callConfirmModal = document.getElementById('call-confirm-modal');
const callConfirmUsername = document.getElementById('call-confirm-username');
const yesCallButton = document.getElementById('yes-call');
const noCallButton = document.getElementById('no-call');

const incomingCallModal = document.getElementById('incoming-call-modal');
const callFromSpan = document.getElementById('call-from');
const acceptCallButton = document.getElementById('accept-call');
const rejectCallButton = document.getElementById('reject-call');

const onlineList = document.getElementById('online-list');
const chat = document.getElementById('chat');
const log = document.getElementById('log');
const messageInput = document.getElementById('message-input');
const submit = document.getElementById('submit');
const hide = 'hide';

// PubNub Channel for sending/receiving global chat messages
//     also used for user presence with PubNub Presence
const globalChannel = 'global-channel';
let webRtcPhone;
let pubnub;

// An RTCConfiguration dictionary from the browser WebRTC API
// Add STUN and TURN server information here for WebRTC calling
const rtcConfig = {};

let username; // User's name in the app
let myAudioVideoStream; // Local audio and video stream
let noVideoTimeout; // Used for checking if a video connection succeeded

// Xirsys API Info, not required for WebRTC, but it helps
// Xirsys Network access tokens are issued via this PubNub Function
const turnApiUrl = 'https://pubsub.pubnub.com/v1/blocks/sub-key/sub-c-7c977f32-a1b3-11e8-bc5d-ae80c5ea0c92/turn-credentials';
let turnToken;
request(turnApiUrl, 'GET').then((response) => { turnToken = response });

// Init the audio and video stream on this client
getLocalStream().then((localMediaStream) => {
    myAudioVideoStream = localMediaStream;
    myVideoSample.srcObject = myAudioVideoStream;
    myVideo.srcObject = myAudioVideoStream;
}).catch(() => {
    myVideo.classList.add(hide);
    myVideoSample.classList.add(hide);
    brokenMyVideo.classList.remove(hide);
    brokenSampleVideo.classList.remove(hide);
});

// Prompt the user for a username input
getLocalUserName().then((myUsername) => {
    username = myUsername;
    usernameModal.classList.add(hide);
    initWebRtcApp();
});

// Send a chat message when Enter key is pressed
messageInput.addEventListener('keydown', (event) => {
    if (event.keyCode === 13 && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
        return;
    }
});

// Send a chat message when the submit button is clicked
submit.addEventListener('click', sendMessage);

// Register a disconnect event handler when the close video button is clicked
closeVideoButton.addEventListener('click', (event) => {
    videoModal.classList.add(hide);
    chatInterface.classList.remove(hide);
    clearTimeout(noVideoTimeout);
    webRtcPhone.disconnect(); // disconnects the current phone call
});

const initWebRtcApp = () => {
    // WebRTC phone object event for when the remote peer's video becomes available.
    const onPeerStream = (webRTCTrackEvent) => {
        console.log('Peer audio/video stream now available');
        const peerStream = webRTCTrackEvent.streams[0];
        window.peerStream = peerStream;
        remoteVideo.srcObject = peerStream;
    };

    // WebRTC phone object event for when a remote peer attempts to call you.
    const onIncomingCall = (fromUuid, callResponseCallback) => {
        let username = document.getElementById(fromUuid).children[1].innerText;
        incomingCall(username).then((acceptedCall) => {
            if (acceptedCall) {
                // End an already open call before opening a new one
                webRtcPhone.disconnect();
                videoModal.classList.remove(hide);
                chatInterface.classList.add(hide);
                noVideoTimeout = setTimeout(noVideo, 5000);
            }

            callResponseCallback({ acceptedCall });
        });
    };

    // WebRTC phone object event for when the remote peer responds to your call request.
    const onCallResponse = (acceptedCall) => {
        console.log('Call response: ', acceptedCall ? 'accepted' : 'rejected');
        if (acceptedCall) {
            videoModal.classList.remove(hide);
            chatInterface.classList.add(hide);
            noVideoTimeout = setTimeout(noVideo, 5000);
        }
    };

    // WebRTC phone object event for when a call disconnects or timeouts.
    const onDisconnect = () => {
        console.log('Call disconnected');
        videoModal.classList.add(hide);
        chatInterface.classList.remove(hide);
        clearTimeout(noVideoTimeout);
    };

    // Lists the online users in the UI and registers a call method to the click event
    //     When a user clicks a peer's name in the online list, the app calls that user.
    const addToOnlineUserList = (occupant) => {
        const userId = occupant.uuid;
        const name = occupant.state ? occupant.state.name : null;

        if (!name) return;

        const userListDomElement = createUserListItem(userId, name);

        const alreadyInList = document.getElementById(userId);
        const isMe = pubnub.getUUID() === userId;

        if (alreadyInList) {
            removeFromOnlineUserList(occupant.uuid);
        } 

        if (isMe) {
            return;
        }

        onlineList.appendChild(userListDomElement);

        userListDomElement.addEventListener('click', (event) => {
            const userToCall = userId;

            confirmCall(name).then((yesDoCall) => {
                if (yesDoCall) {
                    // Get new TURN server credentials from Xirsys
                    // Not Required but it is more reliable than peer-to-peer
                    request(turnApiUrl, 'PUT', {
                        'headers': { 'tok': turnToken }
                    }).then((response) => {
                        rtcConfig.iceServers = [response];
                        webRtcPhone.callUser(userToCall, {
                            myStream: myAudioVideoStream
                        });
                    });
                }
            });
        });
    }

    const removeFromOnlineUserList = (uuid) => {
        const div = document.getElementById(uuid);
        if (div) div.remove();
    };

    pubnub = new PubNub({
        publishKey : 'pub-c-f2238dd7-3f40-4ab9-909d-7a0930ef5dab',
        subscribeKey : 'sub-c-6bd35c4a-808c-11e8-b3dc-56529179b978'
    });

    pubnub.addListener({
        message: function(event) {
            // Render a global chat message in the UI
            if (event.channel === globalChannel) {
                renderMessage(event);
            }
        },
        status: function(statusEvent) {
            if (statusEvent.category === "PNConnectedCategory") {
                pubnub.setState({
                    state: {
                        name: username
                    },
                    channels: [globalChannel],
                    uuid: pubnub.getUUID()
                });

                pubnub.hereNow({
                    channels: [globalChannel],
                    includeUUIDs: true,
                    includeState: true
                },
                (status, response) => {
                    response.channels[globalChannel].occupants
                        .forEach(addToOnlineUserList);
                });
            }
        },
        presence: (status, response) => {
            if (status.error) {
                console.error(status.error);
            } else if (status.channel === globalChannel) {
                if (status.action === "join") {
                    addToOnlineUserList(status, response);
                } else if (status.action === "state-change") {
                    addToOnlineUserList(status, response);
                } else if (status.action === "leave") {
                    removeFromOnlineUserList(status.uuid);
                } else if (status.action === "timeout") {
                    removeFromOnlineUserList(response.uuid);
                }
            }
        }
    });

    pubnub.subscribe({
        channels: [globalChannel],
        withPresence: true
    });

    window.ismyuuid = pubnub.getUUID();

    // Disconnect PubNub before a user navigates away from the page
    window.onbeforeunload = (event) => {
        pubnub.unsubscribe({
            channels: [globalChannel]
        });
    };

    // WebRTC phone object configuration.
    let config = {
        rtcConfig,
        ignoreNonTurn: false,
        myStream: myAudioVideoStream,
        onPeerStream,   // is required
        onIncomingCall, // is required
        onCallResponse, // is required
        onDisconnect,   // is required
        pubnub          // is required
    };

    webRtcPhone = new WebRtcPhone(config);
};

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// UI Render Functions
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
function renderMessage(message) {
    const messageDomNode = createMessageHTML(message);

    log.append(messageDomNode);

    // Sort messages in chat log based on their timetoken (value of DOM id)
    sortNodeChildren(log, 'id');

    chat.scrollTop = chat.scrollHeight;
}

function incomingCall(name) {
    return new Promise((resolve) => {
        acceptCallButton.onclick = function() {
            incomingCallModal.classList.add(hide);
            resolve(true);
        }

        rejectCallButton.onclick = function() {
            incomingCallModal.classList.add(hide);
            resolve(false);
        }

        callFromSpan.innerHTML = name;
        incomingCallModal.classList.remove(hide);
    });
}

function confirmCall(name) {
    return new Promise((resolve) => {
        yesCallButton.onclick = function() {
            callConfirmModal.classList.add(hide);
            resolve(true);
        }

        noCallButton.onclick = function() {
            callConfirmModal.classList.add(hide);
            resolve(false);
        }

        callConfirmUsername.innerHTML = name;
        callConfirmModal.classList.remove(hide);
    });
}

function getLocalUserName() {
    return new Promise((resolve) => {
        usernameInput.focus();
        usernameInput.value = '';

        usernameInput.addEventListener('keyup', (event) => {
            const nameLength = usernameInput.value.length;

            if (nameLength > 0) {
                joinButton.classList.remove('disabled');
            } else {
                joinButton.classList.add('disabled');
            }

            if (event.keyCode === 13 && nameLength > 0) {
                resolve(usernameInput.value);
            }
        });

        joinButton.addEventListener('click', (event) => {
            const nameLength = usernameInput.value.length;
            if (nameLength > 0) {
                resolve(usernameInput.value);
            }
        });
    });
}

function getLocalStream() {
    return new Promise((resolve, reject) => {
        navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true
        })
        .then((avStream) => {
            resolve(avStream);
        })
        .catch((err) => {
            alert('Cannot access local camera or microphone.');
            console.error(err);
            reject();
        });
    });
}

function createUserListItem(userId, name) {
    const div = document.createElement('div');
    div.id = userId;

    const img = document.createElement('img');
    img.src = './phone.png';

    const span = document.createElement('span');
    span.innerHTML = name;

    div.appendChild(img);
    div.appendChild(span);

    return div;
}

function createMessageHTML(messageEvent) {
    const text = messageEvent.message.text;
    const jsTime = parseInt(messageEvent.timetoken.substring(0,13));
    const dateString = new Date(jsTime).toLocaleString();
    const senderUuid = messageEvent.publisher;
    const senderName = senderUuid === pubnub.getUUID()
        ? username
        : document.getElementById(senderUuid).children[1].innerText;

    const div = document.createElement('div');
    const b = document.createElement('b');

    div.id = messageEvent.timetoken;
    b.innerHTML = `${senderName} (${dateString}): `;

    div.appendChild(b);
    div.innerHTML += text;

    return div;
}


// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Utility Functions
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
function sendMessage() {
    const messageToSend = messageInput.value.replace(/\r?\n|\r/g, '');
    const trimmed = messageToSend.replace(/(\s)/g, '');

    if (trimmed.length > 0) {
        pubnub.publish({
            channel: globalChannel,
            message: {
                text: messageToSend
            }
        });
    }

    messageInput.value = '';
}

// Sorts sibling HTML elements based on an attribute value
function sortNodeChildren(parent, attribute) {
    const length = parent.children.length;
    for (let i = 0; i < length-1; i++) {
        if (parent.children[i+1][attribute] < parent.children[i][attribute]) {
            parent.children[i+1].parentNode
                .insertBefore(parent.children[i+1], parent.children[i]);
            i = -1;
        }
    }
}

function noVideo() {
    const message = 'No peer connection made.\n' +
        'Try adding a TURN server to the WebRTC configuration.';

    if (remoteVideo.paused) {
        alert(message);
    }
}

/**
 * Helper function to make an HTTP request wrapped in an ES6 Promise.
 *
 * @param {String} url URL of the resource that is being requested.
 * @param {String} method POST, GET, PUT, etc.
 * @param {Object} options JSON Object with HTTP request options, "header"
 *     Object of possible headers to set, and a body Object of a request body.
 *
 * @return {Promise} Resolves a parsed JSON Object or String response text if
 *     the response code is in the 200 range. Rejects with response status text
 *     when the response code is outside of the 200 range.
 */
function request(url, method, options) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let contentTypeIsSet = false;
        options = options || {};
        xhr.open(method, url);

        for (let header in options.headers) {
            if ({}.hasOwnProperty.call(options.headers, header)) {
                header = header.toLowerCase();
                contentTypeIsSet = header === 'content-type' ? true : contentTypeIsSet;
                xhr.setRequestHeader(header, options.headers[header]);
            }
        }

        if (!contentTypeIsSet) {
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        }

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                let response;
                try {
                    response = JSON.parse(xhr.response);
                } catch (e) {
                    response = xhr.response;
                }
                resolve(response);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText,
                });
            }
        };

        xhr.send(JSON.stringify(options.body));
    });
}
