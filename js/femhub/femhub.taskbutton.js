
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
        clickEvent:'mousedown',
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

        this.cmenu = new Ext.menu.Menu({
            items: [{
                text: 'Restore',
                handler: function() {
                    if (!this.win.isVisible()) {
                        this.win.show();
                    } else {
                        this.win.restore();
                    }
                },
                scope: this
            },{
                text: 'Minimize',
                handler: this.win.minimize,
                scope: this.win
            },{
                text: 'Maximize',
                handler: this.win.maximize,
                scope: this.win
            }, '-', {
                text: 'Close',
                handler: this.closeWin.createDelegate(this, this.win, true),
                scope: this.win
            }],
        });

        this.cmenu.on('beforeshow', function() {
            var items = this.cmenu.items.items;
            var w = this.win;
            items[0].setDisabled(w.maximized !== true && w.hidden !== true);
            items[1].setDisabled(w.minimized === true);
            items[2].setDisabled(w.maximized === true || w.hidden === true);
        }, this);

        this.el.on('contextmenu', function(e) {
            e.stopEvent();

            if (!this.cmenu.el) {
                this.cmenu.render();
            }

            var xy = e.getXY();
            xy[1] -= this.cmenu.el.getHeight();
            this.cmenu.showAt(xy);
        }, this);
    },

    closeWin: function(cMenu, e, win) {
        if (!win.isVisible()) {
            win.show();
        } else {
            win.restore();
        }
        win.close();
    },
});

