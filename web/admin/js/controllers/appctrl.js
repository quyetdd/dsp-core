var AppCtrl = function ($scope, AppsRelated, Role, Session, $http, Service, $location) {
    $scope.$on('$routeChangeSuccess', function () {
        $(window).resize();
    });
    Scope = $scope;

    $scope.getResources = function(resources){
        resources.forEach(function(resource){
            $scope.getResource(resource.factory, resource.collection, resource.success);
        })
    };
    $scope.getResource = function(factory, collection, success){

        factory.get()
            .$promise.then(function(resource){
                $scope[collection] = resource;
                if(success) success();
            }).catch(function(error){

            });

    };

    $scope.buildServices = function(){
        $scope.storageServices = [];
        $scope.storageContainers = {}
        $scope.Services.record.forEach(function (service) {
            if (service.type.indexOf("Local File Storage") != -1){
                $scope.defaultStorageID = service.id;
                $scope.defaultStorageName = service.api_name;
            }
            if (service.type.indexOf("File Storage") != -1) {
                $scope.storageServices.push(service);

                $http.get('/rest/' + service.api_name + '?app_name=admin').success(function (data) {

                    $scope.storageContainers[service.id] = {options: []};
                    if (data.resource) {
                        data.resource.forEach(function (container) {
                            if (service.api_name == $scope.defaultStorageName) {
                                $scope.app.storage_service_id = service.id;
                                //Scope.defaultStorageID = service.id;
                                $scope.app.storage_container = "applications";
                                $scope.storageContainers[service.id].options.push({name: container.name});
                                $scope.storageContainers[service.id].name = service.api_name;
                                $scope.loadStorageContainers();
                            } else {
                                $scope.storageContainers[service.id].options.push({name: container.name});
                                $scope.storageContainers[service.id].name = service.api_name;
                            }

                        })
                    }
                    if(Service.newApp){
                        $scope.showDetails(Service.newApp);
                        $scope.showAppPreview($scope.app.launch_url);
                        delete Service.newApp;
                    }
                }).error(function (data) {
                    //console.log(data);
                });
            }


        });
    };

    $scope.showAppPreview = function (appUrl) {

        $scope.action = "Preview ";
        $('#step1').hide();

        $("#app-preview").show();


        $("#app-preview  iframe").css('height', $(window).height() - 200).attr("src", appUrl).show();
        $('#create_button').hide();
        $('#update_button').hide();
        $('#file-manager').hide();
    };


    $scope.loadStorageContainers = function () {

        $scope.storageOptions = $scope.storageContainers[Scope.app.storage_service_id].options;


    }
    $scope.formChanged = function () {
        $('#save_' + this.app.id).removeClass('disabled');
    };
    $scope.promptForNew = function () {
        $scope.action = "Create";
        Scope.app = {is_url_external: '0', native: true, requires_fullscreen: '0', roles: []};
        Scope.app.storage_service_id = Scope.defaultStorageID;
        Scope.app.storage_container = "applications";
        $('#context-root').show();
        $('#file-manager').hide();
        $('#app-preview').hide();
        $('#step1').show();
//        $('#create_button').show();
//        $('#update_button').hide();
        $("tr.info").removeClass('info');
        $(window).scrollTop(0);
    };
    Scope.save = function () {
        if (Scope.app.is_url_external == -1) {
            Scope.app.storage_service_id = null;
            Scope.app.storage_container = null;
            Scope.app.name = Scope.app.api_name;
            Scope.app.launch_url = "";
            Scope.app.is_url_external = 0;
        }
        if(Scope.app.is_url_external == 1){
            Scope.app.storage_service_id = null;
            Scope.app.storage_container = null;
        }
        var id = Scope.app.id;
        AppsRelated.update({id: id}, Scope.app).$promise.then(function (data) {
                updateByAttr(Scope.Apps.record, 'id', id, data);

                if(window.top.Actions){
                    window.top.Actions.updateSession("update");
                }

                $.pnotify({
                    title: Scope.app.name,
                    type: 'success',
                    text: 'Updated Successfully'
                });
                $(document).scrollTop();
                Scope.promptForNew();

            }).catch(
            function (response) {
                var code = response.status;
                if (code == 401) {
                    window.top.Actions.doSignInDialog("stay");
                    return;
                }
                $.pnotify({
                    title: 'Error',
                    type: 'error',
                    hide: false,
                    addclass: "stack-bottomright",
                    text: getErrorString(response)
                });


            });
    };
    Scope.goToImport = function () {
        $location.path('/import');
    }
    Scope.downloadSDK = function(){
        $("#sdk-download").attr('src', location.protocol + '//' + location.host + '/rest/system/app/' + Scope.app.id + '?sdk=true&app_name=admin')
    }
    Scope.create = function () {
        if (Scope.app.is_url_external == -1) {
            Scope.app.storage_service_id = null;
            Scope.app.storage_container = null;
            Scope.app.name = Scope.app.api_name;
            Scope.app.launch_url = "";
            Scope.app.is_url_external = 0;

        }
        if(Scope.app.is_url_external == 1){
            Scope.app.name = Scope.app.api_name;
            Scope.app.storage_service_id = null;
            Scope.app.storage_container = null;
        }
        AppsRelated.save(Scope.app).$promise.then(
            function (data) {
                Scope.Apps.record.unshift(data);
                //Scope.app.id = data.id;
                //Scope.app = data;
                if(window.top.Actions){
                    window.top.Actions.updateSession("update");
                }

                $.pnotify({
                    title: Scope.app.name,
                    type: 'success',
                    text: 'Created Successfully'
                });
                Scope.promptForNew();
                if (!Scope.app.native) {
                    Scope.showAppPreview(data.launch_url);
                }
            }).catch(
            function (response) {
                var code = response.status;
                if (code === 401 || code === 403) {
                    //window.top.Actions.doSignInDialog("stay");
                    showLogin();

                }else{
                $.pnotify({
                    title: 'Error',
                    type: 'error',
                    hide: false,
                    addclass: "stack-bottomright",
                    text: getErrorString(response)
                });
                }

            });


    };

    Scope.delete = function () {
        var which = this.app.name;
        var delete_files = "false";
        if (!which || which == '') {
            which = "the application?";
        } else {
            which = "the application '" + which + "'?";
        }
        if (!confirm("Are you sure you want to delete " + which)) {
            return;
        }
        if(this.app.storage_service_id != null){
            if (confirm("Remove the files associated with " + which + "\nPressing Cancel will delete the app, but keep the files in storage")) {
                delete_files = "true";
            }
        }

        var id = this.app.id;
        AppsRelated.delete({ id: id, delete_storage: delete_files }, function () {
                $("#row_" + id).fadeOut();
                window.top.Actions.updateSession();

                Scope.promptForNew();
                $.pnotify({
                    title: Scope.app.name,
                    type: 'success',
                    text: 'Removed Successfully'
                });
            },
            function (response) {
                $.pnotify({
                    title: 'Error',
                    type: 'error',
                    hide: false,
                    addclass: "stack-bottomright",
                    text: getErrorString(response)
                });


            });
    };
    Scope.postFile = function (target) {
        //console.log(target);
    }
    Scope.showLocal = function () {
        $('.local').show();
        $('.external').hide();
    };
    Scope.hideLocal = function () {
        $('.local').hide();
        $('.external').show();
    };
    Scope.showFileManager = function () {
        Scope.action = "Edit Files for this";
        $('#step1').hide();
        $('#app-preview').hide();
        $('#create_button').hide();
        $('#update_button').hide();
        $("#file-manager").show();
        var container;
        if (this.app.storage_service_id) {
            container = this.app.storage_container || null;
            container = container ? this.app.storage_container + "/" : '';
            $("#file-manager iframe").css('height', $(window).height() - 200).attr("src", CurrentServer + '/filemanager/?path=/' + Scope.storageContainers[this.app.storage_service_id].name + '/' + container  + this.app.api_name + '/&allowroot=false').show();
        } else {
            $("#file-manager iframe").css('height', $(window).height() - 200).attr("src", CurrentServer + '/filemanager/?path=/' + Scope.defaultStorageName  + '/applications/' + this.app.api_name + '/&allowroot=false').show();
        }


    };


    Scope.showDetails = function (newApp) {
        Scope.app = {};
        Scope.action = "Update";
        if(newApp){
            Scope.app = newApp;
        }else{
            Scope.app = angular.copy(this.app);
        }



        Scope.app.storage_service_id = this.app.storage_service_id || Scope.defaultStorageID;

        if (!this.app.storage_service_id && !this.app.is_url_external) {
            Scope.app.is_url_external = -1;
        }
        Scope.loadStorageContainers();




        if (!Scope.app.launch_url) {
            Scope.app.native = true;
            Scope.app.storage_service_id = null;
            Scope.app.storage_container = null;
        }
        if (Scope.app.is_url_external == 1) {
            Scope.app.storage_service_id = null;
            Scope.app.storage_container = null;
        }
        $('#button_holder').hide();
        $('#file-manager').hide();
        $('#app-preview').hide();
        $('#step1').show();
        // $('#create_button').hide();
        // $('#update_button').show();
        $("tr.info").removeClass('info');
        $('#row_' + Scope.app.id).addClass('info');
    }
    Scope.isAppInRole = function () {
        var inGroup = false;
        if (Scope.app) {
            var id = this.role.id;
            var assignedRoles = Scope.app.roles;
            assignedRoles = $(assignedRoles);

            assignedRoles.each(function (index, val) {
                if (val.id == id) {
                    inGroup = true;
                }
            });

        }
        return inGroup;
    };
    Scope.addRoleToApp = function (checked) {

        if (checked == true) {
            Scope.app.roles.push(this.role);
        } else {
            Scope.app.roles = removeByAttr(Scope.app.roles, 'id', this.role.id);
        }
    };

    Scope.reload = function () {
        Scope.Apps = AppsRelated.get(function (data) {
            Scope.Apps.record.reverse();
        }, function (response) {
            var code = response.status;
            if (code == 401) {
                window.top.Actions.doSignInDialog("stay");
                return;
            }
            $.pnotify({
                title: 'Error',
                type: 'error',
                hide: false,
                addclass: "stack-bottomright",
                text: getErrorString(response)
            });


        });
    }
    $scope.init = function(){
        $scope.currentServer = CurrentServer;
        $scope.action = "Create";
        setCurrentApp('applications');
        $scope.app = {is_url_external: 0, native: true, allow_fullscreen_toggle: 0, requires_fullscreen: '0', roles: [], storage_service_id: null};
        $('.external').hide();
        $scope.storageOptions = [];

        $scope.getResources([
            {
                factory : AppsRelated ,
                collection: "Apps",
                success : function(){$scope.Apps.record.reverse();}
            },
            {
                factory : Role ,
                collection: "Roles"
            },
            {
                factory : Service ,
                collection: "Services",
                success: function(){$scope.buildServices()}
            }

        ]);
        //$scope.Apps.record.reverse();
        //$scope.buildServices();
//        $scope.getResource(AppsRelated, "Apps", function(){
//            $scope.Apps.record.reverse();
//        });
//        $scope.getResource(Role, "Roles");
//        $scope.getResource(Service, "Services", function(){
//            $scope.buildServices();
//        })
    };
    $scope.init();
};

