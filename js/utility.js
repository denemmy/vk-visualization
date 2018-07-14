//utility functions

var monthsEnd = ['января','февраля','марта','апреля','мая',
    'июня','июля','августа','сентября','октября','ноября','декабря'];

var months = ['январь','февраль','март','апрель','май',
    'июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];

// var monthsShort = ['ЯНВ','ФЕВ','МАР','АПР','МАЙ', 'ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'];
var monthsShort = ['янв','фев','мар','апр','май', 'июн','июл','авг','сен','окт','ноя','дек'];

var getDaysInMonth = (function() {
    var cache = {};
    return function(month, year) {
        if(month < 0) month += 12;
        var entry = year + '-' + month;

        if (cache[entry]) return cache[entry];

        return cache[entry] = new Date(year, month, 0).getDate();
    }
})();

function rgb2hex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

//google
function shuffle(o) {
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x) {};
    return o;
};

function range(min, max) {
    var o = [];
    for(var i = min; i < max; i++) {
        o.push(i);
    }
    return o;
}

function min(v1, v2)
{
    return v1 < v2 ? v1 : v2;
}

function max(v1, v2)
{
    return v1 > v2 ? v1 : v2;
}

//goole
function pickColor(numOfSteps, step) {
    var r, g, b;
    var h = step / numOfSteps;
    var i = ~~(h * 6);
    var f = h * 6 - i;
    var q = 1 - f;
    switch(i % 6){
        case 0: r = 1, g = f, b = 0; break;
        case 1: r = q, g = 1, b = 0; break;
        case 2: r = 0, g = 1, b = f; break;
        case 3: r = 0, g = q, b = 1; break;
        case 4: r = f, g = 0, b = 1; break;
        case 5: r = 1, g = 0, b = q; break;
    }
    var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return (c);
}

function _randomColor(num) {
    var colorsNum = 9;
    var colors = ["#EF2B36", "#EFEF36", "#658AB0", "#2BA336",
    "#32B267", "#789AF1", "#58A1A3", "#D1A12F", "#D012A3"];
    if(!num){
        return randomElement(colors);
    }
    else {
        return colors[num % 9];
    }
    
}

function __randomColor() {
    var h = Math.round(uniformRandom(1, 360));
    var s = Math.round(uniformRandom(80, 90));
    var l = Math.round(uniformRandom(30, 40));
    return 'hsl(' + h + ',' + s + '%,' + l + '%)';
}

function randomColor() {
    var r = Math.round(uniformRandom(20, 200));
    var g = Math.round(uniformRandom(20, 200));
    var b = Math.round(uniformRandom(20, 200));
    return rgb2hex(r, g, b);
}

function rgbaRandomColor(alpha) {
    var r = Math.round(uniformRandom(50, 200));
    var g = Math.round(uniformRandom(50, 200));
    var b = Math.round(uniformRandom(50, 200));
    return 'rgba('+r+', '+g+', '+b+', '+alpha+')';
}

function complementColors(alpha) {
    var h = Math.round(uniformRandom(1, 360));
    var s = Math.round(uniformRandom(0, 30));
    var l = Math.round(uniformRandom(80, 90));
    res = {};
    res.first = 'hsl(' + h + ',' + s + '%,' + l + '%)';
    res.second = 'hsl(' + h + ',' + s + '%,' + (l - 10) + '%)';
    return res;
}

function randomElement(args) {
    var len = args.length;
    if(len <= 0) return null;
    var intervalLen = 1.0 / len;

    rnd = Math.random();
    for(var i = 0; i < len; i++) {
        if(intervalLen * i <= rnd && rnd <= intervalLen * (i+1)) {
            return args[i];
        }
    }
}

function gaussRandom(mean, stdDev) {
    var u = 2 * Math.random() - 1;
    var v = 2 * Math.random() - 1;
    var r = u * u + v * v;
    if(r == 0 || r > 1) return gaussRandom();

    var c = Math.sqrt(-2 * Math.log(r) / r);
    var t = u * c;
    return t * stdDev + mean;
}

function gaussRandomSimple(mean, stdDev) {
    var u = 2 * Math.random() - 1;
    var v = 2 * Math.random() - 1;
    var w = 2 * Math.random() - 1;
    var t = u + v + w;
    return t * stdDev + mean;
}

