'use strict'
const fs = require('fs');
const fd = fs.openSync("log.txt",'w');	//日志文件fd
const speedMax = 30*1024*1024;	//限定最大速度10MB。
var outPath = './file/1.itcast';
var inPath = './file/2.itcast';
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

//上述代码没有贯彻面向对象的思想，在rsThrottle2.js中重构该段代码