angular
    .module('strichliste.modals.customTransaction', [
        'ngRoute',
        'ui.bootstrap',
        'strichliste.services.location',
        'strichliste.services.message',
        'strichliste.services.audio',
        'strichliste.services.transaction',
        'strichliste.services.serverSettings',
        'strichliste.services.user'
    ])

    .controller('CustomTransactionController', function ($scope, $rootScope, $routeParams, $modal, $modalInstance, $route, $timeout,
                                                         Location, Message, Audio, Transaction, ServerSettings, User,
                                                         transactionMode) {

        var userId = $routeParams.userId;

        // Because of some scope issues, we need to initialize the substructure
        $scope.transactionMode = transactionMode;

        $scope.enableComments = settings.comments;

        $scope.cancel = function() {
            $modalInstance.close();
        };

        User
            .getUser(userId)
            .success(function (user) {
                $scope.user = user;
            });

        ServerSettings
            .getUserBoundaries()
            .then(function(result) {
                $scope.boundary = result;
            });

        $scope.submitTransaction = function(value, comment) {

            value = parseFloat(value).toFixed(2);

            if(value < 0.01) {
                return Message.error('customTransactionValueTooSmall', {
                    currency: settings.i18n.currency
                });
            }

            if(!comment) {
                comment = 'Custom transaction';
            }

            // We can't pass value directly negated like in the UserController,
            // because we need to normalize the value first
            if(transactionMode == 'spend') {
                value *= -1;
            }
            else if(transactionMode == 'transfer') {
                // Open user selection dialog for transfers
                $modalInstance.close();
                var modalInstance = $modal.open({
                    templateUrl: 'modals/userTransfer/userTransfer.html',
                    controller: 'userTransferController',
                    resolve: {
                        value: function(){
                            return value;
                        },
                        comment: function(){
                            return comment;
                        }
                    }
                });
                return;
            }

            Transaction
                .createTransaction(userId, value, comment)
                .success(function() {
                    if(settings.audio.transaction) {
                        Audio.play(settings.audio.transaction);
                    }
                    $modalInstance.close();
                    $route.reload();
                })
                .error(function(body, httpCode) {
                    if(httpCode == 403) {
                        return Message.error('userBoundaryReached');
                    }

                    return Message.httpError(body, httpCode);
                });
        };

        $timeout(function() {
            angular.element('input.transaction-value').focus();
        }, 400);

        $rootScope.$on('IdleStart', function() {
            $modalInstance.close();
        });

    });