function drawSplashscreen(initialTime=800, fadeTime=800) {
    const $splash = $("#splashscreen");
    $("#splashscreen").show();
    var i = 50;
    function animation() {
	$splash.show();
	$splash.css({opacity: i / 50});
	i -= 1;
	if (i <= 0) {
	    $splash.hide();
	} else {
	    setTimeout(animation, fadeTime/50);
	}
    }
    setTimeout(animation, initialTime);
}