function gaussianBlur(inputArray, radius, sigma) {
    var gaussCoeffs = [];
    var _sigma = 1 / sigma;
    var coeffSum = 0;
    for(var i = -radius; i <= radius; i++) {
        gaussCoeffs[i] = Math.exp(-i*i*_sigma*_sigma/2);
        coeffSum += gaussCoeffs[i];
    }
    //normalize
    for(var i = -radius; i <= radius; i++) {
        gaussCoeffs[i] /= coeffSum;
    }

    var len = inputArray.length
    //extend array
    var extArray = inputArray.slice(0);
    for(var i = 0; i < radius; i++) {
        extArray.unshift(0);
        extArray.push(0);
    }

    for(var i = 0; i < len; i++) {
        var sum = 0;
        for(var k = -radius; k <= radius; k++) {
            sum += extArray[i + k + radius] * gaussCoeffs[k];
        }
        inputArray[i] = sum;
    }

}

function uniformRandom(min, max) {
    return (max - min) * Math.random() + min;
}


function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }

function mean(inputArray) {
    if(inputArray.length == 0) return 0;
    var average = 0;
    for(var i = 0; i < inputArray.length; i++) {
        average += inputArray[i];
    }
    return average / inputArray.length;
}

Array.max = function( arr ) {
    var maxV = arr[0];
    for(var i = 1; i < arr.length; i++) {
        if(arr[i] > maxV) maxV = arr[i];
    }
    return maxV;
};
Array.min = function( arr ) {
    var minV = arr[0];
    for(var i = 1; i < arr.length; i++) {
        if(arr[i] < minV) minV = arr[i];
    }
    return minV;
};

function nonzeroNumber(arr) {
    var nnz = 0;
    for(var i = 0; i < arr.length; i++) {
        if(arr[i] != 0) nnz++;
    }
    return nnz;
}

function stopPropagation(id, event) {
    $(id).on(event, function(e) {
        e.stopPropagation();
        return false;
    })
}

function optimizeQuality(canvas, context, quality) {
    var ratio;
    var devicePixelRatio;
    var backingStoreRatio;
    if(!quality) {
        devicePixelRatio = window.devicePixelRatio || 1;
        backingStoreRatio = context.webkitBackingStorePixelRatio ||
                            context.mozBackingStorePixelRatio ||
                            context.msBackingStorePixelRatio ||
                            context.oBackingStorePixelRatio ||
                            context.backingStorePixelRatio || 1;

        ratio = devicePixelRatio / backingStoreRatio;        
    }
    else {
        ratio = quality;
    }

    if (typeof auto === 'undefined') {
        auto = true;
    }

    if (auto && devicePixelRatio !== backingStoreRatio) {

        var oldWidth = canvas.width;
        var oldHeight = canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = oldWidth + 'px';
        canvas.style.height = oldHeight + 'px';

        context.scale(ratio, ratio);
        return ratio;
    }
    return 1;
}

function setQuality(canvas, context, ratio) {

    var oldWidth = canvas.width;
    var oldHeight = canvas.height;

    canvas.width = oldWidth * ratio;
    canvas.height = oldHeight * ratio;

    canvas.style.width = oldWidth + 'px';
    canvas.style.height = oldHeight + 'px';

    context.scale(ratio, ratio);
}

function roundRect(context, x, y, width, height, radius, isClipRegion, isFilled, isStroked) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
    if(isClipRegion){
        context.clip();
    }
    else{
        if (isStroked) { context.stroke(); }
        if (isFilled) { context.fill(); }
    }
}

numberFormat = function(value) {
    if(value < 1000) return value;
    value = value.toString();
    value = value.replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
    return value;
}

callDelayed = function(func, wait) {
  var args = slice.call(arguments, 2);
  return setTimeout(function(){ return func.apply(null, args); }, wait);
};

function detectWebGL() {
    try { 
        var canvas = document.createElement( 'canvas' );
        return !! window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );
    } 
    catch( e ) {
        return false;
    }
}

var SEC_IN_DAY = 24 * 3600;
var SEC_IN_YEAR = 365 * SEC_IN_DAY;