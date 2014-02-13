define([
  'jquery',
  'underscore',
  'backbone',
  'shared',
  'models/mail/MessagesModel',
  'collections/mail/MessagesCollection',
  'text!templates/login/loginTemplate.html',
  'views/home/LoadingView',
  'views/home/HomeView',
  'expressoIM',
  'collections/home/ExpressoCollection',
  'collections/home/ServersCollection',
  'views/settings/SettingsFaqListView',
], function($, _, Backbone, Shared, MessagesModel, MessagesCollection, loginTemplate,LoadingView,HomeView,expressoIM,ExpressoCollection,ServersCollection,SettingsFaqListView){

  var LoginView = Backbone.View.extend({

    errors: false,

    render: function(){


      var collection = new ServersCollection();

      var that = this;

      collection.done(function (data) {

        var newData = {
          servers: data.models,
          _: _
        }

        var compiledTemplate = _.template( loginTemplate, newData );

        that.$el.html(compiledTemplate);
        that.$el.attr("style","top: -53px; position: relative;");
        $("#mainAppPageContent").empty().append(that.$el);

        if (Shared.betaVersion) {
          $("#beta").removeClass("hidden");
        }

        if ((Shared.isAndroid()) && (Shared.isPhonegap())) {

          if (Shared.forceLogout == false) {

            if (window.plugins.webintent != null) {

              window.plugins.webintent.getAccounts("", function (accounts) {

                Shared.automaticLoginAccounts = accounts;

                var JsonAccounts = JSON.parse(accounts);

                  if (JsonAccounts.accounts.length > 0) {

                    if (JsonAccounts.accounts.length == 1) {

                      that.automaticLogin(JsonAccounts.accounts[0]);

                    } else {

                      var s = $("<select id=\"switch_accounts\" />");

                      $("<option />", {value: "", text: "Escolha uma Conta"}).appendTo(s);

                      for (var i=0;i<JsonAccounts.accounts.length;i++) {
                        if (JsonAccounts.accounts[i] != undefined) {
                          $("<option />", {value: JsonAccounts.accounts[i].accountAPIURL + "|" + JsonAccounts.accounts[i].accountName + "|" + JsonAccounts.accounts[i].accountPassword, text: JsonAccounts.accounts[i].accountName}).appendTo(s);
                        }
                      }
                      //s.css("display","none");
                      s.appendTo("body");
                      s.click();

 

                      $("#switch_accounts").change(function(evt) {
                        //alert($("#switch_accounts").val());
                        var value = $("#switch_accounts").val();

                        if (value != "") {

                          var act = value.split("|");

                          var Account = { 
                            accountAPIURL: act[0],
                            accountName : act[1],
                            accountPassword: act[2],
                          };

                          that.automaticLogin(Account);

                        }

                      });

                      $("#switch_accounts").trigger('click');

                     }

                  } 

              }, function() {
                
              });
            }

          }
        }

      })
      .fail(function (error) {
        Shared.handleErrors(error);
      })
      .getServers();

    },
    events: {
      'click #btn-login' : 'login',
      "keydown #username" : "keydownUserName",
      "keydown #password" : "keydownPassword",
      "click #helpLink" : "showHelp",
    },

    showHelp: function(e) {
      var secondView = new SettingsFaqListView({ el: $("body") });
      secondView.render();
    },

    keydownUserName: function(e) {
      if ( (e.which == 13 && !e.shiftKey) ) {
        $("#password").focus();
      }
    },

    keydownPassword: function(e) {
      if ( (e.which == 13 && !e.shiftKey) ) {
        this.login();
      }
    },


    automaticLogin: function(Account) {

      this.loginUser(Account.accountName,Account.accountPassword,Account.accountAPIURL);
    },

    login: function(ev) {
      var userName = $("#username").val();
      var passwd = $("#password").val();

      var serverURL = $("#serverURL").val();

      this.loginUser(userName,passwd,serverURL);

    },


    loginUser: function(userName,passwd,serverURL) {

      if ((Shared.isAndroid()) && (Shared.isPhonegap())) {
        serverURL = serverURL.replace("https://","http://");
      }

      var isPhoneGap = Shared.api.phoneGap();

      if (isPhoneGap) {
        Shared.api.context(serverURL).crossdomain(serverURL);
      } else {
        Shared.api.context(Shared.context).crossdomain(serverURL);
      }

      this.errors = false;

      if (passwd == "") {
        Shared.showMessage({
            type: "error",
            icon: 'icon-expresso',
            title: "Senha não informada/inválida!",
            description: "",
            elementID: "#pageMessage",
          });
        this.errors = true;
      }

      if (userName == "") {
        Shared.showMessage({
            type: "error",
            icon: 'icon-expresso',
            title: "Usuário não informado/inválido!",
            description: "",
            elementID: "#pageMessage",
          });
        this.errors = true;
      }

      if (Shared.betaVersion) { 
        var found = false;
        if (Shared.betaTesters.length > 0) {
          for (var i in Shared.betaTesters) {
            if (userName == Shared.betaTesters[i]) {
              found = true;
            }
          }
          if (!found) {
             Shared.showMessage({
                type: "error",
                icon: 'icon-expresso',
                title: "Este usuário não possui acesso a versão BETA!",
                description: "",
                elementID: "#pageMessage",
              });
            this.errors = true;
          }
        }

      }

      
      var that = this;      

      if (!that.errors) {

        var loadingView = new LoadingView({ el: $("#loadingLogin") });
        loadingView.render();

        Shared.api
        .resource('Login')
        .params({user:userName,password:passwd})
        .done(function(result){

          var expressoValues = {
            auth: Shared.api.auth(), 
            "profile":result.profile[0],
            username: userName, 
            phoneGap: isPhoneGap,
            serverAPI: serverURL
          };

          Shared.password = passwd;

          Shared.profile = expressoValues.profile;

          Shared.api.setLocalStorageValue("expresso",expressoValues);

          if ((Shared.isAndroid()) && (Shared.isPhonegap())) {

            Shared.service.setConfig(serverURL,Shared.api.auth());
            Shared.service.startService();
            setTimeout(function() {
              Shared.service.setConfig(serverURL,Shared.api.auth(),userName,passwd);
              Shared.service.enableTimer();
            },10000);


            window.plugins.webintent.createAccount({accountName : userName, accountPassword: passwd, accountAuthToken: Shared.api.auth(), accountAPIURL: serverURL}, 
             function(result) {

                
             }, function(error) {
                alert(error);
             });
          }
          
          

          var homeView = new HomeView();
          homeView.profile = result.profile[0];
          homeView.render();

          Shared.showMessage({
            type: "success",
            icon: 'icon-expresso',
            title: "Bem vindo ao Expresso!",
            description: "",
            timeout: 2000,
            elementID: "#pageMessage",
          });

          //Shared.router.navigate('Home',{trigger: true});
                  
          return false;
        })
        .fail(function(result){

          if (result.error.code == 5) {

            Shared.showMessage({
              type: "error",
              icon: 'icon-expresso',
              title: "Usuário ou senha inválidos!",
              description: "",
              timeout: 0,
              elementID: "#pageMessage",
            });

            setTimeout(function() {

              Shared.router.navigate('',{trigger: true});

            },2000);

          }

          return false;
        })
        .execute();

      }



      return false;
    },

    logoutUser: function () {

      var loadingView = new LoadingView({ el: $("#mainAppPageContent") });
      loadingView.render();

      Shared.forceLogout = true;

      Shared.api
      .resource('Logout')
      .done(function(result){

      })
      .fail(function(error){

        Shared.handleErrors(error);
        
      })
      .execute();

      Shared.scrollMenu = null;

      Shared.api.getLocalStorageValue("expresso",function(expressoValue) {

        var isPhoneGap = Shared.api.phoneGap();

        expressoValue.auth = "";
        expressoValue.profile = "";
        expressoValue.username = "";
        expressoValue.password = "";
        expressoValue.phoneGap = isPhoneGap;
        expressoValue.serverAPI = "";

        if (Shared.isAndroid()) {
          Shared.service.disableTimer();
          Shared.service.stopService();
        }

        Shared.api.setLocalStorageValue("expresso",expressoValue);

      });

      Shared.router.navigate('Login',true);

    }

  });

  return LoginView;
  
});
