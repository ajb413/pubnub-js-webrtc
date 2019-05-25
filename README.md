# JavaScript WebRTC Video Chat Package with PubNub

Adds the ability to do 1-to-1 WebRTC audio/video calls with [PubNub](https://www.pubnub.com/?devrel_gh=pubnub-js-webrtc). The PubNub key set must have PubNub Presence enabled. The example folder app uses Xirsys to get TURN server access via a PubNub Function.

[![WebRTC with PubNub Chat in JavaScript Screenshot](https://i.imgur.com/X0YULf5.png)](https://adambavosa.com/pubnub-js-webrtc/example/)

For education on WebRTC, and also a how-to for making your own app with this repository see these blog posts:
- Part 1 [Integrating Video Calling In Chat With WebRTC And PubNub](https://www.pubnub.com/blog/integrating-video-calling-in-chat-with-webrtc-and-pubnub/)
- Part 2 [Implement Video Chat With Xirsys, WebRTC, And PubNub](https://www.pubnub.com/blog/xirsys-webrtc-and-pubnub-video-chat/)

## Initialization of the WebRTC Phone
```js
let pubnub = new PubNub({
    publishKey: 'your-publish-api-key-here',
    subscribeKey: 'your-subscribe-api-key-here'
});

// set up all event handlers ...

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
```

## Items that are provided to the `WebRtcPhone` constructor via the `config` object
```js
// Standard WebRTC constructor config parameter (this data is for example purposes and will not work)
let rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.example.com",
            username: "adamb@pubnub.com", 
            credential: "webrtcdemo"
        }, {
            urls: ["stun:stun.example.com", "stun:stun-1.example.com"]
        }
    ]
};

// WebRTC phone object event for when the remote peer's video becomes available.
const onPeerStream = (webRTCTrackEvent) => {
    console.log('Peer audio/video stream now available');
    const peerStream = webRTCTrackEvent.streams[0];
    window.peerStream = peerStream;
    remoteVideo.srcObject = peerStream; // HTML <video> element
};

// WebRTC phone object event for when a remote peer attempts to call you.
const onIncomingCall = (fromUuid, callResponseCallback) => {
    let username = 'Bob';
    incomingCall(username).then((acceptedCall) => {
        if (acceptedCall) {
            // End an already open call before opening a new one
            webRtcPhone.disconnect();
            // Update your UI for showing peer video feed
        }

        callResponseCallback({ acceptedCall });
    });
};

// WebRTC phone object event for when the remote peer responds to your call request.
const onCallResponse = (acceptedCall) => {
    console.log('Call response: ', acceptedCall ? 'accepted' : 'rejected');
    if (acceptedCall) {
        // Update your UI for showing peer video feed
    }
};

// WebRTC phone object event for when a call disconnects or timeouts.
const onDisconnect = () => {
    console.log('Call disconnected');
    // Update your UI for hiding peer video feed
};
```

## Send a call request to another user
```js
webRtcPhone.callUser("Alice", {
    myStream: myAudioVideoStream // Get this stream with `navigator.mediaDevices.getUserMedia()`
});
```

## Frequently Asked Questions (FAQ) about the PubNub JS WebRTC Package

### What is WebRTC?
WebRTC is a free and open source project that enables web browsers and mobile devices to provide a simple real-time communication API. Please read this [PubNub blog](https://www.pubnub.com/blog/?devrel_gh=pubnub-js-webrtc) to learn more about WebRTC and how to implement the code in this repository.

### What is PubNub? Why is PubNub relevant to WebRTC?
[PubNub](https://www.pubnub.com/?devrel_gh=pubnub-js-webrtc) is a global Data Stream Network (DSN) and realtime network-as-a-service. PubNub's primary product is a realtime publish/subscribe messaging API built on a global data stream network which is made up of a replicated network with multiple points of presence around the world.

PubNub is a low cost, easy to use, infrastructure API that can be implemented rapidly as a WebRTC signaling service. The signaling service is responsible for delivering messages to WebRTC peer clients. See the next question for the specific signals that PubNub's publish/subscribe API handles.

### Does PubNub stream audio or video data?
No. PubNub pairs very well with WebRTC as a signaling service. This means that PubNub signals events from client to client using the Pub/Sub messaging over TCP. These events include:
- I, User A, would like to call you, User B
- User A is currently trying to call you, User B
- I, User B, accept your call User A
- I, User B, reject your call User A
- I, User B, would like to end our call User A
- I, User A, would like to end our call User B
- Text instant messaging like in Slack, Google Hangouts, Skype, Facebook Messenger, etc.

### Is this package officially part of PubNub?
No. It is an open source project that is community supported. If you want to report a bug, do so on the [GitHub Issues page](https://github.com/ajb413/pubnub-js-webrtc/issues).

### Can I make a group call with more than 2 participants?
Group calling is possible to develop with WebRTC and PubNub, however, the current PubNub WebRTC package can connect only 2 users in a private call. The community may develop this feature in the future but there are no plans for development to date.

### I found a bug in the package. Where do I report it?
The PubNub WebRTC package is an [open source](https://github.com/ajb413/pubnub-js-webrtc/blob/master/LICENSE), community supported project. This means that the best place to report bugs is on the [GitHub Issues page](https://github.com/ajb413/pubnub-js-webrtc/issues) in for the code repository. The community will tackle the bug fix at will, so there is no guarantee that a fix will be made. If you wish to provide a code fix, fork the GitHub repository to your GitHub account, push fixes, and make a pull request ([process documented on GitHub](https://help.github.com/articles/creating-a-pull-request-from-a-fork/)).
