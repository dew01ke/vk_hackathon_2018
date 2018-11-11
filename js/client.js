var settings = {
	mainInterval: 10,
	moveThreshold: 20,
	moveSmoothing: 50
};
var visibleMarkers = [];

Number.prototype.padLeft = function(base,chr) {
	var len = (String(base || 10).length - String(this).length)+1;
	return len > 0? new Array(len).join(chr || '0')+this : this;
};

function getTimestamp(dt) {
	var d = dt ? new Date(dt) : new Date();
	var ts = d.getTime() / 1000;
	return(ts);
}

function getProperDate() {
	var d = new Date,
	dformat = [d.getFullYear(),(d.getMonth()+1).padLeft(),
		d.getDate().padLeft(),
		].join('-') +' ' +
		[d.getHours().padLeft(),
		d.getMinutes().padLeft(),
		d.getSeconds().padLeft()].join(':');
	return dformat;
}


// ---------------------------------------------------------------------------------------------

var globalStart = getTimestamp();
var viewStart = 0, viewTime = 0;
var currentView = "", prevView = "";

function showMessage(msg, duration) {
}

function showView(id, data) {
	if (id != currentView) {
		stopAudio();
		viewStart = getTimestamp();
		prevView = currentView;
		currentView = id;
		$(".view.active").removeClass("active");
		$(".view[item=" + id + "]").addClass("active");
		$(".close_view").show();

		switch(id) {
			case "intro":
				// setTimeout("showView('camera');", 2000);
				$(".close_view").hide();
				break;

			case "camera":
				$(".close_view").hide();
				break;
		
			case "info":
				fillInfo(data);
				break;
				
			case "reserve":
				fillReserve(data);
				break;
			
		}

		$(".view[item=" + currentView + "]").scrollTop(0);
	}
}

function showPrevView() {
	showView("camera");
	// if (currentView == "info") showView("camera");
	// if (currentView == "reserve")
}

var showError = function(msg) {
	return false;
};

// ---------------------------------------------------------------------------------------------

function stopAudio() {
	$(".track").find(".progress").hide();
	$(".track audio").remove();
	$(".track").find(".control").removeClass("pause").addClass("play");
}

function playAudio(path, obj) {
	if (!path) return;
	stopAudio();
	$('<audio autoplay="autoplay">'
	  + '<source src="' + path + '" />'
	  + '<embed src="' + path + '" hidden="true" autostart="true" loop="false" />'
	  + '</audio>'
	).bind("play", function(){
		$(this).get(0).volume = 1;
	}).bind("timeupdate", function(){
		var cT = $(this).get(0).currentTime;
		var dT = $(this).get(0).duration;
		try {
			$(this).closest(".track").find(".progress:hidden").show();
			$(this).closest(".track").find(".progress_inner").css("width", (cT / dT * 100) + "%");
			cT = Math.floor(cT);
			$(this).closest(".track").find(".progress_time").text(Math.floor(cT / 60) + ":" + (cT % 60).padLeft());
		} catch(e) {
		}
	}).bind("playing", function(){
		$(this).closest(".track").find(".control").removeClass("play").addClass("pause");
	}).bind("ended", function(){
		$(this).closest(".track").find(".control").removeClass("pause").addClass("play");
		$(this).remove();
		stopAudio();
	}).appendTo(obj ? obj : body);
}	

// ---------------------------------------------------------------------------------------------

function fillInfo(id) {
	var data = posterData[id];
	var out = "";
	
	out += "<div class='info_block header'><div class='portrait' style=\"background-image:url('" + data.image + "');\"></div><div class='name'><div class='last_name'>" + data.last_name + "</div><div class='first_name'>" + data.first_name + "</div>";
	if (data.years && data.years != "") out += "<div class='years'>" + data.years + "</div>";
	out += "</div></div>";
	if (data.about && data.about != "") {
		out += "<div class='info_block about upper'><h1>Общая информация</h1><div class='text'>" + data.about.short + "</div>";
		if (data.about.full && data.about.full != "") out += "<div class='expand'>...</div><div class='full'>" + data.about.full + "</div>";
		out += "</div>";
	}
	if (data.bio && data.bio != "") {
		out += "<div class='info_block bio upper'><h1>Биография</h1><div class='text'>" + data.bio.short + "</div>";
		if (data.bio.full && data.bio.full != "") out += "<div class='expand'>...</div><div class='full'>" + data.bio.full + "</div>";
		out += "</div>";
	}
	if (data.best) {
		out += "<div class='info_block best'><h1>Избранное</h1>";
		for (var i = 0; i < data.best.length; i++) {
			var item = data.best[i];
			out += "<div class='track'><div class='title'>" + item.title + "</div><div item=\"" + item.url + "\" class='control play'></div><div class='progress'><div class='progress_inner'></div><div class='progress_time'></div></div></div>";
		}
		out += "</div>";
	}
	if (data.concerts) {
		out += "<div class='info_block reserve'><h1>Концерты</h1>";
		for (var i = 0; i < data.concerts.length; i++) {
			var item = data.concerts[i];
			out += "<div class='concert'><div class='when'><div class='date'>" + item.date + "</div><div class='time'>" + item.time + "</div></div><div class='title'>" + item.title + "</div><div class='performer'>" + item.performer + "</div></div>";
			if (item.url && item.url != '') {
				out += "<a target='_blank' href=\"" + item.url + "\"><div class='button' item='" + id + "' url=\"" + item.url + "\">Забронировать</div></a>";
			} else {
				out += "<div class='button' item='" + id + "'>Забронировать</div>";
			}
		}
		out += "</div>";
	}
	
	$(".view[item=info]").html(out);
	
	$(".view[item=info] .expand").click(function() {
		$(this).closest(".info_block").addClass("full").hide().fadeIn(500);
	});

	$(".view[item=info] .best .control").click(function() {
		var url = $(this).attr("item");
		var container = $(this).closest(".track");
		if ($(this).hasClass("play")) {
			if ($(container).find("audio").length > 0) {
				$(container).find("audio").get(0).play();
			} else {
				playAudio(url, container);
			}
		} else {
			try {
				$(container).find("audio").get(0).pause();
				$(container).find(".control").removeClass("pause").addClass("play");
			} catch(e) { }
		}
	});
	
	$(".view[item=info] .reserve .button").click(function() {
		if (!$(this).attr("url")) {
			showView("reserve", $(this).attr("item"));
		}
	});
}

