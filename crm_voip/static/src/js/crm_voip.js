openerp.crm_voip = function(instance) {

    var _t = openerp._t;
    var _lt = openerp._lt;
    var QWeb = openerp.qweb;
    var crm_voip = openerp.crm_voip = {};  
    
    crm_voip.PhonecallWidget = openerp.Widget.extend({
        "template": "crm_voip.PhonecallWidget",
        events: {
            "click": "select_call",
            "click .oe_dial_remove_phonecall": "remove_phonecall"
        },
        init: function(parent, phonecall, formatCurrency) {
            this._super(parent);
            this.id = phonecall.id;
            if(phonecall.partner_name){
                this.partner_name = _.str.truncate(phonecall.partner_name,19);
            }else{
                this.partner_name = _t("Unknown");
            }
            this.state =phonecall.state;
            this.image_small = phonecall.partner_image_small;
            this.email =phonecall.partner_email;
            this.name =_.str.truncate(phonecall.name,23);
            this.opportunity_id = phonecall.opportunity_id;
            this.partner_id = phonecall.partner_id;
            this.opportunity_name = phonecall.opportunity_name;
            this.opportunity_planned_revenue = formatCurrency(phonecall.opportunity_planned_revenue, phonecall.opportunity_company_currency);
            this.partner_phone = phonecall.partner_phone;
            this.description = phonecall.description;
            this.probability = phonecall.opportunity_probability;
            this.date= phonecall.date;
            this.duration = phonecall.duration;
            this.opportunity_date_action = phonecall.opportunity_date_action;
            this.display_opp_name = true;
            this.opportunity_title_action = phonecall.opportunity_title_action;
            if(!this.opportunity_name){
                this.opportunity_name = _t("No opportunity linked");
            }else if(this.opportunity_name == phonecall.name){
                this.display_opp_name = false;
            }
            this.max_priority = phonecall.max_priority;
            this.opportunity_priority = phonecall.opportunity_priority;
        },

        start: function(){
            var empty_star = parseInt(this.max_priority) - parseInt(this.opportunity_priority);
            //creation of the tooltip
            this.$el.popover({
                placement : 'right', // top, bottom, left or right
                title : QWeb.render("crm_voip_Tooltip_title", {
                    name: this.name, priority: parseInt(this.opportunity_priority), empty_star:empty_star}), 
                html: 'true', 
                content :  QWeb.render("crm_voip_Tooltip",{
                    display_opp_name: this.display_opp_name,
                    opportunity: this.opportunity_name,
                    partner_name: this.partner_name,
                    phone: this.partner_phone,
                    description: this.description,
                    email: this.partner_email,
                    title_action: this.opportunity_title_action,
                    planned_revenue: this.opportunity_planned_revenue,
                    probability: this.opportunity_probability,
                    date: this.date,
                }),
            });
        },

        //select the clicked call, show options and put some highlight on it
        select_call: function(){
            this.trigger("select_call", this.id);
        },

        remove_phonecall: function(e){
            e.stopPropagation();
            this.trigger("remove_phonecall",this);
        },

        set_state: function(state){
            if(state !== this.state){
                this.state = state;
                if(state === 'in_call'){
                    this.$('.oe_dial_phonecall_partner_name')
                        .after("<i style='margin-left:5px;' class='fa fa-microphone oe_dial_icon_inCall'></i>");
                }else if(state == 'pending' && !this.$('.oe_dial_state_icon_pending').length){
                    this.$('.oe_dial_status_span')
                        .append('<i class="fa fa-stack oe_dial_state_icon" style="width:13px; height:15px;line-height: 13px;">'+
                                '<i class="fa fa-phone fa-stack-1x oe_dial_state_icon text-muted"></i>'+
                                '<i class="fa fa-times fa-stack-1x oe_dial_state_icon"'+
                                'style="color: LightCoral;font-size: 8px;left: 4px;position: relative;bottom: 4px;"></i>'+
                                '</i>');
                    this.$('.oe_dial_icon_inCall').remove();
                    if(this.$('.oe_dial_state_icon_done').length){
                        this.$('.oe_dial_state_icon_done').remove();
                    }
                }else{
                    this.$('.oe_dial_icon_inCall').remove();
                }
            }
        },

        schedule_call: function(){
            openerp.client.action_manager.do_action({
                name: 'Schedule Other Call',
                type: 'ir.actions.act_window',
                key2: 'client_action_multi',
                src_model: "crm.phonecall",
                res_model: "crm.phonecall2phonecall",
                multi: "True",
                target: 'new',
                context: {'active_id': this.id, 'active_ids': [this.id]},
                views: [[false, 'form']],
                flags: {
                    'headless': true,
                }
            });
        },

        send_email: function(){
            if(this.opportunity_id){
                openerp.client.action_manager.do_action({
                    type: 'ir.actions.act_window',
                    res_model: 'mail.compose.message',
                    src_model: 'crm.phonecall',
                    multi: "True",
                    target: 'new',
                    key2: 'client_action_multi',
                    context: {
                                'default_composition_mode': 'mass_mail',
                                'active_ids': [this.opportunity_id],
                                'default_model': 'crm.lead',
                                'default_partner_ids': [this.partner_id],
                                'default_use_template': true,
                            },
                    views: [[false, 'form']],
                });
            }else if(this.partner_id){
                openerp.client.action_manager.do_action({
                    type: 'ir.actions.act_window',
                    res_model: 'mail.compose.message',
                    src_model: 'crm.phonecall',
                    multi: "True",
                    target: 'new',
                    key2: 'client_action_multi',
                    context: {
                                'default_composition_mode': 'mass_mail',
                                'active_ids': [this.partner_id],
                                'default_model': 'res.partner',
                                'default_partner_ids': [this.partner_id],
                                'default_use_template': true,
                            },
                    views: [[false, 'form']],
                });
            }
        },

        to_lead: function(){
            var self = this;
            if(this.opportunity_id){
                //Call of the function xmlid_to_res_model_res_id to get the id of the opportunity's form view and not the lead's form view
                new instance.web.Model("ir.model.data")
                .call("xmlid_to_res_model_res_id",["crm.crm_case_form_view_oppor"])
                .then(function(data){
                    openerp.client.action_manager.do_action({
                        type: 'ir.actions.act_window',
                        res_model: "crm.lead",
                        res_id: self.opportunity_id,
                        views: [[data[1], 'form']],
                        target: 'current',
                        context: {},
                        flags: {initial_mode: "edit",},
                    });
                });
            }else{
                var phonecall_model = new openerp.web.Model("crm.phonecall");
                phonecall_model.call("action_button_convert2opportunity", [[this.id]]).then(function(result){
                    result.flags= {initial_mode: "edit",};
                    openerp.client.action_manager.do_action(result);
                });
            }
        },

        to_client: function(){
            openerp.client.action_manager.do_action({
                type: 'ir.actions.act_window',
                res_model: "res.partner",
                res_id: this.partner_id,
                views: [[false, 'form']],
                target: 'current',
                context: {},
                flags: {initial_mode: "edit",},
            });
        },

    });

    crm_voip.DialingPanel = openerp.Widget.extend({
        template: "crm_voip.DialingUI",
        events:{
            "keyup .oe_dial_searchbox": "input_change",
            "click .oe_dial_close_icon": "switch_display",
            "click .oe_dial_call_button":  "call_button",
            "click .oe_dial_search_icon": function(){this.search_phonecalls_status(false);},
            "click .oe_dial_refresh_icon": function(){this.search_phonecalls_status(true);},
            "click .oe_dial_hangup_button": "hangup_button",
            "click .oe_dial_schedule_call": "schedule_call",
            "click .oe_dial_email": "send_email",
            "click .oe_dial_to_client": "to_client",
            "click .oe_dial_to_lead": "to_lead",
            "click .oe_dial_transfer_button": "transfer_button",
            "click .oe_dial_autocall_button": "auto_call_button",
            "click .oe_dial_stop_autocall_button": "stop_automatic_call",
        },
        init: function(parent) {    
            this._super(parent);
            //phonecalls in the queue 
            this.widgets = {};
            this.in_call = false;
            this.in_automatic_mode = false;
            this.current_phonecall = null;
            this.shown = false;
            this.optional_buttons_animated = false;
            this.optional_buttons_shown = false;
            //phonecalls which will be called in automatic mode.
            //To avoid calling already done calls
            this.phonecalls_auto_call = [];
            this.selected_phonecall = null;
            //create the sip user agent and bind actions
            this.sip_js = new openerp.voip.user_agent();
            this.sip_js.on('sip_ringing',this,this.sip_ringing);
            this.sip_js.on('sip_accepted',this,this.sip_accepted);
            this.sip_js.on('sip_cancel',this,this.sip_cancel);
            this.sip_js.on('sip_rejected',this,this.sip_rejected);
            this.sip_js.on('sip_bye',this,this.sip_bye);
            this.sip_js.on('sip_error',this,this.sip_error);
            this.sip_js.on('sip_error_resolved',this,this.sip_error_resolved);
            this.sip_js.on('sip_customer_unavailable',this,this.sip_customer_unavailable);

            //To get the formatCurrency function from the server
            var self = this;
            new instance.web.Model("res.currency")
                .call("get_format_currencies_js_function")
                .then(function(data) {
                    self.formatCurrency = new Function("amount, currency_id", data);
                    //update of the panel's list
                    self.search_phonecalls_status();
                });
            //bind the bus trigger with the functions
            openerp.web.bus.on('reload_panel', this, this.search_phonecalls_status);
            openerp.web.bus.on('transfer_call',this,this.transfer_call);
            openerp.web.bus.on('select_call',this,this.select_call);
            openerp.web.bus.on('next_call',this,this.next_call);
        },

        start: function(){
            this.$el.css("bottom", -this.$el.outerHeight());
            this.$big_call_button = this.$('.oe_dial_big_call_button');
            this.$hangup_button = this.$('.oe_dial_hangup_button');
            this.$hangup_transfer_buttons = this.$(".oe_dial_transfer_button, .oe_dial_hangup_button");
        },

        switch_display: function(){
            if (this.shown) {
                this.$el.animate({
                    "bottom": -this.$el.outerHeight(),
                });
            } else {
                // update the list of user status when show the dialer panel
                this.search_phonecalls_status();
                this.$el.animate({
                    "bottom": 0,
                });
            }
            this.shown = ! this.shown;
        },

        //Hide the optional buttons when the panel is reloaded or a phonecall unselected
        slide_down_optional_buttons: function(){
            var self = this;
            if(this.optional_buttons_shown && !this.optional_buttons_animated){
                this.optional_buttons_animated = true;
                this.$(".oe_dial_phonecalls").animate({
                    height: (this.$(".oe_dial_phonecalls").height() + this.$(".oe_dial_optionalbuttons").outerHeight()),
                }, 300,function(){
                    self.optional_buttons_shown = false;
                    self.optional_buttons_animated = false;
                    if(self.button_down_deferred){
                        self.button_down_deferred.resolve();
                    }
                });
            }
        },

        //Slide up the optional buttons when a phonecall is selected
        slide_up_optional_buttons: function(){
            var self = this;
            if(!this.optional_buttons_shown && !this.optional_buttons_animated){
                this.optional_buttons_animated = true;
                this.$(".oe_dial_phonecalls").animate({
                    height: (this.$(".oe_dial_phonecalls").height() - this.$(".oe_dial_optionalbuttons").outerHeight()),
                }, 300,function(){
                    self.optional_buttons_animated = false;
                    self.optional_buttons_shown = true;
                    if(self.button_up_deferred){
                        self.button_up_deferred.resolve();
                    }
                });
            }
        },

        //Modify the phonecalls list when the search input changes
        input_change: function(event) {
            var search = $(event.target).val().toLowerCase();
            //for each phonecall, check if the search is in phonecall name or the partner name
            _.each(this.widgets,function(phonecall){
                var flag = phonecall.partner_name.toLowerCase().indexOf(search) === -1 && 
                    phonecall.name.toLowerCase().indexOf(search) === -1;
                phonecall.$el.toggle(!flag);
            });
        },

        sip_ringing: function(){
            this.$big_call_button.html(_t("Calling..."));
            this.$hangup_button.removeAttr('disabled');
            this.widgets[this.current_phonecall].set_state('in_call');
        },

        sip_accepted: function(){
            new openerp.web.Model("crm.phonecall").call("init_call", [this.current_phonecall]);
            this.$('.oe_dial_transfer_button').removeAttr('disabled');
        },

        sip_cancel: function(){
            this.in_call = false;
            this.widgets[this.current_phonecall].set_state('pending');
            new openerp.web.Model("crm.phonecall").call("rejected_call",[this.current_phonecall]);
            if(this.in_automatic_mode){
                this.next_call();
            }else{
                this.$big_call_button.html(_t("Call"));
                this.$hangup_transfer_buttons.attr('disabled','disabled');
                this.$(".popover").remove();
            }
        },

        sip_customer_unavailable: function(){
            this.do_notify(_t('Customer unavailable'),_t('The customer is temporary unavailable. Please try later.'));
        },

        sip_rejected: function(){
            this.in_call = false;
            new openerp.web.Model("crm.phonecall").call("rejected_call",[this.current_phonecall]);
            this.widgets[this.current_phonecall].set_state('pending');
            if(this.in_automatic_mode){
                this.next_call();
            }else{
                this.$big_call_button.html(_t("Call"));
                this.$hangup_transfer_buttons.attr('disabled','disabled');
                this.$(".popover").remove();
            }
        },

        sip_bye: function(){
            this.in_call = false;
            this.$big_call_button.html(_t("Call"));
            this.$hangup_transfer_buttons.attr('disabled','disabled');
            this.$(".popover").remove();
            new openerp.web.Model("crm.phonecall")
                .call("hangup_call", [this.current_phonecall])
                .then(_.bind(this.hangup_call,this));
        },

        hangup_call: function(result){
            var duration = parseFloat(result.duration).toFixed(2);
            this.log_call(duration);
            this.selected_phonecall = false;
        },

        sip_error: function(message, temporary){
            var self = this;
            this.in_call = false;
            this.$big_call_button.html(_t("Call"));
            this.$hangup_transfer_buttons.attr('disabled','disabled');
            this.$(".popover").remove();
            //new openerp.web.Model("crm.phonecall").call("error_config");
            if(temporary){
                this.$().block({message: message});
                this.$('.blockOverlay').on("click",function(){self.sip_error_resolved();});
                this.$('.blockOverlay').attr('title',_t('Click to unblock'));
            }else{
                this.$().block({message: message + '<br/><button type="button" class="btn btn-danger btn-sm btn-configuration">Configuration</button>'});
                this.$('.btn-configuration').on("click",function(){
                    //Call in order to get the id of the user's preference view instead of the user's form view
                    new instance.web.Model("ir.model.data").call("xmlid_to_res_model_res_id",["base.view_users_form_simple_modif"]).then(function(data){
                        openerp.client.action_manager.do_action(
                            {
                                name: "Change My Preferences",
                                type: "ir.actions.act_window",
                                res_model: "res.users",
                                res_id: openerp.session.uid,
                                target: "new",
                                xml_id: "base.action_res_users_my",
                                views: [[data[1], 'form']],
                            }
                        );
                    });
                });
            }
        },

        sip_error_resolved: function(){
            this.$().unblock();
        },

        log_call: function(duration){
            var value = duration;
            var pattern = '%02d:%02d';
            var min = Math.floor(value);
            var sec = Math.round((value % 1) * 60);
            if (sec == 60){
                sec = 0;
                min = min + 1;
            }
            this.widgets[this.current_phonecall].duration = _.str.sprintf(pattern, min, sec);
            openerp.client.action_manager.do_action({
                    name: 'Log a call',
                    type: 'ir.actions.act_window',
                    key2: 'client_action_multi',
                    src_model: "crm.phonecall",
                    res_model: "crm.phonecall.log.wizard",
                    multi: "True",
                    target: 'new',
                    context: {'phonecall_id': this.current_phonecall,
                    'default_opportunity_id': this.widgets[this.current_phonecall].opportunity_id,
                    'default_name': this.widgets[this.current_phonecall].name,
                    'default_duration': this.widgets[this.current_phonecall].duration,
                    'default_description' : this.widgets[this.current_phonecall].description,
                    'default_opportunity_name' : this.widgets[this.current_phonecall].opportunity_name,
                    'default_opportunity_planned_revenue' : this.widgets[this.current_phonecall].opportunity_planned_revenue,
                    'default_opportunity_title_action' : this.widgets[this.current_phonecall].opportunity_title_action,
                    'default_opportunity_date_action' : this.widgets[this.current_phonecall].opportunity_date_action,
                    'default_opportunity_probability' : this.widgets[this.current_phonecall].opportunity_probability,
                    'default_partner_id': this.widgets[this.current_phonecall].partner_id,
                    'default_partner_name' : this.widgets[this.current_phonecall].partner_name,
                    'default_partner_phone' : this.widgets[this.current_phonecall].partner_phone,
                    'default_partner_email' : this.widgets[this.current_phonecall].partner_email,
                    'default_partner_image_small' : this.widgets[this.current_phonecall].image_small,
                    'default_in_automatic_mode': this.in_automatic_mode,},
                    views: [[false, 'form']],
                    flags: {
                        'headless': true,
                    },
                });
        },

        make_call: function(phonecall_id){
            this.current_phonecall = phonecall_id;
            var number;
            if(!this.widgets[this.current_phonecall].partner_phone){
                this.do_notify(_t('The phonecall has no number'),_t('Please check if a phonenumber is given for the current phonecall'));
                return;
            }
            number = this.widgets[this.current_phonecall].partner_phone;
            //Select the current call if not already selected
            if(!this.selected_phonecall || this.selected_phonecall.id !== this.current_phonecall ){
                this.select_call(this.current_phonecall);
            }
            this.in_call = true;
            this.sip_js.make_call(number);
        },

        next_call: function(){
            if(this.phonecalls_auto_call.length){
                if(!this.in_call){
                    this.make_call(this.phonecalls_auto_call.shift());
                }
            }else{
                this.stop_automatic_call();
            }
        },

        stop_automatic_call: function(){
            this.in_automatic_mode = false;
            this.$(".oe_dial_split_call_button").show();
            this.$(".oe_dial_stop_autocall_button").hide();
            if(!this.in_call){
                this.$big_call_button.html(_t("Call"));
                this.$hangup_transfer_buttons.attr('disabled','disabled');
                this.$(".popover").remove();
            }else{
                this.$big_call_button.html(_t("Calling..."));
            }
        },

        //Get the phonecalls and create the widget to put inside the panel
        search_phonecalls_status: function(refresh_by_user) {
            var self = this;
            //get the phonecalls' information and populate the queue
            new openerp.web.Model("crm.phonecall").call("get_list").then(_.bind(self.parse_phonecall,self,refresh_by_user));
        },

        parse_phonecall: function(refresh_by_user,result){
            var self = this;
            _.each(self.widgets, function(w) {
                w.destroy();
            });                
            self.widgets = {};
            
            var phonecall_displayed = false;
            //for each phonecall display it only if the date is lower than the current one
            //if the refresh is done by the user, retrieve the phonecalls set as "done"
            _.each(result.phonecalls, function(phonecall){
                phonecall_displayed = true;
                if(refresh_by_user){
                    if(phonecall.state !== "done"){
                        self.display_in_queue(phonecall);
                    }else{
                        new openerp.web.Model("crm.phonecall").call("remove_from_queue",[phonecall.id]);
                    }
                }else{
                    self.display_in_queue(phonecall);
                }
            });
            if(!this.in_call){
                this.$hangup_transfer_buttons.attr('disabled','disabled');
            }

            if(!phonecall_displayed){
                this.$(".oe_dial_call_button, .oe_call_dropdown").attr('disabled','disabled');
            }else{
                this.$(".oe_dial_call_button, .oe_call_dropdown").removeAttr('disabled');
            }
            //select again the selected phonecall before the refresh
            if(this.selected_phonecall){
                this.select_call(this.selected_phonecall.id);
            }else{
                this.slide_down_optional_buttons();
            }
            if(this.current_call_deferred){
                this.current_call_deferred.resolve();
            }

        },

        //function which will add the phonecall in the queue and create the tooltip
        display_in_queue: function(phonecall){
            //Check if the current phonecall is currently done to add the microphone icon

            var widget = new openerp.crm_voip.PhonecallWidget(this, phonecall, this.formatCurrency);
            if(this.in_call && phonecall.id == this.current_phonecall){
                widget.set_state('in_call');
            }
            widget.appendTo(this.$(".oe_dial_phonecalls"));
            widget.on("select_call", this, this.select_call);
            widget.on("remove_phonecall",this,this.remove_phonecall);
            this.widgets[phonecall.id] = widget;
        },

        //action to change the main view to go to the opportunity's view
        to_lead: function() {
            this.widgets[this.selected_phonecall.id].to_lead();
        },

        //action to change the main view to go to the client's view
        to_client: function() {
            this.widgets[this.selected_phonecall.id].to_client();
        },

        //action to select a call and display the specific actions
        select_call: function(phonecall_id){
            var selected_phonecall = this.widgets[phonecall_id];
            if(!selected_phonecall){
                selected_phonecall = false;
                this.slide_down_optional_buttons();
                return;
            }
            if(this.optional_buttons_animated){
                return;
            }
            var self = this;
            var selected = selected_phonecall.$el.hasClass("oe_dial_selected_phonecall");
            this.$(".oe_dial_selected_phonecall").removeClass("oe_dial_selected_phonecall");
            if(!selected){
                //selection of the phonecall
                selected_phonecall.$el.addClass("oe_dial_selected_phonecall");
                //if the optional buttons are not up, they are displayed
                this.slide_up_optional_buttons();
                //check if the phonecall has an email to display the send email button or not
                if(selected_phonecall.email){
                    this.$(".oe_dial_email").show();
                    this.$(".oe_dial_schedule_call").removeClass("oe_dial_schedule_full_width");
                }else{
                    this.$(".oe_dial_email").hide();
                    this.$(".oe_dial_schedule_call").addClass("oe_dial_schedule_full_width");
                }
            }else{
                //unselection of the phonecall
                selected_phonecall = false;
                this.slide_down_optional_buttons();
            }
            this.selected_phonecall = selected_phonecall;
        },

        //remove the phonecall from the queue
        remove_phonecall: function(phonecall_widget){
            var phonecall_model = new openerp.web.Model("crm.phonecall");
            var self = this;
            phonecall_model.call("remove_from_queue", [phonecall_widget.id]).then(function(action){
                self.search_phonecalls_status();
                self.$(".popover").remove();
            });
        },

        //action done when the button "call" is clicked
        call_button: function(){
            var self = this;
            if(this.selected_phonecall){
                this.make_call(this.selected_phonecall.id);
            }else{
                    var next_call = _.filter(this.widgets, function(widget){return widget.state != "done";}).shift();
                    this.make_call(next_call.id);
            }
        },

        auto_call_button: function(){
            var self = this;
            if(this.in_call){
                return;
            }
            this.$(".oe_dial_split_call_button").hide();
            this.$(".oe_dial_stop_autocall_button").show();
            this.in_automatic_mode = true;
            this.phonecalls_auto_call = [];
             _.each(this.widgets,function(phonecall){
                if(phonecall.state != "done"){
                    self.phonecalls_auto_call.push(phonecall.id);
                }
            });
            if(this.phonecalls_auto_call.length){
                this.make_call(this.phonecalls_auto_call.shift());
            }else{
                this.stop_automatic_call();
            }
        },

        //action done when the button "Hang Up" is clicked
        hangup_button: function(){
            this.sip_js.hangup();
        },

        //action done when the button "Transfer" is clicked
        transfer_button: function(){
            //Launch the transfer wizard
            openerp.client.action_manager.do_action({
                type: 'ir.actions.act_window',
                key2: 'client_action_multi',
                src_model: "crm.phonecall",
                res_model: "crm.phonecall.transfer.wizard",
                multi: "True",
                target: 'new',
                context: {},
                views: [[false, 'form']],
                flags: {
                    'headless': true,
                },
            });
        },

        //action done when the transfer_call action is triggered
        transfer_call: function(number){
            this.sip_js.transfer(number);
        },

        //action done when the button "Reschedule Call" is clicked
        schedule_call: function(){
            this.widgets[this.selected_phonecall.id].schedule_call();
        },

        //action done when the button "Send Email" is clicked
        send_email: function(){
            this.widgets[this.selected_phonecall.id].send_email();
        },

        call_partner: function(number, partner_id){
            var partner_model = new openerp.web.Model("res.partner");
            var self = this;
            partner_model.call("create_call_in_queue", [partner_id, number]).then(function(phonecall_id){
                self.current_call_deferred = $.Deferred();
                self.search_phonecalls_status();
                self.current_call_deferred.done(function(){
                    self.make_call(phonecall_id);
                    if(!self.optional_buttons_shown){
                        self.button_up_deferred = $.Deferred();
                        self.button_up_deferred.done(function(){
                            self.scroll_down();
                        });
                    }else{
                        self.scroll_down();
                    }
                });
            });
        },

        scroll_down: function(){
            this.$('.oe_dial_phonecalls').animate({
                scrollTop: self.$('.oe_dial_phonecalls').prop('scrollHeight') - self.$('.oe_dial_phonecalls').innerHeight(),
            },1000);
        },
    });

    //Creation of the panel and binding of the display with the button in the top bar
    if(openerp.web && openerp.web.UserMenu) {
        openerp.web.UserMenu.include({
            do_update: function(){
                var self = this;
                if($('.oe_systray .oe_topbar_dialbutton_icon')){
                    self.update_promise.then(function() {
                        dial = openerp.web.dial = new openerp.crm_voip.DialingPanel(self);
                        dial.appendTo(openerp.client.$el);
                        $('.oe_topbar_dialbutton_icon').parent().on("click", dial, _.bind(dial.switch_display, dial));
                    });
                }
                return this._super.apply(this, arguments);
            },
        });
    }
    
    //Trigger the client action "reload_panel" that will be catch by the widget to reload the panel
    openerp.crm_voip.reload_panel = function (parent, action) {
        var params = action.params || {};
        if(params.go_to_opp){
            //Call of the function xmlid_to_res_model_res_id to get the id of the opportunity's form view and not the lead's form view
            new instance.web.Model("ir.model.data").call("xmlid_to_res_model_res_id",["crm.crm_case_form_view_oppor"]).then(function(data){
                openerp.client.action_manager.do_action({
                    type: 'ir.actions.act_window',
                    res_model: "crm.lead",
                    res_id: params.opportunity_id,
                    views: [[data[1], 'form']],
                    target: 'current',
                    context: {},
                    flags: {initial_mode: "edit",},
                });
            });
        }
        openerp.web.bus.trigger('reload_panel');

        if(params.in_automatic_mode){
            openerp.web.bus.trigger('next_call');
        }
        //Return an action to close the wizard after the reload of the panel
        return { type: 'ir.actions.act_window_close' };
    };

    openerp.crm_voip.transfer_call = function(parent, action){
        var params = action.params || {};
        openerp.web.bus.trigger('transfer_call', params.number);
        return { type: 'ir.actions.act_window_close' };
    };

    instance.web.client_actions.add("reload_panel", "openerp.crm_voip.reload_panel");
    instance.web.client_actions.add("transfer_call","openerp.crm_voip.transfer_call");


    instance.crm_voip.FieldPhone = instance.web.form.FieldChar.extend({
        template: 'FieldPhone',
        initialize_content: function() {
            this._super();
        },
        render_value: function() {
            if (!this.get('effective_readonly')) {
                this._super();
            } else {
                var self = this;
                var phone_number = this.get('value');
                if (phone_number) {
                    this.$('a.oe_form_uri')
                        .text(phone_number)
                        .on("click",function(){
                            if(self.__parentedParent.datarecord.phone === phone_number){
                                self.do_notify(_t('Start Calling'),_t('Calling ' + phone_number));
                                openerp.web.dial.call_partner(phone_number, self.__parentedParent.datarecord.id);
                            }
                        });
                }else{
                    this.$('a.oe_form_uri')
                        .text('');
                }
            }
        },
    });

    instance.web.form.widgets.add('phone', 'instance.crm_voip.FieldPhone');

    return crm_voip;
};