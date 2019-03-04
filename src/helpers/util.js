/**
 * @file Utility functions for plugin.js.
 * @author Adam Bavosa <ajb413>
 */

const peerIceCandidateEvent = ['$' + 'webRTC', 'peerIceCandidate'].join('.');
const incomingCallEvent = ['$' + 'webRTC', 'incomingCall'].join('.');
const callResponseEvent = ['$' + 'webRTC', 'callResponse'].join('.');

/**
 * Makes a new, version 4, universally unique identifier (UUID). Written by
 *     Stack Overflow user broofa
 *     (https://stackoverflow.com/users/109538/broofa) in this post
 *     (https://stackoverflow.com/a/2117523).
 *
 * @returns {string} A version 4 compliant UUID.
 */
function newUuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(
        /[018]/g,
        (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4)
            .toString(16)
    );
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

const eventNames = {
    peerIceCandidateEvent,
    incomingCallEvent,
    callResponseEvent
}

module.exports = {
    newUuid,
    request,
    eventNames,
};