function fillReserve(data) {
	
	var out = "";
	
	out += "<h1>Бронирование билетов</h1>";
	
	
	$(".view[item=reserve]").html(out);
	
}

// ---------------------------------------------------------------------------------------------
	
var loopAnchor = getTimestamp(), tC = 0;
var activeMarkers = {};

function updateVisibleMarkers(markers) {
    visibleMarkers = markers;
}

function getVisiblePosters() {
	return visibleMarkers;
	// var dummyData = []
	// dummyData.push( { id: 1, x: 100 + Math.random() * 50, y: 300 + Math.random() * 100 } );
	// if (Math.floor(viewTime) % 2 == 0) dummyData.push( { id: 2, x: 300 + Math.random() * 100, y: 200 + Math.random() * 100 } );
	// return dummyData;
}

function addMarker(obj) {
	var data = posterData[obj.id];
	console.log(obj);
	var markerData = "<div class='marker' item='" + obj.id + "' style='top:" + obj.x + ";left:" + obj.y + ";'><div class='portrait' style=\"background-image:url('" + data.image + "');\"></div><div class='name'><div class='last_name'>" + data.last_name + "</div><div class='first_name'>" + data.first_name + "</div></div></div>";
	
	$("#markers").append(markerData);
	return $(".marker[item=" + obj.id + "]");
}

function cameraLoop() {
	var visibleList = getVisiblePosters();
	var currentlyVisible = {};
	// Добавляем маркеры, которых еще нет, обновляем существующие
	for (var i = 0; i < visibleList.length; i++) {
		var obj = visibleList[i];
		if (!activeMarkers[obj.id]) {
			obj.marker = addMarker(obj);
			obj.targetX = obj.x;
			obj.targetY = obj.y;
			obj.currentX = obj.x;
			obj.currentY = obj.y;
			obj.opacity = 0;
			$(obj.marker).click(function() {
				showView("info", $(this).attr("item"));
			});
			activeMarkers[obj.id] = obj;
		} else {
			var marker = activeMarkers[obj.id];
			marker.targetX = obj.x;
			marker.targetY = obj.y;
		}
		currentlyVisible[obj.id] = true;
	}
	// Управляем движением и видимостью
	for (var key in activeMarkers) {
		var marker = activeMarkers[key];
		if (!currentlyVisible[marker.id]) {
			marker.opacity = Math.max(marker.opacity - 0.05 * tC, 0);
		} else {
			marker.opacity = Math.min(marker.opacity + 0.05 * tC, 1);
		}

		marker.marker.css("opacity", marker.opacity);
        marker.marker.css("left", marker.targetX + "px");
        marker.marker.css("top", marker.targetY + "px");

		// var dX = marker.targetX - marker.currentX;
		// var dY = marker.targetY - marker.currentY;
		// if (dX > settings.moveThreshold || dY > settings.moveThreshold) {
		// 	marker.currentX += dX / settings.moveSmoothing;
		// 	marker.currentY += dY / settings.moveSmoothing;
		// }
		// marker.marker.css("left", marker.currentX + "px");
		// marker.marker.css("top", marker.currentY + "px");
	}
}

function audioLoop() {
	
}

function mainLoop() {
	viewTime = getTimestamp() - viewStart;
	var loopDelta = getTimestamp() - loopAnchor;
	tC = loopDelta / (settings.mainInterval / 1000);
	loopAnchor = getTimestamp();

	switch(currentView) {
		case "":
			showView("intro");
			break;

		case "camera":
			cameraLoop();
			break;
			
		case "intro":
			break;
			
		case "info":
			audioLoop();
			break;

		case "reserve":
			break;
			
		case "desktop":
			break;
	}
}


window.addEventListener('error', function(e) {}, true);
  
$(document).ready(function() {
	setInterval(mainLoop, settings.mainInterval);

    const cameraWorker = new CameraWorker();

    // Кое-кто не учил в интро, что начальная анимация может блокироваться из-за расчета данных от паттернов
    setTimeout(function() {
        cameraWorker.load([
            { id: 'img1', url: './assets/il.jpg' },
            // { id: 'img2', url: './assets/poster1_plain.png' },
            // { id: 'img2', url: './assets/poster2_plain.png' }
        ], { mode: 'webcam' }).then(function() {
            showView('camera');
        })
	}, 550);

	var isMobile = {
		Android: function() {
			return navigator.userAgent.match(/Android/i);
		},
		iOS: function() {
			return navigator.userAgent.match(/iPhone|iPad|iPod/i);
		}
	};
	
	if (!isMobile.Android() && !isMobile.iOS()) {
		// Раскомментировать, чтобы на десктопах ставилась заглушка
		// showView("desktop");
	}
});
