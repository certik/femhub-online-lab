
FEMhub.Desktop = function(lab) {
    var body = Ext.getBody();

    var desktopEl = body.createChild({
        tag: 'div',
        id: 'femhub-desktop',
    });

    var taskbarEl = body.createChild({
        tag: 'div',
        id: 'femhub-taskbar',
    });

    this.taskbar = new FEMhub.TaskBar(lab);
    this.taskbar.render();
    this.xTickSize = this.yTickSize = 1;
    var taskbar = this.taskbar;
    var windows = new Ext.WindowGroup();
    var activeWindow;

    this.launchers = [];

    function minimizeWin(win) {
        win.minimized = true;
        win.hide();
    }

    function markActive(win) {
        if (activeWindow && activeWindow != win) {
            markInactive(activeWindow);
        }
        taskbar.setActiveButton(win.taskButton);
        activeWindow = win;
        Ext.fly(win.taskButton.el).addClass('active-win');
        win.minimized = false;
    }

    function markInactive(win) {
        if (win == activeWindow) {
            activeWindow = null;
            Ext.fly(win.taskButton.el).removeClass('active-win');
        }
    }

    function removeWin(win) {
        taskbar.removeButton(win.taskButton);
        layout();
    }

    function layout() {
        desktopEl.setHeight(Ext.lib.Dom.getViewHeight()-taskbarEl.getHeight());
    }

    Ext.EventManager.onWindowResize(layout);
    this.layout = layout;

    this.createWindow = function(cls, config) {
        config = config || {};

        Ext.applyIf(config, {
            renderTo: desktopEl,
            manager: windows,
            minimizable: true,
            maximizable: true
        });

        var win = new cls(config);

        win.dd.xTickSize = this.xTickSize;
        win.dd.yTickSize = this.yTickSize;
        win.resizer.widthIncrement = this.xTickSize;
        win.resizer.heightIncrement = this.yTickSize;
        win.render(desktopEl);
        win.taskButton = taskbar.addButton(win);

        win.cmenu = new Ext.menu.Menu({
            items: [],
        });

        win.animateTarget = win.taskButton.el;

        win.on({
            'activate': {
                fn: markActive
            },
            'beforeshow': {
                fn: markActive
            },
            'deactivate': {
                fn: markInactive
            },
            'minimize': {
                fn: minimizeWin
            },
            'close': {
                fn: removeWin
            }
        });

        layout();
        return win;
    };

    this.getManager = function() {
        return windows;
    };

    this.getWindow = function(id) {
        return windows.get(id);
    }

    this.getWinWidth = function() {
        var width = Ext.lib.Dom.getViewWidth();
        return width < 200 ? 200 : width;
    }

    this.getWinHeight = function() {
        var height = (Ext.lib.Dom.getViewHeight()-taskbarEl.getHeight());
        return height < 100 ? 100 : height;
    }

    this.getWinX = function(width) {
        return (Ext.lib.Dom.getViewWidth() - width) / 2
    }

    this.getWinY = function(height) {
        return (Ext.lib.Dom.getViewHeight()-taskbarEl.getHeight() - height) / 2;
    }

    this.setTickSize = function(xTickSize, yTickSize) {
        this.xTickSize = xTickSize;

        if (arguments.length == 1) {
            this.yTickSize = xTickSize;
        } else {
            this.yTickSize = yTickSize;
        }

        windows.each(function(win) {
            win.dd.xTickSize = this.xTickSize;
            win.dd.yTickSize = this.yTickSize;
            win.resizer.widthIncrement = this.xTickSize;
            win.resizer.heightIncrement = this.yTickSize;
        }, this);
    };

    this.cascade = function() {
        var x = 0, y = 0;
        windows.each(function(win) {
            if (win.isVisible() && !win.maximized) {
                win.setPosition(x, y);
                x += 20;
                y += 20;
            }
        }, this);
    };

    this.tile = function() {
        var availWidth = desktopEl.getWidth(true);
        var x = this.xTickSize;
        var y = this.yTickSize;
        var nextY = y;

        windows.each(function(win) {
            if (win.isVisible() && !win.maximized) {
                var w = win.el.getWidth();
                // Wrap to next row if we are not at the line start and this Window will go off the end
                if ((x > this.xTickSize) && (x + w > availWidth)) {
                    x = this.xTickSize;
                    y = nextY;
                }
                win.setPosition(x, y);
                x += w + this.xTickSize;
                nextY = Math.max(nextY, y + win.el.getHeight() + this.yTickSize);
            }
        }, this);
    };

    layout();

    this.addLauncher = function(module) {
        var launcher = new FEMhub.Launcher({
            launcherText: module.launcher.text,
            launcherIcon: module.launcher.icon,
        });

        this.launchers.push(launcher);
        launcher.render(desktopEl);

        launcher.on('dblclick', function(obj) {
            module.start();
        });

        launcher.on('contextmenu', function(obj) {
            /* pass */
        });
    };

    this.getDesktopEl = function() {
        return Ext.get('femhub-desktop');
    };

    this.getTaskBarEl = function() {
        return Ext.get('femhub-taskbar');
    };
};

