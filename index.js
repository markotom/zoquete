 'use strict';


 var tls = require('tls'),
     util = require('util'),
     Emitter = require('events').EventEmitter;



 /**
  *
  * Zoquete constructor
  *
  * @param {Object} options - Tls options reference: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
  *
  */

 function Zoquete(options) {
     this.options = options;
 }



 /**
  *
  *  Inherits from `EventEmitter`.
  *
  */
 util.inherits(Zoquete, Emitter);



 /**
  *
  * Creates a socket server tls
  *
  * @param {Function} callback - When the server has been created
  *
  */
 Zoquete.prototype.server = function(callback) {
     var self = this;
     this.server = tls.createServer(this.options, function(socket) {
         self._socket = socket;
         self._socket.setEncoding('utf8');
         self._socket.pipe(self._socket);
         self._wrapondata();
         self._socket.on('error', function(e) {
             console.log('on error');
             console.log(e);
         });

         if (typeof callback === 'function') {
             callback();
         }
     });
     this.server.listen(this.options.port);
     return this;
 };



 /**
  *
  * Creates a socket client tls
  *
  * @param {Number} port - Port number of server tls to connect
  * @param {Function} callback - When the client has connected to server
  *
  */
 Zoquete.prototype.client = function(callback) {
     this._socket = tls.connect(this.options, function() {
         if (typeof callback === 'function') {
             callback();
         }
     });
     this._socket.setEncoding('utf8');
     this._wrapondata();
     this._socket.on('error', function(e) {
         console.log('on error');
         console.log(e);
     });
     process.stdin.pipe(this._socket);
     process.stdin.resume();
     return this;
 };



 /**
  *
  * Wraps socket.wirte method
  *
  * @param {String} ev - Event name
  * @param {Object} data - JSON data to send
  * @param {Object} query - Only for get
  * @param {Function} callback - After (always) socket write
  *
  */
 Zoquete.prototype.send = function(ev, data) {
     var self = this,
         req = this._parser(ev, data);

     if (req) {
         this._socket.write(req);
         return new Promise(function(resolve, reject) {
             self.once(ev + ':done', function(data) {
                 resolve(data);
             });
             self.once(ev + ':fail', function() {
                 reject(data);
             });
         });
     }
 };



 /**
  *
  * Wraps socket.on('datat') event
  *
  */
 Zoquete.prototype._wrapondata = function() {
     var self = this;
    self._socket.on('data', function(data) {
         self._reverse(data);
     });
 };



 /*
  *
  * Convert and validate Object with format {ev: 'myevent': content: {}}
  * to string (stingify)
  *
  * @param {String} ev - Event name
  * @param {Object} data - JSON data to send
  *
  * @returns {String|Boolean}
  *
  */
 Zoquete.prototype._parser = function(ev, data) {
     if (typeof ev === 'string' && typeof data === 'object') {
         return JSON.stringify({
             ev: ev,
             content: data,
         });
     }
     return false;
 };



 /*
  *
  * Validate, convert string to object and trigger the event
  *
  * @param {Object} obj - JSON data to send
  *
  * @returns {Boolen}
  *
  */
 Zoquete.prototype._reverse = function(obj) {
     var self = this;
     try {
         obj = JSON.parse(obj);
         if (obj.ev && obj.content) {
             this.emit(obj.ev, obj.content);
             return true;
         } else {
             return false;
         }
     } catch (e) {
         self._socket.emit('error', e);
         return false;
     }

 };



 module.exports = Zoquete;