
FEMhub.Electrostatics = Ext.extend(FEMhub.Window, {
    constructor: function(config) {
        config = config || {};

        this.toolbar = this.initToolbar();
        this.uuid = 0;

        Ext.apply(config, {
            title: "Electrostatics",
            layout: 'fit',
            width: 885,
            height: 595,
            iconCls: 'femhub-electrostatics-icon',
            bodyCssClass: 'femhub-mesheditor-body',
            closable: true,
            onEsc: Ext.emptyFn,
            tbar: this.toolbar,
            items: [{
                    "title": "Beta Version",
                    "html": '<div id="electrostatics_div"></div>',
                    flex: 1,
                }],
            buttons: [{
                text: 'Close',
                handler: function() {
                    this.close();
                },
                scope: this,
            }],
        });

        FEMhub.Electrostatics.superclass.constructor.call(this, config);
    },

    initToolbar: function() {
        return new Ext.Toolbar({
            enableOverflow: true,
            items: [{
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'Run',
                iconCls: 'femhub-add-worksheet-icon',
                handler: function() {
                    this.run();
                },
                scope: this,
            }, {
                xtype: 'textfield',
                name: "BC",
                value: '5',
            }],
        });
    },

    run: function() {
        BC = this.toolbar.items.items["1"]
        BC_value = BC.getValue()
        FEMhub.log(BC_value);
        this.sourcecode = "\
from hermes2d.modules.electrostatics import Electrostatics\n\
from hermes2d.hermes2d import Linearizer\n\
from hermes2d.plot import sln2png, plot_sln_mayavi\n\
from femhub.plot import return_mayavi_figure\n\
\n\
mesh = \"\"\"\n\
a = 1.0  # size of the mesh\n\
b = sqrt(2)/2\n\
\n\
vertices =\n\
{\n\
  { 0, -a },    # vertex 0\n\
  { a, -a },    # vertex 1\n\
  { -a, 0 },    # vertex 2\n\
  { 0, 0 },     # vertex 3\n\
  { a, 0 },     # vertex 4\n\
  { -a, a },    # vertex 5\n\
  { 0, a },     # vertex 6\n\
  { a*b, a*b }  # vertex 7\n\
}\n\
\n\
elements =\n\
{\n\
  { 0, 1, 4, 3, 0 },  # quad 0\n\
  { 3, 4, 7, 0 },     # tri 1\n\
  { 3, 7, 6, 0 },     # tri 2\n\
  { 2, 3, 6, 5, 0 }   # quad 3\n\
}\n\
\n\
boundaries =\n\
{\n\
  { 0, 1, 1 },\n\
  { 1, 4, 2 },\n\
  { 3, 0, 4 },\n\
  { 4, 7, 2 },\n\
  { 7, 6, 2 },\n\
  { 2, 3, 4 },\n\
  { 6, 5, 2 },\n\
  { 5, 2, 3 }\n\
}\n\
\n\
curves =\n\
{\n\
  { 4, 7, 45 },  # +45 degree circular arcs\n\
  { 7, 6, 45 }\n\
}\"\"\"\n\
\n\
def main():\n\
    e = Electrostatics()\n\
    e.set_mesh_str(mesh)\n\
    e.set_initial_mesh_refinement(2)\n\
    e.set_initial_poly_degree(4)\n\
    e.set_material_markers([8, 2])\n\
    e.set_permittivity_array([4, 3.1, 5])\n\
    e.set_charge_density_array([4, 3.1, 5])\n\
    e.set_boundary_markers_value([1, 3])\n\
    e.set_boundary_values([1, " + BC_value + "])\n\
    e.set_boundary_markers_derivative([2, 4])\n\
    e.set_boundary_derivatives([1, 5])\n\
    r, sln = e.calculate()\n\
    assert r is True\n\
    fig = plot_sln_mayavi(sln, offscreen=True)\n\
    return_mayavi_figure(fig)\n\
\n\
main()";

            if (this.uuid == 0) {
                // we need to initialize a new engine
                this.uuid = FEMhub.util.rfc.UUID();
                FEMhub.log("UUID created:" + this.uuid);
                FEMhub.RPC.Engine.init({uuid: this.uuid}, {
                    okay: function(result) {
                        FEMhub.log("Engine Initialized");
                        this.run2_evaluate(this.uuid);
                    },
                    fail: function(reason, result) {
                        FEMhub.log("Engine Failed to Initialize");
                    },
                    scope: this,
                    status: {
                        start: function() {
                            //return this.fireEvent('initstart', this);
                            FEMhub.log("initstart");
                        },
                        end: function(ok, ret) {
                            FEMhub.log("initend, ok: " + ok + " ret: " + ret);
                            //this.fireEvent('initend', this, ok, ret);
                        },
                    },
                });
            } else {
                // We reuse a running engine
                this.run2_evaluate(this.uuid);
            }
    },

    run2_evaluate: function(uuid) {
            FEMhub.RPC.Engine.evaluate({
                uuid: uuid,
                source: this.sourcecode,
            }, {
                okay: function(result) {
                    FEMhub.log("Evaluate Succeeded");
                    this.run3_result(result);
                },
                fail: function() {
                    FEMhub.log("Evaluate Failed");
                },
                scope: this,
                status: {
                    start: function() {
                        //return this.fireEvent('evaluatestart', this);
                        FEMhub.log("evaluatestart");
                    },
                    end: function(ok, ret) {
                        FEMhub.log("evaluateend, ok: " + ok + " ret: " + ret);
                        //this.fireEvent('evaluateend', this, ok, ret);
                    },
                    scope: this,
                },
            });
    },

    run3_result: function(result) {
            FEMhub.log("Got result:");
            FEMhub.log(result);
            if (result.traceback_html) {
                FEMhub.msg.error("Python Traceback", result.traceback_html);
                FEMhub.log(result.traceback_html);
            } else {
                data = result.plots[0].data;
                d = Ext.get("electrostatics_div")
                d.insertFirst({"html": "Solution:<br/><img src=\"data:image/png;base64," + data + "\"/>"})
            }
    },

});

FEMhub.Modules.Electrostatics = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Electrostatics',
        icon: 'femhub-electrostatics-launcher-icon',
    },
    winCls: FEMhub.Electrostatics,
});

