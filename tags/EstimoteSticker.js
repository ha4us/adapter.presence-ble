const BLEDongle = require('./BLEDongle');

const EXPECTED_MANUFACTURER_DATA_LENGTH = 22;
const UUID_STATIC_PART = "d0d3fa86-ca76-45ec-9bd9-6af4";

function convertMotionStateDuration(raw) {
	var unit = (raw >> 6) & 0x03;
	var duration = (raw & 0x3f);

	if (unit === 1) {
		duration *= 60;
	} else if (unit === 2) {
		duration *= (60 * 60);
	}

	return duration;
}

function parseAcceleration(accelerationByte) {
	return accelerationByte * 15.625;
}

function parseTemperature(bytes) {

	var rawTemperature = (bytes.readUInt16LE(13) & 0x0fff) << 4;
	var temperature = null;

	if (rawTemperature & 0x8000) {
		temperature = ((rawTemperature & 0x7fff) - 32768.0) / 256.0;
		return Math.ceil(temperature * 1000.0) / 1000.0;
	} else {
		temperature = rawTemperature / 256.0;
		return Math.floor(temperature * 1000.0) / 1000.0;
	}

}

function parseBatteryVoltage(bytes) {
	var level = bytes.readUInt8(15),
		battery;
	if ((level & 0x80) !== 0) {
		return undefined;
	} else {
		var bat = 3.6 * (((level & 0xFF) << 8) + (level & 0xFF) >>> 4 & 0x3FF) / 1023.0;
		if (bat >= 2.95) {
			return 'high';
		} else if (bat < 2.95 && bat >= 2.7) {
			return 'medium';
		} else if (bat > 0.0) {
			return 'low';
		}


	}


}

class EstimoteSticker extends BLEDongle {

	constructor(beaconIdent, name, timeout) {
		super(beaconIdent, name, timeout);

	}

	static get type() {
		return 'beacon.estimotesticker';
	}

	static isBeacon(peripheral) {
		var manufacturerData = peripheral.advertisement.manufacturerData;

		return (manufacturerData &&
			manufacturerData.length === EXPECTED_MANUFACTURER_DATA_LENGTH &&
			manufacturerData[0] === 0x5d && manufacturerData[1] === 0x01 && // company id 0x015d = 349
			manufacturerData[2] === 0x01); //protocol version must be 1;
	}

	static parse(peripheral) {
		var manufacturerData = peripheral.advertisement.manufacturerData;

		var sticker = {};

		sticker.id = peripheral.id;
		sticker.rssi = peripheral.rssi;
		sticker.eId = manufacturerData.slice(3, 11).toString('hex');
		sticker.hardwareVersion = (manufacturerData[11] === 0x4) ? 'SB0' : 'unknown';
		let firmware = manufacturerData[12];
		sticker.firmware = firmware;
		switch (firmware) {
		case 133:
			sticker.firmware = 'SA1.3.0';
			break;
		case 131:
			sticker.firmware = 'SA1.1.0';
			break;
		case 1:
			sticker.firmware = 'SA1.1.0';
			break;
		case -127:
			sticker.firmware = 'SA1.0.0';
			break;
		case -126:
			sticker.firmware = 'SA1.0.1';
			break;
		default:
			sticker.firmware = 'unknown (' + manufacturerData[12] + ')';
			break;
		}

		sticker.moving = (manufacturerData[15] & 0x40) == 64;

		sticker.accelX = parseAcceleration(manufacturerData[17]);
		sticker.accelY = parseAcceleration(manufacturerData[18]);
		sticker.accelZ = parseAcceleration(manufacturerData[19]);

		sticker.temperature = parseTemperature(manufacturerData);
		sticker.batteryVoltage = parseBatteryVoltage(manufacturerData);


		sticker.currentMotionStateDuration = convertMotionStateDuration(manufacturerData.readUInt8(19));
		sticker.previousMotionStateDuration = convertMotionStateDuration(manufacturerData.readUInt8(20));

		sticker.power = [1, 2, 3, 7, 5, 6, 4, 8][manufacturerData.readUInt8(21) & 0x0f] || 'unknown';



		return sticker;
	}

	getEstimoteId(peripheral) {
		if (this.constructor.isBeacon(peripheral)) {
			var manufacturerData = peripheral.advertisement.manufacturerData;
			return manufacturerData.slice(3, 11).toString('hex');
		}

	}

	discovered(peripheral) {
		if (this.beacon.eId === this.getEstimoteId(peripheral)) {
			this.log('%s tag discovered: %s', this.constructor.type, this.name);
			super.discovered(peripheral);
			return true;
		}

		return false;

	}





}

module.exports = exports = EstimoteSticker;
