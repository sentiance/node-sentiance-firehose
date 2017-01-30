# Sentiance Firehose
Node.js module for connecting to the Sentiance Firehose.

## Adding to project
```
npm install https://github.com/sentiance/node-sentiance-firehose --save
```

## Subscribing for messages
Connection requires a valid application ID, stream definition ID and a bearer token that has access to the data the stream is providing.  

The application ID is the ID you are using in your mobile app configuration.  
The bearer token is either the SDK user/device token or an application backend token that can be obtained using the app manager.

```
var Firehose = require('sentiance-firehose');
// Firehose.enableDebug(); // Show log messages

var client = new Firehose.FirehoseClient(applicationId, streamDefinitionId, bearerToken); 

/**
 * Called on every data update the stream emits
 * @param data      data projection
 * @param errors    list of errors that have happened when creating the projection
 * @param metadata  will hold additional information regarding the processing time, source of trigger, ...
 */
client.on('data', (data, errors, metadata) => {
    // Implement custom data handling here.
    // Push the data to an internal queue, filter & process it in realtime, ...
    console.log(JSON.stringify(data, null, 2));
    if(errors) {
        console.error(errors);
    }
});

client.connect();
```

## Testing
Tested with node 4.6.1

Install:
```
npm install
```

Testing:
```
node tests/single-instance.js APP_ID STREAM_DEFINITION_ID BEARER_TOKEN
node tests/multi-instance.js APP_ID STREAM_DEFINITION_ID BEARER_TOKEN
```