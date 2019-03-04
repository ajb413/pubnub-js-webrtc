(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

function newUuid() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
    return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
  });
}

function request(url, method, options) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    var contentTypeIsSet = false;
    options = options || {};
    xhr.open(method, url);

    for (var header in options.headers) {
      if ({}.hasOwnProperty.call(options.headers, header)) {
        header = header.toLowerCase();
        contentTypeIsSet = header === 'content-type' ? true : contentTypeIsSet;
        xhr.setRequestHeader(header, options.headers[header]);
      }
    }

    if (!contentTypeIsSet) {
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        var response;

        try {
          response = JSON.parse(xhr.response);
        } catch (e) {
          response = xhr.response;
        }

        resolve(response);
      } else {
        reject({
          status: xhr.status,
          statusText: xhr.statusText
        });
      }
    };

    xhr.send(JSON.stringify(options.body));
  });
}

function isValidConstructorConfig(config) {
  var functionName = 'isValidConstructorConfig';
  var isValid = true;

  if (!config.pubnub) {
    var message = "WebRTC [".concat(functionName, "] error. ") + 'Cannot initialize [WebRtcPhone] without passing an instance of ' + 'the PubNub JS SDK.';
    console.error(message);
    isValid = false;
  }

  if (!config.onIncomingCall) {
    var _message = "WebRTC [".concat(functionName, "] error. ") + 'Cannot initialize [WebRtcPhone] without passing a handler for ' + 'the [onIncomingCall] event.';

    console.error(_message);
    isValid = false;
  }

  if (!config.onCallResponse) {
    var _message2 = "WebRTC [".concat(functionName, "] error. ") + 'Cannot initialize [WebRtcPhone] without passing a handler for ' + 'the [onCallResponse] event.';

    console.error(_message2);
    isValid = false;
  }

  if (!config.onPeerStream) {
    var _message3 = "WebRTC [".concat(functionName, "] error. ") + 'Cannot initialize [WebRtcPhone] without passing a handler for ' + 'the [onPeerStream] event.';

    console.error(_message3);
    isValid = false;
  }

  if (!config.onDisconnect) {
    var _message4 = "WebRTC [".concat(functionName, "] error. ") + 'Cannot initialize [WebRtcPhone] without passing a handler for ' + 'the [onDisconnect] event.';

    console.error(_message4);
    isValid = false;
  }

  return isValid;
}

