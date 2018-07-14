
var ui = {

    timeSliderMaxValue: 1000,
    progressBarMaxValue: 1000,
    speedSliderMaxValue: 1000,
    speedSliderSaveValue: 0,
    speedSliderDefault: 250,
    isDateMenuVisible: false,
    isContactBoxVisible: false,
    isMsgBoxVisible: false,
    initialDate: 1377632385,

    init: function() {
        debugLog('init UI');
        ui.initElements();
    },
    initElements: function() {
        ui.toggleButtons = $('#userblock>.buttons');
        ui.userNameBlock = $('#username');
        ui.userbox = $('#userbox-display-wrap');
        ui.authBlock = $('#auth-block');
        ui.welcomePage = $('#welcome-page');
        ui.loadPage = $('#load-page');
        ui.canvasMain = $('#canvas-main');
        ui.canvasIntro = $('#canvas-intro');
        ui.animPage = $('#animation-page');
        ui.statPage = $('#statistic-page');
        ui.dateText = $('#date-text');
        ui.timeText = $('#time-text');
        ui.fpsText = $("#fps-value")
        ui.controlPanel = $('#control-panel');
        ui.dateMenu = $('#time-options');
        ui.playbackMenu = $('#playback-options');
        ui.contactBox = $('#contact-info-box');
        ui.msgBox = $('#msg-box');
        ui.chartTip = $('#chart-tip');
        ui.chartTopTip = $('#chart-top-tip');
        ui.likeWidget = $('#vk-like');
        ui.topRightPanel = $('#top-right-panel');
        ui.aboutPopup = $('#about-popup');
        ui.settingsPopup = $('#settings-popup');
        ui.likeWidgetWelcome = $('#vk-like-welcome');
        ui.musicTip = $('#music-display-wrap');
        ui.maxUsersValueAnimLabel = $('#max-users-label-anim');
        ui.maxMsgValueAnimLabel = $('#max-msg-label-anim');
        ui.maxUsersValueStatLabel = $('#max-users-label-stat');
        ui.testText = $('.version-value');
        ui.pieChart = $('#chart-detail-info');
        ui.webGLSupport = $('#webgl-support');
        ui.useWebGLcheckbox = $('#use-webgl');
        ui.useWebGllabel = $('#use-webgl-label');
        ui.sectionTable = $('#table-wrap');
        ui.sectionDiagram = $('#top-chart-wrap');
        ui.sectionPlot = $('#chart-wrap');
        ui.tableTop = $('#statistic-page #table-top');
        ui.tableBody = $('#statistic-page #table-top > tbody');
        ui.tableSpinner = $('#table-spinner');
        ui.msgBox.canvasX = ui.msgBox.canvasY = 0;

        //init version
        $('.verison-value').html(ABOUT.version);

        //init about
        var aboutCont = $('#about-popup-content');
        aboutCont.find('#about-text').html(ABOUT.description);        
        //aboutCont.find('#about-version-value').html(ABOUT.version);
        aboutCont.find('#vk-group-ref').attr('href', ABOUT.groupRef);
        aboutCont.find('#author-ref').html(ABOUT.author).attr('href', ABOUT.authorRef);
        aboutCont.find('#website-ref').html(ABOUT.websiteName).attr('href', ABOUT.website);
        aboutCont.find('#pikabu-ref').html(ABOUT.pikabuNickname).attr('href', ABOUT.pikabuRef);
        var searchUrl = "http://vk.com/audio?q=" + ABOUT.musicAuthorName;
        $('#music-name').html(ABOUT.musicAuthorName).attr('href', searchUrl);


        //init time slider
        ui.timeSilder = $('#time-slider');
        ui.timeSilder.slider({
            range: 'min',
            value: 0,
            min: 0,
            max: ui.timeSliderMaxValue,
            step: 1,
            slide: function(event, ui) {
                app.animation_module.changeTimeF(ui.value / ui.timeSliderMaxValue);
            }
        });

        //init progress bar slider
        ui.progressBar = $('#progress-bar');
        ui.progressBar.slider({
            range: 'min',
            value: 0,
            min: 0,
            max: ui.progressBarMaxValue,
            step: 1,
            animate: 300,
            slide: function(event, ui) {
                return false;
            }
        });

        //init speed slider
        ui.speedSlider = $('#speed-slider');
        $.fn.extend({
            speedSliderConvert: function(value) {
                return 800000.0 * value / ui.speedSliderMaxValue;
            }
        });
        ui.speedSlider.slider({
            range: 'min',
            value: ui.speedSliderDefault,
            min: 0,
            max: ui.speedSliderMaxValue,
            step: 1,
            slide: function(event, ui) {
                if(ui.value == 0) {
                    app.pauseAnimation();
                }
                else {
                    var value = $.fn.speedSliderConvert(ui.value);
                    app.animation_module.changeTimeCoeff(value);
                    if(app.animation_module.paused) {
                        app.animation_module.continue(value);
                    }                    
                }
            }
        });

        //init settings sliders
        //max user num in animation
        ui.maxUsersSliderAnim = $('#max-users-slider-anim');
        ui.maxUsersSliderAnim.slider({
            range: 'min',
            value: 120,
            min: 50,
            max: 1500,
            step: 50,            
            slide: function(event, ui_arg) {
                ui.maxUsersValueAnimLabel.html(ui_arg.value);
                var settingsNew = {};
                settingsNew.maxUsersNumAnim = ui_arg.value;
                settingsNew.maxMsgNumAnim = ui.maxMsgsSliderAnim.slider('value');
                settingsNew.maxUsersNumStat = ui.maxUsersSliderStat.slider('value');
                var isChecked = ui.useWebGLcheckbox.is(':checked');
                settingsNew.useWebGL = isChecked ? true : false;
                app.onSettingsChanged(settingsNew);
            }
        });

        //max msg num
        ui.maxMsgsSliderAnim = $('#max-msg-slider-anim');
        ui.maxMsgsSliderAnim.slider({
            range: 'min',
            value: 2200,
            min: 100,
            max: 5000,
            step: 100,            
            slide: function(event, ui_arg) {
                ui.maxMsgValueAnimLabel.html(ui_arg.value);
                var settingsNew = {};
                settingsNew.maxUsersNumAnim = ui.maxUsersSliderAnim.slider('value');
                settingsNew.maxMsgNumAnim = ui_arg.value;
                settingsNew.maxMsgNumStat = ui.maxUsersSliderStat.slider('value');
                var isChecked = ui.useWebGLcheckbox.is(':checked');
                settingsNew.useWebGL = isChecked ? true : false;
                app.onSettingsChanged(settingsNew);
            }
        });

        //max user num in table
        ui.maxUsersSliderStat = $('#max-users-slider-stat');
        ui.maxUsersSliderStat.slider({
            range: 'min',
            value: 120,
            min: 50,
            max: 1500,
            step: 50,            
            slide: function(event, ui_arg) {
                ui.maxUsersValueStatLabel.html(ui_arg.value);
                var settingsNew = {};
                settingsNew.maxUsersNumAnim = ui.maxUsersSliderAnim.slider('value');
                settingsNew.maxMsgNumAnim = ui.maxMsgsSliderAnim.slider('value');
                settingsNew.maxUsersNumStat = ui_arg.value;
                var isChecked = ui.useWebGLcheckbox.is(':checked');
                settingsNew.useWebGL = isChecked ? true : false;
                app.onSettingsChanged(settingsNew);
            }
        });
    },
    setUserSettingsValues: function() {
        ui.maxUsersValueAnimLabel.html(userSettings.maxUsersNumAnim);
        ui.maxMsgValueAnimLabel.html(userSettings.maxMsgNumAnim);
        ui.maxUsersValueStatLabel.html(userSettings.maxUsersNumStat);
        ui.maxUsersSliderAnim.slider('value', userSettings.maxUsersNumAnim);
        ui.maxMsgsSliderAnim.slider('value', userSettings.maxMsgNumAnim);
        ui.maxUsersSliderStat.slider('value', userSettings.maxUsersNumStat);
        ui.useWebGllabel.html(userSettings.useWebGL ? 'Да' : 'Нет');
        ui.useWebGLcheckbox.attr('checked', userSettings.useWebGL);
    },
    clearSelectUserBlock: function() {
        $('#select-user-list').html('').attr('data-offset', '0');
    },
    addSelectUserBlock: function(data) {
        var container = $('#select-user-list');
        var className = "select-user-block";
        var display = "none";
        if(data.selected) {
            className = "select-user-block selected";
            display = "block";
        }
        var elem = '<div id="select-user-' + data.uid + '" class="' + className + '" data-uid="' + data.uid + '" data-color="' + data.color +
            '"><img src="'+ data.photo_50 + '" class="select-userpic">' +
            '</img><div class="select-username">'+ data.fullname + 
            '</div><div class="select-user-color" style="display: ' + display + ';background-color: ' + data.color + ';"></div></div>';
        $(elem).appendTo(container).hide().bind('click', data.click);
    },
    showNextSelectUserBlocks: function() {
        var elem = $('#select-user-list');
        var offset = parseInt(elem.attr('data-offset'), 10);
        var offsetMin = offset - 10 >= 0 ? offset - 10 : 0;
        var curBlocks =  $('#select-user-list .select-user-block').slice(offsetMin, offset);
        var nextBlocks =  $('#select-user-list .select-user-block').slice(offset, offset + 10);
        var len = nextBlocks.length;
        if(len > 0) {
            curBlocks.hide();
            nextBlocks.fadeIn(200);
            offset += 10;
            elem.attr('data-offset', offset);
        }
    },
    showPrevSelectUserBlocks: function() {
        var elem = $('#select-user-list');
        var offset = parseInt(elem.attr('data-offset'), 10);
        var offsetMin = offset - 10 >= 0 ? offset - 10 : 0;
        var curBlocks =  $('#select-user-list .select-user-block').slice(offsetMin, offset);
        if(offsetMin > 0) {
            var offsetMax = offset - 10;
            if(offsetMax < 0) offsetMax = 0;
            var offsetMin = offsetMax - 10;
            if(offsetMin < 0) offsetMin = 0;
            var prevBlocks =  $('#select-user-list .select-user-block').slice(offsetMin, offsetMax);
            var len = prevBlocks.length;
            if(len > 0) {
                curBlocks.hide();
                prevBlocks.fadeIn(200);
                offset -= len;
                elem.attr('data-offset', offset);
            }
        }
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
    resetValues: function() {
        ui.timeSliderMaxValue = 1000;
        ui.progressBarMaxValue = 1000;
        ui.speedSliderMaxValue = 1000;
        ui.speedSliderSaveValue = 0;
        ui.speedSliderDefault = 250;
        ui.isDateMenuVisible = false;
        ui.isContactBoxVisible = false;
        ui.initialDate = 1377632385;
        ui.speedSlider.slider('value', ui.speedSliderDefault);

        ui.clearSelectUserBlock();
        
        $('a#anim-button').addClass('selected');
        $('a#stat-button').removeClass('selected');

        $('#chart-b-all').addClass('selected');
        $('#chart-b-in').removeClass('selected');
        $('#chart-b-out').removeClass('selected');

        $('#chart-b-top-msg').addClass('selected');
        $('#chart-b-top-letters').removeClass('selected');

        $('#chart-b-stat-msg').addClass('selected');
        $('#chart-b-stat-letters').removeClass('selected');

        $('#select-user-list').attr('data-offset', 0).html('');

        $('#chart-b-intensity').addClass('selected');
        $('#chart-b-summary').removeClass('selected');

        $('#music-icon').addClass('no-music');

        $('#button-table').addClass('selected');
        $('#button-diagram').removeClass('selected');
        $('#button-plot').removeClass('selected');
    },
    setUserBlockData: function() {
        var fullname = account.profile.first_name + ' ' + account.profile.last_name;
        $('#username_field').html(fullname + '<span class="arrow-down"></span>');

        var userUrl = 'http://vk.com/' + account.profile.screen_name;
        $('a#user_field').attr('href', userUrl);

        $('a#userpic_field').attr('href', userUrl);
        $('a#userpic_field img').attr('src', account.profile.photo_50);
    },
    updatePopupMsgPos: function() {
        if(!ui.isMsgBoxVisible) return;
        var x = ui.msgBox.canvasX;
        var y = ui.msgBox.canvasY;
        var pos = app.animation_module.toScreenCoordinates(x, y);
        ui.msgBox.css({
            left: pos.x,
            top: pos.y
        });
    },
    setPopupMsgData: function(params) {
        var nameFrom = params.userFrom.firstName + ' ' + params.userFrom.lastName;
        var nameTo = params.userTo.firstName + ' ' + params.userTo.lastName;        
        $('#msg-from').html(nameFrom);
        $('#msg-to').html(nameTo);
        $('#msg-body').html(params.msg);        
    },
    showPopupMsg: function(pos, msec) {
        ui.isMsgBoxVisible = true;
        ui.msgBox.canvasX = pos.x;
        ui.msgBox.canvasY = pos.y;
        pos = app.animation_module.toScreenCoordinates(ui.msgBox.canvasX, ui.msgBox.canvasY);
        ui.msgBox.css({
            left: pos.x,
            top: pos.y
        });
        if(msec == undefined) {
            ui.msgBox.show();
        }
        else {            
            ui.msgBox.fadeIn(msec);
        }               
    },
    hidePopupMsg: function(msec) {
        ui.isMsgBoxVisible = false;
        if(msec == undefined) {
            ui.msgBox.hide();
        }
        else {            
            ui.msgBox.fadeOut(msec);
        }        
    },
    showContactBox: function(msec, data, fix) {
        var fixed = $.data(ui.contactBox, 'fixed');
        if(fixed && fix == undefined) return;
        if(data.isImg) {
            $('#contact-pic').css('background-image', 'url("' + data.img.src + '")');
        }
        else {
            $('#contact-pic').css('background-image', 'url("' + settings.DEFAULT_IMAGE_100_SRC + '")');
        }   
        
        var username = data.firstName + ' ' + data.lastName;

        $('#contact-name').html(username);
        $('#contact-vk').attr('href', 'http://vk.com/' + data.screenName);
        $('#contact-pic').attr('href', 'http://vk.com/' + data.screenName);
        $('#contact-msg-in').html(numberFormat(data.inMsgNum));
        $('#contact-msg-out').html(numberFormat(data.outMsgNum));
        $('a#stat-ref').attr('data-uid', data.userId);

        //fixate size
        ui.contactBox.fadeIn(msec);
        var container = $("#contact-info-stat");
        var containerH = 200;
        var containerW = $("#contact-info-wrap").width();
        container.css({height: containerH, width: containerW});

        var userId = data.isMain ? 'self' : data.userId;
        canvas_mini_chart.setSize(containerW, containerH)
        canvas_mini_chart.setUser(userId);
        canvas_mini_chart.plot();

        if(fix != undefined) {
            if(fix == true) {
                $.data(ui.contactBox, 'fixed', true);
            }
            else {
                $.data(ui.contactBox, 'fixed', false);
            }
        }
        ui.isContactBoxVisible = true;
    },
    hideContactBox: function(msec, hideIfFixed) {
        var fixed = $.data(ui.contactBox, 'fixed');
        if(!fixed) {
            ui.contactBox.fadeOut(msec);
            ui.isContactBoxVisible = false;
        } 
        else if(hideIfFixed) {
            ui.contactBox.fadeOut(msec);
            ui.isContactBoxVisible = false;
            $.data(ui.contactBox, 'fixed', false);
        }
    },
    showDateMenu: function(msec) {
        if(msec == undefined) {
            ui.dateMenu.show();
        }
        else {
            ui.dateMenu.fadeIn(msec);
        }
        ui.isDateMenuVisible = true;
    },
    hideDateMenu: function(msec) {
        if(msec == undefined) {
            ui.dateMenu.hide();
        }
        else {
            ui.dateMenu.fadeOut(msec);
        }
        ui.isDateMenuVisible = false;
    },
    showPlaybackMenu: function(msec) {
        if(msec == undefined) {
            ui.playbackMenu.show();
        }
        else {
            ui.playbackMenu.fadeIn(msec);
        }
    },
    hidePlaybackMenu: function(msec) {
        if(msec == undefined) {
            ui.playbackMenu.hide();
        }
        else {
            ui.playbackMenu.fadeOut(msec);
        }
    },
    showUserBox: function(msec) {
        if(msec == undefined) {
            ui.userbox.show();
        }
        else {
            ui.userbox.clearQueue();
            ui.userbox.css('opacity', 0);
            ui.userbox.css("margin-top", "10px");
            ui.userbox.show();
            ui.userbox.animate({opacity: 1}, {queue: false, duration: msec});
            ui.userbox.animate({ "margin-top": "0px" }, msec);
            //ui.userbox.fadeIn(msec);
        }        
    },
    hideUserBox: function(msec) {
        if(msec == undefined) {
            ui.userbox.hide();
        }
        else {
            ui.userbox.fadeOut(msec);
        }
    },
    showChartTip: function(x, y, label, msec) {
        ui.chartTip.finish().html(label).show();
        ui.chartTip.css({opacity: 1});
        if(msec == undefined || msec == 0) {
            ui.chartTip.css({
                top: y-48,
                left: x-25
            })
        }
        else {
            ui.chartTip.animate({
                top: y-48,
                left: x-25
            }, msec, 'linear');
        }      
    },
    hideChartTip: function(msec) {
        if(msec == undefined) {
            ui.chartTip.stop().hide();
        }
        else {
            ui.chartTip.stop().fadeOut(msec);
        }
    },
    showChartTopTip: function(x, y, label, msec) {
        ui.chartTopTip.finish().html(label);
        ui.chartTopTip.css({
            opacity: 1,
            top: y,
            left: x
        });
        if(msec == undefined || msec == 0) {
            ui.chartTopTip.show();
        }
        else {
            ui.chartTopTip.fadeIn(msec);
        }
    },
    hideChartTopTip: function(msec) {
        if(msec == undefined) {
            ui.chartTopTip.stop().hide();
        }
        else {
            ui.chartTopTip.stop().fadeOut(msec);
        }
    },
    showAboutPopup: function(msec) {
        if(msec == undefined) {
            ui.aboutPopup.show();
        }
        else {
            ui.aboutPopup.fadeIn(msec);
        }
    },
    hideAboutPopup: function(msec) {
        if(msec == undefined) {
            ui.aboutPopup.hide();
        }
        else {
            ui.aboutPopup.fadeOut(msec);
        }
        app.onAboutPopupClosed();
    },
    showSettingsPopup: function(msec) {
        if(msec == undefined) {
            ui.settingsPopup.show();
        }
        else {
            ui.settingsPopup.fadeIn(msec);
        }
    },
    hideSettingsPopup: function(msec) {
        if(msec == undefined) {
            ui.settingsPopup.hide();
        }
        else {
            ui.settingsPopup.fadeOut(msec);
        }
        app.onSettingsPopupClosed();
    },
    showMusicTip: function(msec) {
        var musicB = $('#music-b');
        var pos = musicB.position();
        ui.musicTip.css({
            left: pos.left,
            top: pos.top
        });
        if(msec == undefined) {
            ui.musicTip.show();
        }
        else {
            ui.musicTip.fadeIn(msec);
        }
    },
    hideMusicTip: function(msec) {
        if(msec == undefined) {
            ui.musicTip.hide();
        }
        else {
            ui.musicTip.fadeOut(msec);
        }
    },
    setPieData: function(params) {

        var inMsgNum = params.inMsgNum;
        var outMsgNum = params.outMsgNum;
        var periodText = params.periodText;
        var name = params.name;
        var imgSrc = params.img.src;
        var screenName = params.screenName;
        var msgTypeText = params.msgTypeText;
        
        var msgAll = inMsgNum + outMsgNum;

        $('#pie-legend-in-value').html(numberFormat(inMsgNum));
        $('#pie-legend-out-value').html(numberFormat(outMsgNum));

        var colors = complementColors();
        var colorIn = colors.first;
        var colorOut = colors.second;

        //var colorIn = 'rgba(228,177,122, 1.0)';
        //var colorOut = 'rgba(251,237,224, 1.0)';

        $('.legend li.legend-incoming').css({
            'border-left': '1.25em solid ' + colorIn
        });
        $('.legend li.legend-outcoming').css({
            'border-left': '1.25em solid ' + colorOut
        });
        $('#pie-msg-type').html(msgTypeText);
        $('#pie-period-name').html(periodText);
        $('#pie-period-value').html(numberFormat(msgAll));
        $('#pie-header-person').html(name);

        $('#pie-contact-pic').css('background-image', 'url("' + imgSrc + '")');
        $('#pie-contact-pic').attr('href', 'http://vk.com/' + screenName);

        if(outMsgNum < inMsgNum) {
            var fraction = outMsgNum / msgAll;
            var angle = 360 * fraction;
            var rotateValue = 180 - angle;
            $('#slice-slave').css({
                'transform': 'rotate(0deg) translate3d(0, 0, 0)'
            });
            $('#slice-slave span').css({
                'transform': 'rotate(-' + rotateValue + 'deg) translate3d(0, 0, 0)',
                'background-color': colorOut
            });
            $('#slice-master span').css({                
                'background-color': colorIn
            });
        }
        else {
            var fraction = msgAll > 0 ? inMsgNum / msgAll : 0;
            var angle = 360 * fraction;
            var rotateValue = 180 - angle;
            $('#slice-slave').css({
                'transform': 'rotate(-' + angle + 'deg) translate3d(0, 0, 0)'
            });
            $('#slice-slave span').css({
                'transform': 'rotate(-' + rotateValue + 'deg) translate3d(0, 0, 0)',
                'background-color': colorIn
            });
            $('#slice-master span').css({
                'background-color': colorOut
            });
        }
    },
    hidePieChart: function(msec) {
        if(msec == undefined) {
            ui.pieChart.hide();
        }
        else {
            ui.pieChart.fadeOut(msec);
        }
    },
    showPieChart: function(msec) {
        if(msec == undefined) {
            ui.pieChart.show();
        }
        else {
            ui.pieChart.fadeIn(msec);
        }
    },
    showTable: function(data, callback) {

        //clear table        
        var finished = false;
        ui.tableTop.hide();        

        setTimeout(function() {
            if(!finished) {
                ui.tableSpinner.show();
            }            
        }, 100);

        //async
        setTimeout(function() {

            ui.tableBody.html('');

            var fullname = account.profile.first_name + ' ' + account.profile.last_name;
            var imgSrc = account.profile.photo_50
            var htmlText = '';
            if(!data.emptyMsgData) {
                htmlText += '<tr class="user-self">';
            } else {
                htmlText += '<tr>'
            }

            htmlText += '<td></td><td class="user"><img  class="user-icon" src="' + imgSrc + '"" />';
            htmlText += '<span class="name">' + fullname + '</span></td>';
            htmlText += '<td>' + numberFormat(data.msgNum) + '</td><td>';
            htmlText += numberFormat(data.outMsgNum) +'</td><td>' + numberFormat(data.inMsgNum) + '</td></tr>';

            ui.tableBody.append(htmlText);

            var label;
            for(var i = 0; i < data.topDialogsData.length; i++) {
                var dialogInfo = data.topDialogsData[i];
                if(dialogInfo.isChat) {
                    label = dialogInfo.title;
                }
                else {
                    label = dialogInfo.first_name + ' ' + dialogInfo.last_name;
                }
                var imgSrc = dialogInfo.photo_50;
                if(!imgSrc) {
                    imgSrc = settings.DEFAULT_IMAGE_50_SRC;
                }
                var msgNum = data.valuesDialogs[i];
                var outMsgNum = data.outValuesDialogs[i];
                var inMsgNum = msgNum - outMsgNum;
                var htmlText = '<tr><td>' + (i+1) + '</td><td class="user"><img  class="user-icon" src="' + imgSrc + '"" />';
                htmlText += '<span class="name">' + label + '</span></td>';
                htmlText += '<td>' + numberFormat(msgNum);
                htmlText += '</td><td>'+ numberFormat(outMsgNum) +'</td><td>' + numberFormat(inMsgNum) + '</td></tr>';
                ui.tableBody.append(htmlText)
            }    
            finished = true;        

            ui.tableSpinner.hide();
            ui.tableTop.fadeIn(200);
            callback();
        }, 0);

    }
}

