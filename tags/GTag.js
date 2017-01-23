const BLEDongle = require('./BLEDongle');

class GTag extends BLEDongle {

	constructor(beaconIdent, name, timeout) {
		super(beaconIdent, name, timeout);
	}

	$destroy() {
		if (this._connecting) {
			this._peripheral.disconnect();
		}
	}

	static get type() {
		return 'beacon.gtag';
	}



	static isBeacon(peripheral) {
		return (peripheral.advertisement.localName === 'Gigaset G-tag');
	}


	getDatapointObjects() {
		let dpObject = super.getDatapointObjects();
		dpObject.push({
			topic: this.name + '/battery',
			type: 'datapoint',
			common: {
				isReadable: true,
				isWritable: false,
				isTrigger: true,
				type: 'number',
				role: 'value.battery'
			},
			native: {}
		});
		return dpObject;
	}

	connect(peripheral) {

		return new Promise((resolve, reject) => {

			if (this._connecting) {
				resolve();
				return;
			}
			this._connecting = true;
			this._peripheral = peripheral;
			peripheral.once('connect', (data) => {
				this.log('GTAG %s connected', this.name, data);
				this.emit('event', {
					topic: this.name + '/state',
					val: true
				});
				this.subscribeBattery(peripheral);
				this._rssiInverval = setInterval(() => {
					peripheral.updateRssi((error, rssi) => {
						this.log('Update RSSI once', rssi);
						this.emit('event', {
							topic: this.name + '/rssi',
							val: rssi
						});
					});
				}, 5000);

				resolve();
			});
			peripheral.once('disconnect', (data) => {
				this.log('GTAG %s disconnected', this.name, data);
				this.emit('event', {
					topic: this.name + '/state',
					val: false
				});
				clearInterval(this._rssiInverval);
				this._connecting = false;
			});



			peripheral.connect((err) => {
				if (err) {
					reject(err);
				} else {

					resolve();
				}
			});
		});
	}

	subscribeBattery(peripheral) {
		this.log('Subscribe Battery');
		peripheral.discoverSomeServicesAndCharacteristics(['180f'], ['2a19'], (error, services, characteristics) => {
			let batChar = characteristics[0];
			batChar.on('data', (data, notification) => {
				this.log('Battery update', data, notification);
				this.emit('event', {
					topic: this.name + '/battery',
					val: data.readUInt8()
				});
			});
			batChar.subscribe(err => {
				this.log('Battery subscribed', err);
				if (err) {
					this.log('Error subscribng', err);
				}
			});
			batChar.read((error, data) => {
				this.log('Battery update', data.readUInt8());
			});
		});
	}


	discovered(peripheral) {
		if (peripheral.id === this.beacon.id) {
			this.log('%s tag discovered: %s', this.constructor.type, this.name);
			this.connect(peripheral);
			return true;
		} else {
			return false;
		}
	}
}


module.exports = exports = GTag;