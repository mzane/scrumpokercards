(function (win, $) {
	var roomName = $.trim($('[data-js-room-name]').text()),
		$estimateTables = $('[data-js-estimate-tables]');

	if (!roomName || $estimateTables.length < 1) {
		return;
	}

	$.ajax({
		url: '/beta/estimates/' + roomName
	}).done(function(data) {
		$estimateTables.html(data);
	});

	var timeout = 500;
	function getEstimates() {
		$.ajax({
			type: 'GET',
			url: '/beta/estimates/' + roomName
		}).done(function(data) {
			if (data) {
				$estimateTables.html(data);
			}
		});

		win.setTimeout(getEstimates, timeout);
	}
	win.setTimeout(getEstimates, timeout);
}(window, jQuery));
