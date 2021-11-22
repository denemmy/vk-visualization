canvas_chart = (function(){
    var chart = {};
    
    var time;
    var containerW;
    var containerH;
    var containerTop;
    var containerLeft;
    var msgType;
    var viewType;

    var minTimeView;
    var maxTimeView;

    var minTime;
    var maxTime;

    var controlDays;
    var controlMonths;
    var controlYears;

    var stepWidth;
    var timeStep = 24 * 3600; //one day
    var pixelsPerSecond;
    var secondsPerPixel;
    var timeRangeView;

    var usersGraphs;

    var scaleMultiplier = 1.1;
    var minStepWidth = 0.6;
    var maxStepWidth = 150;

    var maxValue, maxValueView, heightCoeff;
    var displayHeader;
    var dayWidth, monthWidth, yearWidth;
    var stepType, stepTypeOld;
    var scale;

    var countingType;

    var canvas, context;

    var minX, maxX, minY, maxY, headerHeight;

    var mouseTime, sectionIdxOver;

    var inited = false;
    var emptyMsgData = true;

    function Graph() {
        this.userId = '';
        this.color = '';
        this.startTime = 0;
        this.endTime = 0;
        this.values = [];
        this.valuesIn = [];
        this.valuesOut = [];
        this.accum = [];
        this.accumIn = [];
        this.accumOut = [];
        this.controlSections = null;
    }

    function handleMouseDown(e) {
        chart.mouseDown = true;
        chart.mousePosX = e.pageX - containerLeft;
        chart.mousePosY = e.pageY - containerTop;
    }

    function handleMouseUp(e) {
        chart.mouseDown = false;        
    }

    function handleMouseLeave(e) {
        if(emptyMsgData) return;
        ui.hideChartTip(500);
    }

    function handleMouseEnter(e) {
        if(emptyMsgData || !inited) return;
        showTip(e.offsetX, e.offsetY);
    }

    function handleMouseMove(e) {
        if(emptyMsgData || !inited) {
            return;
        }

        var posX = e.pageX - containerLeft;
        var posY = e.pageY - containerTop;
        if(chart.mousePosX == posX && chart.mousePosY == posY) {
            return;
        }        

        if(chart.mouseDown) {
            var deltaX = chart.mousePosX - posX;

            var deltaTime = deltaX * secondsPerPixel;
            var timeNew = time + deltaTime;

            if(timeNew >= minTime && timeNew <= maxTime) {
                time = time + deltaTime;
                computeViewRange();                
                chart.draw();
            }
            else if(timeNew < minTime) {
                time = minTime + 1;
            }
            else if(timeNew > maxTime) {
                time = maxTime - 1;
            }            
        }

        var isInside = true;
        if(posX < 0 || posX > containerW) {
            isInside = false;
        }

        if(posY < 0 || posY > containerH) {
            isInside = false;
        }

        if(isInside && chart.mouseDown) {
            showTip(posX, posY);
        }
        else if(isInside) {
            showTip(posX, posY, 100);
        }

        chart.mousePosX = posX;
        chart.mousePosY = posY;
    }

    function handleMouseWheel(evt) {
        var e = evt.originalEvent;
        e.preventDefault();
        if(emptyMsgData) return;
        var delta = e.wheelDelta;
        if(stepWidth > maxStepWidth) {
            stepWidth = maxStepWidth;
            return;
        } 
        if(stepWidth < minStepWidth) {
            stepWidth = minStepWidth;
            return;
        }
        var secondsPerPixelOld = secondsPerPixel;
        if(delta > 0) {
            stepWidth *= scaleMultiplier;
        }
        else {
            stepWidth /= scaleMultiplier;
        }
        if(stepWidth > maxStepWidth) {
            stepWidth = maxStepWidth;
        } 
        if(stepWidth < minStepWidth) {
            stepWidth = minStepWidth;
        }
        pixelsPerSecond = stepWidth / timeStep;
        secondsPerPixel = timeStep / stepWidth;

        var posX = e.pageX - containerLeft;
        var posY = e.pageY - containerTop;
        time = time + (posX - containerW / 2) * (secondsPerPixelOld - secondsPerPixel);

        if(time < minTime) {
            time = minTime + 1;
        }
        else if(time > maxTime) {
            time = maxTime - 1;
        }

        dayWidth = 24 * 3600 * pixelsPerSecond;
        monthWidth = 31 * dayWidth;
        yearWidth = 365 * dayWidth;
        var stepTypeOld = stepType;
        if(dayWidth > 10) {
            stepType = 'days';
        }
        else {
            stepType = 'months';
        }
        var stepTypeChanged = stepType != stepTypeOld;

        computeViewRange();

        if(stepTypeChanged) {            
            chart.plot();
        }
        showTip(chart.mousePosX, chart.mousePosY);
        chart.draw();
    }

    function handleResize(e) {
        if(!inited) return;
        var container = $('#chart-container');

        var width = container.width();
        var height = container.height();
        var offsetPos = container.offset();

        chart.setSize(width, height, offsetPos.left, offsetPos.top);
        chart.draw();
    }

    function showTip(mOffsetX, mOffsetY, msec) {
        var keys = Object.keys(usersGraphs);       
        if(keys.length > 0) {
            var controlSections;
            mouseTime = time + secondsPerPixel * (mOffsetX - containerW / 2);
            if(stepType == 'months') {
                controlSections = controlMonths;
            }
            else {
                controlSections = controlDays;
            }
            var sectionIdx = -1;

            for(var i = 0; i < controlSections.length; i++) {
                if(mouseTime >= controlSections[i].startTime && 
                    mouseTime < controlSections[i].endTime) {
                    sectionIdx = i;
                    break;
                }
            }

            var sectionChanged = sectionIdxOver != sectionIdx;
            sectionIdxOver = sectionIdx;           

            if(sectionIdx > 0) {
                var startTime = controlSections[sectionIdx].startTime;
                var endTime = controlSections[sectionIdx].endTime;
                var timeMiddle = (startTime + endTime) / 2;
                var offsetX = (timeMiddle - time) * pixelsPerSecond + containerW / 2;

                var offsetXChanged = offsetX != chart.prevTipOffsetX;
                chart.prevTipOffsetX = offsetX;                

                var coeff = (maxY - minY) / maxValueView;
                
                var offsetY, value = 0;
                var minDiff = Number.MAX_VALUE;
                var labelAdd = '';
                
                for(var i = 0; i < keys.length; i++) {                    

                    if(msgType == 'in-out') {
                        var valueTmpIn = 0;
                        var valueTmpOut = 0;
                        if(viewType == 'intensity') {
                            valueTmpIn = usersGraphs[keys[i]].valuesIn[sectionIdx];
                            valueTmpOut = usersGraphs[keys[i]].valuesOut[sectionIdx];
                        }
                        else if(viewType == 'summary') {
                            valueTmpIn = usersGraphs[keys[i]].accumIn[sectionIdx];
                            valueTmpOut = usersGraphs[keys[i]].accumOut[sectionIdx];
                        }
                        //in messages
                        var yIn = valueTmpIn * heightCoeff;
                        var offsetYTmpIn = maxY - yIn;
                        var diffTmpIn = - mOffsetY + offsetYTmpIn;
                        diffTmpIn = diffTmpIn < 0 ? containerH - diffTmpIn : diffTmpIn;
                        if(diffTmpIn < minDiff) {
                            offsetY = offsetYTmpIn;
                            value = valueTmpIn;
                            minDiff = diffTmpIn;
                            labelAdd = 'вх.';
                        }
                        //out messages
                        var yOut = valueTmpOut * heightCoeff;
                        var offsetYTmpOut = maxY - yOut;
                        var diffTmpOut = - mOffsetY + offsetYTmpOut;
                        diffTmpOut = diffTmpOut < 0 ? containerH - diffTmpOut : diffTmpOut;
                        if(diffTmpOut < minDiff) {
                            offsetY = offsetYTmpOut;
                            value = valueTmpOut;
                            minDiff = diffTmpOut;
                            labelAdd = 'исх.';
                        }
                    }
                    else {
                        var valueTmp = 0;
                        if(viewType == 'intensity') {
                            valueTmp = usersGraphs[keys[i]].values[sectionIdx];
                            if(msgType == 'in') {
                                valueTmp = usersGraphs[keys[i]].valuesIn[sectionIdx];
                            }
                            else if(msgType == 'out') {
                                valueTmp = usersGraphs[keys[i]].valuesOut[sectionIdx];
                            }                        
                        }
                        else if(viewType == 'summary') {
                            valueTmp = usersGraphs[keys[i]].accum[sectionIdx];
                            if(msgType == 'in') {
                                valueTmp = usersGraphs[keys[i]].accumIn[sectionIdx];
                            }
                            else if(msgType == 'out') {
                                valueTmp = usersGraphs[keys[i]].accumOut[sectionIdx];
                            }                        
                        }
                        var y = valueTmp * heightCoeff;
                        var offsetYTmp = maxY - y;
                        var diffTmp = - mOffsetY + offsetYTmp;
                        diffTmp = diffTmp < 0 ? containerH - diffTmp : diffTmp;
                        if(diffTmp < minDiff) {
                            offsetY = offsetYTmp;
                            value = valueTmp;
                            minDiff = diffTmp;
                        }
                    }                    
                }

                var offsetYChanged = offsetY != chart.prevTipOffsetY;
                chart.prevTipOffsetY = offsetY;

                if(!sectionChanged && !offsetXChanged && !offsetYChanged) {
                    return;
                }

                var label = controlSections[sectionIdx].label + '<p>' + numberFormat(value) + ' ' + labelAdd;

                var showTip = true;
                if(offsetX < minX || offsetX > maxX) {
                    showTip = false;
                }
                if(offsetY < minY || offsetY > maxY) {
                    showTip = false;
                }
                if(showTip) {
                    ui.showChartTip(offsetX, offsetY, label, msec);
                }
                else {
                    ui.hideChartTip(500);
                }                
            }
        }
    }

    function process() {
        //compute range
        minTime = dm.startDate;;       
        maxTime = dm.endDate;        

        var minTimeCompute = minTime - timeStep / minStepWidth * containerW / 2;
        var maxTimeCompute = maxTime + timeStep / minStepWidth * containerW / 2;

        //compute days beginnings in UNIX time
        controlDays = [];
        
        var date = new Date(minTimeCompute * 1000);
        var startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        var nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        date = new Date(maxTimeCompute * 1000);
        var endDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        endDay.setDate(date.getDate() + 1);
        for(var d = startDay; d <= endDay; d.setDate(d.getDate() + 1)) {
            var startTime = d.getTime() / 1000;
            var endTime = nextDay.getTime() / 1000;
            var day = {
                startTime: startTime,
                endTime: endTime,
                label: d.getDate() + ' ' + monthsEnd[d.getMonth()],
                labelShort: d.getDate() + ' ' + monthsShort[d.getMonth()]
            }            
            controlDays.push(day);
            nextDay.setDate(nextDay.getDate() + 1);
        }           

        //compute months beginnings in UNIX time
        controlMonths = [];
        
        date = new Date(minTimeCompute * 1000);
        var startMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        var nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        date = new Date(maxTimeCompute * 1000);
        var endMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        endMonth.setMonth(date.getMonth() + 1);
        for(var d = startMonth; d <= endMonth; d.setMonth(d.getMonth() + 1)) {
            var startTime = d.getTime() / 1000;
            var endTime = nextMonth.getTime() / 1000;
            var month = {
                startTime: startTime,
                endTime: endTime,
                label: months[d.getMonth()] +', ' + (d.getYear()-100),
                labelShort: monthsShort[d.getMonth()] +', ' + (d.getYear()-100)
            }            
            controlMonths.push(month);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
        }
        

        //compute years beginnings in UNIX TIME
        controlYears = [];
        date = new Date(minTimeCompute * 1000);
        var startYear = new Date(date.getFullYear(), 0, 1);
        date = new Date(maxTimeCompute * 1000);
        var endYear = new Date(date.getFullYear() + 1, 0, 1);
        for(var d = startYear; d <= endYear; d.setFullYear(d.getFullYear() + 1)) {
            var startTime = d.getTime() / 1000;
            var year = {
                startTime: startTime,
                label: d.getFullYear()
            }            
            controlYears.push(year);
        }        
    }

    function plotUserGraph(userGraph) {

        var uid = userGraph.userId;
        var valuesIn = [];
        var valuesOut = [];
        var values = [];
        var sections;

        if(stepType == 'days') {
            sections = controlDays;
        }
        else if(stepType == 'months')
        {
            sections = controlMonths;
        }
        var len = sections.length;
        var sectionIdx = 0; //current section
        userGraph.controlSections = sections;

        for(var i = 0; i < sections.length; i++) {
            valuesIn.push(0);
            valuesOut.push(0);
            values.push(0);
        }        

        if(uid == 'self') {
            //messages
            if(dm.msgData.date.length > 0) emptyMsgData = false;
            for(var i = 0, sectionIdx = 0; i < dm.msgData.date.length; i++) {
                var date = dm.msgData.date[i];
                //find section
                while(sectionIdx < len && date > sections[sectionIdx].endTime) {
                    sectionIdx++;
                }
                //time is later than last section's end time
                if(sectionIdx == len) {
                    break;
                }
                //time is earlier than first section's start time
                else if(sectionIdx == 0) {
                    //can be in first section
                    if(date > sections[0].startTime) {
                        if(dm.msgData.out[i]) {
                            if(countingType == 'msg') {
                                valuesOut[sectionIdx]++;
                            }
                            else if(countingType == 'letter') {
                                valuesOut[sectionIdx] += dm.msgData.len[i];
                            }
                            
                        }
                        else {
                            if(countingType == 'msg') {
                                valuesIn[sectionIdx]++;
                            }
                            else if(countingType == 'letter') {
                                valuesIn[sectionIdx] += dm.msgData.len[i];
                            }                            
                        }
                        if(countingType == 'msg') {
                            values[sectionIdx]++;
                        }
                        else if(countingType == 'letter') {
                            values[sectionIdx] += dm.msgData.len[i];
                        }
                    }
                }
                else {
                    //time is in section
                    if(dm.msgData.out[i]) {
                        if(countingType == 'msg') {
                            valuesOut[sectionIdx]++;
                        }
                        else if(countingType == 'letter') {
                            valuesOut[sectionIdx] += dm.msgData.len[i];
                        }                        
                    }
                    else {
                        if(countingType == 'msg') {
                            valuesIn[sectionIdx]++;
                        }
                        else if(countingType == 'letter') {
                            valuesIn[sectionIdx] += dm.msgData.len[i];
                        } 
                    }
                    if(countingType == 'msg') {
                        values[sectionIdx]++;
                    }
                    else if(countingType == 'letter') {
                        values[sectionIdx] += dm.msgData.len[i];
                    } 
                }
            }            
        }
        else {
            //messages for specific uid
            if(dm.uidMsgs[uid].length > 0) emptyMsgData = false;
            for(var i = 0, sectionIdx = 0; i < dm.uidMsgs[uid].length; i++) {
                var idx = dm.uidMsgs[uid][i];
                var date = dm.msgData.date[idx];
                //find section
                while(sectionIdx < len && date > sections[sectionIdx].endTime) {
                    sectionIdx++;
                }
                //time is later than last section's end time
                if(sectionIdx == len) {
                    break;
                }
                //time is earlier than first section's start time
                else if(sectionIdx == 0) {
                    //can be in first section
                    if(date > sections[0].startTime) {
                        if(dm.msgData.out[idx]) {
                            if(countingType == 'msg') {
                                valuesOut[sectionIdx]++;
                            }
                            else if(countingType == 'letter') {
                                valuesOut[sectionIdx] += dm.msgData.len[idx];
                            }
                        }
                        else {
                            if(countingType == 'msg') {
                                valuesIn[sectionIdx]++;
                            }
                            else if(countingType == 'letter') {
                                valuesIn[sectionIdx] += dm.msgData.len[idx];
                            }
                        }                        
                        if(countingType == 'msg') {
                            values[sectionIdx]++;
                        }
                        else if(countingType == 'letter') {
                            values[sectionIdx] += dm.msgData.len[idx];
                        }
                    }
                }
                else {
                    //time is in section
                    if(dm.msgData.out[idx]) {
                        if(countingType == 'msg') {
                            valuesOut[sectionIdx]++;
                        }
                        else if(countingType == 'letter') {
                            valuesOut[sectionIdx] += dm.msgData.len[idx];
                        }
                    }
                    else {
                        if(countingType == 'msg') {
                            valuesIn[sectionIdx]++;
                        }
                        else if(countingType == 'letter') {
                            valuesIn[sectionIdx] += dm.msgData.len[idx];
                        }
                    }

                    if(countingType == 'msg') {
                        values[sectionIdx]++;
                    }
                    else if(countingType == 'letter') {
                        values[sectionIdx] += dm.msgData.len[idx];
                    }
                }
            }                    
        }

        /*gaussianBlur(values, 3, 1.0);
        gaussianBlur(valuesIn, 3, 1.0);
        gaussianBlur(valuesOut, 3, 1.0);*/

        var accum = [];
        var accumIn = [];
        var accumOut = [];

        var sum = 0, sumIn = 0, sumOut = 0;
        for(var i = 0; i < values.length; i++) {
            sum += values[i];
            sumIn += valuesIn[i];
            sumOut += valuesOut[i];
            accum.push(sum);
            accumIn.push(sumIn);
            accumOut.push(sumOut);
        }        

        userGraph.accum = accum;
        userGraph.accumIn = accumIn;
        userGraph.accumOut = accumOut;

        userGraph.values = values;
        userGraph.valuesIn = valuesIn;
        userGraph.valuesOut = valuesOut;
    }

    chart.setSize = function(width, height, offsetLeft, offsetTop) {
        containerH = height;
        containerW = width;
        containerLeft = offsetLeft;
        containerTop = offsetTop;
        canvas.width = containerW > 300 ? containerW : 300;
        canvas.height = containerH > 300 ? containerH : 300;

        headerHeight = 60;
        maxY = containerH - 20;
        minY = headerHeight;
        maxX = containerW;

        computeViewRange();
        context = canvas.getContext('2d');        
        scale = optimizeQuality(canvas, context);
    }

    chart.setMessagesType = function(type) {
        if(type == 'in' || type == 'incoming') {
            msgType = 'in';
        }
        else if(type == 'out' || type == 'outcoming') {
            msgType = 'out';
        }
        else if(type == 'in-out') {
            msgType = 'in-out';
        }
        else {
            msgType = 'all';
        }
        computeMaxValue();
    }

    chart.setCountingType = function(type) {
        if(type == 'msg') {
            countingType = 'msg';
        }
        else if(type == 'letter') {
            countingType = 'letter';
        }
        else {
            countingType = 'msg';
        }        
    }

    chart.setViewType = function(type) {
        if(type == 'summary') {
            viewType = 'summary';
        }
        else {
            viewType = 'intensity';
        }
        computeMaxValue();
    }

    chart.setTime = function(timeNew) {
        time = timeNew;
    }

    chart.plot = function() {
        //compute graph for each user
        emptyMsgData = true;
        $.each(usersGraphs, function(index, graph) {
            plotUserGraph(graph);
        });

        computeMaxValue();
    }

    function computeViewRange() {
        timeRangeView = containerW * secondsPerPixel;
        minTimeView = Math.floor(time - timeRangeView / 2);
        maxTimeView = Math.ceil(time + timeRangeView / 2);        
    }

    function computeMaxValue() {

        maxValue = -1;
        if(viewType == 'intensity') {
            $.each(usersGraphs, function(key, value) {
                var userGraph = value;
                var maxValueCurrent;
                if(msgType == 'in' || msgType == 'out' || msgType == 'in-out') {                    
                    var maxValueCurrentIn = Array.max(userGraph.valuesIn);
                    var maxValueCurrentOut = Array.max(userGraph.valuesOut);
                    maxValueCurrent = max(maxValueCurrentIn, maxValueCurrentOut);
                }
                else {
                    maxValueCurrent = Array.max(userGraph.values);
                }
                if(maxValueCurrent > maxValue) maxValue = maxValueCurrent;
            });
            maxValueView = maxValue * 1.5;
        }
        else if(viewType == 'summary') {
            $.each(usersGraphs, function(key, value) {
                var userGraph = value;
                var maxValueCurrent;
                if(msgType == 'in' || msgType == 'out' || msgType == 'in-out') {                    
                    var maxValueCurrentIn = Array.max(userGraph.accumIn);
                    var maxValueCurrentOut = Array.max(userGraph.accumOut);
                    maxValueCurrent = max(maxValueCurrentIn, maxValueCurrentOut);
                }
                else {
                    maxValueCurrent = Array.max(userGraph.accum);
                }
                if(maxValueCurrent > maxValue) maxValue = maxValueCurrent;
            });
            maxValueView = maxValue * 1.05;
        }

        heightCoeff = (maxY - minY) / (maxValueView);
    }

    chart.init = function() {
        canvasId = 'canvas-chart';
        
        containerW = 900;
        containerH = 500;
        containerLeft = 0;
        containerTop = 0;        
        //time = 1377632385;
        //current time in seconds

        var dateTemp = new Date();
        var startDay = new Date(dateTemp.getFullYear(), dateTemp.getMonth(), dateTemp.getDate() - 1);
        time = Math.floor(startDay.getTime() / 1000);

        headerHeight = 60;
        maxY = containerH - 20;
        minY = headerHeight;
        minX = 80;
        maxX = containerW;

        timeStep = 1 * 24 * 3600; //x days
        stepWidth = maxStepWidth; //in pixels
        pixelsPerSecond = stepWidth / timeStep;
        secondsPerPixel = timeStep / stepWidth;

        dayWidth = 24 * 3600 * pixelsPerSecond;
        monthWidth = 31 * dayWidth;
        yearWidth = 365 * dayWidth;
        stepTypeOld = stepType;
        if(dayWidth > 3) {
            stepType = 'days';
        }
        else {
            stepType = 'months';
        }

        countingType = 'msg';
        viewType = 'intensity'

        computeViewRange();
        process();

        msgType = 'all';

        usersGraphs = {};
        emptyMsgData = true;

        canvas = document.getElementById(canvasId);

        bindHandlers();
        computeMaxValue();

        inited = true;
    }

    function bindHandlers() {

        $('#chart-container').mousedown(handleMouseDown);
        $('#chart-container').mouseleave(handleMouseLeave);
        $('#chart-container').mouseenter(handleMouseEnter);
        $('#statistic-page').mouseup(handleMouseUp);
        $('#statistic-page').mousemove(handleMouseMove);
        $('#chart-container').bind('mousewheel', handleMouseWheel);
        $(window).resize(handleResize);
    }

    function unbindHandlers() {

        $('#chart-container').unbind('mousedown', handlerMouseDown);
        $('#chart-container').unbind('mouseleave', handlerMouseLeave);
        $('#chart-container').unbind('mouseenter', handlerMouseEnter);
        $('#statistic-page').unbind('mouseup', handlerMouseUp);
        $('#statistic-page').unbind('mousemove', handlerMouseMove);
        $('#chart-container').unbind('mousewheel', handlerMouseWheel);
        $(window).unbind('resize', handleResize);
    }

    chart.addUser = function(userId, userColor) {
        var graph = new Graph();
        graph.userId = userId;
        graph.color = userColor;
        graph.plotted = false;
        usersGraphs[userId] = graph;
    }

    chart.removeUser = function(userId) {
        delete usersGraphs[userId];
    }

    chart.removeAllUsers = function() {
        $.each(usersGraphs, function(key, value) {
            delete usersGraphs[key];
        });
        usersGraphs = {};
    }

    chart.draw = function() {

        minX = 15 + context.measureText(maxValue.toString()).width;

        displayHeader = 'years';
        if(monthWidth > 70) {
            displayHeader = 'months';
            if(dayWidth > 50) {
                displayHeader = 'days';
            }
        }

        var displayDaysLines = dayWidth > 10;
        var displayMonthsLines = monthWidth > 10;
        var displayYearsLines = yearWidth > 10;

        var displayDaysHeader = displayHeader == 'days';
        var displayMonthsHeader = displayHeader == 'months';
        var displayYearsHeader = displayHeader == 'years';

        var dayLinesStartY = displayHeader == 'days' ? 0 : minY;
        var monthLinesStartY = displayHeader == 'months' ? 0 : minY;
        var yearLinesStartY = displayHeader == 'years' ? 0 : minY;

        context.globalAlpha = 1;
        context.clearRect(0, 0, canvas.width, canvas.height);

        var chartHeight = maxY - minY;
        var chartWidth = maxX - minX;

        //draw grid
        context.lineWidth = 0.2;
        context.strokeStyle = '#658AB0';
        context.fillStyle = '#658AB0';
        context.globalAlpha = 1;
        context.textAlign = 'center';
        context.font = "10pt tahoma";
        fontSize = 10;

        context.beginPath();
        //days lines
        if(displayDaysLines) {
            var displayShortLabels = dayWidth > 100 ? false : true;
            var prevOffsetX;
            for(var i = 0; i < controlDays.length; i++) {
                var dayTime = controlDays[i].startTime;            
                var offsetX = containerW / 2 + (dayTime - time) * pixelsPerSecond;

                //draw label
                if(i > 0 && displayDaysHeader) {
                    var label = displayShortLabels? controlDays[i-1].labelShort : controlDays[i-1].label;
                    var dayCenterX = (prevOffsetX + offsetX) / 2;
                    context.fillText(label, dayCenterX, headerHeight / 2);
                }
                prevOffsetX = offsetX;

                //draw vertical line
                if(offsetX < 0 || offsetX > containerW) continue;
                context.moveTo(offsetX, dayLinesStartY);
                context.lineTo(offsetX, maxY);
            }
        }


        //months lines        
        if(displayMonthsLines) {
            //var lineStartY = displayMonthsLabels ? 0 : headerHeight;
            var displayShortLabels = monthWidth > 100 ? false : true;
            var prevOffsetX;            
            for(var i = 0; i < controlMonths.length; i++) {
                var monthTime = controlMonths[i].startTime;            
                var offsetX = containerW / 2 + (monthTime - time) * pixelsPerSecond;

                //draw label
                if(i > 0 && displayMonthsHeader) {
                    var label = displayShortLabels? controlMonths[i-1].labelShort : controlMonths[i-1].label;
                    var monthCenterX = (prevOffsetX + offsetX) / 2;
                    context.fillText(label, monthCenterX, headerHeight / 2);
                }
                prevOffsetX = offsetX;

                //draw vertical line
                if(offsetX < 0 || offsetX > containerW) continue;
                context.moveTo(offsetX, monthLinesStartY);
                context.lineTo(offsetX, maxY);
            }
        }
        

        //years lines
        if(displayYearsLines) {
            context.lineWidth = 0.4;
            for(var i = 0; i < controlYears.length; i++) {
                var yearTime = controlYears[i].startTime;            
                var offsetX = containerW / 2 + (yearTime - time) * pixelsPerSecond;

                //draw label
                if(i > 0 && displayYearsHeader) {
                    var label = controlYears[i-1].label;
                    var yearCenterX = (prevOffsetX + offsetX) / 2;
                    context.fillText(label, yearCenterX, headerHeight / 2);
                }
                prevOffsetX = offsetX;
                //draw line
                if(offsetX < 0 || offsetX > containerW) continue;
                context.moveTo(offsetX, yearLinesStartY);
                context.lineTo(offsetX, maxY);
            }
        } 
        context.stroke();   

        //draw graph
        context.save();
        $.each(usersGraphs, function(index, value) {
            if(msgType == 'in-out') {
                msgType = 'in';
                drawUserGraph(value);
                msgType = 'out';                
                drawUserGraph(value);
                msgType = 'in-out';
            }
            else {
                drawUserGraph(value);
            }
            
        });
        context.restore();

        //clear rect for label area
        context.clearRect(0, 0, minX, containerH);

        //horizaontal lines
        context.lineWidth = 0.2;
        context.textAlign = 'right';
        var verticalStep;
        //var maxValueView = maxValue * 1.5;
        if(maxValueView < 12.5) maxValueView = 12.5;
        var power = Math.log(maxValueView) / Math.log(10);
        verticalStep = Math.pow(10, Math.floor(power));

        while(maxValueView / verticalStep < 5) {
            verticalStep /= 2;
        }

        var linesNum = Math.ceil(maxValueView / verticalStep);
        var stepHeight = chartHeight * verticalStep / maxValueView;
        context.beginPath();
        for(var i = 0; i < linesNum; i++) {
            var y = Math.ceil(i * stepHeight);
            context.moveTo(minX, maxY - y);
            context.lineTo(containerW, maxY - y);
            text = (i * verticalStep).toString();
            context.fillText(text, minX - 10, maxY - y + 5);
        }
        context.moveTo(minX, minY);
        context.lineTo(containerW, minY);
        context.moveTo(minX, 0);
        context.lineTo(containerW, 0);
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

    function drawUserGraph(userGraph) {

        if(emptyMsgData) return;

        //draw graph
                        
        context.strokeStyle = userGraph.color;
        context.fillStyle = userGraph.color;
        context.lineWidth = 0.5;
        context.globalAlpha = 1;
        
        var chartHeight = maxY - minY;
        var chartWidth = maxX - minX;

        var intervalsUid;
        if(viewType == 'intensity') {
            intervalsUid = userGraph.values;
            if(msgType == 'in') intervalsUid = userGraph.valuesIn;
            else if(msgType == 'out') intervalsUid = userGraph.valuesOut;
        }
        else if(viewType == 'summary') {
            intervalsUid = userGraph.accum;
            if(msgType == 'in') intervalsUid = userGraph.accumIn;
            else if(msgType == 'out') intervalsUid = userGraph.accumOut;
        }
        
        var sections = userGraph.controlSections;

        context.beginPath();
        
        var sectionTimeStart = sections[0].startTime;
        var sectionTimeEnd = sections[0].endTime;
        var sectionTimeMiddle = sectionTimeStart + (sectionTimeEnd - sectionTimeStart) / 2;
        var startOffsetX = containerW / 2 + (sectionTimeMiddle - time) * pixelsPerSecond;
        context.moveTo(startOffsetX, maxY);

        var y, offsetX;
        for(var i = 0; i < intervalsUid.length; i++) {
            y = intervalsUid[i] * heightCoeff;
            sectionTimeStart = sections[i].startTime;
            sectionTimeEnd = sections[i].endTime;
            sectionTimeMiddle = sectionTimeStart + (sectionTimeEnd - sectionTimeStart) / 2;
            offsetX = containerW / 2 + (sectionTimeMiddle - time) * pixelsPerSecond;
            context.lineTo(offsetX, maxY - y);
        }

        context.lineTo(offsetX, maxY);
        context.stroke();
        context.globalAlpha = 0.1;
        context.fill();

        if(displayHeader == 'days' || stepType == 'months') {
            context.globalAlpha = 0;
            if(displayHeader == 'days') {
                if(dayWidth > 100) {
                    context.globalAlpha = 1;
                }
                else if(dayWidth > 40) {
                    context.globalAlpha = (dayWidth - 40) / 60;
                }
            }
            else if(stepType == 'months') {
                if(monthWidth > 70) {
                    context.globalAlpha = 1;
                }
                else if(monthWidth > 20) {
                    context.globalAlpha = (monthWidth - 20) / 50;
                }
            }
            
            var circleRad = 3;
            var y, offsetX;
            var sectionTimeStart, sectionTimeEnd, sectionTimeMiddle;
            for(var i = 0; i < intervalsUid.length; i++) {
                y = intervalsUid[i] * heightCoeff;
                sectionTimeStart = sections[i].startTime;
                sectionTimeEnd = sections[i].endTime;
                sectionTimeMiddle = sectionTimeStart + (sectionTimeEnd - sectionTimeStart) / 2;
                offsetX = containerW / 2 + (sectionTimeMiddle - time) * pixelsPerSecond;
                if(offsetX + circleRad < 0 || offsetX - circleRad > containerW) {
                    continue;
                }
                else {
                    context.beginPath();
                    context.arc(offsetX, maxY - y, circleRad, 0, 2 * Math.PI, true);
                    context.stroke();
                }                
            }            
        }        
    }

    chart.clearData = function() {
        chart = null;
        unbindHandlers();
        controlDays = [];
        controlMonths = [];
        controlYears = [];
        usersGraphs = {};
    }

    return chart;
})();

