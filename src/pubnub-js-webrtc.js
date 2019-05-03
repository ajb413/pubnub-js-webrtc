/**
 * @file Wrapper for the PubNub JS SDK that simplifies WebRTC video and audio
 *     calling.
 * @author Adam Bavosa <@ajb413>
 */

import {
    newUuid,
    isValidConstructorConfig
} from './helpers/util.js';

const peerIceCandidateEvent = ['$' + 'webRTC', 'peerIceCandidate'].join('.');
const incomingCallEvent = ['$' + 'webRTC', 'incomingCall'].join('.');
const callResponseEvent = ['$' + 'webRTC', 'callResponse'].join('.');

/*
 * @class
 * @classdesc WebRtcPhone uses PubNub to make WebRTC audio and or video calls.
 *     It must be initialized with 4 event handlers and a PubNub JS SDK 
 *     instance. It works with 1 to 1 calls over STUN or TURN. It
 *     provides 2 public methods. One for calling a user, and one for 
 *     disconnecting from a call.
 */
class WebRtcPhone {
    /*
     * The `constructor` is a method called when initializing an instance of 
     *     the class. A `config` object must be provided to the constructor. 
     *     The parameters documented for the constructor are members of the 
     *     `config` object.
     *
     * @param {object} config
     * @param {object} [pubnub] Instance object of the PubNub JavaScript SDK.
     *     PubNub pub/sub API handles all "signaling" for WebRTC calls.
     * @param {function} [onIncomingCall] Function passed from the parent that
     *     executes when an `incomingCallEvent` event fires for an incoming
     *     WebRTC call. If a handler is not passed in the `config`, the object 
     *     initialization will fail.
     * @param {function} [onCallResponse] Function passed from the parent that
     *     executes when a `callResponseEvent` event fires. This is when the 
     *     peer replies to a call request. If a handler is  not passed in the 
     *     `config`, the object initialization will fail.
     * @param {function} [onPeerStream] Function passed from the parent that
     *     executes when the peer's stream object becomes available. If a
     *     handler is not passed in the `config`, the object initialization 
     *     will fail.
     * @param {function} [onDisconnect] Function passed from the parent that
     *     executes when a user in the call disconnects. If a handler is not
     *     passed in the `config`, the object initialization will fail.
     * @param {object=} [myStream] A browser `MediaStream` object of the local
     *     client audio and/or video.
     * @param {object=} [rtcConfig] An `RTCConfiguration` dictionary that is 
     *     usedto initialize the `RTCPeerConnection`. This is where STUN and 
     *     TURN server information should be provided.
     * @param {boolean} [ignoreNonTurn] If true, this will force the ICE
     *     candidate registration to ignore all candidates that are not TURN 
     *     servers.
     *
     * @returns {object} Returns an instance of the `WebRtcPhone` class.
     */
    constructor(config) {
        if (!isValidConstructorConfig(config)) return;

        this.pubnub = config.pubnub;
        this.onIncomingCall = config.onIncomingCall;
        this.onCallResponse = config.onCallResponse;
        this.onPeerStream = config.onPeerStream;
        this.onDisconnect = config.onDisconnect;
        this.myStream = config.myStream;
        this.rtcConfig = config.rtcConfig;
        this.ignoreNonTurn = config.ignoreNonTurn;
        const myUuid = this.pubnub.getUUID();

        // PubNub Subscribe event handler for:
        //     incoming call requests
        //     call responses
        //     receiving new peer ICE candidates
        this.pubnub.addListener({
            message: (event) => {
                const channel = event.channel;
                const isIncomingCall = channel.includes(incomingCallEvent);
                const isCallResponse = channel.includes(callResponseEvent);
                const isPeerIceCandidate = channel.includes(peerIceCandidateEvent);

                const isForMe = channel.includes(myUuid);

                if (isIncomingCall && isForMe) {
                    incomingCall.call(this, event.message);
                } else if (isCallResponse && isForMe) {
                    callResponse.call(this, event.message);
                } else if (isPeerIceCandidate && isForMe) {
                    peerIceCandidate.call(this, event.message);
                }
            }
        });

        const incomingCallChannel = [incomingCallEvent, myUuid].join('.');
        const callResponseChannel = [callResponseEvent, myUuid].join('.');
        const peerIceCandidateChannel = [peerIceCandidateEvent, myUuid].join('.');

        // Subscribe to these channels to listen for events directed to me
        this.pubnub.subscribe({
            channels: [
                incomingCallChannel,
                callResponseChannel,
                peerIceCandidateChannel
            ]
        });

    }

