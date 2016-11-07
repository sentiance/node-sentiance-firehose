var requestPromise = require('request-promise');
var socketIOClient = require('socket.io-client');

var streamDefinitionId = process.argv[2] || 'static_id_here'; 
var bearerToken = process.argv[3] || 'static_token_here'; 

var firehoseSubscriptionEndpoint = 'https://preprod-firehose.sentiance.com/'; 
var appId = '00000000000000000000000a'; // Our journeys demo app


// Create a subscription on a stream definition
function createSubscription() {
    return requestPromise({
            method: 'POST',
            uri: 'http://ec2-52-208-92-127.eu-west-1.compute.amazonaws.com:15012/firestation/'+appId+'/stream_definitions/'+streamDefinitionId+'/subscriptions',
            body: {
                bearer_token: bearerToken
            },
            json: true
        })
        .then(function(body) {
            console.log('Subscription created', body);
            return body;
        });
}


// Setup the websocket connection
var socket;
function initFirehoseConnection(subscriptionId, subscriptionToken) {
    if(socket) {
        socket.disconnect();
    }
    socket = socketIOClient(firehoseSubscriptionEndpoint);

    function subscribe() {
        console.log('subscribe-v1 :: subscription id: '+ subscriptionId+', subscription token: '+subscriptionToken);
        socket.emit('subscribe-v1', {
            id: subscriptionId, 
            token: subscriptionToken
        });
    }

    socket.on('connect', function(){
        console.log('firehose connected, endpoint: '+firehoseSubscriptionEndpoint);
        subscribe();
    });

    socket.on('data', function(jsonMessage){
        var message = JSON.parse(jsonMessage);
        console.log(message.data); // Contains the graphql projection
    });

    socket.on('disconnect', function(){ console.log('disconnected') });
    socket.on('error', function(e){ console.log('error', e) });
}




// Create a subscription and start processing firehose data messages that contain the GQL model
createSubscription()
    .then(function(subscription) {
        initFirehoseConnection(subscription.id, subscription.token);
    })
    .catch(function(err) {
        console.error(err);
    })
