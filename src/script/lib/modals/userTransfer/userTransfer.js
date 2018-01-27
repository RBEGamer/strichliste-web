function isActiveUser(user) {

    if (user.lastTransaction === null) {
        return false;
    }

    return (moment().diff(moment(user.lastTransaction)) < ms(settings.inactiveUserPeriod));
}

angular
    .module('strichliste.modals.userTransfer', [
        'ngRoute',
        'ui.bootstrap',
        'strichliste.services.location',
        'strichliste.services.message',
        'strichliste.services.audio',
        'strichliste.services.transaction',
        'strichliste.services.serverSettings',
        'strichliste.services.user'
    ])

    .controller('userTransferController', function ($scope, $rootScope, $routeParams, $modalInstance, $route, $timeout,
                                                         Location, Message, Audio, Transaction, ServerSettings, User,
                                                         value, comment) {

        var userId = $routeParams.userId;

        $scope.activeUsers = [];
        $scope.inactiveUsers = [];

        // Because of some scope issues, we need to initialize the substructure
        $scope.value = value;
        $scope.comment = comment;

        $scope.mode = {
            currentTab: 'active'
        };

        $scope.cancel = function() {
            $modalInstance.close();
        };

        User
        .getUser(userId)
        .success(function (user) {
            $scope.user = user;
        });

        User.getUsers()
            .success(function (users) {
                // Ignore own userid
                $scope.activeUsers = users.entries.filter(function(user) {
                    return (isActiveUser(user) && user.id != userId);
                });
                $scope.inactiveUsers = users.entries.filter(function(user) {
                    return (!isActiveUser(user) && user.id != userId);
                });
            })
            .error(function (body, httpCode) {
                return Message.httpError(body, httpCode);
            });

        $scope.transactionClick = function(targetUser) {

            // Construct transaction comment
            var newcomment = 'Transfer money from ' + $scope.user.name + ' to ' + targetUser.name + ': ' + comment;

            // Pay money from user
            Transaction
                .createTransaction(userId, value * -1, newcomment)
                .error(function(body, httpCode) {
                    // TODO even though this fails (if you have the negative transaction limit reached)
                    // the code below to add value to the other account is still executed.
                    if(httpCode == 403) {
                        return Message.error('userBoundaryReached');
                    }

                    return Message.httpError(body, httpCode);
                });

            // Add new value to target user
            Transaction
                .createTransaction(targetUser.id, value, newcomment)
                .success(function() {
                    if(settings.audio.transaction) {
                        Audio.play(settings.audio.transaction);
                    }
                    $modalInstance.close();
                    $route.reload();
                })
                .error(function(body, httpCode) {
                    // Warning: If transaction adding limits are smaller than removing value this can crash
                    // In order to solve this issue a proper backend API has to be implemented.
                    if(httpCode == 403) {
                        return Message.error('userBoundaryReached');
                    }

                    return Message.httpError(body, httpCode);
                });
        };

        $rootScope.$on('IdleStart', function() {
            $modalInstance.close();
        });

    });
