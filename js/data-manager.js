
var account = {
    accessToken: '',
    userId: '',
    isAuth: false,
    profile: {},
    userInfoKey: 'user_info_key',
    loadLS: function() {
        var userData = ls.getJSON(account.userInfoKey);
        if(userData) {
            account.isAuth = true;
            account.userId = userData.userId;
            account.accessToken = userData.accessToken;
            account.profile = userData.profile;
        }
    },
    storeLS: function() {
        ls.setJSON(account.userInfoKey, {
            accessToken: account.accessToken,
            userId: account.userId,
            profile: account.profile
        });
    },
    clearData: function() {
        account.accessToken = '';
        account.profile = {};
        account.userId = '';
        account.isAuth = false;
        ls.del(account.userInfoKey);
    }
}

dataManager = new function() {

	var dm = this;
 	var inited = false;

    dm.init = function() {
        debugLog('init data manager');

        dm.isUsersInfoLoaded = false;
        dm.isMsgDataLoaded = false;

        dm.msgNumReal = 0;
        dm.msgLastId = 0;

        dm.usersData = [];
        dm.usersDataRefByUid = {};

        dm.chatsData = [];
        dm.chatsDataRefById = {};

        dm.msgData = [];
        dm.msgData.uids = [];
        dm.msgData.mids = [];
        dm.msgData.date = [];
        dm.msgData.out = [];
        dm.msgData.chat_ids = [];
        dm.msgData.len = [];

        database.createTables();

        inited = true;
    }
    dm.addMsgData = function(msgDataChunk) {

        if(!inited) {
            return;
        }
        //append
        dm.msgData.uids = dm.msgData.uids.concat(msgDataChunk.uids);
        dm.msgData.mids = dm.msgData.mids.concat(msgDataChunk.mids);
        dm.msgData.date = dm.msgData.date.concat(msgDataChunk.date);
        dm.msgData.out = dm.msgData.out.concat(msgDataChunk.out);
        dm.msgData.chat_ids = dm.msgData.chat_ids.concat(msgDataChunk.chat_ids);
        dm.msgData.len = dm.msgData.len.concat(msgDataChunk.len);

        database.storeMsgData(msgDataChunk, function() {
            debugLog('message data is saved');
        }, function() {
            debugLog('error: messages are not saved');
        });

        delete msgDataChunk;
    }
    dm.addUsersInfoData = function(usersProfiles) {

        dm.usersData = dm.usersData.concat(usersProfiles);
        database.storeUsersInfo(usersProfiles, function() {
            //on success
            debugLog('users profiles are saved');

        }, function() {
            //on error
            debugLog('error: users profiles are not saved');
        });
    }
    dm.addChatsInfoData = function(chatsInfo) {
        dm.chatsData = dm.chatsData.concat(chatsInfo);
        database.storeChatsInfo(chatsInfo, function() {
            //on success
            debugLog('chats info is saved');

        }, function() {
            //on error
            debugLog('error: chats info is not saved');
        });
    }
    dm.processUsersData = function() {
        //usersData reference
        dm.usersDataRefByUid = {};
        for(var i = 0; i < dm.usersData.length; i++) {
            dm.usersData[i].isChat = false;
            var uid = dm.usersData[i].uid;
            dm.usersDataRefByUid[uid] = i;
        }
        debugLog('users data processed, users number: ' + dm.usersData.length);
    }
    dm.processChatsData = function() {

        dm.usersUids = dm.topUids.slice(0);

        //chatsData reference
        dm.chatsDataRefById = {};
        for(var i = 0; i < dm.chatsData.length; i++) {
            dm.chatsData[i].isChat = true;
            var chat_id = dm.chatsData[i].chat_id;
            dm.chatsDataRefById[chat_id] = i;
            var users_ids = dm.chatsData[i].users;
            for(var k = 0; k < users_ids.length; k++) {
                var uid = parseInt(users_ids[k]);
                if(!dm.uniqueUids[uid]) {
                    dm.uniqueUids[uid] = 1;
                    dm.usersUids.push(uid);
                }
            }
        }

        debugLog('chat data processed, chat number: ' + dm.chatsData.length);
    }
	dm.processMsgData = function() {

        if(!inited) {
            return;
        }
        var timeStarted = (new Date()).getTime();
        debugLog('processMsgData started');

		var data = dm.msgData;

        //remove empty (deleted in vk.com) messages
        var uids = [];
        var mids = [];
        var dates = [];
        var out = [];
        var chat_ids = [];
        var len = [];

        var msgNumAll = data.uids.length;
        for(var i = 0; i < msgNumAll; i++) {
            if(data.uids[i] > 0) {
                uids.push(data.uids[i]);
                mids.push(data.mids[i]);
                dates.push(data.date[i]);
                out.push(data.out[i]);
                chat_ids.push(data.chat_ids[i]);
                len.push(data.len[i]);
            }
        }
        delete data; delete dm.msgData;
        dm.msgData = {};
        dm.msgData.uids = uids; dm.msgData.mids = mids; dm.msgData.date = dates;
        dm.msgData.out = out;
        dm.msgData.chat_ids = chat_ids;
        dm.msgData.len = len;
        data = dm.msgData;

        debugLog('number of empty messages: ' + (msgNumAll - data.uids.length));
        debugLog('messages number left: ' + data.uids.length);

        //compute period length
        if(data.date.length > 0) {
            dm.startDate = data.date[0];
            dm.endDate = data.date[data.date.length - 1];
        }
        else {
            var currentDate = Math.round((new Date()).getTime() / 1000);
            dm.startDate = currentDate - SEC_IN_YEAR;
            dm.endDate = currentDate;
        }

        dm.periodLen = dm.endDate - dm.startDate;
        if(dm.periodLen < SEC_IN_YEAR) {
            var middleDate = dm.startDate + Math.round((dm.endDate - dm.startDate) / 2);
            var halfPeriodLen = Math.round(SEC_IN_YEAR / 2);
            dm.startDate = middleDate - halfPeriodLen;
            dm.endDate = middleDate + halfPeriodLen;
            dm.periodLen = dm.endDate - dm.startDate;
        }

		dm.topUids = [];
		dm.uidMsgs = {};
        dm.uniqueUids = {};

        dm.topChats = [];
        dm.chatMsgs = {};
        dm.uniqueChats = {};

        dm.topDialogs = [];

        //construct array of unique uids and unique chat_ids
        //and for each uid construct array of corresponding messages
        var uid;
		for(var i = 0; i < data.uids.length; i++) {
			uid = data.uids[i];
            chat_id = data.chat_ids[i];

            if(chat_id != 0) {
                //chat messages
                if(!dm.uniqueChats[chat_id]) {
                    dm.uniqueChats[chat_id] = 1;
                    dm.chatMsgs[chat_id] = [i];
                    dm.topChats.push(chat_id);
                    dm.topDialogs.push({isChat: true, chat_id: chat_id});
                }
                else {
                    dm.chatMsgs[chat_id].push(i);
                }
            }
            else {
                //user messages
                if(!dm.uniqueUids[uid]) {
                    dm.uidMsgs[uid] = [i];
                    dm.uniqueUids[uid] = 1;
                    dm.topUids.push(uid);
                    dm.topDialogs.push({isChat: false, uid: uid});
                }
                else {
                    dm.uidMsgs[uid].push(i);
                }
            }
		}

        //sorting, get topUids
        var msgNumA, msgNumB;
		dm.topUids.sort(function(a, b) {
            msgNumA = dm.uidMsgs[a].length;
            msgNumB = dm.uidMsgs[b].length;
            if(msgNumA > msgNumB) {
                return -1;
            }
            else if(msgNumA < msgNumB) {
                return 1;
            }
            else {
                return 0;
            }
        });

        //sorting, get topChats
        var msgNumA, msgNumB;
        dm.topChats.sort(function(a, b) {
            msgNumA = dm.chatMsgs[a].length;
            msgNumB = dm.chatMsgs[b].length;
            if(msgNumA > msgNumB) {
                return -1;
            }
            else if(msgNumA < msgNumB) {
                return 1;
            }
            else {
                return 0;
            }
        });


        //sorting, get topDialogs
        var msgNumA, msgNumB;
        dm.topDialogs.sort(function(a, b) {

            if(a.isChat) {
                msgNumA = dm.chatMsgs[a.chat_id].length;
            }
            else {
                msgNumA = dm.uidMsgs[a.uid].length;
            }

            if(b.isChat) {
                msgNumB = dm.chatMsgs[b.chat_id].length;
            }
            else {
                msgNumB = dm.uidMsgs[b.uid].length;
            }

            if(msgNumA > msgNumB) {
                return -1;
            }
            else if(msgNumA < msgNumB) {
                return 1;
            }
            else {
                return 0;
            }
        });

        delete data;

        //compute executing time
        var timeFinished = (new Date()).getTime();
        var timeElapsed = (timeFinished - timeStarted) / 1000;
        debugLog('processMsgData finished, elapsed: ' + timeElapsed);
	}
	dm.loadMsgDataDB = function(callback, callbackFail) {
        database.loadMsgData(function(msgData) {
            if(msgData.uids.length == 0) {
                debugLog('msg data table is empty');
                dm.isMsgDataLoaded = false;
                if(callbackFail) {
                	callbackFail();
                }
                else {
                	callback();
                }
            }
            else {
                debugLog('msg data loaded from database successfully');
                dm.msgData = msgData;
                dm.msgLastId = msgData.mids[msgData.mids.length - 1];
                dm.isMsgDataLoaded = true;
                callback();
            }
        }, function() {
            debugLog('error on loading msg data from database');
            dm.isMsgDataLoaded = false;
            if(callbackFail) {
            	callbackFail();
            }
            else {
            	callback();
            }
        });
    }
    dm.loadUsersInfoDB = function(callback, callbackFail) {
        database.loadUsersInfo(function(usersProfiles) {
            if(usersProfiles.length == 0) {
                debugLog('users info table is empty');
                dm.isUsersInfoLoaded = false;
                if(callbackFail) {
            		callbackFail();
	            }
	            else {
	            	callback();
	            }
            }
            else {
                debugLog('users info loaded from database successfully');
                dm.usersData = usersProfiles;
                dm.isUsersInfoLoaded = true;
                callback();
            }
        }, function() {
            debugLog('error on loading user info from database');
            dm.isUsersInfoLoaded = false;
            if(callbackFail) {
        		callbackFail();
            }
            else {
            	callback();
            }
        });
    }
    dm.loadChatsInfoDB = function(callback, callbackFail) {
        database.loadChatsInfo(function(chatsInfo) {
            if(chatsInfo.length == 0) {
                debugLog('chats info table is empty');
                dm.isChatsInfoLoaded = false;
                if(callbackFail) {
                    callbackFail();
                }
                else {
                    callback();
                }
            }
            else {
                debugLog('chats info loaded from database successfully');
                dm.chatsData = chatsInfo;
                dm.isChatsInfoLoaded = true;
                callback();
            }
        }, function() {
            debugLog('error on loading user info from database');
            dm.isUsersInfoLoaded = false;
            if(callbackFail) {
                callbackFail();
            }
            else {
                callback();
            }
        });
    }
    dm.clearData = function() {
        dm.msgData = {};
        dm.usersData = [];
        dm.usersDataRefByUid = {};
        dm.uidMsgs = {};
        dm.topUids = [];
        dm.topChats = [];
        dm.chatMsgs = {};
        database.deleteTables();
        inited = false;
    }
}

var dm = dataManager;