    /*
     * Initialize a WebRTC call with another user in the app that is online.
     *     This is called from the parent.
     *
     * @param {string} userUuid PubNub UUID of the user in which this client is 
     *     attempting to call.
     * @param {object} object
     * @param {function} object.onPeerStream Event handler for when a peer's
     *     stream becomes available. This will overwrite a handler that was
     *     passed during initialization.
     * @param {object} object.myStream A browser `MediaStream` object of the
     *     local client audio and/or video. This will overwrite a stream that
     *     was passed during initialization.
     * @param {object} object.offerOptions An `RTCOfferOptions` dictionary that
     *     specifies audio and/or video for the peer connection offer.
     * @param {object} object.rtcConfig An `RTCConfiguration` dictionary that is
     *     used to initialize the `RTCPeerConnection`. This will overwrite an
     *     `rtcConfig` that was passed during initialization.
     *
     * @returns {void}
     */
    callUser(userUuid, { onPeerStream, myStream, offerOptions, rtcConfig }) {
        const myUuid = this.pubnub.getUUID();
        rtcConfig = this.rtcConfig = rtcConfig || this.rtcConfig;
        myStream = this.myStream = myStream || this.myStream;
        onPeerStream = this.onPeerStream = onPeerStream || this.onPeerStream;
        offerOptions = offerOptions || {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
        };
        const peerConnection = this.peerConnection
            = new RTCPeerConnection();
        const callId = this.callId = newUuid(); // Call ID
        let localDescription; // WebRTC local description
        peerConnection.ontrack = onPeerStream;
        myStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, myStream);
        });
        peerConnection.iceCache = [];

        peerConnection.oniceconnectionstatechange = () => {
            if (peerConnection.iceConnectionState === 'disconnected') {
                this.disconnect();
            }
        };

        // When ICE candidates become available, send them to the peer client.
        peerConnection.onicecandidate = (iceEvent) => {
            if (!iceEvent.candidate) {
                return;
            }
            onIceCandidate(iceEvent, userUuid, peerConnection, callId, this.pubnub);
        };

        peerConnection.onnegotiationneeded = () => {
            peerConnection.createOffer(offerOptions)
            .then((description) => {
                localDescription = localDescription || description;
                console.log(localDescription.sdp)
                return peerConnection.setLocalDescription(localDescription);
            }).then(() => {
                const channel = [incomingCallEvent, userUuid].join('.');
                this.pubnub.publish({
                    channel,
                    message: {
                        callId,
                        sender: myUuid,
                        rtcConfig,
                        remoteDescription: localDescription
                    }
                });
            }).catch((error) => {
                const functionName = 'callUser';
                const message = `WebRTC [${functionName}] error.`;
                console.error(message, error);
            });
        };
    }

    /*
     * Gracefully closes a currently open WebRTC call. This is called from the 
     *     parent.
     *
     * @returns {void}
     */
    disconnect() {
        if (this.peerConnection) {
            this.peerConnection.close();
            delete this.peerConnection;
        }

        this.callInSession = false;
        this.onDisconnect();
    }
}

/*
 * This event fires when the call peer has indicated whether they will accept or
 *     reject an incoming call. The trigger is an arriving PubNub message in
 *     the WebRtcPhone class.
 *
 * @param {object} object.
 * @param {string} sender PubNub UUID of the user that sent the message.
 * @param {string} callId UUID of the call.
 * @param {boolean} acceptedCall Indicates the user's acceptance or rejection 
 *     of the proposed call.
 * @param {string} remoteDescription The local description of the sender for 
 *     the WebRTC call.
 *
 * @returns {void}
 */
function callResponse({ sender, callId, acceptedCall, remoteDescription }) {
    if (acceptedCall) {
        this.peerConnection.acceptedCall = true;
        this.callInSession = true;

        this.peerConnection.setRemoteDescription(remoteDescription)
            .then(() => {
                sendIceCandidates(sender, this.peerConnection, callId, this.pubnub);
            })
            .catch((error) => {
                const functionName = 'callResponse';
                const message = `WebRTC [${functionName}] error.`;
                console.error(message, error);
            });
    }

    this.onCallResponse(acceptedCall);
}

/*
 * This event fires when a call peer has attempted to initiate a call. The
 *      trigger is a PubNub message event in the WebRtcPhone class.
 *
 * @param {object} object.
 * @param {string} sender PubNub UUID of the user that sent the message.
 * @param {string} callId UUID of the call.
 * @param {Object} rtcConfig An `RTCConfiguration` dictionary that is 
 *     used to initialize the `RTCPeerConnection`. This is where STUN and 
 *     TURN server information should be provided.
 * @param {string} remoteDescription The local description of the sender for 
 *     the WebRTC call.
 *
 * @returns {void}
 */
