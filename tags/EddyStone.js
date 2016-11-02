const BLEDongle = require('./BLEDongle');

const SERVICE_UUID = 'feaa';

const UID_FRAME_TYPE = 0x00;
const URL_FRAME_TYPE = 0x10;
const TLM_FRAME_TYPE = 0x20;

var urlDecode = require('eddystone-url-encoding').decode;


function parseUidData(data) {
	return {
		txPower: data.readInt8(1),
		namespace: data.slice(2, 12).toString('hex'),
		instance: data.slice(12, 18).toString('hex'),
	};
}

function parseUrlData(data) {
	return {
		txPower: data.readInt8(1),
		url: urlDecode(data.slice(2))
	};
}

function parseTlmData(data) {
	return {
		tlm: {
			version: data.readUInt8(1),
			vbatt: data.readUInt16BE(2),
			temp: data.readInt16BE(4) / 256,
			advCnt: data.readUInt32BE(6),
			secCnt: data.readUInt32BE(10)
		}
	};
}

function calculateDistance(txPower, rssi) {
	return Math.pow(10, ((txPower - rssi) - 41) / 20.0);
}


class EddyStone extends BLEDongle {

	constructor(peripheral, name, timeout) {
		super(peripheral, name, timeout);

	}
	static get type() {
		return 'beacon.eddystone';
	}


	static isBeacon(peripheral) {
		let serviceData = peripheral.advertisement.serviceData;
		// make sure service data is present, with the expected uuid and data length
		return (serviceData &&
			serviceData.length > 0 &&
			serviceData[0].uuid === SERVICE_UUID &&
			serviceData[0].data.length > 2
		);
	}

	static parse(peripheral) {
		var data = peripheral.advertisement.serviceData[0].data;
		var frameType = data.readUInt8(0);

		var beacon = {};
		var type = 'unknown';
		var rssi = peripheral.rssi;

		switch (frameType) {
		case UID_FRAME_TYPE:
			type = 'uid';
			beacon = parseUidData(data);
			break;

		case URL_FRAME_TYPE:
			type = 'url';
			beacon = parseUrlData(data);
			break;

		case TLM_FRAME_TYPE:
			type = 'tlm';
			beacon = parseTlmData(data);
			break;

		default:
			break;
		}
		beacon.type = 'eddystone';
		beacon.id = peripheral.id;
		beacon.frametype = type;
		beacon.rssi = rssi;

		var txPower = beacon.txPower;
		if (txPower !== undefined) {
			beacon.distance = calculateDistance(txPower, rssi);
		}

		return beacon;
	}


}

module.exports = exports = EddyStone;
