"use strict";

var Service, Characteristic;

const pigpio = require('pigpio-client').pigpio();
const converter = require('color-convert');

const ready = new Promise((resolve, reject) => {
  pigpio.once('connected', resolve);
  pigpio.once('error', reject);
});

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory('homebridge-pigpio-rgbstrip-fading', 'LedStripFading', LedStripFadingAccessory);
}

function LedStripFadingAccessory(log, config) {
  this.log      = log;
  this.name     = config['name'];

  this.rPin     = config['rPin'];
  this.gPin     = config['gPin'];
  this.bPin     = config['bPin'];


  this.enabled = true;

  try {
    if (!this.rPin)
      throw new Error("rPin not set!")
    if (!this.gPin)
      throw new Error("gPin not set!")
    if (!this.bPin)
      throw new Error("bPin not set!")
  } catch (err) {
    this.log("An error has been thrown! " + err);
    this.log("homebridge-pigpio-rgbstrip-fading won't work until you fix this problem");
    this.enabled = false;
  }

  ready.then(async (info) => {
    // initialize GPIO pins for LEDs
    this.rLed = pigpio.gpio(this.rPin);
    this.gLed = pigpio.gpio(this.gPin);
    this.bLed = pigpio.gpio(this.bPin);
   
  }).catch(console.error);

}

LedStripFadingAccessory.prototype = {

  getServices : function(){

    if(this.enabled){
      let informationService = new Service.AccessoryInformation();

      informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Adam Lechowicz')
      .setCharacteristic(Characteristic.Model, 'PiGPIO-RGBStrip-Fading')
      .setCharacteristic(Characteristic.SerialNumber, '05-12-18');

      let rgbStripFadingService = new Service.Switch(this.name);

      rgbStripFadingService
          .getCharacteristic(Characteristic.On)
          .on('change',this.toggleState.bind(this));

      this.informationService = informationService;
      this.rgbStripFadingService = rgbStripFadingService;

      this.log("LEDStripFading has been successfully initialized!");

      return [informationService, rgbStripFadingService];
    }else{
      this.log("LEDStripFading has not been initialized, please check your logs..");
      return [];
    }

  },

  isOn : function() {
      return this.rgbStripFadingService.getCharacteristic(Characteristic.On).value;
  },

  toggleState : function()
  {
    if(this.enabled){
      if(this.isOn())
      {
          this.updateRGB();
      } else {
          this.rLed.waveTxStop();
          this.gLed.waveTxStop();
          this.bLed.waveTxStop();
      }
    }
  },

  updateRGB : function()
  {
    ready.then(async () => {
      await this.rLed.waveAddPulse([[1, 0, 1000000], [0, 1, 1000000]]);
      const rWave = await this.rLed.waveCreate();
      this.rLed.waveChainTx([{loop: true}, {waves: [rWave]}, {repeat: true}]);
      this.gLed.waveChainTx([{loop: true}, {waves: [rWave]}, {repeat: true}]);
      this.bLed.waveChainTx([{loop: true}, {waves: [rWave]}, {repeat: true}]);
    }).catch(console.error);
  }

}
