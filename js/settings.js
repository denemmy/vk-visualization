var settings = {
	MIN_MSG_NUM: 5,
	MAX_USERS_NUM_ANIM: 150,
	MAX_USERS_NUM_STAT: 300,
	MAX_MSG_LEN: 1000,
	MAX_MSG_BALLS_NUM: 2200,
	MAX_MSG_NUM: 5000000,
	LOAD_MSG_NUM_PER_API_CALL: 150,		//inside execute code, max = 200
	LOAD_API_CALLS_PER_EXEC: 20,		//max = 25
	VK_TIME_BETWEEN_REQUESTS: 333,
	RELOAD_IMAGE_INTERVAL: 10000,
	RELOAD_IMAGE_MAX_TIMES: 3,
	DEFAULT_IMAGE_100_SRC: 'images/camera_100.gif',
	DEFAULT_IMAGE_50_SRC: 'images/camera_50.gif'
}

var userSettings = {
	lsKey: 'user_settings_1',
	maxUsersNumAnim: settings.MAX_USERS_NUM_ANIM,
	maxMsgNumAnim: settings.MAX_MSG_BALLS_NUM,
	maxUsersNumStat: settings.MAX_USERS_NUM_STAT,
	useWebGL: true,
	changed: false,
	loadLS: function() {
        var settingLoaded = ls.getJSON(userSettings.lsKey);
        if(settingLoaded) {
        	if(settingLoaded.maxUsersNumAnim !== undefined) {
        		userSettings.maxUsersNumAnim = settingLoaded.maxUsersNumAnim;
        	}
        	if(settingLoaded.maxMsgNumAnim !== undefined) {
        		userSettings.maxMsgNumAnim = settingLoaded.maxMsgNumAnim;
        	}
        	if(settingLoaded.maxUsersNumStat !== undefined) {
        		userSettings.maxUsersNumStat = settingLoaded.maxUsersNumStat;
        	}
        	if(settingLoaded.useWebGL !== undefined) {
        		userSettings.useWebGL = settingLoaded.useWebGL;
        	}
            debugLog('user settings are loaded from local storage');
        }
        else {
        	debugLog('cannot load user settings, use default settings');
        }
    },
    storeLS: function() {
        ls.setJSON(userSettings.lsKey, {
            maxUsersNumAnim: userSettings.maxUsersNumAnim,
            maxMsgNumAnim: userSettings.maxMsgNumAnim,
            maxUsersNumStat: userSettings.maxUsersNumStat,
            useWebGL: userSettings.useWebGL
        });
    },
    clearLS: function() {
    	ls.del(userSettings.lsKey);
    }
}


var SYS = {
	googleAnaliticsID: "",
	vkAppID: 4388415,
	vkWidgetAppId: 4447737
}

var ABOUT = {
	version: chrome.runtime.getManifest().version,
	description: "Визуализация и статистика сообщений в социальной сети Вконтакте",
	groupRef: "https://vk.com/vkstats",
	author: "",
	authorRef: "",
	website: "",
	websiteName: "",
	musicAuthorName: "N'to - Trauma (Worakls Remix)",
	donateRef: ""
}
