(function() {
	debugLog('init like widget');
	try {
		VK.init({
			apiId: SYS.vkWidgetAppId,
			onlyWidgets: true
		});
		VK.Widgets.Like('vk-like-welcome', {type: "button"});
		VK.Widgets.Like('vk-like', {type: "mini"});
		$('#vk-like').show();
		$('#vk-like-welcome').show();
	}
	catch(e) {
		$('#vk-like').hide();
		$('#vk-like-welcome').hide();
	}
})();