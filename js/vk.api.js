
var ajaxManager = {
    queue: [],
    wait: false,
    requestInterval: settings.VK_TIME_BETWEEN_REQUESTS,
    addRequset: function(callParams) {
        this.queue.push(callParams);
        this.call();
    },
    call: function() {
        if(this.wait) {
            return;
        }
        var callParams = this.queue.shift();
        $.ajax(callParams);
        this.wait = true;
        var self = this;
        setTimeout(function(){
            self.wait = false;
            if(self.queue.length > 0) self.call();
        }, this.requestInterval);
    }
}

var vk = {

    appId: 4388415,
    authScope: 'messages,offline',
    authRedirectUri: 'https://oauth.vk.com/blank.html',
    versionAPI: "5.81",

    TIME_BETWEEN_REQUESTS: settings.VK_TIME_BETWEEN_REQUESTS,
    TIME_BETWEEN_FAILED_REQUESTS: 3000,
    MAX_ATTEMPTS: 3,

    loadMessagesAttempt: 0,

    api: function(method, params, callbackSucc, callbackErr) {
        if(account.accessToken !== '')
            params.access_token = account.accessToken;

        params.v = vk.versionAPI;

        var apiurl = 'https://api.vk.com/method/' + method;

        var callParams = {
            url: apiurl,
            type: 'POST',
            data: params,
            timeout: 10000,
            success: function(data, textStatus, jqXHR) {
                if(data.response) {
                    callbackSucc(data);
                    data = null;
                }
                else {
                    var errorMsg = 'unknown error';
                    if(data.error.error_msg) {
                        errorMsg = data.error.error_msg;
                    }
                    callbackErr(errorMsg);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                //debugLog('request failed: ' + textStatus);
                callbackErr(textStatus);
            },
            dataType: "json"
        };

        ajaxManager.addRequset(callParams);
    },
    statTrack: function() {
        vk.api('stats.trackVisitor', {}, function(data) {
            debugLog('statTrack');
        }, function(errorMsg) {
            //error callback
            debugLog('statTrack error: ' + errorMsg);
        });
    },
    doAuth: function(callback) {

        var authUrl = 'https://oauth.vk.com/authorize?client_id=' + SYS.vkAppID;
        authUrl += '&scope=' + vk.authScope + '&redirect_uri=' + vk.authRedirectUri;
        authUrl += '&display=popup&v=' + vk.versionAPI + '&response_type=token';

        chrome.tabs.getCurrent(function(currentTab){

            chrome.tabs.create({url: authUrl}, function(vktab) {

                chrome.tabs.onUpdated.addListener(function(tid, tinfo, ttab) {
                    if (tid != vktab.id || !tinfo.url) return;

                    var url = tinfo.url;

                    if(url.indexOf('blank.html#') == -1) {
                        debugLog('doAuth error: redirect url is not valid');
                        return;
                    }

                    url = url.split('#')[1];
                    var data = url.split('&');
                    account.accessToken = data[0].split('=')[1];
                    account.userId = data[2].split('=')[1];
                    account.isAuth = true;

                    chrome.tabs.remove(vktab.id);
                    chrome.tabs.update(currentTab.id, {selected: true});
                    callback();
                });
            });
        });
    },
    logOut: function(callback) {
        account.clearData();
        dm.clearData();
        callback();
    },
    loadUserInfo: function(callback, callbackFail) {
        vk.api('users.get',
            {user_ids: account.userId, fields: 'photo_50,screen_name,photo_100'},
            function(data) {
                var response = data.response;
                var userData = response[0];

                account.profile = {
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    screen_name: userData.screen_name,
                    photo_50: userData.photo_50,
                    photo_100: userData.photo_100
                };

                callback();
            },
            function(errorMsg) {
                //error
                debugLog('loadUserInfo error: ' + errorMsg);
                if(callbackFail !== undefined) {
                    callbackFail();
                } else {
                    app.onError('loadUserInfo');
                }
            });
    },
    loadUsersInfo: function(uids, callback, callbackFail) {

        if(!account.isAuth) return;

        if(uids.length == 0) {
            dm.isUsersInfoLoaded = true;
            callback();
            return;
        }

        //get first 500 uids
        var uidsToLoad = uids.slice(0, 500);
        //make request
        vk.api('users.get', {
            user_ids : uidsToLoad.join(','),
            fields: 'photo_50,photo_100,screen_name,first_name,last_name'
        }, function(data) {

            if(!account.isAuth) return;
            var response = data.response;
            data = null;
            var profiles = response;

            //array of loaded uids
            var loadedNum = profiles.length;
            var doLoad = false;
            if(loadedNum == 0) {
                doLoad = false;
            } else {
                var uidsLoaded = [];
                var userData = [];
                for(var i = 0; i < loadedNum; i++) {
                    uidsLoaded.push(profiles[i].id);
                    var userInfo = {};
                    userInfo.uid = profiles[i].id;
                    userInfo.first_name = profiles[i].first_name;
                    userInfo.last_name = profiles[i].last_name;
                    userInfo.screen_name = profiles[i].screen_name;
                    userInfo.photo_50 = profiles[i].photo_50;
                    userInfo.photo_100 = profiles[i].photo_100;
                    userData.push(userInfo);
                }

                //get rid of loaded uids
                uids = $(uids).not(uidsLoaded).get();

                debugLog('users info loaded: ' + loadedNum);

                dm.addUsersInfoData(userData);
                profiles = [];
                userData = [];
                response = null;

                if(uids.length) {
                    doLoad = true;
                }
            }

            if(doLoad) {
                vk.loadUsersInfo(uids, callback);
                uids = [];
            }
            else {
                uids = [];
                dm.isUsersInfoLoaded = true;

                callback();
                return;
            }

        }, function(errorMsg) {
            //error
            debugLog('loadUsersInfo error: ' + errorMsg);
            if(!account.isAuth) return;
            if(callbackFail !== undefined) {
                //callback fail
                callbackFail();
            } else {
                //try again
                setTimeout(function() {
                    vk.loadUsersInfo(uids, callback);
                }, vk.TIME_BETWEEN_FAILED_REQUESTS);
            }
        });
    },
    loadChatsInfo: function(chat_ids, callback) {

        if(!account.isAuth) return;

        if(chat_ids.length == 0) {
            dm.isChatsInfoLoaded = true;
            callback();
            return;
        }

        //get first 500 uids
        var chatsToLoad = chat_ids.slice(0, 500);

        vk.api('messages.getChat', {
            chat_ids : chatsToLoad.join(',')
        }, function(data) {
            if(!account.isAuth) return;
            var response = data.response;
            data = null;
            var chatsInfo = response;

            var chatsLoadedNum = chatsInfo.length;
            var chatsLoaded = [];
            var chatsData = [];

            for(var i = 0; i < chatsLoadedNum; i++) {
                chatsLoaded.push(chatsInfo[i].id);
                var chatInfo = {};
                chatInfo.chat_id = chatsInfo[i].id;
                chatInfo.title = chatsInfo[i].title;
                chatInfo.users = chatsInfo[i].users;
                chatInfo.photo_50 = chatsInfo[i].photo_50;
                chatInfo.photo_100 = chatsInfo[i].photo_100;
                chatsData.push(chatInfo);
            }

            debugLog('chats info loaded: ' + chatsLoadedNum);

            chat_ids = $(chat_ids).not(chatsLoaded).get();

            dm.addChatsInfoData(chatsData);
            chatsData = [];
            chatsInfo = [];
            response = null;

            if(chat_ids.length) {
                vk.loadChatsInfo(chat_ids, callback);
            }
            else {
                chat_ids = [];
                dm.isChatsInfoLoaded = true;

                callback();
                return;
            }

        }, function(errorMsg) {
            //error
            debugLog('loadChatsInfo error: ' + errorMsg);
            if(!account.isAuth) return;
            setTimeout(function() {
                vk.loadChatsInfo(chat_ids, callback);
            }, vk.TIME_BETWEEN_FAILED_REQUESTS);
        });
    },
    getMsgLastId: function(callback, callbackErr) {
        var last_msg_id = 0;
        //incoming messages
        vk.api('messages.get', {
            out: 0,
            count: 1,
            preview_length: 1
        }, function(data) {
            //success callback
            if(!account.isAuth) return;

            var resp = data.response;
            if(resp.items)
            {
                last_msg_id = resp.items[0].id;
            }

            //do second call (out = 1)
            vk.api('messages.get', {
                out: 1,
                count: 1,
                preview_length: 1
            }, function(data) {
                //success
                if(!account.isAuth) return;

                var resp = data.response;
                if(resp.items)
                {
                    last_msg_id = max(last_msg_id, resp.items[0].id);
                }

                callback(last_msg_id);

            }, function(errorMsg) {
                //error callback
                debugLog('getMsgLastId error: ' + errorMsg);
                if(callbackErr)
                {
                    callbackErr();
                }
            });
        }, function(errorMsg) {
            //error callback
            debugLog('getMsgLastId error: ' + errorMsg);
            if(callbackErr)
            {
                callbackErr();
            }
        });
    },
    getMsgLastId: function(callback, callbackErr) {
        var last_msg_id = 0;
        //incoming messages
        vk.api('messages.getConversations', {
            offset: 0,
            count: 1,
            filter: 'all'
        }, function(data) {
            //success callback
            if(!account.isAuth) return;

            var resp = data.response;
            if(resp.items && resp.items.length > 0)
            {
                last_msg_id = resp.items[0].conversation.last_message_id;
            }
            callback(last_msg_id);
        }, function(errorMsg) {
            //error callback
            debugLog('getMsgLastId error: ' + errorMsg);
            if(callbackErr)
            {
                callbackErr();
            }
        });
    },
    loadMessages: function(params, callbackFrame, callbackFinished) {
        if(!account.isAuth) {
            debugLog('loadMessages interrupted: not authorized');
            return;
        }

        var startId = params.startId;
        var endId = params.endId;
        var msgToLoad = min(endId - startId + 1, 1500);

        if(msgToLoad <= 0)
        {
            callbackFinished();
            return;
        }

        vk.api('execute.loadMessagesMain', {
            "startId": startId,
            "msgToLoad": msgToLoad,
            "func_v": 2
        }, function(data) {
            //success
            if(!account.isAuth) {
                debugLog('loadMessages interrupted: not authorized');
                return;
            }

            var resp = data.response;

            var msgData = {};

            if(resp.length) {
                // add messages if not empty
                msgData.uids = [];
                msgData.mids = []; msgData.date = [];
                msgData.out = [];
                msgData.chat_ids = [];
                msgData.len = [];

                for(var i = 0; i < resp.length; i++) {
                    if(resp[i].from_id > 0 && resp[i].peer_id < 2000000000) {
                        var msgLen = resp[i].text.length;
                        var uid = resp[i].out ? resp[i].peer_id : resp[i].from_id;
                        msgData.uids.push(uid);
                        msgData.mids.push(resp[i].id);
                        msgData.date.push(resp[i].date);
                        msgData.out.push(resp[i].out);
                        msgData.len.push(msgLen);
                        msgData.chat_ids.push(0);
                    }
                }
                dm.addMsgData(msgData);
            }

            vk.loadMessagesAttempt = 0;

            //delete reference
            msgData = null;
            resp = null;
            data = null;

            var lastId = startId + msgToLoad - 1;

            if(lastId < endId) {
                params.startId = lastId + 1;
                var msgLoaded = lastId;
                var msgNum = endId;
                callbackFrame(msgLoaded, msgNum);
                vk.loadMessages(params, callbackFrame, callbackFinished);
            }
            else {
                //all messages are loaded
                callbackFinished();
                return;
            }

            /*
            function VK.execute.loadMessages(startId, msgToLoad) code:

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
                var count = resp.shift();

                totalCount = totalCount + count;

                msg_array = msg_array + resp;
                startId = startId + count;
                msgToLoad = msgToLoad - count;
            }

            var result = msg_array;

            return result;
            */

        }, function(errorMsg) {
            //error
            debugLog('loadMessages error: ' + errorMsg);
            if(vk.loadMessagesAttempt >= vk.MAX_ATTEMPTS) {
                vk.n_attempt = 0;
                debugLog('loadMessages error: reached max attempts');
                return;
            }
            vk.loadMessagesAttempt += 1;
            // callbackFinished();
            setTimeout(function() {
                //call again without changing parameters
                vk.loadMessages(params, callbackFrame, callbackFinished);
            }, vk.TIME_BETWEEN_FAILED_REQUESTS);
        });
    },
    loadOneMessage: function(mid, callback, callbackErr) {
        vk.api('messages.getById', {
            message_ids: mid,
            preview_length: settings.MAX_MSG_LEN
        }, function(data) {
            //success
            var response = data.response;
            var item = response.items[0];
            if(item != undefined && item.body != undefined) {
                callback(mid, item.body);
            }
            else {
                debugLog('loadOneMessage error: wrong mid: ' + mid);
                callbackErr();
            }

        }, function(errorMsg) {
            //error
            debugLog('loadOneMessage error: ' + errorMsg);
            callbackErr();
        });
    }
};

