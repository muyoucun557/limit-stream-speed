##在通过流传输数据时，怎么控制数据的传输速度

###Stream中的pause和resume方法
* 在stream中可读流的pause方法能够停止'data'事件的触发，也就是停止了可读流的数据流出。
* 在Stream中可读流的resume方法能够恢复'data'事件的输出，也就是恢复了可读流的数据流出。

编写了下面代码:限定了最大速度为30MB/S，每隔0.5秒将传输速度写入到日志文件中。（可参看rsThrottle.js）
```javascript
'use strict'
const fs = require("fs");

const fd = fs.openSync("log.txt",'w');	//日志文件fd
const speedMax = 30 * 1024 * 1024; //限定的最大速度 10MB/S
const outPath = "./file/1.mkv";
const inPath = "./file/2.mkv";
const startTime = Date.now()/1000; //换算成S
var size = 0;	//计数器，存储已copy的字节数

const rs = fs.createReadStream(outPath);
const ws = fs.createWriteStream(inPath);

const timer = setInterval(function(){
	const now = Date.now();
	// 计算整个耗时
	const speed = size/(now/1000 - startTime);	//换算成Byte/S
	fs.appendFile(fd,"speed:"+(speed/1024/1024).toFixed(2)+'MB/S\r\n',(err)=>{
		if(err) throw err;
	});
	console.log("speed:"+(speed/1024/1024).toFixed(2)+'MB/S');
	if(speed >speedMax){
		rs.pause();
	}else{
		rs.resume();
	}
},500);

rs.on('data',(data)=>{
	size += data.length;
	ws.write(data);
});

rs.on('end',()=>{
	var endTime = Date.now();
	clearInterval(timer);
	console.log('总共耗时'+(endTime/1000-startTime)+"s");
	fs.appendFile(fd,'总共耗时'+(endTime/1000-startTime).toFix(2)+"s",(err)=>{
		if(err) throw err;
		fs.close(fd);
	});
});
```
经过运行上述代码，查看日志文件存在下面1个问题

* 程序运行之初，数据传输速度非常快，然后逐渐减慢，最后趋于30MB/S左右的速度。在此测试中，我使用的是大文件（1.73GB的电影），那么如果使用的小文件，就会存在限制不了传输的速度。经使用100MB以内的小文件使用测试，其传输速度达到了60MB/S以上，有些甚至达到了180MB/S。很明显，通过间歇计时器来执行测速器是不可取的。如果将间歇计时器的执行时间间隔设置的很小，则能提高控制速度的精度，但是这样会损耗性能，如果设置的过大会降低精度。毫无疑问，在'data'事件触发的时候，执行测速器是最好的。于是做了修改。（可参看rsThrottle1.js）

```javascript
'use strict'
const fs = require('fs');
const fd = fs.openSync("log.txt",'w');	//日志文件fd
const speedMax = 10*1024*1024;	//限定最大速度10MB。
var outPath = './file/1.mkv';
var inPath = './file/2.mkv';
const startTime = Date.now();	
var size = 0;

const rs = fs.createReadStream(outPath);
const ws = fs.createWriteStream(inPath);

rs.on('data',(chunk)=>{
	ws.write(chunk);
	size += chunk.length;
	if( isToofast() ){	// isToofast函数来检测copy速度是否超过了限定速度
		rs.pause();
		const timerId = setInterval(function(){
			const time = (Date.now() -startTime)/1000;
			const speed = (size/time).toFixed(2);
			if(speed<speedMax){
				clearInterval(timerId);
				rs.resume();
			}
		},100);
	}
});
rs.on('end',()=>{
	const time = (Date.now()-startTime)/1000;
	fs.close(fd,(err)=>{
		if(err) throw err;
	});
	console.log('end copy,total time:'+time);
});

//检测是否速度过快
function isToofast(){
	const time = (Date.now() -startTime)/1000;
	const speed = (size/time).toFixed(2);
	console.log('speed:'+(speed/1024/1024).toFixed(4)+"MB/S");
	fs.appendFile(fd,"speed:"+(speed/1024/1024).toFixed(2)+'MB/S\r\n',(err)=>{
		if(err) throw err;
	});
	return (speed==speedMax) || (speed>speedMax); 
}
```

* 经测试，无论大小的文件，都能将速度控制在精准的范围
* 上述代码应当修改一下，使其具有面向对象的思想。 （可参看rsThrottle.js）
```javascript

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

const t = new Throttle('./file/1.mkv', 10);
const ws = fs.createWriteStream('./file/2.mkv');

t.on('data',(chunk)=>{
	ws.write(chunk);
});
```

