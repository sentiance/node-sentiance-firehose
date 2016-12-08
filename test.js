var firehose = require('./index');

// Configuration
var applicationId        = process.argv[2] || '';
var streamDefinitionId  = process.argv[3] || '';
var bearerToken         = process.argv[4] || '';

if(!applicationId || applicationId.length == 0 || !streamDefinitionId || streamDefinitionId.length == 0 || !bearerToken || bearerToken.length == 0) {
    throw new Error('Bad configuration, please provide all values');
}

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
    console.log(JSON.stringify(data));
    if(errors) {
        console.error(errors);
    }
}

firehose.onData(onDataUpdate);
// firehose.enableDebug(); // Show log messages

