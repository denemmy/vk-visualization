logTimer = (new Date()).getTime();
function debugLog(msg)  {
	var time = '[' + (((new Date()).getTime() - logTimer) / 1000) + ']';
	console.log(time + ' ' + msg);
}