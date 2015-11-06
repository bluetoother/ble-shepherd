'use strict';

var Enum = require('enum');

var GAPDEFS = {};

/**************************************************************************
 * Gap bond manager parameters, Ref: gapbondmgr.h
 * BondParam
 *************************************************************************/
GAPDEFS.BondParam = new Enum({
	'PairingMode': 0x400,
	'InitiateWait': 0x401,
	'MitmProtection': 0x402,
	'IoCap': 0x403,
	'OobEnabled': 0x404,
	'OobData': 0x405,
	'BondingEnabled': 0x406,
	'KeyDistList': 0x407,
	'DefaultPasscode': 0x408,
	'EraseAllbonds': 0x409,
	'AutoFailPairing': 0x40A,
	'AutoFailReason': 0x40B,
	'Keysize': 0x40C,
	'AutoSyncWl': 0x40D,
	'BondCount': 0x40E,
	'BondFailAction': 0x40F,
	'EraseSinglebond': 0x410
});

/**************************************************************************
 * Gap bond manager pairing mode defs, Ref: gapbondmgr.h
 * PairingMode
 *************************************************************************/
GAPDEFS.PairingMode = new Enum({
	'NoPairing': 0x00,
	'WaitForReq': 0x01,
	'Initiate': 0x02
});

/**************************************************************************
 * Gap bond manager iocap defs, Ref: gapbondmgr.h
 * IoCap
 *************************************************************************/
GAPDEFS.IoCap = new Enum({
	'DisplayOnly': 0x00,
	'DisplayYesNo': 0x01,
	'KeyboardOnly': 0x02,
	'NoInputNoOutput': 0x03,
	'KeyboardDisplay': 0x04
});

/**************************************************************************
 * Gap bond manager key dist defs, Ref: gapbondmgr.h
 * KeyDistList
 *************************************************************************/
GAPDEFS.KeyDistList = new Enum({
	'Senckey': 0x01,
	'Sidkey': 0x02,
	'Ssign': 0x04,
	'Menckey': 0x10,
	'Midkey': 0x20,
	'Msign': 0x40,
	'All': 0x77
});

module.exports = GAPDEFS;