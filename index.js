'use strict';
(function () {
	const Adapter = require('ha4us-base').Adapter,
		hlp = require('ha4us-base').hlp,
		Tags = require('./tags');



	class PresenceBle extends Adapter {

		constructor(aHa4us, instanceObject) {
			super(aHa4us, instanceObject);
			//this._rfid = new RFIDReader(this.native.usbport);
		}

		static get configuration() {
			let retVal = super.configuration;
			retVal.guiAddon = false;
			retVal.maxInstances = 1;
			retVal.image = 'logo.png';
			return retVal;
		}

		init() {
			let self = this;



			return super.init()
				.then(() => {
					this._beacons = [];
					//read existing devices and create tags
					return this.ha4us.objects.get(this.topic + '/#', {
						type: 'device'
					}).catch(e => {
						this.logger.warn('Problems reading presence devices', e);
						//ignoring error - simply there are no scripts.
						return [];
					});
				})
				.then((devices) => {
					devices.forEach(device => {
						let Beacon = Tags.getClassByObject(device);
						if (Beacon) {
							let topicArr = device.topic.split('/');
							let beacon = new Beacon(device.native, topicArr[1]);
							this._beacons.push(beacon);
							this.registerBeacon(beacon);
						} else {
							this.logger.error('Unknown tagclass', device);
						}

					});

				})
				.then(() => {
					return new Promise((resolve, reject) => {
						this._noble = require('noble');
						this._noble.on('stateChange', (state) => {
							if (state === 'poweredOn') {
								resolve();
							}
						});
						this._noble.on('discover', peripheral => {
							this.scanEvent(peripheral);

						});
					});
				})
				.then(() => this.status = 1);
		}
		start() {

			return super.start()
				.then(() => {
					this._noble.startScanning([], true);
				})
				.catch(e => {
					this.logger.error('Error starting instance', e);
					throw (e);
				})
				.then(() => this.status = 2);
		}



		pause() {
			return super.pause()
				.then(() => {
					this._noble.stopScanning();
					//return this._rfid.close();
				})
				.then(() => this.status = 1);

		}

		stop() {
			return super.stop()
				.then(() => this.status = 0);
		}


		scanEvent(peripheral) {
			//first check whether we already have a device
			let handled = this._beacons.reduce((prev, element) => {
				let newVal = element.discovered(peripheral);
				return prev || newVal;
			}, false);

			if (!handled) {
				let Beacon = Tags.getClassByPeripheral(peripheral);
				if (Beacon) {
					let ident = Beacon.parse(peripheral);
					let beacon = new Beacon(ident, hlp.randomString(10).toLowerCase());
					this._beacons.push(beacon);
					this.createBeacon(beacon)
						.then(() => {
							this.registerBeacon(beacon);
						});


				} else {
					this.logger.debug('Ignoring unknown', peripheral.id);
				}
			}
		}

		createBeacon(beacon) {
			let device = beacon.getDeviceObject();
			let objects = beacon.getDatapointObjects();
			objects.unshift(device);
			return this.createObject(objects);
		}

		registerBeacon(beacon) {

			beacon.on('event', (data) => {
				this.logger.debug('Event occurred', data);
				this.ha4us.states.put(data.val, this.topic + '/' + data.topic);
			});
		}



	}

	module.exports = exports = PresenceBle;

})();
