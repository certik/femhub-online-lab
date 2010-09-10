
FEMhub.msg = {};

FEMhub.msg.NotImplementedError = function() {
    Ext.MessageBox.show({
        title: 'Not implemented',
        msg: "This function hasn't been implemented yet. Sorry.",
        buttons: Ext.MessageBox.OK,
        icon: Ext.MessageBox.INFO,
    });
}

