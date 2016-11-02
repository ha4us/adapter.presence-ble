const TAGS = [
	require('./GTag'),
	require('./EstimoteSticker')];
//require('./EddyStone')];
const DEFAULT = require('./BLEDongle');

module.exports = exports = {

	getClassByPeripheral: peripheral => {

		return TAGS.find(tagClass => tagClass.isBeacon(peripheral));

	},
	getClassByObject: beaconObject => {
		return TAGS.find(tagClass => tagClass.type === (beaconObject.native.type));
	}




};
