define(['brease/enum/IAT_Enum'], function (IAT_Enum) {

    'use strict';

    /** 
    * @enum {Integer} brease.controller.objects.ContentStatus
    * @alternateClassName ContentStatus
    */
    /** 
    * @property {Integer} notExistent=-2
    */
    /** 
    * @property {Integer} deactivated=-1
    */
    /** 
    * @property {Integer} initialized=0
    */
    /** 
    * @property {Integer} activatePending=1
    */
    /** 
    * @property {Integer} active=2
    */
    /**
    * @property {Integer} preCached=3
    */
    var ContentStatus = new IAT_Enum({
        notExistent: -2,
        deactivated: -1,
        initialized: 0,
        activatePending: 1,
        active: 2,
        preCached: 3
    });

    return ContentStatus;
});
