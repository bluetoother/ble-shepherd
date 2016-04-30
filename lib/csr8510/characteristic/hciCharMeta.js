'use strict';

var _ = require('lodash');

var hciCharMeta = {

    '0x2800' : {
        params : ['uuid'],
        types : ['uuid']
    },
    '0x2801' : {
        params : ['uuid'],
        types : ['uuid']
    },
    '0x2802' : {
        params : ['serviceAttrHandle', 'endGroupHandle', 'uuid'],
        types : ['uint16', 'uint16', 'uuid']
    },
    '0x2803' : {
        params : ['properties', 'handle', 'uuid'],
        types : ['uint8', 'uint16', 'uuid'],
    },
    '0x2900' : {
        params : ['properties'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2901' : {
        params : ['userDescription'],
        types : ['string']
    },
    '0x2902' : {
        params : ['properties'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2903' : {
        params : ['properties'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2904' : {
        params : ['format', 'exponent', 'unit', 'namespace', 'description'],
        types : ['uint8', 'int8', 'uint16', 'uint8', 'uint16'],
        bufLen: 7

    },
    '0x2905' : {
        params : ['listOfHandles'],
        types : ['list'],
        objInfo: {
            params: ['handle'],
            types: ['uint16'],
            objLen: 2
        }
    },
    // TODO the same format as the characteristic
    // '0x2906' : {
    //     params : [''],
    //     types : ['']
    // },
    '0x2907' : {
        params : ['extReportRef'],
        types : ['uuid']
    },
    '0x2908' : {
        params : ['reportID', 'reportType'],
        types : ['uint8', 'uint8'],
        bufLen: 2
    },
    '0x2909' : {
        params : ['noOfDigitals'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x290a' : {
        params : ['condition'],
        types : ['uint8'],
        extra: {
            params : ['analog', 'bitMask', 'analogInterval'],
            types : ['uint16', 'uint8', 'uint32'],
            result: [3, 4, 6]
        }
    },
    '0x290b' : {
        params : ['triggerLogic'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x290c' : {
        params : ['flags', 'samplFunc', 'measurePeriod', 'updateInterval', 'application', 'measureUncertainty'],
        types : ['uint16', 'uint8', 'uint24', 'uint24', 'uint8', 'uint8'],
        bufLen: 11
    },
    // '0x290d' : {
    //     params : ['Condition', 'Operand'],
    //     types : ['uint8', 'Variable']
    // },
    '0x290e' : {
        params : ['condition'],
        types : ['uint8'],
        extra: {
            params : ['none', 'timeInterval', 'count'],
            types : ['uint8', 'uint24', 'uint16'],
            result: [0, 2, 3]
        }
    },
    '0x2a00' : {
        params : ['name'],
        types : ['string']
    },
    '0x2a01' : {
        params : ['category'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a02' : {
        params : ['flag'],
        types : ['boolean']
    },
    '0x2a03' : {
        params : ['addr'],
        types : ['addr6'],
        bufLen: 6
    },
    '0x2a04' : {
        params : ['minConnInterval', 'maxConnInterval', 'latency', 'timeout'],
        types : ['uint16', 'uint16', 'uint16', 'uint16'],
        bufLen: 8
    },
    '0x2a05' : {
        params : ['startHandle', 'endHandle'],
        types : ['uint16', 'uint16'],
        bufLen: 4
    },
    '0x2a06' : {
        params : ['alertLevel'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a07' : {
        params : ['txPower'],
        types : ['int8'],
        bufLen: 1
    },
    '0x2a08' : {
        params : ['year', 'month', 'day', 'hours', 'minutes', 'seconds'],
        types : ['uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
        bufLen: 7
    },
    '0x2a09' : {
        params : ['dayOfWeek'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a0a' : {
        params : ['year', 'month', 'day', 'hours', 'minutes', 'seconds', 'dayOfWeek'],
        types : ['uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
        bufLen: 8
    },
    '0x2a0c' : {
        params : ['year', 'month', 'day', 'hours', 'minutes', 'seconds', 'dayOfWeek', 'fractions256'],
        types : ['uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
        bufLen: 9
    },
    '0x2a0d' : {
        params : ['dstOffset'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a0e' : {
        params : ['timeZone'],
        types : ['int8'],
        bufLen: 1
    },
    '0x2a0f' : {
        params : ['timeZone', 'dstOffset'],
        types : ['int8', 'uint8'],
        bufLen: 2
    },
    '0x2a11' : {
        params : ['year', 'month', 'day', 'hours', 'minutes', 'seconds', 'dstOffset'],
        types : ['uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
        bufLen: 8
    },
    '0x2a12' : {
        params : ['accuracy'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a13' : {
        params : ['timeSource'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a14' : {
        params : ['source', 'accuracy', 'daySinceUpdate', 'hourSinceUpdate'],
        types : ['uint8', 'uint8', 'uint8', 'uint8'],
        bufLen: 4
    },
    '0x2a16' : {
        params : ['timeUpdateCtrl'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a17' : {
        params : ['currentState', 'result'],
        types : ['uint8', 'uint8'],
        bufLen: 2
    },
    '0x2a18' : {
        params : ['flags', 'sequenceNum', 'year', 'month', 'day', 'hours', 'minutes', 'seconds'],
        types : ['uint8', 'uint16', 'uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
        extra: {
            params : ['timeOffset', 'glucoseKg', 'glucoseMol','type', 'sampleLocation', 'sensorStatus'],
            types : ['int16', 'sfloat', 'sfloat', 'nibble', 'nibble', 'uint16'],
            flags: [0x01, 0x02 + 0x04, 0x02 + 0x04, 0x02, 0x02, 0x08],
            result: [0x01, 0x02, 0x02 + 0x04, 0x02, 0x02, 0x08]
        }
    },
    '0x2a19' : {
        params : ['level'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a1c' : {
        params : ['flags'],
        types : ['uint8'],
        extra: {
            params : ['tempC', 'tempF', 'year', 'month', 'day', 'hours', 'minutes', 'seconds', 'tempType'],
            types : ['float', 'float', 'uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
            flags: [0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04],
            result: [0x00, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04]
        }
    },
    '0x2a1d' : {
        params : ['tempTextDesc'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a1e' : {
        params : ['flags'],
        types : ['uint8'],
        extra: {
            params : ['tempC', 'tempF', 'year', 'month', 'day', 'hours', 'minutes', 'seconds', 'tempType'],
            types : ['float', 'float', 'uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
            flags: [0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04],
            result: [0x00, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04]
        }
    },
    '0x2a21' : {
        params : ['measureInterval'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a22' : {
        params : ['bootKeyboardInput'],
        types : ['list'],
        objInfo: {
            params: ['value'],
            types: ['uint8'],
            objLen: 1
        }
    },
    '0x2a23' : {
        params : ['manufacturerID', 'organizationallyUID'],
        types : ['addr5', 'addr3'],
        bufLen: 8
    },
    '0x2a24' : {
        params : ['modelNum'],
        types : ['string']
    },
    '0x2a25' : {
        params : ['serialNum'],
        types : ['string']
    },
    '0x2a26' : {
        params : ['firmwareRev'],
        types : ['string']
    },
    '0x2a27' : {
        params : ['hardwareRev'],
        types : ['string']
    },
    '0x2a28' : {
        params : ['softwareRev'],
        types : ['string']
    },
    '0x2a29' : {
        params : ['manufacturerName'],
        types : ['string']
    },
    // '0x2a2a' : {
    //     params : ['data'],
    //     types : ['reg-cert-data-list']
    // },
    '0x2a2b' : {
        params : ['year', 'month', 'day', 'hours', 'minutes', 'seconds', 'dayOfWeek', 'fractions256', 'adjustReason'],
        types : ['uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
        bufLen: 10
    },
    '0x2a2c' : {
        params : ['magneticDeclination'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a31' : {
        params : ['scanRefresh'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a32' : {
        params : ['bootKeyboardOutput'],
        types : ['list'],
        objInfo: {
            params: ['value'],
            types: ['uint8'],
            objLen: 1
        }
    },
    '0x2a33' : {
        params : ['bootMouseInput'],
        types : ['list'],
        objInfo: {
            params: ['value'],
            types: ['uint8'],
            objLen: 1
        }
    },
    '0x2a34' : {
        params : ['flags', 'sequenceNum'],
        types : ['uint8', 'uint16'],
        extra: {
            params : ['extendedFlags', 'carbohydrateID', 'carbohydrate', 'meal', 'tester', 'health', 'exerciseDuration', 'exerciseIntensity', 'medicationID', 'medicationKg', 'medicationL', 'hbA1c'],
            types : ['uint8', 'uint8', 'sfloat', 'uint8', 'nibble', 'nibble', 'uint16', 'uint8', 'uint8', 'sfloat', 'sfloat', 'sfloat'],
            flags: [0x80, 0x01, 0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10, 0x10 + 0x20, 0x10 + 0x20, 0x04],
            result: [0x80, 0x01, 0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10, 0x10, 0x10 + 0x20, 0x04]
        }
    },
    '0x2a35' : {
        params : ['flags'],
        types : ['uint8'],
        extra: {
            params : ['systolicMmHg', 'diastolicMmHg', 'arterialPresMmHg', 'systolicKpa', 'diastolicKpa', 'arterialPresKpa', 'year', 'month', 'day', 'hours', 'minutes', 'seconds', 'pulseRate', 'userID', 'status'],
            types : ['sfloat', 'sfloat', 'sfloat', 'sfloat', 'sfloat', 'sfloat', 'uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'sfloat', 'uint8', 'uint16'],
            flags: [0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04, 0x08, 0x10],
            result: [0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04, 0x08, 0x10]
        }
    },
    '0x2a36' : {
        params : ['flags'],
        types : ['uint8'],
        extra: {
            params : ['systolicMmHg', 'diastolicMmHg', 'arterialPresMmHg', 'systolicKpa', 'diastolicKpa', 'arterialPresKpa', 'year', 'month', 'day', 'hours', 'minutes', 'seconds', 'pulseRate', 'userID', 'status'],
            types : ['sfloat', 'sfloat', 'sfloat', 'sfloat', 'sfloat', 'sfloat', 'uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'sfloat', 'uint8', 'uint16'],
            flags: [0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04, 0x08, 0x10],
            result: [0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04, 0x08, 0x10]
        }
    },
    '0x2a37' : {
        params : ['flags'],
        types : ['uint8'],
        extra: {
            params : ['heartRate8', 'heartRate16', 'energyExpended', 'rrInterval'],
            types : ['uint8', 'uint16', 'uint16', 'uint16'],
            flags: [0x01, 0x01, 0x08, 0x10],
            result: [0x00, 0x01, 0x08, 0x10]
        }
    },
    '0x2a38' : {
        params : ['bodySensorLocation'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a39' : {
        params : ['heartRateCtrl'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a3f' : {
        params : ['alertStatus'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a40' : {
        params : ['ringerCtrlPoint'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a41' : {
        params : ['ringerSet'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a42' : {
        params : ['categoryIDBitMask0', 'categoryIDBitMask1'],
        types : ['uint8', 'uint8'],
        bufLen: 2
    },
    '0x2a43' : {
        params : ['categoryID'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a44' : {
        params : ['commID', 'categoryID'],
        types : ['uint8', 'uint8'],
        bufLen: 2
    },
    '0x2a45' : {
        params : ['categoryID', 'unreadCount'],
        types : ['uint8', 'uint8'],
        bufLen: 2
    },
    '0x2a46' : {
        params : ['categoryID', 'newAlert', 'textStringInfo'],
        types : ['uint8', 'uint8', 'string']
    },
    '0x2a47' : {
        params : ['categoryIDBitMask0', 'categoryIDBitMask1'],
        types : ['uint8', 'uint8'],
        bufLen: 2
    },
    '0x2a48' : {
        params : ['categoryIDBitMask0', 'categoryIDBitMask1'],
        types : ['uint8', 'uint8'],
        bufLen: 2
    },
    '0x2a49' : {
        params : ['feature'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a4a' : {
        params : ['bcdHID', 'bCountryCode', 'flags'],
        types : ['uint16', 'uint8', 'uint8'],
        bufLen: 4
    },
    '0x2a4b' : {
        params : ['reportMap'],
        types : ['list'],
        objInfo: {
            params: ['value'],
            types: ['uint8'],
            objLen: 1
        }
    },
    '0x2a4c' : {
        params : ['hidCtrl'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a4d' : {
        params : ['report'],
        types : ['list'],
        objInfo: {
            params: ['value'],
            types: ['uint8'],
            objLen: 1
        }
    },
    '0x2a4e' : {
        params : ['protocolMode'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a4f' : {
        params : ['leScanInterval', 'leScanWindow'],
        types : ['uint16', 'uint16'],
        bufLen: 4
    },
    '0x2a50' : {
        params : ['vendorIDSource', 'vendorID', 'productID', 'productVersion'],
        types : ['uint8', 'uint16', 'uint16', 'uint16'],
        bufLen: 7
    },
    '0x2a51' : {
        params : ['feature'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a52' : {
        params : ['opcode', 'operator', 'operand'],
        types : ['uint8', 'uint8', 'uint8'],
        bufLen: 3
    },
    '0x2a53' : {
        params : ['flags', 'speed', 'cadence'],
        types : ['uint8', 'uint16', 'uint8'],
        extra: {
            params : [ 'strideLength', 'totalDist'],
            types : ['uint16', 'uint32'],
            flags: [0x01, 0x02],
            result: [0x01, 0x02]
        },
        bufLen: [4, 10]
    },
    '0x2a54' : {
        params : ['feature'],
        types : ['uint16'],
        bufLen: 2
    },
    // '0x2a55' : {
    //     params : ['opcode'],
    //     types : ['uint8'],
    //     extra: {      //variable                                           //variable
    //         params : ['Cumulative', 'SensorLocation', 'ReqOpcode', 'Rsp', 'RspParameter'],
    //         types : ['string', 'uint8', 'uint8', 'uint8', 'string'],
    //         result: [1, 3, 16, 16, 16]
    //     }
    // },
    '0x2a56' : {
        params : ['digital'],
        types : ['uint8'], //bit2,
        bufLen: 1
    },
    '0x2a58' : {
        params : ['analog'],
        types : ['uint16'],
        bufLen: 2
    },
    // '0x2a5a' : {
    //     params : ['InputBits', 'AnalogInput'],
    //     types : ['uint8', 'uint16'] //bit2
    // },
    '0x2a5b' : {
        params : ['flags'],
        types : ['uint8'],
        extra: {
            params : ['cumulativeWheelRev', 'lastWheelEventTime', 'cumulativeCrankRev', 'lastCrankEventTime'],
            types : ['uint32', 'uint16', 'uint16', 'uint16'],
            flags: [0x01, 0x01, 0x02, 0x02],
            result: [0x01, 0x01, 0x02, 0x02]
        }
    },
    '0x2a5c' : {
        params : ['feature'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a5d' : {
        params : ['sensorLocation'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a5e' : {
        params : ['flags', 'spotCheckSpO2', 'spotCheckPr'],
        types : ['uint8', 'sfloat', 'sfloat'],
        extra: {
            params : ['year', 'month', 'day', 'hours', 'minutes', 'seconds', 'measureStatus', 'deviceAndSensorStatus', 'pulseAmpIndex'],
            types : ['uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint16', 'uint24', 'sfloat'],
            flags: [0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x04, 0x08],
            result: [0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x04, 0x08]
        }
    },
    '0x2a5f' : {
        params : ['flags', 'normalSpO2', 'normalPR'],
        types : ['uint8', 'sfloat', 'sfloat'],
        extra: {
            params : ['fastSpO2', 'fastPR', 'slowSpO2', 'slowPR', 'measureStatus', 'deviceAndSensorStatus', 'pulseAmpIndex'],
            types : ['sfloat', 'sfloat', 'sfloat', 'sfloat', 'uint16', 'uint24', 'sfloat'],
            flags: [0x01, 0x01, 0x02, 0x02, 0x04, 0x08, 0x10],
            result: [0x01, 0x01, 0x02, 0x02, 0x04, 0x08, 0x10]
        }
    },
    //TODO Optional
    // '0x2a63' : {
    //     params : ['flags', 'InstantaneousPower'],
    //     types : ['uint8', 'int16'],
    //     extra: {
    //         params : [],
    //         types : [],
    //         flags: [],
    //         result: []
    //     }
    // },
    // TODO Optional
    // '0x2a64' : {
    //     params : ['flags'],
    //     types : ['uint8'],
    //     extra: {
    //         params : ['CumulativeCrankRevolution', 'LastCrankEventTime', 'FirstCrankMeasurementAngle', 'InstantaneousForceMagnitudeArray', 'Instantaneous Torque Magnitude Array'],
    //         types : ['uint16', 'uint16'],
    //         flags: [0x01, 0x01],
    //         result: [0x01, 0x01]
    //     }
    // },
    '0x2a65' : {
        params : ['feature'],
        types : ['uint32'],
        bufLen: 4
    },
    // TODO variable
    // '0x2a66' : {
    //     params : ['flags'],
    //     types : ['uint8'],
    //     extra: {
    //         params : [],
    //         types : [],
    //         flags: [],
    //         result: [7
    //     }
    // },
    //TODO Optional
    '0x2a67' : {
        params : ['flags'],
        types : ['uint8'],
        extra: {
            params : ['instantSpeed', 'totalDist', 'latitude', 'longitude', 'elevation', 'heading', 'rollingTime', 'year', 'month', 'day', 'hours', 'minutes', 'seconds'],
            types : ['uint16', 'uint24', 'int32', 'int32', 'int24', 'uint16', 'uint8', 'uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
            flags: [0x01, 0x02, 0x04, 0x04, 0x08, 0x10, 0x20, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40],
            result: [0x01, 0x02, 0x04, 0x04, 0x08, 0x10, 0x20, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40]
        }
    },
    //TODO Optional
    '0x2a68' : {
        params : ['flags', 'bearing', 'heading'],
        types : ['uint8', 'uint16', 'uint16'],
        extra: {
            params : ['remainingDist', 'remainingVertDist', 'year', 'month', 'day', 'hours', 'minutes', 'seconds'],
            types : ['uint24', 'int24', 'uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
            flags: [0x01, 0x02, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
            result: [0x01, 0x02, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04]
        }
    },
    //TODO Optional
    '0x2a69' : {
        params : ['flags'],
        types : ['uint8'],
        extra: {
            params : ['beaconsInSolution', 'beaconsInView', 'timeToFirstFix', 'ehpe', 'evpe', 'hdop', 'vdop'],
            types : ['uint8', 'uint8', 'uint16', 'uint32', 'uint32', 'uint8', 'uint8'],
            flags: [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40],
            result: [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40]
        }
    },
    '0x2a6a' : {
        params : ['feature'],
        types : ['uint32'],
        bufLen: 4
    },
    //TODO variable
    // '0x2a6b' : {
    //     params : ['flags'],
    //     types : ['uint8'],
    //     extra: {
    //         params : [],
    //         types : [],
    //         flags: [],
    //         result: []
    //     }
    // },
    '0x2a6c' : {
        params : ['elevation'],
        types : ['int24'],
        bufLen: 3
    },
    '0x2a6d' : {
        params : ['pressure'],
        types : ['uint32'],
        bufLen: 4
    },
    '0x2a6e' : {
        params : ['temp'],
        types : ['int16'],
        bufLen: 2
    },
    '0x2a6f' : {
        params : ['humidity'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a70' : {
        params : ['trueWindSpeed'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a71' : {
        params : ['trueWindDirection'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a72' : {
        params : ['apparentWindSpeed'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a73' : {
        params : ['apparentWindDirection'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a74' : {
        params : ['gustFactor'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a75' : {
        params : ['pollenConc'],
        types : ['uint24'],
        bufLen: 3
    },
    '0x2a76' : {
        params : ['uvIndex'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a77' : {
        params : ['irradiance'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a78' : {
        params : ['rainfall'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a79' : {
        params : ['windChill'],
        types : ['int8'],
        bufLen: 1
    },
    '0x2a7a' : {
        params : ['heatIndex'],
        types : ['int8'],
        bufLen: 1
    },
    '0x2a7b' : {
        params : ['dewPoint'],
        types : ['int8'],
        bufLen: 1
    },
    '0x2a7d' : {
        params : ['flag', 'uuid'],
        types : ['uint16', 'uuid']
    },
    '0x2a7e' : {
        params : ['lowerLimit'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a7f' : {
        params : ['threshold'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a80' : {
        params : ['age'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a81' : {
        params : ['lowerLimit'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a82' : {
        params : ['upperLimit'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a83' : {
        params : ['threshold'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a84' : {
        params : ['upperLimit'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a85' : {
        params : ['year', 'month', 'day'],
        types : ['uint16', 'uint8', 'uint8'],
        bufLen: 4
    },
    '0x2a86' : {
        params : ['year', 'month', 'day'],
        types : ['uint16', 'uint8', 'uint8'],
        bufLen: 4
    },
    '0x2a87' : {
        params : ['emailAddr'],
        types : ['string']
    },
    '0x2a88' : {
        params : ['lowerLimit'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a89' : {
        params : ['upperLimit'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a8a' : {
        params : ['firstName'],
        types : ['string']
    },
    '0x2a8b' : {
        params : ['veryLightAndLight', 'lightAndModerate', 'moderateAndHard', 'hardAndMax'],
        types : ['uint8', 'uint8', 'uint8', 'uint8'],
        bufLen: 4
    },
    '0x2a8c' : {
        params : ['gender'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a8d' : {
        params : ['heartRateMax'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a8e' : {
        params : ['height'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a8f' : {
        params : ['hipCircumference'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a90' : {
        params : ['lastName'],
        types : ['string']
    },
    '0x2a91' : {
        params : ['maxHeartRate'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a92' : {
        params : ['restingHeartRate'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a93' : {
        params : ['sportType'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a94' : {
        params : ['lightAndModerate', 'moderateAndHard'],
        types : ['uint8', 'uint8'],
        bufLen: 2
    },
    '0x2a95' : {
        params : ['fatburnAndFitness'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a96' : {
        params : ['vo2Max'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a97' : {
        params : ['waistCir'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a98' : {
        params : ['weight'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2a99' : {
        params : ['changeIncrement'],
        types : ['uint32'],
        bufLen: 4
    },
    '0x2a9a' : {
        params : ['userIndex'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2a9b' : {
        params : ['feature'],
        types : ['uint32'],
        bufLen: 4
    },
    '0x2a9c' : {
        params : ['flags', 'bodyFatPercent'],
        types : ['uint16', 'uint16'],
        extra: {
            params : ['year', 'month', 'day', 'hours', 'minutes', 'seconds', 'userID', 'basalMetabolism', 'musclePercent', 'muscleMassKg', 'muscleMassPounds', 'fatFreeMassKg', 'fatFreeMassPounds', 'softLeanMassKg', 'softLeanMassPounds', 'bodyWaterMassKg', 'bodyWaterMassPounds', 'impedance', 'weightKg', 'weightPounds', 'heightMeters', 'heightInches'],
            types : ['uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16'],
            flags: [0x0002, 0x0002, 0x0002, 0x0002, 0x0002, 0x0002, 0x0004, 0x0008, 0x0010, 0x0021, 0x0021, 0x0041, 0x0041, 0x0081, 0x0081, 0x0101, 0x0101, 0x0200, 0x0401, 0x0401, 0x0801, 0x0801],
            result: [0x0002, 0x0002, 0x0002, 0x0002, 0x0002, 0x0002, 0x0004, 0x0008, 0x0010, 0x0020, 0x0021, 0x0040, 0x0041, 0x0080, 0x0081, 0x0100, 0x0101, 0x0200, 0x0400, 0x0401, 0x0800, 0x0801]
        }
    },
    '0x2a9d' : {
        params : ['flags'],
        types : ['uint8'],
        extra: {
            params : ['weightSI', 'weightImperial', 'year', 'month', 'day', 'hours', 'minutes', 'seconds', 'userID', 'bmi', 'heightSI', 'heightImperial'],
            types : ['uint16', 'uint16', 'uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint16', 'uint16', 'uint16'],
            flags: [0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04, 0x08, 0x08 + 0x01, 0x08 + 0x01],
            result: [0x00, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x04, 0x08, 0x08, 0x08 + 0x01]
        }
    },
    '0x2a9e' : {
        params : ['feature'],
        types : ['uint32'],
        bufLen: 4
    },
    '0x2a9f' : {
        params : ['opcode', 'parameter'],
        types : ['uint8', 'buffer'],
        preBufLen: 1  
    },
    '0x2aa0' : {
        params : ['xAxis', 'yAxis'],
        types : ['int16', 'int16'],
        bufLen: 4
    },
    '0x2aa1' : {
        params : ['xAxis', 'yAxis', 'zAxis'],
        types : ['int16', 'int16', 'int16'],
        bufLen: 6
    },
    '0x2aa2' : {
        params : ['language'],
        types : ['string']
    },
    '0x2aa3' : {
        params : ['barometricPresTrend'],
        types : ['uint8'],
        bufLen: 1
    },
    //TODO variable
    // '0x2aa4' : {
    //     params : ['flags'],
    //     types : ['uint8'],
    //     extra: {
    //         params : [],
    //         types : [],
    //         flags: [],
    //         result: []
    //     }
    // },
    '0x2aa5' : {
        params : ['feature'],
        types : ['uint24'],
        bufLen: 3
    },
    '0x2aa6' : {
        params : ['addrResolutionSup'],
        types : ['uint8'],
        bufLen: 1
    },
    //TODO variable
    // '0x2aa7' : {
    //     params : ['flags'],
    //     types : ['uint8'],
    //     extra: {
    //         params : [],
    //         types : [],
    //         flags: [],
    //         result: []
    //     }
    // },
    '0x2aa8' : {
        params : ['feature', 'type', 'sampleLocation', 'e2eCrc'],
        types : ['uint24', 'nibble', 'nibble', 'uint16']
    },
    //TODO E2E-CRC
    // '0x2aa9' : {
    //     params : ['timeOffset', 'cgmStatus'],
    //     types : ['uint16', 'uint24'],
    //     extra: {
    //         params : ['e2eCrc'],
    //         types : ['uint16']
    //     }
    // },
    //TODO E2E-CRC
    // '0x2aaa' : {
    //     params : ['year', 'month', 'day', 'hours', 'minutes', 'seconds', 'timeZone', 'dstOffset'],
    //     types : ['uint16', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'int8', 'uint8'],
    //     extra: {
    //         params : ['e2eCrc'],
    //         types : ['uint16']
    //     }
    // },
    //TODO E2E-CRC
    // '0x2aab' : {
    //     params : ['cgmSessionRunTime'],
    //     types : ['uint16'],
    //     extra: {
    //         params : ['e2eCrc'],
    //         types : ['uint16']
    //     }
    // },
    //TODO E2E-CRC & variable
    // '0x2aac' : {
    //     params : ['opcode', 'opcodeRsp', 'operand'],
    //     types : ['uint8', 'uint8', 'variable'],
    //     extra: {
    //         params : ['e2eCrc'],
    //         types : ['uint16']
    //     }
    // },
    '0x2aad' : {
        params : ['indoorPosition'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2aae' : {
        params : ['latitude'],
        types : ['int32'],
        bufLen: 4
    },
    '0x2aaf' : {
        params : ['longitude'],
        types : ['int32'],
        bufLen: 4
    },
    '0x2ab0' : {
        params : ['localNorthCoordinate'],
        types : ['int16'],
        bufLen: 2
    },
    '0x2ab1' : {
        params : ['localEastCoordinate'],
        types : ['int16'],
        bufLen: 2
    },
    '0x2ab2' : {
        params : ['floorNum'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2ab3' : {
        params : ['altitude'],
        types : ['uint16'],
        bufLen: 2
    },
    '0x2ab4' : {
        params : ['uncertainty'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2ab5' : {
        params : ['locationName'],
        types : ['string']
    },
    '0x2ab6' : {
        params : ['uri'],
        types : ['string']
    },
    '0x2ab7' : {
        params : ['httpHeaders'],
        types : ['string']
    },
    '0x2ab8' : {
        params : ['statusCode', 'dataStatus'],
        types : ['uint16', 'uint8'],
        bufLen: 3
    },
    '0x2ab9' : {
        params : ['httpEntityBody'],
        types : ['string']
    },
    '0x2aba' : {
        params : ['opcode'],
        types : ['uint8'],
        bufLen: 1
    },
    '0x2abb' : {
        params : ['httpsSecurity'],
        types : ['boolean']
    },
    '0x2abc' : {
        params : ['opcode', 'organizationID', 'parameter'],
        types : ['uint8', 'uint8', 'buffer'],
        preBufLen: 2
    },
    '0x2abd' : {
        params : ['oacpFeatures', 'olcpFeatures'],
        types : ['uint32', 'uint32'],
        bufLen: 4
    },
    '0x2abe' : {
        params : ['objectName'],
        types : ['string']
    },
    '0x2abf' : {
        params : ['objectType'],
        types : ['uuid']
    },
    '0x7890' : {
        params : ['prop', 'hdl', 'uuid'],
        types : ['uint8', 'uint16', 'uuid']
    }
};

module.exports = hciCharMeta;
