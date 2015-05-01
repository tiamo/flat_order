(function($){
	
	function fsForm(container, opts) {
		
		var base = this;
		var support = {
			animation: 'WebkitAnimation' in document.body.style ||
				'MozAnimation' in document.body.style ||
				'msAnimation' in document.body.style ||
				'OAnimation' in document.body.style ||
				'animation' in document.body.style
		};
		var animEndEventName = 'webkitAnimationEnd oAnimationEnd MSAnimationEnd animationend';
		var body = $('body');
		
		base.opts = opts = $.extend({
			duration: 500,
			// events
			onStart: function(b){},
			onFinish: function(b){},
			onShow: function(b){},
			onReview: function(b){},
			onSubmit: function(b){}
		}, opts);
		
		base.$overlay = $('.fs-overlay');
		base.$progress = $('.fs-progress', container);
		base.$form = $('.fs-form', container);
		base.$close = $('.fs-close', container);
		base.$controls = $('.fs-controls', container).show();
		base.$back = $('.fs-back', base.$controls).hide();
		base.$continue = $('.fs-continue', base.$controls);
		base.$nav = $('.fs-nav', container).show();
		base.$fields = $('.fs-fields', container);
		base.fields = base.$fields.find('>li');
		base.fieldsCount = base.fields.length;
		base.current = 0;
		
		// prepare elements
		if (!base.$progress.length) {
			base.$progress = $('<div/>').addClass('fs-progress').appendTo(container);
		}
		if (!base.$close.length) {
			base.$close = $('<a href="javascript:">close<span></span></a>').addClass('fs-close').appendTo(container);
		}
		if (!base.$nav.length) {
			base.$nav = $('<ul/>').addClass('fs-nav').before(base.$fields);
		}
		
		base.progress = function(fn){
			base.$progress.css({
				width: (base.current+1) * (100/(base.fieldsCount+1)) + '%'
			}).show();
		}
		base.start = function() {
			base.$overlay.fadeOut(opts.duration, function(){
				body.removeClass('fs-lock');
				base.progress();
			});
			// show first field
			base.fields.eq(base.current).addClass('fs-current');
			container.trigger('fs.start');
		}
		base.finish = function() {
			$('html,body').animate({scrollTop:0});
			base.$overlay.fadeIn(opts.duration, function(){
				base.fields.removeClass('fs-current');
				body.removeClass('fs-overview');
				body.addClass('fs-lock');
				base.$form[0].reset();
				base.current = 0;
				base._updateNav();
				container.trigger('fs.finish');
			});
		}
		base._updateNav = function(){
			base.$nav.find('li').removeClass('visited').each(function(i){
				var li = $(this);
				if (i==0) {
					li.addClass('first');
				}
				if (i==base.fieldsCount) {
					li.addClass('last');
				}
				if (base.current>i) {
					li.addClass('visited');
				}
				if (base.current==i) {
					li.addClass('active');
				}
				else {
					li.removeClass('active');
				}
				i++;
			});
		}
		base.showField = function(pos){
			if (base.isAnimating) {
				return false;
			}
			var currentField = base.fields.eq(base.current);
			
			base.isAnimating = true;
			base.navdir = pos!=undefined && pos < base.current ? 'prev' : 'next';
			base.current = pos!=undefined ? pos : base.current+1;
			
			var isLastStep = base.current>=base.fieldsCount;
			var nextField = base.fields.eq(base.current);
			
			base.$fields.addClass('fs-display-' + base.navdir);
			currentField.addClass('fs-hide');
			base.progress();
			
			currentField.removeClass('fs-current');
				
			if (!isLastStep) {
				base._updateNav();
				nextField.addClass('fs-show');
				nextField.addClass('fs-current');
				if (base.current==0) {
					base.$back.hide();
				}
				else {
					base.$back.show();
				}
			}
			
			var animationTimer;
			function callbackFn(){
				clearTimeout(animationTimer);
				animationTimer = setTimeout(function(){
					base.$fields.removeClass('fs-display-' + base.navdir);
					currentField.removeClass('fs-hide');
					
					if (isLastStep) {
						base.$progress.fadeOut(300, function(){
							body.addClass('fs-overview');
							base.$form.fadeIn(500);
							// scroll to top
							$('html,body').animate({scrollTop:0});
							container.trigger('fs.review');
						});
					}
					else {
						nextField.removeClass('fs-show');
					}
					base.isAnimating = false;
					container.trigger('fs.show');
				}, 200);
			}
			
			if (support.animation) {
				if (base.navdir === 'next') {
					if (isLastStep) {
						console.log(currentField.html())
						$('.fs-anim-upper', currentField).one(animEndEventName, callbackFn);
					}
					else {
						$('.fs-anim-lower', nextField).one(animEndEventName, callbackFn);
					}
				}
				else {
					$('.fs-anim-upper', nextField).one(animEndEventName, callbackFn);
				}
			}
			else {
				callbackFn();
			}
		}
		base.prevField = function(){
			base.showField(base.current-1);
		}
		base.nextField = function(){
			if (base.validateField()) {
				base.showField(base.current+1);
			}
		}
		base.validateField = function(){
			var valid = true;
			var field = base.fields.eq(base.current);
			field.find('[required]').each(function(){
				if (!valid) return;
				var f = $(this);
				if (!f.val()) {
					valid = false;
					f.shake(3,25,600);
				}
			});
			return valid;
		}
		
		// bind events
		function bindEvents(){
			// custom events
			container
				.on('fs.start', function(){
					opts.onStart(base);
				})
				.on('fs.finish', function(){
					opts.onFinish(base);
				})
				.on('fs.show', function(){
					opts.onShow(base);
				})
				.on('fs.review', function(){
					opts.onReview(base);
				})
			;
			// submit form
			base.$form.on('submit', function(){
				return opts.onSubmit(base);
			});
			// custom input file
			base.$form.on('change', '.fs-upload input', function(){
				var fileTitle = this.value ? this.value.replace(/.*\\(.*)/, "$1").replace(/.*\/(.*)/, "$1") : 'Choose file';
				$(this).prev().text(fileTitle);
			});
            // close button
			var closeTimer;
            base.$close.mousedown(function() {
                closeTimer = setTimeout(function() {
					base.finish();
                }, 2000);
            }).bind('mouseup mouseleave', function() {
                clearTimeout(closeTimer);
            });
			if ($.browser && $.browser.mobile) {
				base.$close.on('click', function(){
					base.finish();
					return false;
				});
			}
			
			base.$overlay.on('click', '.fs-start', function(){
				base.start();
				return false;
			});
			base.$back.on('click', function(){
				base.prevField();
				return false;
			});
			base.$continue.on('click', function(){
				base.nextField();
				return false;
			});
		}
		
		// initialization
		function init(){
			// add navigation
			base.fields.each(function(i){
				var title = $(this).data('title');
				var li = $('<li><b>'+(i+1)+'</b><span>'+title+'</span></li>');
				if (i==0) {
					li.addClass('first');
				}
				if (i==base.fieldsCount-1) {
					li.addClass('last');
				}
				if (base.current>i) {
					li.addClass('visited');
				}
				else if (base.current==i) {
					li.addClass('active');
				}
				base.$nav.append(li);
			});
			
			// base.start();
			// base.showField(1);
			
			bindEvents();
		}
		
		init();
	}
	
	/**
	 * Shake effect
	 */
	$.fn.shake = function(intShakes, intDistance, intDuration) {
		this.each(function() {
			$(this).css("position","relative"); 
			for (var x=1; x<=intShakes; x++) {
				$(this).animate({left:(intDistance*-1)}, (((intDuration/intShakes)/4)))
					.animate({left:intDistance}, ((intDuration/intShakes)/2))
					.animate({left:0}, (((intDuration/intShakes)/4)));
			}
		});
		return this;
	};
	
	/**
	 * On DOM initialize
	 */
	$(function(){
		var swiper = new Swiper('.swiper-container',{
			// setWrapperSize: true,
			slidesPerView: 'auto',
			// centeredSlides: true,
			freeMode: true,
			spaceBetween: 50
		});
		var fs = new fsForm($('.fs-container'),{
			onSubmit: function(base){
				$.ajax({
					url: base.$form.attr('action'),
					data: base.$form.serialize(),
					type: 'post',
					success: function(res){
						base.finish();
					},
					error: function(xhr, status, msg){
						alert(msg);
						base.finish();
					}
				});
				return false;
			},
			onReview: function(){
				setTimeout(function(){
					swiper.update();
				},400);
			}
		});
	});
	
})(jQuery);