module.exports = {
  newUuid: newUuid,
  request: request,
  isValidConstructorConfig: isValidConstructorConfig
};

},{}],2:[function(require,module,exports){
"use strict";

function _typeof2(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof2 = function _typeof2(obj) { return typeof obj; }; } else { _typeof2 = function _typeof2(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof2(obj); }

var _util = require("./helpers/util.js");

function _typeof(obj) {
  if (typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol") {
    _typeof = function _typeof(obj) {
      return _typeof2(obj);
    };
  } else {
    _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : _typeof2(obj);
    };
  }

  return _typeof(obj);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var peerIceCandidateEvent = ['$' + 'webRTC', 'peerIceCandidate'].join('.');
var incomingCallEvent = ['$' + 'webRTC', 'incomingCall'].join('.');
var callResponseEvent = ['$' + 'webRTC', 'callResponse'].join('.');

var WebRtcPhone = function () {
  function WebRtcPhone(config) {
    var _this = this;

    _classCallCheck(this, WebRtcPhone);

    if (!(0, _util.isValidConstructorConfig)(config)) return;
    this.pubnub = config.pubnub;
    this.onIncomingCall = config.onIncomingCall;
    this.onCallResponse = config.onCallResponse;
    this.onPeerStream = config.onPeerStream;
    this.onDisconnect = config.onDisconnect;
    this.myStream = config.myStream;
    this.rtcConfig = config.rtcConfig;
    this.ignoreNonTurn = config.ignoreNonTurn;
    var myUuid = this.pubnub.getUUID();
    this.pubnub.addListener({
      message: function message(event) {
        var channel = event.channel;
        var isIncomingCall = channel.includes(incomingCallEvent);
        var isCallResponse = channel.includes(callResponseEvent);
        var isPeerIceCandidate = channel.includes(peerIceCandidateEvent);
        var isForMe = channel.includes(myUuid);

        if (isIncomingCall && isForMe) {
          incomingCall.call(_this, event.message);
        } else if (isCallResponse && isForMe) {
          callResponse.call(_this, event.message);
        } else if (isPeerIceCandidate && isForMe) {
          peerIceCandidate.call(_this, event.message);
        }
      }
    });
    var incomingCallChannel = [incomingCallEvent, myUuid].join('.');
    var callResponseChannel = [callResponseEvent, myUuid].join('.');
    var peerIceCandidateChannel = [peerIceCandidateEvent, myUuid].join('.');
    this.pubnub.subscribe({
      channels: [incomingCallChannel, callResponseChannel, peerIceCandidateChannel]
    });
  }

  _createClass(WebRtcPhone, [{
    key: "callUser",
    value: function callUser(userUuid, _ref) {
      var _this2 = this;

      var onPeerStream = _ref.onPeerStream,
          myStream = _ref.myStream,
          offerOptions = _ref.offerOptions,
          rtcConfig = _ref.rtcConfig;
      var myUuid = this.pubnub.getUUID();
      rtcConfig = this.rtcConfig = rtcConfig || this.rtcConfig;
      myStream = this.myStream = myStream || this.myStream;
      onPeerStream = this.onPeerStream = onPeerStream || this.onPeerStream;
      offerOptions = offerOptions || {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
      };
      var peerConnection = this.peerConnection = new RTCPeerConnection(rtcConfig);
      var callId = this.callId = (0, _util.newUuid)();
      var localDescription;
      peerConnection.ontrack = onPeerStream;
      myStream.getTracks().forEach(function (track) {
        peerConnection.addTrack(track, myStream);
      });
      peerConnection.iceCache = [];

      peerConnection.oniceconnectionstatechange = function () {
        if (peerConnection.iceConnectionState === 'disconnected') {
          _this2.disconnect();
        }
      };

      peerConnection.onicecandidate = function (iceEvent) {
        if (!iceEvent.candidate) {
          return;
        }

        onIceCandidate(iceEvent, userUuid, peerConnection, callId, _this2.pubnub);
      };

      peerConnection.onnegotiationneeded = function () {
        peerConnection.createOffer(offerOptions).then(function (description) {
          localDescription = description;
          return peerConnection.setLocalDescription(localDescription);
        }).then(function () {
          var channel = [incomingCallEvent, userUuid].join('.');

          _this2.pubnub.publish({
            channel: channel,
            message: {
              callId: callId,
              sender: myUuid,
              rtcConfig: rtcConfig,
              remoteDescription: localDescription
            }
          });
        }).catch(function (error) {
          var functionName = 'callUser';
          var message = "WebRTC [".concat(functionName, "] error.");
          console.error(message, error);
        });
      };
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      if (this.peerConnection) {
        this.peerConnection.close();
        delete this.peerConnection;
      }

      this.callInSession = false;
      this.onDisconnect();
    }
  }]);

  return WebRtcPhone;
}();

function callResponse(_ref2) {
  var _this3 = this;

  var sender = _ref2.sender,
      callId = _ref2.callId,
      acceptedCall = _ref2.acceptedCall,
      remoteDescription = _ref2.remoteDescription;

  if (acceptedCall) {
    this.peerConnection.acceptedCall = true;
    this.callInSession = true;
    this.peerConnection.setRemoteDescription(remoteDescription).then(function () {
      sendIceCandidates(sender, _this3.peerConnection, callId, _this3.pubnub);
    }).catch(function (error) {
      var functionName = 'callResponse';
      var message = "WebRTC [".concat(functionName, "] error.");
      console.error(message, error);
    });
  }

  this.onCallResponse(acceptedCall);
}

function incomingCall(_ref3) {
  var _this4 = this;

  var sender = _ref3.sender,
      callId = _ref3.callId,
      rtcConfig = _ref3.rtcConfig,
      remoteDescription = _ref3.remoteDescription;

  var callResponseCallback = function callResponseCallback(params) {
    var acceptedCall = params.acceptedCall,
        onPeerStream = params.onPeerStream,
        myStream = params.myStream;
    myStream = _this4.myStream = myStream || _this4.myStream;
    onPeerStream = onPeerStream || _this4.onPeerStream;

    if (acceptedCall) {
      if (_typeof(myStream) !== 'object') {
        var functionName = 'incomingCall';
        var message = "WebRTC [".concat(functionName, "]:") + "No local video stream defined.";
        console.error(message);
      }

      var localDescription;
      var peerConnection = _this4.peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnection.ontrack = onPeerStream;
      peerConnection.iceCache = [];
      myStream.getTracks().forEach(function (track) {
        peerConnection.addTrack(track, myStream);
      });

      peerConnection.oniceconnectionstatechange = function () {
        if (peerConnection.iceConnectionState === 'disconnected') {
          _this4.disconnect();
        }
      };

      peerConnection.onicecandidate = function (iceEvent) {
        if (!iceEvent.candidate) {
          return;
        }

        onIceCandidate(iceEvent, sender, peerConnection, callId, _this4.pubnub);
      };

      peerConnection.setRemoteDescription(remoteDescription).then(function () {
        return peerConnection.createAnswer();
      }).then(function (answer) {
        localDescription = answer;
        return peerConnection.setLocalDescription(localDescription);
      }).then(function () {
        peerConnection.acceptedCall = true;
        _this4.callInSession = true;
        sendIceCandidates(sender, peerConnection, callId, _this4.pubnub);
        var channel = [callResponseEvent, sender].join('.');

        _this4.pubnub.publish({
          channel: channel,
          message: {
            sender: _this4.pubnub.getUUID(),
            callId: callId,
            acceptedCall: acceptedCall,
            remoteDescription: localDescription
          }
        });
      }).catch(function (error) {
        var functionName = 'incomingCall';
        var message = "WebRTC [".concat(functionName, "] error.");
        console.error(message, error);
      });
    } else {
      var channel = [callResponseEvent, sender].join('.');

      _this4.pubnub.publish({
        channel: channel,
        message: {
          callId: callId,
          acceptedCall: acceptedCall
        }
      });
    }
  };

  this.onIncomingCall(sender, callResponseCallback);
}

function onIceCandidate(iceEvent, userUuid, peerConnection, callId, pubnub) {
  peerConnection.iceCache.push(iceEvent.candidate);

  if (peerConnection.acceptedCall) {
    sendIceCandidates(userUuid, peerConnection, callId, pubnub);
  }
}

function sendIceCandidates(userUuid, peerConnection, callId, pubnub) {
  var channel = [peerIceCandidateEvent, userUuid].join('.');
  pubnub.publish({
    channel: channel,
    message: {
      callId: callId,
      candidates: peerConnection.iceCache
    }
  });
  peerConnection.iceCache = [];
}

function peerIceCandidate(payload) {
  var peerConnection = this.peerConnection,
      ignoreNonTurn = this.ignoreNonTurn;
  var callId = payload.callId,
      candidates = payload.candidates;

  if (_typeof(candidates) !== 'object' || !peerConnection) {
    return;
  }

  candidates.forEach(function (candidate) {
    if (ignoreNonTurn && candidate.candidate.indexOf('typ relay') === -1) {
      return;
    }

    peerConnection.addIceCandidate(candidate).catch(function (error) {
      if (error.message === 'Error processing ICE candidate') {
        return;
      }

      var functionName = 'peerIceCandidate';
      var message = "WebRTC [".concat(functionName, "] error.");
      console.error(message, error);
    });
  });
}

window.WebRtcPhone = WebRtcPhone;

},{"./helpers/util.js":1}]},{},[2]);
