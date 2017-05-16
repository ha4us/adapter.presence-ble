'use strict';
const EventEmitter = require('events');
class BLEDongle extends EventEmitter {

  constructor(beaconIdent, name, timeout = 30) {
    super();
    this._timeout = timeout;
    this.log = require('debug')(this.constructor.type);
    this.log('Creating dongle %s(%s)', name, this.constructor.type, beaconIdent);
    this.name = name;
    this.beacon = beaconIdent;
    this.beacon.type = this.constructor.type;
    this._timer = null;
  }
  $destroy() {

  }

  static get type() {
    return 'beacon.generic';
  }


  static isBeacon(peripheral) {
    return true;
  }
  static parse(peripheral) {
    return {
      id: peripheral.id,
      address: peripheral.address,
      rssi: peripheral.rssi
    };
  }

  getDeviceObject() {
    return {
      topic: this.name,
      type: 'device',
      common: {
        name: this.constructor.type,
        role: this.constructor.type
      },
      native: this.beacon
    };
  }

  getDatapointObjects() {
    return [{
      topic: this.name + '/state',
      type: 'datapoint',
      common: {
        isReadable: true,
        isWritable: false,
        isTrigger: true,
        type: 'boolean',
        role: 'indicator.presence'
      },
      native: {}
    }, {
      topic: this.name + '/rssi',
      type: 'datapoint',
      common: {
        isReadable: true,
        isWritable: false,
        isTrigger: true,
        type: 'number',
        role: 'value.rssi'
      },
      native: {}
    }];
  }

  _setTimeout() {
    this._lastSeen = Date.now();
    if (this._timer) {
      clearTimeout(this._timer);
    }
    this._timer = setTimeout(() => {
      this.expired();
    }, this._timeout * 1000);
  }

  expired() {
    this.log('Tag expired %s', this.name);
    this.emit('event', {
      topic: this.name + '/state',
      val: false
    });
  }


  discovered(peripheral) {
    this._setTimeout();
    this.emit('event', {
      topic: this.name + '/rssi',
      val: peripheral.rssi
    });
    this.emit('event', {
      topic: this.name + '/state',
      val: true
    });
    return true;
  }


}

module.exports = exports = BLEDongle;
