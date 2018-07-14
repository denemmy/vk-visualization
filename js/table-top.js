table_top = (function() {

	var tableTop = {};
	var inited = false;
	var periodType;
	var countingType;
	var emptyMsgData = true;

	var periodStart;
	var periodEnd;

	var msgNum;
	var inMsgNum;
	var outMsgNum;
	var valuesDialogs;
	var outValuesDialogs;
	var topDialogsData;
	tableTop.isAnimating = false;

	tableTop.init = function() {
		tableTop.isAnimating = false;
		inited = true;
		emptyMsgData = true;
		periodType = 'all';
		countingType = 'msg';
		tableBody = $("#table-top > tbody");

		periodStart = null;
		periodEnd = null;

		msgNum = 0;
	    inMsgNum = 0;
	    outMsgNum = 0;
	    valuesDialogs = [];
	    outValuesDialogs = [];
	    topDialogsData = [];
	}

	tableTop.plot = function() {
		var topUids = [];
		var uidMsgs = {};
		var uidMsgsLen = {};
		var chatMsgs = {};
		var chatMsgsLen = {};
		var topChats = [];

		var topDialogs = [];

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
	    valuesDialogs = [];
	    outValuesDialogs = [];
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
			if(len > userSettings.maxUsersNumStat) len = userSettings.maxUsersNumStat;

			//compute values
			var uid, img, value, valueIn, valueOut;
			for(var i = 0; i < len; i++) {

				if(topDialogs[i].isChat) {
					var chat_id = topDialogs[i].chat_id;
					var idx = dm.chatsDataRefById[chat_id];				
					topDialogsData.push(dm.chatsData[idx]);
				}
				else {
					var uid = topDialogs[i].uid;
					var idx = dm.usersDataRefByUid[uid];
					topDialogsData.push(dm.usersData[idx]);
				}
				
			}
	    }
	    else {
	    	emptyMsgData = true;
	    }
	}

	tableTop.display = function() {

		var data = {};
		data.emptyMsgData = emptyMsgData;
		data.msgNum = msgNum;
		data.outMsgNum = outMsgNum;
		data.inMsgNum = inMsgNum;
		data.valuesDialogs = valuesDialogs;
		data.outValuesDialogs = outValuesDialogs;
		data.topDialogsData = topDialogsData;

		tableTop.isAnimating = true;
		ui.showTable(data, function() {
			tableTop.isAnimating = false;
		});

	}

	tableTop.setCountingType = function(countingTypeNew) {
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

	tableTop.setPeriodType = function(periodTypeNew, start, end) {
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
		} else if(periodTypeNew == 'custom') {
			periodType = 'custom';
			periodStart = start;
			periodEnd = end;
		}
	}
	

	return tableTop;

})();