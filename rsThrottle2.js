'use strict'
const fs = require('fs');
const events = require('events');
const util = require('util');

function Throttle(stream, maxSpeed){
	this.stream = stream = (typeof stream == 'string')?fs.createReadStream(stream):stream;
	this.maxSpeed = speed * 1024 * 1024;
	const size = 0;
	const stime = Date.now();
	const self = this;

	stream.on('data',(chunk)=>{
		size += size;
		if(isOverSpeed()){
			self.pause();
			const timerID = setInterval(function(){
				if( !isOverSpeed() ){
					clearInterval(timerID);
					self.resume();
				}
			},100);
		}
		this.emit('data',chunk);
	});
	stream.on('end',()=>{
		self.on('end');
	});
	function isOverSpeed(){
		const time = (Date.now() - stime)/1000;
		const speed = (size/time).toFixed(2);
		return speed > maxSpeed;
	}

}
util.inhrits(Throttle,events.EventEmitter);
Throttle.prototype.pause = function(){
	this.stream.pause();
}
Throttle.prototype.resume = function(){
	this.stream.resume();
}

/***测试***/
const t = new Throttle('./file/1.mkv', 10);
const ws = fs.createWriteStream('./file/2.mkv');

t.on('data',(chunk)=>{
	ws.write(chunk);
});

