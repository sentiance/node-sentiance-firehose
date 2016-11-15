// Configuration
var appId = process.argv[2] || '';
var streamDefinitionId = process.argv[3] || '';
var bearerToken = process.argv[4] || '';

if(!appId || appId.length == 0 || !streamDefinitionId || streamDefinitionId.length == 0 || !bearerToken || bearerToken.length == 0) {
    throw new Error('Bad configuration, please provide all values');
}

function processUpdate(message) {
    // Implement custom data handling here.
    // You can push the data to an internal queue, process it, ...
    // message.data         the graphql data projection
    // message.errors       any graphql errors (that might lead to ending your connection)
    // message.metadata     will hold the the processing_time, source trigger in a later phase
    console.log(message);
}

// App

var rp = require('request-promise');
var socketIOClient = require('socket.io-client');
var firehoseSocketUrl = 'https://preprod-firehose.sentiance.com/';
var apiUrl = 'https://preprod-api.sentiance.com/v2/gql';

function createSubscription() {
    return rp.post({
        uri: apiUrl,
        headers: {
            authorization: 'Bearer '+bearerToken
        },
        body: {
            query: `
mutation($app_id:String!, $stream_definition_id: String!) {
    createSubscription(app_id:$app_id, stream_definition_id: $stream_definition_id) {
        id
        token
    }
}`,
            variables: {
                app_id: appId,
                stream_definition_id: streamDefinitionId
            }
        },
        json: true
    })
    .then(function(body) {
        if(body && body.data && body.data.createSubscription) {
            return body.data.createSubscription;
        }
        throw new Error('createSubscription: Could not create subscription', { app_id: appId, stream_definition_id: streamDefinitionId, bearer_token: bearerToken });
    });
}

function subscribe(socket, subscriptionId, subscriptionToken) {
    console.log('subscribe: id: '+ subscriptionId+', token: '+subscriptionToken);
    socket.emit('subscribe-v1', {
        id: subscriptionId,
        token: subscriptionToken
    });
}

var socket;
var reconnectTimeout;

function scheduleReconnect(timeout) {
    timeout = timeout || 1000;
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
    socket = socketIOClient(firehoseSocketUrl);

    socket.on('connect', function () {
        console.log('firehose connected, endpoint: ' + firehoseSocketUrl);
        subscribe(socket, subscriptionId, subscriptionToken);
    });

    socket.on('data', function (jsonMessage) {
        var message = JSON.parse(jsonMessage);
        processUpdate(message);
    });

    socket.on('disconnect', function () {
        console.log('disconnected');
        scheduleReconnect();
    });
    socket.on('error', function (e) {
        console.log('error', e);
    });
}

function reconnect() {
    createSubscription()
        .then(function(subscription) {
            initFirehoseConnection(subscription.id, subscription.token);
        })
        .catch(function(err) {
            console.error(err);
            scheduleReconnect();
        });
}


// Start listening
reconnect();