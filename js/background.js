
chrome.browserAction.onClicked.addListener(function(activeTab) {
	var windowUrl = chrome.extension.getURL('tab.html');
	chrome.tabs.query({url: windowUrl}, function(tabs) {
		if(tabs.length) {
			//already opened, just select
			chrome.tabs.update(tabs[0].id, {selected: true});
		}
		else {
			//no window, create one
			//chrome.extension.getBackgroundPage().console.log("hello");
			var mainTab;
			chrome.tabs.create({url: windowUrl}, function(tab) {
				//tab opened
				mainTab = tab;
			});
			// chrome.tabs.onActivated.addListener(function(info) {
			// 	views = chrome.extension.getViews({type: "tab", "windowId": mainTab.windowId});
			// 	var view;
			// 	for(var i = 0; i < views.length; i++) {
			// 		view = views[i];
			// 		if(view.tab_id == mainTab.id) {						
			// 			break;
			// 		}
			// 	}
			//     if(mainTab.id == info.tabId) {
			//     	view.app.onTabActivated(true);
			//     }
			//     else {
			//     	view.app.onTabActivated(false);
			//     }
			// });

		}
	});	
});