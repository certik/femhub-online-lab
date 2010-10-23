
FEMhub.TaskButton = function(win, el) {
    this.win = win;

    FEMhub.TaskButton.superclass.constructor.call(this, {
        iconCls: win.iconCls,
        text: Ext.util.Format.ellipsis(win.title, 25),
        renderTo: el,

        handler: function() {
            if (win.minimized || win.hidden) {
                win.show();
            } else if (win == win.manager.getActive()) {
                win.minimize();
            } else {
                win.toFront();
            }
        },
        clickEvent: 'mousedown',
        template: new Ext.Template(
            '<table cellspacing="0" class="x-btn {3}"><tbody><tr>',
            '<td class="femhub-taskbutton-left"><i>&#160;</i></td>',
            '<td class="femhub-taskbutton-center"><em class="{5}" unselectable="on">',
            '<button class="x-btn-text {2}" type="{1}" style="height:28px;">{0}</button>',
            '</em></td>',
            '<td class="femhub-taskbutton-right"><i>&#160;</i></td>',
            '</tr></tbody></table>'),
    });
};

Ext.extend(FEMhub.TaskButton, Ext.Button, {
    onRender: function() {
        FEMhub.TaskButton.superclass.onRender.apply(this, arguments);

        this.context = new Ext.menu.Menu({
            items: [{
                text: 'Move',
                itemId: 'move',
                handler: function() {
                    this.moveWindow();
                },
                scope: this,
            }, {
                text: 'Fit',
                itemId: 'fit',
                handler: function() {
                    this.fitWindow();
                },
                scope: this,
            }, '-', {
                text: 'Restore',
                itemId: 'restore',
                handler: function() {
                    this.restoreWindow();
                },
                scope: this,
            }, {
                text: 'Minimize',
                itemId: 'minimize',
                handler: function() {
                    this.minimizeWindow();
                },
                scope: this,
            }, {
                text: 'Maximize',
                itemId: 'maximize',
                handler: function() {
                    this.maximizeWindow();
                },
                scope: this,
            }, '-', {
                text: 'Close',
                itemId: 'close',
                handler: function() {
                    this.closeWindow();
                },
                scope: this,
            }],
        });

        this.context.on('beforeshow', function() {
            var items, win = this.win;

            items = [
                this.context.getComponent('move'),
                this.context.getComponent('fit'),
            ];

            var disabled = win.maximized === true || win.hidden === true;

            items[0].setDisabled(disabled);
            items[1].setDisabled(disabled);

            items = [
                this.context.getComponent('restore'),
                this.context.getComponent('minimize'),
                this.context.getComponent('maximize'),
            ];

            items[0].setDisabled(win.maximized !== true && win.hidden !== true);
            items[1].setDisabled(win.minimized === true);
            items[2].setDisabled(win.maximized === true || win.hidden === true);
        }, this);

        this.el.on('contextmenu', function(evt) {
            evt.stopEvent();

            if (!this.context.el) {
                this.context.render();
            }

            var xy = evt.getXY();
            xy[1] -= this.context.getHeight();
            this.context.showAt(xy);
        }, this);
    },

    moveWindow: function() {
        var desktop = FEMhub.getDesktop();
        var el = desktop.getDesktopEl();

        function onMouseMove(evt) {
            var xy = evt.getXY();

            xy[0] += 3;
            xy[1] += 3;

            this.win.setPosition(xy);
        }

        function onMouseDown(evt) {
            desktop.enable();

            el.un('mousemove', onMouseMove, this);
            el.un('mousedown', onMouseDown, this);
        }

        this.win.toFront();
        desktop.disable();

        el.on('mousemove', onMouseMove, this);
        el.on('mousedown', onMouseDown, this);
    },

    fitWindow: function() {
        var box = this.win.getBox();

        if (box.x < 0) {
            box.x = 0;
        }

        if (box.y < 0) {
            box.y = 0;
        }

        var view = FEMhub.getDesktop().getSize();

        if (box.x + box.width > view.width) {
            box.width -= box.x + box.width - view.width;
        }

        if (box.y + box.height > view.height) {
            box.height -= box.y + box.height - view.height;
        }

        this.win.toFront();
        this.win.updateBox(box);
    },

    restoreWindow: function() {
        if (this.win.isVisible()) {
            this.win.restore();
        } else {
            this.win.show();
        }
    },

    minimizeWindow: function() {
        this.win.minimize();
    },

    maximizeWindow: function() {
        this.win.maximize();
    },

    closeWindow: function() {
        this.restoreWindow();
        this.win.close();
    },
});