function incomingCall({ sender, callId, rtcConfig, remoteDescription }) {
    // Is executed after this client accepts or rejects an incoming call, which
    // is typically done in their UI.
    const callResponseCallback = (params) => {
        let { acceptedCall, onPeerStream, myStream } = params;
        myStream = this.myStream = myStream || this.myStream;
        onPeerStream = onPeerStream || this.onPeerStream;

        if (acceptedCall) {
            if (typeof myStream !== 'object') {
                const functionName = 'incomingCall';
                const message = `WebRTC [${functionName}]:` +
                    `No local video stream defined.`;
                console.error(message);
            }

            let localDescription;
            const peerConnection = this.peerConnection
                = new RTCPeerConnection(rtcConfig);
            peerConnection.ontrack = onPeerStream;
            peerConnection.iceCache = [];
            myStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, myStream);
            });

            peerConnection.oniceconnectionstatechange = () => {
                if (peerConnection.iceConnectionState === 'disconnected') {
                    this.disconnect();
                }
            };

            // Send ICE candidates to peer as they come available locally.
            peerConnection.onicecandidate = (iceEvent) => {
                if (!iceEvent.candidate) {
                    return;
                }

                onIceCandidate(iceEvent, sender, peerConnection, callId, this.pubnub);
            };

            peerConnection.setRemoteDescription(remoteDescription)
                .then(() => {
                    return peerConnection.createAnswer();
                }).then((answer) => {
                    localDescription = answer;
                    return peerConnection.setLocalDescription(localDescription);
                }).then(() => {
                    peerConnection.acceptedCall = true;
                    this.callInSession = true;
                    sendIceCandidates(sender, peerConnection, callId, this.pubnub);
                    const channel = [callResponseEvent, sender].join('.');
                    this.pubnub.publish({
                        channel,
                        message: {
                            sender: this.pubnub.getUUID(),
                            callId,
                            acceptedCall,
                            remoteDescription: localDescription
                        }
                    });
                }).catch((error) => {
                    const functionName = 'incomingCall';
                    const message = `WebRTC [${functionName}] error.`;
                    console.error(message, error);
                });
        } else {
            const channel = [callResponseEvent, sender].join('.');
            this.pubnub.publish({
                channel,
                message: {
                    callId,
                    acceptedCall
                }
            });
        }
    }

    this.onIncomingCall(sender, callResponseCallback);
}

/*
 * This event fires when the local WebRTC connection has received a new ICE
 *     candidate.
 *
 * @param {object} iceEvent A `RTCPeerConnectionIceEvent` for the local client.
 * @param {string} userUuid A PubNub UUID for the peer to send the ICE
 *     candidate to.
 * @param {object} peerConnection The local `RTCPeerConnection` object.
 * @param {string} callId A UUID for the unique call.
 *
 * @returns {void}
 */
function onIceCandidate(iceEvent, userUuid, peerConnection, callId, pubnub) {
    peerConnection.iceCache.push(iceEvent.candidate);
    if (peerConnection.acceptedCall) {
        sendIceCandidates(userUuid, peerConnection, callId, pubnub);
    }
}

/*
 * This sends an array of ICE candidates
 *
 * @param {string} userUuid A PubNub UUID for the peer to send the ICE
 *     candidate to.
 * @param {object} peerConnection The local `RTCPeerConnection` object.
 * @param {string} callId A UUID for the unique call.
 * @param {object} pubnub Instance object of the PubNub JavaScript SDK.
 *
 * @returns {void}
 */
function sendIceCandidates(userUuid, peerConnection, callId, pubnub) {
    const channel = [peerIceCandidateEvent, userUuid].join('.');
    pubnub.publish({
        channel,
        message:  {
            callId,
            candidates: peerConnection.iceCache
        }
    });

    // Purge ICE candidate cache after it gets sent to peer.
    peerConnection.iceCache = [];
}

/*
 * This event fires when the peer WebRTC client sends a new ICE candidate. This
 *     event registers the candidate with the local `RTCPeerConnection` object.
 *
 * @param {object} payload A PubNub message with WebRTC connection information 
 *     for a call.
 *
 * @returns {void}
 */
function peerIceCandidate(payload) {
    const { peerConnection, ignoreNonTurn } = this;
    const { callId, candidates } = payload;

    if (typeof candidates !== 'object' || !peerConnection) {
        return;
    }

    candidates.forEach((candidate) => {
        // Ignore all non-TURN ICE candidates if specified in config.
        if (ignoreNonTurn && candidate.candidate.indexOf('typ relay') === -1) {
            return;
        }

        peerConnection.addIceCandidate(candidate)
            .catch((error) => {
                // No need to log errors for invalid ICE candidates
                if (error.message === 'Error processing ICE candidate') {
                    return;
                }

                const functionName = 'peerIceCandidate';
                const message = `WebRTC [${functionName}] error.`;
                console.error(message, error);
            });
    });
}

window.WebRtcPhone = WebRtcPhone;
