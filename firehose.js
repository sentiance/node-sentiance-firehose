'use strict';

const rp = require('request-promise');
const socketIOClient = require('socket.io-client');
const EventEmitter = require('events');

const globalConfig = {
    debug: false
};

function enableDebug() {
    globalConfig.debug = true;
}
module.exports.enableDebug = enableDebug;

function disableDebug() {
    globalConfig.debug = false;
}
module.exports.disableDebug = disableDebug;


function d() {
    if(globalConfig.debug) {
        console.log.apply(console.log, arguments);
    }
}

// INSTANCE

class FirehoseClient extends EventEmitter {
    /**
     * A single FirehoseClient instance
     *
     * @param appId application id of the app you want updates for
     * @param streamDefinitionId sentiance stream definition id
     * @param bearerToken token valid to query data
     * @param options
     */
    constructor(appId, streamDefinitionId, bearerToken, options) {
        super();
        this._socket = null;
        this._reconnectTimeout = null;
        this.config = {
            appId: null,
            streamDefinitionId: null,
            bearerToken: null,
            firehoseSocketUrl: 'https://firehose.sentiance.com/',
            apiUrl: 'https://api.sentiance.com/v2/gql',
            reconnect: true,
            reconnectDelay: 1000
        };
        // Initialize config
        this.config.appId = appId;
        this.config.streamDefinitionId = streamDefinitionId;
        this.config.bearerToken = bearerToken;
        for(let k in options) {
            this.config[k] = options[k];
        }
        if(globalConfig.debug) {
            d('config: '+JSON.stringify(this.config));
        }
    }

    connect() {
        setTimeout(() => this.reconnect());
    }

    createSubscription() {
        return rp.post({
            uri: this.config.apiUrl,
            headers: {
                authorization: 'Bearer '+this.config.bearerToken
            },
            body: {
                query: 'mutation($app_id:String!, $stream_definition_id: String!) {\
                        createSubscription(app_id:$app_id, stream_definition_id: $stream_definition_id) {\
                            id\
                            token\
                        }\
                    }',
                variables: {
                    app_id: this.config.appId,
                    stream_definition_id: this.config.streamDefinitionId
                }
            },
            json: true
        })
        .then(body => {
            if(body && body.data && body.data.createSubscription) {
                return body.data.createSubscription;
            }
            throw new Error('createSubscription: Could not create subscription', this.config);
        });
    }

    subscribe(socket, subscriptionId, subscriptionToken) {
        d('Firehose: subscribing with id: '+ subscriptionId+', token: '+subscriptionToken);
        let subscription = {
            id: subscriptionId,
            token: subscriptionToken
        };
        if(this.config._skipHeartbeat) {
            subscription._skipHeartbeat = true;
        }
        socket.emit('subscribe-v1', subscription);
    }

    processUpdate(message) {
        this.emit('data', message.data, message.errors, message.metadata);
    }

    scheduleReconnect(timeout) {
        timeout = timeout || this.config.reconnectDelay;
        if(this._reconnectTimeout) {
            clearTimeout(this._reconnectTimeout);
            this._reconnectTimeout = null;
        }
        if(this.config.reconnect) {
            this._reconnectTimeout = setTimeout(() => this.reconnect(), timeout);
        }
    }

    initFirehoseConnection(subscriptionId, subscriptionToken) {
        if (this._socket) {
            this._socket.disconnect();
        }
        this._socket = socketIOClient(this.config.firehoseSocketUrl);

        this._socket.on('connect', () => {
            d('Firehose: connected to: ' + this.config.firehoseSocketUrl);
            this.subscribe(this._socket, subscriptionId, subscriptionToken);
        });

        this._socket.on('data', jsonMessage => {
            try {
                var message = JSON.parse(jsonMessage);
                this.processUpdate(message);
            } catch(e) {
                console.error('Firehose: could not process data message', e);
            }
        });

        this._socket.on('disconnect', () => {
            d('Firehose: disconnected');
            this.scheduleReconnect();
        });
        this._socket.on('error', err => {
            console.warn('Firehose: socket error', err);
            this.emit('error', err);
        });
    }

    reconnect() {
        this.createSubscription()
            .then(subscription => {
                d('subscription: '+JSON.stringify(subscription));
                if(!this.config.__connectionSetupDelay) {
                    return subscription;
                }
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(subscription);
                    }, this.config.__connectionSetupDelay);
                });
            })
            .then(subscription => {
                if(this.config._subscriptionToken) {
                    this.initFirehoseConnection(subscription.id, this.config._subscriptionToken);
                } else {
                    this.initFirehoseConnection(subscription.id, subscription.token);
                }

            })
            .catch(err => {
                console.error(err);
                this.scheduleReconnect();
            });
    }
}
module.exports.FirehoseClient = FirehoseClient;


// GLOBAL
let _onDataHandler;
function globalOnData(handler) {
    _onDataHandler = handler;
}
module.exports.onData = globalOnData;

let _instance;
function globalConnect(appId, streamDefinitionId, bearerToken, options) {
    if(_instance) throw new Error('Global instance already initialized');
    if(!_onDataHandler) {
        throw new Error('No data handler provided');
    }
    _instance = new FirehoseClient(appId, streamDefinitionId, bearerToken, options);
    _instance.on('data', _onDataHandler);
    _instance.connect();
}
module.exports.connect = globalConnect;