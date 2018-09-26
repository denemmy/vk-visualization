var maxMsgToLoad=1500;

var startId=parseInt(Args.startId);
var msgToLoad=parseInt(Args.msgToLoad);

if(msgToLoad > maxMsgToLoad) msgToLoad=maxMsgToLoad;
var msgToLoadPerCall=100;

var msg_array = [];
var totalCount = 0;
while(msgToLoad > 0) {
    var message_ids=[];
    var i=startId;
    var loadNow=msgToLoadPerCall;
    if(msgToLoad<loadNow) loadNow=msgToLoad;
    var left=loadNow;
    while(i < startId + loadNow) {
        if(left<10) {
            message_ids = message_ids + [i];
            i=i+1;
        }
        else {
            message_ids = message_ids + [i,i+1,i+2,i+3,i+4,i+5,i+6,i+7,i+8,i+9];
            i=i+10;
            left=left-10;
        }
    }
    var resp = API.messages.getById({"message_ids":message_ids,preview_length:0});
    var count = loadNow;
    var actual_count = resp.count;

    totalCount = totalCount + actual_count;

    msg_array = msg_array + resp.items;
    startId = startId + count;
    msgToLoad = msgToLoad - count;
}

return msg_array;