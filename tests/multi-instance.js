'use strict';

var firehose = require('./../index');

// Configuration
var applicationId        = process.argv[2] || '';
var streamDefinitionId  = process.argv[3] || '';
var bearerToken         = process.argv[4] || '';

if(!applicationId || applicationId.length == 0 || !streamDefinitionId || streamDefinitionId.length == 0 || !bearerToken || bearerToken.length == 0) {
    throw new Error('Bad configuration, please provide all values');
}

function onDataUpdate(source, data, errors, metadata) {
    console.log(source, JSON.stringify(data), metadata);
    if(errors) {
        console.error(source, errors);
    }
}

let client1 = new firehose.FirehoseClient(applicationId, streamDefinitionId, bearerToken);
client1.on('data', (data, errors, metadata) => {
    onDataUpdate('client1', data, errors, metadata);
});

let client2 = new firehose.FirehoseClient(applicationId, streamDefinitionId, bearerToken);
client2.on('data', (data, errors, metadata) => {
    onDataUpdate('client2', data, errors, metadata);
});

client1.connect();
client2.connect();