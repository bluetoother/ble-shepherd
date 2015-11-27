'use strict';

var Enum = require('enum');

var GAPDEFS = {};

/**************************************************************************
 * Gap bond manager parameters, Ref: gapbondmgr.h
 * BondParam
 *************************************************************************/
GAPDEFS.BondParam = new Enum({
    'PairingMode': 0x0400,
    'InitiateWait': 0x0401,
    'MitmProtection': 0x0402,
    'IoCap': 0x0403,
    'OobEnabled': 0x0404,
    'OobData': 0x0405,
    'BondingEnabled': 0x0406,
    'KeyDistList': 0x0407,
    'DefaultPasscode': 0x0408,
    'EraseAllbonds': 0x0409,
    'AutoFailPairing': 0x040A,
    'AutoFailReason': 0x040B,
    'Keysize': 0x040C,
    'AutoSyncWl': 0x040D,
    'BondCount': 0x040E,
    'BondFailAction': 0x040F,
    'EraseSinglebond': 0x0410
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