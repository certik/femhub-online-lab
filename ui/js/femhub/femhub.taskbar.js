
FEMhub.TaskBar = Ext.extend(Ext.BoxComponent, {
    activeButton: null,
    enableScroll: true,
    scrollIncrement: 0,
    scrollRepeatInterval: 400,
    scrollDuration: 0.35,
    animScroll: true,
    resizeButtons: true,
    buttonWidth: 200,
    minButtonWidth: 150,
    buttonMargin: 2,
    buttonWidthSet: false,
    el: 'femhub-taskbar',

    initComponent: function() {
        FEMhub.TaskBar.superclass.initComponent.call(this);
        this.buttons = [];
    },

    onRender: function() {
        FEMhub.TaskBar.superclass.onRender.apply(this, arguments);

        this.wrapper = this.el.createChild({
            cls: 'femhub-taskbar-wrapper',
            children: {
                tag:'ul', cls:'femhub-taskbar-elements'
            },
        });

        this.elements = new Ext.Element(this.wrapper.dom.firstChild);

        this.terminator = this.elements.createChild({
            tag:'li',
            cls:'femhub-taskbar-terminator'
        });

        this.elements.createChild({
            cls:'femhub-taskbar-clear'
        });

        this.on('resize', this.delegateUpdates);
    },

    addButton: function(win) {
        var li = this.elements.createChild({
            tag:'li',
        }, this.terminator);

        var button = new FEMhub.TaskButton(win, li);
        this.buttons.push(button);

        if (!this.buttonWidthSet) {
            this.lastButtonWidth = button.container.getWidth();
        }

        this.setActiveButton(button);
        return button;
    },

    removeButton: function(button) {
        var li = button.container;

        button.destroy();
        li.remove();

        var length = this.buttons.length;
        var buttons = [];

        for (var i = 0; i < length; i++) {
            if (this.buttons[i] != button) {
                buttons.push(this.buttons[i]);
            }
        }

        this.buttons = buttons;
        this.delegateUpdates();
    },

    setActiveButton: function(button) {
        this.activeButton = button;
        this.delegateUpdates();
    },

    delegateUpdates: function() {
        if (this.resizeButtons && this.rendered) {
            this.autoSize();
        }
        if (this.enableScroll && this.rendered) {
            this.autoScroll();
        }
    },

    autoSize: function() {
        var count = this.buttons.length;
        var aw = this.el.dom.clientWidth;

        if (!this.resizeButtons || count < 1 || !aw) { // !aw for display:none
            return;
        }

        var each = Math.max(Math.min(Math.floor((aw-4) / count) - this.buttonMargin, this.buttonWidth), this.minButtonWidth); // -4 for float errors in IE
        var btns = this.wrapper.dom.getElementsByTagName('button');

        this.lastButtonWidth = Ext.get(btns[0].id).findParent('li').offsetWidth;

        for (var i = 0, len = btns.length; i < len; i++) {
            var btn = btns[i];

            var tw = Ext.get(btns[i].id).findParent('li').offsetWidth;
            var iw = btn.offsetWidth;

            btn.style.width = (each - (tw-iw)) + 'px';
        }
    },

    autoScroll: function() {
        var count = this.buttons.length;
        var tw = this.el.dom.clientWidth;

        var wrap = this.wrapper;
        var cw = wrap.dom.offsetWidth;
        var pos = this.getScrollPos();
        var l = this.terminator.getOffsetsTo(this.wrapper)[0] + pos;

        if (!this.enableScroll || count < 1 || cw < 20) { // 20 to prevent display:none issues
            return;
        }

        wrap.setWidth(tw);

        if (l <= tw) {
            wrap.dom.scrollLeft = 0;

            if (this.scrolling) {
                this.scrolling = false;
                this.el.removeClass('femhub-taskbar-scrolling');
                this.scrollLeft.hide();
                this.scrollRight.hide();
            }
        } else {
            if (!this.scrolling) {
                this.el.addClass('femhub-taskbar-scrolling');
            }
            tw -= wrap.getMargins('lr');
            wrap.setWidth(tw > 20 ? tw: 20);
            if (!this.scrolling) {
                if (!this.scrollLeft) {
                    this.createScrollers();
                } else {
                    this.scrollLeft.show();
                    this.scrollRight.show();
                }
            }
            this.scrolling = true;
            if (pos > (l-tw)) { // ensure it stays within bounds
                wrap.dom.scrollLeft = l-tw;
            } else { // otherwise, make sure the active button is still visible
                this.scrollToButton(this.activeButton, true); // true to animate
            }

            this.updateScrollButtons();
        }
    },

    createScrollers: function() {
        var h = this.el.dom.offsetHeight; //var h = this.wrapper.dom.offsetHeight;

        // left
        var sl = this.el.insertFirst({
            cls: 'femhub-taskbar-scroller femhub-left',
        });

        sl.setHeight(h);
        sl.addClassOnOver('femhub-highlight');

        this.leftRepeater = new Ext.util.ClickRepeater(sl, {
            interval: this.scrollRepeatInterval,
            handler: this.onScrollLeft,
            scope: this,
        });

        this.scrollLeft = sl;

        // right
        var sr = this.el.insertFirst({
            cls: 'femhub-taskbar-scroller femhub-right',
        });

        sr.setHeight(h);
        sr.addClassOnOver('femhub-highlight');

        this.rightRepeater = new Ext.util.ClickRepeater(sr, {
            interval: this.scrollRepeatInterval,
            handler: this.onScrollRight,
            scope: this,
        });

        this.scrollRight = sr;
    },

    getScrollWidth: function() {
        return this.terminator.getOffsetsTo(this.wrapper)[0] + this.getScrollPos();
    },

    getScrollPos: function() {
        return parseInt(this.wrapper.dom.scrollLeft, 10) || 0;
    },

    getScrollArea: function() {
        return parseInt(this.wrapper.dom.clientWidth, 10) || 0;
    },

    getScrollAnim: function() {
        return {
            duration: this.scrollDuration,
            callback: this.updateScrollButtons,
            scope: this,
        };
    },

    getScrollIncrement: function() {
        return (this.scrollIncrement || this.lastButtonWidth+2);
    },

    scrollToButton: function(item, animate) {
        if (!item || !item.el.dom) {
            return;
        }

        var li = item.el.parent();

        var pos = this.getScrollPos();
        var area = this.getScrollArea();

        var left = li.getOffsetsTo(this.wrapper)[0] + pos;
        var right = left + li.dom.offsetWidth;

        if (left < pos) {
            this.scrollTo(left, animate);
        } else if (right > (pos + area)) {
            this.scrollTo(right - area, animate);
        }
    },

    scrollTo: function(pos, animate) {
        this.wrapper.scrollTo('left', pos, animate ? this.getScrollAnim(): false);

        if (!animate) {
            this.updateScrollButtons();
        }
    },

    onScrollRight: function() {
        var sw = this.getScrollWidth() - this.getScrollArea();
        var pos = this.getScrollPos();
        var s = Math.min(sw, pos + this.getScrollIncrement());
        if (s != pos) {
            this.scrollTo(s, this.animScroll);
        }
    },

    onScrollLeft: function() {
        var pos = this.getScrollPos();
        var s = Math.max(0, pos - this.getScrollIncrement());
        if (s != pos) {
            this.scrollTo(s, this.animScroll);
        }
    },

    updateScrollButtons: function() {
        var pos = this.getScrollPos();
        this.scrollLeft[pos === 0 ? 'addClass': 'removeClass']('femhub-disabled');
        this.scrollRight[pos >= (this.getScrollWidth()-this.getScrollArea()) ? 'addClass': 'removeClass']('femhub-disabled');
    },

    onEnable: function() {
        Ext.each(this.buttons, function(button) {
            button.enable();
        }, this);
    },

    onDisable: function() {
        Ext.each(this.buttons, function(button) {
            button.disable();
        }, this);
    },
});

