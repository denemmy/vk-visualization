
canvas_mini_chart = (function(){
    var minichart = {};
    var chartObj;
    var containerW;
    var containerH;
    var uid;
    var timeStep = 3;
    var intervals;
    var minDate;
    var maxDate;
    var periodLen;
    minichart.setSize = function(width, height) {
        chartObj.setSize(width, height);
        containerW = width;
        containerH = height;
    };
    minichart.setUser = function(userId) {
        if(userId != uid) {
            uid = userId;
        }
    };
    function processData() {
        
        //time step in seconds
        var timeStepSec = timeStep * SEC_IN_DAY;

        //compute minDate, maxDate, periodLen for selected uid
        if(uid == 'self') {
            minDate = dm.startDate - timeStepSec;
            maxDate = dm.endDate + timeStepSec;           
            periodLen = maxDate - minDate;
        }
        else {
            var index;
            if(dm.uidMsgs[uid].length > 0) {
                index = dm.uidMsgs[uid][0];
                minDate = dm.msgData.date[index] - timeStepSec;

                index = dm.uidMsgs[uid][dm.uidMsgs[uid].length - 1];
                maxDate = dm.msgData.date[index] + timeStepSec;
            }
            else {
                var currentDate = (new Date()).getTime();
                minDate = currentDate - timeStepSec;
                maxDate = currentDate + timeStepSec;
            }
            
            periodLen = maxDate - minDate;
            if(periodLen < 2 * timeStepSec) {
                var middleDate = minDate + Math.round((maxDate - minDate) / 2);
                var halfPeriodLen = timeStepSec;
                minDate = middleDate - halfPeriodLen;
                maxDate = middleDate + halfPeriodLen;
                periodLen = maxDate - minDate;
            }
        }
        
        var stepsNum = Math.floor(periodLen / timeStepSec) + 1;
        
        //fill intervals
        intervals = [];
        for(var i = 0; i < stepsNum; i++) {
            intervals.push(0);
        }

        if(uid == 'self') {
            var date, interval;            
            for(var i = 0; i < dm.msgData.date.length; i++) {
                date = dm.msgData.date[i];
                interval = Math.floor((date - minDate) / timeStepSec);
                intervals[interval]++;
            }            
        }
        else {
            var idx, date, interval;
            for(var i = 0; i < dm.uidMsgs[uid].length; i++) {
                idx = dm.uidMsgs[uid][i];
                date = dm.msgData.date[idx];
                interval = Math.floor((date - minDate) / timeStepSec);
                intervals[interval]++;
            }            
        }
        //gaussianBlur(intervals, 3, 1.0);
    }
    minichart.plot = function() {
        processData();
        chartObj.setColor('#658AB0');
        chartObj.setData(intervals, minDate, maxDate, timeStep * SEC_IN_DAY);
        chartObj.render();
    }
    minichart.init = function() {
        var canvasId = 'canvas-mini-chart';
        var width = 400;
        var height = 400;
        containerW = width;
        containerH = height;
        chartObj = new Chart();
        chartObj.init(canvasId, width, height);
        uid = '--';
    }
    minichart.clearData = function() {
        intervals = [];
        chartObj = null;
    }
    minichart.draw = function(time) {
        chartObj.setTime(time);
        chartObj.draw();

        var context = chartObj.getContext();
        var centerX = containerW / 2;
        //draw triangle
        context.fillStyle = '#658AB0';
        context.strokeStyle = '#658AB0';
        context.lineWidth = 0.2;

        context.beginPath();
        context.moveTo(centerX - 5, 1);
        context.lineTo(centerX + 5, 1);
        context.lineTo(centerX, 10);
        context.lineTo(centerX - 5, 1);
        context.fill();

        context.beginPath();
        context.moveTo(centerX, 1);
        context.lineTo(centerX, containerH - 1);
        context.stroke();
    }
    return minichart;
})();

