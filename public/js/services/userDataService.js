angular.module('crowsnest').factory('userDataService', function (localStorageService, _) {
  var ls = localStorageService;
  var srv = {};
  var favorites = ls.get('favorites') || '[]';

  srv.getFavorites = function () {
    return favorites;
  }

  srv.addFavorite = function (id) {
    if (!_.contains(favorites, id)) {
      favorites.push(id);
    }
    console.log(favorites)
    ls.add('favorites', favorites);
    console.log(ls.get('favorites'))
  }

  srv.removeFavorite = function (id) {
    favorites = _.without(favorites, id);
    ls.add('favorites', favorites);
  }

  return srv;

})