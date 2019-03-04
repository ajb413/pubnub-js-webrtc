/**
 * @file Fallback event handlers set in the WebRTCCall constructor. If the
 *     client does not provide any of the noted event handlers, these functions
 *     will execute and throw a ChatEngine error with ChatEngine.throwError.
 *     Although this.ChatEngine is referenced, there is no need to use the
 *     JavaScript call or apply methods thanks to the plugin architecture.
 * @author Adam Bavosa <adamb@pubnub.com>
 */

/**
 * A function that is called if the client did not pass a parent onIncomingCall
 *     event handler to the WebRTC plugin instance.
 *
 * @param {function} callback Callback for onIncomingCall. Accepts boolean for
 *     accepting a call. The call is automatically rejected because a function
 *     for UI input (accept/reject) is not defined.
 *
 * @returns {void}
 */
function onIncomingCallNotDefined(callback) {
    const functionName = 'onIncomingCallNotDefined';
    const message ='A handler for the [onIncomingCall] event is not defined.';
    chatEngineError(this.ChatEngine, functionName, message);
    callback(false);
}

/**
 * A function that is called if the client did not pass an onCallResponse event
 *     handler to the call object instance.
 *
 * @returns {void}
 */
function onCallResponseNotDefined() {
    const functionName = 'onCallResponseNotDefined';
    const message ='A handler for the [onCallResponse] event is not defined.';
    chatEngineError(this.ChatEngine, functionName, message);
}

/**
 * A function that is called if the client did not pass an onPeerStream event
 *     handler to the call object instance.
 *
 * @returns {void}
 */
function onPeerStreamNotDefined() {
    const functionName = 'onPeerStreamNotDefined';
    const message = 'A handler for the [onPeerStream] event is not defined.';
    chatEngineError(this.ChatEngine, functionName, message);
}

/**
 * A function that is called if the client did not pass an onDisconnect event
 *     handler to the call object instance.
 *
 * @returns {void}
 */
function onDisconnectNotDefined() {
    const functionName = 'onDisconnectNotDefined';
    const message = 'A handler for the [onDisconnect] event is not defined.';
    chatEngineError(this.ChatEngine, functionName, message);
}

/**
 * A helper function for throwing errors with ChatEngine. In production mode,
 *     ChatEngine Errors can be suppressed.
 *
 * @param {object} chatEngine ChatEngine instance.
 * @param {string} functionName ChatEngine instance.
 * @param {string} message ChatEngine instance.
 * @param {object|string} error Natural error object or a string message. This
 *     gets logged in the ChatEngine error event history.
 *
 * @throws Throws an error using the ChatEngine.throwError function.
 *
 * @returns {void}
 */
function chatEngineError(chatEngine, functionName, message, error) {
    message = 'ChatEngine WebRTC Plugin: ' + (message || 'undefined error');
    error = error ? error : message;

    chatEngine.throwError(
        chatEngine,
        functionName,
        'webRTC',
        new Error(message),
        { error }
    );
}

module.exports = {
    onIncomingCallNotDefined,
    onCallResponseNotDefined,
    onPeerStreamNotDefined,
    onDisconnectNotDefined,
    chatEngineError
};
