# Sentiance Firehose
Node.js module for connecting to the sentiance firehose

## Adding to project
```
npm install https://github.com/sentiance/node-sentiance-firehose --save
```

## Connecting
Connection requires a valid application ID and stream definition ID.  

The application ID is the ID you are using in your mobile app configuration.
The bearer token is either the SDK user/device token or an application backend token that can be obtained using the app manager.

```
var firehose = require('sentiance-firehose');

firehose.connect(applicationId, streamDefinitionId, bearerToken);

/**
 * Called on every data update the stream emits
 *
 * @param data      data projection
 * @param errors    list of errors that have happened when creating the projection
 * @param metadata  will hold additional information regarding the processing time, source of trigger, ...
 */
function onDataUpdate(data, errors, metadata) {
    // Implement custom data handling here.
    // Push the data to an internal queue, filter & process it in realtime, ...
    console.log(JSON.stringify(data, null, 2));
    if(errors) {
        console.error(errors);
    }
}

firehose.onData(onDataUpdate);
// firehose.enableDebug(); // Show log messages
```

## Testing
Tested with node 4.6.1

Install:
```
npm install
```

Testing:
```
node test.js APP_ID STREAM_DEFINITION_ID BEARER_TOKEN
```