

//节流阀限制是10MB
'use strict'
const fs = require("fs");

const fd = fs.openSync("log.txt",'w');	//日志文件fd
const speedMax = 30 * 1024 * 1024; //限定的最大速度 10MB/S
const outPath = "./file/1.itcast";
const inPath = "./file/2.itcast";
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
	fs.close(fd,(err)=>{
		if(err) throw err;
	})
	console.log('总共耗时'+(endTime/1000-startTime)+"s");
});


//存在如下问题
//1.在程序执行的最初，速度是非常快，达到了110MB/S（个人限定最大值是10MB/S）
//----设定好限速器之后，限速器在0.1s之后才执行，在这0.1s内，程序在全速copy，拉高了前0.1秒的速度

//2.速度进入平稳期之后，速度在10MB/S左右摆动，怎么能限制在10MB/S以内呢？
//----通过设定定时器来检测copy的速度，定时器的时间间隔越大，误差越大？
//----通过修改定时器的时间间隔，得出结论：时间间隔越大，误差越大；时间间隔越小，误差越小。
//----解决方案：在rs的data事件中检测速度是否过大
//----在rsThrottle1.js中做修改

