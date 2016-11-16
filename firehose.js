var rp = require('request-promise');
var socketIOClient = require('socket.io-client');

var config = {
    onDataUpdate: null,
    appId: null,
    streamDefinitionId: null,
    bearerToken: null,
    firehoseSocketUrl: 'https://firehose.sentiance.com/',
    apiUrl: 'https://api.sentiance.com/v2/gql',
    delay: 1000,
    debug: false
};


function d() {
    if(config.debug) {
        console.log.apply(console.log, arguments);
    }
}

function createSubscription() {
    return rp.post({
        uri: config.apiUrl,
        headers: {
            authorization: 'Bearer '+config.bearerToken
        },
        body: {
            query: `mutation($app_id:String!, $stream_definition_id: String!) {
                        createSubscription(app_id:$app_id, stream_definition_id: $stream_definition_id) {
                            id
                            token
                        }
                    }`,
            variables: {
                app_id: config.appId,
                stream_definition_id: config.streamDefinitionId
            }
        },
        json: true
    })
    .then(function(body) {
        if(body && body.data && body.data.createSubscription) {
            return body.data.createSubscription;
        }
        throw new Error('createSubscription: Could not create subscription', { app_id: config.appId, stream_definition_id: config.streamDefinitionId, bearer_token: config.bearerToken });
    });
}

function subscribe(socket, subscriptionId, subscriptionToken) {
    d('Firehose: subscribing with id: '+ subscriptionId+', token: '+subscriptionToken);
    socket.emit('subscribe-v1', {
        id: subscriptionId,
        token: subscriptionToken
    });
}

function processUpdate(message) {
    if(config.onDataUpdate) {
        config.onDataUpdate(message.data, message.errors, message.metadata);
    }
}

var socket;
var reconnectTimeout;

function scheduleReconnect(timeout) {
    timeout = timeout || config.delay;
    if(reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    reconnectTimeout = setTimeout(reconnect, timeout);
}

function initFirehoseConnection(subscriptionId, subscriptionToken) {
    if (socket) {
        socket.disconnect();
    }
    socket = socketIOClient(config.firehoseSocketUrl);

    socket.on('connect', function () {
        d('Firehose: connected to: ' + config.firehoseSocketUrl);
        subscribe(socket, subscriptionId, subscriptionToken);
    });

    socket.on('data', function (jsonMessage) {
        try {
            var message = JSON.parse(jsonMessage);
            processUpdate(message);
        } catch(e) {
            console.error('Firehose: could not process data message', e);
        }
    });

    socket.on('disconnect', function () {
        d('Firehose: disconnected');
        scheduleReconnect();
    });
    socket.on('error', function (e) {
        console.warn('Firehose: socket error', e);
    });
}

function reconnect() {
    if(!config.onDataUpdate) {
        throw new Error('No onDataUpdate handler configured');
    }
    createSubscription()
        .then(function(subscription) {
            initFirehoseConnection(subscription.id, subscription.token);
        })
        .catch(function(err) {
            console.error(err);
            scheduleReconnect();
        });
}



function connect(appId, streamDefinitionId, bearerToken) {
    config.appId = appId;
    config.streamDefinitionId = streamDefinitionId;
    config.bearerToken = bearerToken;
    setTimeout(reconnect);
}
module.exports.connect = connect;



function enableDebug() {
    config.debug = true;
}
module.exports.enableDebug = enableDebug;

function disableDebug() {
    config.debug = false;
}
module.exports.disableDebug = disableDebug;



module.exports.onData = function(callback) {
    config.onDataUpdate = callback;
};



