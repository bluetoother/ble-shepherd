'use strict';

var Enum = require('enum');

var BDEFS = {
		Gatt: {},
		GapBondMgr: {}
	};

/**************************************************************************
 * BLE Generic Status & BLE Status, Ref: comdef.h & bcomdef.h
 * SubGroupEvt(Event ID)
 *************************************************************************/
BDEFS.GenericStatus = new Enum({
	'SUCCESS': 0x00,
	'FAILURE': 0x01,
	'INVALIDPARAMETER': 0x02,
	'INVALID_TASK': 0x03,
	'MSG_BUFFER_NOT_AVAIL': 0x04,
	'INVALID_MSG_POINTER': 0x05,
	'INVALID_EVENT_ID': 0x06,
	'INVALID_INTERRUPT_ID': 0x07,
	'NO_TIMER_AVAIL': 0x08,
	'NV_ITEM_UNINIT': 0x09,
	'NV_OPER_FAILED': 0x0A,
	'INVALID_MEM_SIZE': 0x0B,
	'NV_BAD_ITEM_LEN': 0x0C,
	//BLE Status
	'bleNotReady': 0x10,
	'bleAlreadyInRequestedMode': 0x11,
	'bleIncorrectMode': 0x12,
	'bleMemAllocError': 0x13,
	'bleNotConnected': 0x14,
	'bleNoResources': 0x15,
	'blePending': 0x16,
	'bleTimeout': 0x17,
	'bleInvalidRange': 0x18,
	'bleLinkEncrypted': 0x19,
	'bleProcedureComplete': 0x1A,
	// GAP Status
	'bleGAPUserCanceled': 0x30,
	'bleGAPConnNotAcceptable': 0x31,
	'bleGAPBondRejected': 0x32,
	// ATT Status
	'bleInvalidPDU': 0x40,
	'bleInsufficientAuthen': 0x41,
	'bleInsufficientEncrypt': 0x42,
	'bleInsufficientKeySize': 0x43
});

module.exports = BDEFS;