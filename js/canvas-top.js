canvas_top = (function() {

	var chartTop = {};

	var canvas;
	var context;

	var containerW;
	var containerH;	
    var containerLeft;
    var containerTop;

	var values;
	var valuesMsgNum;
	var valuesInMsgNum;
	var valuesOutMsgNum;
	var images;
	var topDialogsData;
	var maxValue;
	var periodStart;
	var periodEnd;

	var msgNum, inMsgNum, outMsgNum;

	var periodType;
	var countingType;

	var barWidth;
	var widthBetween;

	var bars;
	var barOver;

	var maxX, maxY, minY, minX;
	var graphWidth, graphHeight;
	var wholeWidth;

	var inited = false;
	var viewOffsetX;
	var emptyMsgData = true;

	var sliderScaleW;
	var sliderScaleH;
	var sliderMarginTop;
	var sliderWidth;
	var sliderHeight;

	var Rectangle = function(){
		var bar = {};
		bar.x = 0;
		bar.y = 0;
		bar.width = 0;
		bar.height = 0;
		bar.color = "#658AB0";
		bar.contains = function(x1, y1) {
			if(x1 < bar.x || y1 < bar.y - bar.width - 3) return false;
			if(x1 > bar.x + bar.width) return false;
			if(y1 > bar.y + bar.height) return false;
			return true;
		}
		return bar;
	}

	function handleMouseDown(e) {
		if(emptyMsgData) return;
		chartTop.mouseDown = true;		

		chartTop.isDragging = false;
		chartTop.isSliderDragging = false;

		chartTop.mousePosX = e.pageX - containerLeft;
        chartTop.mousePosY = e.pageY - containerTop;
	}

	function handleMouseUp(e) {
        chartTop.mouseDown = false;
        chartTop.mousePosX = e.pageX - containerLeft;
        chartTop.mousePosY = e.pageY - containerTop;

        if(chartTop.isDragging) {
        	chartTop.isDragging = false;
        	chartTop.isSliderDragging = false;
        }
        else {

        	if(barOver != null) {
        		if(barOver.index != chartTop.lastPieIndex) {
        			ui.hidePieChart();
        			updatePieChart(barOver.index);
        			ui.showPieChart(300);
        		}
        		else {
        			updatePieChart(barOver.index);
        		}        		
        		chartTop.lastPieIndex = barOver.index;
        	}
        	else {
        		var isInside = chartTop.mousePosX > 0 && chartTop.mousePosX < containerW;
        		isInside = isInside && chartTop.mousePosY > 0 && chartTop.mousePosY < containerH;
        		if(isInside) {
        			if(-1 != chartTop.lastPieIndex) {
        				ui.hidePieChart();
        				updatePieChart(-1);
        				ui.showPieChart(300);
        			}
        			else {
        				updatePieChart(-1);
        			}					
					chartTop.lastPieIndex = -1;
        		}        		
        	}
        }
    }

	function handleMouseMove(e) {

		if(emptyMsgData) return;

		var posX = e.pageX - containerLeft;
        var posY = e.pageY - containerTop;
        if(chartTop.mousePosX == posX && chartTop.mousePosY == posY) {
            return;
        }        

        isSliderArea = posY > sliderMarginTop && posY < sliderMarginTop + sliderHeight;
        isSliderArea = isSliderArea && posX > minX && posX < maxX;
        
        if(chartTop.mouseDown) {
        	chartTop.isDragging = true;
        	if(isSliderArea) {
        		chartTop.isSliderDragging = true;
        	}

        	var deltaX = chartTop.mousePosX - posX;
        	if(chartTop.isSliderDragging) {
        		viewOffsetX = viewOffsetX + deltaX / sliderScaleW;
        	}
        	else {
        		viewOffsetX = viewOffsetX - deltaX;
        	}
        	        	
        	if(viewOffsetX > 0) viewOffsetX = 0;        	
        	var minOffset = min(containerW - minX - wholeWidth, 0);
        	if(viewOffsetX < minOffset) viewOffsetX = minOffset;

        	chartTop.draw();
        	if(barOver != null) {
				var x = viewOffsetX + barOver.x + barOver.width;
				if(x < containerW) {
					var y = barOver.y;
					var index = barOver.index;
					var dialogInfo = topDialogsData[index];
					var label;
					if(dialogInfo.isChat) {
						label = dialogInfo.title;
					}
					else {
						label = dialogInfo.first_name + ' ' + dialogInfo.last_name;
					}					
					label += '<p>';
					label += (100 * values[index]).toFixed(2) + '%';
					var label_msg;
					if(countingType == 'msg') {
						label_msg = 'сообщений';
					}
					else if(countingType == 'letter') {
						label_msg = 'символов'
					}
					label += ' (' + numberFormat(valuesMsgNum[index]) + ' ' + label_msg + ')';
					ui.showChartTopTip(x+5, y - barOver.width - 3, label);
				}
				else {
					ui.hideChartTopTip(150);
				}				
			}
        }
        else {

        	var x = posX - viewOffsetX;
        	var y = posY;

        	var barChanged = false;
			var isOver = false;

			if(barOver) barOver.color = '#658AB0';
			else barOver = null;

			var barOverOld = barOver;
			if(posX < containerW) {
				for(var i = 0; i < bars.length; i++) {
					if(bars[i].contains(x, y)) {				
						bars[i].color = '#557DA6';
						barOver = bars[i];						
						isOver = true;
						break;
					}
				}
			}			
			if(!isOver) {
				barOver = null;
			}
			var barChanged = barOver != barOverOld;
			if(barChanged) {
				chartTop.draw();
				if(barOver != null) {
					var x = viewOffsetX + barOver.x + barOver.width;
					var y = barOver.y;
					var index = barOver.index;
					var dialogInfo = topDialogsData[index];
					var label;
					if(dialogInfo.isChat) {
						label = dialogInfo.title;
					}
					else {
						label = dialogInfo.first_name + ' ' + dialogInfo.last_name;
					}
					label += '<p>';
					label += (100 * values[index]).toFixed(2) + '%';
					var label_msg;
					if(countingType == 'msg') {
						label_msg = 'сообщений';
					}
					else if(countingType == 'letter') {
						label_msg = 'символов'
					}
					label += ' (' + numberFormat(valuesMsgNum[index]) + ' ' + label_msg + ')';
					ui.showChartTopTip(x+5, y - barOver.width - 3, label);					
				}
				else {
					ui.hideChartTopTip(150);					
				}
			}
        }

        chartTop.mousePosX = posX;
        chartTop.mousePosY = posY;		
	}

	function handleResize() {
		if(!inited) return;
        var container = $('#canvas-top-container');
        var width = container.width();
        var height = container.height();
        var offsetPos = container.offset();

        chartTop.setSize(width, height, offsetPos.left, offsetPos.top);
        chartTop.draw();
	}

	chartTop.init = function() {
		canvas = document.getElementById('canvas-top');		

		barWidth = 40;
		widthBetween = 30;

		viewOffsetX = 0;
		bars = [];
		barOver = null;

		values = [];
		valuesMsgNum = [];
		valuesInMsgNum = [];
		valuesOutMsgNum = [];
		images = [];
		topDialogsData = [];
		maxValue = 0;
		periodStart = null;
		periodEnd = null;

		periodType = 'today';
		countingType = 'msg';
		
		$('#canvas-top').mousedown(handleMouseDown);
        $('#statistic-page').mouseup(handleMouseUp);
        $('#statistic-page').mousemove(handleMouseMove);
		$(window).resize(handleResize);

        inited = true;
	}

	chartTop.setSize = function(width, height, offsetLeft, offsetTop) {
		containerH = height;
        containerW = width;
        containerLeft = offsetLeft;
        containerTop = offsetTop;
		canvas.width = containerW > 300 ? containerW : 300;
        canvas.height = containerH > 300 ? containerH : 300;

		context = canvas.getContext('2d');
		optimizeQuality(canvas, context);

		maxY = containerH - 40;
		minY = 30;
		graphHeight = maxY - minY;

		maxX = containerW;
		minX = 55;
		graphWidth = containerW - minX;

		sliderMarginTop = maxY + 5;
		sliderWidth = maxX - minX;
		sliderHeight = 35;
	}

	chartTop.setPeriodType = function(periodTypeNew, start, end) {
		viewOffsetX = 0;
		if(periodTypeNew == 'today') {
			periodType = 'today';
		}
		else if(periodTypeNew == 'yesterday') {
			periodType = 'yesterday';
		}
		else if(periodTypeNew == 'week') {
			periodType = 'week';
		}
		else if(periodTypeNew == 'month') {
			periodType = 'month';
		}
		else if(periodTypeNew == 'year') {
			periodType = 'year';
		}
		else if(periodTypeNew == 'all') {
			periodType = 'all';
		}
		else if(periodTypeNew == 'custom') {
			periodType = 'custom';
			periodStart = start;
			periodEnd = end;
		}
	}

	chartTop.setCountingType = function(countingTypeNew) {
		if(countingTypeNew == 'msg') {
			countingType = 'msg';
		}
		else if(countingTypeNew == 'letter') {
			countingType = 'letter';
		}
		else {
			countingType = 'msg';
		}
	}

	chartTop.plot = function() {
		var topUids = [];
		var uidMsgs = {};
		var uidMsgsLen = {};
		var chatMsgs = {};
		var chatMsgsLen = {};
		var topChats = [];

		var topDialogs = [];

		values = [];
		valuesMsgNum = [];
		valuesInMsgNum = [];
		valuesOutMsgNum = [];
		images = [];
		topDialogsData = [];

		var startDate;
		var now = Math.round((new Date()).getTime() / 1000); //now
		var endDate = now;
		if(periodType == 'today') {
			var dateNow = new Date();
			var dateToday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate());
			startDate = Math.round(dateToday.getTime() / 1000);
		}
		else if(periodType == 'yesterday') {
			var dateNow = new Date();
			var dateToday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate());
			var dateYesterday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() - 1);
			startDate = Math.round(dateYesterday.getTime() / 1000);
			endDate = Math.round(dateToday.getTime() / 1000);
		}
		else if(periodType == 'week') {
			var dateNow = new Date();
			var dateWeekAgo1 = new Date(dateNow.getTime() - 7 * SEC_IN_DAY * 1000);
			var dateWeekAgo = new Date(dateWeekAgo1.getFullYear(), dateWeekAgo1.getMonth(), dateWeekAgo1.getDate());
			startDate = Math.round(dateWeekAgo.getTime() / 1000);
		}
		else if(periodType == 'month') {
			var dateNow = new Date();
        	var year = dateNow.getFullYear();
        	var month = dateNow.getMonth() + 1; /*current month 1-12*/ 
        	var daysNum = getDaysInMonth(month - 1, year); /*0-11*/
        	var dateMonthAgo1 = new Date(dateNow.getTime() - daysNum * SEC_IN_DAY * 1000);
			var dateMonthAgo = new Date(dateMonthAgo1.getFullYear(), dateMonthAgo1.getMonth(), dateMonthAgo1.getDate());
			startDate = Math.round(dateMonthAgo / 1000);
		}
		else if(periodType == 'year') {
			var dateNow = new Date();
			var dateYearAgo1 = new Date(dateNow.getTime() - SEC_IN_YEAR * 1000);
			var dateYearAgo = new Date(dateYearAgo1.getFullYear(), dateYearAgo1.getMonth(), dateYearAgo1.getDate());
			startDate = Math.round(dateYearAgo / 1000);
		}
		else if(periodType == 'custom') {

			if(periodStart == null) {
				startDate = 0;
			} else {
				startDate = Math.round(periodStart.getTime() / 1000);				
			}

			if(periodEnd == null) {				
				endDate = now;
			} else {				
				var nextDay = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1);
				endDate = Math.round(nextDay.getTime() / 1000);
				if(endDate > now) endDate = now;
			}

		}
		else {
			startDate = 0;
		}
		
		//all messages for the selected period		
		var idx = dm.msgData.date.length - 1;
		//skip
		while(idx >= 0 && dm.msgData.date[idx] > endDate) {					
			idx--;
		}
		//get uidMsgs for the selected period
		while(idx >= 0 && dm.msgData.date[idx] >= startDate && dm.msgData.date[idx] <= endDate) {
			var uid = dm.msgData.uids[idx];
			var out = dm.msgData.out[idx];
			var chat_id = dm.msgData.chat_ids[idx];
			var len = dm.msgData.len[idx];
			if(chat_id != 0) {
				//message from chat
				if(!chatMsgs[chat_id]) {
					chatMsgs[chat_id] = [uid];
					chatMsgsLen[chat_id] = [len];
					topChats.push(chat_id);
					topDialogs.push({isChat: true, chat_id: chat_id});
				}
				else {
					chatMsgs[chat_id].push(uid);
					chatMsgsLen[chat_id].push(len);
				}
			}
			else {
				if(!uidMsgs[uid]) {
					uidMsgs[uid] = [out];
					uidMsgsLen[uid] = [len];
					topUids.push(uid);
					topDialogs.push({isChat: false, uid: uid});
				}
				else {
					uidMsgs[uid].push(out);
					uidMsgsLen[uid].push(len);
				}
			}			
			idx--;
		}

		//sorting, get topUids
	    var msgNumA, msgNumB;

	    if(countingType == 'msg') {
	    	topUids.sort(function(a, b) {
		        msgNumA = uidMsgs[a].length;
		        msgNumB = uidMsgs[b].length;
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
	    } else if (countingType == 'letter') {
	    	topUids.sort(function(a, b) {
	    		msgNumA = 0;
	    		for(var i = 0; i < uidMsgs[a].length; i++) {
	    			msgNumA += uidMsgsLen[a][i];
	    		}
		        
		        msgNumB = 0;
	    		for(var i = 0; i < uidMsgs[b].length; i++) {
	    			msgNumB += uidMsgsLen[b][i];
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
	    }		

	    //sorting, get topDialogs
        var msgNumA, msgNumB;

        if(countingType == 'msg') {
        	topDialogs.sort(function(a, b) {            
	            if(a.isChat) {
	                msgNumA = chatMsgs[a.chat_id].length;
	            }
	            else {
	                msgNumA = uidMsgs[a.uid].length;
	            }

	            if(b.isChat) {
	                msgNumB = chatMsgs[b.chat_id].length;
	            }
	            else {
	                msgNumB = uidMsgs[b.uid].length;
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
        }
        else if(countingType == 'letter') {
        	topDialogs.sort(function(a, b) {            
	            if(a.isChat) {
	                msgNumA = 0;
		    		for(var i = 0; i < chatMsgs[a.chat_id].length; i++) {
		    			msgNumA += chatMsgsLen[a.chat_id][i];
		    		}
	            }
	            else {
	            	msgNumA = 0;
		    		for(var i = 0; i < uidMsgs[a.uid].length; i++) {
		    			msgNumA += uidMsgsLen[a.uid][i];
		    		}	                
	            }

	            if(b.isChat) {
	                msgNumB = 0;
		    		for(var i = 0; i < chatMsgs[b.chat_id].length; i++) {
		    			msgNumB += chatMsgsLen[b.chat_id][i];
		    		}
	            }
	            else {
	                msgNumB = 0;
		    		for(var i = 0; i < uidMsgs[b.uid].length; i++) {
		    			msgNumB += uidMsgsLen[b.uid][i];
		    		}
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
        }        

	    //compute total message number for this period
	    msgNum = 0;
	    inMsgNum = 0;
	    outMsgNum = 0;
	    var valuesDialogs = [];
	    var outValuesDialogs = [];
	    for(var i = 0; i < topDialogs.length; i++) {
	    	var msgNumUid = 0;	    	
	    	var outMsgNumUid = 0;
	    	if(topDialogs[i].isChat) {
	    		var chat_id = topDialogs[i].chat_id;
	    		if(countingType == 'msg') {
	    			msgNumUid = chatMsgs[chat_id].length;
		    		//outMsgNumUid += nonzeroNumber(chatMsgs[chat_id]);
		    		for(var k = 0; k < chatMsgs[chat_id].length; k++) {
		    			if(chatMsgs[chat_id][k] == account.userId) {
		    				outMsgNumUid++;
		    			}
		    		}
	    		}
	    		else if(countingType == 'letter') {
	    			msgNumUid = 0;
	    			outMsgNumUid = 0;
	    			for(var k = 0; k < chatMsgs[chat_id].length; k++) {
	    				msgNumUid += chatMsgsLen[chat_id][k];
		    			if(chatMsgs[chat_id][k] == account.userId) {
		    				outMsgNumUid += chatMsgsLen[chat_id][k];
		    			}
		    		}
	    		}	    		
	    	}
	    	else {
	    		var uid = topDialogs[i].uid;
	    		if(countingType == 'msg') {
	    			msgNumUid += uidMsgs[uid].length;
	    			outMsgNumUid += nonzeroNumber(uidMsgs[uid]);
	    		}
	    		else if(countingType == 'letter') {
	    			msgNumUid = 0;
	    			outMsgNumUid = 0;
	    			for(var k = 0; k < uidMsgs[uid].length; k++) {
	    				msgNumUid += uidMsgsLen[uid][k];
	    				if(uidMsgs[uid][k]) {
	    					outMsgNumUid += uidMsgsLen[uid][k];
	    				}
	    			}
	    		}	    		
	    	}
	    	msgNum += msgNumUid;
	    	outMsgNum += outMsgNumUid;
	    	valuesDialogs[i] = msgNumUid;
	    	outValuesDialogs[i] = outMsgNumUid;
	    }
	    inMsgNum = msgNum - outMsgNum;

	    var len = 0;	    

	    if(msgNum > 0) {

	    	emptyMsgData = false;
	    	//max number of bars
			len = topDialogs.length;
			if(len > userSettings.maxUsersNumAnim) len = userSettings.maxUsersNumAnim;

			//compute values
			var uid, img, value, valueIn, valueOut;
			var imgsLoaded = 0;
			for(var i = 0; i < len; i++) {
				
				value = valuesDialogs[i];
				valueOut = outValuesDialogs[i];
				valueIn = value - valueOut;

				valuesInMsgNum.push(valueIn);
				valuesOutMsgNum.push(valueOut);
				valuesMsgNum.push(value);

				value /= msgNum;
				values.push(value);

				if(topDialogs[i].isChat) {
					var chat_id = topDialogs[i].chat_id;
					var idx = dm.chatsDataRefById[chat_id];

					img = new Image(barWidth, barWidth);
					img.onload = function() {
						imgsLoaded++;
						if(imgsLoaded >= len) {
							if(chartTop.onAllMessagesLoaded) {
								chartTop.onAllMessagesLoaded();
							}						
						}
					}
					if(dm.chatsData[idx].photo_50) {
						img.src = dm.chatsData[idx].photo_50;
					}
					else {
						img.src = settings.DEFAULT_IMAGE_100_SRC
					}
					
					images[i] = img;
					
					topDialogsData.push(dm.chatsData[idx]);
				}
				else {
					var uid = topDialogs[i].uid;
					var idx = dm.usersDataRefByUid[uid];

					img = new Image(barWidth, barWidth);
					img.onload = function() {
						imgsLoaded++;
						if(imgsLoaded >= len) {
							if(chartTop.onAllMessagesLoaded) {
								chartTop.onAllMessagesLoaded();
							}						
						}
					}
					img.src = dm.usersData[idx].photo_50;				
					images[i] = img;
					
					topDialogsData.push(dm.usersData[idx]);
				}
				
			}

			maxValue = Array.max(values);
			if(maxValue <= 0) maxValue = 1;			
			
			var barsNum = len;
			
			var offsetX = minX + widthBetween;

			bars = [];
			for(var i = 0; i < barsNum; i++) {
				var y = values[i] * graphHeight / maxValue - barWidth - 3;
				if(y < 3) y = 3;
				var bar = new Rectangle();
				bar.x = offsetX; bar.y = maxY - y; bar.width = barWidth; bar.height = y;
				bar.value = values[i];
				bar.index = i;
				bars.push(bar);
				offsetX += barWidth + widthBetween;
			}
	    }
	    else {
	    	bars = [];
	    	maxValue = 1.0;
	    	emptyMsgData = true;
	    }

	    wholeWidth = barWidth * bars.length + widthBetween * (bars.length + 1);
		sliderScaleW = min(sliderWidth / wholeWidth, 0.1);
		sliderScaleH = sliderHeight / (maxY - minY);

	    //show pie chart
	    if(barOver != null) {
	    	updatePieChart(barOver.index);
	    	chartTop.lastPieIndex = barOver.index;
	    }
	    else {
	    	updatePieChart(-1);
	    	chartTop.lastPieIndex = -1;
	    }
	}

	chartTop.onAllMessagesLoaded = null;

	chartTop.clearData = function() {

		//delete reference only
		values = [];
		valuesMsgNum = [];
		valuesInMsgNum = [];
		valuesOutMsgNum = [];
		images = [];
		topDialogsData = [];

		canvas = null;
		context = null;

		//unbind event handlers
		$('#canvas-top').unbind('mousedown', handleMouseDown);
        $('#statistic-page').unbind('mouseup', handleMouseUp);
        $('#statistic-page').unbind('mousemove', handleMouseMove);
		$(window).unbind('resize', handleResize);

		inited = false;
	}

	function updatePieChart(index) {
		if(!inited) return;
		var params = {};
		if(index == -1) {			
		    params.inMsgNum = inMsgNum;
		    params.outMsgNum = outMsgNum;		    
        	var label = account.profile.first_name + ' ' + account.profile.last_name;
			params.name = label;
			var img = new Image(30, 30);
			img.src = account.profile.photo_50;
			params.img = img;
			params.screenName = account.profile.screen_name;
		}
		else {		    
		    params.inMsgNum = valuesInMsgNum[index];
		    params.outMsgNum = valuesOutMsgNum[index];
		    var dialogInfo = topDialogsData[index];
		    if(dialogInfo.isChat) {		    	
				params.name = dialogInfo.title;
				params.screenName = 'im?sel=c' + dialogInfo.chat_id;
		    }
		    else {
				params.name = dialogInfo.first_name + ' ' + dialogInfo.last_name;
				params.screenName = dialogInfo.screen_name;
		    }		    
			params.img = images[index];			
		}

		if(periodType == 'today') {
			params.periodText = 'сегодня:';
		}
		else if(periodType == 'yesterday') {
			params.periodText = 'вчера:';
		}
		else if(periodType == 'week') {
			params.periodText = 'неделю:';
		}
		else if(periodType == 'month') {
			params.periodText = 'месяц:';
		}
		else if(periodType == 'year') {
			params.periodText = 'год:';
		}
		else {
			params.periodText = 'все время:';
		}

		if(countingType == 'msg') {
			params.msgTypeText = 'сообщений';
		}
		else if(countingType == 'letter') {
			params.msgTypeText = 'символов';
		}
		ui.setPieData(params);
	}	

	chartTop.draw = function() {

		context.clearRect(0, 0, canvas.width, canvas.height);

		context.fillStyle = "#658AB0";
		context.strokeStyle = "#658AB0";
		context.textAlign = "right";
		context.font = "12px tahoma";
		context.lineWidth = 0.2;		
		
		//draw bars		
		context.globalAlpha = 0.9;
		for(var i = 0; i < bars.length; i++) {			
			context.fillStyle = bars[i].color;
			context.fillRect(viewOffsetX + bars[i].x, bars[i].y, bars[i].width, bars[i].height);
			var x = viewOffsetX + bars[i].x;
			var y = bars[i].y - bars[i].width - 3;
			try {
				context.drawImage(images[i], x, y, bars[i].width, bars[i].width);
			}
			catch(e) {
				context.fillRect(x, y, bars[i].width, bars[i].width);
			}			
		}

		//draw border
		context.strokeStyle = "#152A50";
		context.lineWidth = 2;
		context.globalAlpha = 1;
		context.beginPath();
		for(var i = 0; i < bars.length; i++) {			
			var x = viewOffsetX + bars[i].x;
			var y = bars[i].y - bars[i].width - 3;
			context.moveTo(x+1, y);
			context.lineTo(x + bars[i].width-1, y);
			context.lineTo(x + bars[i].width-1, y + bars[i].width);
			context.lineTo(x+1, y + bars[i].width);
			context.lineTo(x+1, y);
		}
		context.stroke();

		//draw grid
		context.clearRect(0, 0, minX, canvas.height);
		context.strokeStyle = "#658AB0";
		context.globalAlpha = 1;
		context.lineWidth = 0.2;
		var linesNum = 10;
		var stepHeight = graphHeight / (linesNum - 1);
		var verticalStep = maxValue / (linesNum - 1);
		context.beginPath();
		for(var i = 0; i < linesNum; i++) {
			var y = minY + graphHeight - i * stepHeight;
			context.moveTo(minX, y);
			context.lineTo(containerW, y);
			var text = (100 * verticalStep * i).toFixed(1) + '%';
			context.fillText(text, minX - 10, y + 5);
		}
		context.stroke();

		//draw slider
		context.strokeStyle = "#658AB0";
		context.globalAlpha = 1;
		context.lineWidth = 0.2;
		context.beginPath();
		context.moveTo(minX, sliderMarginTop);
		context.lineTo(maxX - 1, sliderMarginTop);
		context.lineTo(maxX - 1, sliderMarginTop + sliderHeight);
		context.lineTo(minX,  + sliderMarginTop + sliderHeight);
		context.closePath();
		context.stroke();		

		context.globalAlpha = 0.9;		
		for(var i = 0; i < bars.length; i++) {			
			context.fillStyle = bars[i].color;
			var x = minX + sliderScaleW * (bars[i].x - minX);
			var y = sliderMarginTop + sliderScaleH * (bars[i].y - bars[i].width - 3);			
			var width = sliderScaleW * bars[i].width;
			var height = sliderScaleH * (bars[i].height + bars[i].width + 3);
			context.fillRect(x, y, width, height);
		}

		var sliderPos = -sliderScaleW * viewOffsetX
		context.lineWidth = 0.5;
		context.beginPath();
		context.moveTo(minX + sliderPos, sliderMarginTop);
		context.lineTo(minX + sliderPos + sliderScaleW * sliderWidth - 1, sliderMarginTop);
		context.lineTo(minX + sliderPos + sliderScaleW * sliderWidth - 1, sliderMarginTop + sliderHeight);
		context.lineTo(minX + sliderPos, sliderMarginTop + sliderHeight);
		context.closePath();
		context.stroke();

		if(emptyMsgData) {
            //fade out canvas a little
            context.globalAlpha = 0.1;
            context.fillStyle = "#658AB0";
            context.fillRect(minX, minY, maxX - minX, maxY - minY);

            var centerPosX = minX + Math.round((maxX - minX) / 2);
            var centerPosY = minY + Math.round((maxY - minY) / 2);

            //light message box
            var boxWidth = 150;
            var boxHeight = 60;
            var x = centerPosX - Math.round(boxWidth / 2);
            var y = centerPosY - Math.round(boxHeight / 2);
            context.fillStyle = "#FFFFFF";
            context.globalAlpha = 0.6;
            context.fillRect(x, y, boxWidth, boxHeight);
            //border
            context.strokeStyle = "#152A50";
            context.lineWidth = 1;
            context.globalAlpha = 0.2;
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + boxWidth, y);
            context.lineTo(x + boxWidth, y + boxHeight);
            context.lineTo(x, y + boxHeight);
            context.lineTo(x, y);
            context.stroke();

            //text in center
            context.textAlign = "center";
            context.font = "14px tahoma";
            context.globalAlpha = 0.8;
            context.fillStyle = "#658AB0";
            context.fillText("Нет данных", centerPosX, centerPosY + 5);
        }
	}

	return chartTop;

})();