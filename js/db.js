
var ls = {
  set: function(k, v) {
    localStorage.setItem(k, v);
  },
  get: function(k) {
    return localStorage.getItem(k);
  },
  setJSON: function(k, v) {
    ls.set(k, JSON.stringify(v));
  },
  getJSON: function(k) {
    return JSON.parse(ls.get(k));
  },
  del: function(k) {
    localStorage.removeItem(k);
  }
};


var database = {

	dbSize: 10 * 1024 * 1024,
	db: null,
	open: function() {
		this.db = openDatabase('v_s_' + ABOUT.version, '1.0', 'database for storing app data', this.dbSize);
	},
	createTables: function() {
		this.db.transaction(function(tx) {
			//users info table
			var sqlStatement = 'CREATE TABLE IF NOT EXISTS usersInfo ' +
			'(uid INTEGER PRIMARY KEY NOT NULL, first_name TEXT, last_name TEXT, screen_name TEXT, photo_50 TEXT, photo_100 TEXT)';
			tx.executeSql(sqlStatement);

			//chats info table
			var sqlStatement = 'CREATE TABLE IF NOT EXISTS chatsInfo ' +
			'(chat_id INTEGER PRIMARY KEY NOT NULL, title TEXT, users TEXT, photo_50 TEXT, photo_100 TEXT)';
			tx.executeSql(sqlStatement);

			//messages table
			sqlStatement = 'CREATE TABLE IF NOT EXISTS messages ' +
			'(mid INTEGER PRIMARY KEY ASC NOT NULL, uid INTEGER, date INTEGER, out INTEGER, chat_id INTEGER, len INTEGER)';
			tx.executeSql(sqlStatement);
		});
	},
	deleteTables: function() {
		this.db.transaction(function(tx) {
			//users info table
			var sqlStatement = 'DROP TABLE usersInfo ';
			tx.executeSql(sqlStatement);

			//users info table
			var sqlStatement = 'DROP TABLE chatsInfo ';
			tx.executeSql(sqlStatement);

			//messages table
			sqlStatement = 'DROP TABLE messages ';
			tx.executeSql(sqlStatement);
		});
	},
	storeUsersInfo: function(usersProfiles, callback, errorCallback) {
		this.db.transaction(function(tx) {
			var errorCallbackCalled = false;
			var sqlStatement = 'INSERT OR IGNORE INTO usersInfo' +
			'(uid, first_name, last_name, screen_name, photo_50, photo_100) VALUES (?, ?, ?, ?, ?, ?)';

			var insertsNum = 0;
			var errorHandler = function(tx, r) {

			};
			for(var i = 0; i < usersProfiles.length; i++) {
				var profile = usersProfiles[i];
				var values = [profile.uid, profile.first_name, profile.last_name,
							  profile.screen_name, profile.photo_50, profile.photo_100];

				tx.executeSql(sqlStatement, values, function(tx, r) {
					insertsNum++;
					if(insertsNum >= usersProfiles.length) {
						callback();
					}
				}, function(tx, r) {
					if(!errorCallbackCalled) {
						errorCallbackCalled = true;
						database.onError(tx, r);
						errorCallback();
					}
				});
			}
		});
	},
	storeChatsInfo: function(chatsInfo, callback, errorCallback) {
		this.db.transaction(function(tx) {
			var errorCallbackCalled = false;
			var sqlStatement = 'INSERT OR IGNORE INTO chatsInfo' +
			'(chat_id, title, users, photo_50, photo_100) VALUES (?, ?, ?, ?, ?)';

			var insertsNum = 0;
			var errorHandler = function(tx, r) {

			};
			for(var i = 0; i < chatsInfo.length; i++) {
				var chatInfo = chatsInfo[i];
				if(!chatInfo.photo_50) {
					chatInfo.photo_50 = null;
				}
				if(!chatInfo.photo_100) {
					chatInfo.photo_100 = null;
				}
				var values = [chatInfo.chat_id, chatInfo.title, chatInfo.users.join(','), chatInfo.photo_50, chatInfo.photo_100];

				tx.executeSql(sqlStatement, values, function(tx, r) {
					insertsNum++;
					if(insertsNum >= chatsInfo.length) {
						callback();
					}
				}, function(tx, r) {
					if(!errorCallbackCalled) {
						errorCallbackCalled = true;
						database.onError(tx, r);
						errorCallback();
					}
				});
			}
		});
	},
	storeMsgData: function(msgData, callback, errorCallback) {
		this.db.transaction(function(tx) {
			var errorCallbackCalled = false;
			var insertsMax = msgData.uids.length;
			var insertsNum = 0;
			//insert messages
			var sqlStatement = 'INSERT OR IGNORE INTO messages' +
			'(mid, uid, date, out, chat_id, len) VALUES (?, ?, ?, ?, ?, ?)';
			var mid, uid, data, out, values, len;
			for(var i = 0; i < msgData.uids.length; i++) {
				mid = msgData.mids[i]; date = msgData.date[i];
				uid = msgData.uids[i]; out  = msgData.out[i];
				chat_id = msgData.chat_ids[i]; len = msgData.len[i];
				values = [mid, uid, date, out, chat_id, len];
				tx.executeSql(sqlStatement, values, function(tx, r) {
					insertsNum++;
					if(insertsNum >= insertsMax) {
						callback();
					}
				}, function(tx, r) {
					if(!errorCallbackCalled) {
						errorCallbackCalled = true;
						database.onError(tx, r);
						errorCallback();
					}
				});
			}
			delete msgData;
		});
	},
	loadUsersInfo: function(callback, errorCallback) {
		this.db.transaction(function(tx) {
			var errorCallbackCalled = false;
			var usersProfiles = [];
			var sqlStatement = 'SELECT * FROM usersInfo'
			tx.executeSql(sqlStatement, [], function(tx, r) {
				var profile;
				for(var i = 0; i < r.rows.length; i++) {
					row = r.rows.item(i);
					profile = {};
					profile.uid = row.uid;
					profile.first_name = row.first_name;
					profile.last_name = row.last_name;
					profile.screen_name = row.screen_name;
					profile.photo_50 = row.photo_50;
					profile.photo_100 = row.photo_100;
					usersProfiles.push(profile);
				}
				callback(usersProfiles);
			}, function(tx, r) {
				if(!errorCallbackCalled) {
					errorCallbackCalled = true;
					database.onError(tx, r);
					errorCallback();
				}
			});
		});
	},
	loadChatsInfo: function(callback, errorCallback) {
		this.db.transaction(function(tx) {
			var errorCallbackCalled = false;
			var chatsInfo = [];
			var sqlStatement = 'SELECT * FROM chatsInfo'
			tx.executeSql(sqlStatement, [], function(tx, r) {
				var chatInfo;
				for(var i = 0; i < r.rows.length; i++) {
					var row = r.rows.item(i);
					chatInfo = {};
					var users = [];
					if(row.users.length > 0) {
						users = row.users.split(',');
					}
					chatInfo.users = users;
					chatInfo.chat_id = row.chat_id;
					chatInfo.photo_50 = row.photo_50;
					chatInfo.photo_100 = row.photo_100;
					chatInfo.title = row.title;
					chatsInfo.push(chatInfo);
				}
				callback(chatsInfo);
			}, function(tx, r) {
				if(!errorCallbackCalled) {
					errorCallbackCalled = true;
					database.onError(tx, r);
					errorCallback();
				}
			});
		});
	},
	loadMsgData: function(callback, errorCallback) {

		var msgData = {};
		msgData.uids = []; msgData.mids = [];
		msgData.date = []; msgData.out = [];
		msgData.chat_ids = [];
		msgData.len = [];

		this.db.transaction(function(tx) {
			var errorCallbackCalled = false;
			var sqlStatement = 'SELECT * FROM messages';
			tx.executeSql(sqlStatement, [], function(tx, r) {
				var row;
				for(var i = 0; i < r.rows.length; i++) {
					row = r.rows.item(i);
					msgData.uids.push(row.uid);
					msgData.mids.push(row.mid);
					msgData.date.push(row.date);
					msgData.out.push(row.out);
					msgData.chat_ids.push(row.chat_id);
					msgData.len.push(row.len);
				}
				callback(msgData);

			}, function(tx, r) {
				if(!errorCallbackCalled) {
					errorCallbackCalled = true;
					database.onError(tx, r);
					errorCallback();
				}
			});
		});
	},
	onError: function(tx, e) {
		console.log('database error: ' + e.message);
	}
};

database.open();