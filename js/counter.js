
var _AnalyticsCode = SYS.googleAnaliticsID;

var _gaq = _gaq || [];
_gaq.push(['_setAccount', _AnalyticsCode]);
_gaq.push(['_trackPageview']);

(function() {
var ga = document.createElement('script');
	ga.type = 'text/javascript';
	ga.async = true;
	ga.src = 'https://ssl.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(ga, s);
})();

// (function (d, w, c) {
//     (w[c] = w[c] || []).push(function() {
//         try {
//             w.yaCounter25785308 = new Ya.Metrika({id:25785308,
//                     trackLinks:true,
//                     accurateTrackBounce:true});
//         } catch(e) { }
//     });

//     var n = d.getElementsByTagName("script")[0],
//         s = d.createElement("script"),
//         f = function () { n.parentNode.insertBefore(s, n); };
//     s.type = "text/javascript";
//     s.async = true;
//     s.src = (d.location.protocol == "https:" ? "https:" : "https:") + "//mc.yandex.ru/metrika/watch.js";

//     if (w.opera == "[object Opera]") {
//         d.addEventListener("DOMContentLoaded", f, false);
//     } else { f(); }
// })(document, window, "yandex_metrika_callbacks");

// (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
// (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
// m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
// })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

// ga('create', SYS.googleAnaliticsID, 'auto');
// ga('send', 'pageview');