
//states of application
var State = {
    AUTH: 'auth',
    LOAD: 'msg loading',
    ANIM: 'animation',
    STAT: 'statistics'
}

var Section = {
    TABLE: 'table',
    DIAGRAM: 'diagram',
    PLOT: 'plot',
    EXPORT: 'export'
}

//application
var app = {

	//current state of application
    currentState: State.AUTH,
    currentSection: Section.TABLE,
    //audio parameters
    audio: null,
    audioAutoStart: false,
    useAudio: false,
    animation_module: animation_webgl,
    profiler: null,
    //methods
    init: function() {
    	debugLog('init application');
        _gaq.push(['_trackEvent', 'version', ABOUT.version]);
        //init profiler
        app.profiler = {};
        app.profiler.appInitStartTime = new Date();

    	//load audio
        app.loadAudio();
        //init user interface
        ui.init();
        //bind handlers
        app.bindHandlers();
        //load user settings
        userSettings.loadLS();
        //trying to load user info from local storage
        account.loadLS();
        //if user info loaded from local storage
        if(account.isAuth) {
        	//init data manager
        	dm.init();
        	//update user info
        	if ($.isEmptyObject(account.profile)) {
			    // user data is not saved, need to load (do not specify callbackFailed)
            	vk.loadUserInfo(app.onUserInfoLoaded);
        	} else {
        		// user data is already saved, try to update, if failed continue with old data
        		// (specify callbackFailed as app.onUserInfoLoaded)
        		vk.loadUserInfo(app.onUserInfoLoaded, app.onUserInfoLoaded);
        	}
        }
        else {
        	//not authorized
        	//show welcome page
            ui.loadPage.hide();
            ui.welcomePage.show();
        }
    },
    loadMsgData: function() {
    	//trying to load messages from the database
        dm.loadMsgDataDB(function() {
            if(dm.isMsgDataLoaded) {
            	//message data is loaded from database
            	vk.getMsgLastId(function(lastId) {
            		dm.msgNumReal = lastId;
            		if(dm.msgLastId < lastId) {
            			//need update
            			debugLog('updating message data');
            			//show progress bar
            			ui.progressBar.slider({value: 0});
		                ui.progressBar.fadeIn(400);
		                //change current state to LOAD
		                app.currentState = State.LOAD;
		                //load messages
		                params = {};
            			params.startId = dm.msgLastId + 1;
            			params.endId = lastId;
            			vk.loadMessages(params, app.onMessagesLoaded, app.onAllMessagesLoaded);
            		}
            		else {
            			//all messages are loaded
                        dm.processMsgData();
                        app.loadChatsInfo();
            		}
            	}, function() {
            		//connection problems, don't update
            		debugLog('cannot update message data, use from database');
	                dm.processMsgData();
	                app.loadChatsInfo();
            	});
            }
            else {
                //messages aren't loaded
                debugLog('messages aren\'t loaded');
                //show progress bar
                ui.progressBar.slider({value: 0});
                ui.progressBar.fadeIn(400);
                //change current state to LOAD
                app.currentState = State.LOAD;
                //start loading messages
                vk.getMsgLastId(app.onMessageNumberLoaded);
            }
        });
    },
    loadUsersInfo: function() {

        var loadFromUsersInfoFromDB = function() {
            //trying to load users info from the database
            dm.loadUsersInfoDB(function() {
                //data loaded from db successfully

                //check if update is needed
                //get uids that has already loaded
                var uidsLoaded = [];
                for(var i = 0; i < dm.usersData.length; i++) {
                    uidsLoaded.push(dm.usersData[i].uid);
                }

                //find difference
                var uidsToLoad = $(dm.usersUids).not(uidsLoaded).get();

                var isUpdateNeeded = uidsToLoad.length > 0;
                if(isUpdateNeeded) {
                    debugLog('user info update, uids to load: ' + uidsToLoad.length);
                    vk.loadUsersInfo(uidsToLoad, app.onUsersInfoLoaded);
                }
                else {
                    debugLog('user info: update is not needed');
                    //users info is loaded, process it
                    dm.processUsersData();
                    //start application
                    app.start();
                }

            }, function() {
                //users info aren't loaded frome the database
                //load from vk.com
                vk.loadUsersInfo(dm.usersUids, app.onUsersInfoLoaded);
            });
        }

        //load users data from vk.com, if failed then load from db
        vk.loadUsersInfo(dm.usersUids, app.onUsersInfoLoaded, loadFromUsersInfoFromDB);
    },
    loadChatsInfo: function() {

        //trying to load users info from the database
        dm.loadChatsInfoDB(function() {

            //check if update is needed
            //get uids that has already loaded
            var chatsLoaded = [];
            for(var i = 0; i < dm.chatsData.length; i++) {
                chatsLoaded.push(dm.chatsData[i].chat_id);
            }
            //find difference
            var chatsToLoad = $(dm.topChats).not(chatsLoaded).get();
            var isUpdateNeeded = chatsToLoad.length > 0;

            if(isUpdateNeeded) {
                debugLog('chats info update, ids to load: ' + chatsToLoad.length);
                vk.loadChatsInfo(chatsToLoad, app.onChatsInfoLoaded);
            }
            else {
                debugLog('chats info: update is not needed');
                //chats info is loaded, process it
                dm.processChatsData();
                //load users info
                app.loadUsersInfo();
            }

        }, function() {
            //chats info aren't loaded frome the database
            //load from vk.com
            vk.loadChatsInfo(dm.topChats, app.onChatsInfoLoaded);
        });
    },
    loadAudio: function() {
        try {
            app.audio = new Audio('audio/audio.mp3');
            app.audio.loop = true;
            app.audio.volume = 0.5;
            app.useAudio = true;
            debugLog('audio is succsessfully loaded');
        }
        catch(e) {
            app.audio = null;
            app.useAudio = false;
            debugLog('error on loading audio');
        }
    },
    start: function() {

        //track visitor
        vk.statTrack();

    	//change current state
        app.currentState = State.ANIM;
        app.currentSection = Section.TABLE;

        //init canvas modules
        canvas_time_module.init();
        canvas_mini_chart.init();
        canvas_chart.init();
        canvas_top.init();
        table_top.init();
        export_module.init();

        //detect webgl
        if(userSettings.useWebGL && detectWebGL()) {
            app.animation_module = animation_webgl;
            animation_canvas = null;
            debugLog('WebGL is supported');
            _gaq.push(['_trackEvent', 'webgl', 'on']);
            ui.webGLSupport.hide();
        }
        else {
            app.animation_module = animation_canvas;
            animation_webgl = null;
            debugLog('WebGL is not supported, use regular canvas');
            _gaq.push(['_trackEvent', 'webgl', 'off']);
            ui.webGLSupport.show();
        }

        //show animation page for computing bounds in canvas main
        ui.animPage.css({opacity:0});
        ui.animPage.show();

        app.animation_module.init();

        ui.animPage.hide();
        ui.animPage.css({opacity:1});

        //start animation
        var value = $.fn.speedSliderConvert(ui.speedSliderDefault);
        app.animation_module.start(value);
        //show animation page
        ui.animPage.fadeIn(400);

        //start audio
        if(app.useAudio) {

            app.audioAutoStart = false;
            var audioInfo = ls.get('audio_on');
            if(audioInfo && audioInfo == '1') {
                app.audioAutoStart = true;
            }
            var currentTime = ls.get('audio_offset');
            if(!currentTime)
            {
                currentTime = 0;
            }

            if(app.audio.readyState == 4) {
                app.audio.currentTime = currentTime;
                if(app.audioAutoStart) {
                     $('#music-icon').removeClass('no-music');
                    //app.audio.currentTime = 0;
                    app.audio.play();
                }
            }
            else
            {
                app.audio.addEventListener('canplaythrough', function() {
                    app.audio.currentTime = currentTime;
                    if(app.audioAutoStart) {
                         $('#music-icon').removeClass('no-music');
                        //app.audio.currentTime = 0;
                        app.audio.play();
                    }
                });
            }
        }

        //init statistics page
        app.initChartSelectUserBlock();
        //hide load page
        ui.loadPage.hide();
        //show top right panel
        ui.topRightPanel.fadeIn(400);

        //if statistics page
        var page = ls.get('page_');
        if(page == 'stats') {
            $('a#stat-button').click();
        }

        //change section
        var section = ls.get('section_');
        if(section == Section.DIAGRAM) {
            $('#button-diagram').click();
        } else if(section == Section.PLOT) {
            $('#button-plot').click();
        } else {
            $('#button-table').click();
        }

        //default period
        $('#table-b-period-all').click();
        $('#chart-b-period-today').click();

        app.profiler.appInitEndTime = new Date();
        app.profiler.appInitTime = (app.profiler.appInitEndTime - app.profiler.appInitStartTime) / 1000;
        _gaq.push(['_trackEvent', 'init_time', app.profiler.appInitTime]);
        debugLog('application init finished, elapsed: ' + app.profiler.appInitTime)
    },
    initChartSelectUserBlock: function() {

        var colorNum = 32;
        var colorOrder = range(0, colorNum);
        shuffle(colorOrder);

        var clickHandler = function(e) {
            var elem = $(this);
            if(elem.is('.selected')) {
                elem.removeClass('selected');
                elem.find('.select-user-color').hide();
                var uid = elem.attr('data-uid');
                canvas_chart.removeUser(uid);
                canvas_chart.plot();
                canvas_chart.draw();
            }
            else {
                elem.addClass('selected');
                elem.find('.select-user-color').show();
                var uid = elem.attr('data-uid');
                var color = elem.attr('data-color');
                canvas_chart.addUser(uid, color);
                canvas_chart.plot();
                canvas_chart.draw();
            }
        }

        var fullName = account.profile.first_name + ' ' + account.profile.last_name;
        var src = account.profile.photo_50;
        var uid = 'self';
        //color = pickColor(colorNum, colorOrder[0]);
        var color = __randomColor();
        // color = _randomColor(colorOrder[0]);
        var data = {
            uid: 'self',
            selected: true,
            color: color,
            fullname: fullName,
            photo_50: src,
            click: clickHandler
        };
        ui.addSelectUserBlock(data);
        canvas_chart.addUser('self', color);

        var firstName, lastName, idx;
        var maxLen = min(dm.topUids.length, userSettings.maxUsersNumAnim);
        for(var i = 0; i < maxLen; i++) {
            uid = dm.topUids[i];
            idx = dm.usersDataRefByUid[uid];
            firstName = dm.usersData[idx].first_name;
            lastName = dm.usersData[idx].last_name;
            fullName = firstName + ' ' + lastName;
            src = dm.usersData[idx].photo_50;
            uid = dm.usersData[idx].uid;
            //color = pickColor(colorNum, colorOrder[i+1]);
            //color = _randomColor(colorOrder[i + 1]);
            color = __randomColor();
            data = {
                uid: uid,
                selected: false,
                color: color,
                fullname: fullName,
                photo_50: src,
                click: clickHandler
            };
            ui.addSelectUserBlock(data);
        }

        $('#select-user-box').attr('data-offset', 0);
        ui.showNextSelectUserBlocks();
    },
    pauseAnimation: function(msec) {
        var m = app.animation_module;
        if(m.paused || m.stopping || m.starting) return;
        ui.speedSliderSaveValue = ui.speedSlider.slider('value');
        ui.speedSlider.slider('value', 0);
        if(msec) {
            app.animation_module.pauseSmoothly(msec, function() {});
        }
        else {
            app.animation_module.pause();
        }
    },
    continueAnimation: function(msec) {
        var m = app.animation_module;
        if(!m.paused || m.stopping || m.starting) return;
        if(!ui.speedSliderSaveValue) {
            ui.speedSliderSaveValue = ui.speedSliderDefault;
        }
        var value = $.fn.speedSliderConvert(ui.speedSliderSaveValue);
        ui.speedSlider.slider('value', ui.speedSliderSaveValue);
        if(msec) {
            m.continueSmoothly(value, msec, function() {});
        }
        else {
            m.continue(value);
        }
    },
    onAuthed: function() {
        if(account.isAuth) {
            _gaq.push(['_trackEvent', 'auth', 'login', 'successfully']);
            debugLog('auth success');
            //init data manager
            dm.init();
            //load user info
            vk.loadUserInfo(app.onUserInfoLoaded);
        }
    },
    onLogOut: function() {
        _gaq.push(['_trackEvent', 'auth', 'logout']);
        debugLog('onLogOut');
        //stop animation
        app.animation_module.stop();
        //stop audio
        if(app.useAudio) app.audio.pause();
        //fade out pages
        ui.animPage.fadeOut(200);
        ui.statPage.fadeOut(200);

        //wait for page is faded out (200ms)
        setTimeout(function() {

            //hide UI elements
            ui.userNameBlock.hide();
            ui.topRightPanel.hide();
            ui.progressBar.hide();
            ui.loadPage.hide();

            //hide popup windows
            ui.hideAboutPopup();
            ui.hidePopupMsg();
            ui.hideUserBox();
            ui.hidePlaybackMenu();
            ui.hideDateMenu();
            ui.hideContactBox(0, true);

            //clear data
            ui.resetValues();
            dm.clearData();
            app.animation_module.clearData();
            canvas_top.clearData();
            canvas_mini_chart.clearData();
            canvas_time_module.clearData();

            //delete audio settings
            ls.del('audio_on');
            ls.del('audio_offset');
            ls.del('page_');
            userSettings.clearLS();

            //change current state to AUTH
            app.currentState = State.AUTH;
            //show welcome page
            ui.welcomePage.show();

            location.reload();

        }, 200);
    },
    onUserInfoLoaded: function() {
        debugLog('onUserInfoLoaded');
        //store user info in local storage
        account.storeLS();
        //set settings values
        ui.setUserSettingsValues();
        //set user info in UI
        ui.setUserBlockData();
        //hide welcome page
        ui.welcomePage.hide();
        //show user name block
        ui.userNameBlock.show();
        //show loading page
        ui.loadPage.show();
        //load msg data from database or download
        app.loadMsgData();
    },
    onMessageNumberLoaded: function(lastId) {
        debugLog('onMessageNumberLoaded, lastId: ' + lastId);
        //set progress bar value to 0%
        ui.progressBar.slider({value: 0});
        //save real message number
        dm.msgNumReal = lastId;
        //start loading messages
        params = {};
		params.startId = 1;
		params.endId = lastId;
        vk.loadMessages(params, app.onMessagesLoaded, app.onAllMessagesLoaded);
    },
    onAllMessagesLoaded: function() {
    	debugLog('onAllMessagesLoaded, loaded: ' + dm.msgData.uids.length);
    	//set progress bar value to 100%
        ui.progressBar.slider('value', ui.progressBarMaxValue);
        //process message data
        dm.processMsgData();
        //load chats info
        app.loadChatsInfo();
    },
    onMessagesLoaded: function(msgLoaded, msgNum) {
        //set progress bar value to (msgLoaded / msgNum) * 100 %;
        debugLog('onMessagesLoaded:' + (msgLoaded).toString());
        if(msgNum > 0) {
            var fraction = Math.round(ui.progressBarMaxValue * msgLoaded / msgNum);
            ui.progressBar.slider('value', fraction);
        }
        else {
            ui.progressBar.slider('value', ui.progressBarMaxValue);
        }
    },
    onUsersInfoLoaded: function() {
    	debugLog('onUsersInfoLoaded');
    	//process users data
        dm.processUsersData();
        //start application
        app.start();
    },
    onChatsInfoLoaded: function() {
        debugLog('onChatsInfoLoaded');
        //process chats data
        dm.processChatsData();
        //load chat info
        app.loadUsersInfo();
    },
    onError: function(errType, params) {
        if(errType == 'auth') {
            debugLog('OnError: auth');
        }
    },
    onVisualizationStarted: function(msec) {
        //do nothing
        //end
    },
    onVisualizationFinished: function() {
        // currently not used

        /*$('#playback-icon-play').hide();
        $('#playback-icon-pause').show();
        $('#play-button').removeClass('selected');
        $('#pause-button').addClass('selected');


        page.speedSlider.slider('value', 0);*/

        /*page.canvasMain.fadeOut(400);
        page.controlPanel.fadeOut(400);

        setTimeout(function() {
            app.animation_module.changeTimeF(0.5);
            var value = $.fn.speedSliderConvert(page.speedSliderDefault);
            app.animation_module.continue(value);

            page.canvasMain.fadeIn(400);
            page.controlPanel.fadeIn(400);

        }, 400);*/
    },
    onFrameUpdated: function(params) {

        var fraction = params.fraction;
        var time = params.time;
        var fps = params.fps;

        if(fraction > 1.0) fraction = 1;
        if(fraction < 0) fraction = 0;
        fraction = Math.round(ui.progressBarMaxValue * fraction);
        ui.timeSilder.slider('value', fraction);

        var date = new Date(time * 1000);
        var year = date.getFullYear();
        var month = monthsShort[date.getMonth()];
        var day = date.getDate();
        var hour = date.getHours();
        var min = date.getMinutes();
        var sec = date.getSeconds();
        var text1 = ('0' + day).slice(-2) + ' ' + month + ', ' + year;
        var text2 = ('0' + hour).slice(-2) + ':' + ('0' + min).slice(-2);
        var text3 = Math.floor(fps * 10) / 10;

        ui.dateText.html(text1.toLowerCase());
        ui.timeText.html(text2);
        ui.fpsText.html(text3);
        //ui.testText.html(ABOUT.version);
    },
    onAnimationPaused: function() {
        $('#playback-icon-play').hide();
        $('#playback-icon-pause').show();
        $('#play-button').removeClass('selected');
        $('#pause-button').addClass('selected');
    },
    onAnimationContinued: function() {
        $('#playback-icon-play').show();
        $('#playback-icon-pause').hide();
        $('#pause-button').removeClass('selected');
        $('#play-button').addClass('selected');
    },
    onAboutPopupClosed: function() {
        if(app.currentState == State.ANIM) {
            app.continueAnimation();
        }
    },
    onSettingsPopupClosed: function() {
        if(userSettings.changed) {
            userSettings.changed = false;
            $('#settings-b-apply-wrap').removeClass('green');
            $('#settings-b-apply-wrap').addClass('blue');
            ui.setUserSettingsValues();
        }
        if(app.currentState == State.ANIM) {
            app.continueAnimation();
        }
    },
    onSettingsChanged: function(settingsValues) {
        userSettings.changed = false;
        userSettings.maxUsersNumAnimTemp = settingsValues.maxUsersNumAnim;
        if(settingsValues.maxUsersNumAnim != userSettings.maxUsersNumAnim) {
            userSettings.changed = true;
        }

        userSettings.maxMsgNumAnimTemp = settingsValues.maxMsgNumAnim;
        if(settingsValues.maxMsgNumAnim != userSettings.maxMsgNumAnim) {
            userSettings.changed = true;
        }

        userSettings.maxUsersNumStatTemp = settingsValues.maxUsersNumStat;
        if(settingsValues.maxUsersNumStat != userSettings.maxUsersNumStat) {
            userSettings.changed = true;
        }

        userSettings.useWebGLTemp = settingsValues.useWebGL;
        if(settingsValues.useWebGL != userSettings.useWebGL) {
            userSettings.changed = true;
        }

        if(userSettings.changed) {
            $('#settings-b-apply-wrap').removeClass('blue');
            $('#settings-b-apply-wrap').addClass('green');
        }
        else {
            $('#settings-b-apply-wrap').removeClass('green');
            $('#settings-b-apply-wrap').addClass('blue');
        }
    },
    onSettingsApply: function() {
        if(userSettings.changed) {
            //short reference
            var cmm = app.animation_module;

            if(userSettings.maxUsersNumAnim != userSettings.maxUsersNumAnimTemp) {
                //set objects number
                var oldNumber = userSettings.maxUsersNumAnim;
                var newNumber = userSettings.maxUsersNumAnimTemp;

                userSettings.maxUsersNumAnim = userSettings.maxUsersNumAnimTemp;

                if(newNumber > oldNumber) {
                    cmm.graduallyAddObjects(oldNumber, newNumber);
                }
                else {
                    cmm.setObjectsNum(newNumber);
                }
            }

            if(userSettings.maxMsgNumAnim != userSettings.maxMsgNumAnimTemp) {
                //set message balls number

                userSettings.maxMsgNumAnim = userSettings.maxMsgNumAnimTemp;

                cmm.setMaxBallsNum(userSettings.maxMsgNumAnim);
            }

            if(userSettings.maxUsersNumStat != userSettings.maxUsersNumStatTemp) {
                userSettings.maxUsersNumStat = userSettings.maxUsersNumStatTemp;
            }


            if(userSettings.useWebGL != userSettings.useWebGLTemp) {
                userSettings.useWebGL = userSettings.useWebGLTemp;
            }

            userSettings.changed = false;

            $('#settings-b-apply-wrap').removeClass('green');
            $('#settings-b-apply-wrap').addClass('blue');

            _gaq.push(['_trackEvent', 'settings', 'apply']);
            debugLog('apply new settings');

            //store only if all right
            setTimeout(function() {
                debugLog('settings saved');
                userSettings.storeLS();
            }, 100);
        }
        ui.hideSettingsPopup(200);
    },
    onApplicationClosed: function() {
        //save audio offset
        if(app.useAudio)
        {
            var value = app.audio.currentTime;
            ls.set('audio_offset', value);
        }
        //save current page
        if(app.currentState == State.STAT) {
            ls.set('page_', 'stats');
        }
        else if(app.currentState == State.ANIM) {
            ls.set('page_', 'anim');
        }

        if(app.currentSection == Section.TABLE) {
            ls.set('section_', Section.TABLE);
        } else if(app.currentSection == Section.DIAGRAM) {
            ls.set('section_', Section.DIAGRAM);
        } else if(app.currentSection == Section.PLOT) {
            ls.set('section_', Section.PLOT);
        }
    },
    bindHandlers: function() {
        //button click handlers
        $('#auth_button').click(function() {
            if(app.currentState != State.AUTH) return;
            if(account.isAuth) {
                return;
            }
            else {
                vk.doAuth(app.onAuthed);
            }
        });
        $('#logout_button').click(function() {
            if(app.currentState == State.AUTH) return;
            vk.logOut(app.onLogOut);
        });
        $('#username_field').click(function(e) {
            if(app.currentState == State.AUTH) return;
            e.preventDefault();
            ui.showUserBox(200);
            e.stopPropagation();
        });
        stopPropagation('#username_field', 'mousedown');
        stopPropagation('#username_field', 'mouseup');

        $('a#anim-button').click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            if(app.currentState != State.STAT) return;

            $(e.target).addClass('selected');
            $('a#stat-button').removeClass('selected');

            if(app.animation_module.stopped) {
                var value = $.fn.speedSliderConvert(ui.speedSlider.slider('value'));
                app.animation_module.start(value);
            }

            ui.statPage.hide();
            app.currentState = State.ANIM;
            ui.animPage.fadeIn(200);
            _gaq.push(['_trackEvent', 'page change', 'animation']);
            debugLog('animation page opened');
        });
        stopPropagation('a#anim-button', 'mousedown');
        stopPropagation('a#anim-button', 'mouseup');

        $('a#stat-button').click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            if(app.currentState != State.ANIM) return;
            $(e.target).addClass('selected');
            $('a#anim-button').removeClass('selected');

            ui.animPage.hide();
            app.animation_module.stop();

            app.currentState = State.STAT;

            //show temporary for computing bounds
            ui.statPage.css('opacity', 0);
            ui.statPage.show();

            table_top.plot();
            table_top.display();

            ui.sectionPlot.css('opacity', 0);
            ui.sectionPlot.show();

            var container = $('#chart-container');
            var width = container.width();
            var height = container.height();
            var offsetPos = container.offset();

            canvas_chart.setSize(width, height, offsetPos.left, offsetPos.top);
            canvas_chart.plot();
            //canvas_chart.setTime(app.animation_module.getTime());
            canvas_chart.draw();

            ui.sectionPlot.hide();
            ui.sectionPlot.css('opacity', 1);

            ui.sectionDiagram.css('opacity', 0);
            ui.sectionDiagram.show();

            container = $('#canvas-top-container');
            width = container.width();
            height = container.height();
            offsetPos = container.offset();

            canvas_top.setSize(width, height, offsetPos.left, offsetPos.top);
            canvas_top.onAllMessagesLoaded = function() {
                canvas_top.draw();
            }
            canvas_top.plot();
            canvas_top.draw();

            ui.sectionDiagram.hide();
            ui.sectionDiagram.css('opacity', 1);

            if(app.currentSection == Section.TABLE) {
                ui.sectionTable.show();
            } else if(app.currentSection == Section.DIAGRAM) {
                ui.sectionDiagram.show();
            } else if(app.currentSection == Section.PLOT) {
                ui.sectionPlot.show();
            }

            ui.statPage.hide();
            ui.statPage.css('opacity', 1);

            ui.statPage.fadeIn(200);
            _gaq.push(['_trackEvent', 'page change', 'statistic']);
            debugLog('statistic page opened');

        });
        stopPropagation('a#stat-button', 'mousedown');
        stopPropagation('a#stat-button', 'mouseup');

        $('#playback-panel').click(function(e) {
            if(app.currentState != State.ANIM) return;
            if(ui.playbackMenu.is(':visible')) {
                ui.hidePlaybackMenu(200);
            }
            else {
                ui.showPlaybackMenu(200);
            }
            ui.hideDateMenu(200);
            e.stopPropagation();
        });
        stopPropagation('#playback-panel', 'mousedown');
        stopPropagation('#playback-panel', 'mouseup');

        $('#date-panel').click(function(e) {
            if(app.currentState != State.ANIM) return;
            if(ui.dateMenu.is(':visible')) {
                ui.hideDateMenu(200);
            }
            else {
                ui.showDateMenu(200);
            }
            ui.hidePlaybackMenu(200);
            e.stopPropagation();
        });
        stopPropagation('#date-panel', 'mousedown');
        stopPropagation('#date-panel', 'mouseup');

        $('#play-button').click(function(e) {
            e.preventDefault();
            if(app.currentState != State.ANIM) return;
            app.continueAnimation(500);
        });

        $('#pause-button').click(function(e) {
            e.preventDefault();
            if(app.currentState != State.ANIM) return;
            app.pauseAnimation(500);
        });

        window.mdata = {}
        $('html').mousedown(function(e) {
            window.mdata.mouseDown = true;
            window.mdata.mouseDrag = false;
            window.mdata.mousePosX = e.clientX;
            window.mdata.mousePosY = e.clientY;
        });

        $('html').mousemove(function(e) {
            if(window.mdata.mousePosX == e.clientX &&
                window.mdata.mousePosY == e.clientY) {
                return;
            }
            if(window.mdata.mouseDown) {
                window.mdata.mouseDrag = true;
            }
            window.mdata.mousePosX = e.clientX;
            window.mdata.mousePosY = e.clientY;
        });

        $('html').mouseup(function(e) {
            window.mdata.mouseDown = false;
            if(window.mdata.mouseDrag) return;
            window.mdata.mouseDrag = false;

            var closed = false;
            var target = $(e.target);
            var elements = [$('#about-popup-content'), $('#settings-popup-content'), $('#userbox'), $('#msg-box'),
                 $('#time-options'), $('#playback-options'), $('#contact-info-box')];
            var hideFunc = [ui.hideAboutPopup, ui.hideSettingsPopup, ui.hideUserBox, ui.hidePopupMsg,
                 ui.hideDateMenu, ui.hidePlaybackMenu, ui.hideContactBox];
            var funcArgs = [[300], [300], [300], [300], [300], [300], [300, true]];

            for(var i = 0; i < elements.length; i++) {
                var isVisible = elements[i].is(':visible');
                if(isVisible && target.closest(elements[i]).length == 0) {
                    hideFunc[i].apply(ui, funcArgs[i]);
                    break;
                }
            }
        });

        // $('#canvas-main').bind('mousewheel', function(e) {
        //     if(!ui.isMsgBoxVisible) return;
        //     var pos = app.animation_module.toScreenCoordinates(ui.msgBox.canvasX, ui.msgBox.canvasY);
        //     ui.msgBox.css({
        //         left: pos.x,
        //         top: pos.y
        //     });
        // });

        $('a#stat-ref').click(function(e) {
            e.preventDefault();
            canvas_chart.removeAllUsers();
            uid = $(this).attr('data-uid');
            selectedUsers = $('.select-user-block.selected');
            selectedUsers.removeClass('selected').find('.select-user-color').hide();
            $('a#stat-button').click();
            $('button-plot').click();
            window.scrollTo(0, 1000);
            id = '#select-user-' + uid;
            $(id).click();
        });

        $('#button-table').click(function(e) {
            if(app.currentSection == Section.TABLE) return;

            $(e.target).addClass('selected');

            if(app.currentSection == Section.DIAGRAM) {
                ui.sectionDiagram.hide();
                $('#button-diagram').removeClass('selected');
            } else {
                ui.sectionPlot.hide();
                $('#button-plot').removeClass('selected');
            }

            ui.sectionTable.fadeIn(200);

            app.currentSection = Section.TABLE;
        });

        $('#button-diagram').click(function(e) {
            if(app.currentSection == Section.DIAGRAM) return;

            $(e.target).addClass('selected');
            $('#button-table').removeClass('selected');
            $('#button-plot').removeClass('selected');

            if(app.currentSection == Section.TABLE) {
                ui.sectionTable.hide();
                $('#button-table').removeClass('selected');
            } else {
                ui.sectionPlot.hide();
                $('#button-plot').removeClass('selected');
            }

            ui.sectionDiagram.css('opacity', 0);
            ui.sectionDiagram.show();

            container = $('#canvas-top-container');
            width = container.width();
            height = container.height();
            offsetPos = container.offset();

            canvas_top.setSize(width, height, offsetPos.left, offsetPos.top);
            canvas_top.plot();
            canvas_top.draw();

            ui.sectionDiagram.hide();
            ui.sectionDiagram.css('opacity', 1);

            ui.sectionDiagram.fadeIn(200);

            app.currentSection = Section.DIAGRAM;
        });

        $('#button-plot').click(function(e) {
            if(app.currentSection == Section.PLOT) return;

            $(e.target).addClass('selected');
            $('#button-table').removeClass('selected');
            $('#button-diagram').removeClass('selected');

            if(app.currentSection == Section.TABLE) {
                ui.sectionTable.hide();
                $('#button-table').removeClass('selected');
            } else {
                ui.sectionDiagram.hide();
                $('#button-diagram').removeClass('selected');
            }

            ui.sectionPlot.css('opacity', 0);
            ui.sectionPlot.show();

            var container = $('#chart-container');
            var width = container.width();
            var height = container.height();
            var offsetPos = container.offset();

            canvas_chart.setSize(width, height, offsetPos.left, offsetPos.top);
            canvas_chart.plot();
            canvas_chart.draw();

            ui.sectionPlot.hide();
            ui.sectionPlot.css('opacity', 1);

            ui.sectionPlot.fadeIn(200);

            app.currentSection = Section.PLOT;
        });

        //table buttons
        $('#table-b-today').click(function(e) {
            if(table_top.isAnimating) return;
            $('#table-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#table-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateToday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate());
            $('#table-date-from').datepicker('option', 'maxDate', dateToday);
            $('#table-date-to').datepicker('option', 'minDate', dateToday);
            $('#table-date-from').datepicker('setDate', dateToday);
            $('#table-date-to').datepicker('setDate', dateToday);

            table_top.setPeriodType('today');
            table_top.plot();
            table_top.display();
        });

        $('#table-b-yesterday').click(function(e) {
            if(table_top.isAnimating) return;
            $('#table-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#table-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateYesterday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() - 1);
            $('#table-date-from').datepicker('option', 'maxDate', dateYesterday);
            $('#table-date-to').datepicker('option', 'minDate', dateYesterday);
            $('#table-date-from').datepicker('setDate', dateYesterday);
            $('#table-date-to').datepicker('setDate', dateYesterday);

            table_top.setPeriodType('yesterday');
            table_top.plot();
            table_top.display();
        });

        $('#table-b-week').click(function(e) {
            if(table_top.isAnimating) return;
            $('#table-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#table-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateWeekAgo = new Date(dateNow.getTime() - 7 * SEC_IN_DAY * 1000);
            $('#table-date-from').datepicker('option', 'maxDate', dateNow);
            $('#table-date-to').datepicker('option', 'minDate', dateWeekAgo);
            $('#table-date-from').datepicker('setDate', dateWeekAgo);
            $('#table-date-to').datepicker('setDate', dateNow);

            table_top.setPeriodType('week');
            table_top.plot();
            table_top.display();
        });

        $('#table-b-month').click(function(e) {
            if(table_top.isAnimating) return;
            $('#table-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#table-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var year = dateNow.getFullYear();
            var month = dateNow.getMonth() + 1; /*current month 1-12*/
            var daysNum = getDaysInMonth(month - 1, year); /*0-11*/
            var dateMonthAgo = new Date(dateNow.getTime() - daysNum * SEC_IN_DAY * 1000);
            $('#table-date-from').datepicker('option', 'maxDate', dateNow);
            $('#table-date-to').datepicker('option', 'minDate', dateMonthAgo);
            $('#table-date-from').datepicker('setDate', dateMonthAgo);
            $('#table-date-to').datepicker('setDate', dateNow);

            table_top.setPeriodType('month');
            table_top.plot();
            table_top.display();
        });

        $('#table-b-year').click(function(e) {
            if(table_top.isAnimating) return;
            $('#table-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#table-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateYearAgo = new Date(dateNow.getTime() - SEC_IN_YEAR * 1000);
            $('#table-date-from').datepicker('option', 'maxDate', dateNow);
            $('#table-date-to').datepicker('option', 'minDate', dateYearAgo);
            $('#table-date-from').datepicker('setDate', dateYearAgo);
            $('#table-date-to').datepicker('setDate', dateNow);

            table_top.setPeriodType('year');
            table_top.plot();
            table_top.display();
        });

        $('#table-b-period-all').click(function(e) {
            if(table_top.isAnimating) return;
            $('#table-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#table-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateToday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate());
            $('#table-date-from').datepicker('option', 'maxDate', dateToday);
            $('#table-date-to').datepicker('option', 'minDate', null);
            $('#table-date-from').datepicker('setDate', null);
            $('#table-date-to').datepicker('setDate', dateToday);

            table_top.setPeriodType('all');
            table_top.plot();
            table_top.display();
        });

        $('#table-b-period-sel').click(function(e) {
            if(table_top.isAnimating) return;
            $('#table-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");

            $('#table-period-sel-container').show();
        });

        var optionDatepicker = {
            timeOnlyTitle: 'Выберите время',
            firstDay: 1,
            controlType: 'select',
            monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
            monthNamesShort: ['Янв','Фер','Мар','Апр','Май','Июл','Июн','Авг','Сен','Окт','Ноя','Дек'],
            dayNames: ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'],
            dayNamesShort: ['Пн', 'Вт','Ср','Чт','Пт','Сб','Вс'],
            dayNamesMin: ['Пн', 'Вт','Ср','Чт','Пт','Сб','Вс'],
            dateFormat: "dd.mm.yy",
            closeText: 'Закрыть',
            showAnim: ''
        };

        //init datepicker
        $('#table-date-from').datepicker($.extend(optionDatepicker, {
            dateFormat: 'dd.mm.yy',
            maxDate: 0,
            onClose: function(currentDate) {
                var pattern = /(\d{2})\.(\d{2})\.(\d{4})/;
                var curDate = new Date(currentDate.replace(pattern,'$3-$2-$1'));
                var prevDay = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate() - 1);
                $('#table-date-to').datepicker('option', 'minDate', curDate);
                dateFrom = $("#table-date-from").datepicker('getDate');
                dateTo = $("#table-date-to").datepicker('getDate');
                table_top.setPeriodType('custom', dateFrom, dateTo);
                table_top.plot();
                table_top.display();
            }
        }));

        $('#table-date-to').datepicker($.extend(optionDatepicker, {
            dateFormat: 'dd.mm.yy',
            maxDate: 0,
            defaultDate: 0,
            onClose: function(currentDate) {
                $('#table-date-from').datepicker('option', 'maxDate', currentDate);
                dateFrom = $("#table-date-from").datepicker('getDate');
                dateTo = $("#table-date-to").datepicker('getDate');
                table_top.setPeriodType('custom', dateFrom, dateTo);
                table_top.plot();
                table_top.display();
            }
        }));
        $('#table-date-to').datepicker('setDate', new Date());

        $('#table-b-top-msg').click(function(e) {
            if(table_top.isAnimating) return;
            $('#table-b-top-letters').removeClass('selected');
            $(e.target).addClass("selected");
            $('.table-top .counting-type').html('сообщений');
            table_top.setCountingType('msg');
            table_top.plot();
            table_top.display();
        });

        $('#table-b-top-letters').click(function(e) {
            if(table_top.isAnimating) return;
            $('#table-b-top-msg').removeClass('selected');
            $(e.target).addClass("selected");
            $('.table-top .counting-type').html('символов');
            table_top.setCountingType('letter');
            table_top.plot();
            table_top.display();
        });

        //graphic buttons
        $('#chart-b-all').click(function(e) {
            $('#chart-b-in').removeClass('selected');
            $('#chart-b-out').removeClass('selected');
            $(e.target).addClass('selected');
            canvas_chart.setMessagesType('all');
            canvas_chart.draw();
        });
        $('#chart-b-in').click(function(e) {
            $('#chart-b-all').removeClass('selected');

            if($('#chart-b-out').is('.selected')) {
                //out msgType is selected
                if($(e.target).is('.selected')) {
                    //in msgType is selected, unselect
                    $(e.target).removeClass('selected');
                    canvas_chart.setMessagesType('out');
                }
                else {
                    //in msgType is not selected, select
                    $(e.target).addClass('selected');
                    canvas_chart.setMessagesType('in-out');
                }
            }
            else {
                $(e.target).addClass("selected");
                canvas_chart.setMessagesType('in');
            }
            canvas_chart.draw();
        });
        $('#chart-b-out').click(function(e) {
            $('#chart-b-all').removeClass('selected');

            if($('#chart-b-in').is('.selected')) {
                //in msgType is selected
                if($(e.target).is('.selected')) {
                    //out msgType is selected, unselect
                    $(e.target).removeClass('selected');
                    canvas_chart.setMessagesType('in');
                }
                else {
                    //out msgType is not selected, select
                    $(e.target).addClass('selected');
                    canvas_chart.setMessagesType('in-out');
                }
            }
            else {
                $(e.target).addClass("selected");
                canvas_chart.setMessagesType('out');
            }
            canvas_chart.draw();
        });

        $('#chart-b-intense').click(function(e) {
            $('#chart-b-summary').removeClass('selected');
            $(e.target).addClass("selected");
            canvas_chart.setViewType('intensity');
            canvas_chart.draw();
        });

        $('#chart-b-summary').click(function(e) {
            $('#chart-b-intense').removeClass('selected');
            $(e.target).addClass("selected");
            canvas_chart.setViewType('summary');
            canvas_chart.draw();
        });

        //chart top buttons
        $('#chart-b-today').click(function(e) {
            $('#chart-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#chart-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateToday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate());
            $('#chart-date-from').datepicker('option', 'maxDate', dateToday);
            $('#chart-date-to').datepicker('option', 'minDate', dateToday);
            $('#chart-date-from').datepicker('setDate', dateToday);
            $('#chart-date-to').datepicker('setDate', dateToday);

            canvas_top.setPeriodType('today');
            canvas_top.plot();
            canvas_top.draw();
        });

        $('#chart-b-yesterday').click(function(e) {
            $('#chart-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#chart-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateYesterday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() - 1);
            $('#chart-date-from').datepicker('option', 'maxDate', dateYesterday);
            $('#chart-date-to').datepicker('option', 'minDate', dateYesterday);
            $('#chart-date-from').datepicker('setDate', dateYesterday);
            $('#chart-date-to').datepicker('setDate', dateYesterday);

            canvas_top.setPeriodType('yesterday');
            canvas_top.plot();
            canvas_top.draw();
        });

        $('#chart-b-week').click(function(e) {
            $('#chart-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#chart-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateWeekAgo = new Date(dateNow.getTime() - 7 * SEC_IN_DAY * 1000);
            $('#chart-date-from').datepicker('option', 'maxDate', dateNow);
            $('#chart-date-to').datepicker('option', 'minDate', dateWeekAgo);
            $('#chart-date-from').datepicker('setDate', dateWeekAgo);
            $('#chart-date-to').datepicker('setDate', dateNow);

            canvas_top.setPeriodType('week');
            canvas_top.plot();
            canvas_top.draw();
        });

        $('#chart-b-month').click(function(e) {
            $('#chart-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#chart-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var year = dateNow.getFullYear();
            var month = dateNow.getMonth() + 1; /*current month 1-12*/
            var daysNum = getDaysInMonth(month - 1, year); /*0-11*/
            var dateMonthAgo = new Date(dateNow.getTime() - daysNum * SEC_IN_DAY * 1000);
            $('#chart-date-from').datepicker('option', 'maxDate', dateNow);
            $('#chart-date-to').datepicker('option', 'minDate', dateMonthAgo);
            $('#chart-date-from').datepicker('setDate', dateMonthAgo);
            $('#chart-date-to').datepicker('setDate', dateNow);

            canvas_top.setPeriodType('month');
            canvas_top.plot();
            canvas_top.draw();
        });

        $('#chart-b-year').click(function(e) {
            $('#chart-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#chart-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateYearAgo = new Date(dateNow.getTime() - SEC_IN_YEAR * 1000);
            $('#chart-date-from').datepicker('option', 'maxDate', dateNow);
            $('#chart-date-to').datepicker('option', 'minDate', dateYearAgo);
            $('#chart-date-from').datepicker('setDate', dateYearAgo);
            $('#chart-date-to').datepicker('setDate', dateNow);

            canvas_top.setPeriodType('year');
            canvas_top.plot();
            canvas_top.draw();
        });

        $('#chart-b-period-all').click(function(e) {
            $('#chart-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");
            $('#chart-period-sel-container').hide();

            //set values to datepicker
            var dateNow = new Date();
            var dateToday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate());
            $('#chart-date-from').datepicker('option', 'maxDate', dateToday);
            $('#chart-date-to').datepicker('option', 'minDate', null);
            $('#chart-date-from').datepicker('setDate', null);
            $('#chart-date-to').datepicker('setDate', dateToday);


            canvas_top.setPeriodType('all');
            canvas_top.plot();
            canvas_top.draw();
        });

        $('#chart-b-period-sel').click(function(e) {
            $('#chart-buttons-2 .selected').removeClass('selected');
            $(e.target).addClass("selected");

            $('#chart-period-sel-container').show();
        });


        $('#chart-date-from').datepicker($.extend(optionDatepicker, {
            dateFormat: 'dd.mm.yy',
            maxDate: 0,
            onClose: function(currentDate) {
                var pattern = /(\d{2})\.(\d{2})\.(\d{4})/;
                var curDate = new Date(currentDate.replace(pattern,'$3-$2-$1'));
                var prevDay = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate() - 1);
                $('#chart-date-to').datepicker('option', 'minDate', curDate);
                dateFrom = $("#chart-date-from").datepicker('getDate');
                dateTo = $("#chart-date-to").datepicker('getDate');
                canvas_top.setPeriodType('custom', dateFrom, dateTo);
                canvas_top.plot();
                canvas_top.draw();
            }
        }));

        $('#chart-date-to').datepicker($.extend(optionDatepicker, {
            dateFormat: 'dd.mm.yy',
            defaultDate: 0,
            maxDate: 0,
            onClose: function(currentDate) {
                $('#chart-date-from').datepicker('option', 'maxDate', currentDate);
                dateFrom = $("#chart-date-from").datepicker('getDate');
                dateTo = $("#chart-date-to").datepicker('getDate');
                canvas_top.setPeriodType('custom', dateFrom, dateTo);
                canvas_top.plot();
                canvas_top.draw();
            }
        }));
        $('#chart-date-from').datepicker('setDate', new Date());
        $('#chart-date-to').datepicker('setDate', new Date());


        $('#chart-b-top-msg').click(function(e) {
            $('#chart-b-top-letters').removeClass('selected');
            $(e.target).addClass("selected");
            canvas_top.setCountingType('msg');
            canvas_top.plot();
            canvas_top.draw();
        });

        $('#chart-b-top-letters').click(function(e) {
            $('#chart-b-top-msg').removeClass('selected');
            $(e.target).addClass("selected");
            canvas_top.setCountingType('letter');
            canvas_top.plot();
            canvas_top.draw();
        });

        $('#chart-b-stat-msg').click(function(e) {
            $('#chart-b-stat-letters').removeClass('selected');
            $(e.target).addClass("selected");
            canvas_chart.setCountingType('msg');
            canvas_chart.plot();
            canvas_chart.draw();
        });

        $('#chart-b-stat-letters').click(function(e) {
            $('#chart-b-stat-msg').removeClass('selected');
            $(e.target).addClass("selected");
            canvas_chart.setCountingType('letter');
            canvas_chart.plot();
            canvas_chart.draw();
        });


        $('#select-user-prev-b').click(function(e) {
            ui.showPrevSelectUserBlocks();
        });
        $('#select-user-next-b').click(function(e) {
            ui.showNextSelectUserBlocks();
        });

        $('#select-user-reset-b').click(function(e) {
            $('#select-user-list .selected').removeClass('selected');
            $('#select-user-list .select-user-color').hide();
            canvas_chart.removeAllUsers();
            canvas_chart.plot();
            canvas_chart.draw();
        })

        $('#music-b').click(function(e) {
            if(app.useAudio == false) return;
            if(app.audio.readyState != 4) return;
            var $elem = $('#music-icon');
            if($elem.is('.no-music')) {
                $elem.removeClass('no-music');
                app.audio.play();
                $(app.audio).stop().animate({volume: 0.5}, 200);
                _gaq.push(['_trackEvent', 'audio', 'on']);
                ls.set('audio_on', 1);
            }
            else {
                $(app.audio).stop().animate({volume: 0.0}, 200);
                setTimeout(function() {
                    app.audio.pause();
                    $elem.addClass('no-music');
                    _gaq.push(['_trackEvent', 'audio', 'off']);
                    ls.set('audio_on', 0);
                }, 200);
            }
        });

        $('#about-b').click(function(e) {
            if(app.currentState != State.ANIM && app.currentState != State.STAT) return;
            if(app.currentState == State.ANIM) {
                app.pauseAnimation();
            }
            _gaq.push(['_trackEvent', 'about', 'opened']);
            ui.showAboutPopup();
            e.stopPropagation();
        });
        stopPropagation('#about-b', 'mousedown');
        stopPropagation('#about-b', 'mouseup');

        $('#settings-b').click(function(e) {
            if(app.currentState != State.ANIM && app.currentState != State.STAT) return;
            if(app.currentState == State.ANIM) {
                app.pauseAnimation();
            }
            _gaq.push(['_trackEvent', 'settings', 'opened']);
            ui.showSettingsPopup();
            e.stopPropagation();
        });
        stopPropagation('#about-b', 'mousedown');
        stopPropagation('#about-b', 'mouseup');

        $('#slower-b').click(function(e) {
            var value = ui.speedSlider.slider('value');
            if(value == 0) return;
            value -= 5;
            if(value <= 0) {
                value = 0;
                app.pauseAnimation(100);
            }
            else {
                var timeCoeff = $.fn.speedSliderConvert(value);
                app.animation_module.changeTimeCoeff(timeCoeff);
                ui.speedSlider.slider('value', value);
            }
        });

        $('#faster-b').click(function(e) {
            var value = ui.speedSlider.slider('value');
            if(value >= ui.speedSliderMaxValue) return;
            if(value == 0) {
                app.continueAnimation(100);
                value += 5;
                ui.speedSlider.slider('value', value);
                var timeCoeff = $.fn.speedSliderConvert(value);
                setTimeout(function() {
                    app.animation_module.changeTimeCoeff(timeCoeff);
                }, 150);
            }
            else {
                value += 5;
                if(value > ui.speedSliderMaxValue) {
                    value = ui.speedSliderMaxValue;
                }
                ui.speedSlider.slider('value', value);
                var timeCoeff = $.fn.speedSliderConvert(value);
                app.animation_module.changeTimeCoeff(timeCoeff);
            }
        });

        $('#about-close-x').click(function() {
            ui.hideAboutPopup(200);
        });
        $('#about-close-b').click(function() {
            ui.hideAboutPopup(200);
        });
        $('#msg-box-close-x').click(function() {
            ui.hidePopupMsg(200);
        });

        $('#settings-close-x').click(function() {
            ui.hideSettingsPopup(200);
        });
        $('#settings-close-b').click(function() {
            ui.hideSettingsPopup(200);
        });
        $('#settings-apply-b').click(function() {
            app.onSettingsApply();
        });

        $('#use-webgl').change(function() {
            var settingsNew = {};
            settingsNew.maxUsersNumAnim = ui.maxUsersSliderAnim.slider('value');
            settingsNew.maxMsgNumAnim = ui.maxMsgsSliderAnim.slider('value');
            settingsNew.maxUsersNumStat = ui.maxUsersSliderStat.slider('value');
            var isChecked = ui.useWebGLcheckbox.is(':checked');
            settingsNew.useWebGL = isChecked ? true : false;
            ui.useWebGllabel.html(isChecked ? 'Да' : 'Нет');
            app.onSettingsChanged(settingsNew);

        });

        app.timerMusicTip = null;
        $('#music-b').hover(function(){
            if(app.timerMusicTip) clearTimeout(app.timerMusicTip);
            ui.showMusicTip(200);
        }, function(){
            if(app.timerMusicTip) clearTimeout(app.timerMusicTip);
            app.timerMusicTip = setTimeout(function(){
                ui.hideMusicTip(200);
            }, 500);
        });
        ui.musicTip.hover(function(){
            if(app.timerMusicTip) clearTimeout(app.timerMusicTip);
            ui.showMusicTip(200);
        }, function(){
            if(app.timerMusicTip) clearTimeout(app.timerMusicTip);
            setTimeout(function(){
                ui.hideMusicTip(200);
            }, 500);
        });

        //window unload event
        $(window).unload(app.onApplicationClosed);
    }
}

$(document).ready(function(){
    app.init();
});

