function drawSplashscreen() {
    const $splash = $("#splashscreen");
    $("#splashscreen").show();
    var i = 1;
    function animation() {
	$splash.show();
	$splash.css({opacity: i});
	i -= 0.02;
	if (i <= 0) {
	    $splash.hide();
	} else {
	    setTimeout(animation, 20);
	}
    }
    setTimeout(animation, 1000);
}
